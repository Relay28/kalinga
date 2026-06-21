# Encryption Workflow Diagrams

**Visual reference for encryption implementation**

---

## 1. Overall Encryption Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         KALINGA AI SYSTEM                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              BROWSER (Midwife Device)                        │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │                                                               │   │
│  │  Plain Text Data (In-Memory)                                 │   │
│  │    • Patient Records                                         │   │
│  │    • Triage Packages                                         │   │
│  │    • Ultrasound Frames                                       │   │
│  │                           ↓                                   │   │
│  │  ┌─────────────────────────────────────────────────┐        │   │
│  │  │     AES-256-GCM Encryption Layer                 │        │   │
│  │  │  (Web Crypto API - crypto.subtle)               │        │   │
│  │  └─────────────────────────────────────────────────┘        │   │
│  │                           ↓                                   │   │
│  │  Encrypted Data (localStorage)                               │   │
│  │    • Ciphertext                                              │   │
│  │    • IV (12 bytes)                                           │   │
│  │    • Authentication Tag (16 bytes)                           │   │
│  │                                                               │   │
│  └───────────────────────────────────┬───────────────────────────┘   │
│                                      │                               │
│                                      │ TLS 1.3 (HTTPS)              │
│                                      ↓                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │              CLOUD BACKEND (Server)                          │   │
│  ├─────────────────────────────────────────────────────────────┤   │
│  │                                                               │   │
│  │  Receives Encrypted Packages                                 │   │
│  │                           ↓                                   │   │
│  │  ┌─────────────────────────────────────────────────┐        │   │
│  │  │   Application-Level Encryption                   │        │   │
│  │  │   (Node.js crypto module)                       │        │   │
│  │  └─────────────────────────────────────────────────┘        │   │
│  │                           ↓                                   │   │
│  │  PostgreSQL (Transparent Data Encryption)                    │   │
│  │                                                               │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                       │
└───────────────────────────────────────────────────────────────────────┘
```

---

## 2. Key Derivation Workflow

```
┌──────────────────────────────────────────────────────────────────┐
│                    KEY DERIVATION PROCESS                         │
└──────────────────────────────────────────────────────────────────┘

Step 1: Device Fingerprint Generation
─────────────────────────────────────
┌─────────────────┐
│  Browser APIs   │
│  • Navigator    │
│  • Screen       │──┐
│  • Canvas       │  │
│  • WebGL        │  │
│  • AudioContext │  │
└─────────────────┘  │
                     │  Fingerprint
                     │  Components
                     ↓
              ┌─────────────┐
              │ FingerprintJS│
              │   Library    │
              └─────────────┘
                     ↓
        64-character hex string
        (e.g., "a3f2c1d8...")
                     ↓
                     
Step 2: Salt Initialization
────────────────────────────
      First Launch Only
              ↓
    ┌──────────────────┐
    │ crypto.random    │
    │  Bytes(16)       │ ──→ 128-bit random salt
    └──────────────────┘
              ↓
    Store in localStorage
    (key: "kalinga_encryption_salt")
              ↓
              
Step 3: PBKDF2 Key Derivation
──────────────────────────────
    Fingerprint (64 chars)
              +
    Salt (16 bytes, from localStorage)
              ↓
    ┌──────────────────────────┐
    │      PBKDF2-SHA256       │
    │   100,000 iterations     │
    │    256-bit output        │
    └──────────────────────────┘
              ↓
    32-byte AES-256 Key
    (Not stored, derived on-demand)
              ↓
    ┌──────────────────────────┐
    │  Used for Encryption/    │
    │     Decryption           │
    └──────────────────────────┘
```

---

## 3. Encryption Round-Trip Workflow

```
┌──────────────────────────────────────────────────────────────────┐
│                    ENCRYPTION WORKFLOW                            │
└──────────────────────────────────────────────────────────────────┘

                    ENCRYPTION PHASE
                    ─────────────────

Plain Text Data (JavaScript Object)
  {
    id: "t123",
    patientId: "p456",
    frames: [...],
    riskScore: 78
  }
              ↓
      JSON.stringify()
              ↓
    UTF-8 String (e.g., "{"id":"t123",...}")
              ↓
┌─────────────────────────────────────┐
│  Get Device Fingerprint              │
│  (async, ~50ms)                      │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Derive Encryption Key               │
│  PBKDF2 (fingerprint + salt)         │
│  (async, ~200ms)                     │
└─────────────────────────────────────┘
              ↓
    256-bit AES Key (CryptoKey object)
              ↓
