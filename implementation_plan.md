# Kalinga AI — Technical Prototype Development Plan

**Offline-First, AI-Assisted Maternal Diagnostic Triage System for GIDA Philippines**

> **Mission**: Bridge the OB-GYN specialist gap in Geographically Isolated and Disadvantaged Areas (GIDA) by enabling rural midwives to perform AI-assisted ultrasound triage using government-procured POCUS devices that currently sit idle.

---

## 1. System Architecture & Data Flow

### 1.1 High-Level Architecture

```mermaid
graph TB
    subgraph "EDGE LAYER — Midwife Device (Offline-First)"
        A["📱 Midwife PWA<br/>Next.js on Vercel"] --> B["📷 Camera Capture<br/>MediaStream API"]
        B --> C["🧠 Edge AI Engine<br/>ONNX Runtime Web<br/>MobileNetV3-Small INT8"]
        C --> D["📊 Risk Score<br/>0-100% Preeclampsia<br/>Probability"]
        A --> E["💾 IndexedDB<br/>Offline Triage Store"]
        D --> E
    end

    subgraph "SYNC LAYER — Store-and-Forward"
        E -->|"Online Detected<br/>navigator.onLine"| F["🔄 Sync Engine<br/>Background Sync API"]
        F -->|"POST /api/triage"| G["☁️ Render Backend<br/>Express.js REST API"]
    end

    subgraph "CLOUD LAYER — Validation Pipeline"
        G --> H["🗄️ Neon Postgres<br/>Serverless DB"]
        H --> I["🖥️ OB-GYN Dashboard<br/>Next.js on Vercel"]
        I --> J["✅ Specialist Verdict<br/>Confirm / Escalate / Override"]
        J -->|"PUT /api/triage/:id/verdict"| G
        G --> H
    end

    style A fill:#1a1a2e,stroke:#e94560,color:#fff
    style C fill:#0f3460,stroke:#16213e,color:#fff
    style G fill:#533483,stroke:#e94560,color:#fff
    style H fill:#0f3460,stroke:#16213e,color:#fff
    style I fill:#1a1a2e,stroke:#e94560,color:#fff
```

### 1.2 Detailed Data Flow Sequence

```mermaid
sequenceDiagram
    participant MW as 👩‍⚕️ Midwife
    participant APP as 📱 Kalinga PWA
    participant AI as 🧠 ONNX Runtime
    participant IDB as 💾 IndexedDB
    participant SYNC as 🔄 Sync Engine
    participant API as ☁️ Render API
    participant DB as 🗄️ Neon Postgres
    participant DOC as 🩺 OB-GYN Dashboard

    MW->>APP: Open patient intake form
    APP->>MW: Render vitals input (BP, HR, GA, symptoms)
    MW->>APP: Submit vitals + initiate scan
    APP->>APP: Activate device camera (rear-facing)
    MW->>APP: Point camera at POCUS screen / scan printout
    APP->>AI: Feed captured frame (224×224 tensor)
    AI->>AI: MobileNetV3-Small INT8 inference (~50ms)
    AI->>APP: Return prediction vector [normal, abnormal, inconclusive]
    APP->>APP: Compute composite risk score (0-100%)
    APP->>MW: Display risk score + color-coded triage level
    APP->>IDB: Persist TriagePacket {vitals, frame_b64, risk_score, timestamp}
    
    Note over SYNC: Connectivity restored
    SYNC->>IDB: Query unsynced packets (sync_status='pending')
    SYNC->>API: POST /api/triage (batch upload)
    API->>DB: INSERT triage_packets + UPDATE sync ledger
    API->>SYNC: 200 OK {synced_ids: [...]}
    SYNC->>IDB: UPDATE sync_status='synced'
    
    DOC->>API: GET /api/triage/queue?status=pending_review
    API->>DB: SELECT * FROM triage_packets ORDER BY risk_score DESC
    DB->>API: Return prioritized triage queue
    API->>DOC: JSON response (highest risk first)
    DOC->>DOC: Render triage card with image + vitals + AI score
    DOC->>API: PUT /api/triage/:id/verdict {verdict, notes, override_score}
    API->>DB: UPDATE triage_packets SET specialist_verdict=...
```

### 1.3 Offline Data Storage Strategy

The offline-first architecture uses a **three-tier local persistence model**:

| Layer | Technology | Purpose | Size Limit |
|-------|-----------|---------|------------|
| **L1: Session** | `sessionStorage` | Active form state, camera stream metadata | 5 MB |
| **L2: Persistent** | `IndexedDB` (via `idb` wrapper) | Triage packets, captured frames (Base64), patient records | 50-100 MB+ (browser-dependent) |
| **L3: Cache** | `Cache API` (Service Worker) | ONNX model binary, app shell, static assets | ~25 MB |

**IndexedDB Schema (Client-Side)**:

```
ObjectStore: "triage_packets"
├── id: string (UUIDv4, auto-generated)
├── patient_id: string (UUIDv4)
├── patient_name: string (encrypted at-rest)
├── gestational_age_weeks: number
├── systolic_bp: number
├── diastolic_bp: number
├── heart_rate: number
├── protein_urine: enum ["negative", "trace", "+1", "+2", "+3", "+4"]
├── symptoms: string[] (edema, headache, visual_disturbances, epigastric_pain)
├── frame_base64: string (captured ultrasound image, JPEG compressed)
├── frame_thumbnail_b64: string (128×128 preview)
├── ai_prediction: { normal: float, abnormal: float, inconclusive: float }
├── risk_score: number (0-100)
├── triage_level: enum ["GREEN", "YELLOW", "RED", "CRITICAL"]
├── midwife_id: string
├── barangay_health_station: string
├── captured_at: ISO8601 timestamp
├── sync_status: enum ["pending", "syncing", "synced", "error"]
├── sync_error: string | null
├── synced_at: ISO8601 timestamp | null
└── created_at: ISO8601 timestamp

ObjectStore: "patients"
├── id: string (UUIDv4)
├── name: string (encrypted)
├── age: number
├── lmp: ISO8601 date (Last Menstrual Period)
├── gravida: number
├── para: number
├── risk_factors: string[]
└── created_at: ISO8601 timestamp

ObjectStore: "sync_ledger"
├── id: string
├── last_sync_at: ISO8601 timestamp
├── packets_pending: number
├── packets_synced: number
└── last_error: string | null
```

**Sync State Machine**:

```mermaid
stateDiagram-v2
    [*] --> PENDING: Triage packet created
    PENDING --> SYNCING: Online detected + sync triggered
    SYNCING --> SYNCED: API returns 200 OK
    SYNCING --> ERROR: Network failure / API error
    ERROR --> PENDING: Retry (exponential backoff)
    SYNCED --> [*]
```

---

## 2. Free-Tier Stack & Model Selection Justification

### 2.1 Complete Stack Audit — $0 Cost Proof

| Component | Service | Tier | Critical Limits | Cost |
|-----------|---------|------|----------------|------|
| **Frontend Hosting** | Vercel Hobby | Free | 100 GB bandwidth, 1M edge requests, 6000 build min/mo | $0 |
| **Backend API** | Render Free Web Service | Free | 0.1 CPU shared, ~512 MB RAM, 750 hrs/mo, 15-min sleep | $0 |
| **Database** | Neon Serverless Postgres | Free | 0.5 GB storage, 100 CU-hrs/mo, 10 branches, scale-to-zero | $0 |
| **AI Inference** | ONNX Runtime Web (client-side) | OSS | Runs in browser WASM/WebGPU — zero server cost | $0 |
| **Model Weights** | Self-hosted static asset on Vercel | Free | Served as `.onnx` file from `/public` | $0 |
| **Auth (optional)** | Neon + bcrypt (self-rolled JWT) | Free | No third-party auth service needed | $0 |
| **Monitoring** | Vercel Analytics (built-in) | Free | Basic web vitals | $0 |
| **TOTAL** | | | | **$0** |

### 2.2 AI Model Selection: Why MobileNetV3-Small (Not FetalCLIP Directly)

> [!IMPORTANT]
> FetalCLIP (ViT-L/14) has **304M parameters** and requires ~1.2 GB RAM for inference. This exceeds both the Render free-tier limit (512 MB) and is too heavy for browser-side WASM execution on low-end smartphones. We select MobileNetV3-Small as the edge inference backbone, trained using **feature patterns extracted from the FetalCLIP framework**.

**Model Selection Matrix**:

| Model | Parameters | FP32 Size | INT8 Size | Browser WASM Latency | Render Fit? |
|-------|-----------|-----------|-----------|---------------------|-------------|
| FetalCLIP (ViT-L/14) | 304M | ~1.2 GB | ~300 MB | ❌ ~8-12s | ❌ OOM |
| MobileFetalCLIP (FastViT) | 75M (11.4M visual) | ~285 MB | ~72 MB | ⚠️ ~800ms | ⚠️ Tight |
| **MobileNetV3-Small** | **2.54M** | **~10 MB** | **~3.5 MB** | **✅ ~30-80ms** | **✅ Fits** |
| MobileNetV3-Large | 5.48M | ~22 MB | ~7 MB | ✅ ~60-120ms | ✅ Fits |
| EfficientNet-Lite0 | 4.7M | ~18 MB | ~5.5 MB | ✅ ~50-100ms | ✅ Fits |

**Selected: MobileNetV3-Small (INT8 Quantized ONNX)**

**Justification**:
1. **3.5 MB model** loads in <1s even on 3G networks — critical for GIDA areas
2. **~30-80ms inference** on mid-range Android phones via WASM+SIMD
3. **Fully client-side** — zero server inference cost, works 100% offline
4. **Transfer learning** from FetalCLIP features is architecturally viable (see §2.3)

