# Kalinga AI: FetalCLIP & NatalIA (PBF-US1) Integration

Kalinga AI is a modern clinical decision support and telemedicine system designed for low-resource Barangay Health Centers. It shifts high-fidelity AI classification and preeclampsia triage risk scoring from edge PWAs to a self-hosted backend utilizing **FetalCLIP** and the **NatalIA (PBF-US1)** standard planes dataset.

# Note: Untested and Fully vibecoded , never double checked, made by from a pair of chopsticks of a blind man

---

## 🔬 FetalCLIP Foundation Model

FetalCLIP is a vision-language foundation model pre-trained on 210,035 fetal ultrasound images paired with text, optimizing zero-shot representation learning for obstetric care.

### 🔧 Installation & Environment Setup

```bash
conda create -n fetalclip python=3.9
conda activate fetalclip
pip install -r requirements.txt
```

### 📥 Download FetalCLIP Weights

The pretrained FetalCLIP model weights must be downloaded separately and placed in the `scripts/` directory:

- **Configuration** (already included): `scripts/FetalCLIP_config.json`
- **Weights** (download required): `scripts/FetalCLIP_weights.pt`

➡️ [Download FetalCLIP_weights.pt](https://huggingface.co/placentai/FetalCLIP/resolve/main/FetalCLIP_weights.pt)

> **Note**: The weights file is ~1.6 GB. Ensure you have Git LFS installed if cloning from HuggingFace:
> ```bash
> git lfs install
> git clone https://huggingface.co/placentai/FetalCLIP
> ```
> Then copy `FetalCLIP_weights.pt` and `FetalCLIP_config.json` into the `scripts/` directory.

### ⚡ Quick Start Inference

```python
import json
import torch
import open_clip
from PIL import Image

# Define paths for model configuration and weights
PATH_FETALCLIP_CONFIG = "scripts/FetalCLIP_config.json"
PATH_FETALCLIP_WEIGHT = "scripts/FetalCLIP_weights.pt"

# Set device (GPU recommended for faster computation)
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Load and register model configuration
with open(PATH_FETALCLIP_CONFIG, "r") as file:
    config_fetalclip = json.load(file)
open_clip.factory._MODEL_CONFIGS["FetalCLIP"] = config_fetalclip

# Load the FetalCLIP model and preprocessing transforms as well as tokenizer
model, preprocess_train, preprocess_test = open_clip.create_model_and_transforms(
    "FetalCLIP", pretrained=PATH_FETALCLIP_WEIGHT
)
tokenizer = open_clip.get_tokenizer("FetalCLIP")
model.eval()
model.to(device)

# List of input image file paths
images = ["image1.jpg", "image2.png"]  # Replace with actual image file paths

# Preprocess images and stack them into a single tensor
images_tensor = torch.stack([preprocess_test(Image.open(p)) for p in images]).to(device)

# Define text prompts for zero-shot classification
text_prompts = [
    "Ultrasound image focusing on the fetal abdominal area, highlighting structural development.",
    "Fetal ultrasound image focusing on the heart, highlighting detailed cardiac structures.",
    "Ultrasound image focusing on the fetal brain or biparietal area, highlighting cerebral structures and skull.",
    # Refer to zero_shot_planes_db/ for the full prompt library
]
text_tokens = tokenizer(text_prompts).to(device)

# Perform model inference
with torch.no_grad(), torch.cuda.amp.autocast():
    text_features = model.encode_text(text_tokens)
    image_features = model.encode_image(images_tensor)

    # Normalize feature vectors
    image_features /= image_features.norm(dim=-1, keepdim=True)
    text_features /= text_features.norm(dim=-1, keepdim=True)

    # Compute similarity scores (probabilities) between image and text features
    text_probs = (100.0 * image_features @ text_features.T).softmax(dim=-1)

print("Label probs:", text_probs)
```

### 🔄 Reproducibility Scripts

| Directory | Description |
|---|---|
| `zero_shot_planes_db/` | Zero-shot classification of standard fetal ultrasound planes and brain subplanes |
| `zero_shot_hc18/` | Zero-shot gestational age estimation |
| `probing/` | Linear probing evaluations (classification & segmentation) |
| `few_data_training/` | Few-shot learning experiments via linear probing |
| `cam/` | Class Activation Maps (CAM) visualizations |
| `embeddings/` | Image embedding extraction using FetalCLIP |

---

## 📂 NatalIA: PBF-US1 Dataset

In low-income countries, particularly in remote communities with a shortage of trained sonographers and high maternal mortality rates, developing AI tools to assist non-experts in accurately identifying relevant fetal planes and potential anomalies during ultrasound exams is crucial.

This dataset includes **19,407 ultrasound frames** collected from 90 videos of a 23-week gestational age fetal ultrasound phantom, recorded through free-hand sweeps by non-experts. Frames were extracted from videos captured using a point-of-care ultrasound (POCUS) device in obstetric mode, at a maximum depth of 16 cm. A total of 45 volunteers with no prior ultrasound experience recorded the videos across four predefined scanning paths: vertical, horizontal, and two diagonal trajectories, with four different fetal poses.

### 📋 Dataset Features

- **Standard Fetal Planes** — Five anatomical standard planes:
  - Biparietal
  - Abdominal
  - Heart
  - Femur
  - Spine
- **Phantom Device** — US-7a SPACE FAN phantom (Kyoto Kagaku) + Clarius C3 HD3 POCUS
- **Free-Hand Sweeps** — 4 scan protocols per volunteer: 1 Vertical, 1 Horizontal, 2 Diagonal
- **POCUS Settings** — Maximum depth 16 cm at 24 FPS
- **Open Source** — Fully customizable and community-extensible

### 📥 Installation

```bash
pip install PBFUS1
```

> The dataset is **automatically downloaded** to `./data/` on first use via `download_dataset()`. No manual download required.

### ⚡ Usage

```python
from PBFUS1.metadata import count_elements_per_class, get_images_by_class_value, plot_random_images, load_studies_metadata
from PBFUS1.data_loader import download_dataset, load_images_info

# Download and extract dataset automatically into ./data
download_dataset()
## Downloading dataset: 260091it [00:05, 44607.73it/s]
## Dataset downloaded and extracted to ./data

# Load image metadata
images_df = load_images_info()
images_df.head()
## file_name                              studie                                    class                      value  image
## 0  cineframe_100_2024-05-03T12-19-10.jpeg  Obstetrics Exam - 03-May-2024_1216_PM  Biparietal standard plane  0      ./data/...
## 1  cineframe_147_2024-05-02T08-37-43.jpeg  Obstetrics Exam - 02-May-2024_817_AM   Biparietal standard plane  0      ./data/...

# Load study-level metadata (volunteer demographics & scan protocol)
studies_df = load_studies_metadata()
studies_df.head()
## Study Name                              protocol    position  Age  Gender  ...
## 0  Obstetrics Exam - 02-May-2024_1144_AM  Vertical    OA        20   Female  ...
## 1  Obstetrics Exam - 02-May-2024_1159_AM  Horizontal  OA        20   Female  ...

# Check class distribution
class_count = count_elements_per_class()
## Class 'Biparietal standard plane' (Value: 0): 42 elements
## Class 'Abdominal standard plane'  (Value: 1): 63 elements
## Class 'Heart standard plane'      (Value: 2): 61 elements
## Class 'Spine standard plane'      (Value: 3): 134 elements
## Class 'Femur standard plane'      (Value: 4): 46 elements
## Class 'No plane'                  (Value: 5): 19,061 elements

# Filter images by class (e.g., Heart standard plane = value 2)
heart_images = get_images_by_class_value(2)
print(f"First 10 images in class 2:\n{heart_images.iloc[:10]}")

# Visualize 5 random images with labels
plot_random_images(5, fig_size=(15, 2))
```

---

## 🛠️ Architecture Workflow

1. **Midwife Capture**: The PWA captures the ultrasound frame offline, saving it locally.
2. **Store-and-Forward Sync**: Once online, the client pushes the sync payload to the backend.
3. **FetalCLIP Backend Inference**: The backend spawns `fetalclip_inference.py` using `FetalCLIP_weights.pt` to compute zero-shot diagnostic probabilities.
4. **Triage Risk Assessment**: The system runs `riskService.ts` to output preeclampsia risk levels and populates the OB-GYN prioritized dashboard queue.

---

## 🚀 Getting Started

This guide covers how to set up and run the full Kalinga AI stack from scratch: **Database → Backend API → Frontend PWA → Python AI Environment**.

### 📋 Prerequisites

Ensure the following are installed on your machine before proceeding:

| Tool | Version | Purpose |
|---|---|---|
| [Node.js](https://nodejs.org/) | `≥ 18.x` | Backend API & Frontend dev server |
| [npm](https://www.npmjs.com/) | `≥ 9.x` | Package manager (comes with Node.js) |
| [Python](https://www.python.org/) | `3.9` | FetalCLIP AI inference scripts |
| [Conda](https://docs.conda.io/en/latest/miniconda.html) | any | Python environment manager |
| [psql](https://www.postgresql.org/download/) | `≥ 14` | PostgreSQL CLI for DB schema & seeding |
| [Git](https://git-scm.com/) | any | Version control |

> **Database**: Kalinga uses [Neon](https://neon.tech/) — a serverless PostgreSQL provider. Create a free project at [neon.tech](https://neon.tech/) to get your `DATABASE_URL`. For local offline development, set `DATABASE_URL=mock` to use the built-in JSON mock database.

---

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/your-org/kalinga.git
cd kalinga
```

---

### 2️⃣ Database Setup (Neon PostgreSQL)

> Skip this step if using the mock database (`DATABASE_URL=mock`).

The backend includes SQL scripts for schema creation and seeding. Run them against your Neon (or any PostgreSQL) database using `psql`:

```bash
cd kalinga-backend

# Apply the database schema (creates all tables, indexes, enums)
psql $DATABASE_URL < src/db/schema.sql

# Seed the database with initial data (demo users, health center data, etc.)
psql $DATABASE_URL < src/db/seed.sql
```

Or use the npm convenience scripts (once `.env` is configured — see step 3):

```bash
npm run db:schema
npm run db:seed
```

---

### 3️⃣ Backend Setup (`kalinga-backend`)

#### 3a. Install Dependencies

```bash
cd kalinga-backend
npm install
```

This installs all packages declared in [`kalinga-backend/package.json`](./kalinga-backend/package.json), including:
- `express` — HTTP server
- `@neondatabase/serverless` — Neon PostgreSQL client
- `jsonwebtoken` + `bcrypt` — Auth & hashing
- `zod` — Request validation
- `dotenv` — Environment config
- `tsx` + `typescript` — TypeScript dev runner & compiler

#### 3b. Configure Environment Variables

The `.env` file is **not committed** (it contains secrets). A template is provided:

```bash
# Copy the example env file
cp .env.example .env
```

Then open `kalinga-backend/.env` and fill in your values:

```env
# Neon serverless PostgreSQL connection string
# Use 'mock' for local development without a real database
DATABASE_URL=postgresql://neondb_owner:<password>@<host>.neon.tech/kalinga?sslmode=require

# JWT signing secret — change this to a long random string in production
JWT_SECRET=your_super_secret_key_here

# Port the Express server will listen on
PORT=3001

# Environment mode
NODE_ENV=development
```

> **Mock DB Mode**: Set `DATABASE_URL=mock` to run the backend without any external database. All data will be stored in local JSON files under `data/mock_db/` (which is gitignored).

#### 3c. Start the Backend Dev Server

```bash
npm run dev
```

The API server will start at **`http://localhost:3001`** with hot-reload via `tsx watch`.

To build for production:

```bash
npm run build   # Compiles TypeScript → dist/
npm start       # Runs compiled dist/index.js
```

---

### 4️⃣ Frontend Setup (`kalinga-frontend`)

#### 4a. Install Dependencies

```bash
cd kalinga-frontend
npm install
```

This installs all packages declared in [`kalinga-frontend/package.json`](./kalinga-frontend/package.json), including:
- `react` + `react-dom` — UI framework
- `lucide-react` — Icon library
- `idb` — IndexedDB wrapper (offline-first storage)
- `uuid` — Unique ID generation
- `vite` — Dev server & bundler
- `typescript` — Type checking

#### 4b. Start the Frontend Dev Server

```bash
npm run dev
```

The PWA will be available at **`http://localhost:5173`** with HMR (Hot Module Replacement) via Vite.

> **Backend Connection**: The frontend talks to the backend at `http://localhost:3001` by default. If you changed the backend port, update the API base URL in the frontend source accordingly.

To build the production bundle:

```bash
npm run build    # Outputs to kalinga-frontend/dist/
npm run preview  # Serves the production build locally for verification
```

---

### 5️⃣ Python AI Environment Setup (FetalCLIP)

The Python environment is required **only** for running AI inference (`scripts/fetalclip_inference.py`) and model training/export (`scripts/train_and_export.py`). The Express backend spawns these scripts on demand.

#### 5a. Create & Activate Conda Environment

```bash
# From the project root
conda create -n fetalclip python=3.9 -y
conda activate fetalclip
```

#### 5b. Install Python Dependencies

```bash
pip install -r requirements.txt
```

Key packages installed:
- `torch` + `torchvision` — Deep learning framework
- `open_clip_torch` — FetalCLIP foundation model
- `Pillow` + `opencv-python` — Image processing
- `onnx` + `onnxruntime` — ONNX model export & inference
- `PBFUS1` — NatalIA dataset loader
- `requests` + `tqdm` — HTTP utilities

> **GPU Acceleration (Optional)**: For faster inference, install PyTorch with CUDA support:
> ```bash
> # CUDA 11.8
> pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
> # CUDA 12.1
> pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
> ```

#### 5c. Download FetalCLIP Model Weights

The weights file (`FetalCLIP_weights.pt`, ~1.6 GB) must be downloaded separately and placed in `kalinga-backend/scripts/`:

```bash
# Download directly
wget https://huggingface.co/placentai/FetalCLIP/resolve/main/FetalCLIP_weights.pt \
  -O kalinga-backend/scripts/FetalCLIP_weights.pt

# Or via Git LFS
git lfs install
git clone https://huggingface.co/placentai/FetalCLIP
cp FetalCLIP/FetalCLIP_weights.pt kalinga-backend/scripts/
```

> **Note**: `*.pth` and `*.onnx` files are gitignored (they are too large for Git). The `FetalCLIP_config.json` is already committed in `scripts/`.

#### 5d. (Optional) Train & Export the MobileNetV3 Model

```bash
cd kalinga-backend
conda activate fetalclip
python scripts/train_and_export.py
```

This downloads the NatalIA dataset, fine-tunes MobileNetV3-Small, and exports quantized ONNX weights to `kalinga-backend/`.

---

### 6️⃣ Running the Full Stack

Open **three terminals** and run each service concurrently:

```bash
# Terminal 1 — Backend API (http://localhost:3001)
cd kalinga-backend
npm run dev

# Terminal 2 — Frontend PWA (http://localhost:5173)
cd kalinga-frontend
npm run dev

# Terminal 3 — Python AI (activate environment, ready for inference calls from backend)
conda activate fetalclip
# The backend will spawn scripts/fetalclip_inference.py automatically on demand
```

---

### 🗂️ Project Structure Overview

```
kalinga/
├── kalinga-backend/          # Express + TypeScript API server
│   ├── src/
│   │   ├── db/               # schema.sql, seed.sql
│   │   ├── routes/           # Express route handlers
│   │   ├── services/         # Business logic (auth, risk scoring, inference)
│   │   ├── middleware/       # JWT auth middleware
│   │   └── index.ts          # Server entrypoint
│   ├── scripts/
│   │   ├── fetalclip_inference.py   # FetalCLIP zero-shot inference
│   │   ├── train_and_export.py      # MobileNetV3 training & ONNX export
│   │   └── FetalCLIP_config.json    # Model architecture config (committed)
│   ├── .env.example          # Environment variable template (committed)
│   ├── package.json          # Node.js dependencies & scripts
│   └── tsconfig.json         # TypeScript compiler config
│
├── kalinga-frontend/         # React + Vite PWA
│   ├── src/                  # React components & application logic
│   ├── public/               # Static assets
│   ├── index.html            # App shell
│   ├── vite.config.ts        # Vite bundler config
│   ├── package.json          # Node.js dependencies & scripts
│   └── tsconfig*.json        # TypeScript configs
│
├── requirements.txt          # Python dependencies (FetalCLIP + NatalIA)
└── README.md                 # This file
```

---

### ⚠️ `.gitignore` Notes — What Is & Isn't Tracked

The following essential configuration files **are committed** to the repository and will be available after cloning:

| File | Tracked? | Notes |
|---|---|---|
| `kalinga-backend/package.json` | ✅ Yes | All Node.js dependency declarations |
| `kalinga-backend/tsconfig.json` | ✅ Yes | TypeScript compiler config |
| `kalinga-backend/.env.example` | ✅ Yes | Environment variable template — copy to `.env` |
| `kalinga-backend/scripts/FetalCLIP_config.json` | ✅ Yes | Model architecture config |
| `kalinga-frontend/package.json` | ✅ Yes | All Node.js dependency declarations |
| `kalinga-frontend/tsconfig*.json` | ✅ Yes | TypeScript configs |
| `kalinga-frontend/vite.config.ts` | ✅ Yes | Vite bundler config |
| `requirements.txt` | ✅ Yes | Python dependency declarations |

The following files **are intentionally gitignored** and must be obtained separately:

| File/Directory | Tracked? | How to Obtain |
|---|---|---|
| `kalinga-backend/.env` | ❌ No (secrets) | Copy `.env.example` → `.env` and fill in values |
| `kalinga-backend/node_modules/` | ❌ No | Run `npm install` |
| `kalinga-frontend/node_modules/` | ❌ No | Run `npm install` |
| `kalinga-backend/dist/` | ❌ No | Run `npm run build` |
| `kalinga-frontend/dist/` | ❌ No | Run `npm run build` |
| `*.onnx`, `*.onnx.data`, `*.pth` | ❌ No (too large) | Run `train_and_export.py` or download externally |
| `scripts/FetalCLIP_weights.pt` | ❌ No (~1.6 GB) | Download from [HuggingFace](https://huggingface.co/placentai/FetalCLIP) |
| `data/` (NatalIA dataset) | ❌ No (large) | Auto-downloaded by `PBFUS1.data_loader.download_dataset()` |
