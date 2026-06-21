# Implementation Plan: Kalinga AI Maternal Health System

## Overview

This implementation plan covers the completion and enhancement of the Kalinga AI offline-first maternal health triage system. The system is currently in MVP Phase 1 with functional components including React-based midwife app, Express.js backend with JSON database, and specialist dashboard. This plan focuses on:

1. **Testing Infrastructure**: Implement comprehensive property-based testing and unit testing
2. **Code Quality Improvements**: Refactor and optimize existing modules
3. **Missing Features**: Complete implementation gaps identified in requirements
4. **Phase 2 Preparation**: Set up infrastructure for future AI model integration

The implementation follows the store-and-forward architecture pattern with offline-first design, allowing midwives to capture diagnostic data without connectivity and synchronize when available.

## Tasks

- [x] 1. Set up testing infrastructure and tools
  - Install testing frameworks: Vitest for unit tests, fast-check for property-based testing, Playwright for E2E tests
  - Configure test runners with appropriate timeouts and coverage thresholds
  - Create test directory structure: `client/src/__tests__/{unit,properties,integration,e2e}`
  - Set up test utilities and helper functions for common operations
  - Configure coverage reporting with 90% target for business logic
  - _Requirements: Testing Strategy Section_

- [x] 2. Implement property-based tests for business logic correctness
  - [x] 2.1 Write property test for BMI calculation
    - **Property 1: BMI Calculation Correctness**
    - **Validates: Requirements 1.2, 22.1, 22.2**
    - Verify BMI = weight / (height/100)² for all valid weight (30-200kg) and height (100-250cm) inputs
    - Use fast-check generators with floating-point tolerance checking
    - _Requirements: 1.2_
  
  - [ ]* 2.2 Write property test for PhilHealth ID validation
    - **Property 2: PhilHealth ID Format Validation**
    - **Validates: Requirements 1.3**
    - Verify format XX-XXXXXXXXX-X accepts valid IDs and rejects invalid formats
    - Generate valid and invalid ID patterns using regex-based generators
    - _Requirements: 1.3_
  
  - [ ]* 2.3 Write property test for unique patient ID generation
    - **Property 3: Patient Record Unique Identifier Generation**
    - **Validates: Requirements 1.5**
    - Verify no duplicate UUIDs generated across sequences of patient registrations
    - Test collision resistance with 1000+ generated IDs
    - _Requirements: 1.5_
  
  - [ ]* 2.4 Write property test for patient registration persistence
    - **Property 4: Patient Registration Data Persistence**
    - **Validates: Requirements 1.1, 1.6**
    - Verify complete round-trip: register patient → persist to localStorage → retrieve → verify all fields match
    - Test with randomly generated patient data including all required fields
    - _Requirements: 1.1, 1.6_
  
  - [ ]* 2.5 Write property test for sync queue management
    - **Property 5: Offline Sync Queue Management**
    - **Validates: Requirements 2.2, 2.6, 9.4**
    - Verify queue add/remove operations maintain integrity
    - Test: add N packages → verify count N → remove M packages → verify count N-M
    - Handle edge cases: empty queue, queue with single item
    - _Requirements: 2.2, 2.6, 9.4_
  
  - [ ]* 2.6 Write property test for sync queue count display
    - **Property 6: Sync Queue Count Display**
    - **Validates: Requirements 2.4, 9.1**
    - Verify badge displays correct pending count for any queue size
    - Test with queue sizes from 0 to 100
    - _Requirements: 2.4, 9.1_
  
  - [ ]* 2.7 Write property test for preeclampsia risk score calculation
    - **Property 7: Preeclampsia Risk Score Calculation**
    - **Validates: Requirements 7.1-7.7**
    - Verify rules-based algorithm: baseline 15 + BP score + BMI score + risk factor scores
    - Test all combinations of boolean risk factors (256 combinations)
    - Verify BP scoring thresholds: ≥160/100 (+35), ≥140/90 (+25), ≥130/85 (+12)
    - Verify BMI scoring: ≥30 (+8), ≥25 (+4)
    - Verify risk factors: chronic HTN (+20), family history (+10), first pregnancy (+4), multiple pregnancy (+8), diabetes (+10), previous C-section (+5), abdominal pain (+8)
    - Verify clamping to [5, 95] range
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_
  
  - [ ]* 2.8 Write property test for risk level classification
    - **Property 8: Risk Level Classification Thresholds**
    - **Validates: Requirements 7.8, 7.9, 7.10**
    - Verify threshold-based classification: HIGH (≥70), MODERATE (40-69), LOW (<40)
    - Test boundary values and ranges across entire [5, 95] domain
    - Verify color coding: red for HIGH, orange for MODERATE, green for LOW
    - _Requirements: 7.8, 7.9, 7.10_
  
  - [ ]* 2.9 Write property test for triage package completeness
    - **Property 9: Triage Package Completeness**
    - **Validates: Requirements 8.1, 8.5, 8.6**
    - Verify compiled package contains all required fields: demographics, vitals, frames (6), risk predictions, UUID, timestamps
    - Test with randomly generated patient data and scan sessions
    - _Requirements: 8.1, 8.5, 8.6_
  
  - [ ]* 2.10 Write property test for JSON serialization round-trip
    - **Property 10: Triage Package JSON Serialization Round-Trip**
    - **Validates: Requirements 25.1, 25.2, 25.5**
    - Verify: serialize(package) → JSON → deserialize → equivalent package
    - Test with complex nested structures and various data types
    - _Requirements: 25.1, 25.2, 25.5_
  
  - [ ]* 2.11 Write property test for frame collection timing
    - **Property 11: Frame Collection Timing During Sweep**
    - **Validates: Requirements 5.1, 27.1, 27.3, 27.4, 27.5**
    - Verify 6 frames collected at ~2.5s intervals during 15s sweep (±500ms tolerance)
    - Test timing accuracy across different execution speeds
    - _Requirements: 5.1, 27.1, 27.3, 27.4, 27.5_

