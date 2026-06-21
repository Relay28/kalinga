/**
 * Unit Tests for Notification Polling Service
 * 
 * Tests notification polling, caching, error handling, and lifecycle management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import notificationService from '../../services/notificationService';
import { api } from '../../services/api';
import storage from '../../services/storage';

// Mock dependencies
vi.mock('../../services/api');
vi.mock('../../services/storage');

describe('NotificationService', () => {
  beforeEach(() => {
    // Reset service state
    notificationService.stopPolling();
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    notificationService.stopPolling();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Polling Lifecycle', () => {
    it('should start polling and fetch notifications immediately', async () => {
      const mockNotifications = [
        { id: '1', status: 'unread', patientName: 'Maria' },
        { id: '2', status: 'read', patientName: 'Ana' }
      ];
      api.getNotifications.mockResolvedValue(mockNotifications);
      storage.set.mockReturnValue(true);

      const onUpdate = vi.fn();
      notificationService.startPolling(onUpdate);

      // Wait for initial fetch using flushPromises
      await vi.advanceTimersByTimeAsync(0);

      expect(api.getNotifications).toHaveBeenCalledTimes(1);
      expect(onUpdate).toHaveBeenCalledWith({
        notifications: mockNotifications,
        unreadCount: 1,
        total: 2
      });
    });

    it('should poll at 8-second intervals', async () => {
      const mockNotifications = [];
      api.getNotifications.mockResolvedValue(mockNotifications);
      storage.set.mockReturnValue(true);

      const onUpdate = vi.fn();
      notificationService.startPolling(onUpdate);

      // Initial fetch
      await vi.advanceTimersByTimeAsync(0);
      expect(api.getNotifications).toHaveBeenCalledTimes(1);

      // Advance 8 seconds
      await vi.advanceTimersByTimeAsync(8000);
      expect(api.getNotifications).toHaveBeenCalledTimes(2);

      // Advance another 8 seconds
      await vi.advanceTimersByTimeAsync(8000);
      expect(api.getNotifications).toHaveBeenCalledTimes(3);
    });

    it('should stop polling when requested', async () => {
      api.getNotifications.mockResolvedValue([]);
      storage.set.mockReturnValue(true);

      const onUpdate = vi.fn();
      notificationService.startPolling(onUpdate);
      await vi.advanceTimersByTimeAsync(0);

      notificationService.stopPolling();

      // Advance time - should not fetch again
      await vi.advanceTimersByTimeAsync(16000);

      expect(api.getNotifications).toHaveBeenCalledTimes(1); // Only initial call
    });

    it('should not start polling twice', async () => {
      api.getNotifications.mockResolvedValue([]);
      storage.set.mockReturnValue(true);

      const onUpdate1 = vi.fn();
      const onUpdate2 = vi.fn();

      notificationService.startPolling(onUpdate1);
      notificationService.startPolling(onUpdate2); // Second call should be ignored

      await vi.advanceTimersByTimeAsync(0);

      expect(api.getNotifications).toHaveBeenCalledTimes(1);
      expect(onUpdate1).toHaveBeenCalled();
      expect(onUpdate2).not.toHaveBeenCalled();
    });
  });

  describe('Caching', () => {
    it('should cache notifications to localStorage on successful fetch', async () => {
      const mockNotifications = [
        { id: '1', status: 'unread', patientName: 'Maria' },
        { id: '2', status: 'read', patientName: 'Ana' }
      ];
      api.getNotifications.mockResolvedValue(mockNotifications);
      storage.set.mockReturnValue(true);

      notificationService.startPolling(() => {});
      await vi.advanceTimersByTimeAsync(0);

      expect(storage.set).toHaveBeenCalledWith(
        'kalinga_notifications',
        mockNotifications
      );
      expect(storage.set).toHaveBeenCalledWith(
        'kalinga_notifications_metadata',
        expect.objectContaining({
          count: 2,
          unreadCount: 1,
          lastUpdated: expect.any(String)
        })
      );
    });

    it('should retrieve cached notifications', () => {
      const cachedNotifications = [
        { id: '1', status: 'unread' },
        { id: '2', status: 'read' }
      ];
      storage.get.mockReturnValue(cachedNotifications);

      const result = notificationService.getCachedNotifications();

      expect(storage.get).toHaveBeenCalledWith('kalinga_notifications', []);
      expect(result).toEqual(cachedNotifications);
    });

    it('should retrieve cached metadata', () => {
      const metadata = {
        lastUpdated: '2024-01-15T10:00:00Z',
        count: 5,
        unreadCount: 2
      };
      storage.get.mockReturnValue(metadata);

      const result = notificationService.getCachedMetadata();

      expect(storage.get).toHaveBeenCalledWith(
        'kalinga_notifications_metadata',
        expect.any(Object)
      );
      expect(result).toEqual(metadata);
    });

    it('should clear cache', () => {
      storage.remove.mockReturnValue(true);

      notificationService.clearCache();

      expect(storage.remove).toHaveBeenCalledWith('kalinga_notifications');
      expect(storage.remove).toHaveBeenCalledWith('kalinga_notifications_metadata');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully without disrupting polling', async () => {
      const error = new Error('Network error');
      api.getNotifications.mockRejectedValue(error);
      storage.get.mockReturnValue([]); // Return empty cache

      const onUpdate = vi.fn();
      notificationService.startPolling(onUpdate);

      await vi.advanceTimersByTimeAsync(0);

      // Should still call onUpdate with cached data
      expect(onUpdate).toHaveBeenCalledWith({
        notifications: [],
        unreadCount: 0,
        total: 0,
        fromCache: true,
        error: 'Network error'
      });

      // Should continue polling despite error
      await vi.advanceTimersByTimeAsync(8000);

      expect(api.getNotifications).toHaveBeenCalledTimes(2);
    });

    it('should return cached notifications on API error', async () => {
      const cachedNotifications = [
        { id: '1', status: 'unread', patientName: 'Maria' }
      ];
      api.getNotifications.mockRejectedValue(new Error('Timeout'));
      storage.get.mockReturnValue(cachedNotifications);

      const onUpdate = vi.fn();
      notificationService.startPolling(onUpdate);

      await vi.advanceTimersByTimeAsync(0);

      expect(onUpdate).toHaveBeenCalledWith({
        notifications: cachedNotifications,
        unreadCount: 1,
        total: 1,
        fromCache: true,
        error: 'Timeout'
      });
    });

    it('should track consecutive errors', async () => {
      api.getNotifications.mockRejectedValue(new Error('Network error'));
      storage.get.mockReturnValue([]);

      notificationService.startPolling(() => {});

      // First error
      await vi.advanceTimersByTimeAsync(0);
      expect(notificationService.errorCount).toBe(1);

      // Second error
      await vi.advanceTimersByTimeAsync(8000);
      expect(notificationService.errorCount).toBe(2);

      // Third error
      await vi.advanceTimersByTimeAsync(8000);
      expect(notificationService.errorCount).toBe(3);
    });

    it('should reset error count on successful fetch', async () => {
      api.getNotifications
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValue([]);
      storage.get.mockReturnValue([]);
      storage.set.mockReturnValue(true);

      notificationService.startPolling(() => {});

      // First two errors
      await vi.advanceTimersByTimeAsync(0);
      await vi.advanceTimersByTimeAsync(8000);
      expect(notificationService.errorCount).toBe(2);

      // Successful fetch
      await vi.advanceTimersByTimeAsync(8000);
      expect(notificationService.errorCount).toBe(0);
    });

    it('should handle cache write errors gracefully', async () => {
      const mockNotifications = [{ id: '1', status: 'unread' }];
      api.getNotifications.mockResolvedValue(mockNotifications);
      storage.set.mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

      const onUpdate = vi.fn();
      notificationService.startPolling(onUpdate);

      // Should not throw error
      await vi.advanceTimersByTimeAsync(0);

      // Should still call onUpdate
      expect(onUpdate).toHaveBeenCalledWith({
        notifications: mockNotifications,
        unreadCount: 1,
        total: 1
      });
    });
  });

  describe('Mark as Read', () => {
    it('should mark notification as read on server and in cache when online', async () => {
      const cachedNotifications = [
        { id: '1', status: 'unread', patientName: 'Maria' },
        { id: '2', status: 'unread', patientName: 'Ana' }
      ];
      storage.get.mockReturnValue(cachedNotifications);
      storage.set.mockReturnValue(true);
      api.markNotificationRead.mockResolvedValue({});

      const result = await notificationService.markAsRead('1', true);

      expect(result.success).toBe(true);
      expect(api.markNotificationRead).toHaveBeenCalledWith('1');
      expect(storage.set).toHaveBeenCalledWith(
        'kalinga_notifications',
        expect.arrayContaining([
          expect.objectContaining({
            id: '1',
            status: 'read',
            readAt: expect.any(String)
          })
        ])
      );
    });

    it('should mark notification as read only in cache when offline', async () => {
      const cachedNotifications = [
        { id: '1', status: 'unread', patientName: 'Maria' }
      ];
      storage.get.mockReturnValue(cachedNotifications);
      storage.set.mockReturnValue(true);

      const result = await notificationService.markAsRead('1', false);

      expect(result.success).toBe(true);
      expect(api.markNotificationRead).not.toHaveBeenCalled();
      expect(storage.set).toHaveBeenCalled();
    });

    it('should handle mark as read errors', async () => {
      api.markNotificationRead.mockRejectedValue(new Error('Server error'));
      storage.get.mockReturnValue([]);

      const result = await notificationService.markAsRead('1', true);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Server error');
    });
  });

  describe('Status and Utilities', () => {
    it('should return correct polling status', () => {
      const status = notificationService.getStatus();

      expect(status).toEqual({
        isPolling: false,
        errorCount: 0,
        pollingInterval: 8000,
        metadata: expect.any(Object)
      });
    });

    it('should allow manual fetch when not polling', async () => {
      const mockNotifications = [{ id: '1', status: 'unread' }];
      api.getNotifications.mockResolvedValue(mockNotifications);
      storage.set.mockReturnValue(true);

      await notificationService.fetchNow();

      expect(api.getNotifications).toHaveBeenCalledTimes(1);
    });
  });

  describe('Unread Count Calculation', () => {
    it('should correctly count unread notifications', async () => {
      const mockNotifications = [
        { id: '1', status: 'unread' },
        { id: '2', status: 'unread' },
        { id: '3', status: 'read' },
        { id: '4', status: 'unread' }
      ];
      api.getNotifications.mockResolvedValue(mockNotifications);
      storage.set.mockReturnValue(true);

      const onUpdate = vi.fn();
      notificationService.startPolling(onUpdate);

      await vi.advanceTimersByTimeAsync(0);

      expect(onUpdate).toHaveBeenCalledWith({
        notifications: mockNotifications,
        unreadCount: 3,
        total: 4
      });
    });

    it('should handle empty notification list', async () => {
      api.getNotifications.mockResolvedValue([]);
      storage.set.mockReturnValue(true);

      const onUpdate = vi.fn();
      notificationService.startPolling(onUpdate);

      await vi.advanceTimersByTimeAsync(0);

      expect(onUpdate).toHaveBeenCalledWith({
        notifications: [],
        unreadCount: 0,
        total: 0
      });
    });
  });
});
