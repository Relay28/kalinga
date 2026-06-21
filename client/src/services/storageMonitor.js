/**
 * localStorage Quota Management Service
 * Monitors storage usage, handles quota errors, and provides cleanup utilities
 */

const STORAGE_WARNING_THRESHOLD = 0.8; // 80% capacity
const ESTIMATED_QUOTA = 5 * 1024 * 1024; // Estimated 5MB quota for localStorage

/**
 * Calculate current localStorage usage
 * @returns {Object} Usage statistics { used, quota, percentage, isNearLimit }
 */
export function getStorageUsage() {
  try {
    let totalSize = 0;
    
    // Calculate size of all localStorage items
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        const value = localStorage.getItem(key);
        if (value) {
          // Size in bytes: key length + value length * 2 (UTF-16 encoding)
          totalSize += (key.length + value.length) * 2;
        }
      }
    }
    
    // Estimate quota (browsers don't expose this directly)
    const estimatedQuota = ESTIMATED_QUOTA;
    const percentage = (totalSize / estimatedQuota);
    const isNearLimit = percentage >= STORAGE_WARNING_THRESHOLD;
    
    return {
      used: totalSize,
      quota: estimatedQuota,
      percentage: percentage,
      percentageFormatted: `${(percentage * 100).toFixed(1)}%`,
      isNearLimit,
      available: estimatedQuota - totalSize,
      usedMB: (totalSize / (1024 * 1024)).toFixed(2),
      quotaMB: (estimatedQuota / (1024 * 1024)).toFixed(2),
      availableMB: ((estimatedQuota - totalSize) / (1024 * 1024)).toFixed(2)
    };
  } catch (err) {
    console.error('Error calculating storage usage:', err);
    return {
      used: 0,
      quota: ESTIMATED_QUOTA,
      percentage: 0,
      percentageFormatted: '0.0%',
      isNearLimit: false,
      available: ESTIMATED_QUOTA,
      usedMB: '0.00',
      quotaMB: (ESTIMATED_QUOTA / (1024 * 1024)).toFixed(2),
      availableMB: (ESTIMATED_QUOTA / (1024 * 1024)).toFixed(2),
      error: err.message
    };
  }
}

/**
 * Get breakdown of storage usage by key prefix
 * @returns {Array} Array of { key, size, sizeKB, percentage }
 */
export function getStorageBreakdown() {
  try {
    const items = [];
    let totalSize = 0;
    
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        const value = localStorage.getItem(key);
        if (value) {
          const size = (key.length + value.length) * 2;
          totalSize += size;
          items.push({
            key,
            size,
            sizeKB: (size / 1024).toFixed(2),
            sizeMB: (size / (1024 * 1024)).toFixed(3)
          });
        }
      }
    }
    
    // Add percentage to each item
    items.forEach(item => {
      item.percentage = totalSize > 0 ? (item.size / totalSize) * 100 : 0;
      item.percentageFormatted = `${item.percentage.toFixed(1)}%`;
    });
    
    // Sort by size descending
    items.sort((a, b) => b.size - a.size);
    
    return items;
  } catch (err) {
    console.error('Error getting storage breakdown:', err);
    return [];
  }
}

/**
 * Check if storage operation will exceed quota
 * @param {string} key - Storage key
 * @param {string} value - Value to store
 * @returns {Object} { wouldExceed, estimatedSize, availableSpace }
 */
export function checkStorageAvailability(key, value) {
  try {
    const usage = getStorageUsage();
    const estimatedSize = (key.length + (typeof value === 'string' ? value.length : JSON.stringify(value).length)) * 2;
    const wouldExceed = (usage.used + estimatedSize) > usage.quota;
    
    return {
      wouldExceed,
      estimatedSize,
      estimatedSizeKB: (estimatedSize / 1024).toFixed(2),
      availableSpace: usage.available,
      availableSpaceKB: (usage.available / 1024).toFixed(2)
    };
  } catch (err) {
    console.error('Error checking storage availability:', err);
    return {
      wouldExceed: false,
      estimatedSize: 0,
      estimatedSizeKB: '0.00',
      availableSpace: ESTIMATED_QUOTA,
      availableSpaceKB: (ESTIMATED_QUOTA / 1024).toFixed(2),
      error: err.message
    };
  }
}

/**
 * Handle QuotaExceededError gracefully
 * @param {Error} error - The error to check
 * @returns {boolean} True if error is quota exceeded
 */
export function isQuotaExceededError(error) {
  if (!error) return false;
  
  return (
    error.name === 'QuotaExceededError' ||
    error.name === 'NS_ERROR_DOM_QUOTA_REACHED' || // Firefox
    error.code === 22 || // Legacy browsers
    error.code === 1014 // Legacy browsers
  );
}

/**
 * Clear uploaded scan data to free space
 * Only clears data that has been successfully uploaded to server
 * @returns {Object} { success, freedSpace, message }
 */