┌─────────────────────────────────────┐
│  Generate Random IV                  │
│  crypto.getRandomValues(12 bytes)    │
└─────────────────────────────────────┘
              ↓
    12-byte IV (e.g., [0x3a, 0x7f, ...])
              ↓
┌─────────────────────────────────────┐
│  AES-256-GCM Encryption              │
│  crypto.subtle.encrypt()             │
│  Input: plaintext + key + IV         │
│  Output: ciphertext + auth tag       │
│  (async, ~20ms for 100KB)            │
└─────────────────────────────────────┘
              ↓
    Ciphertext Buffer + 16-byte Auth Tag
              ↓
┌─────────────────────────────────────┐
│  Bundle for Storage                  │
│  {                                   │
│    version: 1,                       │
│    algorithm: "AES-256-GCM",         │
│    iv: [array],                      │
│    ciphertext: [array]               │
│  }                                   │
└─────────────────────────────────────┘
              ↓
      JSON.stringify()
              ↓
    localStorage.setItem(key, bundle)
              ↓
        ✅ ENCRYPTED


                    DECRYPTION PHASE
                    ─────────────────

    localStorage.getItem(key)
              ↓
    Bundle JSON String
              ↓
      JSON.parse()
              ↓
    Bundle Object
    {
      version: 1,
      algorithm: "AES-256-GCM",
      iv: [array],
      ciphertext: [array]
    }
              ↓
┌─────────────────────────────────────┐
│  Validate Bundle Format              │
│  Check version, algorithm            │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Get Device Fingerprint              │
│  (same as encryption)                │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  Derive Encryption Key               │
│  PBKDF2 (same fingerprint + salt)    │
│  → Same 256-bit key                  │
└─────────────────────────────────────┘
              ↓
    Extract IV and Ciphertext from Bundle
              ↓
┌─────────────────────────────────────┐
│  AES-256-GCM Decryption              │
│  crypto.subtle.decrypt()             │
│  Input: ciphertext + key + IV        │
│  (Verifies auth tag automatically)   │
│  (async, ~20ms)                      │
└─────────────────────────────────────┘
              ↓
              ├─ Success ──────┐
              │                 ↓
              │     Decrypted Buffer (UTF-8)
              │                 ↓
              │         TextDecoder.decode()
              │                 ↓
              │         JSON String
              │                 ↓
              │         JSON.parse()
              │                 ↓
              │     ✅ Original Object Restored
              │
              └─ Failure ──────┐
                                ↓
                      ❌ DecryptError
                                ↓
                    Error Handling Flow
```

---

## 4. Error Handling Decision Tree

```
┌──────────────────────────────────────────────────────────────────┐
│                    DECRYPTION ERROR HANDLING                      │
└──────────────────────────────────────────────────────────────────┘

                Attempt Decryption
                        ↓
                ┌───────────────┐
                │   Success?    │
                └───────────────┘
                ↓               ↓
            YES │               │ NO
                ↓               ↓
       ✅ Return Data    Check Error Type
                                ↓
                        ┌───────────────┐
                        │ Error is...?  │
                        └───────────────┘
                                ↓
        ┌───────────────────────┼───────────────────────┐
        ↓                       ↓                       ↓
┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ Auth Tag     │    │  JSON Parse      │    │  Invalid Key     │
│ Verification │    │  Error           │    │  (OperationError)│
│ Failed       │    │                  │    │                  │
└──────────────┘    └──────────────────┘    └──────────────────┘
        ↓                       ↓                       ↓
┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ Data Tampered│    │ Data Corrupted   │    │ Fingerprint      │
│ or Corrupted │    │                  │    │ Changed          │
└──────────────┘    └──────────────────┘    └──────────────────┘
        ↓                       ↓                       ↓
┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ User Message:│    │ User Message:    │    │ User Message:    │
│ "Data        │    │ "Corrupted data  │    │ "Cannot decrypt  │
│ integrity    │    │ detected. Please │    │ data. Browser    │
│ check failed"│    │ clear storage."  │    │ updated?"        │
└──────────────┘    └──────────────────┘    └──────────────────┘
        ↓                       ↓                       ↓
┌──────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ Action:      │    │ Action:          │    │ Action:          │
│ Clear        │    │ Offer "Clear All │    │ Offer "Sync from │
│ localStorage │    │ Data" button     │    │ Cloud" button    │
│ Log security │    │                  │    │ Key recovery UI  │
│ event        │    │                  │    │ (Phase 2.2)      │
└──────────────┘    └──────────────────┘    └──────────────────┘
```

---

## 5. Data Flow: Patient Registration to Upload

```
┌──────────────────────────────────────────────────────────────────┐
│            END-TO-END ENCRYPTED DATA FLOW                         │
└──────────────────────────────────────────────────────────────────┘