- [x] 3. Implement unit tests for core modules
  - [x] 3.1 Write unit tests for aiService.js
    - Test calculateBMI with specific examples: weight=70kg, height=175cm → BMI=22.86
    - Test calculatePreeclampsiaRisk with known patient profiles (Maria Santos Cruz scenario)
    - Test risk level classification boundaries (69.9→MODERATE, 70.0→HIGH)
    - Test edge cases: minimum/maximum valid inputs, missing optional fields
    - _Requirements: 1.2, 7.1-7.10_
  
  - [ ]* 3.2 Write unit tests for offlineQueue.js
    - Test addToQueue, removeFromQueue, getQueueCount operations
    - Test queue persistence across page reloads (localStorage)
    - Test transaction lock mechanism prevents concurrent modifications
    - Test empty queue handling
    - _Requirements: 2.2, 2.6, 9.1, 9.4_
  
  - [ ]* 3.3 Write unit tests for storage.js
    - Test savePatient, getPatient, getAllPatients operations
    - Test localStorage quota exceeded error handling
    - Test data corruption recovery mechanisms
    - Test JSON parse error handling
    - _Requirements: 1.6, 2.2_
  
  - [ ]* 3.4 Write unit tests for validation functions
    - Test PhilHealth ID validation with valid/invalid formats
    - Test required field validation (empty strings, null values)
    - Test blood pressure range validation (systolic 90-200, diastolic 60-130)
    - Test weight/height boundary validation
    - _Requirements: 1.3, 1.1_

