/**
 * Unit Tests for Offline Queue Sync with Progress Feedback
 * Tests Requirements: 9.1, 9.3, 9.4, 9.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { offlineQueue } from '../../services/offlineQueue';
import storage from '../../services/storage';
import { api } from '../../services/api';

// Mock storage and api modules
vi.mock('../../services/storage');
vi.mock('../../services/api');

describe('Offline Queue Sync with Progress Feedback', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    localStorage.clear();
    
    // Default mock implementations
    storage.acquireLock.mockReturnValue({ acquired: true });
    storage.releaseLock.mockReturnValue(undefined);
    storage.get.mockReturnValue([]);
    storage.set.mockReturnValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Requirement 9.3: Detailed Upload Progress', () => {
    it('should report progress for each package during sync', async () => {
      const mockScans = [
        {
          id: 'scan-1',
          patient: { firstName: 'Maria', lastName: 'Cruz' },
          status: 'Ready for Submission'
        },
        {
          id: 'scan-2',
          patient: { firstName: 'Ana', lastName: 'Reyes' },
          status: 'Ready for Submission'
        },
        {
          id: 'scan-3',
          patient: { firstName: 'Elena', lastName: 'Garcia' },
          status: 'Ready for Submission'
        }
      ];

      storage.get.mockReturnValue(mockScans);
      api.registerPatient.mockResolvedValue({ success: true });
      api.saveScan.mockResolvedValue({ success: true });

      const progressReports = [];
      const onProgress = (current, total, scanInfo) => {
        progressReports.push({ current, total, scanInfo });
      };

      const result = await offlineQueue.syncQueue(onProgress);

      // Verify progress was reported for each scan
      expect(progressReports).toHaveLength(3);
      
      // Verify first progress report
      expect(progressReports[0]).toEqual({
        current: 1,
        total: 3,
        scanInfo: {
          patientName: 'Maria Cruz',
          scanId: 'scan-1'
        }
      });

      // Verify second progress report
      expect(progressReports[1]).toEqual({
        current: 2,
        total: 3,
        scanInfo: {
          patientName: 'Ana Reyes',
          scanId: 'scan-2'
        }
      });

      // Verify third progress report
      expect(progressReports[2]).toEqual({
        current: 3,
        total: 3,
        scanInfo: {
          patientName: 'Elena Garcia',
          scanId: 'scan-3'
        }
      });

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(3);
    });

    it('should handle progress callback being null', async () => {
      const mockScans = [
        {
          id: 'scan-1',
          patient: { firstName: 'Maria', lastName: 'Cruz' },
          status: 'Ready for Submission'
        }
      ];

      storage.get.mockReturnValue(mockScans);
      api.registerPatient.mockResolvedValue({ success: true });
      api.saveScan.mockResolvedValue({ success: true });

      // Should not throw error when onProgress is null
      const result = await offlineQueue.syncQueue(null);

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(1);
    });
  });

  describe('Requirement 9.4: Success Toast Messages', () => {
    it('should return success result with synced count', async () => {
      const mockScans = [
        {
          id: 'scan-1',
          patient: { firstName: 'Maria', lastName: 'Cruz' },
          status: 'Ready for Submission'
        },
        {
          id: 'scan-2',
          patient: { firstName: 'Ana', lastName: 'Reyes' },
          status: 'Ready for Submission'
        }
      ];

      storage.get.mockReturnValue(mockScans);
      api.registerPatient.mockResolvedValue({ success: true });
      api.saveScan.mockResolvedValue({ success: true });

      const result = await offlineQueue.syncQueue();

      expect(result.success).toBe(true);
      expect(result.syncedCount).toBe(2);
      expect(result.failedCount).toBe(0);
    });
  });

  describe('Requirement 9.5: Specific Error Messages', () => {
    it('should capture specific error messages for failed uploads', async () => {
      const mockScans = [
        {
          id: 'scan-1',
          patient: { firstName: 'Maria', lastName: 'Cruz' },
          status: 'Ready for Submission'
        },
        {
          id: 'scan-2',
          patient: { firstName: 'Ana', lastName: 'Reyes' },
          status: 'Ready for Submission'
        }
      ];

      storage.get.mockReturnValue(mockScans);
      api.registerPatient.mockResolvedValue({ success: true });
      
      // First scan succeeds, second fails
      api.saveScan
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error('Network timeout after 30 seconds'));

      const result = await offlineQueue.syncQueue();

      expect(result.success).toBe(false);
      expect(result.syncedCount).toBe(1);
      expect(result.failedCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        id: 'scan-2',
        error: 'Network timeout after 30 seconds',
        patientName: 'Ana Reyes'
      });
      expect(result.errors[0].timestamp).toBeDefined();
    });

    it('should return all failed uploads with specific errors', async () => {
      const mockScans = [
        {
          id: 'scan-1',
          patient: { firstName: 'Maria', lastName: 'Cruz' }
        },
        {
          id: 'scan-2',
          patient: { firstName: 'Ana', lastName: 'Reyes' }
        },
        {
          id: 'scan-3',
          patient: { firstName: 'Elena', lastName: 'Garcia' }
        }
      ];

      storage.get.mockReturnValue(mockScans);
      api.registerPatient.mockResolvedValue({ success: true });
      
      // All scans fail with different errors
      api.saveScan
        .mockRejectedValueOnce(new Error('Server error 500'))
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockRejectedValueOnce(new Error('Invalid data format'));

      const result = await offlineQueue.syncQueue();

      expect(result.success).toBe(false);
      expect(result.syncedCount).toBe(0);
      expect(result.failedCount).toBe(3);
      expect(result.errors).toHaveLength(3);
      
      expect(result.errors[0].error).toBe('Server error 500');
      expect(result.errors[1].error).toBe('Network timeout');
      expect(result.errors[2].error).toBe('Invalid data format');
    });
  });

  describe('Requirement 9.5: Retry Failed Uploads', () => {
    it('should successfully retry a specific failed upload', async () => {
      const mockScan = {
        id: 'scan-1',
        patient: { firstName: 'Maria', lastName: 'Cruz' },
        status: 'Ready for Submission'
      };

      storage.get.mockReturnValue([mockScan]);
      storage.acquireLock.mockReturnValue({ acquired: true });
      api.registerPatient.mockResolvedValue({ success: true });
      api.saveScan.mockResolvedValue({ success: true });

      const progressReports = [];
      const onProgress = (current, total, scanInfo) => {
        progressReports.push({ current, total, scanInfo });
      };

      const result = await offlineQueue.retryUpload('scan-1', onProgress);

      expect(result.success).toBe(true);
      expect(result.scanId).toBe('scan-1');
      
      // Verify progress was reported
      expect(progressReports).toHaveLength(1);
      expect(progressReports[0]).toEqual({
        current: 1,
        total: 1,
        scanInfo: {
          patientName: 'Maria Cruz',
          scanId: 'scan-1'
        }
      });

      // Verify scan was removed from queue
      expect(storage.set).toHaveBeenCalledWith('kalinga_offline_queue', []);
    });

    it('should return error when retrying non-existent scan', async () => {
      storage.get.mockReturnValue([]);
      storage.acquireLock.mockReturnValue({ acquired: true });

      const result = await offlineQueue.retryUpload('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Scan not found in queue');
    });

    it('should capture error when retry fails', async () => {
      const mockScan = {
        id: 'scan-1',
        patient: { firstName: 'Maria', lastName: 'Cruz' },
        status: 'Ready for Submission'
      };

      storage.get.mockReturnValue([mockScan]);
      storage.acquireLock.mockReturnValue({ acquired: true });
      api.registerPatient.mockResolvedValue({ success: true });
      api.saveScan.mockRejectedValue(new Error('Connection refused'));

      const result = await offlineQueue.retryUpload('scan-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection refused');
      expect(result.scanId).toBe('scan-1');
      
      // Verify scan was NOT removed from queue on failure
      expect(storage.set).not.toHaveBeenCalled();
    });

    it('should handle lock acquisition failure during retry', async () => {
      storage.acquireLock.mockReturnValue({ acquired: false });

      const result = await offlineQueue.retryUpload('scan-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Another session is currently modifying the queue. Please try again.');
    });
  });

  describe('getFailedUploads helper', () => {
    it('should return all items in queue as failed uploads', () => {
      const mockScans = [
        { id: 'scan-1', patient: { firstName: 'Maria', lastName: 'Cruz' } },
        { id: 'scan-2', patient: { firstName: 'Ana', lastName: 'Reyes' } }
      ];

      storage.get.mockReturnValue(mockScans);

      const failed = offlineQueue.getFailedUploads();

      expect(failed).toEqual(mockScans);
      expect(failed).toHaveLength(2);
    });

    it('should return empty array when no failed uploads', () => {
      storage.get.mockReturnValue([]);

      const failed = offlineQueue.getFailedUploads();

      expect(failed).toEqual([]);
    });
  });

  describe('Partial Sync Scenarios', () => {
    it('should handle partial success correctly', async () => {
      const mockScans = [
        { id: 'scan-1', patient: { firstName: 'Maria', lastName: 'Cruz' } },
        { id: 'scan-2', patient: { firstName: 'Ana', lastName: 'Reyes' } },
        { id: 'scan-3', patient: { firstName: 'Elena', lastName: 'Garcia' } }
      ];

      storage.get.mockReturnValue(mockScans);
      api.registerPatient.mockResolvedValue({ success: true });
      
      // First succeeds, second fails, third succeeds
      api.saveScan
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error('Server error'))
        .mockResolvedValueOnce({ success: true });

      const result = await offlineQueue.syncQueue();

      expect(result.success).toBe(false);
      expect(result.syncedCount).toBe(2);
      expect(result.failedCount).toBe(1);
      
      // Verify only failed scan remains in queue
      expect(storage.set).toHaveBeenCalledWith(
        'kalinga_offline_queue',
        expect.arrayContaining([
          expect.objectContaining({ id: 'scan-2' })
        ])
      );
    });
  });
});
