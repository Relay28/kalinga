# Notification Polling Service

## Overview

The Notification Polling Service provides automatic polling of specialist verification results for the Kalinga AI Maternal Health System. It implements efficient 8-second polling with localStorage caching for offline viewing and graceful error handling.

## Features

### ✅ Implemented (Phase 1)

- **8-Second Polling Interval**: Automatically fetches notifications every 8 seconds when polling is active
- **localStorage Caching**: Caches notifications for offline viewing
- **Graceful Error Handling**: Continues polling even when API errors occur, falls back to cached data
- **Consecutive Error Tracking**: Monitors repeated failures without disrupting UI
- **Unread Count Calculation**: Automatically counts unread notifications
- **Mark as Read**: Updates both server and cache when notifications are marked as read
- **Polling Lifecycle Management**: Start, stop, and status monitoring

### 🔄 Phase 2 Enhancements (Planned)

- **ETag/If-None-Match Headers**: Efficient conditional requests to reduce bandwidth
- **Exponential Backoff**: Smart retry strategy during network issues
- **WebSocket Support**: Real-time push notifications when available

## Usage

### Basic Integration

```javascript
import notificationService from './services/notificationService';

// Start polling with callback
notificationService.startPolling((update) => {
  console.log('Notifications updated:', update);
  console.log('Unread count:', update.unreadCount);
  console.log('Total notifications:', update.total);
  
  // Update your UI state
  setNotifications(update.notifications);
  setUnreadCount(update.unreadCount);
});

// Stop polling when component unmounts
notificationService.stopPolling();
```

### React Hook Example

```javascript
import { useEffect, useState } from 'react';
import notificationService from './services/notificationService';

function useNotifications(isOnline) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!isOnline) {
      notificationService.stopPolling();
      // Load cached notifications for offline viewing
      const cached = notificationService.getCachedNotifications();
      setNotifications(cached);
      setUnreadCount(cached.filter(n => n.status === 'unread').length);
      return;
    }

    // Start polling when online
    notificationService.startPolling((update) => {
      setNotifications(update.notifications);
      setUnreadCount(update.unreadCount);
      
      if (update.fromCache) {
        console.warn('Using cached notifications due to error:', update.error);
      }
    });

    return () => {
      notificationService.stopPolling();
    };
  }, [isOnline]);

  return { notifications, unreadCount };
}
```

### Marking Notifications as Read

```javascript
// When user clicks on a notification
const handleNotificationClick = async (notificationId) => {
  const result = await notificationService.markAsRead(notificationId, isOnline);
  
  if (result.success) {
    // Navigate to patient details or show notification content
    navigate(`/patient/${notification.patientId}`);
  } else {
    console.error('Failed to mark as read:', result.error);
  }
};
```

### Manual Refresh

```javascript
// Force an immediate fetch (useful for pull-to-refresh)
await notificationService.fetchNow();
```

### Status Monitoring

```javascript
const status = notificationService.getStatus();
console.log('Is polling:', status.isPolling);
console.log('Error count:', status.errorCount);
console.log('Polling interval:', status.pollingInterval);
console.log('Cache metadata:', status.metadata);
```

## API Reference

### Methods

#### `startPolling(onUpdate: Function)`

Starts polling for notifications every 8 seconds.

**Parameters:**
- `onUpdate(data)` - Callback function called when notifications are fetched
  - `data.notifications` - Array of notification objects
  - `data.unreadCount` - Number of unread notifications
  - `data.total` - Total number of notifications
  - `data.fromCache` - Boolean indicating if data is from cache (only present on error)
  - `data.error` - Error message (only present on error)

**Example:**
```javascript
notificationService.startPolling(({ notifications, unreadCount, fromCache, error }) => {
  if (fromCache) {
    console.warn('Network error, using cache:', error);
  }
  updateUI(notifications, unreadCount);
});
```

#### `stopPolling()`

Stops the polling interval and cleans up resources.

**Example:**
```javascript
notificationService.stopPolling();
```

#### `getCachedNotifications(): Array`

Retrieves cached notifications from localStorage.

**Returns:** Array of notification objects

**Example:**
```javascript
const cached = notificationService.getCachedNotifications();
```

#### `getCachedMetadata(): Object`

Retrieves metadata about cached notifications.

**Returns:**
```javascript
{
  lastUpdated: '2024-01-15T10:00:00Z',
  count: 5,
  unreadCount: 2
}
```

#### `markAsRead(notificationId: string, isOnline: boolean): Promise<Object>`

Marks a notification as read on the server (if online) and in cache.

**Parameters:**
- `notificationId` - ID of the notification to mark as read
- `isOnline` - Whether currently online (optional, defaults to true)

**Returns:**
```javascript
{
  success: true | false,
  error: 'Error message' // only present on failure
}
```

**Example:**
```javascript
const result = await notificationService.markAsRead('notification-123', true);
if (!result.success) {
  console.error('Failed:', result.error);
}
```

#### `clearCache()`

Clears all cached notifications from localStorage.

