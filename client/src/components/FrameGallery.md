# FrameGallery Component

## Overview

The `FrameGallery` component is a comprehensive ultrasound frame viewer designed for the Kalinga AI Specialist Dashboard. It provides an intuitive interface for reviewing diagnostic ultrasound images with professional-grade viewing capabilities.

## Features

### 1. Grid Layout Display (2x3)
- Displays 6 ultrasound frames in a responsive 2-column by 3-row grid
- Hover effects with scale animation for better visual feedback
- Frame sequence numbers (#1, #2, etc.) displayed on each thumbnail
- Quality score indicators per frame

### 2. FetalCLIP Label Display
- Shows AI-generated anatomical plane classifications on hover
- Displays confidence percentages (e.g., "Fetal Head [94%]")
- Smooth slide-up animation for label appearance
- Color-coded for visual distinction (teal background)

### 3. Full-Screen Lightbox Viewer
- Click any frame to open full-screen viewer
- Dark overlay (95% opacity black) for distraction-free viewing
- Professional header with frame counter and metadata
- Footer thumbnail strip for quick navigation

### 4. Zoom Controls
- **Zoom In/Out Buttons**: Increment/decrement by 50% per click
- **Zoom Range**: 100% (fit to screen) to 400% (maximum magnification)
- **Keyboard Shortcuts**: 
  - `+` or `=` to zoom in
  - `-` or `_` to zoom out
- **Visual Feedback**: Real-time zoom percentage display (e.g., "150%")
- **Button States**: Disabled states when at min/max zoom

### 5. Pan Functionality
- **Enable Condition**: Panning only enabled when zoom > 100%
- **Interaction**: Click and drag to pan around zoomed image
- **Cursor States**: 
  - `grab` cursor when hovering (ready to pan)
  - `grabbing` cursor while actively dragging
- **Auto-Reset**: Pan position resets to center when zooming back to 100%

### 6. Keyboard Navigation
- **Arrow Keys**:
  - `←` (Left Arrow): Navigate to previous frame
  - `→` (Right Arrow): Navigate to next frame
  - Wraps around at boundaries (last → first, first → last)
- **ESC Key**: Close lightbox and return to grid view
- **Zoom Keys**: `+`/`-` for zoom control
- **Visual Hints**: Keyboard shortcut guide displayed at bottom of lightbox

### 7. Thumbnail Navigation
- 6 thumbnails displayed in lightbox footer
- Click any thumbnail to jump to that frame
- Current frame highlighted with teal border
- Hover effects on thumbnails for better UX

### 8. Accessibility Features
- Semantic HTML structure
- Descriptive alt text for all images
- Keyboard-only navigation support
- Focus indicators on interactive elements
- Body scroll lock when lightbox open (prevents background scroll)

## Usage

### Basic Usage

```jsx
import FrameGallery from '../components/FrameGallery';

function SpecialistDashboard() {
  const frames = [
    {
      id: 'frame-1',
      imageData: '/assets/frame-1.png',
      sequenceNumber: 1,
      fetalClipClassification: {
        plane: 'Fetal Head',
        confidence: 94
      },
      qualityScore: 87
    },
    // ... more frames
  ];

  return (
    <div>
      <FrameGallery frames={frames} />
    </div>
  );
}
```

### With Default Image

```jsx
<FrameGallery 
  frames={scanData.frames}
  defaultImage="http://localhost:5000/assets/ultrasound_sweep.png"
/>
```

### Without Frame Data (Uses Defaults)

```jsx
<FrameGallery defaultImage="http://localhost:5000/assets/ultrasound_sweep.png" />
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `frames` | `Array<Frame>` | `[]` | Array of frame objects with image data and metadata |
| `defaultImage` | `string` | `"http://localhost:5000/assets/ultrasound_sweep.png"` | Fallback image URL if frames not provided or incomplete |

### Frame Object Structure

```typescript
interface Frame {
  id: string;                           // Unique identifier
  imageData: string;                    // Image URL or base64 data URI
  sequenceNumber: number;               // Display order (1-6)
  fetalClipClassification: {
    plane: string;                      // Anatomical plane name
    confidence: number;                 // Confidence percentage (0-100)
  };
  qualityScore?: number;                // Optional quality score (0-100)
}
```

## Component State

The component manages the following internal state:

- `lightboxOpen`: Boolean flag for lightbox visibility
- `currentFrameIndex`: Index of currently displayed frame (0-5)
- `zoomLevel`: Current zoom level (1.0 to 4.0)
- `panPosition`: Object with x/y pan coordinates
- `isDragging`: Boolean flag for active pan operation
- `dragStart`: Object with starting drag coordinates
- `hoveredFrame`: Index of currently hovered frame in grid

## Interactions

### Opening Lightbox
1. User clicks on any frame thumbnail in grid
2. Lightbox opens with clicked frame displayed
3. Body scroll is locked
4. Zoom resets to 100%, pan position to center

### Closing Lightbox
1. User clicks "Close" button OR presses ESC key
2. Lightbox closes with fade-out animation
3. Body scroll is restored
4. User returns to grid view

### Zooming
1. User clicks "Zoom In" or presses `+` key
2. Zoom level increments by 0.5 (50%)
3. Zoom percentage display updates
4. Pan becomes enabled (cursor changes to grab)
5. If zooming out to 100%, pan resets automatically

### Panning
1. User zooms in (zoom > 100%)
2. Cursor changes to `grab`
3. User clicks and drags on image
4. Cursor changes to `grabbing`
5. Image follows mouse movement
6. On mouse release, pan position is retained

### Frame Navigation
1. **Via Arrow Keys**: Press left/right arrow to cycle through frames
2. **Via Buttons**: Click chevron buttons on sides of lightbox
3. **Via Thumbnails**: Click any thumbnail in footer
4. Each navigation resets zoom to 100% and pan to center

## Styling

The component uses inline styles with CSS custom properties for theming:

```css
/* Referenced CSS Variables */
--primary-teal: #14b8a6
--border-color: #e2e8f0
--bg-light: #f8fafc
--text-dark: #1e293b
--text-medium: #64748b
--green-normal: #10b981
```

### Custom Animations

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
```

## Testing

The component includes comprehensive tests covering:

- Grid layout rendering (6 frames)
- Hover interactions (FetalCLIP labels, expand icon)
- Lightbox open/close functionality
- Keyboard navigation (arrows, ESC, +/-)
- Zoom controls (buttons and keyboard)
- Pan functionality (mouse drag)
- Thumbnail navigation
- Body scroll lock behavior

Run tests with:

```bash
npm test -- FrameGallery.test.jsx --run
```

## Performance Considerations

1. **Image Loading**: Uses native `<img>` tags for browser-optimized loading
2. **Event Listeners**: Cleanup on component unmount to prevent memory leaks
3. **State Updates**: Minimal re-renders through careful state management
4. **Transitions**: CSS transitions for smooth animations without JS overhead
5. **Scroll Lock**: Restored on unmount to prevent stuck scroll states

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Touch events for pan may need additional handling

## Future Enhancements

Potential improvements for Phase 2:

1. **Touch Gestures**: Pinch-to-zoom and swipe navigation on mobile
2. **Image Comparison**: Side-by-side frame comparison mode
3. **Annotations**: Drawing tools for marking areas of interest
4. **Download**: Export individual frames or full gallery
5. **Measurements**: Calibrated distance/area measurements on frames
6. **Cine Loop**: Animated playback of frame sequence
7. **Brightness/Contrast**: Image adjustment controls

## Related Components

- **SpecialistDashboard**: Primary consumer of this component
- **RiskScoreDisplay**: Companion component for risk visualization
- **PatientDetails**: May use similar frame viewing in future

## Requirements Validation

This component satisfies the following acceptance criteria:

- **Requirement 12.3**: Display 6 frames in 2x3 grid layout ✓
- **Requirement 12.5**: Click frame to open full-screen lightbox viewer ✓
- **Requirement 12.5**: Add zoom in/out controls and pan functionality ✓
- **Requirement 12.3**: Display FetalCLIP labels on hover ✓
- **Requirement 12.5**: Add keyboard navigation (arrow keys, ESC to close) ✓

## Accessibility Compliance

- Keyboard navigation for all interactions
- Semantic HTML structure
- Descriptive alt text for images
- Focus management in lightbox
- ARIA labels where appropriate (future enhancement)

## License

Part of the Kalinga AI Maternal Health System
Copyright © 2024