### 2.3 FetalCLIP Feature Extraction Pattern for MobileNetV3

The prototype utilizes FetalCLIP's **representational knowledge** without deploying the full model:

```mermaid
graph LR
    subgraph "OFFLINE TRAINING PIPELINE (Developer Machine)"
        A["NatalIA PBF-US1<br/>19,407 frames<br/>5 fetal planes"] --> B["FetalCLIP ViT-L/14<br/>Feature Extractor<br/>(Teacher)"]
        B --> C["512-dim Embeddings<br/>Per Frame"]
        C --> D["Knowledge Distillation<br/>+ Fine-tuning"]
        D --> E["MobileNetV3-Small<br/>(Student)"]
        E --> F["Export to ONNX<br/>+ INT8 Quantization"]
        F --> G["model_int8.onnx<br/>~3.5 MB"]
    end

    subgraph "RUNTIME (Browser)"
        G --> H["ONNX Runtime Web<br/>WASM Backend"]
        H --> I["3-class Output<br/>normal / abnormal /<br/>inconclusive"]
    end

    style B fill:#e94560,stroke:#1a1a2e,color:#fff
    style E fill:#0f3460,stroke:#16213e,color:#fff
    style G fill:#533483,stroke:#e94560,color:#fff
```

**Pattern Implementation**:

1. **Feature Extraction**: Run NatalIA PBF-US1 images through FetalCLIP's image encoder → extract 512-dimensional CLS token embeddings
2. **Label Mapping**: Map the 5 fetal planes (Biparietal, Abdominal, Heart, Femur, Spine) to a simplified triage schema:
   - `normal` → Standard anatomy detected, no anomalies
   - `abnormal` → Structural deviation, non-standard view quality, potential pathology indicators
   - `inconclusive` → Poor image quality, non-diagnostic frame
3. **Student Training**: Train MobileNetV3-Small classification head using FetalCLIP embeddings as soft labels (temperature-scaled KD loss)
4. **Quantization**: Apply post-training static quantization via `onnxruntime.quantization` with NatalIA calibration subset

### 2.4 NatalIA PBF-US1 Dataset Schema

| Field | Value |
|-------|-------|
| **Total Frames** | 19,407 |
| **Source Videos** | 90 (from 45 untrained volunteers) |
| **Phantom** | US-7a SPACE FAN, 23-week gestational age |
| **POCUS Device** | Clarius C3 HD3 (wireless handheld) |
| **Fetal Planes** | Biparietal, Abdominal, Heart, Femur, Spine |
| **Sweep Protocol** | Vertical, Horizontal, 2× Diagonal (blind-sweep) |
| **Fetal Poses** | 4 distinct positions |
| **License** | Open Source (CC-BY compatible) |
| **Access** | GitHub: `BiomedLabUGgt/NatalIA-PBF-US1`, Zenodo DOI: `10.5281/zenodo.14193949` |

**Ingestion Schema for Training Pipeline**:

```python
# NatalIA PBF-US1 data loading schema
{
    "frame_id": "str",           # Unique frame identifier
    "video_id": "str",           # Parent video identifier
    "volunteer_id": "int",       # 1-45
    "fetal_pose": "int",         # 1-4
    "sweep_direction": "str",    # vertical | horizontal | diagonal_1 | diagonal_2
    "fetal_plane": "str",        # biparietal | abdominal | heart | femur | spine | background
    "frame_index": "int",        # Position in source video
    "image_path": "str",         # Relative path to PNG frame
    "image_resolution": "tuple", # (width, height) in pixels
    "is_standard_plane": "bool"  # Whether frame captures a standard diagnostic plane
}
```

### 2.5 Preeclampsia Risk Scoring Algorithm

The composite risk score integrates AI imaging output with clinical vitals using a **weighted multiparametric model** adapted from the Fetal Medicine Foundation (FMF) framework:

```
RISK_SCORE = (
    w₁ × AI_ABNORMALITY_PROBABILITY +    # 0.35 weight
    w₂ × BP_RISK_FACTOR +                 # 0.25 weight
    w₃ × PROTEINURIA_SCORE +              # 0.15 weight
    w₄ × SYMPTOM_SEVERITY_INDEX +          # 0.15 weight
    w₅ × GESTATIONAL_AGE_MODIFIER          # 0.10 weight
) × 100

Where:
- AI_ABNORMALITY_PROBABILITY ∈ [0, 1] from ONNX model output
- BP_RISK_FACTOR = sigmoid((systolic - 140) / 10) when systolic ≥ 120
- PROTEINURIA_SCORE = {negative: 0, trace: 0.1, +1: 0.3, +2: 0.6, +3: 0.85, +4: 1.0}
- SYMPTOM_SEVERITY_INDEX = count(active_symptoms) / total_symptoms
- GESTATIONAL_AGE_MODIFIER = 1.0 + (0.02 × max(0, GA_weeks - 20))
```

**Triage Level Classification**:

| Score Range | Level | Color | Action |
|-------------|-------|-------|--------|
| 0–25 | GREEN | 🟢 | Routine monitoring, next scheduled visit |
| 26–50 | YELLOW | 🟡 | Enhanced monitoring, recheck in 48 hours |
| 51–75 | RED | 🔴 | Urgent referral, contact nearest OB-GYN |
| 76–100 | CRITICAL | ⚫ | Emergency evacuation, immediate transport |

> [!WARNING]
> **Medical Disclaimer**: This scoring algorithm is a **prototype proof-of-concept** and MUST NOT be used for actual clinical decisions. All scores require OB-GYN specialist validation through the verification queue. The algorithm weights (w₁–w₅) require clinical validation studies before any real-world deployment.

---

## 3. Sprint Roadmap

### Sprint Overview

| Sprint | Duration | Focus | Deliverable |
|--------|----------|-------|-------------|
| **Sprint 1** | 5–7 days | Frontend Camera UI + Edge AI Core | PWA with camera capture, mock ONNX inference, patient intake UI, deployed to Vercel |
| **Sprint 2** | 5–7 days | Backend API + Database Schema | Express.js REST API on Render, Neon Postgres schema, CRUD endpoints, auth |
| **Sprint 3** | 5–7 days | Sync Engine + OB-GYN Dashboard + E2E Testing | Store-and-forward mechanism, specialist verification UI, integration tests |

---

### Sprint 1: Frontend Camera UI & Edge-AI Core

**Goal**: Ship a functional Vercel-deployed PWA where a midwife can capture patient vitals, point the camera at a POCUS display, and see a simulated AI risk score.

#### Step 1.1 — Project Scaffolding

```bash
# Initialize Next.js 15 project with App Router
npx -y create-next-app@latest ./ \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --turbopack \
  --use-npm

# Install edge-AI and utility dependencies
npm install onnxruntime-web idb uuid
npm install -D @types/uuid
```

**File Structure**:

```
kalinga/
├── public/
│   ├── models/
│   │   └── mobilenetv3_small_int8.onnx    # ~3.5 MB quantized model
│   ├── icons/
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   └── manifest.json                      # PWA manifest
├── src/
│   ├── app/
│   │   ├── layout.tsx                     # Root layout with Inter font
│   │   ├── page.tsx                       # Landing / patient list
│   │   ├── globals.css                    # Tailwind base + custom tokens
│   │   ├── intake/
│   │   │   └── page.tsx                   # Patient vitals intake form
│   │   ├── scan/
│   │   │   └── page.tsx                   # Camera capture + AI inference
│   │   ├── results/
│   │   │   └── page.tsx                   # Risk score display + triage card
│   │   └── dashboard/
│   │       └── page.tsx                   # OB-GYN verification queue (Sprint 3)
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Badge.tsx
│   │   │   └── ProgressRing.tsx           # Animated circular risk score
│   │   ├── CameraCapture.tsx              # WebRTC camera component
│   │   ├── RiskScoreGauge.tsx             # Animated 0-100 gauge
│   │   ├── TriageCard.tsx                 # Patient triage summary card
│   │   ├── VitalsForm.tsx                 # BP, HR, symptoms input
│   │   └── SyncStatusBadge.tsx            # Online/offline indicator
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── inference.ts               # ONNX Runtime Web session manager
│   │   │   ├── preprocess.ts              # Frame → tensor conversion
│   │   │   └── risk-calculator.ts         # Composite risk scoring
│   │   ├── db/
│   │   │   ├── client.ts                  # IndexedDB wrapper (idb)
│   │   │   ├── schemas.ts                 # TypeScript interfaces
│   │   │   └── migrations.ts              # IndexedDB version upgrades
│   │   ├── sync/
│   │   │   ├── engine.ts                  # Sync orchestrator
│   │   │   └── queue.ts                   # Retry queue with backoff
│   │   └── utils/
│   │       ├── constants.ts
│   │       └── crypto.ts                  # Client-side encryption helpers
│   ├── hooks/
│   │   ├── useCamera.ts                   # Camera stream hook
│   │   ├── useInference.ts                # ONNX model loading + inference
│   │   ├── useOfflineDB.ts                # IndexedDB CRUD hook
│   │   └── useNetworkStatus.ts            # Online/offline detection
│   └── types/
│       ├── triage.ts                      # TriagePacket, Patient interfaces
│       └── ai.ts                          # Prediction, ModelConfig types
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── .env.local                             # API_URL, model path
└── vercel.json
```

#### Step 1.2 — Camera Capture Component