**Example:**
```javascript
notificationService.clearCache();
```

#### `getStatus(): Object`

Returns current polling status information.

**Returns:**
```javascript
{
  isPolling: true,
  errorCount: 0,
  pollingInterval: 8000,
  metadata: { lastUpdated: '...', count: 5, unreadCount: 2 }
}
```

#### `fetchNow(): Promise<void>`

Forces an immediate fetch, useful for manual refresh scenarios.

**Example:**
```javascript
await notificationService.fetchNow();
```

## Data Models

### Notification Object

```javascript
{
  id: 'uuid',
  patientId: 'patient-uuid',
  patientName: 'Maria Santos Cruz',
  scanId: 'scan-uuid',
  type: 'SCAN_REVIEWED',
  title: 'Scan Results for Maria Santos Cruz',
  message: 'Dr. Duque has reviewed the scan. Verdict: High Risk',
  verdict: 'High Risk' | 'Normal' | 'Urgent Referral',
  specialistName: 'Dr. Duque',
  status: 'unread' | 'read',
  iconType: 'red' | 'orange' | 'teal',
  createdAt: '2024-01-15T10:00:00Z',
  readAt: '2024-01-15T10:30:00Z' // optional, only set after marking as read
}
```

## Error Handling

The service implements robust error handling:

1. **Network Errors**: Falls back to cached data, continues polling
2. **Consecutive Errors**: Tracks up to 3 consecutive errors, logs warnings but doesn't stop
3. **Cache Write Errors**: Logs error but continues normal operation
4. **API Errors**: Returns cached notifications to callback with `fromCache: true` flag

### Error Handling Example

```javascript
notificationService.startPolling((update) => {
  if (update.fromCache && update.error) {
    // Show non-intrusive warning to user
    showToast('Using cached notifications - network issue detected', 'warning');
  }
  
  // Update UI with data regardless of source
  setNotifications(update.notifications);
  setUnreadCount(update.unreadCount);
});
```

## localStorage Keys

- `kalinga_notifications` - Cached notification array
- `kalinga_notifications_metadata` - Metadata object with lastUpdated, count, unreadCount

## Performance Considerations

- **Polling Interval**: 8 seconds balances freshness with server load
- **Caching**: Reduces unnecessary API calls and enables offline viewing
- **Error Resilience**: Continues operating smoothly during network issues
- **Memory**: Singleton pattern ensures only one polling instance

## Testing

Comprehensive unit tests cover:
- Polling lifecycle (start, stop, intervals)
- Caching operations
- Error handling and recovery
- Unread count calculation
- Mark as read functionality

Run tests:
```bash
npm test -- notificationService.test.js
```

## Requirements Mapping

- **Requirement 14.2**: ✅ Poll GET /api/notifications every 8 seconds when online
- **Requirement 14.6**: ✅ Cache notifications in localStorage for offline viewing
- **Error Handling**: ✅ Handle polling errors gracefully without disrupting UI
- **Phase 2 (Planned)**: ETag/If-None-Match headers for efficient polling

## Future Enhancements (Phase 2)

### ETag Support

```javascript
// Planned implementation
async _fetchAndUpdate() {
  const etag = storage.get('notifications_etag');
  
  const response = await fetch('/api/notifications', {
    headers: {
      'If-None-Match': etag
    }
  });
  
  if (response.status === 304) {
    // Not modified, use cache
    return;
  }
  
  // Update cache and etag
  const newEtag = response.headers.get('ETag');
  storage.set('notifications_etag', newEtag);
}
```

### Exponential Backoff

```javascript
// Planned implementation
if (this.errorCount >= 3) {
  const backoffTime = Math.min(60000, 8000 * Math.pow(2, this.errorCount - 3));
  // Delay next poll by backoffTime
}
```

### WebSocket Integration

```javascript
// Planned implementation
if (this.websocketAvailable) {
  // Use WebSocket for real-time notifications
  // Fall back to polling if WebSocket unavailable
}
```

## Troubleshooting

### Polling Not Starting

```javascript
// Check status
const status = notificationService.getStatus();
if (!status.isPolling) {
  console.log('Polling is not active');
  notificationService.startPolling((update) => { /* ... */ });
}
```

### High Error Count

```javascript
const status = notificationService.getStatus();
if (status.errorCount >= 3) {
  console.warn('Multiple consecutive errors detected');
  // Check network connectivity
  // Check API endpoint availability
}
```

### localStorage Quota Exceeded

```javascript
try {
  notificationService.clearCache();
  // Optionally clear other localStorage data
  console.log('Cache cleared successfully');
} catch (err) {
  console.error('Failed to clear cache:', err);
}
```

## Support

For issues or questions:
1. Check the test file for usage examples: `src/__tests__/unit/notificationService.test.js`
2. Review the source code documentation: `src/services/notificationService.js`
3. Consult the spec requirements: `.kiro/specs/kalinga-ai-maternal-health-system/requirements.md` (Requirements 14.2, 14.6)
