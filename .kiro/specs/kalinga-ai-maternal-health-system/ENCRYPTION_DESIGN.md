# Encryption Implementation Design Document

**Task:** 17.4 Design encryption implementation  
**Date:** 2025  
**Status:** Phase 2 Design  
**Validates:** Requirements 8.4, 15.2, 15.3, Property 12

---

## Executive Summary

This document outlines the AES-256 encryption strategy for the Kalinga AI Maternal Health System Phase 2 implementation. The design addresses client-side encryption of patient data in localStorage before storage, with device-specific key management to ensure data privacy compliance with the Philippine Data Privacy Act 2012.

## Requirements Summary

### Requirement 8.4 (Triage Package Compilation and Security)
- **Phase 2**: The Edge_AI_Module SHALL use AES-256 encryption for Triage_Package data before local storage

### Requirement 15.2 (Data Privacy Compliance)
- **Phase 2**: The Midwife_App SHALL encrypt all patient data stored on the mobile device using AES-256 encryption

### Requirement 15.3 (Data Privacy Compliance)
- **Phase 2**: The Cloud_Backend SHALL encrypt all patient data at rest in the database using AES-256 encryption

### Property 12: AES-256 Encryption Round-Trip
*For any* Triage_Package data, encrypting with AES-256 using a generated encryption key then decrypting with the same key SHALL produce equivalent Triage_Package data with all fields and values preserved.

---

## Architecture Overview

### Encryption Layers

```
┌─────────────────────────────────────────────────────────┐
│                    BROWSER (Client)                      │
├─────────────────────────────────────────────────────────┤
│ 1. Plain Text Triage Package (in-memory)                │
│    ↓                                                     │
│ 2. Device Fingerprint Generation                        │
│    ↓                                                     │
│ 3. Encryption Key Derivation (PBKDF2)                   │
│    ↓                                                     │
│ 4. AES-256-GCM Encryption (Web Crypto API)              │
│    ↓                                                     │
│ 5. Encrypted Blob + IV + Salt → localStorage            │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                  TRANSMISSION (TLS 1.3)                  │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│                    SERVER (Cloud Backend)                │
├─────────────────────────────────────────────────────────┤
│ 1. Receive Encrypted Triage Package                     │
│    ↓                                                     │
│ 2. Store in PostgreSQL with TDE (Transparent Data       │
│    Encryption) at database level                        │
└─────────────────────────────────────────────────────────┘
```

---

## 1. Library Selection

### 1.1 Browser (Client-Side) Encryption

**Selected Library:** **Native Web Crypto API (`crypto.subtle`)**

**Rationale:**
- Native browser API - no external dependencies, zero bundle size impact
- Hardware-accelerated AES-GCM operations
- Security-audited by browser vendors (Chrome, Firefox, Safari)
- FIPS 140-2 compliant in modern browsers
- Supports AES-256-GCM with authenticated encryption (AEAD)
- Async API compatible with React's async patterns

**Alternative Considered:** `aes-js` (pure JavaScript implementation)
- **Rejected:** Slower than native implementation, larger bundle size (~20KB), no authenticated encryption mode

**Alternative Considered:** `crypto-js`
- **Rejected:** Deprecated library, last updated 2020, security concerns with CBC mode

### 1.2 Node.js (Server-Side) Encryption

**Selected Library:** **Native Node.js `crypto` module**

**Rationale:**
- Built-in module, no external dependencies
- OpenSSL-backed implementation (production-grade)
- Consistent API with Web Crypto API for cross-platform compatibility
- Supports AES-256-GCM and AES-256-CBC modes
- Zero additional attack surface from third-party libraries

**Alternative Considered:** `node-forge`
- **Rejected:** Pure JavaScript implementation slower than native crypto module

---

## 2. Encryption Algorithm: AES-256-GCM

### 2.1 Algorithm Choice

**Selected:** **AES-256-GCM (Galois/Counter Mode)**