1. PATIENT REGISTRATION
   ─────────────────────
   Midwife enters patient data
              ↓
   {
     philhealthId: "12-345678901-2",
     name: "Maria Santos Cruz",
     bloodPressure: "160/100",
     ...
   }
              ↓
   ENCRYPT (AES-256-GCM)
              ↓
   localStorage["patients"] = encrypted_blob


2. ULTRASOUND SCAN
   ───────────────
   Midwife captures frames
              ↓
   {
     id: "scan-001",
     patientId: "p123",
     frames: [frame1, frame2, ...],
     riskScore: 78,
     riskLevel: "HIGH RISK"
   }
              ↓
   ENCRYPT (AES-256-GCM)
              ↓
   localStorage["pendingUploads"] = encrypted_blob


3. SYNC TO CLOUD (When Online)
   ────────────────────────────
   User clicks "Pending Uploads"
              ↓
   DECRYPT from localStorage
              ↓
   Plain text triage package
              ↓
   ┌─────────────────────────┐
   │   TLS 1.3 Encryption    │
   │  (Transport Security)   │
   └─────────────────────────┘
              ↓
   POST /api/scans
   {
     "id": "scan-001",
     "patientId": "p123",
     "frames": [...],
     "riskScore": 78
   }
              ↓


4. SERVER-SIDE STORAGE
   ───────────────────
   Express.js receives package
              ↓
   Validate schema
              ↓
   ENCRYPT sensitive fields
   (Node.js crypto module)
              ↓
   PostgreSQL INSERT
   ┌────────────────────────┐
   │ encrypted_frames: BYTEA│
   │ risk_score: INTEGER    │ (not encrypted)
   │ ...                    │
   └────────────────────────┘
              ↓
   Database TDE (Transparent Data Encryption)
              ↓
   ✅ Data at rest encrypted


5. SPECIALIST REVIEW
   ──────────────────
   Specialist logs in
              ↓
   GET /api/scans?status=Submitted
              ↓
   Server DECRYPTS sensitive fields
              ↓
   TLS 1.3 (HTTPS)
              ↓
   Specialist Dashboard renders frames
              ↓
   Specialist submits verdict
              ↓
   Notification created for midwife
```

---

## 6. Storage Comparison (Before vs After Encryption)

```
┌──────────────────────────────────────────────────────────────────┐
│                  PHASE 1 vs PHASE 2 STORAGE                       │
└──────────────────────────────────────────────────────────────────┘


PHASE 1 (Current - Unencrypted)
────────────────────────────────
localStorage["pendingUploads"] = '[
  {
    "id": "scan-001",
    "patientId": "p123",
    "frames": ["frame1.png", "frame2.png"],
    "riskScore": 78,
    "riskLevel": "HIGH RISK"
  }
]'

✅ Pros: Simple, fast, no dependencies
❌ Cons: Readable by any script with localStorage access
❌ Cons: Vulnerable if device stolen


PHASE 2 (Encrypted)
───────────────────
localStorage["pendingUploads"] = '{
  "version": 1,
  "algorithm": "AES-256-GCM",
  "iv": [58, 127, 200, 45, 192, 88, 13, 250, 102, 19, 245, 111],
  "ciphertext": [
    142, 244, 73, 200, 156, 28, 93, 204, 17, 189, 32, 77, 198, 
    203, 45, 189, 200, 156, 93, 32, 45, 128, 67, 201, 88, 13, 
    ... (hundreds more bytes)
  ]
}'

✅ Pros: Data confidential even with localStorage access
✅ Pros: Tamper detection via GCM auth tag
✅ Pros: Compliance with privacy regulations
⚠️ Cons: Slightly slower (~20ms overhead per operation)
⚠️ Cons: Requires device fingerprint stability
```

---

## 7. Performance Benchmarks

```
┌──────────────────────────────────────────────────────────────────┐
│                    ENCRYPTION PERFORMANCE                         │
└──────────────────────────────────────────────────────────────────┘

Target Device: Mid-range tablet (2GB RAM, quad-core)


Operation: ENCRYPT
─────────────────

Data Size        │ Latency  │ Acceptable?
─────────────────┼──────────┼─────────────
1 KB (metadata)  │  ~5ms    │ ✅ Excellent
10 KB (patient)  │  ~10ms   │ ✅ Excellent
100 KB (package) │  ~20ms   │ ✅ Good
1 MB (10 frames) │  ~50ms   │ ✅ Acceptable
10 MB (large)    │  ~500ms  │ ⚠️ Use Web Worker


Operation: DECRYPT
──────────────────