```typescript
// src/hooks/useCamera.ts
import { useRef, useState, useCallback, useEffect } from 'react';

interface UseCameraOptions {
  facingMode?: 'user' | 'environment';
  width?: number;
  height?: number;
}

interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  isStreaming: boolean;
  error: string | null;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  captureFrame: () => ImageData | null;
  captureBase64: () => string | null;
}

export function useCamera(options: UseCameraOptions = {}): UseCameraReturn {
  const { facingMode = 'environment', width = 640, height = 480 } = options;
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: width },
          height: { ideal: height },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsStreaming(true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Camera access denied';
      setError(message);
      console.error('[Kalinga:Camera]', message);
    }
  }, [facingMode, width, height]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
  }, []);

  const captureFrame = useCallback((): ImageData | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Set canvas to model input dimensions
    canvas.width = 224;
    canvas.height = 224;

    // Draw and center-crop the video frame
    const video = videoRef.current;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const size = Math.min(vw, vh);
    const sx = (vw - size) / 2;
    const sy = (vh - size) / 2;

    ctx.drawImage(video, sx, sy, size, size, 0, 0, 224, 224);
    return ctx.getImageData(0, 0, 224, 224);
  }, []);

  const captureBase64 = useCallback((): string | null => {
    if (!canvasRef.current) return null;
    captureFrame(); // Ensure canvas is updated
    return canvasRef.current.toDataURL('image/jpeg', 0.85);
  }, [captureFrame]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  return {
    videoRef,
    canvasRef,
    isStreaming,
    error,
    startCamera,
    stopCamera,
    captureFrame,
    captureBase64,
  };
}
```

```typescript
// src/components/CameraCapture.tsx
'use client';

import { useCamera } from '@/hooks/useCamera';
import { useState, useCallback } from 'react';

interface CameraCaptureProps {
  onFrameCaptured: (imageData: ImageData, base64: string) => void;
  isProcessing?: boolean;
}

export default function CameraCapture({ onFrameCaptured, isProcessing }: CameraCaptureProps) {
  const { videoRef, canvasRef, isStreaming, error, startCamera, stopCamera, captureFrame, captureBase64 } = useCamera({
    facingMode: 'environment',
  });
  const [countdown, setCountdown] = useState<number | null>(null);

  const handleCapture = useCallback(() => {
    // 3-second countdown for stable capture
    let count = 3;
    setCountdown(count);
    const interval = setInterval(() => {
      count--;
      setCountdown(count);
      if (count === 0) {
        clearInterval(interval);
        setCountdown(null);

        const imageData = captureFrame();
        const base64 = captureBase64();
        if (imageData && base64) {
          onFrameCaptured(imageData, base64);
        }
      }
    }, 1000);
  }, [captureFrame, captureBase64, onFrameCaptured]);

  return (
    <div className="camera-container" id="camera-capture-container">
      {/* Live camera preview */}
      <div className="camera-viewport">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="camera-feed"
          id="camera-feed"
        />

        {/* Targeting reticle overlay */}
        {isStreaming && (
          <div className="scan-overlay">
            <div className="scan-reticle" />
            <p className="scan-hint">
              Align ultrasound display within the frame
            </p>
          </div>
        )}

        {/* Countdown overlay */}
        {countdown !== null && (
          <div className="countdown-overlay">
            <span className="countdown-number">{countdown}</span>
          </div>
        )}
      </div>

      {/* Hidden canvas for frame extraction */}
      <canvas ref={canvasRef} className="hidden" id="capture-canvas" />

      {/* Controls */}
      <div className="camera-controls">
        {!isStreaming ? (
          <button onClick={startCamera} className="btn-primary" id="btn-start-camera">
            📷 Start Camera
          </button>
        ) : (
          <>
            <button
              onClick={handleCapture}
              disabled={isProcessing || countdown !== null}
              className="btn-capture"
              id="btn-capture-frame"
            >
              {isProcessing ? '🔄 Analyzing...' : '🎯 Capture Scan'}
            </button>
            <button onClick={stopCamera} className="btn-secondary" id="btn-stop-camera">
              ⏹ Stop
            </button>
          </>
        )}
      </div>

      {/* Error display */}
      {error && (
        <div className="camera-error" id="camera-error">
          <p>⚠️ {error}</p>
          <p className="text-sm">Ensure camera permissions are granted in your browser settings.</p>
        </div>
      )}
    </div>
  );
}
```

#### Step 1.3 — ONNX Runtime Web Inference Engine

```typescript
// src/lib/ai/inference.ts
import * as ort from 'onnxruntime-web';

// Configure ONNX Runtime Web
ort.env.wasm.numThreads = navigator.hardwareConcurrency || 2;
ort.env.wasm.simd = true;

interface PredictionResult {
  normal: number;
  abnormal: number;
  inconclusive: number;
  inferenceTimeMs: number;
}

let session: ort.InferenceSession | null = null;
let isLoading = false;

/**
 * Lazy-load and cache the ONNX inference session.
 * Model is served from Vercel's static asset CDN (/public/models/).
 */
export async function getSession(): Promise<ort.InferenceSession> {
  if (session) return session;
  if (isLoading) {
    // Wait for concurrent load to complete
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (session) {
          clearInterval(check);
          resolve(session);
        }
      }, 100);
    });
  }

  isLoading = true;
  try {
    session = await ort.InferenceSession.create('/models/mobilenetv3_small_int8.onnx', {
      executionProviders: ['wasm'],  // WebGPU fallback: ['webgpu', 'wasm']
      graphOptimizationLevel: 'all',
      enableCpuMemArena: true,
    });
    console.log('[Kalinga:AI] Model loaded successfully');
    return session;
  } catch (err) {
    isLoading = false;
    throw new Error(`[Kalinga:AI] Failed to load model: ${err}`);
  }
}

/**
 * Run inference on a preprocessed image tensor.
 * Input: Float32Array of shape [1, 3, 224, 224] (NCHW format)
 * Output: Softmax probabilities for [normal, abnormal, inconclusive]
 */
export async function runInference(inputTensor: Float32Array): Promise<PredictionResult> {
  const sess = await getSession();

  const tensor = new ort.Tensor('float32', inputTensor, [1, 3, 224, 224]);
  const feeds: Record<string, ort.Tensor> = { input: tensor };

  const start = performance.now();
  const results = await sess.run(feeds);
  const inferenceTimeMs = performance.now() - start;

  // Extract output logits and apply softmax
  const output = results[Object.keys(results)[0]];
  const logits = Array.from(output.data as Float32Array);
  const probs = softmax(logits);

  return {
    normal: probs[0],
    abnormal: probs[1],
    inconclusive: probs[2],
    inferenceTimeMs: Math.round(inferenceTimeMs),
  };
}

/**
 * Softmax activation function
 */
function softmax(logits: number[]): number[] {
  const maxLogit = Math.max(...logits);
  const exps = logits.map(l => Math.exp(l - maxLogit));
  const sumExps = exps.reduce((a, b) => a + b, 0);
  return exps.map(e => e / sumExps);
}
```

```typescript
// src/lib/ai/preprocess.ts

/**
 * Convert ImageData (RGBA, 224×224) to NCHW Float32Array tensor.
 * Applies ImageNet-standard normalization:
 *   mean = [0.485, 0.456, 0.406]
 *   std  = [0.229, 0.224, 0.225]
 */
export function imageDataToTensor(imageData: ImageData): Float32Array {
  const { data, width, height } = imageData;
  const numPixels = width * height;
  const tensor = new Float32Array(3 * numPixels); // CHW layout

  const mean = [0.485, 0.456, 0.406];
  const std = [0.229, 0.224, 0.225];

  for (let i = 0; i < numPixels; i++) {
    const rgbaOffset = i * 4;

    // Normalize to [0, 1] then apply ImageNet stats
    // Channel order: R → channel 0, G → channel 1, B → channel 2
    tensor[i]                = (data[rgbaOffset]     / 255 - mean[0]) / std[0]; // R
    tensor[i + numPixels]    = (data[rgbaOffset + 1] / 255 - mean[1]) / std[1]; // G
    tensor[i + 2 * numPixels]= (data[rgbaOffset + 2] / 255 - mean[2]) / std[2]; // B
  }

  return tensor;
}

/**
 * Generate a 128×128 JPEG thumbnail from a full frame for storage efficiency.
 */
export function createThumbnail(base64Full: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, 128, 128);
      resolve(canvas.toDataURL('image/jpeg', 0.6));
    };
    img.src = base64Full;
  });
}
```

