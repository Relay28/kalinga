# Kalinga AI Redesign - Implementation Guide

## Project Structure Updates

### New Files Created

```
client/src/
├── pages/
│   ├── RegisteringTriageSession.jsx    [NEW] Multi-step loading flow
│   └── TriageSummary.jsx               [NEW] Professional triage results page
├── styles/
│   ├── triage-session.css              [NEW] Loading animations & styling
│   └── triage-summary.css              [NEW] Triage summary page styling
└── App.jsx                             [UPDATED] New routes
```

### Modified Files

```
client/src/
├── App.jsx                             [UPDATED] Added imports & routes
├── pages/
│   ├── PatientRegistration.jsx         [UPDATED] Navigate to /triage-session
│   └── ScanSimulator.jsx               [UPDATED] Navigate to /triage-summary
```

## Complete User Journey

### Current Flow (Before Redesign)
```
Register Patient
    ↓
Generic Loading Screen
    ↓
Scan Screen
    ↓
Confirmation/Results
    ↓
Back to Dashboard
```

### New Flow (After Redesign)
```
Register Patient
    ↓
✓ Step 1: Patient Registered (1s)
    Patient confirmation card with avatar
    ↓
✓ Step 2: Preparing Triage Session (1.6s)
    Animated task checklist
    ↓
✓ Step 3: Searching for Probe (2.8s)
    Ultrasound probe animation + status updates
    ↓
✓ Step 4: Kalinga AI Initializing (1.6s)
    Module loading with progress bar
    ↓
✓ Step 5: System Ready (2.5s)
    Success state → Auto-navigates to Scan
    ↓
Scan Screen (User performs ultrasound sweep)
    ↓
REDESIGNED Triage Summary
    • Patient Summary Card (top)
    • AI Risk Assessment (prominent)
    • Large Ultrasound Preview (30-40% viewport)
    • Clinical Vitals
    • Workflow Status
    • Security & Next Steps
    • Sticky Submit Button (bottom)
    ↓
Back to Dashboard
```

## Timeline & Progression

### RegisteringTriageSession Timeline

```
Time        Event                           State
─────────────────────────────────────────────────────
0.0s       ▶ Step 1 Appears               Patient Registered
1.0s       ▼ Step 2 Appears               Preparing Triage Session
           Task 1 → ✓ (0.3s)
           Task 2 → ✓ (0.6s)
           Task 3 → ✓ (0.9s)
           Task 4 → ✓ (1.2s)
1.6s       ▼ Step 3 Appears               Searching for Probe
           Status 1 → ✓ (0.4s)
           Status 2 → ✓ (1.0s)
           Status 3 → ✓ (1.6s)
           Status 4 → ✓ (2.2s)
2.8s       ▼ Step 4 Appears               AI Initializing
           Module 1 → ✓ (0.2s)
           Module 2 → ✓ (0.5s)
           Module 3 → ✓ (0.8s)
           Module 4 → ✓ (1.1s)
           Progress: 0% → 100% animated
1.6s       ▼ Step 5 Appears               System Ready
2.5s       ▼ Auto-navigate to Scan        Active Scanner Screen
─────────────────────────────────────────────────────
Total: ~9.5 seconds of immersive clinical experience
```

## Component Props Reference

### RegisteringTriageSession

```javascript
<RegisteringTriageSession
  activePatient={{
    firstName: 'Maria',
    lastName: 'Cruz',
    id: '7102-4481-9352',
    location: 'Langkas, Dalaguete, Cebu',
    // ... other patient data
  }}
  isOnline={true}
  showToast={(message, type) => {
    // Display toast notification
  }}
/>
```

**Props:**
- `activePatient` (object): Patient data from registration
- `isOnline` (boolean): Connection status
- `showToast` (function): Toast notification handler

**Auto-navigates to**: `/scan-simulator`

### TriageSummary