- [ ] 4. Implement integration tests for API endpoints
  - [ ]* 4.1 Write integration test for POST /api/patients
    - Verify patient creation with complete demographic data
    - Verify response includes generated patient ID
    - Verify patient retrievable via GET /api/patients/:id
    - Test duplicate PhilHealth ID handling
    - _Requirements: 1.1, 1.5_
  
  - [ ]* 4.2 Write integration test for POST /api/scans
    - Verify triage package upload with frames and metadata
    - Verify package stored in JSON database with status "Submitted"
    - Verify response includes scan ID
    - Test invalid package structure rejection (HTTP 422)
    - _Requirements: 9.2, 9.6, 10.1_
  
  - [ ]* 4.3 Write integration test for PATCH /api/scans/:id/verify
    - Verify specialist verdict update (Normal/High Risk/Urgent Referral)
    - Verify status changed to "Reviewed" and timestamp recorded
    - Verify notification created for midwife
    - Test invalid scan ID returns HTTP 404
    - _Requirements: 13.1, 13.5, 13.6_
  
  - [ ]* 4.4 Write integration test for GET /api/notifications
    - Verify notification structure includes patient ID, verdict, specialist name
    - Verify filtering by read/unread status
    - Verify timestamp ordering (newest first)
    - _Requirements: 14.1, 14.2_
  
  - [ ]* 4.5 Write integration test for PATCH /api/notifications/:id/read
    - Verify notification marked as read with timestamp
    - Verify read status persisted across requests
    - _Requirements: 14.5_

- [x] 5. Enhance patient registration module
  - [x] 5.1 Improve form validation with real-time feedback
    - Add inline validation messages with red borders for invalid fields
    - Implement debounced validation (300ms delay) for better UX
    - Add visual indicators for valid fields (green checkmark)
    - Prevent form submission until all validations pass
    - _Requirements: 1.1, 1.3_
  
  - [x] 5.2 Optimize BMI auto-calculation
    - Trigger BMI recalculation on weight or height change
    - Display BMI with color coding: <18.5 underweight, 18.5-24.9 normal, 25-29.9 overweight, ≥30 obese
    - Add BMI interpretation text for midwife guidance
    - _Requirements: 1.2_
  
  - [x] 5.3 Enhance Mock ID Scanner functionality
    - Add visual scanning animation (2-3 seconds)
    - Rotate through demo patients: Maria Santos Cruz, Ana Reyes, Elena Garcia
    - Display success toast after auto-fill completes
    - Maintain ability for manual entry if scanner not used
    - _Requirements: 1.4_

- [x] 6. Checkpoint - Verify patient registration and validation
  - Ensure all registration tests pass (unit + property + integration)
  - Manually test registration flow end-to-end in browser
  - Verify localStorage persistence by reloading page
  - Ask the user if questions arise.

- [x] 7. Enhance offline sync queue functionality
  - [x] 7.1 Implement robust transaction locking
    - Use localStorage flag with timestamp for mutex-like behavior
    - Auto-release lock after 30 seconds to handle crashed sessions
    - Display "Another session is active" warning if lock detected
    - Add lock status indicator in UI for debugging
    - _Requirements: 2.2, 8.3_
  
  - [x] 7.2 Improve sync queue UI and feedback
    - Add pending count badge to "Pending Uploads" button
    - Show detailed upload progress: "Uploading 2 of 5 packages..."
    - Display success/failure toasts with specific error messages
    - Add "Retry Failed" button for failed uploads
    - _Requirements: 9.1, 9.3, 9.4, 9.5_
  
  - [x] 7.3 Implement localStorage quota management
    - Monitor localStorage usage and display warning at 80% capacity
    - Provide "Clear Uploaded Data" option to free space
    - Display storage usage in settings/debug panel
    - Handle QuotaExceededError gracefully with user prompt
    - _Requirements: Error Handling - Storage Quota Errors_
  
  - [x] 7.4 Add network connectivity detection
    - Replace manual Online/Offline toggle with automatic detection
    - Listen to navigator.onLine events and network state changes
    - Display connectivity status indicator (green dot = online, red = offline)
    - Show "You're back online" toast when connectivity restored
    - _Requirements: 2.3, 9.1_