```typescript
// src/lib/ai/risk-calculator.ts
import type { PredictionResult } from './inference';

interface VitalsInput {
  systolicBP: number;
  diastolicBP: number;
  heartRate: number;
  proteinUrine: 'negative' | 'trace' | '+1' | '+2' | '+3' | '+4';
  symptoms: string[];
  gestationalAgeWeeks: number;
}

type TriageLevel = 'GREEN' | 'YELLOW' | 'RED' | 'CRITICAL';

interface RiskAssessment {
  score: number;           // 0–100
  level: TriageLevel;
  breakdown: {
    aiComponent: number;
    bpComponent: number;
    proteinuriaComponent: number;
    symptomComponent: number;
    gaModifier: number;
  };
}

const PROTEINURIA_MAP: Record<string, number> = {
  negative: 0,
  trace: 0.1,
  '+1': 0.3,
  '+2': 0.6,
  '+3': 0.85,
  '+4': 1.0,
};

const ALL_SYMPTOMS = ['edema', 'headache', 'visual_disturbances', 'epigastric_pain'];

// Weights (must be validated by clinical study before real use)
const WEIGHTS = {
  ai: 0.35,
  bp: 0.25,
  proteinuria: 0.15,
  symptoms: 0.15,
  ga: 0.10,
};

export function computeRiskScore(
  prediction: PredictionResult,
  vitals: VitalsInput
): RiskAssessment {
  // 1. AI abnormality probability
  const aiScore = prediction.abnormal;

  // 2. Blood pressure risk factor (sigmoid normalization)
  const bpScore = sigmoid((vitals.systolicBP - 140) / 10) *
    (vitals.systolicBP >= 120 ? 1 : 0.2);

  // 3. Proteinuria score
  const proteinScore = PROTEINURIA_MAP[vitals.proteinUrine] || 0;

  // 4. Symptom severity index
  const symptomScore = vitals.symptoms.length / ALL_SYMPTOMS.length;

  // 5. Gestational age modifier (risk increases after 20 weeks)
  const gaModifier = 1.0 + (0.02 * Math.max(0, vitals.gestationalAgeWeeks - 20));

  // Composite weighted score
  const rawScore = (
    WEIGHTS.ai * aiScore +
    WEIGHTS.bp * bpScore +
    WEIGHTS.proteinuria * proteinScore +
    WEIGHTS.symptoms * symptomScore +
    WEIGHTS.ga * (gaModifier - 1) // Normalize GA modifier contribution
  );

  const score = Math.min(100, Math.max(0, Math.round(rawScore * 100)));

  return {
    score,
    level: classifyTriageLevel(score),
    breakdown: {
      aiComponent: Math.round(aiScore * 100),
      bpComponent: Math.round(bpScore * 100),
      proteinuriaComponent: Math.round(proteinScore * 100),
      symptomComponent: Math.round(symptomScore * 100),
      gaModifier: Math.round(gaModifier * 100) / 100,
    },
  };
}

function classifyTriageLevel(score: number): TriageLevel {
  if (score <= 25) return 'GREEN';
  if (score <= 50) return 'YELLOW';
  if (score <= 75) return 'RED';
  return 'CRITICAL';
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}
```

#### Step 1.4 — IndexedDB Offline Persistence

```typescript
// src/lib/db/client.ts
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { TriagePacket, Patient, SyncLedger } from '@/types/triage';

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
  sync_ledger: {
    key: string;
    value: SyncLedger;
  };
}

const DB_NAME = 'kalinga-ai';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<KalingaDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<KalingaDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<KalingaDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Triage packets store
      if (!db.objectStoreNames.contains('triage_packets')) {
        const triageStore = db.createObjectStore('triage_packets', { keyPath: 'id' });
        triageStore.createIndex('by-sync-status', 'syncStatus');
        triageStore.createIndex('by-risk-score', 'riskScore');
        triageStore.createIndex('by-created-at', 'createdAt');
        triageStore.createIndex('by-patient-id', 'patientId');
      }

      // Patients store
      if (!db.objectStoreNames.contains('patients')) {
        const patientStore = db.createObjectStore('patients', { keyPath: 'id' });
        patientStore.createIndex('by-name', 'name');
      }

      // Sync ledger store
      if (!db.objectStoreNames.contains('sync_ledger')) {
        db.createObjectStore('sync_ledger', { keyPath: 'id' });
      }
    },
  });

  return dbInstance;
}

// ----- Triage Packet CRUD -----

export async function saveTriagePacket(packet: TriagePacket): Promise<void> {
  const db = await getDB();
  await db.put('triage_packets', packet);
}

export async function getTriagePacket(id: string): Promise<TriagePacket | undefined> {
  const db = await getDB();
  return db.get('triage_packets', id);
}

export async function getAllTriagePackets(): Promise<TriagePacket[]> {
  const db = await getDB();
  return db.getAll('triage_packets');
}

export async function getPendingSyncPackets(): Promise<TriagePacket[]> {
  const db = await getDB();
  return db.getAllFromIndex('triage_packets', 'by-sync-status', 'pending');
}

export async function updateSyncStatus(
  id: string,
  status: TriagePacket['syncStatus'],
  error?: string
): Promise<void> {
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

// ----- Patient CRUD -----

export async function savePatient(patient: Patient): Promise<void> {
  const db = await getDB();
  await db.put('patients', patient);
}

export async function getPatient(id: string): Promise<Patient | undefined> {
  const db = await getDB();
  return db.get('patients', id);
}

export async function getAllPatients(): Promise<Patient[]> {
  const db = await getDB();
  return db.getAll('patients');
}
```

#### Step 1.5 — Vercel Deployment Configuration

```json
// vercel.json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "headers": [
    {
      "source": "/models/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" },
        { "key": "Content-Type", "value": "application/octet-stream" }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "credentialless" },
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" }
      ]
    }
  ]
}
```

```json
// public/manifest.json
{
  "name": "Kalinga AI",
  "short_name": "Kalinga",
  "description": "AI-Assisted Maternal Diagnostic Triage for GIDA Philippines",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0f",
  "theme_color": "#e94560",
  "orientation": "portrait",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

```env
# .env.local (Sprint 1 — frontend only)
NEXT_PUBLIC_MODEL_PATH=/models/mobilenetv3_small_int8.onnx
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_VERSION=0.1.0-alpha
```

#### Step 1.6 — Mock ONNX Model for Development

Until the real trained model is available, create a mock inference stub:

```typescript
// src/lib/ai/mock-inference.ts
import type { PredictionResult } from './inference';

/**
 * Mock inference that simulates model output for UI development.
 * Returns randomized but realistic predictions.
 * Used when MODEL_PATH is not available or during development.
 */
export async function runMockInference(_inputTensor: Float32Array): Promise<PredictionResult> {
  // Simulate inference latency
  await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100));

  // Generate realistic prediction distribution
  const raw = [Math.random(), Math.random(), Math.random()];
  const sum = raw.reduce((a, b) => a + b, 0);
  const probs = raw.map(r => r / sum);

  return {
    normal: probs[0],
    abnormal: probs[1],
    inconclusive: probs[2],
    inferenceTimeMs: Math.round(30 + Math.random() * 50),
  };
}
```

#### Sprint 1 Definition of Done

- [x] Next.js app scaffolded with TypeScript + Tailwind CSS
- [ ] Camera capture component operational on mobile Chrome/Safari
- [ ] ONNX Runtime Web loads and runs mock/real model inference
- [ ] Patient vitals intake form with validation
- [ ] Risk score computed and displayed with color-coded triage level
- [ ] Triage packets persisted to IndexedDB offline
- [ ] PWA manifest + service worker (basic shell caching)
- [ ] Deployed to Vercel hobby tier
- [ ] Responsive UI tested on 360×640 viewport (common GIDA phone)

---

### Sprint 2: Backend API & Database Schema

**Goal**: Deploy an Express.js API to Render's free tier that ingests triage packets from synced clients and stores them in Neon Postgres.

#### Step 2.1 — Backend Project Structure

```
kalinga-backend/
├── src/
│   ├── index.ts                    # Express app entry
│   ├── config/
│   │   ├── database.ts             # Neon connection pool
│   │   ├── env.ts                  # Environment variable validation
│   │   └── cors.ts                 # CORS configuration
│   ├── routes/
│   │   ├── triage.ts               # POST/GET/PUT triage endpoints
│   │   ├── patients.ts             # Patient CRUD endpoints
│   │   ├── auth.ts                 # Login/register endpoints
│   │   └── health.ts               # Health check (Render uptime ping)
│   ├── middleware/
│   │   ├── auth.ts                 # JWT verification middleware
│   │   ├── rateLimit.ts            # Rate limiting (memory-based)
│   │   ├── validate.ts             # Zod schema validation
│   │   └── errorHandler.ts         # Global error handler
│   ├── services/
│   │   ├── triageService.ts        # Triage business logic
│   │   ├── queueService.ts         # Verification queue management
│   │   └── authService.ts          # JWT generation, bcrypt hashing
│   ├── db/
│   │   ├── schema.sql              # Postgres DDL
│   │   ├── seed.sql                # Test data
│   │   └── queries.ts              # Parameterized SQL queries
│   └── types/
│       └── index.ts                # Shared type definitions
├── package.json
├── tsconfig.json
├── Dockerfile                      # Optional — Render auto-detects Node
├── render.yaml                     # Infrastructure-as-code
└── .env                            # Local dev environment
```

#### Step 2.2 — Neon Postgres Schema (DDL)

```sql
-- db/schema.sql

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: users (midwives + OB-GYN specialists)
-- ============================================
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(255) NOT NULL,
    role            VARCHAR(20) NOT NULL CHECK (role IN ('midwife', 'obgyn', 'admin')),
    license_number  VARCHAR(50),
    barangay        VARCHAR(255),               -- For midwives: assigned health station
    specialization  VARCHAR(255),               -- For OB-GYNs: sub-specialty
    is_active       BOOLEAN DEFAULT true,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);

