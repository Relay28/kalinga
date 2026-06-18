import storage from './storage';
import { api } from './api';

const QUEUE_KEY = 'kalinga_offline_queue';

export const offlineQueue = {
  getQueue() {
    return storage.get(QUEUE_KEY, []);
  },

  enqueue(scan) {
    const queue = this.getQueue();
    // Prevent duplicate entries
    const filtered = queue.filter(item => item.id !== scan.id);
    filtered.push(scan);
    storage.set(QUEUE_KEY, filtered);
    return filtered.length;
  },

  dequeue(scanId) {
    const queue = this.getQueue();
    const filtered = queue.filter(item => item.id !== scanId);
    storage.set(QUEUE_KEY, filtered);
    return filtered.length;
  },

  clearQueue() {
    storage.remove(QUEUE_KEY);
  },

  // Sends all queued scans to the backend API and clears synced records
  async syncQueue() {
    const queue = this.getQueue();
    if (queue.length === 0) return { success: true, count: 0 };

    const syncedIds = [];
    const errors = [];

    // Correct array copy to process records
    const recordsToSync = [...queue];

    for (const scan of recordsToSync) {
      try {
        // First sync/save patient if not saved on server
        if (scan.patient) {
          await api.registerPatient(scan.patient);
        }
        
        // Sync scan record
        await api.saveScan({
          ...scan,
          status: 'Submitted' // Set status to Submitted on server sync
        });
        
        syncedIds.push(scan.id);
      } catch (err) {
        console.error(`Failed to sync scan ${scan.id}:`, err);
        errors.push({ id: scan.id, error: err.message });
      }
    }

    // Remove successfully synced IDs from local queue
    let remainingQueue = this.getQueue();
    remainingQueue = remainingQueue.filter(scan => !syncedIds.includes(scan.id));
    storage.set(QUEUE_KEY, remainingQueue);

    if (errors.length > 0) {
      return {
        success: false,
        syncedCount: syncedIds.length,
        errors
      };
    }

    return {
      success: true,
      syncedCount: syncedIds.length
    };
  }
};