- [x] 8. Enhance ultrasound scanning module
  - [x] 8.1 Improve scanning interface visual guidance
    - Refine guidance text cycling: clear, actionable instructions
    - Add progress ring indicator showing elapsed/remaining time
    - Enhance directional arrow animations (pulsing, smooth transitions)
    - Display frame counter: "Captured 3 of 6 frames"
    - _Requirements: 4.2, 4.4, 5.1_
  
  - [x] 8.2 Optimize frame capture timing
    - Implement precise 2.5-second interval timing using setTimeout
    - Display visual flash feedback when frame captured
    - Fill thumbnail placeholders sequentially as frames collected
    - Ensure 6 frames captured within 15-second sweep window
    - _Requirements: 5.1, 5.2, Property 11_
  
  - [x] 8.3 Enhance camera error handling
    - Detect getUserMedia failures (permission denied, no camera)
    - Display clear error messages with troubleshooting steps
    - Fall back to static ultrasound_sweep.png if camera unavailable
    - Add "Retry Camera Access" button for permission recovery
    - _Requirements: 17.1, 17.2, Error Handling - Camera/Video Access_
  
  - [x] 8.4 Improve triage package compilation
    - Validate all required fields present before compilation
    - Generate unique scan ID (UUID v4) and timestamp
    - Display "Lock & Encrypt" animation overlay (2-3 seconds)
    - Store complete package to localStorage with error handling
    - _Requirements: 8.1, 8.5, 8.6_

- [x] 9. Enhance risk scoring visualization
  - [x] 9.1 Create risk score display component
    - Large circular progress indicator showing risk percentage
    - Color-coded ring: red (≥70%), orange (40-69%), green (<40%)
    - Display risk level label: HIGH RISK / MODERATE RISK / LOW RISK
    - Add explanatory text for midwife: "Factors contributing to this score:"
    - _Requirements: 7.8, 7.9, 7.10_
  
  - [x] 9.2 Add risk factor breakdown UI
    - List active risk factors with their score contributions
    - Examples: "Chronic Hypertension (+20)", "BMI ≥30 (+8)"
    - Display blood pressure reading with threshold comparison
    - Highlight factors that pushed into higher risk category
    - _Requirements: 7.2-7.7_
  
  - [x] 9.3 Implement risk score recalculation
    - Allow editing patient data after initial registration
    - Automatically recalculate risk score when factors change
    - Display "Risk score updated" notification
    - Store recalculation history for audit trail
    - _Requirements: 7.1_

- [x] 10. Checkpoint - Verify scanning and risk assessment
  - Ensure all scanning and risk scoring tests pass
  - Manually test complete scan session: connect → scan → risk display
  - Verify frame timing accuracy with stopwatch
  - Test risk score calculation with known patient profiles
  - Ask the user if questions arise.

- [x] 11. Enhance specialist dashboard functionality
  - [x] 11.1 Improve case list interface
    - Add filtering: "Pending Review" / "Reviewed" tabs
    - Implement sorting: by submission date, risk level, patient name
    - Display risk level badges with color coding in list view
    - Add search functionality to find patients by name or PhilHealth ID
    - Show submission timestamp in relative format ("2 hours ago")
    - _Requirements: 12.1_
  
  - [x] 11.2 Enhance case review interface
    - Create structured layout: patient summary panel, frame gallery, verdict form
    - Display all patient demographics and vitals in summary card
    - Show risk factors as checked/unchecked list items
    - Display AI risk score prominently with color-coded indicator
    - _Requirements: 12.2, 12.4_
  
  - [x] 11.3 Implement frame gallery with zoom controls
    - Display 6 frames in 2x3 grid layout
    - Click frame to open full-screen lightbox viewer
    - Add zoom in/out controls and pan functionality
    - Display FetalCLIP labels on hover (simulated: "Fetal Head [94%]")
    - Add keyboard navigation (arrow keys, ESC to close)
    - _Requirements: 12.3, 12.5_
  
  - [x] 11.4 Create verdict submission form
    - Button group for verdict selection: Normal / High Risk / Urgent Referral
    - Multi-line text area for specialist notes and recommendations
    - Character counter for notes (max 1000 characters)
    - Submit button triggers PATCH /api/scans/:id/verify
    - Display confirmation dialog before submission
    - Show success message and navigate back to case list
    - _Requirements: 12.7, 13.1_