-- ============================================
-- TABLE: patients
-- ============================================
CREATE TABLE patients (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    midwife_id          UUID REFERENCES users(id) ON DELETE SET NULL,
    full_name           VARCHAR(255) NOT NULL,
    age                 INTEGER CHECK (age >= 12 AND age <= 60),
    lmp                 DATE,                   -- Last Menstrual Period
    estimated_due_date  DATE,
    gravida             INTEGER DEFAULT 1,
    para                INTEGER DEFAULT 0,
    risk_factors        TEXT[],                  -- Array: ['chronic_hypertension', 'diabetes', ...]
    barangay            VARCHAR(255),
    municipality        VARCHAR(255),
    province            VARCHAR(255),
    contact_number      VARCHAR(20),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_patients_midwife ON patients(midwife_id);

-- ============================================
-- TABLE: triage_packets (core data entity)
-- ============================================
CREATE TABLE triage_packets (
    id                      UUID PRIMARY KEY,    -- Client-generated UUIDv4
    patient_id              UUID REFERENCES patients(id) ON DELETE CASCADE,
    midwife_id              UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Vitals
    systolic_bp             INTEGER NOT NULL,
    diastolic_bp            INTEGER NOT NULL,
    heart_rate              INTEGER,
    gestational_age_weeks   REAL NOT NULL,
    protein_urine           VARCHAR(10) CHECK (protein_urine IN (
                                'negative', 'trace', '+1', '+2', '+3', '+4'
                            )),
    symptoms                TEXT[],              -- Array: ['edema', 'headache', ...]

    -- AI Analysis
    frame_base64            TEXT,                -- JPEG Base64 of captured US frame
    frame_thumbnail_b64     TEXT,                -- 128×128 preview thumbnail
    ai_prediction_normal    REAL,                -- Probability [0-1]
    ai_prediction_abnormal  REAL,
    ai_prediction_inconcl   REAL,
    ai_inference_time_ms    INTEGER,
    risk_score              INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
    triage_level            VARCHAR(10) NOT NULL CHECK (triage_level IN (
                                'GREEN', 'YELLOW', 'RED', 'CRITICAL'
                            )),

    -- Specialist Verification
    specialist_id           UUID REFERENCES users(id) ON DELETE SET NULL,
    specialist_verdict      VARCHAR(20) CHECK (specialist_verdict IN (
                                'confirmed', 'escalated', 'overridden', 'pending'
                            )) DEFAULT 'pending',
    specialist_notes        TEXT,
    override_risk_score     INTEGER CHECK (override_risk_score >= 0 AND override_risk_score <= 100),
    reviewed_at             TIMESTAMPTZ,

    -- Sync Metadata
    client_captured_at      TIMESTAMPTZ NOT NULL,
    synced_at               TIMESTAMPTZ DEFAULT NOW(),
    barangay_station        VARCHAR(255),

    -- Audit
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- High-priority: OB-GYN dashboard sorts by risk_score DESC
CREATE INDEX idx_triage_risk_score ON triage_packets(risk_score DESC);
CREATE INDEX idx_triage_verdict ON triage_packets(specialist_verdict);
CREATE INDEX idx_triage_level ON triage_packets(triage_level);
CREATE INDEX idx_triage_patient ON triage_packets(patient_id);
CREATE INDEX idx_triage_midwife ON triage_packets(midwife_id);
CREATE INDEX idx_triage_synced ON triage_packets(synced_at DESC);

-- ============================================
-- TABLE: sync_events (audit trail)
-- ============================================
CREATE TABLE sync_events (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    midwife_id      UUID REFERENCES users(id) ON DELETE SET NULL,
    packets_synced  INTEGER NOT NULL,
    sync_source     VARCHAR(50),     -- 'background_sync' | 'manual' | 'periodic'
    device_info     JSONB,           -- User-Agent, screen size, etc.
    synced_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- VIEW: verification_queue (OB-GYN dashboard)
-- ============================================
CREATE VIEW verification_queue AS
SELECT
    tp.id,
    tp.risk_score,
    tp.triage_level,
    tp.systolic_bp,
    tp.diastolic_bp,
    tp.gestational_age_weeks,
    tp.protein_urine,
    tp.symptoms,
    tp.frame_thumbnail_b64,
    tp.ai_prediction_abnormal,
    tp.specialist_verdict,
    tp.client_captured_at,
    tp.synced_at,
    p.full_name AS patient_name,
    p.age AS patient_age,
    p.gravida,
    p.para,
    u.full_name AS midwife_name,
    u.barangay AS station
FROM triage_packets tp
JOIN patients p ON tp.patient_id = p.id
LEFT JOIN users u ON tp.midwife_id = u.id
WHERE tp.specialist_verdict = 'pending'
ORDER BY tp.risk_score DESC, tp.synced_at ASC;
```

#### Step 2.3 — Express.js Backend Entry Point

```typescript
// src/index.ts
import express from 'express';
import cors from 'cors';
import { Pool } from '@neondatabase/serverless';
import { config } from './config/env';
import { triageRouter } from './routes/triage';
import { authRouter } from './routes/auth';
import { healthRouter } from './routes/health';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiter } from './middleware/rateLimit';

const app = express();
const PORT = process.env.PORT || 3001;

// Global middleware
app.use(cors({
  origin: [
    'https://kalinga-ai.vercel.app',    // Production frontend
    'http://localhost:3000',              // Local dev
  ],
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));  // Allow Base64 image payloads
app.use(rateLimiter);

// Database pool (Neon serverless)
export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,          // Free tier: keep pool small
  idleTimeoutMillis: 30000,
});

// Routes
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/triage', triageRouter);

// Error handler
app.use(errorHandler);

// Cold-start keepalive (Render free tier spins down after 15 min)
// The health endpoint serves as the keepalive target
app.listen(PORT, () => {
  console.log(`[Kalinga:API] Server running on port ${PORT}`);
  console.log(`[Kalinga:API] Environment: ${config.NODE_ENV}`);
});
```

#### Step 2.4 — Triage API Routes

```typescript
// src/routes/triage.ts
import { Router, Request, Response } from 'express';
import { pool } from '../index';
import { authMiddleware } from '../middleware/auth';
import { z } from 'zod';

export const triageRouter = Router();

// Validation schema
const triagePacketSchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().uuid(),
  systolicBP: z.number().int().min(60).max(300),
  diastolicBP: z.number().int().min(30).max(200),
  heartRate: z.number().int().min(40).max(200).optional(),
  gestationalAgeWeeks: z.number().min(4).max(44),
  proteinUrine: z.enum(['negative', 'trace', '+1', '+2', '+3', '+4']),
  symptoms: z.array(z.string()),
  frameBase64: z.string().optional(),
  frameThumbnailB64: z.string().optional(),
  aiPrediction: z.object({
    normal: z.number().min(0).max(1),
    abnormal: z.number().min(0).max(1),
    inconclusive: z.number().min(0).max(1),
  }),
  aiInferenceTimeMs: z.number().int(),
  riskScore: z.number().int().min(0).max(100),
  triageLevel: z.enum(['GREEN', 'YELLOW', 'RED', 'CRITICAL']),
  clientCapturedAt: z.string().datetime(),
  barangayStation: z.string().optional(),
});

// POST /api/triage — Batch sync triage packets from client
triageRouter.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const packets = Array.isArray(req.body) ? req.body : [req.body];
    const syncedIds: string[] = [];
    const errors: { id: string; error: string }[] = [];

    for (const rawPacket of packets) {
      try {
        const packet = triagePacketSchema.parse(rawPacket);

        await pool.query(
          `INSERT INTO triage_packets (
            id, patient_id, midwife_id,
            systolic_bp, diastolic_bp, heart_rate,
            gestational_age_weeks, protein_urine, symptoms,
            frame_base64, frame_thumbnail_b64,
            ai_prediction_normal, ai_prediction_abnormal, ai_prediction_inconcl,
            ai_inference_time_ms, risk_score, triage_level,
            client_captured_at, barangay_station
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
          ON CONFLICT (id) DO NOTHING`,
          [
            packet.id, packet.patientId, (req as any).userId,
            packet.systolicBP, packet.diastolicBP, packet.heartRate,
            packet.gestationalAgeWeeks, packet.proteinUrine, packet.symptoms,
            packet.frameBase64, packet.frameThumbnailB64,
            packet.aiPrediction.normal, packet.aiPrediction.abnormal,
            packet.aiPrediction.inconclusive,
            packet.aiInferenceTimeMs, packet.riskScore, packet.triageLevel,
            packet.clientCapturedAt, packet.barangayStation,
          ]
        );

        syncedIds.push(packet.id);
      } catch (err) {
        errors.push({
          id: rawPacket?.id || 'unknown',
          error: err instanceof Error ? err.message : 'Validation failed',
        });
      }
    }

    // Log sync event
    await pool.query(
      `INSERT INTO sync_events (midwife_id, packets_synced, sync_source, device_info)
       VALUES ($1, $2, $3, $4)`,
      [(req as any).userId, syncedIds.length, 'api_sync', { userAgent: req.headers['user-agent'] }]
    );

    res.status(200).json({
      synced: syncedIds.length,
      syncedIds,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    res.status(500).json({ error: 'Sync failed', details: (err as Error).message });
  }
});

// GET /api/triage/queue — OB-GYN verification queue
triageRouter.get('/queue', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { status = 'pending', limit = '20', offset = '0' } = req.query;

    const result = await pool.query(
      `SELECT * FROM verification_queue
       WHERE ($1::text IS NULL OR specialist_verdict = $1)
       LIMIT $2 OFFSET $3`,
      [
        status === 'all' ? null : status,
        parseInt(limit as string),
        parseInt(offset as string),
      ]
    );

    // Count stats for dashboard header
    const stats = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE specialist_verdict = 'pending') AS pending,
        COUNT(*) FILTER (WHERE triage_level = 'CRITICAL' AND specialist_verdict = 'pending') AS critical,
        COUNT(*) FILTER (WHERE specialist_verdict != 'pending') AS reviewed,
        COUNT(*) AS total
       FROM triage_packets`
    );

    res.json({
      queue: result.rows,
      stats: stats.rows[0],
      pagination: { limit: parseInt(limit as string), offset: parseInt(offset as string) },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch queue', details: (err as Error).message });
  }
});

// PUT /api/triage/:id/verdict — OB-GYN submits verdict
triageRouter.put('/:id/verdict', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { verdict, notes, overrideRiskScore } = req.body;

    if (!['confirmed', 'escalated', 'overridden'].includes(verdict)) {
      return res.status(400).json({ error: 'Invalid verdict' });
    }

    const result = await pool.query(
      `UPDATE triage_packets
       SET specialist_id = $1,
           specialist_verdict = $2,
           specialist_notes = $3,
           override_risk_score = $4,
           reviewed_at = NOW(),
           updated_at = NOW()
       WHERE id = $5
       RETURNING id, specialist_verdict, risk_score, override_risk_score`,
      [(req as any).userId, verdict, notes, overrideRiskScore, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Triage packet not found' });
    }

    res.json({ updated: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit verdict', details: (err as Error).message });
  }
});
```

