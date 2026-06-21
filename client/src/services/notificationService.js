/**
 * Notification Polling Service
 * 
 * Handles automatic polling of notifications from the backend when online.
 * Implements caching to localStorage for offline viewing and graceful error handling.
 * 
 * Requirements:
 * - 14.2: Poll GET /api/notifications every 8 seconds when online
 * - 14.6: Cache notifications in localStorage for offline viewing
 */

import { api } from './api';
import storage from './storage';

const POLLING_INTERVAL = 8000; // 8 seconds
const NOTIFICATION_CACHE_KEY = 'kalinga_notifications';
const NOTIFICATION_METADATA_KEY = 'kalinga_notifications_metadata';

class NotificationService {
  constructor() {
    this.pollingInterval = null;
    this.isPolling = false;
    this.onUpdateCallback = null;
    this.errorCount = 0;
    this.maxConsecutiveErrors = 3;
  }

  /**
   * Start polling for notifications
   * @param {Function} onUpdate - Callback function called when notifications are updated
   */
  startPolling(onUpdate) {
    if (this.isPolling) {
      console.log('Notification polling already active');
      return;
    }

    this.onUpdateCallback = onUpdate;
    this.isPolling = true;
    this.errorCount = 0;

    // Fetch immediately
    this._fetchAndUpdate();

    // Then poll every 8 seconds
    this.pollingInterval = setInterval(() => {
      this._fetchAndUpdate();
    }, POLLING_INTERVAL);

    console.log('Started notification polling (interval: 8s)');
  }

  /**
   * Stop polling for notifications
   */
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.isPolling = false;
    this.onUpdateCallback = null;
    this.errorCount = 0;
    console.log('Stopped notification polling');
  }

  /**
   * Internal method to fetch notifications and update cache
   * Handles errors gracefully without disrupting UI
   */
  async _fetchAndUpdate() {
    try {
      const notifications = await api.getNotifications();
      
      // Reset error count on success
      this.errorCount = 0;

      // Update cache
      this._updateCache(notifications);

      // Call update callback if registered
      if (this.onUpdateCallback) {
        const unreadCount = notifications.filter(n => n.status === 'unread').length;
        this.onUpdateCallback({
          notifications,
          unreadCount,
          total: notifications.length
        });
      }
    } catch (err) {
      this.errorCount++;
      
      // Log error but don't disrupt UI
      console.warn(`Failed to fetch notifications (attempt ${this.errorCount}/${this.maxConsecutiveErrors}):`, err.message);

      // If too many consecutive errors, temporarily back off but don't stop polling
      if (this.errorCount >= this.maxConsecutiveErrors) {
        console.warn('Multiple consecutive notification fetch errors - continuing with cached data');
        // Could implement exponential backoff here in Phase 2
      }

      // Return cached notifications on error
      if (this.onUpdateCallback) {
        const cached = this.getCachedNotifications();
        const unreadCount = cached.filter(n => n.status === 'unread').length;
        this.onUpdateCallback({
          notifications: cached,
          unreadCount,
          total: cached.length,
          fromCache: true,
          error: err.message
        });
      }
    }
  }

  /**
   * Update notification cache in localStorage
   * @param {Array} notifications - Notification list to cache
   */
  _updateCache(notifications) {
    try {
      // Store notifications
      storage.set(NOTIFICATION_CACHE_KEY, notifications);

      // Store metadata
      const metadata = {
        lastUpdated: new Date().toISOString(),
        count: notifications.length,
        unreadCount: notifications.filter(n => n.status === 'unread').length
      };
      storage.set(NOTIFICATION_METADATA_KEY, metadata);

      console.log(`Cached ${notifications.length} notifications (${metadata.unreadCount} unread)`);
    } catch (err) {
      console.error('Failed to cache notifications:', err);
    }
  }

  /**
   * Get cached notifications from localStorage
   * @returns {Array} - Cached notification list
   */
  getCachedNotifications() {
    return storage.get(NOTIFICATION_CACHE_KEY, []);
  }

  /**
   * Get notification metadata (last updated, counts)
   * @returns {Object} - Metadata object
   */
  getCachedMetadata() {
    return storage.get(NOTIFICATION_METADATA_KEY, {
      lastUpdated: null,
      count: 0,
      unreadCount: 0
    });
  }

  /**
   * Mark a notification as read
   * Updates both server and cache
   * @param {string} notificationId - ID of notification to mark as read
   * @param {boolean} isOnline - Whether currently online
   */
  async markAsRead(notificationId, isOnline = true) {
    try {
      // Update server if online
      if (isOnline) {
        await api.markNotificationRead(notificationId);
      }

      // Update cache
      const cached = this.getCachedNotifications();
      const notification = cached.find(n => n.id === notificationId);
      if (notification) {
        notification.status = 'read';
        notification.readAt = new Date().toISOString();
        storage.set(NOTIFICATION_CACHE_KEY, cached);
      }

      return { success: true };
    } catch (err) {
      console.error(`Failed to mark notification ${notificationId} as read:`, err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Clear notification cache
   */
  clearCache() {
    storage.remove(NOTIFICATION_CACHE_KEY);
    storage.remove(NOTIFICATION_METADATA_KEY);
    console.log('Cleared notification cache');
  }

  /**
   * Get polling status
   * @returns {Object} - Status information
   */
  getStatus() {
    return {
      isPolling: this.isPolling,
      errorCount: this.errorCount,
      pollingInterval: POLLING_INTERVAL,
      metadata: this.getCachedMetadata()
    };
  }

  /**
   * Force an immediate fetch (useful for manual refresh)
   */
  async fetchNow() {
    if (!this.isPolling) {
      console.warn('Polling not active - starting temporary fetch');
    }
    await this._fetchAndUpdate();
  }
}

// Export singleton instance
const notificationService = new NotificationService();
export default notificationService;
