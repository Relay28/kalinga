# Kalinga AI - Task Execution Priority Guide

## Executive Summary

Now that CSV integration is complete, this guide helps you decide which tasks from `tasks.md` to execute first.

## Task Categorization

### 🟢 Ready to Execute (Infrastructure & Foundation)

These tasks can be executed immediately and provide the foundation for other work:

#### **Task 1: Set up testing infrastructure** 
- **Why Now**: Foundation for all testing work
- **Impact**: Enables 40+ test-related tasks
- **Effort**: 1-2 hours
- **Dependencies**: None
```
Installs: Vitest, fast-check, Playwright
Sets up: Test directory structure, coverage reporting
```

#### **Task 13.4: Implement seed data initialization**
- **Why Now**: CSV data is already integrated!
- **Impact**: Rich demo data for testing and demos
- **Effort**: 30 minutes (mostly done via CSV import)
- **Dependencies**: None
```
What it does: Enhanced seed.js with CSV data
Already have: 91 patients + 1,562 frames from CSV
Just need: Update seed.js to reference CSV import
```

#### **Task 5.1: Improve form validation with real-time feedback**
- **Why Now**: User-facing improvement with immediate value
- **Impact**: Better UX for patient registration
- **Effort**: 2-3 hours
- **Dependencies**: None
```
Adds: Inline validation, debouncing, visual indicators
Enhances: PatientRegistration.jsx
```

### 🟡 High Value (Should Do Soon)

These provide immediate functionality improvements:

#### **Task 2.1: BMI calculation property test**
- **Why**: First property test, sets pattern for others
- **Effort**: 1 hour
- **Dependency**: Task 1 (testing infrastructure)

#### **Task 3.1: Unit tests for aiService.js**
- **Why**: Tests core risk calculation logic
- **Effort**: 2 hours
- **Dependency**: Task 1 (testing infrastructure)

#### **Task 7.2: Improve sync queue UI and feedback**
- **Why**: Critical for offline-first architecture
- **Effort**: 3 hours
- **Dependency**: None

#### **Task 9.1: Create risk score display component**
- **Why**: Better visualization of risk assessment
- **Effort**: 3-4 hours
- **Dependency**: None

#### **Task 11.1-11.4: Specialist dashboard enhancements**
- **Why**: Improves specialist workflow
- **Effort**: 6-8 hours total
- **Dependency**: None (but benefits from seed data)

### 🟠 Medium Priority (Optional Tests)

These are marked optional (`*`) in tasks.md but highly recommended:

- Task 2.2-2.11: Property tests (optional but valuable)
- Task 3.2-3.4: Additional unit tests
- Task 4.1-4.5: Integration tests
- Task 15.1-15.5: E2E tests with Playwright

### 🔵 Future Work (Phase 2 Prep)

Can be done later or in parallel with active development:

- Task 17.1-17.4: Phase 2 infrastructure planning
- Task 18.1-18.4: Documentation

### ⚪ Checkpoints

These aren't tasks to execute but validation points:
- Task 6: Verify patient registration
- Task 10: Verify scanning and risk assessment  
- Task 14: Verify specialist workflow
- Task 19: Final comprehensive verification

## Recommended Execution Order

### Week 1: Foundation + Testing (Days 1-5)

**Day 1-2: Infrastructure**
1. ✅ CSV Integration (DONE!)
2. Task 1: Testing infrastructure setup
3. Task 13.4: Enhanced seed data

**Day 3: First Tests**
4. Task 2.1: BMI property test
5. Task 3.1: aiService unit tests

**Day 4-5: UI Improvements**
6. Task 5.1: Form validation
7. Task 5.2: BMI auto-calculation
8. Task 5.3: Mock ID Scanner

**Checkpoint**: Task 6 - Verify patient registration

### Week 2: Core Features (Days 6-10)

**Day 6-7: Offline Sync**
9. Task 7.1: Transaction locking
10. Task 7.2: Sync queue UI
11. Task 7.4: Network connectivity detection

**Day 8-9: Risk Visualization**
12. Task 9.1: Risk score display
13. Task 9.2: Risk factor breakdown

**Day 10: Scanning Improvements**
14. Task 8.1: Scanning interface
15. Task 8.2: Frame capture timing

**Checkpoint**: Task 10 - Verify scanning

### Week 3: Specialist Dashboard (Days 11-15)

**Day 11-12: Dashboard UI**
16. Task 11.1: Case list interface
17. Task 11.2: Case review interface

**Day 13: Frame Gallery**
18. Task 11.3: Frame gallery with zoom

**Day 14: Notifications**
19. Task 12.1: Notification polling
20. Task 12.2: Notification list UI

**Day 15: Backend Polish**
21. Task 13.1: JSON database refactoring
22. Task 13.2: API error handling