- [ ] 12. Implement notification system for midwives
  - [x] 12.1 Create notification polling service
    - Poll GET /api/notifications every 8 seconds when online
    - Implement efficient polling with ETag/If-None-Match headers (Phase 2)
    - Cache notifications in localStorage for offline viewing
    - Handle polling errors gracefully without disrupting UI
    - _Requirements: 14.2, 14.6_
  
  - [x] 12.2 Build notification list UI
    - Display unread notifications with visual distinction (bold, blue dot)
    - Group notifications: "Unread" and "Read" sections
    - Show notification count badge on bell icon in header
    - Display patient name, verdict, specialist name, timestamp
    - Mark notification as read when clicked (PATCH /api/notifications/:id/read)
    - _Requirements: 14.3, 14.4, 14.5_
  
  - [ ] 12.3 Create notification detail view
    - Navigate to patient details page when notification clicked
    - Display complete specialist report including verdict and notes
    - Show comparison: AI risk score vs specialist verdict
    - Highlight urgent referral cases with red banner
    - Provide "Acknowledge" button to confirm reading
    - _Requirements: 14.5_

- [ ] 13. Optimize backend API performance
  - [x] 13.1 Refactor JSON database operations
    - Implement in-memory caching for frequently accessed data
    - Add atomic file write pattern to prevent corruption
    - Create database backup before each write operation
    - Add data validation layer before persistence
    - _Requirements: 10.1, 10.2_
  
  - [x] 13.2 Improve API error handling
    - Standardize error response format: { error, message, details }
    - Add request validation middleware using Joi or Yup
    - Implement proper HTTP status codes (400, 404, 422, 500)
    - Log errors with context (endpoint, user, timestamp, payload)
    - _Requirements: Error Handling - Server-Side_
  
  - [x] 13.3 Add API request logging
    - Log all requests with: method, endpoint, IP, timestamp, response time
    - Use structured logging format (JSON) for parsing
    - Sanitize sensitive data from logs (no PhilHealth IDs, no patient names)
    - Implement log rotation (daily, 7-day retention for Phase 1)
    - _Requirements: 19.1, 19.2_
  
  - [ ] 13.4 Implement seed data initialization
    - Create seed.js script with demo patients (Maria, Ana, Elena)
    - Auto-execute seed on server startup if database empty
    - Prevent duplicate seeding (check for existing records)
    - Add sample scans with varying risk levels for demo purposes
    - _Requirements: Seed Data Module section_

- [x] 14. Checkpoint - Verify specialist workflow and notifications
  - Ensure all specialist dashboard and notification tests pass
  - Manually test end-to-end: midwife uploads → specialist reviews → notification delivered
  - Verify notification polling works correctly (8-second interval)
  - Test verdict submission and report generation
  - Ask the user if questions arise.

