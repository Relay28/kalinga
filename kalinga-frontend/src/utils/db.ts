import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export interface Patient {
  id: string;
  fullName: string;
  philhealthId?: string | null;
  age: number;
  lmp?: string | null;
  estimatedDueDate?: string | null;
  gravida: number;
  para: number;
  riskFactors: string[];
  barangay?: string | null;
  municipality?: string | null;
  province?: string | null;
  contactNumber?: string | null;
  createdAt: string;
  syncStatus?: 'pending' | 'synced';
}

export interface TriagePacket {
  id: string;
  patientId: string;
  systolicBP: number;
  diastolicBP: number;
  heartRate?: number | null;
  gestationalAgeWeeks: number;
  bmi?: number | null;
  proteinUrine: 'negative' | 'trace' | '+1' | '+2' | '+3' | '+4';
  symptoms: string[];
  frameBase64?: string | null;
  frameThumbnailB64?: string | null;
  aiPrediction?: {
    normal: number;
    abnormal: number;
    inconclusive: number;
  } | null;
  aiInferenceTimeMs?: number | null;
  riskScore?: number | null;
  triageLevel?: 'LOW' | 'MODERATE' | 'HIGH' | null;
  clientCapturedAt: string;
  barangayStation?: string | null;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'error';
  syncError?: string | null;
  syncedAt?: string | null;
}

interface KalingaDB extends DBSchema {
  triage_packets: {
    key: string;
    value: TriagePacket;
    indexes: {
      'by-sync-status': string;
      'by-risk-score': number;
      'by-created-at': string;
      'by-patient-id': string;
    };
  };
  patients: {
    key: string;
    value: Patient;
    indexes: {
      'by-name': string;
    };
  };
}

const DB_NAME = 'kalinga-ai-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<KalingaDB>> | null = null;

export function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<KalingaDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('patients')) {
          const patientStore = db.createObjectStore('patients', { keyPath: 'id' });
          patientStore.createIndex('by-name', 'fullName');
        }
        if (!db.objectStoreNames.contains('triage_packets')) {
          const triageStore = db.createObjectStore('triage_packets', { keyPath: 'id' });
          triageStore.createIndex('by-sync-status', 'syncStatus');
          triageStore.createIndex('by-risk-score', 'riskScore');
          triageStore.createIndex('by-created-at', 'clientCapturedAt');
          triageStore.createIndex('by-patient-id', 'patientId');
        }
      },
    });
  }
  return dbPromise;
}

export async function savePatient(patient: Patient) {
  const db = await getDB();
  await db.put('patients', patient);
}

export async function getPatient(id: string) {
  const db = await getDB();
  return db.get('patients', id);
}

export async function getAllPatients() {
  const db = await getDB();
  return db.getAll('patients');
}

export async function saveTriagePacket(packet: TriagePacket) {
  const db = await getDB();
  await db.put('triage_packets', packet);
}

export async function getTriagePacket(id: string) {
  const db = await getDB();
  return db.get('triage_packets', id);
}

export async function getAllTriagePackets() {
  const db = await getDB();
  return db.getAll('triage_packets');
}

export async function getPendingSyncPackets() {
  const db = await getDB();
  return db.getAllFromIndex('triage_packets', 'by-sync-status', 'pending');
}

export async function getSyncedPacketsCount() {
  const db = await getDB();
  const all = await db.getAll('triage_packets');
  return all.filter(p => p.syncStatus === 'synced').length;
}

export async function updateSyncStatus(
  id: string,
  status: TriagePacket['syncStatus'],
  error?: string
) {
  const db = await getDB();
  const packet = await db.get('triage_packets', id);
  if (packet) {
    packet.syncStatus = status;
    packet.syncError = error || null;
    if (status === 'synced') {
      packet.syncedAt = new Date().toISOString();
    }
    await db.put('triage_packets', packet);
  }
}

export async function clearAllLocalData() {
  const db = await getDB();
  await db.clear('patients');
  await db.clear('triage_packets');
}

