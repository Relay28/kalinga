# Accessibility Testing Guide

## Quick Start Testing

### 1. Keyboard Navigation Test (5 minutes)

**Steps:**
1. Open the application in your browser
2. Press `Tab` to navigate through the page
3. Verify you can reach all interactive elements
4. Press `Enter` or `Space` to activate buttons and cards
5. Look for visible focus indicators (teal outline)

**What to check:**
- ✅ Can navigate to all buttons and links
- ✅ Focus indicator is clearly visible
- ✅ Tab order makes logical sense
- ✅ Can activate elements with Enter/Space
- ✅ No keyboard traps (can always move focus away)

### 2. Screen Reader Test with NVDA (10 minutes)

**Setup:**
1. Download NVDA (free): https://www.nvaccess.org/download/
2. Install and start NVDA
3. Open the Kalinga application

**Test Steps:**
1. **Dashboard Test:**
   - Navigate to dashboard
   - Listen for "Midwife Dashboard" page title
   - Tab through action cards - each should announce its purpose
   - Verify patient cards announce name, status, and ID

2. **Notification Test:**
   - Navigate to notifications page
   - Listen for unread count announcement
   - Switch between Unread/Read tabs
   - Verify tab switching is announced

3. **Form Test:**
   - Navigate to patient registration
   - Tab through form fields
   - Enter invalid data and verify error announcements
   - Verify required fields are announced

**NVDA Commands:**
- `Insert + Down Arrow`: Read next item
- `Insert + Up Arrow`: Read previous item
- `Insert + T`: Read page title
- `Ctrl`: Stop reading

### 3. Color Contrast Check (2 minutes)

**Using Browser DevTools:**
1. Right-click any text element
2. Select "Inspect"
3. Look at the "Accessibility" tab (Chrome/Edge)
4. Check contrast ratio meets 4.5:1 (AA standard)

**Or use automated tool:**
- Install WAVE extension: https://wave.webaim.org/extension/
- Click WAVE icon
- Review "Contrast Errors" section

### 4. Zoom Test (2 minutes)

1. Press `Ctrl +` (or `Cmd +` on Mac) to zoom to 200%
2. Verify all content is still accessible
3. Check that nothing is cut off
4. Verify horizontal scrolling is minimal

## Manual Testing Checklist

### Before Each Release

#### Dashboard Page
- [ ] Keyboard: Tab to all action cards
- [ ] Keyboard: Activate cards with Enter/Space
- [ ] Screen Reader: Page title announces
- [ ] Screen Reader: Action cards describe purpose
- [ ] Screen Reader: Notification badge count is read
- [ ] Screen Reader: Patient cards announce details
- [ ] Focus: All cards show focus indicator
- [ ] Contrast: All text meets 4.5:1 ratio

#### Notifications Page
- [ ] Keyboard: Tab navigation works
- [ ] Keyboard: Tab switcher responds to Enter
- [ ] Screen Reader: Unread count announces on load
- [ ] Screen Reader: Tab switching announces
- [ ] Screen Reader: Notification cards read correctly
- [ ] Focus: Tabs and buttons show focus
- [ ] Contrast: All text readable

#### Patient Registration
- [ ] Keyboard: Tab through all fields
- [ ] Keyboard: Submit with Enter key
- [ ] Screen Reader: Labels announce with fields
- [ ] Screen Reader: Required fields indicated
- [ ] Screen Reader: Validation errors announced
- [ ] Screen Reader: Help text (sub-labels) read
- [ ] Focus: Form fields show focus
- [ ] Contrast: All text and labels readable

### Upload/Sync Flow
- [ ] Screen Reader: Upload progress announced
- [ ] Screen Reader: Success/failure announced
- [ ] Screen Reader: Error details provided
- [ ] Status: Visual and auditory feedback match

## Automated Testing

### Run Accessibility Tests
```bash
cd client
npm test -- accessibility.test.js --run
```

### Run All Tests Including Accessibility
```bash
npm test --run
```

## Common Issues and Solutions

### Issue: Focus indicator not visible
**Solution:** Check CSS - `:focus-visible` should have 3px teal outline

### Issue: Screen reader not announcing
**Solution:** Verify ARIA labels are present and live regions are created

### Issue: Color contrast failing
**Solution:** Use darker text colors or lighter backgrounds. Check with `checkColorContrast()` utility

### Issue: Keyboard navigation doesn't work
**Solution:** Verify `tabIndex={0}` and `onKeyDown` handlers are present

## Browser Compatibility

Test in these browsers for full coverage:
- ✅ Chrome/Edge (Chromium)
- ⏳ Firefox
- ⏳ Safari (macOS/iOS)

## Screen Reader Compatibility

Recommended combinations:
- **Windows**: NVDA + Chrome/Firefox (free)
- **macOS**: VoiceOver + Safari (built-in)
- **iOS**: VoiceOver + Safari (built-in)
- **Android**: TalkBack + Chrome (built-in)

## Resources

### Testing Tools
- **NVDA Screen Reader**: https://www.nvaccess.org/
- **WAVE Browser Extension**: https://wave.webaim.org/extension/
- **axe DevTools**: https://www.deque.com/axe/devtools/
- **Lighthouse**: Chrome DevTools > Lighthouse > Accessibility

### Learning Resources
- **WebAIM**: https://webaim.org/
- **A11y Project**: https://www.a11yproject.com/
- **WCAG Quick Reference**: https://www.w3.org/WAI/WCAG21/quickref/

## Reporting Issues

When reporting accessibility issues, include:
1. **Component/Page**: Which part of the app
2. **Issue Type**: Keyboard, screen reader, contrast, etc.
3. **Steps to Reproduce**: How to encounter the issue
4. **Expected Behavior**: What should happen
5. **Actual Behavior**: What actually happens
6. **Environment**: Browser, screen reader, OS

Example:
```
Component: Dashboard action cards
Issue Type: Keyboard navigation
Steps: Tab to "Register Patient" card, press Enter
Expected: Should navigate to registration page
Actual: Nothing happens
Environment: Chrome 120, Windows 11
```

## Next Steps After Testing

If you find issues:
1. Document them using the format above
2. Check if there's a quick fix in the code
3. Create a task for complex issues
4. Test the fix with keyboard and screen reader
5. Re-run automated tests

Remember: Accessibility is not a one-time task. Test with every new feature!
