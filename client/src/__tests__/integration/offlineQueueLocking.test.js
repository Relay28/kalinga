import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { offlineQueue } from '../../services/offlineQueue';
import storage from '../../services/storage';

describe('Offline Queue Transaction Locking', () => {
  beforeEach(() => {
    // Clear all storage before each test
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    // Clean up after each test
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Queue Operations with Locking', () => {
    it('should successfully enqueue when no lock exists', () => {
      const scan = {
        id: 'scan_123',
        patient: { id: 'patient_456', firstName: 'Test' },
        status: 'Ready for Submission'
      };

      const count = offlineQueue.enqueue(scan);
      
      expect(count).toBe(1);
      
      const queue = offlineQueue.getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].id).toBe('scan_123');
    });

    it('should throw error when trying to enqueue with active lock', () => {
      // Session 1 acquires lock
      const lockResult = storage.acquireLock('offline_queue');
      expect(lockResult.acquired).toBe(true);

      // Change session to simulate different tab/window
      const originalSessionId = storage.getSessionId();
      sessionStorage.setItem('kalinga_session_id', 'different_session_789');

      // Session 2 tries to enqueue - should fail
      const scan = {
        id: 'scan_456',
        patient: { id: 'patient_789' },
        status: 'Ready for Submission'
      };

      expect(() => {
        offlineQueue.enqueue(scan);
      }).toThrow('Another session is currently modifying the queue');

      // Restore original session
      sessionStorage.setItem('kalinga_session_id', originalSessionId);
      storage.releaseLock('offline_queue');
    });

    it('should successfully dequeue when no lock exists', () => {
      // Add item first
      const scan = {
        id: 'scan_999',
        patient: { id: 'patient_111' },
        status: 'Ready for Submission'
      };
      offlineQueue.enqueue(scan);
      expect(offlineQueue.getQueue()).toHaveLength(1);

      // Dequeue
      const count = offlineQueue.dequeue('scan_999');
      
      expect(count).toBe(0);
      expect(offlineQueue.getQueue()).toHaveLength(0);
    });

    it('should throw error when trying to dequeue with active lock', () => {
      // Add item first
      const scan = {
        id: 'scan_888',
        patient: { id: 'patient_222' },
        status: 'Ready for Submission'
      };
      offlineQueue.enqueue(scan);

      // Session 1 acquires lock
      const lockResult = storage.acquireLock('offline_queue');
      expect(lockResult.acquired).toBe(true);

      // Change session
      const originalSessionId = storage.getSessionId();
      sessionStorage.setItem('kalinga_session_id', 'another_session_456');

      // Session 2 tries to dequeue - should fail
      expect(() => {
        offlineQueue.dequeue('scan_888');
      }).toThrow('Another session is currently modifying the queue');

      // Restore and clean up
      sessionStorage.setItem('kalinga_session_id', originalSessionId);
      storage.releaseLock('offline_queue');
    });

    it('should clear queue successfully when no lock exists', () => {
      // Add multiple items
      offlineQueue.enqueue({ id: 'scan_1', patient: { id: 'p1' } });
      offlineQueue.enqueue({ id: 'scan_2', patient: { id: 'p2' } });
      offlineQueue.enqueue({ id: 'scan_3', patient: { id: 'p3' } });
      
      expect(offlineQueue.getQueue()).toHaveLength(3);

      // Clear queue
      offlineQueue.clearQueue();
      
      expect(offlineQueue.getQueue()).toHaveLength(0);
    });

    it('should throw error when trying to clear queue with active lock', () => {
      // Add items
      offlineQueue.enqueue({ id: 'scan_1', patient: { id: 'p1' } });
      
      // Session 1 acquires lock
      const lockResult = storage.acquireLock('offline_queue');
      expect(lockResult.acquired).toBe(true);

      // Change session
      const originalSessionId = storage.getSessionId();
      sessionStorage.setItem('kalinga_session_id', 'session_clear_test');

      // Session 2 tries to clear - should fail
      expect(() => {
        offlineQueue.clearQueue();
      }).toThrow('Another session is currently modifying the queue');

      // Restore
      sessionStorage.setItem('kalinga_session_id', originalSessionId);
      storage.releaseLock('offline_queue');
    });
  });

  describe('Lock Auto-Release After 30 Seconds', () => {
    it('should allow enqueue after stale lock expires', () => {
      // Manually create stale lock (35 seconds old)
      const staleLockData = {
        sessionId: 'crashed_session_999',
        timestamp: Date.now() - 35000, // 35 seconds ago
        resource: 'offline_queue'
      };
      localStorage.setItem('kalinga_lock_offline_queue', JSON.stringify(staleLockData));

      // Try to enqueue - should succeed because lock is stale
      const scan = {
        id: 'scan_after_stale',
        patient: { id: 'patient_stale' },
        status: 'Ready for Submission'
      };

      const count = offlineQueue.enqueue(scan);
      
      expect(count).toBe(1);
      
      const queue = offlineQueue.getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].id).toBe('scan_after_stale');
    });
  });

  describe('Lock Status Check', () => {
    it('should return unlocked status when no lock exists', () => {
      const status = offlineQueue.isLocked();
      
      expect(status.locked).toBe(false);
    });

    it('should return locked status when lock is active', () => {
      // Acquire lock
      const lockResult = storage.acquireLock('offline_queue');
      expect(lockResult.acquired).toBe(true);

      // Check status
      const status = offlineQueue.isLocked();
      
      expect(status.locked).toBe(true);
      expect(status.sessionId).toBeDefined();
      expect(status.age).toBeDefined();
      expect(status.remainingTime).toBeGreaterThan(0);

      // Clean up
      storage.releaseLock('offline_queue');
    });

    it('should get detailed lock info for UI', () => {
      // No lock - should show available
      const noLockInfo = offlineQueue.getLockInfo();
      expect(noLockInfo.locked).toBe(false);
      expect(noLockInfo.message).toContain('available');

      // Acquire lock
      storage.acquireLock('offline_queue');

      // With lock - should show details
      const lockInfo = offlineQueue.getLockInfo();
      expect(lockInfo.locked).toBe(true);
      expect(lockInfo.sessionId).toBeDefined();
      expect(lockInfo.message).toContain('Another session is active');
      expect(lockInfo.message).toContain('auto-release');

      // Clean up
      storage.releaseLock('offline_queue');
    });
  });

  describe('Force Release Lock', () => {
    it('should force release lock for recovery', () => {
      // Acquire lock
      const lockResult = storage.acquireLock('offline_queue');
      expect(lockResult.acquired).toBe(true);

      // Verify lock exists
      const status1 = offlineQueue.isLocked();
      expect(status1.locked).toBe(true);

      // Force release
      const releaseResult = offlineQueue.forceReleaseLock();
      expect(releaseResult.success).toBe(true);

      // Verify lock is gone
      const status2 = offlineQueue.isLocked();
      expect(status2.locked).toBe(false);
    });
  });

  describe('Sync Queue with Locking', () => {
    it('should return error when trying to sync with active lock from another session', async () => {
      // Add item to queue
      offlineQueue.enqueue({
        id: 'scan_sync_test',
        patient: { id: 'patient_sync' },
        status: 'Ready for Submission'
      });

      // Session 1 acquires lock
      const lockResult = storage.acquireLock('offline_queue');
      expect(lockResult.acquired).toBe(true);

      // Change session
      const originalSessionId = storage.getSessionId();
      sessionStorage.setItem('kalinga_session_id', 'sync_test_session');

      // Session 2 tries to sync - should fail gracefully
      const result = await offlineQueue.syncQueue();
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Another session is currently modifying the queue');
      expect(result.lockInfo).toBeDefined();

      // Restore
      sessionStorage.setItem('kalinga_session_id', originalSessionId);
      storage.releaseLock('offline_queue');
    });
  });

  describe('Lock Behavior Across Multiple Operations', () => {
    it('should acquire and release lock for each operation', () => {
      const scan1 = { id: 'scan_1', patient: { id: 'p1' } };
      const scan2 = { id: 'scan_2', patient: { id: 'p2' } };

      // Enqueue scan 1 - lock should be acquired and released
      offlineQueue.enqueue(scan1);
      let status = offlineQueue.isLocked();
      expect(status.locked).toBe(false); // Lock released after enqueue

      // Enqueue scan 2 - should work fine
      offlineQueue.enqueue(scan2);
      status = offlineQueue.isLocked();
      expect(status.locked).toBe(false);

      // Dequeue - should work fine
      offlineQueue.dequeue('scan_1');
      status = offlineQueue.isLocked();
      expect(status.locked).toBe(false);

      // Final queue should have only scan 2
      const queue = offlineQueue.getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].id).toBe('scan_2');
    });

    it('should prevent duplicate entries during enqueue', () => {
      const scan = { id: 'scan_duplicate', patient: { id: 'p_dup' } };

      // Enqueue same scan twice
      offlineQueue.enqueue(scan);
      offlineQueue.enqueue(scan);

      // Should only have one entry
      const queue = offlineQueue.getQueue();
      expect(queue).toHaveLength(1);
      expect(queue[0].id).toBe('scan_duplicate');
    });
  });
});