- [ ] 15. Implement end-to-end testing with Playwright
  - [ ]* 15.1 Set up Playwright test infrastructure
    - Install @playwright/test and configure browsers (Chromium, WebKit)
    - Create playwright.config.js with base URL and timeout settings
    - Set up test fixtures for authentication and database seeding
    - Configure video recording for failed tests
    - _Requirements: Testing Strategy - E2E_
  
  - [ ]* 15.2 Write E2E test for complete midwife workflow
    - Test: Login → Dashboard → Register Patient → Connect Probe → Scan → Confirm → Upload
    - Verify patient created in database
    - Verify scan stored with status "Submitted"
    - Verify sync queue updated correctly
    - _Requirements: Testing Strategy - E2E Scenarios 1_
  
  - [ ]* 15.3 Write E2E test for offline workflow
    - Test: Go offline → Register patient → Scan → Verify localStorage persistence
    - Test: Go online → Trigger sync → Verify upload successful
    - Verify data integrity after online/offline transitions
    - _Requirements: Testing Strategy - E2E Scenarios 2, Requirements 2.1-2.6_
  
  - [ ]* 15.4 Write E2E test for specialist review workflow
    - Test: Login to specialist dashboard → View pending case → Review frames → Submit verdict
    - Verify notification created for midwife
    - Verify case status changed to "Reviewed"
    - _Requirements: Testing Strategy - E2E Scenarios 3, Requirements 12.1-12.7, 13.1-13.6_
  
  - [ ]* 15.5 Write E2E test for notification delivery
    - Test: Specialist submits verdict → Midwife app polls → Notification appears → View report
    - Verify notification count badge updates
    - Verify notification marked as read when clicked
    - _Requirements: Testing Strategy - E2E Scenarios 4, Requirements 14.1-14.6_

- [ ] 16. Implement code quality improvements
  - [x] 16.1 Refactor React components for reusability
    - Extract common UI patterns: FormField, Button, Card, Badge
    - Create shared components library in `client/src/components/`
    - Use React.memo for performance optimization
    - Add PropTypes validation for all components
    - _Requirements: Performance Optimization - Client-Side_
  
  - [ ] 16.2 Optimize localStorage operations
    - Implement compression for frame data using LZ-string
    - Add try-catch wrappers for all localStorage operations
    - Create StorageService abstraction for testability
    - Add cleanup utility to remove old sync queue items
    - _Requirements: Performance Optimization - LocalStorage_
  
  - [ ] 16.3 Improve error boundary implementation
    - Add React Error Boundary component to catch rendering errors
    - Display user-friendly error fallback UI
    - Log errors to console with component stack trace
    - Add "Reload App" button to recover from errors
    - _Requirements: Error Handling - Client-Side_
  
  - [x] 16.4 Add accessibility improvements
    - Ensure all interactive elements have proper ARIA labels
    - Add keyboard navigation support (Tab, Enter, Esc)
    - Verify color contrast ratios meet WCAG AA standards
    - Add screen reader announcements for status changes
    - Test with screen reader (NVDA or VoiceOver)
    - _Requirements: Coding Questions - Accessibility Compliance_

- [ ] 17. Set up Phase 2 infrastructure preparation
  - [x] 17.1 Create database migration plan
    - Document JSON-to-PostgreSQL migration strategy
    - Design PostgreSQL schema with proper relationships and indexes
    - Create Sequelize models for patients, scans, frames, notifications
    - Write migration script to import existing JSON data
    - _Requirements: 10.7, Phase 2 Section_
  
  - [x] 17.2 Design message queue integration architecture
    - Document RabbitMQ or AWS SQS integration approach
    - Design queue workflow: upload → enqueue → process → notify
    - Create dead letter queue handling strategy
    - Plan retry logic with exponential backoff
    - _Requirements: 10.4, 10.5, 10.6, Phase 2 Section_
  
  - [ ] 17.3 Plan AI model integration points
    - Document TensorFlow Lite integration approach for Edge_AI_Module
    - Design model loading and caching strategy
    - Plan model update delivery mechanism (over-the-air)
    - Document fallback behavior when models unavailable
    - _Requirements: 16.2-16.7, Phase 2 Section_
  
  - [x] 17.4 Design encryption implementation
    - Research AES-256 encryption libraries for browser and Node.js
    - Design key management strategy (device-specific identifiers)
    - Plan encrypted localStorage wrapper implementation
    - Document encryption round-trip workflow
    - _Requirements: 8.4, 15.2, 15.3, Property 12_

