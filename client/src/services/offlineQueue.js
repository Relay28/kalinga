import storage from './storage';
import { api } from './api';
import { isQuotaExceededError, safeSetItem } from './storageMonitor';

const QUEUE_KEY = 'kalinga_offline_queue';
const QUEUE_LOCK_RESOURCE = 'offline_queue';

export const offlineQueue = {
  getQueue() {
    return storage.get(QUEUE_KEY, []);
  },

  enqueue(scan) {
    // Acquire lock before modifying queue
    const lockResult = storage.acquireLock(QUEUE_LOCK_RESOURCE);
    
    if (!lockResult.acquired) {
      console.error('Failed to acquire queue lock for enqueue operation', lockResult);
      throw new Error('Another session is currently modifying the queue. Please try again.');
    }
    
    try {
      const queue = this.getQueue();
      // Prevent duplicate entries
      const filtered = queue.filter(item => item.id !== scan.id);
      filtered.push(scan);
      
      // Use safe set with quota handling
      const result = safeSetItem(
        QUEUE_KEY, 
        filtered,
        (message, availability) => {
          console.error('Storage quota exceeded while enqueuing:', message);
          throw new Error(`Storage quota exceeded. ${message}. Please clear uploaded data to free space.`);
        }
      );
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to save to storage');
      }
      
      return filtered.length;
    } finally {
      // Always release lock
      storage.releaseLock(QUEUE_LOCK_RESOURCE);
    }
  },

  dequeue(scanId) {
    // Acquire lock before modifying queue
    const lockResult = storage.acquireLock(QUEUE_LOCK_RESOURCE);
    
    if (!lockResult.acquired) {
      console.error('Failed to acquire queue lock for dequeue operation', lockResult);
      throw new Error('Another session is currently modifying the queue. Please try again.');
    }
    
    try {
      const queue = this.getQueue();
      const filtered = queue.filter(item => item.id !== scanId);
      storage.set(QUEUE_KEY, filtered);
      return filtered.length;
    } finally {
      // Always release lock
      storage.releaseLock(QUEUE_LOCK_RESOURCE);
    }
  },

  clearQueue() {
    // Acquire lock before clearing queue
    const lockResult = storage.acquireLock(QUEUE_LOCK_RESOURCE);
    
    if (!lockResult.acquired) {
      console.error('Failed to acquire queue lock for clear operation', lockResult);
      throw new Error('Another session is currently modifying the queue. Please try again.');
    }
    
    try {
      storage.remove(QUEUE_KEY);
    } finally {
      // Always release lock
      storage.releaseLock(QUEUE_LOCK_RESOURCE);
    }
  },

  // Check if queue is currently locked
  isLocked() {
    const status = storage.checkLockStatus(QUEUE_LOCK_RESOURCE);
    return status;
  },

  // Get detailed lock information for UI display
  getLockInfo() {
    const status = storage.checkLockStatus(QUEUE_LOCK_RESOURCE);
    if (!status.locked) {
      return {
        locked: false,
        message: 'Queue is available'
      };
    }
    
    const remainingSeconds = Math.ceil(status.remainingTime / 1000);
    return {
      locked: true,
      sessionId: status.sessionId,
      age: status.age,
      remainingTime: status.remainingTime,
      message: `Another session is active (auto-release in ${remainingSeconds}s)`
    };
  },

  // Force release lock (for debugging/recovery)
  forceReleaseLock() {
    const lockKey = `kalinga_lock_${QUEUE_LOCK_RESOURCE}`;
    try {
      localStorage.removeItem(lockKey);
      return { success: true, message: 'Lock released successfully' };
    } catch (err) {
      console.error('Failed to force release lock:', err);
      return { success: false, error: err.message };
    }
  },

  // Sends all queued scans to the backend API and clears synced records
  // onProgress callback receives (current, total, currentScanInfo)
  async syncQueue(onProgress = null) {
    // Acquire lock before syncing
    const lockResult = storage.acquireLock(QUEUE_LOCK_RESOURCE);
    
    if (!lockResult.acquired) {
      console.error('Failed to acquire queue lock for sync operation', lockResult);
      return {
        success: false,
        error: 'Another session is currently modifying the queue. Please try again.',
        lockInfo: lockResult
      };
    }
    
    try {
      const queue = this.getQueue();
      if (queue.length === 0) {
        return { success: true, count: 0, syncedCount: 0 };
      }

      const syncedIds = [];
      const errors = [];
      const total = queue.length;

      // Correct array copy to process records
      const recordsToSync = [...queue];

      for (let i = 0; i < recordsToSync.length; i++) {
        const scan = recordsToSync[i];
        const current = i + 1;
        
        // Notify progress
        if (onProgress) {
          onProgress(current, total, {
            patientName: scan.patient ? `${scan.patient.firstName} ${scan.patient.lastName}` : 'Unknown',
            scanId: scan.id
          });
        }
        
        try {
          // First sync/save patient if not saved on server
          if (scan.patient) {
            await api.registerPatient(scan.patient);
          }
          
          // Check if this scan has triage packet data for OB-GYN queue
          if (scan.triagePacket) {
            // Submit directly to triage endpoint (OB-GYN queue)
            await api.submitTriagePacket(scan.triagePacket);
          } else {
            // Fallback: legacy scan format
            await api.saveScan({
              ...scan,
              status: 'Submitted' // Set status to Submitted on server sync
            });
          }
          
          syncedIds.push(scan.id);
        } catch (err) {
          console.error(`Failed to sync scan ${scan.id}:`, err);
          const errorMessage = err.message || 'Network error occurred';
          errors.push({ 
            id: scan.id, 
            error: errorMessage,
            patientName: scan.patient ? `${scan.patient.firstName} ${scan.patient.lastName}` : 'Unknown',
            timestamp: new Date().toISOString()
          });
        }
      }

      // Remove successfully synced IDs from local queue
      let remainingQueue = this.getQueue();
      remainingQueue = remainingQueue.filter(scan => !syncedIds.includes(scan.id));
      storage.set(QUEUE_KEY, remainingQueue);

      if (errors.length > 0) {
        return {
          success: false,
          syncedCount: syncedIds.length,
          failedCount: errors.length,
          errors
        };
      }

      return {
        success: true,
        syncedCount: syncedIds.length,
        failedCount: 0
      };
    } finally {
      // Always release lock
      storage.releaseLock(QUEUE_LOCK_RESOURCE);
    }
  },

  // Get failed uploads (scans that remain in queue after sync attempts)
  getFailedUploads() {
    const queue = this.getQueue();
    // In Phase 1, all items in queue after a sync attempt are considered "pending retry"
    // Phase 2 will track explicit failure state
    return queue;
  },

  // Retry specific failed upload by ID
  async retryUpload(scanId, onProgress = null) {
    const lockResult = storage.acquireLock(QUEUE_LOCK_RESOURCE);
    
    if (!lockResult.acquired) {
      return {
        success: false,
        error: 'Another session is currently modifying the queue. Please try again.'
      };
    }
    
    try {
      const queue = this.getQueue();
      const scan = queue.find(s => s.id === scanId);
      
      if (!scan) {
        return {
          success: false,
          error: 'Scan not found in queue'
        };
      }

      if (onProgress) {
        onProgress(1, 1, {
          patientName: scan.patient ? `${scan.patient.firstName} ${scan.patient.lastName}` : 'Unknown',
          scanId: scan.id
        });
      }

      try {
        // First sync/save patient if not saved on server
        if (scan.patient) {
          await api.registerPatient(scan.patient);
        }
        
        // Sync scan record
        await api.saveScan({
          ...scan,
          status: 'Submitted'
        });
        
        // Remove from queue on success
        const remainingQueue = queue.filter(s => s.id !== scanId);
        storage.set(QUEUE_KEY, remainingQueue);
        
        return {
          success: true,
          scanId
        };
      } catch (err) {
        console.error(`Failed to retry scan ${scanId}:`, err);
        return {
          success: false,
          error: err.message || 'Network error occurred',
          scanId
        };
      }
    } finally {
      storage.releaseLock(QUEUE_LOCK_RESOURCE);
    }
  }
};