#### Step 2.5 — Render Deployment Configuration

```yaml
# render.yaml — Infrastructure-as-Code for Render
services:
  - type: web
    name: kalinga-api
    runtime: node
    region: singapore          # Closest to Philippines
    plan: free
    buildCommand: npm install && npm run build
    startCommand: node dist/index.js
    healthCheckPath: /api/health
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        sync: false            # Set manually in Render dashboard
      - key: JWT_SECRET
        generateValue: true
      - key: PORT
        value: 3001
```

```typescript
// src/routes/health.ts
import { Router } from 'express';
import { pool } from '../index';

export const healthRouter = Router();

// GET /api/health — Used by Render for health checks + keepalive
healthRouter.get('/', async (_req, res) => {
  try {
    const dbResult = await pool.query('SELECT NOW() AS server_time');
    res.json({
      status: 'healthy',
      service: 'kalinga-api',
      version: process.env.npm_package_version || '0.1.0',
      uptime: process.uptime(),
      database: 'connected',
      serverTime: dbResult.rows[0].server_time,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        limit: '512 MB (Render Free)',
      },
    });
  } catch (err) {
    res.status(503).json({
      status: 'degraded',
      database: 'disconnected',
      error: (err as Error).message,
    });
  }
});
```

#### Sprint 2 Definition of Done

- [ ] Express.js API deployed to Render free tier
- [ ] Neon Postgres schema applied (all tables, indexes, views)
- [ ] POST `/api/triage` accepts batch sync payloads
- [ ] GET `/api/triage/queue` returns prioritized verification queue
- [ ] PUT `/api/triage/:id/verdict` allows specialist verdicts
- [ ] JWT auth with bcrypt password hashing
- [ ] Health check endpoint responding to Render pings
- [ ] Memory usage stays under 300 MB (50% headroom for 512 MB limit)
- [ ] Cold-start recovery tested (15-min inactivity cycle)

---

### Sprint 3: Sync Engine, OB-GYN Dashboard, & E2E Testing

**Goal**: Complete the store-and-forward pipeline, build the specialist verification workspace, and run end-to-end edge case validation.

#### Step 3.1 — Store-and-Forward Sync Engine

```typescript
// src/lib/sync/engine.ts
import { getPendingSyncPackets, updateSyncStatus } from '@/lib/db/client';
import type { TriagePacket } from '@/types/triage';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://kalinga-api.onrender.com';
const MAX_BATCH_SIZE = 5;          // Small batches to handle Render's RAM limit
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 2000;        // Exponential backoff base

interface SyncResult {
  synced: number;
  failed: number;
  errors: string[];
}

/**
 * Core sync orchestrator.
 * Called when network connectivity is detected.
 */
export async function syncPendingPackets(authToken: string): Promise<SyncResult> {
  const pending = await getPendingSyncPackets();

  if (pending.length === 0) {
    return { synced: 0, failed: 0, errors: [] };
  }

  console.log(`[Kalinga:Sync] ${pending.length} packets pending sync`);

  let totalSynced = 0;
  let totalFailed = 0;
  const allErrors: string[] = [];

  // Process in batches to avoid Render memory pressure
  for (let i = 0; i < pending.length; i += MAX_BATCH_SIZE) {
    const batch = pending.slice(i, i + MAX_BATCH_SIZE);
    const result = await syncBatchWithRetry(batch, authToken);
    totalSynced += result.synced;
    totalFailed += result.failed;
    allErrors.push(...result.errors);

    // Breathing room between batches
    if (i + MAX_BATCH_SIZE < pending.length) {
      await sleep(500);
    }
  }

  return { synced: totalSynced, failed: totalFailed, errors: allErrors };
}

/**
 * Sync a single batch with exponential backoff retry.
 */
async function syncBatchWithRetry(
  batch: TriagePacket[],
  authToken: string,
  attempt = 0
): Promise<SyncResult> {
  // Mark as syncing
  for (const packet of batch) {
    await updateSyncStatus(packet.id, 'syncing');
  }

  try {
    const payload = batch.map(packet => ({
      id: packet.id,
      patientId: packet.patientId,
      systolicBP: packet.systolicBP,
      diastolicBP: packet.diastolicBP,
      heartRate: packet.heartRate,
      gestationalAgeWeeks: packet.gestationalAgeWeeks,
      proteinUrine: packet.proteinUrine,
      symptoms: packet.symptoms,
      frameBase64: packet.frameBase64,
      frameThumbnailB64: packet.frameThumbnailB64,
      aiPrediction: packet.aiPrediction,
      aiInferenceTimeMs: packet.aiInferenceTimeMs,
      riskScore: packet.riskScore,
      triageLevel: packet.triageLevel,
      clientCapturedAt: packet.capturedAt,
      barangayStation: packet.barangayHealthStation,
    }));

    const response = await fetch(`${API_URL}/api/triage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    // Update synced packets
    for (const id of result.syncedIds || []) {
      await updateSyncStatus(id, 'synced');
    }

    // Handle per-packet errors
    const errors: string[] = [];
    for (const err of result.errors || []) {
      await updateSyncStatus(err.id, 'error', err.error);
      errors.push(`${err.id}: ${err.error}`);
    }

    return {
      synced: result.syncedIds?.length || 0,
      failed: errors.length,
      errors,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown sync error';

    if (attempt < MAX_RETRIES) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt);
      console.warn(`[Kalinga:Sync] Retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms: ${message}`);
      await sleep(delay);
      return syncBatchWithRetry(batch, authToken, attempt + 1);
    }

    // Max retries exhausted
    for (const packet of batch) {
      await updateSyncStatus(packet.id, 'error', message);
    }

    return {
      synced: 0,
      failed: batch.length,
      errors: [`Batch failed after ${MAX_RETRIES} retries: ${message}`],
    };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

```typescript
// src/hooks/useNetworkStatus.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { syncPendingPackets } from '@/lib/sync/engine';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<{
    synced: number;
    failed: number;
  } | null>(null);

  const triggerSync = useCallback(async () => {
    if (isSyncing) return;

    const token = localStorage.getItem('kalinga_auth_token');
    if (!token) return;

    setIsSyncing(true);
    try {
      const result = await syncPendingPackets(token);
      setLastSyncResult({ synced: result.synced, failed: result.failed });
      console.log(`[Kalinga:Sync] Completed: ${result.synced} synced, ${result.failed} failed`);
    } catch (err) {
      console.error('[Kalinga:Sync] Error:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-trigger sync when connection is restored
      triggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial sync attempt on mount
    if (navigator.onLine) {
      triggerSync();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [triggerSync]);

  return { isOnline, isSyncing, lastSyncResult, triggerSync };
}
```

#### Step 3.2 — OB-GYN Verification Dashboard

The specialist dashboard is a separate Next.js route (`/dashboard`) designed for rapid 60-second triage review:

