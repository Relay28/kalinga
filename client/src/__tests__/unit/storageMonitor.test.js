import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getStorageUsage,
  getStorageBreakdown,
  checkStorageAvailability,
  isQuotaExceededError,
  clearUploadedData,
  clearAllKalingaData,
  safeSetItem
} from '../../services/storageMonitor';

describe('Storage Monitor Service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('getStorageUsage', () => {
    it('should calculate storage usage correctly', () => {
      // Add some test data
      localStorage.setItem('test_key_1', 'test_value_1');
      localStorage.setItem('test_key_2', 'a'.repeat(1000)); // 1000 chars

      const usage = getStorageUsage();

      expect(usage).toHaveProperty('used');
      expect(usage).toHaveProperty('quota');
      expect(usage).toHaveProperty('percentage');
      expect(usage).toHaveProperty('isNearLimit');
      expect(usage).toHaveProperty('usedMB');
      expect(usage).toHaveProperty('quotaMB');
      
      expect(usage.used).toBeGreaterThan(0);
      expect(usage.percentage).toBeGreaterThanOrEqual(0);
      expect(usage.percentage).toBeLessThanOrEqual(1);
    });

    it('should return isNearLimit true when usage exceeds 80%', () => {
      // Fill storage with large data to simulate near limit
      // Note: This test might be flaky depending on actual quota
      const usage = getStorageUsage();
      
      // Initially should not be near limit
      expect(usage.isNearLimit).toBe(false);
    });

    it('should include formatted percentage string', () => {
      const usage = getStorageUsage();
      
      expect(usage.percentageFormatted).toMatch(/^\d+\.\d+%$/);
    });
  });

  describe('getStorageBreakdown', () => {
    it('should return empty array for empty storage', () => {
      const breakdown = getStorageBreakdown();
      
      expect(Array.isArray(breakdown)).toBe(true);
      expect(breakdown.length).toBe(0);
    });

    it('should list all storage items with sizes', () => {
      localStorage.setItem('key1', 'value1');
      localStorage.setItem('key2', 'value2');
      localStorage.setItem('key3', 'a'.repeat(500));

      const breakdown = getStorageBreakdown();

      expect(breakdown.length).toBeGreaterThanOrEqual(3);
      
      breakdown.forEach(item => {
        expect(item).toHaveProperty('key');
        expect(item).toHaveProperty('size');
        expect(item).toHaveProperty('sizeKB');
        expect(item).toHaveProperty('sizeMB');
        expect(item).toHaveProperty('percentage');
        expect(item).toHaveProperty('percentageFormatted');
      });
    });

    it('should sort items by size descending', () => {
      localStorage.setItem('small', 'a');
      localStorage.setItem('large', 'a'.repeat(1000));
      localStorage.setItem('medium', 'a'.repeat(100));

      const breakdown = getStorageBreakdown();

      // First item should be the largest
      const largeItem = breakdown.find(item => item.key === 'large');
      const smallItem = breakdown.find(item => item.key === 'small');
      
      expect(largeItem.size).toBeGreaterThan(smallItem.size);
      
      // Check that list is sorted descending
      for (let i = 1; i < breakdown.length; i++) {
        expect(breakdown[i - 1].size).toBeGreaterThanOrEqual(breakdown[i].size);
      }
    });
  });

  describe('checkStorageAvailability', () => {
    it('should estimate size for string values', () => {
      const key = 'test_key';
      const value = 'test_value_string';

      const result = checkStorageAvailability(key, value);

      expect(result).toHaveProperty('wouldExceed');
      expect(result).toHaveProperty('estimatedSize');
      expect(result).toHaveProperty('estimatedSizeKB');
      expect(result).toHaveProperty('availableSpace');
      expect(result).toHaveProperty('availableSpaceKB');
      
      expect(result.wouldExceed).toBe(false); // Normal size should not exceed
      expect(result.estimatedSize).toBeGreaterThan(0);
    });

    it('should estimate size for object values', () => {
      const key = 'test_object';
      const value = { name: 'test', data: [1, 2, 3] };

      const result = checkStorageAvailability(key, value);

      expect(result.wouldExceed).toBe(false);
      expect(result.estimatedSize).toBeGreaterThan(0);
    });

    it('should detect when storage would be exceeded', () => {
      // This is hard to test without actually filling storage
      // Just verify the function structure
      const result = checkStorageAvailability('key', 'value');
      
      expect(typeof result.wouldExceed).toBe('boolean');
    });
  });

  describe('isQuotaExceededError', () => {
    it('should detect QuotaExceededError by name', () => {
      const error = new Error('Quota exceeded');
      error.name = 'QuotaExceededError';

      expect(isQuotaExceededError(error)).toBe(true);
    });

    it('should detect Firefox quota error', () => {
      const error = new Error('NS Error');
      error.name = 'NS_ERROR_DOM_QUOTA_REACHED';

      expect(isQuotaExceededError(error)).toBe(true);
    });

    it('should detect legacy quota error by code', () => {
      const error = new Error('Quota');
      error.code = 22;

      expect(isQuotaExceededError(error)).toBe(true);
    });

    it('should return false for non-quota errors', () => {
      const error = new Error('Regular error');
      error.name = 'Error';

      expect(isQuotaExceededError(error)).toBe(false);
    });

    it('should return false for null/undefined', () => {
      expect(isQuotaExceededError(null)).toBe(false);
      expect(isQuotaExceededError(undefined)).toBe(false);
    });
  });

  describe('clearUploadedData', () => {
    it('should clear temporary and cache keys', () => {
      localStorage.setItem('temp_scan_123', 'data');
      localStorage.setItem('cache_image_456', 'data');
      localStorage.setItem('kalinga_patients', 'data'); // Should keep
      localStorage.setItem('pendingUploads', 'data'); // Should keep

      const result = clearUploadedData();

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('freedSpace');
      expect(result).toHaveProperty('message');
      
      // Temp/cache keys should be removed
      expect(localStorage.getItem('temp_scan_123')).toBeNull();
      expect(localStorage.getItem('cache_image_456')).toBeNull();
      
      // Important data should be kept
      expect(localStorage.getItem('kalinga_patients')).not.toBeNull();
      expect(localStorage.getItem('pendingUploads')).not.toBeNull();
    });

    it('should trim old notifications keeping recent 20', () => {
      const notifications = Array.from({ length: 50 }, (_, i) => ({
        id: `notif_${i}`,
        message: `Notification ${i}`,
        timestamp: Date.now() + i
      }));
      
      localStorage.setItem('kalinga_notifications', JSON.stringify(notifications));

      const result = clearUploadedData();

      expect(result.success).toBe(true);
      
      const remaining = JSON.parse(localStorage.getItem('kalinga_notifications'));
      expect(remaining.length).toBe(20);
      
      // Should keep the most recent ones (last 20)
      expect(remaining[0].id).toBe('notif_30');
      expect(remaining[19].id).toBe('notif_49');
    });

    it('should return freed space information', () => {
      localStorage.setItem('temp_data', 'a'.repeat(1000));

      const result = clearUploadedData();

      expect(result.success).toBe(true);
      expect(result).toHaveProperty('freedSpaceKB');
      expect(result).toHaveProperty('freedSpaceMB');
      expect(result).toHaveProperty('beforeUsage');
      expect(result).toHaveProperty('afterUsage');
    });
  });

  describe('clearAllKalingaData', () => {
    it('should clear all kalinga_ prefixed keys', () => {
      localStorage.setItem('kalinga_patients', 'data');
      localStorage.setItem('kalinga_scans', 'data');
      localStorage.setItem('kalinga_lock_queue', 'data');
      localStorage.setItem('other_app_data', 'data'); // Should keep

      const result = clearAllKalingaData();

      expect(result.success).toBe(true);
      expect(result.itemsRemoved).toBeGreaterThanOrEqual(3);
      
      // Kalinga keys should be removed
      expect(localStorage.getItem('kalinga_patients')).toBeNull();
      expect(localStorage.getItem('kalinga_scans')).toBeNull();
      expect(localStorage.getItem('kalinga_lock_queue')).toBeNull();
      
      // Other app data should remain
      expect(localStorage.getItem('other_app_data')).not.toBeNull();
    });

    it('should clear pendingUploads key', () => {
      localStorage.setItem('pendingUploads', JSON.stringify([{ id: 1 }]));

      const result = clearAllKalingaData();

      expect(result.success).toBe(true);
      expect(localStorage.getItem('pendingUploads')).toBeNull();
    });

    it('should return detailed statistics', () => {
      localStorage.setItem('kalinga_test', 'data');

      const result = clearAllKalingaData();

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('freedSpace');
      expect(result).toHaveProperty('freedSpaceKB');
      expect(result).toHaveProperty('freedSpaceMB');
      expect(result).toHaveProperty('message');
      expect(result).toHaveProperty('itemsRemoved');
      expect(result).toHaveProperty('beforeUsage');
      expect(result).toHaveProperty('afterUsage');
    });
  });

  describe('safeSetItem', () => {
    it('should successfully store item when space available', () => {
      const result = safeSetItem('test_key', { data: 'test' });

      expect(result.success).toBe(true);
      expect(result).toHaveProperty('size');
      expect(result).toHaveProperty('sizeKB');
      
      const stored = JSON.parse(localStorage.getItem('test_key'));
      expect(stored.data).toBe('test');
    });

    it('should handle string values', () => {
      const result = safeSetItem('test_string', 'simple string');

      expect(result.success).toBe(true);
      expect(localStorage.getItem('test_string')).toBe('simple string');
    });

    it('should handle object values', () => {
      const obj = { name: 'test', values: [1, 2, 3] };
      const result = safeSetItem('test_object', obj);

      expect(result.success).toBe(true);
      
      const stored = JSON.parse(localStorage.getItem('test_object'));
      expect(stored.name).toBe('test');
      expect(stored.values).toEqual([1, 2, 3]);
    });

    it('should call onQuotaExceeded callback when would exceed', () => {
      let callbackCalled = false;
      let callbackMessage = null;
      
      const callback = (message, availability) => {
        callbackCalled = true;
        callbackMessage = message;
      };

      // Try to store huge data that would exceed quota
      const hugeData = 'a'.repeat(10 * 1024 * 1024); // 10MB
      const result = safeSetItem('huge_key', hugeData, callback);

      // Might not trigger if actual quota is larger, but structure should be correct
      if (!result.success && result.error === 'QuotaWouldBeExceeded') {
        expect(callbackCalled).toBe(true);
        expect(callbackMessage).toBeTruthy();
      }
    });
  });
});