**Checkpoint**: Task 14 - Verify specialist workflow

### Week 4: Testing & Polish (Days 16-20)

**Day 16-18: Property Tests**
23. Task 2.2-2.6: Remaining property tests
24. Task 3.2-3.4: Additional unit tests

**Day 19: Integration Tests**
25. Task 4.1-4.5: API integration tests

**Day 20: Final Verification**
26. Task 19: Comprehensive system verification

## Quick Start Recommendations

### Option A: "Show Me Progress Fast" (3-5 days)
Execute only these high-value, visible tasks:
```
1. Task 1: Testing setup
2. Task 5.1: Form validation  
3. Task 9.1: Risk score display
4. Task 11.1: Specialist case list
5. Task 13.4: Seed data (CSV integration)
```
**Result**: Improved UI with better demos

### Option B: "Build Solid Foundation" (5-7 days)
Focus on testing and core features:
```
1. Task 1: Testing setup
2. Task 2.1: BMI property test
3. Task 3.1: aiService tests
4. Task 7.2: Sync queue UI
5. Task 13.1-13.2: Backend improvements
```
**Result**: Well-tested, robust core functionality

### Option C: "Complete Specialist Workflow" (7-10 days)
End-to-end specialist experience:
```
1. Task 13.4: Seed data (gives them data to review)
2. Task 11.1-11.4: All specialist dashboard tasks
3. Task 12.1-12.2: Notification system
4. Task 13.1: Backend refactoring
```
**Result**: Fully functional specialist review workflow

### Option D: "Full Test Coverage" (15-20 days)
Complete testing implementation:
```
1. Task 1: Testing setup
2. Task 2.1-2.11: All property tests
3. Task 3.1-3.4: All unit tests
4. Task 4.1-4.5: Integration tests
5. Task 15.1-15.5: E2E tests
```
**Result**: Comprehensive test suite, production-ready

## Task Dependencies Visualization

```
Task 1 (Testing Setup)
  ├─→ Task 2.1-2.11 (Property Tests)
  ├─→ Task 3.1-3.4 (Unit Tests)
  ├─→ Task 4.1-4.5 (Integration Tests)
  └─→ Task 15.1-15.5 (E2E Tests)

CSV Integration (DONE)
  └─→ Task 13.4 (Enhanced Seed Data) ← Can do immediately

Task 5 (Patient Registration)
  └─→ Task 6 (Checkpoint)

Task 7 (Offline Sync) + Task 8 (Scanning) + Task 9 (Risk Viz)
  └─→ Task 10 (Checkpoint)

Task 11 (Specialist Dashboard) + Task 12 (Notifications) + Task 13 (Backend)
  └─→ Task 14 (Checkpoint)

All Tasks
  └─→ Task 19 (Final Verification)
```

## Decision Matrix

| Task Group | Visible Impact | Technical Depth | Time Investment | Dependencies |
|------------|---------------|-----------------|-----------------|--------------|
| Task 1 (Testing) | Low | High | Medium | None |
| Task 5 (Registration) | High | Medium | Medium | None |
| Task 7 (Sync) | Medium | High | High | None |
| Task 9 (Risk Viz) | High | Medium | Medium | None |
| Task 11 (Specialist) | High | Medium | High | Task 13.4 helps |
| Task 13.4 (Seed) | Medium | Low | Low | None (CSV done!) |
| Tests (2,3,4,15) | Low | High | Very High | Task 1 |

## My Recommendation

**Start with this sequence:**

1. **✅ CSV Integration** - Already done!

2. **Task 13.4** (30 min) - Quick win, enables better demos
   - Update seed.js to use CSV data
   - Gives you 94 patients (3 original + 91 CSV)
   - Gives specialists real data to review

3. **Task 1** (1-2 hours) - Essential foundation
   - Sets up Vitest, fast-check, Playwright
   - Enables all testing tasks

4. **Task 5.1 & 5.2** (3-4 hours) - High visible impact
   - Better patient registration UX
   - Real-time validation
   - BMI auto-calculation

5. **Task 9.1** (3-4 hours) - Impressive visualization
   - Risk score circular display
   - Color-coded risk levels
   - Midwife-friendly UI

6. **Task 11.1 & 11.2** (4-5 hours) - Complete specialist flow
   - Case list with filtering
   - Enhanced review interface
   - Works great with CSV data

**Total Time**: 12-16 hours
**Result**: Polished demo with real data, better UX, and testing foundation

## What Would You Like?

**Tell me:**
- Which option (A, B, C, D) appeals to you?
- Or which specific tasks from tasks.md?
- Or follow my recommendation?

**I can:**
- Execute tasks one by one (you watch progress)
- Execute a sequence in batch (you check results)
- Execute in parallel (up to 5 concurrent tasks)
- Provide detailed plan before executing

Let me know how you'd like to proceed!
