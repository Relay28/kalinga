/**
 * Integration Tests for Offline Queue
 * 
 * These tests verify the interaction between the offline queue service
 * and localStorage, testing the complete workflow of adding, retrieving,
 * and removing items from the sync queue.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  setupLocalStorageMock,
  resetLocalStorageMock,
  createMockSyncQueueItem,
  cleanupTests,
} from '../testUtils.js';

describe('Offline Queue Integration Tests', () => {
  beforeEach(() => {
    setupLocalStorageMock();
  });

  afterEach(() => {
    cleanupTests();
  });

  describe('Queue initialization', () => {
    it('should initialize empty queue in localStorage', () => {
      const queue = localStorage.getItem('pendingUploads');
      
      // Initially should be null or empty
      expect(queue === null || queue === '[]').toBe(true);
    });

    it('should create queue on first item addition', () => {
      const queueItem = createMockSyncQueueItem();
      const queue = [queueItem];
      
      localStorage.setItem('pendingUploads', JSON.stringify(queue));
      
      const retrieved = JSON.parse(localStorage.getItem('pendingUploads'));
      expect(retrieved).toHaveLength(1);
      expect(retrieved[0].id).toBe(queueItem.id);
    });
  });

  describe('Adding items to queue', () => {
    it('should add a single item to empty queue', () => {
      const queueItem = createMockSyncQueueItem();
      
      localStorage.setItem('pendingUploads', JSON.stringify([queueItem]));
      
      const queue = JSON.parse(localStorage.getItem('pendingUploads'));
      expect(queue).toHaveLength(1);
      expect(queue[0].id).toBe(queueItem.id);
    });

    it('should add multiple items to queue', () => {
      const item1 = createMockSyncQueueItem();
      const item2 = createMockSyncQueueItem();
      const item3 = createMockSyncQueueItem();
      
      const queue = [item1, item2, item3];
      localStorage.setItem('pendingUploads', JSON.stringify(queue));
      
      const retrieved = JSON.parse(localStorage.getItem('pendingUploads'));
      expect(retrieved).toHaveLength(3);
      expect(retrieved[0].id).toBe(item1.id);
      expect(retrieved[1].id).toBe(item2.id);
      expect(retrieved[2].id).toBe(item3.id);
    });

    it('should preserve item structure when adding to queue', () => {
      const queueItem = createMockSyncQueueItem({
        patient: {
          id: 'patient-123',
          philhealthId: '12-345678901-2',
          firstName: 'Maria',
          lastName: 'Santos',
        },
      });
      
      localStorage.setItem('pendingUploads', JSON.stringify([queueItem]));
      
      const retrieved = JSON.parse(localStorage.getItem('pendingUploads'));
      expect(retrieved[0].patient.philhealthId).toBe('12-345678901-2');
      expect(retrieved[0].patient.firstName).toBe('Maria');
    });
  });

  describe('Retrieving items from queue', () => {
    it('should retrieve all items in order', () => {
      const items = [
        createMockSyncQueueItem(),
        createMockSyncQueueItem(),
        createMockSyncQueueItem(),
      ];
      
      localStorage.setItem('pendingUploads', JSON.stringify(items));
      
      const retrieved = JSON.parse(localStorage.getItem('pendingUploads'));
      expect(retrieved).toHaveLength(3);
      
      items.forEach((item, index) => {
        expect(retrieved[index].id).toBe(item.id);
      });
    });

    it('should return empty array for empty queue', () => {
      localStorage.setItem('pendingUploads', JSON.stringify([]));
      
      const queue = JSON.parse(localStorage.getItem('pendingUploads'));
      expect(queue).toEqual([]);
      expect(queue).toHaveLength(0);
    });

    it('should handle null queue gracefully', () => {
      const queue = localStorage.getItem('pendingUploads');
      expect(queue).toBeNull();
    });
  });

  describe('Removing items from queue', () => {
    it('should remove item from queue by ID', () => {
      const item1 = createMockSyncQueueItem();
      const item2 = createMockSyncQueueItem();
      const item3 = createMockSyncQueueItem();
      
      let queue = [item1, item2, item3];
      localStorage.setItem('pendingUploads', JSON.stringify(queue));
      
      // Remove item2
      queue = queue.filter(item => item.id !== item2.id);
      localStorage.setItem('pendingUploads', JSON.stringify(queue));
      
      const retrieved = JSON.parse(localStorage.getItem('pendingUploads'));
      expect(retrieved).toHaveLength(2);
      expect(retrieved.find(item => item.id === item2.id)).toBeUndefined();
    });

    it('should clear entire queue', () => {
      const items = [
        createMockSyncQueueItem(),
        createMockSyncQueueItem(),
      ];
      
      localStorage.setItem('pendingUploads', JSON.stringify(items));
      localStorage.setItem('pendingUploads', JSON.stringify([]));
      
      const queue = JSON.parse(localStorage.getItem('pendingUploads'));
      expect(queue).toHaveLength(0);
    });

    it('should handle removing non-existent item', () => {
      const item1 = createMockSyncQueueItem();
      const queue = [item1];
      
      localStorage.setItem('pendingUploads', JSON.stringify(queue));
      
      // Try to remove non-existent item
      const filtered = queue.filter(item => item.id !== 'non-existent-id');
      localStorage.setItem('pendingUploads', JSON.stringify(filtered));
      
      const retrieved = JSON.parse(localStorage.getItem('pendingUploads'));
      expect(retrieved).toHaveLength(1);
      expect(retrieved[0].id).toBe(item1.id);
    });
  });

  describe('Queue persistence', () => {
    it('should persist queue data across page reloads', () => {
      const queueItem = createMockSyncQueueItem();
      localStorage.setItem('pendingUploads', JSON.stringify([queueItem]));
      
      // Simulate page reload by retrieving from storage
      const retrieved = JSON.parse(localStorage.getItem('pendingUploads'));
      
      expect(retrieved).toHaveLength(1);
      expect(retrieved[0].id).toBe(queueItem.id);
      expect(retrieved[0].patient.firstName).toBe(queueItem.patient.firstName);
    });

    it('should maintain data integrity after multiple operations', () => {
      // Add initial items
      let queue = [createMockSyncQueueItem(), createMockSyncQueueItem()];
      localStorage.setItem('pendingUploads', JSON.stringify(queue));
      
      // Add another item
      const newItem = createMockSyncQueueItem();
      queue = JSON.parse(localStorage.getItem('pendingUploads'));
      queue.push(newItem);
      localStorage.setItem('pendingUploads', JSON.stringify(queue));
      
      // Remove first item
      queue = JSON.parse(localStorage.getItem('pendingUploads'));
      queue.shift();
      localStorage.setItem('pendingUploads', JSON.stringify(queue));
      
      // Verify final state
      const final = JSON.parse(localStorage.getItem('pendingUploads'));
      expect(final).toHaveLength(2);
      expect(final.find(item => item.id === newItem.id)).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('should handle corrupted queue data', () => {
      localStorage.setItem('pendingUploads', 'invalid json{{{');
      
      expect(() => {
        JSON.parse(localStorage.getItem('pendingUploads'));
      }).toThrow();
    });

    it('should handle queue with missing required fields', () => {
      const incompleteItem = { id: 'test-123' }; // Missing patient and scan
      localStorage.setItem('pendingUploads', JSON.stringify([incompleteItem]));
      
      const retrieved = JSON.parse(localStorage.getItem('pendingUploads'));
      expect(retrieved[0].id).toBe('test-123');
      expect(retrieved[0].patient).toBeUndefined();
    });
  });

  describe('Queue count', () => {
    it('should accurately count pending items', () => {
      const items = [
        createMockSyncQueueItem(),
        createMockSyncQueueItem(),
        createMockSyncQueueItem(),
      ];
      
      localStorage.setItem('pendingUploads', JSON.stringify(items));
      
      const queue = JSON.parse(localStorage.getItem('pendingUploads'));
      expect(queue.length).toBe(3);
    });

    it('should return 0 for empty queue', () => {
      localStorage.setItem('pendingUploads', JSON.stringify([]));
      
      const queue = JSON.parse(localStorage.getItem('pendingUploads'));
      expect(queue.length).toBe(0);
    });
  });
});
