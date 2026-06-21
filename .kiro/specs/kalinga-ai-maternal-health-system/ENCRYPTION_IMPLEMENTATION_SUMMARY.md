# Encryption Implementation Summary

**Task 17.4:** Design encryption implementation  
**Requirements:** 8.4, 15.2, 15.3, Property 12  
**Status:** Design Complete ✅

---

## Quick Reference

### 1. Library Selection

| Component | Library | Rationale |
|-----------|---------|-----------|
| **Browser** | Native Web Crypto API (`crypto.subtle`) | Zero dependencies, hardware-accelerated, FIPS-compliant |
| **Node.js** | Native `crypto` module | OpenSSL-backed, consistent API with Web Crypto |
| **Device Fingerprint** | `@fingerprintjs/fingerprintjs` | Industry-standard, 53KB, stable device identification |

### 2. Encryption Algorithm

**Algorithm:** AES-256-GCM (Galois/Counter Mode)

**Why GCM?**
- ✅ Authenticated encryption (confidentiality + integrity)
- ✅ Tamper detection built-in
- ✅ Faster than CBC mode
- ✅ No padding oracle vulnerabilities
- ✅ Industry standard (TLS 1.3, IPsec)

**Key Parameters:**
- Key Size: 256 bits
- IV Size: 96 bits (12 bytes), randomly generated per encryption
- Authentication Tag: 128 bits

---

## 3. Key Management Strategy

### Device-Specific Key Derivation

```
Device Fingerprint (64-char hex)
    ↓
PBKDF2 (SHA-256, 100,000 iterations, random salt)
    ↓
256-bit AES Key
```

**Device Fingerprint Components:**
- User agent, language, timezone
- Screen resolution, color depth
- CPU cores, device memory
- Canvas, WebGL, Audio fingerprints

**Benefits:**
- ✅ No keys stored in localStorage (derived on-demand)
- ✅ Unique per device (prevents cross-device access)
- ✅ Deterministic (same device = same key)

---

## 4. Implementation Architecture

### Encrypted localStorage Wrapper

**File:** `client/src/services/encryptedStorage.js`

**API:**
```javascript
// Drop-in replacement for localStorage
await encryptedStorage.setItem(key, value);
await encryptedStorage.getItem(key);
await encryptedStorage.removeItem(key);
await encryptedStorage.clear();
```

### Encryption Workflow

```
1. Plain data (in-memory)
   ↓
2. JSON.stringify()
   ↓
3. Get device fingerprint
   ↓
4. Derive AES-256 key (PBKDF2)
   ↓
5. Generate random IV
   ↓
6. Encrypt with AES-256-GCM
   ↓
7. Bundle: {version, algorithm, iv, ciphertext}
   ↓
8. Store in localStorage
```

### Storage Format

```javascript
{
  "version": 1,
  "algorithm": "AES-256-GCM",
  "iv": [12, 34, 56, ...],              // 12 bytes
  "ciphertext": [78, 90, 12, ...]       // Variable length
}
```

---

## 5. Integration Points

### Replace Direct localStorage Access

**Before (Phase 1):**
```javascript
localStorage.setItem('pendingUploads', JSON.stringify(data));
const data = JSON.parse(localStorage.getItem('pendingUploads'));
```

**After (Phase 2):**
```javascript
await encryptedStorage.setItem('pendingUploads', data);
const data = await encryptedStorage.getItem('pendingUploads');
```

### Files to Update

1. `client/src/pages/ScanConfirmation.jsx` - Triage package storage
2. `client/src/pages/PatientRegistration.jsx` - Patient records
3. `client/src/services/offlineQueue.js` - Sync queue operations
4. `client/src/services/storage.js` - Generic storage utilities

---

## 6. Migration Strategy (Phase 1 → Phase 2)

### Automatic Migration on First Launch

```javascript
async function migrateToEncryptedStorage() {
  if (localStorage.getItem('encryption_migrated')) return;

  // Migrate pending uploads
  const oldUploads = localStorage.getItem('pendingUploads');
  if (oldUploads) {
    await encryptedStorage.setItem('pendingUploads', JSON.parse(oldUploads));
    localStorage.removeItem('pendingUploads');
  }

  // Migrate patient records
  const oldPatients = localStorage.getItem('patients');
  if (oldPatients) {
    await encryptedStorage.setItem('patients', JSON.parse(oldPatients));
    localStorage.removeItem('patients');
  }

  localStorage.setItem('encryption_migrated', 'true');
}
```

---

## 7. Error Handling

### Decryption Failure Scenarios

| Scenario | Cause | User Message | Recovery |
|----------|-------|--------------|----------|
| **Device Fingerprint Changed** | Browser upgrade, OS update | "Unable to decrypt local data. Please sync with cloud." | Re-sync from server |
| **Data Tampered** | GCM tag verification fails | "Data integrity check failed." | Clear localStorage |
| **Corrupted Data** | JSON parse error | "Corrupted local data detected." | Offer "Clear All Data" |

---

## 8. Server-Side Encryption

### Transmission Security

**Protocol:** TLS 1.3 (HTTPS only)