- [ ] 18. Documentation and deployment preparation
  - [x] 18.1 Create API documentation
    - Document all REST endpoints with request/response examples
    - Create Postman collection for API testing
    - Add endpoint descriptions, parameters, status codes
    - Include authentication requirements (Phase 2 notes)
    - _Requirements: REST API Layer Section_
  
  - [ ] 18.2 Write deployment guide
    - Document Phase 1 deployment process (single server, JSON DB)
    - Create deployment checklist with environment setup steps
    - Document environment variables and configuration
    - Add troubleshooting section for common deployment issues
    - _Requirements: Deployment Strategy - Phase 1_
  
  - [ ] 18.3 Create user documentation
    - Write midwife user guide with screenshots for each workflow step
    - Create specialist dashboard user guide
    - Document offline mode behavior and sync process
    - Add FAQ section for common questions
    - _Requirements: User Story Sections_
  
  - [ ] 18.4 Document testing procedures
    - Create testing guide with commands to run each test suite
    - Document expected test coverage thresholds
    - Add CI/CD integration notes for automated testing
    - Create test data generation guide for QA team
    - _Requirements: Testing Strategy Section_

- [ ] 19. Final checkpoint - Comprehensive system verification
  - Run complete test suite: unit + property + integration + E2E
  - Verify all tests pass with >90% coverage for business logic
  - Manually test complete workflows in both online and offline modes
  - Test with multiple patients across different risk levels
  - Verify specialist review and notification delivery end-to-end
  - Test error scenarios: network failures, storage quota, invalid inputs
  - Review all documentation for completeness and accuracy
  - Ask the user if questions arise.

## Notes

- **Tasks marked with `*` are optional** property-based and E2E test sub-tasks that can be skipped for faster iteration, though strongly recommended for production quality
- **Each task references specific requirements** from the requirements document for traceability
- **Checkpoints ensure incremental validation** at logical break points (after patient registration, after scanning, after specialist workflow)
- **Property tests validate universal correctness** properties across all valid inputs (13 properties from design document)
- **Phase 2 preparation tasks** set up infrastructure for future AI model integration without blocking Phase 1 completion
- **Testing strategy follows complementary approach**: property tests for business logic correctness, unit tests for specific scenarios and edge cases, integration tests for API/database, E2E tests for complete workflows
- **Code quality improvements focus on**: reusability, error handling, accessibility, and performance optimization
- **Current implementation uses**: React 18 with Vite, Express.js with JSON database, localStorage for offline storage, native fetch API for network requests
- **Testing frameworks**: Vitest for unit tests (compatible with Vite), fast-check for property-based testing (100+ iterations per property), Playwright for E2E testing
- **The system is offline-first**: Core functionality works without network, synchronization happens asynchronously when connectivity available

## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 0,
      "tasks": ["1.1"]
    },
    {
      "id": 1,
      "tasks": ["2.1", "3.1", "5.1", "7.1", "11.1", "13.1"]
    },
    {
      "id": 2,
      "tasks": ["2.2", "2.3", "2.4", "2.5", "2.6", "3.2", "3.3", "5.2", "7.2", "8.1", "9.1", "11.2", "12.1", "13.2", "16.1", "17.1"]
    },
    {
      "id": 3,
      "tasks": ["2.7", "2.8", "2.9", "2.10", "2.11", "3.4", "4.1", "4.2", "5.3", "7.3", "8.2", "9.2", "11.3", "12.2", "13.3", "16.2", "17.2"]
    },
    {
      "id": 4,
      "tasks": ["4.3", "4.4", "4.5", "7.4", "8.3", "9.3", "11.4", "12.3", "13.4", "16.3", "17.3"]
    },
    {
      "id": 5,
      "tasks": ["8.4", "15.1", "16.4", "17.4", "18.1"]
    },
    {
      "id": 6,
      "tasks": ["15.2", "15.3", "15.4", "15.5", "18.2", "18.3", "18.4"]
    }
  ]
}
```