```javascript
<TriageSummary
  isOnline={true}
  onToggleOnline={() => {
    // Toggle online/offline mode
  }}
  activePatient={{
    id: '7102-4481-9352',
    firstName: 'Maria',
    lastName: 'Cruz',
    age: 28,
    location: 'Langkas, Dalaguete, Cebu',
    philhealth: '7102-4481-9352'
  }}
  activeScan={{
    timestamp: 'Jun 18, 2026 10:23 AM',
    riskScore: 78,
    preliminaryRiskLabel: 'HIGH',
    riskDescription: 'Potential Preeclampsia Indicators Detected',
    selectedBestFrame: 'assets/ultrasound_sweep.png',
    bp: '155/95',
    bmi: 31.1,
    fetalHeartRate: 140,
    gestationalAge: '24w 3d',
    findings: [
      'Elevated blood pressure detected',
      'High BMI risk factor',
      'Uterine artery resistance increased',
      'No nasal abnormality detected in this scan'
    ],
    scanQuality: 92
  }}
  refreshSyncCount={() => {
    // Refresh offline queue count
  }}
  showToast={(message, type) => {
    // Display toast notification
  }}
/>
```

**Props:**
- `isOnline` (boolean): Connection status
- `onToggleOnline` (function): Toggle connection
- `activePatient` (object): Current patient data
- `activeScan` (object): Scan results data
- `refreshSyncCount` (function): Update sync queue
- `showToast` (function): Toast notifications

**Actions:**
- "Submit Triage Package" → Submits scan/queues offline
- "Retake Scan" → Navigate back to `/scan-simulator`

## CSS Architecture

### Design Tokens Used

```css
Primary Colors:
  --primary-teal: #1bb2a4     /* Brand color */
  --primary-blue: #095cc5     /* Secondary */

Alert Colors:
  --red-alert: #ef4444        /* High risk */
  --orange-alert: #f97316     /* Moderate risk */
  --green-normal: #10b981     /* Low risk */

Background & Text:
  --bg-light: #f8fafc         /* Light background */
  --bg-white: #ffffff         /* White cards */
  --text-dark: #1e293b        /* Primary text */
  --text-medium: #475569      /* Secondary text */
  --text-muted: #94a3b8       /* Tertiary text */

Spacing & Shadows:
  --radius-lg: 24px           /* Card corners */
  --shadow-md: 0 8px 20px...  /* Card shadow */
  --shadow-lg: 0 16px 36px... /* Large shadow */

Animations:
  --transition-fast: 0.2s     /* Quick animations */
  --transition-normal: 0.35s  /* Standard animations */
  --transition-slow: 0.5s     /* Slow animations */
```

### Animation Keyframes

#### triage-session.css
- `fadeInStep` - Step container fade and slide
- `scaleIn` - Icon scale from 0.8 to 1
- `slideUp` - Card slide up animation
- `slideInLeft` - List item slide from left
- `popIn` - Checkmark bounce animation
- `expandWave` - Ultrasound wave expansion
- `spin` - Loading spinner rotation

#### triage-summary.css
- `slideInDown` - Patient card slide down
- `slideInUp` - Content cards staggered slide up
- `scaleIn` - Risk score circle scale
- `spin` - Submit button loading spinner
- `fadeInOut` - Text fade hint animation

## Responsive Breakpoints

### Mobile First (360px+)
- Single column layouts where applicable
- Full-width cards
- Touch-friendly button sizes (44px minimum)
- Proper spacing and padding

### Tablet (768px+)
- Two-column vitals grid
- Optimized spacing
- Multi-card layouts

### Desktop (1024px+)
- Expanded layouts
- Sidebar ready (future)

## State Management Pattern

### RegisteringTriageSession State
```javascript
currentStep: 1-5              // Current display step
step1Complete: boolean        // Completion flags
step2Tasks: array             // Task items with done status
step3Status: array            // Status items with done status
step4Modules: array           // Module items with done status
aiProgress: 0-100             // AI progress percentage
step5Complete: boolean        // Final state flag
```

### TriageSummary State
```javascript
timeStr: string              // Current time display
submitting: boolean          // Submit button loading state
```

## API Integration Points

### RegisteringTriageSession
- No API calls (purely UI/UX flow)
- Data comes from `activePatient` prop

### TriageSummary Submit Actions
```javascript
// Online submission
if (isOnline) {
  await api.submitScan(scanToSubmit);
  // Navigate to dashboard
} 

// Offline queueing
if (!isOnline) {
  offlineQueue.enqueue(scanToSubmit);
  refreshSyncCount();
  // Navigate to dashboard
}
```

