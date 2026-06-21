# Notification Service Integration Guide

## Migrating from App.jsx Polling to Notification Service

The current implementation in `App.jsx` uses a basic `useEffect` hook for polling. This guide shows how to migrate to the new notification service for better separation of concerns and maintainability.

## Current Implementation (App.jsx)

```javascript
// Current polling logic in App.jsx (lines 32-50)
useEffect(() => {
  let interval;
  if (isOnline) {
    const fetchNotifs = async () => {
      try {
        const list = await api.getNotifications();
        const unread = list.filter(n => n.status === 'unread').length;
        setUnreadNotifsCount(unread);
      } catch (err) {
        console.warn("Failed to fetch notification count:", err);
      }
    };
    fetchNotifs();
    interval = setInterval(fetchNotifs, 8000);
  }
  return () => clearInterval(interval);
}, [isOnline]);
```

## New Implementation Using Notification Service

### Step 1: Import the Service

```javascript
// At the top of App.jsx
import notificationService from './services/notificationService';
```

### Step 2: Replace the useEffect Hook

Replace the existing notification polling `useEffect` with:

```javascript
// Poll for notifications when online
useEffect(() => {
  if (!isOnline) {
    notificationService.stopPolling();
    // Load cached notifications for offline viewing
    const cached = notificationService.getCachedNotifications();
    const unread = cached.filter(n => n.status === 'unread').length;
    setUnreadNotifsCount(unread);
    return;
  }

  // Start polling when online
  notificationService.startPolling((update) => {
    setUnreadNotifsCount(update.unreadCount);
    
    // Optional: Show warning if using cached data due to error
    if (update.fromCache && update.error) {
      console.warn('Using cached notifications:', update.error);
    }
  });

  return () => {
    notificationService.stopPolling();
  };
}, [isOnline]);
```

### Complete Modified App.jsx Example

```javascript
import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/Login';
import Splash from './pages/Splash';
import MidwifeDashboard from './pages/MidwifeDashboard';
import PatientRegistration from './pages/PatientRegistration';
import RegisteringTriageSession from './pages/RegisteringTriageSession';
import ScanSimulator from './pages/ScanSimulator';
import TriageSummary from './pages/TriageSummary';
import ScanConfirmation from './pages/ScanConfirmation';
import PatientDetails from './pages/PatientDetails';
import Notifications from './pages/Notifications';
import SpecialistDashboard from './pages/SpecialistDashboard';
import { api } from './services/api';
import notificationService from './services/notificationService'; // NEW IMPORT

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [activePatient, setActivePatient] = useState(null);
  const [activeScan, setActiveScan] = useState(null);
  const [syncQueueCount, setSyncQueueCount] = useState(0);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

  useEffect(() => {
    const initialCount = parseInt(localStorage.getItem('syncQueueCount') || '0', 10);
    setSyncQueueCount(initialCount);
  }, []);

  // NEW: Improved notification polling using service
  useEffect(() => {
    if (!isOnline) {
      notificationService.stopPolling();
      // Load cached notifications for offline viewing
      const cached = notificationService.getCachedNotifications();
      const unread = cached.filter(n => n.status === 'unread').length;
      setUnreadNotifsCount(unread);
      return;
    }

    // Start polling when online
    notificationService.startPolling((update) => {
      setUnreadNotifsCount(update.unreadCount);
      
      // Log errors but don't disrupt UI
      if (update.fromCache && update.error) {
        console.warn('Using cached notifications:', update.error);
      }
    });

    return () => {
      notificationService.stopPolling();
    };
  }, [isOnline]);

  // ... rest of the component remains the same
}
```

## Benefits of Using Notification Service

### 1. Separation of Concerns
- Polling logic is encapsulated in a dedicated service
- App.jsx focuses on application-level state management
- Easier to test and maintain

### 2. Enhanced Error Handling
- Graceful fallback to cached data on errors
- Consecutive error tracking
- Doesn't crash or disrupt UI on network issues

### 3. Offline Support
- Automatic caching to localStorage
- Seamless transition between online/offline modes
- Cached notifications available immediately when going offline

### 4. Easier Testing
- Service has comprehensive unit tests
- Mocking is simpler for integration tests
- Testable without rendering components

