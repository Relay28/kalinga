# Kalinga AI Redesign - Visual Design Reference

## Color Palette

### Risk Classification Colors

```
┌─────────────────────────────────────────────────┐
│ HIGH RISK                                       │
│ ────────────────────────────────────────────    │
│ Color: #ef4444 (Red)                            │
│ Background: #fee2e2 (Light Red)                 │
│ Usage: High-risk indicators, risk score ≥70%   │
│ Example: "78% HIGH RISK" display                │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ MODERATE RISK                                   │
│ ────────────────────────────────────────────    │
│ Color: #f97316 (Orange)                         │
│ Background: #ffedd5 (Light Orange)              │
│ Usage: Moderate-risk indicators, 40-69%        │
│ Example: Alert badges for caution               │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ NORMAL/LOW RISK                                 │
│ ────────────────────────────────────────────    │
│ Color: #10b981 (Green)                          │
│ Background: #d1fae5 (Light Green)               │
│ Usage: Checkmarks, status complete, <40%       │
│ Example: Task completion indicators             │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ PRIMARY BRAND                                   │
│ ────────────────────────────────────────────    │
│ Color: #1bb2a4 (Teal)                           │
│ Background: #e6f7f5 (Light Teal)                │
│ Usage: Primary actions, main CTA buttons        │
│ Example: "Submit Triage Package" button         │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ SECONDARY BRAND                                 │
│ ────────────────────────────────────────────    │
│ Color: #095cc5 (Blue)                           │
│ Background: #e6f0fa (Light Blue)                │
│ Usage: Secondary elements, gradients            │
│ Example: Gradient backgrounds, accents          │
└─────────────────────────────────────────────────┘
```

## Typography System

### Font Stack
```
Display (Headings):    'Outfit', 'Inter', sans-serif
Body (Content):        'Inter', sans-serif
Monospace (Code):      'SF Mono', 'Monaco', monospace
```

### Sizes & Weights

```
Desktop/Mobile Hierarchy:
─────────────────────────────────────────
Heading 1 (Title):     32px / 20px    700 weight
Heading 2 (Subtitle):  24px / 18px    700 weight
Heading 3 (Section):   16px / 14px    700 weight
Heading 4 (Label):     13px / 12px    700 weight
Body Large:            14px           500 weight
Body:                  13px           400 weight
Body Small:            11px           400 weight
Label:                 12px           600 weight
```

## Component Grid System

```
Mobile (360px)        Tablet (768px)        Desktop (1024px)
──────────────        ──────────────        ─────────────────
4 columns grid        8 columns grid        12 columns grid
16px gutters          20px gutters          24px gutters

Padding:
16px (mobile)         20px (tablet)         24px (desktop)
```

## RegisteringTriageSession Visual Layout

### Step 1: Patient Registered
```
┌─────────────────────────────────────┐
│  10:24                   ⚡ Online   │
├─────────────────────────────────────┤
│                                     │
│            ✓ (Green)                │
│          (Checkmark Animation)      │
│                                     │
│        Patient Registered           │
│                                     │
│    ┌─────────────────────────┐     │
│    │ M                       │     │
│    │                         │     │
│    │  Maria Santos Cruz      │     │
│    │  ID: 7102-4481-9352     │     │
│    │  Langkas, Cebu          │     │
│    └─────────────────────────┘     │
│                                     │
└─────────────────────────────────────┘
```

### Step 2: Preparing Triage Session
```
┌─────────────────────────────────────┐
│  10:24                   ⚡ Online   │
├─────────────────────────────────────┤
│                                     │
│            ⊕ 2                      │
│     Preparing Triage Session        │
│                                     │
│    ┌─────────────────────────┐     │
│    │ ✓  Saving Patient...    │     │
│    │ ✓  Calculating Risk...  │     │
│    │ ✓  Creating Package...  │     │
│    │ ✓  Initializing...      │     │
│    └─────────────────────────┘     │
│                                     │
│     (Each appears with stagger)    │
│                                     │
└─────────────────────────────────────┘
```

### Step 3: Searching for Connected Probe
```
┌─────────────────────────────────────┐
│  10:24                   ⚡ Online   │
├─────────────────────────────────────┤
│                                     │
│            ⊕ 3                      │
│   Searching for Connected Probe     │
│                                     │
│         (Ultrasound Probe)          │
│        (Wave animation)             │
│                                     │
│    ┌─────────────────────────┐     │
│    │ ✓  Looking for device   │     │
│    │ ✓  Establishing conn    │     │
│    │ ✓  Probe detected       │     │
│    │ ✓  Calibration OK       │     │
│    └─────────────────────────┘     │
│                                     │
└─────────────────────────────────────┘
```