## Testing Recommendations

### Unit Testing
```javascript
// Test RegisteringTriageSession step progression
- Verify each step appears at correct time
- Verify task/status items animate correctly
- Verify automatic navigation after final step

// Test TriageSummary rendering
- Verify patient card displays correctly
- Verify risk score prominently shown
- Verify ultrasound preview sizing
- Verify action buttons function
```

### Integration Testing
```javascript
// Test full flow
1. Navigate to /register
2. Fill registration form
3. Submit → Auto-navigate to /triage-session
4. Wait for 5-step sequence
5. Auto-navigate to /scan-simulator
6. Complete scan → Navigate to /triage-summary
7. Submit triage → Navigate to /dashboard

// Test offline mode
1. Toggle offline mode
2. Complete scan
3. Submit → Queued for sync
4. Toggle online mode
5. Verify sync notification
```

### Visual Testing
- [ ] Verify animations smooth on 60fps
- [ ] Check colors meet accessibility standards
- [ ] Verify text sizes readable on mobile
- [ ] Test on various screen sizes
- [ ] Verify shadows render correctly

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**No** external animation libraries required - pure CSS3 animations.

## Performance Considerations

### Loading & Transition Times
- RegisteringTriageSession: ~9.5 seconds total
- TriageSummary: Immediate load with staggered reveals
- No performance regression expected

### CSS Optimization
- Using `transform` and `opacity` for animations (GPU accelerated)
- No layout thrashing
- Minimal repaints

### Code Splitting
- New components can be lazy-loaded if needed
- Currently bundled with main app

## Accessibility Features

### Keyboard Navigation
- Back button accessible
- Action buttons keyboard focusable
- Tab order logical

### Color Contrast
- All text meets WCAG AA standards
- Risk colors differentiated (not color-only)
- Checkmarks + text indicators (not icons alone)

### Screen Readers
- Semantic HTML
- ARIA labels where needed
- Status updates announced

## Customization Options

### Easy to customize:
1. **Timing** - Adjust step durations in useEffect delays
2. **Colors** - Change CSS custom properties
3. **Animation Speed** - Modify transition durations
4. **Text Content** - Update label strings

### Example: Change step 2 duration
```javascript
// From 1600ms to 2000ms
setTimeout(() => {
  setCurrentStep(3);
}, 2000);  // Changed from 1600
```

## Known Limitations

1. **Mobile gesture support** - Future enhancement
2. **Audio cues** - Could add voice guidance
3. **Real probe integration** - Currently simulated
4. **Multi-language support** - Future feature

## Deployment Checklist

- [ ] New components syntax validated
- [ ] All imports/exports correct
- [ ] CSS files imported in components
- [ ] Routes configured in App.jsx
- [ ] Navigation flows verified
- [ ] Offline queue integration tested
- [ ] API submission tested (online/offline)
- [ ] Toast notifications displaying
- [ ] No console errors
- [ ] Performance acceptable on target devices
- [ ] Accessibility requirements met
- [ ] Documentation complete

## Support & Debugging

### Common Issues

**Issue**: Steps not progressing
- Check console for errors
- Verify useEffect hooks firing
- Inspect state values in React DevTools

**Issue**: Animations stuttering
- Disable other browser extensions
- Check GPU acceleration enabled
- Verify no layout recalculations

**Issue**: Navigation not working
- Verify React Router setup
- Check activePatient prop passed correctly
- Inspect navigation history

### Debug Mode

Enable console logging:
```javascript
// In RegisteringTriageSession.jsx
useEffect(() => {
  console.log('Step transitioned to:', currentStep);
}, [currentStep]);
```

## Future Enhancements

1. **Framer Motion** - Smoother animations
2. **Gesture Support** - Swipe to navigate
3. **Voice Guidance** - Audio workflow narration
4. **Real Integration** - Actual probe connectivity
5. **ML Model** - Real AI risk assessment
6. **Case History** - Patient scan history
7. **Batch Processing** - Multi-patient workflow
8. **Export Features** - PDF reports for specialists

## Contact & Questions

For questions or issues with this redesign:
1. Check this documentation
2. Review component comments
3. Check REDESIGN_DOCUMENTATION.md for overview
4. Inspect component prop definitions