### 5. Future-Proof
- Easy to add ETag support (Phase 2)
- Simple to implement exponential backoff
- Can integrate WebSocket without changing App.jsx

## Updating Notifications.jsx

The `Notifications.jsx` component already supports the caching pattern. No changes needed, but you can enhance it:

### Optional Enhancement

```javascript
// In Notifications.jsx
import notificationService from '../services/notificationService';

export default function Notifications({ isOnline, onToggleOnline, showToast }) {
  // ... existing state ...

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      if (isOnline) {
        // Force immediate fetch instead of waiting for polling interval
        await notificationService.fetchNow();
        const list = notificationService.getCachedNotifications();
        setNotifications(list);
      } else {
        const cached = notificationService.getCachedNotifications();
        setNotifications(cached);
      }
    } catch (err) {
      console.warn("Failed to fetch notifications:", err);
      showToast?.('Failed to load notifications', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReadClick = async (notif) => {
    // Use service method instead of direct API call
    const result = await notificationService.markAsRead(notif.id, isOnline);
    
    if (!result.success) {
      console.warn("Failed to mark notification read:", result.error);
    }

    navigate(`/patient/${notif.patientId}`);
  };

  // ... rest of component
}
```

## Testing the Integration

### Manual Testing Checklist

1. **Online Polling**
   - [ ] Start app in online mode
   - [ ] Verify notifications poll every 8 seconds
   - [ ] Check browser Network tab for GET /api/notifications requests
   - [ ] Verify unread count badge updates

2. **Offline Mode**
   - [ ] Toggle to offline mode
   - [ ] Verify polling stops (no more network requests)
   - [ ] Verify cached notifications still displayed
   - [ ] Verify unread count persists

3. **Error Handling**
   - [ ] Stop backend server while app is running
   - [ ] Verify app continues working with cached data
   - [ ] Check console for warning messages (not errors)
   - [ ] Restart backend, verify polling resumes

4. **Mark as Read**
   - [ ] Click on notification
   - [ ] Verify it marks as read on server (if online)
   - [ ] Verify badge count decreases
   - [ ] Go offline, mark notification, verify local update

### Integration Test Example

```javascript
// Example integration test
import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import App from './App';
import notificationService from './services/notificationService';

vi.mock('./services/notificationService');

describe('App Notification Integration', () => {
  it('should start polling when online', async () => {
    const startPolling = vi.spyOn(notificationService, 'startPolling');
    
    render(<App />);
    
    await waitFor(() => {
      expect(startPolling).toHaveBeenCalled();
    });
  });

  it('should stop polling when offline', async () => {
    const stopPolling = vi.spyOn(notificationService, 'stopPolling');
    
    const { rerender } = render(<App isOnline={true} />);
    rerender(<App isOnline={false} />);
    
    await waitFor(() => {
      expect(stopPolling).toHaveBeenCalled();
    });
  });
});
```

## Rollback Plan

If issues arise, you can quickly rollback to the old implementation:

1. Remove the `notificationService` import
2. Restore the old `useEffect` hook from git history
3. No other files need changes

```bash
# View old implementation
git show HEAD:client/src/App.jsx | grep -A 20 "Poll for notifications"
```

## Performance Comparison

### Before (Old Implementation)
- ❌ No caching - refetches all notifications every 8 seconds
- ❌ No error tracking - console warnings only
- ❌ No offline support - just stops polling
- ❌ Logic mixed with component code

### After (Notification Service)
- ✅ localStorage caching - reduced API calls
- ✅ Error tracking and graceful degradation
- ✅ Full offline support with cached data
- ✅ Clean separation of concerns
- ✅ Comprehensive unit tests (20 tests)

## Migration Checklist

- [ ] Install service (already done: `src/services/notificationService.js`)
- [ ] Import service in `App.jsx`
- [ ] Replace existing `useEffect` hook
- [ ] Test online polling behavior
- [ ] Test offline mode
- [ ] Test error scenarios
- [ ] Optional: Update `Notifications.jsx` to use service methods
- [ ] Run test suite: `npm test -- notificationService.test.js`
- [ ] Verify no console errors in production build

## Support

For questions or issues:
- See `README_NOTIFICATION_SERVICE.md` for full API documentation
- Check test file for usage examples
- Review requirements: `.kiro/specs/.../requirements.md` (14.2, 14.6)