### Step 4: Kalinga AI Initializing
```
┌─────────────────────────────────────┐
│  10:24                   ⚡ Online   │
├─────────────────────────────────────┤
│                                     │
│            ⊕ 4                      │
│   Kalinga AI Initializing           │
│                                     │
│    ┌─────────────────────────┐     │
│    │ ✓  Computer Vision...   │     │
│    │ ✓  Frame Selection...   │     │
│    │ ✓  Risk Assessment...   │     │
│    │ ✓  Offline Storage...   │     │
│    └─────────────────────────┘     │
│                                     │
│    ▓▓▓▓▓▓▓▓░░░░░░░░░░░ 56%         │
│                                     │
└─────────────────────────────────────┘
```

### Step 5: System Ready
```
┌─────────────────────────────────────┐
│  10:24                   ⚡ Online   │
├─────────────────────────────────────┤
│                                     │
│            ✓ (Large)                │
│          System Ready               │
│                                     │
│    ┌─────────────────────────┐     │
│    │ Patient: Maria Cruz     │     │
│    │ Mode: Offline First     │     │
│    │ Status: Probe Ready     │     │
│    └─────────────────────────┘     │
│                                     │
│    Launching scan module...        │
│                                     │
└─────────────────────────────────────┘
```

## TriageSummary Visual Layout

### Header Section
```
┌─────────────────────────────────────┐
│ ← │ Triage Summary           │       │
├─────────────────────────────────────┤
```

### Patient Summary Card
```
┌─────────────────────────────────────┐
│ ┌────────────────────────────────┐  │
│ │ M  │ Maria Santos Cruz        │  │ ← Avatar (64px)
│ │    │ Age 28 • ID: 7102...     │  │
│ │    │ Langkas, Dalaguete, Cebu │  │
│ │    │ Jun 18, 2026 10:23 AM    │  │
│ └────────────────────────────────┘  │
└─────────────────────────────────────┘
```

### Risk Assessment Card (Most Prominent)
```
┌─────────────────────────────────────┐
│  ┌──────────────────────────────┐   │
│  │      78%                     │   │ ← Risk score circle
│  │    HIGH RISK                 │   │
│  └──────────────────────────────┘   │
│                                     │
│  Potential Preeclampsia Indicators  │
│  Detected                           │
│                                     │
│  [⚠ Requires Specialist Review]    │
│                                     │
│  AI Insights:                       │
│  • Elevated blood pressure detected │
│  • High BMI risk factor             │
│  • Uterine artery resistance...     │
│  • No nasal abnormality detected    │
└─────────────────────────────────────┘
```

### Ultrasound Section (Large Preview - 30-40% Viewport)
```
┌─────────────────────────────────────┐
│                                     │
│    ┌──────────────────────────┐    │
│    │                          │    │
│    │  [Ultrasound Image]      │    │ ← 30-40% viewport height
│    │  (Best Diagnostic Frame) │    │
│    │                          │    │
│    │            Quality: 92%  │    │
│    └──────────────────────────┘    │
│                                     │
│  ✓ AI selected this frame for      │
│    specialist review               │
│                                     │
│  Selected Diagnostic Frames:       │
│  ┌────────┐ ┌────────┐ ┌────────┐ │
│  │ Frame 1│ │ Frame 2│ │ Frame 3│ │
│  │ [IMG]  │ │ [IMG]  │ │ [IMG]  │ │
│  └────────┘ └────────┘ └────────┘ │
│                                     │
└─────────────────────────────────────┘
```

### Vitals Section (Two-Column Grid)
```
┌─────────────────────────────────────┐
│ ┌─────────────────┐ ┌─────────────┐ │
│ │  Maternal       │ │ Fetal       │ │
│ │  Vitals         │ │ Measurements│ │
│ │ ────────────────│ │ ────────────│ │
│ │ Blood Pressure  │ │ Heart Rate  │ │
│ │ 155/95 mmHg     │ │ 140 bpm     │ │
│ │                 │ │             │ │
│ │ BMI             │ │ Gestational │ │
│ │ 31.1 kg/m²      │ │ 24w 3d      │ │
│ └─────────────────┘ └─────────────┘ │
└─────────────────────────────────────┘
```

### Workflow Status
```
┌─────────────────────────────────────┐
│ Workflow Progress                   │
│ ────────────────────────────────────│
│                                     │
│ ✓ Patient Registered               │
│ ✓ Scan Completed                   │
│ ✓ AI Analysis Complete             │
│ ⏳ Pending Specialist Verification │
│                                     │
└─────────────────────────────────────┘
```

### Security & Disclaimer
```
┌─────────────────────────────────────┐
│ 🔒 Data Encrypted Locally           │
│ Patient data remains securely stored│
│ on device until synchronization     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ⚠ Important:                        │
│ AI provides preliminary triage      │
│ support only. Final diagnosis       │
│ requires qualified OB-GYN           │
│ verification.                       │
└─────────────────────────────────────┘
```

### Sticky Footer
```
┌─────────────────────────────────────┐
│                                     │
│   [↻ Retake Scan] [→ Submit Pkg]   │
│   (Secondary)      (Primary/Teal)   │
│                                     │
└─────────────────────────────────────┘
```