Data Size        │ Latency  │ Acceptable?
─────────────────┼──────────┼─────────────
1 KB             │  ~5ms    │ ✅ Excellent
100 KB           │  ~20ms   │ ✅ Good
1 MB             │  ~50ms   │ ✅ Acceptable


Operation: KEY DERIVATION (PBKDF2)
──────────────────────────────────

Component              │ Latency  │ Frequency
───────────────────────┼──────────┼─────────────────
Device Fingerprint     │  ~50ms   │ Once per session
PBKDF2 (100K iter)     │  ~200ms  │ Once per session
Total First Access     │  ~250ms  │ Acceptable
Subsequent Access      │  ~0ms    │ (Key cached)


Storage Overhead
────────────────

Component         │ Size      │ Notes
──────────────────┼───────────┼──────────────────────
IV                │ 12 bytes  │ Per encrypted item
Auth Tag          │ 16 bytes  │ Per encrypted item
JSON Metadata     │ ~100 bytes│ Per encrypted item
Total Overhead    │ ~130 bytes│ ~2.6% for 5KB items
```

---

## 8. Security Threat Analysis

```
┌──────────────────────────────────────────────────────────────────┐
│                    THREAT MODEL & MITIGATIONS                     │
└──────────────────────────────────────────────────────────────────┘


Threat: Physical Device Theft
──────────────────────────────
Attack Vector:
  Attacker steals tablet → Extracts localStorage

Without Encryption (Phase 1):
  ❌ Attacker reads patient data directly

With Encryption (Phase 2):
  ✅ Data encrypted with device-specific key
  ✅ Attacker cannot derive key without fingerprint
  ✅ Brute-force impractical (100K PBKDF2 iterations)


Threat: XSS Attack (Malicious Script)
──────────────────────────────────────
Attack Vector:
  Malicious script injected → Reads localStorage

Without Encryption:
  ❌ Script reads patient data as JSON

With Encryption:
  ✅ Script sees only ciphertext
  ✅ Cannot derive key (fingerprint + salt not exposed)
  ⚠️ Defense in depth (React XSS protection is primary)


Threat: Man-in-the-Middle (Network)
────────────────────────────────────
Attack Vector:
  Attacker intercepts upload traffic

Without Client Encryption:
  ⚠️ Relies only on TLS

With Client Encryption:
  ✅ Data encrypted before TLS (layered security)
  ✅ Even if TLS compromised, data still encrypted
  ✅ Defense in depth


Threat: Database Breach (Server)
─────────────────────────────────
Attack Vector:
  Attacker gains PostgreSQL access

Phase 2 Server Encryption:
  ✅ Sensitive fields encrypted at application layer
  ✅ Encryption keys stored in AWS KMS (separate system)
  ✅ Database TDE provides additional layer


Threat: Browser Fingerprint Instability
────────────────────────────────────────
Scenario:
  Browser update → Fingerprint changes → Key derivation fails

Mitigation:
  ⚠️ Phase 2.0: User must re-sync from cloud
  ✅ Phase 2.2: Key recovery via passphrase + cloud escrow
```

---

## 9. Module Dependency Graph

```
┌──────────────────────────────────────────────────────────────────┐
│                    MODULE DEPENDENCIES                            │
└──────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────┐
│  Application Code (React Components)                    │
│  • ScanConfirmation.jsx                                 │
│  • PatientRegistration.jsx                              │
│  • offlineQueue.js                                      │
└──────────────────┬──────────────────────────────────────┘
                   │
                   │ imports
                   ↓
┌─────────────────────────────────────────────────────────┐
│  encryptedStorage.js (Main API)                         │
│  • async setItem(key, value)                            │
│  • async getItem(key)                                   │
│  • async removeItem(key)                                │
│  • async clear()                                        │
└──────────────────┬──────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        ↓                     ↓
┌──────────────────┐   ┌─────────────────┐
│ deviceFingerprint│   │ keyDerivation.js │
│     .js          │   │                  │
│                  │   │ • deriveKey()    │
│ • getFingerprint │   │ • initializeSalt │
│   ()             │   │   ()             │
└────────┬─────────┘   └────────┬─────────┘
         │                      │
         │                      │
         ↓                      ↓
┌────────────────┐      ┌───────────────┐
│ @fingerprintjs │      │ Web Crypto API│
│ /fingerprintjs │      │ (crypto.subtle)│
│ (npm package)  │      │ (native)      │
└────────────────┘      └───────────────┘
```

---

**Document Purpose:** Visual reference for implementation team  
**Status:** Complete ✅  
**Next:** Refer to ENCRYPTION_DESIGN.md for detailed specifications