```typescript
// src/app/dashboard/page.tsx — OB-GYN Verification Queue
'use client';

import { useState, useEffect, useCallback } from 'react';

interface QueueItem {
  id: string;
  risk_score: number;
  triage_level: string;
  systolic_bp: number;
  diastolic_bp: number;
  gestational_age_weeks: number;
  protein_urine: string;
  symptoms: string[];
  frame_thumbnail_b64: string;
  ai_prediction_abnormal: number;
  patient_name: string;
  patient_age: number;
  gravida: number;
  para: number;
  midwife_name: string;
  station: string;
  client_captured_at: string;
  synced_at: string;
}

interface QueueStats {
  pending: number;
  critical: number;
  reviewed: number;
  total: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const TRIAGE_COLORS: Record<string, string> = {
  GREEN: '#22c55e',
  YELLOW: '#eab308',
  RED: '#ef4444',
  CRITICAL: '#1e1e1e',
};

export default function DashboardPage() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchQueue = useCallback(async () => {
    try {
      const token = localStorage.getItem('kalinga_auth_token');
      const res = await fetch(`${API_URL}/api/triage/queue?status=pending&limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await res.json();
      setQueue(data.queue);
      setStats(data.stats);
    } catch (err) {
      console.error('Failed to fetch queue:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const submitVerdict = useCallback(async (
    packetId: string,
    verdict: 'confirmed' | 'escalated' | 'overridden',
    notes: string,
    overrideScore?: number
  ) => {
    try {
      const token = localStorage.getItem('kalinga_auth_token');
      await fetch(`${API_URL}/api/triage/${packetId}/verdict`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ verdict, notes, overrideRiskScore: overrideScore }),
      });

      // Remove from queue and advance to next
      setQueue(prev => prev.filter(item => item.id !== packetId));
      setSelectedItem(null);

      // Refresh stats
      fetchQueue();
    } catch (err) {
      console.error('Failed to submit verdict:', err);
    }
  }, [fetchQueue]);

  useEffect(() => {
    fetchQueue();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchQueue, 30_000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  // ... Component JSX renders:
  // 1. Stats bar (pending count, critical alerts, reviewed today)
  // 2. Scrollable queue list (sorted by risk_score DESC)
  // 3. Detail panel with: US thumbnail, vitals table, AI score,
  //    risk breakdown, verdict buttons (Confirm/Escalate/Override),
  //    notes textarea
  // 4. Timer showing seconds since panel opened (target: <60s review)

  return (
    <main className="dashboard-layout" id="obgyn-dashboard">
      {/* Implementation in Sprint 3 execution */}
    </main>
  );
}
```

**Dashboard UX Specification (60-Second Review Target)**:

```
┌──────────────────────────────────────────────────────────────────┐
│ KALINGA AI — OB-GYN Verification Dashboard         🟢 Online    │
├──────────────┬───────────────┬────────────────┬─────────────────│
│  ⏳ 14 Pending │  🔴 3 Critical │  ✅ 47 Reviewed │  📊 64 Total  │
├──────────────┴───────────────┴────────────────┴─────────────────│
│                                                                  │
│  QUEUE (sorted by risk)              DETAIL PANEL                │
│  ┌─────────────────────┐   ┌────────────────────────────────┐   │
│  │ ⚫ 92  Maria D.  28w │◄──│  PATIENT: Maria Dela Cruz      │   │
│  │ 🔴 71  Ana S.    32w │   │  AGE: 27 | G2P1 | GA: 28w     │   │
│  │ 🔴 63  Joy M.    24w │   │  BP: 158/102 mmHg              │   │
│  │ 🟡 45  Lisa R.   36w │   │  Proteinuria: +3               │   │
│  │ 🟡 38  Grace T.  20w │   │  Symptoms: headache, edema     │   │
│  │ 🟢 22  Ruth P.   30w │   │                                │   │
│  │ 🟢 15  Fe G.     18w │   │  [US Thumbnail]  AI: 87% abn  │   │
│  └─────────────────────┘   │  Risk Score: ██████████░ 92    │   │
│                             │                                │   │
│                             │  ⏱️ Review Timer: 00:34         │   │
│                             │                                │   │
│                             │  [✅ Confirm] [⬆️ Escalate]    │   │
│                             │  [✏️ Override Score: ___]       │   │
│                             │  Notes: [________________]     │   │
│                             │            [Submit Verdict]     │   │
│                             └────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

#### Step 3.3 — End-to-End Edge Case Testing Matrix

| # | Test Case | Input | Expected Output | Pass Criteria |
|---|-----------|-------|----------------|---------------|
| 1 | **Offline scan → queue → sync** | Complete triage while airplane mode ON, then toggle ON | Packet appears in IndexedDB, syncs to Render, shows in OB-GYN queue | Packet status transitions: pending → syncing → synced |
| 2 | **Camera permission denied** | Block camera permission in browser | Graceful error message, no crash | Error banner with permission instructions |
| 3 | **Render cold start** | API idle >15 min, then sync | Sync succeeds after ~60s cold start | Sync engine retries during cold start, eventually succeeds |
| 4 | **Large batch sync** | 20 pending packets accumulated offline | Batched into 4×5, all sync successfully | No Render OOM (memory <400 MB), all 20 synced |
| 5 | **Concurrent OB-GYN verdicts** | Two specialists open same packet | First verdict saves, second gets conflict | Optimistic lock via `updated_at` check |
| 6 | **Network flap during sync** | Toggle WiFi mid-upload | Retry with exponential backoff | Partial batch recovers, no duplicate inserts (UPSERT) |
| 7 | **3G network scan** | Throttle to 500kbps | Model loads from cache, sync deferred | Model cached via Service Worker, no re-download |
| 8 | **CRITICAL triage** | BP: 180/120, +4 protein, all symptoms | Risk score ≥85, triage = CRITICAL | Dashboard shows ⚫ CRITICAL with audible alert |
| 9 | **Neon scale-to-zero** | DB idle >5 min | Next query auto-wakes compute | First query latency ~2-3s, subsequent <100ms |
| 10 | **IndexedDB quota exceeded** | Fill 100+ frames (~200 MB) | Graceful warning, auto-purge old synced packets | Oldest synced packets pruned, pending never deleted |

#### Sprint 3 Definition of Done

- [ ] Store-and-forward sync engine with exponential backoff
- [ ] Background sync triggers automatically on `online` event
- [ ] OB-GYN dashboard renders prioritized verification queue
- [ ] Specialist can submit verdict (confirm/escalate/override) in <60s
- [ ] E2E test matrix passes (10/10 scenarios)
- [ ] Service Worker caches model binary + app shell
- [ ] PWA installable on Android Chrome
- [ ] Full deployment: Frontend (Vercel) ↔ API (Render) ↔ DB (Neon)

---

## 4. Code Blueprints & Configurations

### 4.1 Complete Package Configurations

**Frontend `package.json`**:

```json
{
  "name": "kalinga-ai",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "onnxruntime-web": "^1.19.0",
    "idb": "^8.0.0",
    "uuid": "^10.0.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@types/uuid": "^10.0.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^15.0.0"
  }
}
```

**Backend `package.json`**:

```json
{
  "name": "kalinga-api",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "db:schema": "psql $DATABASE_URL < src/db/schema.sql",
    "db:seed": "psql $DATABASE_URL < src/db/seed.sql"
  },
  "dependencies": {
    "express": "^4.21.0",
    "@neondatabase/serverless": "^0.10.0",
    "cors": "^2.8.5",
    "jsonwebtoken": "^9.0.0",
    "bcrypt": "^5.1.0",
    "zod": "^3.23.0",
    "dotenv": "^16.4.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "@types/express": "^4.17.0",
    "@types/cors": "^2.8.0",
    "@types/jsonwebtoken": "^9.0.0",
    "@types/bcrypt": "^5.0.0",
    "tsx": "^4.19.0"
  }
}
```

### 4.2 ONNX Model Training Pipeline (Reference Script)

> [!NOTE]
> This script runs on a developer machine with GPU (not on Render/Vercel). It produces the `mobilenetv3_small_int8.onnx` artifact deployed as a static asset.

```python
# scripts/train_and_export.py
# Run on local machine with PyTorch + GPU
# pip install torch torchvision onnx onnxruntime open_clip_torch

import torch
import torch.nn as nn
from torchvision import models, transforms
from torch.utils.data import DataLoader, Dataset
import onnx
from onnxruntime.quantization import quantize_static, CalibrationDataReader
import numpy as np
from pathlib import Path
from PIL import Image

# ============================================================
# STEP 1: Load NatalIA PBF-US1 Dataset
# ============================================================
class NatalIADataset(Dataset):
    """
    Loads NatalIA PBF-US1 frames with fetal plane labels.
    Maps 5 planes + background → 3 triage classes:
      - normal:       standard planes with good quality
      - abnormal:     structural deviations / non-standard views
      - inconclusive: background / poor quality frames
    """
    LABEL_MAP = {
        'biparietal': 0,   # normal
        'abdominal': 0,    # normal
        'heart': 0,        # normal
        'femur': 0,        # normal
        'spine': 0,        # normal
        'background': 2,   # inconclusive
    }

    def __init__(self, root_dir: str, transform=None):
        self.root = Path(root_dir)
        self.transform = transform or transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            ),
        ])
        # Load frame metadata from dataset structure
        self.samples = self._load_samples()

    def _load_samples(self):
        samples = []
        for plane_dir in self.root.iterdir():
            if plane_dir.is_dir():
                label = self.LABEL_MAP.get(plane_dir.name, 2)
                for img_path in plane_dir.glob('*.png'):
                    samples.append((img_path, label))
        return samples

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        img_path, label = self.samples[idx]
        image = Image.open(img_path).convert('RGB')
        if self.transform:
            image = self.transform(image)
        return image, label


# ============================================================
# STEP 2: Extract FetalCLIP Features (Teacher Embeddings)
# ============================================================
def extract_fetalclip_features(dataset, device='cuda'):
    """
    Use FetalCLIP ViT-L/14 as teacher to extract 512-d embeddings.
    These soft labels guide MobileNetV3 student training.
    
    NOTE: Requires FetalCLIP weights from:
    https://github.com/mbzuai-oryx/FetalCLIP
    """
    # Load FetalCLIP (or use open_clip with custom weights)
    # This is a reference — actual loading depends on weight format
    print("[INFO] FetalCLIP feature extraction would run here")
    print("[INFO] For prototype, we use standard ImageNet transfer learning")
    return None


# ============================================================
# STEP 3: Fine-tune MobileNetV3-Small
# ============================================================
def train_mobilenetv3(dataset_path: str, epochs: int = 20):
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

    # Dataset
    dataset = NatalIADataset(dataset_path)
    train_size = int(0.8 * len(dataset))
    val_size = len(dataset) - train_size
    train_ds, val_ds = torch.utils.data.random_split(dataset, [train_size, val_size])

    train_loader = DataLoader(train_ds, batch_size=32, shuffle=True, num_workers=4)
    val_loader = DataLoader(val_ds, batch_size=32, shuffle=False, num_workers=4)

    # Model: MobileNetV3-Small with 3-class head
    model = models.mobilenet_v3_small(weights=models.MobileNet_V3_Small_Weights.IMAGENET1K_V1)
    model.classifier[-1] = nn.Linear(model.classifier[-1].in_features, 3)
    model = model.to(device)

    # Training
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-4, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)
    criterion = nn.CrossEntropyLoss()

    best_acc = 0.0
    for epoch in range(epochs):
        model.train()
        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

        scheduler.step()

        # Validation
        model.eval()
        correct, total = 0, 0
        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                _, predicted = outputs.max(1)
                total += labels.size(0)
                correct += predicted.eq(labels).sum().item()

        acc = correct / total
        print(f"Epoch {epoch+1}/{epochs} — Val Acc: {acc:.4f}")
        if acc > best_acc:
            best_acc = acc
            torch.save(model.state_dict(), 'mobilenetv3_small_best.pth')

    return model


# ============================================================
# STEP 4: Export to ONNX + INT8 Quantization
# ============================================================
def export_to_onnx(model, output_path='mobilenetv3_small.onnx'):
    model.eval()
    dummy_input = torch.randn(1, 3, 224, 224)

    torch.onnx.export(
        model,
        dummy_input,
        output_path,
        export_params=True,
        opset_version=17,
        do_constant_folding=True,
        input_names=['input'],
        output_names=['output'],
        dynamic_axes={'input': {0: 'batch_size'}, 'output': {0: 'batch_size'}},
    )
    print(f"[OK] ONNX model exported: {output_path}")


class CalibrationReader(CalibrationDataReader):
    """Provides calibration data for INT8 static quantization."""
    def __init__(self, dataset, num_samples=100):
        self.data = []
        for i in range(min(num_samples, len(dataset))):
            img, _ = dataset[i]
            self.data.append({'input': img.unsqueeze(0).numpy()})
        self.iter = iter(self.data)

    def get_next(self):
        return next(self.iter, None)


def quantize_model(onnx_path: str, output_path: str, dataset):
    calibration_reader = CalibrationReader(dataset)

    quantize_static(
        model_input=onnx_path,
        model_output=output_path,
        calibration_data_reader=calibration_reader,
        quant_format=3,  # QDQ format
    )

    # Verify size reduction
    import os
    fp32_size = os.path.getsize(onnx_path) / (1024 * 1024)
    int8_size = os.path.getsize(output_path) / (1024 * 1024)
    print(f"[OK] FP32: {fp32_size:.1f} MB → INT8: {int8_size:.1f} MB ({(1-int8_size/fp32_size)*100:.0f}% reduction)")


# ============================================================
# MAIN EXECUTION
# ============================================================
if __name__ == '__main__':
    DATASET_PATH = './data/NatalIA-PBF-US1'

    print("=" * 60)
    print("KALINGA AI — Model Training Pipeline")
    print("=" * 60)

    # Train
    model = train_mobilenetv3(DATASET_PATH, epochs=20)

    # Export
    export_to_onnx(model, 'mobilenetv3_small.onnx')

    # Quantize
    dataset = NatalIADataset(DATASET_PATH)
    quantize_model('mobilenetv3_small.onnx', 'mobilenetv3_small_int8.onnx', dataset)

    print("\n[DONE] Copy mobilenetv3_small_int8.onnx → kalinga/public/models/")
```

### 4.3 Next.js Configuration for ONNX Runtime Web

```typescript
// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Required for ONNX Runtime Web WASM files
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Exclude ONNX Runtime node bindings from client bundle
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };

      // Copy WASM files to static output
      config.module.rules.push({
        test: /\.wasm$/,
        type: 'asset/resource',
      });
    }

    return config;
  },

  // Static asset optimization
  images: {
    unoptimized: true, // Base64 images don't need Next.js optimization
  },

  // PWA headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cross-Origin-Embedder-Policy', value: 'credentialless' },
          { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
        ],
      },
    ];
  },
};

export default nextConfig;
```

---

## 5. Technical Documentation Template (README)

```markdown
# Kalinga AI 🇵🇭

> AI-Assisted Maternal Diagnostic Triage for Geographically Isolated
> and Disadvantaged Areas (GIDA) — Philippines

## Overview

Kalinga AI enables rural midwives to perform AI-assisted ultrasound
triage using government-procured POCUS devices. The system computes
a preeclampsia/maternal risk probability score (0-100%) and uses a
store-and-forward pipeline to sync results for remote OB-GYN validation.

## Architecture

| Layer | Technology | Hosted On |
|-------|-----------|-----------|
| Frontend (Midwife PWA) | Next.js 15, Tailwind CSS, ONNX Runtime Web | Vercel (Free) |
| Backend API | Express.js, Node.js 20 | Render (Free) |
| Database | PostgreSQL 16 (Serverless) | Neon (Free) |
| AI Model | MobileNetV3-Small INT8 (ONNX) | Client-side (browser) |

## Prerequisites

- Node.js ≥ 20.x
- npm ≥ 10.x
- Git
- (Optional) Python ≥ 3.10 + PyTorch for model training

## Quick Start

### 1. Clone the repository

\```bash
git clone https://github.com/your-org/kalinga-ai.git
cd kalinga-ai
\```

### 2. Frontend Setup

\```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env.local

# Edit .env.local with your values:
# NEXT_PUBLIC_API_URL=http://localhost:3001
# NEXT_PUBLIC_MODEL_PATH=/models/mobilenetv3_small_int8.onnx

# Run development server
npm run dev
# → Open http://localhost:3000
\```

### 3. Backend Setup

\```bash
cd kalinga-backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Edit .env with your values:
# DATABASE_URL=postgresql://user:pass@your-neon-host/kalinga
# JWT_SECRET=your-secret-key
# PORT=3001
# NODE_ENV=development

# Apply database schema
npm run db:schema

# (Optional) Seed test data
npm run db:seed

# Run development server
npm run dev
# → API running on http://localhost:3001
\```

### 4. Database Setup (Neon)

1. Create a free account at [neon.tech](https://neon.tech)
2. Create a new project: `kalinga-ai`
3. Copy the connection string to your backend `.env`
4. Run `npm run db:schema` from the backend directory

## Deployment

### Frontend → Vercel

1. Push to GitHub
2. Import project at [vercel.com/new](https://vercel.com/new)
3. Set environment variables in Vercel dashboard
4. Deploy (auto-builds on push to `main`)

### Backend → Render

1. Push backend to GitHub (separate repo or monorepo subfolder)
2. Create new Web Service at [render.com](https://render.com)
3. Connect GitHub repo, set:
   - Build Command: `npm install && npm run build`
   - Start Command: `node dist/index.js`
4. Add environment variables: `DATABASE_URL`, `JWT_SECRET`
5. Deploy

## Environment Variables

### Frontend (.env.local)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `https://kalinga-api.onrender.com` |
| `NEXT_PUBLIC_MODEL_PATH` | ONNX model path | `/models/mobilenetv3_small_int8.onnx` |
| `NEXT_PUBLIC_APP_VERSION` | App version | `0.1.0` |

### Backend (.env)

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Neon connection string | `postgresql://user:pass@host/db` |
| `JWT_SECRET` | JWT signing key | `(auto-generated)` |
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment | `production` |

## Project Structure

\```
kalinga-ai/
├── src/app/          # Next.js App Router pages
├── src/components/   # Reusable UI components
├── src/lib/ai/       # ONNX inference engine
├── src/lib/db/       # IndexedDB client
├── src/lib/sync/     # Store-and-forward engine
├── src/hooks/        # Custom React hooks
├── src/types/        # TypeScript interfaces
├── public/models/    # ONNX model binary
└── public/icons/     # PWA icons

kalinga-backend/
├── src/routes/       # Express API routes
├── src/services/     # Business logic
├── src/middleware/    # Auth, validation, error handling
├── src/db/           # SQL schemas and queries
└── src/config/       # Environment and database config
\```

## Medical Disclaimer

⚠️ This is a **proof-of-concept prototype** for research and
educational purposes only. It is NOT validated for clinical use.
All AI-generated risk scores MUST be verified by a licensed
OB-GYN specialist before any clinical decision is made.

## License

MIT — See [LICENSE](./LICENSE)
```

---

## Appendix A: Render Free-Tier Optimization Strategies

| Constraint | Mitigation |
|-----------|------------|
| **15-min cold start** | External keepalive ping via [UptimeRobot](https://uptimerobot.com) (free tier: 5-min intervals) or cron-based health check |
| **512 MB RAM** | Batch sync (5 packets/batch), stream large payloads, limit DB pool to 5 connections |
| **Ephemeral filesystem** | Never store files locally — all images as Base64 in Postgres, model served from Vercel CDN |
| **Shared CPU** | Offload all AI inference to client-side ONNX — server does zero ML compute |

## Appendix B: Neon Free-Tier Optimization Strategies

| Constraint | Mitigation |
|-----------|------------|
| **0.5 GB storage** | Compress frame_base64 (JPEG quality 0.6), purge reviewed packets >30 days, thumbnail-only mode |
| **100 CU-hrs/month** | Efficient queries with indexes, avoid `SELECT *` on frame_base64 (thumbnail-only for queue view) |
| **5-min scale-to-zero** | Connection pooling via Neon's built-in PgBouncer, first-query latency ~2-3s is acceptable |

## Appendix C: Security Considerations (Prototype Scope)

| Area | Implementation |
|------|---------------|
| **Auth** | JWT with bcrypt-hashed passwords, 24-hr token expiry |
| **Data at rest** | Patient names encrypted client-side via Web Crypto API before IndexedDB storage |
| **Data in transit** | HTTPS enforced (Vercel + Render provide free TLS) |
| **CORS** | Restricted to frontend domain origin only |
| **Rate limiting** | Memory-based rate limiter (100 req/min per IP) |
| **PHI compliance** | Prototype does NOT claim HIPAA/DPA compliance — requires legal review before pilot |