## Spacing Standards

### Vertical Spacing
```
40px  - Major section breaks
24px  - Card padding, large gaps
20px  - Section headings, medium gaps
16px  - Content padding, standard gap
12px  - Small gaps, list spacing
8px   - Tight spacing, button margins
4px   - Icon padding, micro spacing
```

### Horizontal Spacing
```
20px  - Card padding (sides)
16px  - Content padding
12px  - Icon spacing
8px   - Text-icon gaps
4px   - Tight spacing
```

## Shadow System

```
sm: 0 2px 8px rgba(0,0,0,0.04)       - Subtle, hover states
md: 0 8px 20px rgba(148,163,184,0.08) - Cards, containers
lg: 0 16px 36px rgba(148,163,184,0.16) - Modals, emphasis
inner: inset 0 2px 4px rgba(0,0,0,0.06) - Pressed states
glow: 0 0 20px rgba(27,178,164,0.3) - Highlight/focus
```

## Border Radius

```
sm:   8px    - Small elements, buttons
md:  14px    - Input fields, small cards
lg:  24px    - Cards, containers
xl:  32px    - Large modals, special elements
```

## Button Styles

### Primary Button (Submit Triage Package)
```
┌──────────────────────────────────┐
│  SUBMIT TRIAGE PACKAGE           │
│                                  │
│  Background: #1bb2a4 (Teal)      │
│  Text: White, 13px, bold         │
│  Padding: 12px 16px              │
│  Border: None                    │
│  Shadow: 0 4px 12px teal (0.3)  │
│  Hover: Scale 0.98, reduce shadow│
│  Active: Loading spinner + text  │
│  Disabled: Opacity 0.7           │
└──────────────────────────────────┘
```

### Secondary Button (Retake Scan)
```
┌──────────────────────────────────┐
│  ↻ RETAKE SCAN                   │
│                                  │
│  Background: #f8fafc (Light)     │
│  Text: #1e293b (Dark), 13px, bold│
│  Border: 1px solid #e2e8f0       │
│  Padding: 12px 16px              │
│  Shadow: None                    │
│  Hover: Background #e2e8f0       │
│  Active: Background #cbd5e1      │
│  Disabled: Opacity 0.5           │
└──────────────────────────────────┘
```

## Animation Timing

```
Fast:   0.2s cubic-bezier(0.16, 1, 0.3, 1)  - Micro interactions
Normal: 0.35s cubic-bezier(0.16, 1, 0.3, 1) - Standard transitions
Slow:   0.5s cubic-bezier(0.16, 1, 0.3, 1)  - Emphasis animations
```

## Responsive Design Breakpoints

```
Mobile (360px - 639px):    Portrait phones
Tablet (640px - 1023px):   Landscape phones, tablets
Desktop (1024px+):         Tablets landscape, desktops

Key Breakpoints:
- 480px: Extended mobile
- 768px: Tablet portrait
- 1024px: Tablet landscape / Desktop
- 1440px: Large desktop
```

## Mobile-First Approach

All components designed mobile-first with progressive enhancement:

1. **Mobile** - 360px+ (base design)
2. **Enhanced Mobile** - 480px+ (slightly optimized)
3. **Tablet** - 768px+ (layout adjustments)
4. **Desktop** - 1024px+ (full layout)

## Accessibility Standards

### Color Contrast Ratios
```
WCAG AA (Minimum):
- Text on background: 4.5:1
- Large text (14px+): 3:1
- UI components: 3:1

WCAG AAA (Enhanced):
- Text on background: 7:1
- Large text: 4.5:1
```

### Touch Targets
```
Minimum interactive area: 44px × 44px
Recommended spacing: 8px between targets
Button size: 44-56px height
```

## Focus States

```
Keyboard Focus:
- 2px solid outline in #1bb2a4
- 4px offset from element
- Visible on all interactive elements
- High contrast against background
```

## Component States

### Button States
```
Default:  Normal appearance
Hover:    Slightly scaled, shadow enhanced
Active:   Pressed, reduced shadow
Focus:    Keyboard focus indicator
Loading:  Spinner overlay, disabled state
Disabled: Reduced opacity, cursor not-allowed
```

### Card States
```
Default:  Normal shadow
Hover:    Slight scale up, enhanced shadow
Focus:    Keyboard focus indicator
Pressed:  Inner shadow, scale down
```

## Mobile Frame (Device)

```
┌─────────────────────────────┐
│        10:24    ⚡          │ ← Notch (status bar)
├─────────────────────────────┤
│                             │
│    App Content Area         │ ← Scrollable viewport
│    (device-container)       │
│                             │
│                             │
│                             │
│                             │
│                             │
│                             │
│                             │
│                             │
│                             │
└─────────────────────────────┘
Dimensions: 375px × 812px (iPhone 12/13 standard)
Safe area: 20px padding top, 16px sides
```

This design system ensures consistency, professionalism, and excellent user experience across all Kalinga AI patient interfaces.
