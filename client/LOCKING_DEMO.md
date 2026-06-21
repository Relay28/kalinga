# Transaction Locking Demo

## Quick Test in Browser Console

Open the Kalinga midwife dashboard and try these commands in the browser console to see the locking mechanism in action:

### 1. Check Current Session

```javascript
// Get your current session ID
console.log('Current Session:', storage.getSessionId());

// Check if queue is locked
console.log('Lock Status:', offlineQueue.isLocked());
```

### 2. Test Lock Acquisition

```javascript
// Manually acquire a lock
const lockResult = storage.acquireLock('offline_queue');
console.log('Lock Acquired:', lockResult);

// Try to add to queue (should work because we own the lock, but will fail at the operation level)
// This demonstrates the lock is held
```

### 3. Simulate Another Session

```javascript
// Remember your current session ID
const mySession = storage.getSessionId();
console.log('My Session:', mySession);

// Acquire lock as current session
storage.acquireLock('offline_queue');

// Simulate a different session
sessionStorage.setItem('kalinga_session_id', 'fake_session_999');

// Try to acquire lock as "different session" - should fail
const lockResult2 = storage.acquireLock('offline_queue');
console.log('Lock Result from "other session":', lockResult2);
// Should show: { acquired: false, heldBy: [your original session], age: [...] }

// Restore your session
sessionStorage.setItem('kalinga_session_id', mySession);

// Release the lock
storage.releaseLock('offline_queue');
```

### 4. Test Auto-Release (30 Second Timeout)

```javascript
// Manually create an old lock (simulating a crashed session)
const staleLock = {
  sessionId: 'crashed_session_123',
  timestamp: Date.now() - 35000, // 35 seconds ago
  resource: 'offline_queue'
};
localStorage.setItem('kalinga_lock_offline_queue', JSON.stringify(staleLock));

// Check status - should show stale
console.log('Stale Lock Check:', storage.checkLockStatus('offline_queue'));
// Should show: { locked: false, stale: true, age: 35000+ }

// Try to acquire - should succeed by auto-releasing stale lock
const acquireResult = storage.acquireLock('offline_queue');
console.log('Acquired After Stale:', acquireResult);
// Should show: { acquired: true, ... }

// Clean up
storage.releaseLock('offline_queue');
```

### 5. Test Queue Operations with Locking

```javascript
// Add a test scan to queue
const testScan = {
  id: 'test_scan_' + Date.now(),
  patient: {
    id: 'test_patient_123',
    firstName: 'Test',
    lastName: 'Patient'
  },
  status: 'Ready for Submission'
};

// This should work (acquires and releases lock automatically)
try {
  const count = offlineQueue.enqueue(testScan);
  console.log('Enqueued successfully, queue count:', count);
} catch (err) {
  console.error('Enqueue failed:', err.message);
}

// Verify no lock is held after operation
console.log('Lock after enqueue:', offlineQueue.isLocked());
// Should show: { locked: false }
```

### 6. Test Concurrent Access (Two Tabs)

**Tab 1:**
```javascript
// Acquire and hold lock
storage.acquireLock('offline_queue');
console.log('Tab 1: Lock acquired');

// Keep lock held (don't release)
// Leave this tab open and switch to Tab 2
```

**Tab 2 (Open in new tab):**
```javascript
// Try to enqueue - should fail with clear error
const testScan = {
  id: 'test_scan_tab2',
  patient: { id: 'p123' }
};

try {
  offlineQueue.enqueue(testScan);
  console.log('Should not see this!');
} catch (err) {
  console.error('Expected error:', err.message);
  // Should show: "Another session is currently modifying the queue. Please try again."
}

// Check lock info
console.log('Lock Info:', offlineQueue.getLockInfo());
// Should show details about Tab 1's lock
```

**Back to Tab 1:**
```javascript
// Release the lock
storage.releaseLock('offline_queue');
console.log('Tab 1: Lock released');
```

**Back to Tab 2:**
```javascript
// Now it should work
try {
  const count = offlineQueue.enqueue(testScan);
  console.log('Tab 2: Enqueued successfully, count:', count);
} catch (err) {
  console.error('Still failed:', err.message);
}
```

### 7. View Lock Status in UI

The dashboard shows lock status in two places:

1. **Warning Banner** (appears when locked):
   - Look at the top of the dashboard
   - Should see yellow warning: "Another session is active"
   - Shows session ID and countdown to auto-release

2. **Status Indicator** (always visible):
   - Look at bottom-right corner
   - Green "UNLOCKED" when available
   - Yellow "LOCKED" when held by another session
   - Click it to see details in toast message

### 8. Force Release (Emergency)

```javascript
// If locks get stuck during testing
offlineQueue.forceReleaseLock();
console.log('Force released queue lock');

// Nuclear option - release ALL locks
storage.releaseAllLocks();
console.log('Released all locks');
```

## Expected Behavior Summary

✅ **Normal Operation:**
- Lock acquired → Operation performed → Lock released
- Lock status shows "UNLOCKED" after each operation
- Multiple operations work sequentially without issues

✅ **Concurrent Access:**
- Tab 1 acquires lock → Tab 2 cannot acquire
- Tab 2 gets clear error message
- UI shows "Another session is active" warning
- After Tab 1 releases, Tab 2 can proceed

✅ **Crashed Session:**
- Tab crashes with lock held
- Lock remains for 30 seconds
- After 30s, any tab can auto-release and acquire
- System recovers automatically

✅ **UI Feedback:**
- Real-time lock status indicator
- Warning banner when lock detected
- Toast messages on lock status clicks
- Countdown timer for auto-release

## Troubleshooting Commands

```javascript
// Check all localStorage keys
console.log('All storage keys:', Object.keys(localStorage));

// Find all locks
Object.keys(localStorage)
  .filter(k => k.startsWith('kalinga_lock_'))
  .forEach(k => console.log(k, localStorage.getItem(k)));

// Check queue contents
console.log('Queue:', offlineQueue.getQueue());

// Get detailed lock info
console.log('Lock Info:', offlineQueue.getLockInfo());

// Check if specific resource is locked
console.log('offline_queue locked?', storage.checkLockStatus('offline_queue'));
```

## Clean Up After Testing

```javascript
// Remove test scans from queue
offlineQueue.clearQueue();

// Release all locks
storage.releaseAllLocks();

// Refresh the dashboard
window.location.reload();
```
