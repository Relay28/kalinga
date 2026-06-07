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