**Rationale:**
- **Authenticated Encryption with Associated Data (AEAD):** Provides both confidentiality AND integrity verification
- **Tamper Detection:** GCM mode automatically detects if ciphertext has been modified
- **Performance:** Faster than CBC mode due to parallelizable encryption/decryption
- **Security:** No padding oracle vulnerabilities (unlike CBC mode)
- **Industry Standard:** Used by TLS 1.3, IPsec, SSH

### 2.2 Key Size

**Selected:** **256-bit keys**

**Rationale:**
- Meets NIST recommendation for long-term security (post-2030)
- Compliance with Philippine Data Privacy Act 2012 best practices
- Future-proof against quantum computing advances (Grover's algorithm reduces effective security to 128 bits)

### 2.3 Initialization Vector (IV)

**Strategy:** **96-bit random IV (12 bytes)** generated per encryption operation

**Implementation:**
```javascript
const iv = crypto.getRandomValues(new Uint8Array(12)); // Browser
const iv = crypto.randomBytes(12); // Node.js
```

**Rationale:**
- GCM mode standard recommends 96-bit IVs for optimal performance
- Random generation prevents IV reuse (critical for GCM security)
- Stored alongside ciphertext for decryption

---

## 3. Key Management Strategy

### 3.1 Device-Specific Key Derivation

**Challenge:** 
- Cannot store encryption keys in localStorage (attackers with device access could retrieve keys)
- Need deterministic key generation (same device = same key for decryption)
- Must be unique per device to prevent cross-device data access

**Solution:** **Device Fingerprinting + PBKDF2 Key Derivation**

### 3.2 Device Fingerprint Generation

**Library:** `fingerprintjs` (open-source, 53KB gzipped)

**Fingerprint Components:**
```javascript
{
  userAgent: string,           // Browser + OS version
  language: string,            // Browser language
  colorDepth: number,          // Screen color depth
  deviceMemory: number,        // Available RAM (GB)
  hardwareConcurrency: number, // CPU core count
  screenResolution: string,    // Width x Height
  timezone: string,            // Timezone offset
  canvas: string,              // Canvas fingerprint hash
  webgl: string,               // WebGL vendor/renderer
  audio: string                // AudioContext fingerprint
}
```

**Fingerprint Hash:**
```javascript
import FingerprintJS from '@fingerprintjs/fingerprintjs';

async function getDeviceFingerprint() {
  const fp = await FingerprintJS.load();
  const result = await fp.get();
  return result.visitorId; // 64-character hex string
}
```

**Stability Considerations:**
- Fingerprint stable across browser sessions on the same device
- May change if browser is upgraded or OS settings modified
- **Mitigation:** Implement key rotation with cloud backup (see Section 3.5)

### 3.3 PBKDF2 Key Derivation

**Purpose:** Derive a 256-bit AES key from device fingerprint

**Algorithm:** PBKDF2 (Password-Based Key Derivation Function 2)

**Parameters:**
- **Base Material:** Device fingerprint (64-character hex string)
- **Salt:** 128-bit random salt generated once per device, stored in localStorage as `encryption_salt`
- **Hash Function:** SHA-256
- **Iterations:** 100,000 (OWASP recommendation for 2025)
- **Output:** 256-bit (32-byte) AES key

**Implementation (Browser):**
```javascript
async function deriveEncryptionKey(deviceFingerprint, salt) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(deviceFingerprint),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false, // Key not extractable
    ['encrypt', 'decrypt']
  );

  return key;
}
```

### 3.4 Salt Storage and Management

**Storage Location:** localStorage under key `kalinga_encryption_salt`

**Salt Generation (First Use):**
```javascript
function initializeEncryptionSalt() {
  const existingSalt = localStorage.getItem('kalinga_encryption_salt');
  if (existingSalt) {
    return new Uint8Array(JSON.parse(existingSalt));
  }

  // Generate new salt
  const salt = crypto.getRandomValues(new Uint8Array(16)); // 128 bits
  localStorage.setItem('kalinga_encryption_salt', JSON.stringify(Array.from(salt)));
  return salt;
}
```

**Security Note:** 
- Salt is NOT secret; it's public randomness
- Purpose is to ensure unique derived keys even if device fingerprints collide
- Safe to store in localStorage alongside encrypted data

### 3.5 Key Rotation and Recovery Strategy

**Challenge:** Device fingerprint changes (browser upgrade, OS update) → derived key changes → cannot decrypt old data

**Solution:** **Cloud-Backed Key Escrow (Optional, Phase 2 Enhancement)**

**Strategy:**
1. When encryption key is first derived, optionally encrypt it with a user-provided passphrase
2. Upload encrypted key bundle to Cloud_Backend linked to midwife account
3. On key derivation failure (decryption error), prompt user for passphrase
4. Retrieve encrypted key bundle from server, decrypt with passphrase, use for data decryption

**Implementation Priority:** Medium (Phase 2.1 can proceed without this; Phase 2.2 should add for production)

---

## 4. Encrypted localStorage Wrapper Implementation

### 4.1 Module Structure

**File:** `client/src/services/encryptedStorage.js`

**API Design:**
```javascript
// High-level API (mirrors localStorage API)
async setItem(key, value);
async getItem(key);
async removeItem(key);
async clear();

// Low-level encryption primitives
async encrypt(plaintext);
async decrypt(ciphertext);
```

### 4.2 Encryption Workflow

**Step-by-Step Process:**

```javascript
async function setItem(key, value) {
  // 1. Serialize value to JSON
  const plaintext = JSON.stringify(value);

  // 2. Get device fingerprint
  const fingerprint = await getDeviceFingerprint();

  // 3. Initialize or retrieve salt
  const salt = initializeEncryptionSalt();

  // 4. Derive encryption key
  const encryptionKey = await deriveEncryptionKey(fingerprint, salt);

  // 5. Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // 6. Encrypt plaintext
  const encoder = new TextEncoder();
  const encodedPlaintext = encoder.encode(plaintext);
  
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
      tagLength: 128 // Authentication tag length in bits
    },
    encryptionKey,
    encodedPlaintext
  );

  // 7. Bundle IV + ciphertext for storage
  const encryptedBundle = {
    version: 1,              // Format version for future migrations
    algorithm: 'AES-256-GCM',
    iv: Array.from(iv),      // Convert Uint8Array to Array for JSON
    ciphertext: Array.from(new Uint8Array(ciphertext))
  };

  // 8. Store in localStorage
  localStorage.setItem(key, JSON.stringify(encryptedBundle));
}
```

### 4.3 Decryption Workflow

```javascript
async function getItem(key) {
  // 1. Retrieve encrypted bundle from localStorage
  const bundleJson = localStorage.getItem(key);
  if (!bundleJson) return null;

  const bundle = JSON.parse(bundleJson);

  // 2. Validate bundle format
  if (bundle.version !== 1 || bundle.algorithm !== 'AES-256-GCM') {
    throw new Error('Unsupported encryption format');
  }

  // 3. Get device fingerprint
  const fingerprint = await getDeviceFingerprint();

  // 4. Retrieve salt
  const salt = initializeEncryptionSalt();

  // 5. Derive encryption key (same as encryption)
  const encryptionKey = await deriveEncryptionKey(fingerprint, salt);

  // 6. Extract IV and ciphertext
  const iv = new Uint8Array(bundle.iv);
  const ciphertext = new Uint8Array(bundle.ciphertext);

  // 7. Decrypt
  try {
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
        tagLength: 128
      },
      encryptionKey,
      ciphertext
    );

    // 8. Decode and parse JSON
    const decoder = new TextDecoder();
    const plaintext = decoder.decode(decryptedBuffer);
    return JSON.parse(plaintext);
  } catch (error) {
    // Decryption failure (wrong key, tampered data, or corrupted)
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data. Device fingerprint may have changed.');
  }
}
```

### 4.4 Error Handling

**Decryption Failure Scenarios:**

1. **Device Fingerprint Changed:**
   - **Detection:** `decrypt()` throws error
   - **User Message:** "Unable to decrypt local data. This may happen after browser updates. Please sync with cloud or re-register patients."
   - **Recovery:** Prompt to fetch data from Cloud_Backend if available

2. **Data Tampering Detected:**
   - **Detection:** GCM authentication tag verification fails
   - **User Message:** "Local data integrity check failed. Data may have been tampered with."
   - **Action:** Clear compromised localStorage, log security event

3. **Corrupted Bundle Format:**
   - **Detection:** JSON parse error or missing fields
   - **User Message:** "Corrupted local data. Please clear application data."
   - **Action:** Offer "Clear All Data" button

---

## 5. Integration Points

### 5.1 Triage Package Encryption (Primary Use Case)

**Current Code (Phase 1):** `client/src/pages/ScanConfirmation.jsx`

```javascript
// Phase 1 (Unencrypted)
localStorage.setItem('pendingUploads', JSON.stringify(triagePackages));
```

**Phase 2 (Encrypted):**
```javascript
import { encryptedStorage } from '../services/encryptedStorage';

// Save encrypted triage package
await encryptedStorage.setItem('pendingUploads', triagePackages);
```

### 5.2 Patient Registration Data

**File:** `client/src/pages/PatientRegistration.jsx`

**Phase 2 Update:**
```javascript
// Encrypt patient records
await encryptedStorage.setItem('patients', patientRecords);
```

### 5.3 Sync Queue Integration

**File:** `client/src/services/offlineQueue.js`

**Current Implementation:** Direct localStorage access

**Phase 2 Refactor:**
```javascript
// Replace all localStorage calls with encryptedStorage
async function getQueue() {
  return await encryptedStorage.getItem('pendingUploads') || [];
}

async function addToQueue(triagePackage) {
  const queue = await getQueue();
  queue.push(triagePackage);
  await encryptedStorage.setItem('pendingUploads', queue);
}
```

### 5.4 Migration Strategy (Phase 1 → Phase 2)

**Challenge:** Existing Phase 1 users have unencrypted data in localStorage

**Solution:** Data Migration on First Phase 2 Launch

```javascript
async function migrateToEncryptedStorage() {
  const migrationFlag = localStorage.getItem('encryption_migrated');
  if (migrationFlag) return; // Already migrated

  // Migrate pending uploads
  const oldUploads = localStorage.getItem('pendingUploads');
  if (oldUploads) {
    const uploads = JSON.parse(oldUploads);
    await encryptedStorage.setItem('pendingUploads', uploads);
    localStorage.removeItem('pendingUploads'); // Delete unencrypted copy
  }

  // Migrate patient records
  const oldPatients = localStorage.getItem('patients');
  if (oldPatients) {
    const patients = JSON.parse(oldPatients);
    await encryptedStorage.setItem('patients', patients);
    localStorage.removeItem('patients');
  }

  // Mark migration complete
  localStorage.setItem('encryption_migrated', 'true');
}
```

---

## 6. Server-Side Encryption (Cloud Backend)

### 6.1 Transmission Security

**Protocol:** TLS 1.3 (HTTPS)

**Configuration (Express.js):**
```javascript
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('path/to/privkey.pem'),
  cert: fs.readFileSync('path/to/cert.pem'),
  ciphers: [
    'TLS_AES_256_GCM_SHA384',
    'TLS_CHACHA20_POLY1305_SHA256',
    'TLS_AES_128_GCM_SHA256'
  ].join(':'),
  minVersion: 'TLSv1.3'
};

https.createServer(options, app).listen(443);
```

### 6.2 Database Encryption (PostgreSQL)

**Strategy:** Transparent Data Encryption (TDE) at database level

**Implementation Options:**

**Option A: PostgreSQL Native Encryption (pgcrypto)**
```sql
-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt sensitive columns
CREATE TABLE scans (
  id UUID PRIMARY KEY,
  patient_id UUID,
  encrypted_frames BYTEA, -- Store encrypted frame data
  risk_score INTEGER,
  -- Other fields
);

-- Encryption helper function
CREATE OR REPLACE FUNCTION encrypt_data(plain_text TEXT, key TEXT)
RETURNS BYTEA AS $$
BEGIN
  RETURN pgp_sym_encrypt(plain_text, key);
END;
$$ LANGUAGE plpgsql;
```

**Option B: Application-Level Encryption (Recommended)**
- Encrypt sensitive fields before INSERT using Node.js crypto module
- Store encryption metadata (algorithm, IV) in separate columns
- Decrypt on SELECT queries

**Recommended Approach:** Application-level encryption for finer control

### 6.3 Encryption Key Management (Server)

**Strategy:** Environment Variable Key Storage + AWS KMS (Production)

**Development:**
```bash
# .env file
ENCRYPTION_KEY=<256-bit hex key>
```

**Production (AWS KMS):**
```javascript
const AWS = require('aws-sdk');
const kms = new AWS.KMS({ region: 'us-east-1' });

async function getDataKey() {
  const params = {
    KeyId: 'arn:aws:kms:us-east-1:123456789:key/...',
    EncryptionContext: { purpose: 'kalinga-database-encryption' }
  };
  
  const { Plaintext } = await kms.generateDataKey(params);
  return Plaintext; // 256-bit key
}
```

---

## 7. Testing Strategy

### 7.1 Property-Based Test (Property 12)

**Framework:** fast-check

**Test File:** `client/src/__tests__/properties/property12_encryption.test.js`

```javascript
import fc from 'fast-check';
import { encrypt, decrypt } from '../../services/encryptedStorage';

describe('Property 12: AES-256 Encryption Round-Trip', () => {
  it('should preserve all data fields after encrypt-decrypt round-trip', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          id: fc.uuid(),
          patientId: fc.uuid(),
          frames: fc.array(fc.string()),
          riskScore: fc.integer({ min: 5, max: 95 }),
          riskLevel: fc.constantFrom('LOW RISK', 'MODERATE RISK', 'HIGH RISK'),
          status: fc.constantFrom('Submitted', 'Reviewed'),
          createdAt: fc.date().map(d => d.toISOString())
        }),
        async (triagePackage) => {
          const encrypted = await encrypt(JSON.stringify(triagePackage));
          const decrypted = JSON.parse(await decrypt(encrypted));
          
          // Deep equality check
          expect(decrypted).toEqual(triagePackage);
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### 7.2 Unit Tests

**Test Cases:**

1. **Encryption Produces Different Ciphertext Each Time** (due to random IV)
```javascript
test('encryption with random IV produces different ciphertext', async () => {
  const plaintext = 'test data';
  const encrypted1 = await encrypt(plaintext);
  const encrypted2 = await encrypt(plaintext);
  expect(encrypted1).not.toBe(encrypted2);
});
```

2. **Decryption with Wrong Key Fails**
```javascript
test('decryption with wrong key throws error', async () => {
  const encrypted = await encrypt('test');
  // Simulate wrong key by corrupting fingerprint
  await expect(decryptWithWrongKey(encrypted)).rejects.toThrow();
});
```

3. **Tampering Detection (GCM Authentication Tag)**
```javascript
test('tampered ciphertext detected by GCM', async () => {
  const encrypted = await encrypt('test');
  const bundle = JSON.parse(encrypted);
  bundle.ciphertext[0] ^= 0xFF; // Flip bits
  const tampered = JSON.stringify(bundle);
  await expect(decrypt(tampered)).rejects.toThrow('integrity');
});
```

4. **Large Data Encryption (Triage Package with 10 Frames)**
```javascript
test('encrypts large triage package efficiently', async () => {
  const largePackage = generateMockTriagePackage({ frameCount: 10 });
  const start = performance.now();
  const encrypted = await encrypt(JSON.stringify(largePackage));
  const decrypted = await decrypt(encrypted);
  const duration = performance.now() - start;
  
  expect(JSON.parse(decrypted)).toEqual(largePackage);
  expect(duration).toBeLessThan(500); // <500ms for UX
});
```

### 7.3 Integration Tests

**Test Scenario:** End-to-End Encrypted Workflow

```javascript
test('encrypted offline workflow: register → scan → encrypt → upload → decrypt', async () => {
  // 1. Register patient (encrypted storage)
  const patient = { id: 'p1', name: 'Maria Cruz', philhealthId: '12-345678901-2' };
  await encryptedStorage.setItem('patients', [patient]);
  
  // 2. Create triage package
  const triagePackage = { id: 't1', patientId: 'p1', frames: ['f1', 'f2'], riskScore: 78 };
  await encryptedStorage.setItem('pendingUploads', [triagePackage]);
  
  // 3. Retrieve and verify decryption
  const retrieved = await encryptedStorage.getItem('pendingUploads');
  expect(retrieved).toEqual([triagePackage]);
  
  // 4. Simulate upload (plaintext to server)
  const response = await fetch('/api/scans', {
    method: 'POST',
    body: JSON.stringify(triagePackage)
  });
  expect(response.status).toBe(200);
});
```

---

## 8. Performance Considerations

### 8.1 Encryption Performance Benchmarks

**Target Device:** Mid-range Android tablet (2GB RAM, quad-core CPU)

**Expected Performance (Web Crypto API hardware-accelerated):**
- Encrypt 1KB data: ~5ms
- Encrypt 100KB data (typical triage package): ~20ms
- Encrypt 1MB data (10 frames): ~50ms
- Decrypt: Similar latency to encryption

**Optimization Strategies:**

1. **Lazy Encryption:** Encrypt data only when storing, not during in-memory operations
2. **Batch Operations:** Encrypt all pending uploads in single pass before sync
3. **Web Worker:** Offload encryption to background thread to avoid blocking UI
   ```javascript
   const encryptionWorker = new Worker('encryptionWorker.js');
   encryptionWorker.postMessage({ action: 'encrypt', data: triagePackage });
   ```

### 8.2 Storage Overhead

**Ciphertext Expansion:**
- IV: +12 bytes
- GCM authentication tag: +16 bytes
- JSON metadata: ~100 bytes (version, algorithm, etc.)
- **Total overhead:** ~130 bytes per encrypted item

**Impact on localStorage Quota:**
- Typical browser quota: 5-10MB
- Overhead: ~2.6% for 5KB triage packages
- Acceptable for MVP scale (hundreds of packages)

---

## 9. Security Analysis

### 9.1 Threat Model

| Threat | Mitigation |
|--------|------------|
| **Physical device theft** | Data encrypted at rest; attacker cannot decrypt without device fingerprint |
| **localStorage access by malicious script** | Data encrypted; XSS cannot retrieve plaintext |
| **Man-in-the-middle attack** | TLS 1.3 encryption in transit; client-side encryption is defense-in-depth |
| **Device fingerprint collision** | PBKDF2 salt ensures unique keys; probability < 1 in 2^128 |
| **Browser fingerprint instability** | Key rotation strategy (Section 3.5); user can re-sync from cloud |
| **Brute-force key derivation** | 100,000 PBKDF2 iterations make brute-force impractical |

### 9.2 Security Assumptions

**Valid Assumptions:**
- Browser Web Crypto API correctly implements AES-GCM (vendor-tested)
- Device fingerprint provides sufficient entropy (tested by FingerprintJS library)
- localStorage isolation prevents cross-origin access

**Invalid Assumptions (Out of Scope):**
- Protection against OS-level keyloggers or screen recorders
- Protection against physical memory extraction attacks
- Protection against compromised browser extensions (user responsibility)

---

## 10. Deployment Checklist

### Phase 2.0 (Initial Encryption Implementation)

- [ ] Install dependencies: `fingerprintjs` (~53KB)
- [ ] Implement `encryptedStorage.js` module with encrypt/decrypt primitives
- [ ] Add device fingerprint generation utility
- [ ] Implement PBKDF2 key derivation function
- [ ] Create encrypted localStorage wrapper API
- [ ] Write Property 12 test (encryption round-trip)
- [ ] Write unit tests for encryption/decryption
- [ ] Update `ScanConfirmation.jsx` to use encrypted storage
- [ ] Update `PatientRegistration.jsx` to use encrypted storage
- [ ] Implement data migration script (Phase 1 → Phase 2)
- [ ] Add error handling UI for decryption failures
- [ ] Performance testing on target devices
- [ ] Security review of implementation

### Phase 2.1 (Server-Side Encryption)

- [ ] Configure TLS 1.3 on Express server
- [ ] Implement application-level encryption for PostgreSQL
- [ ] Set up AWS KMS for encryption key management
- [ ] Encrypt sensitive database columns (frames, patient names)
- [ ] Add database encryption integration tests
- [ ] Audit server encryption implementation

### Phase 2.2 (Key Recovery System)

- [ ] Implement passphrase-based key encryption
- [ ] Create cloud key escrow API endpoints
- [ ] Add key recovery UI flow
- [ ] Test key rotation scenarios
- [ ] Document key recovery procedures for midwives

---

## 11. References

### Technical Standards
- NIST SP 800-38D: Recommendation for Block Cipher Modes of Operation (GCM)
- NIST SP 800-132: Recommendation for Password-Based Key Derivation (PBKDF2)
- RFC 5288: AES Galois Counter Mode (GCM) Cipher Suites for TLS

### Documentation
- [MDN Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [FingerprintJS Documentation](https://github.com/fingerprintjs/fingerprintjs)
- [Node.js Crypto Module](https://nodejs.org/api/crypto.html)
- [PostgreSQL pgcrypto Extension](https://www.postgresql.org/docs/current/pgcrypto.html)

### Security Best Practices
- OWASP Cryptographic Storage Cheat Sheet (content adapted for compliance)
- Philippine Data Privacy Act 2012 (RA 10173)

---

## Appendix A: Code Module Structure

```
client/src/services/
├── encryptedStorage.js         # Main encrypted localStorage wrapper
│   ├── setItem(key, value)
│   ├── getItem(key)
│   ├── removeItem(key)
│   ├── clear()
│   ├── encrypt(plaintext)
│   └── decrypt(ciphertext)
│
├── deviceFingerprint.js        # Device fingerprint generation
│   ├── getFingerprint()
│   └── initializeFingerprintJS()
│
├── keyDerivation.js            # PBKDF2 key derivation
│   ├── deriveKey(fingerprint, salt)
│   └── initializeSalt()
│
└── migrationHelper.js          # Phase 1 → Phase 2 migration
    └── migrateToEncrypted()
```

---

## Appendix B: Estimated Implementation Effort

| Task | Effort (Hours) | Priority |
|------|----------------|----------|
| Core encryption module | 8 | P0 |
| Device fingerprint integration | 4 | P0 |
| Encrypted storage wrapper | 6 | P0 |
| Integration with existing components | 8 | P0 |
| Property-based test (Property 12) | 4 | P0 |
| Unit tests | 6 | P0 |
| Error handling & UX | 4 | P0 |
| Data migration script | 3 | P0 |
| Server-side TLS configuration | 2 | P1 |
| PostgreSQL encryption | 6 | P1 |
| Key recovery system | 12 | P2 |
| **Total** | **63 hours** | |

**Estimated Timeline:** 2-3 weeks (2 developers)

---

**Document Status:** ✅ Complete - Ready for Implementation  
**Next Steps:** Review with team → Approval → Begin Phase 2.0 implementation
