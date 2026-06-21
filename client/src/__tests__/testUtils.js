/**
 * Test Utilities and Helper Functions
 * 
 * This module provides common utilities for testing the Kalinga AI application,
 * including mock data generators, localStorage helpers, and custom matchers.
 */

import { vi } from 'vitest';

// ============================================================================
// Mock Data Generators
// ============================================================================

/**
 * Generate a mock patient object for testing
 * @param {Object} overrides - Properties to override in the generated patient
 * @returns {Object} Mock patient object
 */
export function createMockPatient(overrides = {}) {
  return {
    id: `patient-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    philhealthId: '12-345678901-2',
    firstName: 'Maria',
    lastName: 'Santos',
    dateOfBirth: '1990-01-15',
    bloodPressureSystolic: 120,
    bloodPressureDiastolic: 80,
    weight: 65,
    height: 160,
    bmi: 25.4,
    chronicHypertension: false,
    familyHistory: false,
    diabetes: false,
    previousCSection: false,
    isFirstPregnancy: false,
    isMultiplePregnancy: false,
    hasAbdominalPain: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Generate a mock scan/triage package for testing
 * @param {Object} overrides - Properties to override in the generated scan
 * @returns {Object} Mock scan object
 */
export function createMockScan(overrides = {}) {
  return {
    id: `scan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    patientId: 'patient-123',
    frames: createMockFrames(6),
    riskScore: 45,
    riskLevel: 'MODERATE RISK',
    status: 'Submitted',
    createdAt: new Date().toISOString(),
    submittedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Generate mock frames for a scan
 * @param {number} count - Number of frames to generate
 * @returns {Array} Array of mock frame objects
 */
export function createMockFrames(count = 6) {
  return Array.from({ length: count }, (_, i) => ({
    id: `frame-${i + 1}`,
    scanId: 'scan-123',
    sequenceNumber: i + 1,
    imageData: '/assets/ultrasound_sweep.png',
    timestamp: i * 2500, // 2.5s intervals
    fetalClipClassification: {
      plane: 'fetal_head',
      confidence: 94,
    },
  }));
}

/**
 * Generate a mock notification
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock notification object
 */
export function createMockNotification(overrides = {}) {
  return {
    id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    patientId: 'patient-123',
    scanId: 'scan-123',
    type: 'SCAN_REVIEWED',
    title: 'Scan Results for Maria Santos Cruz',
    message: 'Dr. Duque has reviewed the scan. Verdict: High Risk',
    verdict: 'High Risk',
    specialistName: 'Dr. Duque',
    read: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Generate a mock sync queue item
 * @param {Object} overrides - Properties to override
 * @returns {Object} Mock sync queue item
 */
export function createMockSyncQueueItem(overrides = {}) {
  const patient = createMockPatient();
  const scan = createMockScan();
  
  return {
    id: scan.id,
    patient,
    scan: {
      patientId: patient.id,
      frames: scan.frames,
      riskScore: scan.riskScore,
      riskLevel: scan.riskLevel,
      status: scan.status,
      createdAt: scan.createdAt,
    },
    frames: scan.frames,
    retryCount: 0,
    ...overrides,
  };
}

// ============================================================================
// localStorage Mock Helpers
// ============================================================================

/**
 * Setup localStorage mock for testing
 * @returns {Object} Mock localStorage implementation
 */
export function setupLocalStorageMock() {
  const storage = {};
  
  const localStorageMock = {
    getItem: vi.fn((key) => storage[key] || null),
    setItem: vi.fn((key, value) => {
      storage[key] = value.toString();
    }),
    removeItem: vi.fn((key) => {
      delete storage[key];
    }),
    clear: vi.fn(() => {
      Object.keys(storage).forEach(key => delete storage[key]);
    }),
    get length() {
      return Object.keys(storage).length;
    },
    key: vi.fn((index) => {
      const keys = Object.keys(storage);
      return keys[index] || null;
    }),
  };
  
  global.localStorage = localStorageMock;
  
  return localStorageMock;
}

/**
 * Reset localStorage mock to clean state
 */
export function resetLocalStorageMock() {
  if (global.localStorage && global.localStorage.clear) {
    global.localStorage.clear();
  }
}

/**
 * Set localStorage data for testing
 * @param {string} key - Storage key
 * @param {any} value - Value to store (will be JSON stringified)
 */
export function setLocalStorageData(key, value) {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  localStorage.setItem(key, serialized);
}

/**
 * Get localStorage data for testing
 * @param {string} key - Storage key
 * @returns {any} Parsed value or null
 */
export function getLocalStorageData(key) {
  const item = localStorage.getItem(key);
  if (!item) return null;
  
  try {
    return JSON.parse(item);
  } catch {
    return item;
  }
}

// ============================================================================
// API Mock Helpers
// ============================================================================

/**
 * Create a mock fetch response
 * @param {any} data - Response data
 * @param {number} status - HTTP status code
 * @returns {Promise<Response>} Mock response
 */
export function createMockResponse(data, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  });
}

/**
 * Setup fetch mock for API testing
 * @returns {Function} Mock fetch function
 */
export function setupFetchMock() {
  global.fetch = vi.fn();
  return global.fetch;
}

/**
 * Mock successful API response
 * @param {any} data - Response data to return
 */
export function mockApiSuccess(data) {
  global.fetch.mockResolvedValueOnce(createMockResponse(data, 200));
}

/**
 * Mock failed API response
 * @param {number} status - HTTP error status
 * @param {string} message - Error message
 */
export function mockApiError(status = 500, message = 'Internal Server Error') {
  global.fetch.mockResolvedValueOnce(
    createMockResponse({ error: message }, status)
  );
}

// ============================================================================
// Async Testing Helpers
// ============================================================================

/**
 * Wait for a specific amount of time
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} Promise that resolves after delay
 */
export function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Wait for a condition to be true
 * @param {Function} condition - Function that returns boolean
 * @param {number} timeout - Maximum wait time in ms
 * @param {number} interval - Check interval in ms
 * @returns {Promise} Promise that resolves when condition is true
 */
export async function waitFor(condition, timeout = 5000, interval = 50) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (condition()) {
      return true;
    }
    await wait(interval);
  }
  
  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

// ============================================================================
// PhilHealth ID Helpers
// ============================================================================

/**
 * Generate a valid PhilHealth ID for testing
 * @returns {string} Valid PhilHealth ID (format: XX-XXXXXXXXX-X)
 */
export function generateValidPhilHealthId() {
  const part1 = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  const part2 = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
  const part3 = Math.floor(Math.random() * 10);
  return `${part1}-${part2}-${part3}`;
}

/**
 * Generate an invalid PhilHealth ID for testing
 * @returns {string} Invalid PhilHealth ID
 */
export function generateInvalidPhilHealthId() {
  const formats = [
    '12-34567890',      // Too short
    '12-34567890123-4', // Too long
    'AB-123456789-1',   // Letters in first part
    '12-ABCDEFGHI-1',   // Letters in middle part
    '12-123456789-AB',  // Letters in last part
    '12345678901',      // No dashes
    '',                 // Empty
  ];
  
  return formats[Math.floor(Math.random() * formats.length)];
}

// ============================================================================
// Risk Score Helpers
// ============================================================================

/**
 * Calculate expected risk score for testing
 * Uses the same algorithm as the production code
 * @param {Object} factors - Risk factors
 * @returns {number} Calculated risk score (5-95)
 */
export function calculateExpectedRiskScore(factors) {
  let score = 15; // Baseline
  
  // Blood pressure scoring
  const { systolic, diastolic } = factors.bloodPressure || {};
  if (systolic >= 160 || diastolic >= 100) score += 35;
  else if (systolic >= 140 || diastolic >= 90) score += 25;
  else if (systolic >= 130 || diastolic >= 85) score += 12;
  
  // BMI scoring
  if (factors.bmi >= 30) score += 8;
  else if (factors.bmi >= 25) score += 4;
  
  // Boolean risk factors
  if (factors.chronicHypertension) score += 20;
  if (factors.familyHistory) score += 10;
  if (factors.isFirstPregnancy) score += 4;
  if (factors.isMultiplePregnancy) score += 8;
  if (factors.diabetes) score += 10;
  if (factors.previousCSection) score += 5;
  if (factors.hasAbdominalPain) score += 8;
  
  // Clamp to 5-95 range
  return Math.max(5, Math.min(95, score));
}

/**
 * Get risk level from risk score
 * @param {number} score - Risk score (5-95)
 * @returns {string} Risk level: 'LOW RISK', 'MODERATE RISK', or 'HIGH RISK'
 */
export function getRiskLevel(score) {
  if (score >= 70) return 'HIGH RISK';
  if (score >= 40) return 'MODERATE RISK';
  return 'LOW RISK';
}

// ============================================================================
// Date/Time Helpers
// ============================================================================

/**
 * Create a date string in ISO format for testing
 * @param {number} daysOffset - Days to offset from today (negative for past)
 * @returns {string} ISO date string
 */
export function createTestDate(daysOffset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
}

/**
 * Calculate age from date of birth
 * @param {string} dob - Date of birth in ISO format
 * @returns {number} Age in years
 */
export function calculateAge(dob) {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

// ============================================================================
// Cleanup Helpers
// ============================================================================

/**
 * Clean up all mocks and test state
 */
export function cleanupTests() {
  vi.clearAllMocks();
  resetLocalStorageMock();
  
  // Reset global fetch if it was mocked
  if (global.fetch && global.fetch.mockRestore) {
    global.fetch.mockRestore();
  }
}
