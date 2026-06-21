import { isQuotaExceededError } from './storageMonitor';

const LOCK_KEY_PREFIX = 'kalinga_lock_';
const LOCK_TIMEOUT = 30000; // 30 seconds in milliseconds

const storage = {
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (err) {
      console.error(`Error reading key ${key} from localStorage:`, err);
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return { success: true };
    } catch (err) {
      console.error(`Error writing key ${key} to localStorage:`, err);
      
      // Check if it's a quota exceeded error
      if (isQuotaExceededError(err)) {
        return { 
          success: false, 
          error: 'QuotaExceededError',
          message: 'Storage quota exceeded. Please free up space by clearing uploaded data.'
        };
      }
      
      return { 
        success: false, 
        error: err.name || 'StorageError',
        message: err.message 
      };
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (err) {
      console.error(`Error removing key ${key} from localStorage:`, err);
      return false;
    }
  },

  // Transaction locking mechanism for mutex-like behavior
  acquireLock(resource) {
    const lockKey = `${LOCK_KEY_PREFIX}${resource}`;
    const now = Date.now();
    
    try {
      const existingLock = localStorage.getItem(lockKey);
      
      if (existingLock) {
        const lockData = JSON.parse(existingLock);
        const lockAge = now - lockData.timestamp;
        
        // Auto-release lock after 30 seconds to handle crashed sessions
        if (lockAge < LOCK_TIMEOUT) {
          console.warn(`Lock for ${resource} is held by another session`);
          return {
            acquired: false,
            heldBy: lockData.sessionId,
            age: lockAge
          };
        } else {
          console.log(`Auto-releasing stale lock for ${resource} (age: ${lockAge}ms)`);
          // Lock expired, proceed to acquire
        }
      }
      
      // Acquire the lock
      const sessionId = this._getSessionId();
      const lockData = {
        sessionId,
        timestamp: now,
        resource
      };
      
      localStorage.setItem(lockKey, JSON.stringify(lockData));
      
      return {
        acquired: true,
        sessionId,
        timestamp: now
      };
    } catch (err) {
      console.error(`Error acquiring lock for ${resource}:`, err);
      return {
        acquired: false,
        error: err.message
      };
    }
  },

  releaseLock(resource) {
    const lockKey = `${LOCK_KEY_PREFIX}${resource}`;
    
    try {
      const existingLock = localStorage.getItem(lockKey);
      
      if (existingLock) {
        const lockData = JSON.parse(existingLock);
        const currentSessionId = this._getSessionId();
        
        // Only release if we own the lock
        if (lockData.sessionId === currentSessionId) {
          localStorage.removeItem(lockKey);
          return { released: true };
        } else {
          console.warn(`Cannot release lock for ${resource} - owned by different session`);
          return { 
            released: false, 
            reason: 'not_owner',
            owner: lockData.sessionId 
          };
        }
      }
      
      return { released: true, reason: 'no_lock' };
    } catch (err) {
      console.error(`Error releasing lock for ${resource}:`, err);
      return { 
        released: false, 
        error: err.message 
      };
    }
  },

  checkLockStatus(resource) {
    const lockKey = `${LOCK_KEY_PREFIX}${resource}`;
    const now = Date.now();
    
    try {
      const existingLock = localStorage.getItem(lockKey);
      
      if (!existingLock) {
        return { locked: false };
      }
      
      const lockData = JSON.parse(existingLock);
      const lockAge = now - lockData.timestamp;
      
      if (lockAge >= LOCK_TIMEOUT) {
        return { 
          locked: false, 
          stale: true,
          age: lockAge 
        };
      }
      
      return {
        locked: true,
        sessionId: lockData.sessionId,
        age: lockAge,
        remainingTime: LOCK_TIMEOUT - lockAge
      };
    } catch (err) {
      console.error(`Error checking lock status for ${resource}:`, err);
      return { locked: false, error: err.message };
    }
  },

  // Generate or retrieve session ID
  _getSessionId() {
    const sessionKey = 'kalinga_session_id';
    let sessionId = sessionStorage.getItem(sessionKey);
    
    if (!sessionId) {
      // Generate UUID v4 for session
      sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem(sessionKey, sessionId);
    }
    
    return sessionId;
  },

  // Get current session ID for debugging
  getSessionId() {
    return this._getSessionId();
  },

  // Force release all locks (for debugging/admin purposes)
  releaseAllLocks() {
    try {
      const keys = Object.keys(localStorage);
      const lockKeys = keys.filter(key => key.startsWith(LOCK_KEY_PREFIX));
      
      lockKeys.forEach(key => {
        localStorage.removeItem(key);
      });
      
      return { 
        released: true, 
        count: lockKeys.length 
      };
    } catch (err) {
      console.error('Error releasing all locks:', err);
      return { 
        released: false, 
        error: err.message 
      };
    }
  }
};

export default storage;