export function clearUploadedData() {
  try {
    const beforeUsage = getStorageUsage();
    let freedSpace = 0;
    
    // Clear only uploaded data, not pending queue
    // In Phase 1, we don't track uploaded scans separately
    // So we'll provide a conservative cleanup approach
    
    // Clear old notification data (keeping recent ones)
    const notificationKey = 'kalinga_notifications';
    const notifications = localStorage.getItem(notificationKey);
    if (notifications) {
      try {
        const notifArray = JSON.parse(notifications);
        if (Array.isArray(notifArray) && notifArray.length > 20) {
          // Keep only most recent 20 notifications
          const recent = notifArray.slice(-20);
          localStorage.setItem(notificationKey, JSON.stringify(recent));
        }
      } catch (err) {
        console.warn('Error cleaning notifications:', err);
      }
    }
    
    // Clear any temporary or cache keys
    const keysToClean = [];
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        // Remove temporary or old cache keys
        if (key.startsWith('temp_') || 
            key.startsWith('cache_') || 
            key.includes('_old_') ||
            key.includes('_backup_')) {
          keysToClean.push(key);
        }
      }
    }
    
    keysToClean.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (err) {
        console.warn(`Failed to remove ${key}:`, err);
      }
    });
    
    const afterUsage = getStorageUsage();
    freedSpace = beforeUsage.used - afterUsage.used;
    
    return {
      success: true,
      freedSpace,
      freedSpaceKB: (freedSpace / 1024).toFixed(2),
      freedSpaceMB: (freedSpace / (1024 * 1024)).toFixed(3),
      message: freedSpace > 0 
        ? `Freed ${(freedSpace / 1024).toFixed(2)} KB of storage space`
        : 'No data to clear - queue items are not uploaded yet',
      itemsRemoved: keysToClean.length,
      beforeUsage: beforeUsage.percentageFormatted,
      afterUsage: afterUsage.percentageFormatted
    };
  } catch (err) {
    console.error('Error clearing uploaded data:', err);
    return {
      success: false,
      freedSpace: 0,
      freedSpaceKB: '0.00',
      freedSpaceMB: '0.000',
      message: `Failed to clear data: ${err.message}`,
      error: err.message
    };
  }
}

/**
 * Clear all Kalinga data (use with caution - for emergency quota situations)
 * @returns {Object} { success, freedSpace, message }
 */
export function clearAllKalingaData() {
  try {
    const beforeUsage = getStorageUsage();
    const keysToRemove = [];
    
    // Collect all Kalinga-related keys
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        if (key.startsWith('kalinga_') || key === 'pendingUploads') {
          keysToRemove.push(key);
        }
      }
    }
    
    // Remove all Kalinga data
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (err) {
        console.warn(`Failed to remove ${key}:`, err);
      }
    });
    
    const afterUsage = getStorageUsage();
    const freedSpace = beforeUsage.used - afterUsage.used;
    
    return {
      success: true,
      freedSpace,
      freedSpaceKB: (freedSpace / 1024).toFixed(2),
      freedSpaceMB: (freedSpace / (1024 * 1024)).toFixed(3),
      message: `Cleared all Kalinga data: ${keysToRemove.length} items removed`,
      itemsRemoved: keysToRemove.length,
      beforeUsage: beforeUsage.percentageFormatted,
      afterUsage: afterUsage.percentageFormatted
    };
  } catch (err) {
    console.error('Error clearing all Kalinga data:', err);
    return {
      success: false,
      freedSpace: 0,
      freedSpaceKB: '0.00',
      freedSpaceMB: '0.000',
      message: `Failed to clear data: ${err.message}`,
      error: err.message
    };
  }
}

/**
 * Safe localStorage setItem with quota error handling
 * @param {string} key - Storage key
 * @param {*} value - Value to store (will be JSON stringified if not string)
 * @param {Function} onQuotaExceeded - Callback when quota exceeded
 * @returns {Object} { success, error }
 */
export function safeSetItem(key, value, onQuotaExceeded = null) {
  try {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    
    // Check availability first
    const availability = checkStorageAvailability(key, stringValue);
    if (availability.wouldExceed) {
      const message = `Storage quota would be exceeded. Needed: ${availability.estimatedSizeKB} KB, Available: ${availability.availableSpaceKB} KB`;
      
      if (onQuotaExceeded) {
        onQuotaExceeded(message, availability);
      }
      
      return {
        success: false,
        error: 'QuotaWouldBeExceeded',
        message,
        availability
      };
    }
    
    // Attempt to set
    localStorage.setItem(key, stringValue);
    
    return {
      success: true,
      size: (key.length + stringValue.length) * 2,
      sizeKB: ((key.length + stringValue.length) * 2 / 1024).toFixed(2)
    };
  } catch (err) {
    if (isQuotaExceededError(err)) {
      const usage = getStorageUsage();
      const message = `Storage quota exceeded. Current usage: ${usage.percentageFormatted} (${usage.usedMB} MB / ${usage.quotaMB} MB)`;
      
      if (onQuotaExceeded) {
        onQuotaExceeded(message, usage);
      }
      
      return {
        success: false,
        error: 'QuotaExceededError',
        message,
        usage
      };
    }
    
    return {
      success: false,
      error: err.name || 'StorageError',
      message: err.message
    };
  }
}

export default {
  getStorageUsage,
  getStorageBreakdown,
  checkStorageAvailability,
  isQuotaExceededError,
  clearUploadedData,
  clearAllKalingaData,
  safeSetItem,
  STORAGE_WARNING_THRESHOLD
};