**Express Configuration:**
```javascript
https.createServer({
  key: fs.readFileSync('privkey.pem'),
  cert: fs.readFileSync('cert.pem'),
  minVersion: 'TLSv1.3',
  ciphers: 'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256'
}, app).listen(443);
```

### Database Encryption (PostgreSQL)

**Strategy:** Application-level encryption before INSERT

**Implementation:**
```javascript
const crypto = require('crypto');

function encryptField(plaintext, key) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  
  return {
    iv: iv.toString('hex'),
    ciphertext: encrypted.toString('hex'),
    tag: tag.toString('hex')
  };
}
```

**Key Management:** AWS KMS (production) or environment variables (development)

---

## 9. Testing Requirements

### Property 12: Encryption Round-Trip

**Test:** For any Triage_Package, `decrypt(encrypt(data)) === data`

**Implementation:**
```javascript
// File: client/src/__tests__/properties/property12_encryption.test.js
import fc from 'fast-check';

fc.assert(
  fc.asyncProperty(
    triagePackageGenerator(),
    async (pkg) => {
      const encrypted = await encrypt(JSON.stringify(pkg));
      const decrypted = JSON.parse(await decrypt(encrypted));
      return JSON.stringify(decrypted) === JSON.stringify(pkg);
    }
  ),
  { numRuns: 100 }
);
```

### Unit Tests Required

1. ✅ Encryption produces different ciphertext each time (random IV)
2. ✅ Decryption with wrong key fails
3. ✅ Tampered data detected by GCM
4. ✅ Large data (1MB) encrypts in <500ms
5. ✅ Key derivation is deterministic (same fingerprint = same key)
6. ✅ Salt initialization creates new salt if missing

---

## 10. Performance Targets

| Operation | Size | Target Latency | Notes |
|-----------|------|----------------|-------|
| Encrypt | 1KB | <5ms | Typical metadata |
| Encrypt | 100KB | <20ms | Standard triage package |
| Encrypt | 1MB | <50ms | 10 ultrasound frames |
| Decrypt | Any | ~Same as encrypt | Hardware-accelerated |

**Optimization:** Use Web Worker for large encryption tasks to avoid blocking UI

---

## 11. Security Properties

### Threat Mitigation

| Threat | Mitigation |
|--------|------------|
| Physical device theft | ✅ Data encrypted at rest |
| XSS script access | ✅ Encrypted localStorage, script can't decrypt |
| MITM attack | ✅ TLS 1.3 + client-side encryption (defense-in-depth) |
| Fingerprint collision | ✅ Random salt ensures unique keys (1 in 2^128) |
| Browser updates | ⚠️ Key rotation with cloud backup (Phase 2.2) |

### Compliance

✅ **Philippine Data Privacy Act 2012 (RA 10173)**
- AES-256 encryption meets "reasonable and appropriate" security measures
- Data at rest encryption on devices
- Data in transit encryption (TLS 1.3)
- Audit logging capability (server-side)

---

## 12. Implementation Checklist

### Phase 2.0 (MVP Encryption) - Priority P0

- [ ] Install `@fingerprintjs/fingerprintjs` package
- [ ] Create `encryptedStorage.js` module
- [ ] Implement device fingerprint utility
- [ ] Implement PBKDF2 key derivation
- [ ] Create encryption/decryption functions
- [ ] Write Property 12 test
- [ ] Write unit tests (6 test cases)
- [ ] Update `ScanConfirmation.jsx` integration
- [ ] Update `PatientRegistration.jsx` integration
- [ ] Update `offlineQueue.js` integration
- [ ] Implement migration script
- [ ] Add error handling UI
- [ ] Performance testing on target devices

### Phase 2.1 (Server Encryption) - Priority P1

- [ ] Configure TLS 1.3 on Express
- [ ] Implement PostgreSQL encryption
- [ ] AWS KMS integration
- [ ] Database encryption tests

### Phase 2.2 (Key Recovery) - Priority P2

- [ ] Passphrase-based key backup
- [ ] Cloud key escrow API
- [ ] Key recovery UI

---

## 13. Estimated Effort

**Total Implementation:** ~63 hours (2-3 weeks with 2 developers)

**Breakdown:**
- Core encryption: 18 hours
- Integration: 8 hours
- Testing: 10 hours
- Migration: 3 hours
- Server-side: 8 hours
- Key recovery: 12 hours
- Buffer: 4 hours

---

## 14. Next Steps

1. **Review** this design with team and security expert
2. **Approve** encryption approach and libraries
3. **Create** implementation tasks in task tracker
4. **Implement** Phase 2.0 (client-side encryption)
5. **Test** with Property 12 + unit tests
6. **Deploy** to staging for security audit
7. **Roll out** Phase 2.1 (server encryption)

---

## Quick Commands

### Install Dependencies
```bash
cd client
npm install @fingerprintjs/fingerprintjs
```

### Run Encryption Tests
```bash
npm test -- property12_encryption.test.js
```

### Check Performance
```javascript
console.time('encrypt');
await encryptedStorage.setItem('test', largeData);
console.timeEnd('encrypt');
```

---

**Document Version:** 1.0  
**Last Updated:** 2025  
**Status:** Ready for Implementation ✅
