import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import storage from '../../services/storage';

describe('Transaction Locking Mechanism', () => {
  const TEST_RESOURCE = 'test_resource';
  const LOCK_KEY = `kalinga_lock_${TEST_RESOURCE}`;

  beforeEach(() => {
    // Clear all locks before each test
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    // Clean up after each test
    localStorage.clear();
    sessionStorage.clear();
  });

  describe('Lock Acquisition', () => {
    it('should successfully acquire lock when no lock exists', () => {
      const result = storage.acquireLock(TEST_RESOURCE);
      
      expect(result.acquired).toBe(true);
      expect(result.sessionId).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('should fail to acquire lock when another session holds it', () => {
      // First session acquires lock
      const firstAcquire = storage.acquireLock(TEST_RESOURCE);
      expect(firstAcquire.acquired).toBe(true);

      // Simulate different session by changing session ID
      const originalSessionId = storage.getSessionId();
      sessionStorage.setItem('kalinga_session_id', 'different_session_123');

      // Second session tries to acquire
      const secondAcquire = storage.acquireLock(TEST_RESOURCE);
      
      expect(secondAcquire.acquired).toBe(false);
      expect(secondAcquire.heldBy).toBe(firstAcquire.sessionId);
      expect(secondAcquire.age).toBeDefined();

      // Restore session
      sessionStorage.setItem('kalinga_session_id', originalSessionId);
    });

    it('should auto-release stale lock after 30 seconds', () => {
      // Manually create an old lock (31 seconds ago)
      const staleLockData = {
        sessionId: 'old_session_123',
        timestamp: Date.now() - 31000, // 31 seconds ago
        resource: TEST_RESOURCE
      };
      localStorage.setItem(LOCK_KEY, JSON.stringify(staleLockData));

      // Try to acquire - should succeed due to timeout
      const result = storage.acquireLock(TEST_RESOURCE);
      
      expect(result.acquired).toBe(true);
      expect(result.sessionId).not.toBe('old_session_123');
    });

    it('should not auto-release fresh lock within 30 seconds', () => {
      // Create a fresh lock (5 seconds ago)
      const freshLockData = {
        sessionId: 'other_session_456',
        timestamp: Date.now() - 5000, // 5 seconds ago
        resource: TEST_RESOURCE
      };
      localStorage.setItem(LOCK_KEY, JSON.stringify(freshLockData));

      // Change session to simulate different session
      sessionStorage.setItem('kalinga_session_id', 'current_session_789');

      // Try to acquire - should fail
      const result = storage.acquireLock(TEST_RESOURCE);
      
      expect(result.acquired).toBe(false);
      expect(result.heldBy).toBe('other_session_456');
    });
  });

  describe('Lock Release', () => {
    it('should successfully release lock when session owns it', () => {
      // Acquire lock
      const acquireResult = storage.acquireLock(TEST_RESOURCE);
      expect(acquireResult.acquired).toBe(true);

      // Release lock
      const releaseResult = storage.releaseLock(TEST_RESOURCE);
      
      expect(releaseResult.released).toBe(true);
      
      // Verify lock is gone
      const lockData = localStorage.getItem(LOCK_KEY);
      expect(lockData).toBeNull();
    });

    it('should fail to release lock owned by different session', () => {
      // First session acquires lock
      const acquireResult = storage.acquireLock(TEST_RESOURCE);
      expect(acquireResult.acquired).toBe(true);
      const originalSessionId = acquireResult.sessionId;

      // Switch to different session
      sessionStorage.setItem('kalinga_session_id', 'different_session_999');

      // Try to release - should fail
      const releaseResult = storage.releaseLock(TEST_RESOURCE);
      
      expect(releaseResult.released).toBe(false);
      expect(releaseResult.reason).toBe('not_owner');
      expect(releaseResult.owner).toBe(originalSessionId);

      // Verify lock still exists
      const lockData = localStorage.getItem(LOCK_KEY);
      expect(lockData).not.toBeNull();
    });

    it('should handle releasing non-existent lock gracefully', () => {
      // Try to release lock that doesn't exist
      const releaseResult = storage.releaseLock(TEST_RESOURCE);
      
      expect(releaseResult.released).toBe(true);
      expect(releaseResult.reason).toBe('no_lock');
    });
  });

  describe('Lock Status Check', () => {
    it('should return unlocked status when no lock exists', () => {
      const status = storage.checkLockStatus(TEST_RESOURCE);
      
      expect(status.locked).toBe(false);
    });

    it('should return locked status with details when lock exists', () => {
      // Acquire lock
      const acquireResult = storage.acquireLock(TEST_RESOURCE);
      
      // Check status
      const status = storage.checkLockStatus(TEST_RESOURCE);
      
      expect(status.locked).toBe(true);
      expect(status.sessionId).toBe(acquireResult.sessionId);
      expect(status.age).toBeDefined();
      expect(status.age).toBeLessThan(1000); // Should be very recent
      expect(status.remainingTime).toBeDefined();
      expect(status.remainingTime).toBeGreaterThan(29000); // Should be close to 30s
    });

    it('should detect stale lock', () => {
      // Create stale lock (35 seconds ago)
      const staleLockData = {
        sessionId: 'stale_session_111',
        timestamp: Date.now() - 35000,
        resource: TEST_RESOURCE
      };
      localStorage.setItem(LOCK_KEY, JSON.stringify(staleLockData));

      // Check status
      const status = storage.checkLockStatus(TEST_RESOURCE);
      
      expect(status.locked).toBe(false);
      expect(status.stale).toBe(true);
      expect(status.age).toBeGreaterThan(30000);
    });
  });

  describe('Session ID Management', () => {
    it('should generate session ID if none exists', () => {
      const sessionId = storage.getSessionId();
      
      expect(sessionId).toBeDefined();
      expect(sessionId).toMatch(/^session_/);
      
      // Verify it's stored in sessionStorage
      const stored = sessionStorage.getItem('kalinga_session_id');
      expect(stored).toBe(sessionId);
    });

    it('should reuse existing session ID', () => {
      const firstCall = storage.getSessionId();
      const secondCall = storage.getSessionId();
      
      expect(firstCall).toBe(secondCall);
    });

    it('should generate unique session IDs for different sessions', () => {
      const firstId = storage.getSessionId();
      
      // Clear and get new ID
      sessionStorage.clear();
      const secondId = storage.getSessionId();
      
      expect(firstId).not.toBe(secondId);
    });
  });

  describe('Force Release All Locks', () => {
    it('should release all locks when called', () => {
      // Create multiple locks
      storage.acquireLock('resource_1');
      storage.acquireLock('resource_2');
      storage.acquireLock('resource_3');

      // Verify locks exist
      expect(localStorage.getItem('kalinga_lock_resource_1')).not.toBeNull();
      expect(localStorage.getItem('kalinga_lock_resource_2')).not.toBeNull();
      expect(localStorage.getItem('kalinga_lock_resource_3')).not.toBeNull();

      // Release all
      const result = storage.releaseAllLocks();
      
      expect(result.released).toBe(true);
      expect(result.count).toBe(3);

      // Verify all locks are gone
      expect(localStorage.getItem('kalinga_lock_resource_1')).toBeNull();
      expect(localStorage.getItem('kalinga_lock_resource_2')).toBeNull();
      expect(localStorage.getItem('kalinga_lock_resource_3')).toBeNull();
    });

    it('should handle no locks gracefully', () => {
      const result = storage.releaseAllLocks();
      
      expect(result.released).toBe(true);
      expect(result.count).toBe(0);
    });
  });

  describe('Concurrent Access Simulation', () => {
    it('should prevent concurrent modifications', () => {
      // Session 1 acquires lock
      const session1Acquire = storage.acquireLock(TEST_RESOURCE);
      expect(session1Acquire.acquired).toBe(true);

      // Session 2 tries to acquire (simulate by changing session ID)
      const originalSessionId = storage.getSessionId();
      sessionStorage.setItem('kalinga_session_id', 'session_2');
      
      const session2Acquire = storage.acquireLock(TEST_RESOURCE);
      expect(session2Acquire.acquired).toBe(false);

      // Restore session 1
      sessionStorage.setItem('kalinga_session_id', originalSessionId);

      // Session 1 releases
      const session1Release = storage.releaseLock(TEST_RESOURCE);
      expect(session1Release.released).toBe(true);

      // Now session 2 can acquire
      sessionStorage.setItem('kalinga_session_id', 'session_2');
      const session2SecondTry = storage.acquireLock(TEST_RESOURCE);
      expect(session2SecondTry.acquired).toBe(true);
    });
  });
});
