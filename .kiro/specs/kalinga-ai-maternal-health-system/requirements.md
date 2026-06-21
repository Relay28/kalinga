# Requirements Document

## Introduction

Kalinga AI is an offline-first diagnostic triage system designed to address maternal mortality in Geographically Isolated and Disadvantaged Areas (GIDA) of the Philippines by activating idle Department of Health (DOH) medical equipment. The system empowers local midwives to capture diagnostic-quality ultrasound scans using AI assistance, with specialist verification in the loop.

**Implementation Status**: The system is currently in MVP Phase 1, with a functional offline-first architecture, rules-based risk scoring, and simulated AI components. Phase 2 will integrate real AI models (FetalCLIP, CNN guidance) once training data and model deployment infrastructure are ready.

This requirements document defines the functional and non-functional requirements for the complete system spanning mobile application, edge AI processing, cloud backend, and specialist dashboard components.

## Glossary

- **Midwife_App**: The mobile application interface (React SPA) used by midwives in rural health stations
- **Edge_AI_Module**: The on-device AI processing component (currently rules-based in Phase 1, AI models in Phase 2)
- **Cloud_Backend**: The Node.js Express server with JSON file-based persistence (Phase 1) or PostgreSQL/MongoDB (Phase 2)
- **Specialist_Dashboard**: The web application used by OB-GYN specialists to review and verify cases
- **Triage_Package**: A compiled data bundle containing patient information, selected ultrasound frames, AI predictions, and metadata
- **Probe**: The ultrasound hardware device that captures imaging data (currently simulated via camera/static assets)
- **Diagnostic_Frame**: An ultrasound image frame that meets quality criteria for clinical assessment
- **PhilHealth_ID**: The Philippine national health insurance identification number
- **GIDA**: Geographically Isolated and Disadvantaged Areas in the Philippines
- **FetalCLIP**: The AI framework for ultrasound frame analysis (Phase 2 integration, Phase 1 simulated)
- **Preeclampsia_Risk_Score**: A numerical risk assessment for maternal preeclampsia condition (Phase 1 uses rules-based calculation)
- **CNN_Guidance_Model**: The computer vision neural network for probe positioning (Phase 2, Phase 1 provides visual/audio simulation)
- **Frame_Selection_Model**: The deep learning model that identifies diagnostic-quality frames (Phase 2, Phase 1 simulates selection)
- **Sync_Queue**: The localStorage-based offline queue that holds pending uploads when offline
- **DOH_Equipment**: Department of Health medical devices including ultrasound probes
- **Human_in_the_Loop**: The workflow pattern where AI predictions require specialist validation
- **Store_and_Forward**: An asynchronous architecture pattern where data is locally stored then transmitted when connectivity permits
- **Mock_ID_Scanner**: The simulated PhilHealth ID OCR system (Phase 1) that auto-fills demo data
- **JSON_Database**: The custom file-based database (`server/data/db.json`) used for zero-compile compatibility (Phase 1)

## Requirements

### Requirement 1: Patient Registration and Demographics

**User Story:** As a midwife, I want to register patient demographic and clinical information, so that each case is properly identified and clinical context is available for triage assessment.

**Implementation Status:** ✅ FULLY IMPLEMENTED (Phase 1)

#### Acceptance Criteria

1. WHEN a midwife initiates patient registration, THE Midwife_App SHALL capture PhilHealth_ID, name, date of birth, blood pressure, weight, height, chronic hypertension status, and family history
2. THE Midwife_App SHALL compute Body Mass Index from weight and height measurements
3. WHEN PhilHealth_ID is entered, THE Midwife_App SHALL validate the format matches Philippine national ID structure
4. WHERE Mock_ID_Scanner is activated, THE Midwife_App SHALL simulate OCR scanning and auto-fill demographic fields with demo data (Phase 1 implementation)
5. WHEN registration is complete, THE Midwife_App SHALL create a unique patient record identifier
6. THE Midwife_App SHALL store patient demographics locally before any network operations

### Requirement 2: Offline-First Architecture

**User Story:** As a midwife in a GIDA location, I want the system to function without internet connectivity, so that I can perform triage assessments regardless of network availability.

**Implementation Status:** ✅ FULLY IMPLEMENTED (Phase 1) - localStorage-based queue with manual sync trigger

#### Acceptance Criteria

1. THE Midwife_App SHALL operate all core functions without requiring network connectivity
2. WHEN network connectivity is unavailable, THE Midwife_App SHALL store all Triage_Package data in the Sync_Queue using localStorage
3. WHEN network connectivity is restored, THE Midwife_App SHALL display Online Mode indicator allowing user to toggle connection status
4. WHEN connectivity is Online AND Sync_Queue contains pending uploads, THE Midwife_App SHALL display a notification indicating pending upload count in the "Pending Uploads" button
5. THE Midwife_App SHALL allow manual triggering of synchronization operations via the "Pending Uploads" action card
6. WHEN a synchronization operation is interrupted, THE Midwife_App SHALL retain unsynchronized items in the Sync_Queue and support retry (Phase 1: basic retry, Phase 2: exponential backoff)

### Requirement 3: Ultrasound Probe Connection

**User Story:** As a midwife, I want to connect DOH_Equipment ultrasound probes to the mobile device, so that I can capture ultrasound imaging data.

**Implementation Status:** 🔶 SIMULATED (Phase 1) - Animated searching screens with 2.5s connection simulation

#### Acceptance Criteria

1. **Phase 1 (Current)**: THE Midwife_App SHALL simulate Probe connection with animated searching screens showing 8 rotating frames
2. **Phase 1 (Current)**: WHEN a Probe connection is initiated, THE Midwife_App SHALL display animated status indicators for 2.5 seconds then confirm connection
3. **Phase 2 (Future)**: THE Midwife_App SHALL support USB-connected ultrasound probes using USB Video Class (UVC) protocol
4. **Phase 2 (Future)**: THE Midwife_App SHALL support Wi-Fi-connected ultrasound probes
5. **Phase 2 (Future)**: WHEN a Probe connection is initiated, THE Midwife_App SHALL search for available devices for up to 30 seconds
6. **Phase 2 (Future)**: WHEN no Probe is detected within the timeout period, THE Midwife_App SHALL display an error message with troubleshooting guidance

### Requirement 4: Real-Time AI-Guided Probe Positioning

**User Story:** As a midwife with limited ultrasound training, I want real-time guidance on probe positioning, so that I can capture diagnostic-quality images.

**Implementation Status:** 🔶 SIMULATED (Phase 1) - Visual/audio guidance animation without real CNN model

#### Acceptance Criteria

1. **Phase 1 (Current)**: WHEN a scanning session begins, THE Edge_AI_Module SHALL display simulated guidance text cycling through positioning instructions
2. **Phase 1 (Current)**: WHILE scanning is active, THE Midwife_App SHALL display visual guidance including directional arrow ("↑ SWEEP UPWARDS SLOWLY ↑") and animated guide star
3. **Phase 1 (Current)**: THE Midwife_App SHALL display simulated AI bounding boxes with "Fetal Head [FetalCLIP: 94%]" labels during the 15-second sweep
4. **Phase 1 (Current)**: THE Midwife_App SHALL provide text guidance feedback changing every 3 seconds during sweep ("Aligning transducer", "Hold steady", "Move up slowly", "Checking image signal")
5. **Phase 2 (Future)**: THE CNN_Guidance_Model SHALL analyze incoming frames at minimum 5 frames per second and provide real-time positioning feedback based on actual ultrasound quality metrics
6. **Phase 2 (Future)**: THE Edge_AI_Module SHALL complete positioning analysis within 200 milliseconds per frame

### Requirement 5: Intelligent Frame Selection

**User Story:** As a system operator, I want the AI to automatically select only diagnostic-quality frames, so that storage and bandwidth are efficiently used and specialists review only relevant images.

**Implementation Status:** 🔶 SIMULATED (Phase 1) - Static PNG assets displayed as collected frames

#### Acceptance Criteria

1. **Phase 1 (Current)**: WHILE scanning is active, THE Midwife_App SHALL simulate frame collection by displaying up to 6 thumbnail placeholders that fill sequentially during the 15-second sweep
2. **Phase 1 (Current)**: THE Midwife_App SHALL display static ultrasound_sweep.png image assets as collected frame thumbnails
3. **Phase 1 (Current)**: WHEN scanning completes, THE Edge_AI_Module SHALL store references to the 6 simulated Diagnostic_Frames in the Triage_Package
4. **Phase 2 (Future)**: THE Frame_Selection_Model SHALL evaluate each captured frame for diagnostic quality using deep learning models
5. **Phase 2 (Future)**: THE Frame_Selection_Model SHALL discard frames with excessive blur, motion artifacts, or insufficient amniotic fluid visibility
6. **Phase 2 (Future)**: THE Edge_AI_Module SHALL reduce total frame count by at least 90 percent through intelligent filtering
7. **Phase 2 (Future)**: THE Frame_Selection_Model SHALL assign a quality score to each retained frame

### Requirement 6: FetalCLIP Integration for Ultrasound Analysis

**User Story:** As a system operator, I want to leverage the FetalCLIP framework for ultrasound frame classification, so that the system accurately identifies anatomical planes and structures.

**Implementation Status:** 🔶 SIMULATED (Phase 1) - Hardcoded confidence labels without real model

#### Acceptance Criteria

1. **Phase 1 (Current)**: THE Edge_AI_Module SHALL display simulated FetalCLIP classification results with "Fetal Head [FetalCLIP: 94%]" bounding box labels during scanning
2. **Phase 1 (Current)**: THE Midwife_App SHALL include simulated FetalCLIP metadata in Triage_Package data structures for UI consistency
3. **Phase 2 (Future)**: THE Edge_AI_Module SHALL integrate the FetalCLIP model for zero-shot plane classification using trained neural networks
4. **Phase 2 (Future)**: WHEN a Diagnostic_Frame is analyzed, THE FetalCLIP model SHALL classify the anatomical plane shown and output classification confidence scores
5. **Phase 2 (Future)**: THE Edge_AI_Module SHALL prioritize frames showing fetal cardiac structures for Preeclampsia_Risk_Score calculation
6. **Phase 2 (Future)**: THE Edge_AI_Module SHALL tag each Diagnostic_Frame with its FetalCLIP classification result

### Requirement 7: Preliminary Risk Detection

**User Story:** As a midwife, I want the system to provide preliminary risk assessment, so that I can understand case urgency before specialist review.

**Implementation Status:** ✅ FULLY IMPLEMENTED (Phase 1) - Rules-based clinical risk engine in production

#### Acceptance Criteria

1. WHEN maternal vitals and patient data are collected, THE Edge_AI_Module SHALL compute a Preeclampsia_Risk_Score using the rules-based calculation algorithm
2. THE Edge_AI_Module SHALL incorporate blood pressure measurements into the Preeclampsia_Risk_Score calculation (baseline 15, +35 for BP ≥160/100, +25 for BP ≥140/90, +12 for BP ≥130/85)
3. THE Edge_AI_Module SHALL incorporate Body Mass Index into the Preeclampsia_Risk_Score calculation (+8 for BMI ≥30, +4 for BMI ≥25)
4. THE Edge_AI_Module SHALL incorporate chronic hypertension status into the Preeclampsia_Risk_Score calculation (+20 if present)
5. THE Edge_AI_Module SHALL incorporate family history into the Preeclampsia_Risk_Score calculation (+10 if present)
6. THE Edge_AI_Module SHALL incorporate additional risk factors including first pregnancy (+4), multiple pregnancy (+8), diabetes (+10), previous C-section (+5), and abdominal pain (+8)
7. THE Edge_AI_Module SHALL output the Preeclampsia_Risk_Score as a percentage between 5 and 95 (capped at boundaries)
8. WHEN Preeclampsia_Risk_Score exceeds 70 percent, THE Midwife_App SHALL display a HIGH RISK indicator with red color coding
9. WHEN Preeclampsia_Risk_Score is between 40 and 70 percent, THE Midwife_App SHALL display a MODERATE RISK indicator with orange color coding
10. WHEN Preeclampsia_Risk_Score is below 40 percent, THE Midwife_App SHALL display a LOW RISK indicator with green color coding
11. **Phase 2 (Future)**: THE Edge_AI_Module SHALL enhance risk scoring with ML-based ultrasound feature extraction to improve accuracy

### Requirement 8: Triage Package Compilation and Security

**User Story:** As a healthcare system operator, I want patient data securely compiled and encrypted, so that privacy regulations are maintained throughout the workflow.

**Implementation Status:** 🔶 PARTIAL (Phase 1) - Visual encryption animation with localStorage storage, AES-256 pending

#### Acceptance Criteria

1. WHEN scanning and risk assessment complete, THE Edge_AI_Module SHALL compile a Triage_Package containing patient demographics, vital signs, selected Diagnostic_Frames, AI predictions, and metadata
2. **Phase 1 (Current)**: WHEN the midwife confirms Triage_Package completion, THE Midwife_App SHALL display "Lock & Encrypt" transaction overlay animation with security icons and progress indicators
3. **Phase 1 (Current)**: THE Midwife_App SHALL store Triage_Package in localStorage with transaction lock mechanism to prevent concurrent modifications
4. **Phase 2 (Future)**: THE Edge_AI_Module SHALL use AES-256 encryption for Triage_Package data before local storage
5. THE Edge_AI_Module SHALL generate a unique identifier for each Triage_Package
6. THE Triage_Package SHALL include timestamp information for all captured data

### Requirement 9: Asynchronous Upload with Cloud Backend

**User Story:** As a midwife, I want completed cases to automatically upload when connectivity is available, so that specialists can review them without manual intervention.

**Implementation Status:** ✅ FULLY IMPLEMENTED (Phase 1) - Manual sync trigger with Express API backend

#### Acceptance Criteria

1. WHEN network connectivity is available AND Sync_Queue contains pending Triage_Packages, THE Midwife_App SHALL display pending count in "Pending Uploads" action card
2. WHEN the midwife clicks "Pending Uploads" action card, THE Midwife_App SHALL initiate upload to the Cloud_Backend via REST API
3. WHEN upload begins, THE Midwife_App SHALL display transaction overlay with "Forwarding Scans" animation and progress messages
4. WHEN upload completes successfully, THE Midwife_App SHALL remove the Triage_Package from the Sync_Queue and display success toast message
5. WHEN upload fails, THE Midwife_App SHALL retain the Triage_Package in the Sync_Queue and display error message (Phase 1: basic error handling, Phase 2: exponential backoff retry)
6. THE Cloud_Backend SHALL acknowledge successful Triage_Package receipt and store data in JSON_Database (Phase 1) or PostgreSQL (Phase 2)

### Requirement 10: Backend Data Persistence and Processing

**User Story:** As a system architect, I want reliable data persistence and processing, so that the system scales efficiently and handles variable loads.

**Implementation Status:** ✅ FULLY IMPLEMENTED (Phase 1) - JSON file-based database with Express REST API

#### Acceptance Criteria

1. **Phase 1 (Current)**: WHEN the Cloud_Backend receives a Triage_Package, THE Cloud_Backend SHALL store it in the JSON_Database (`server/data/db.json`) for zero-compile compatibility
2. **Phase 1 (Current)**: THE Cloud_Backend SHALL provide REST API endpoints for patients (`/api/patients`), scans (`/api/scans`), notifications (`/api/notifications`), and AI classification (`/api/ai`)
3. **Phase 1 (Current)**: THE Cloud_Backend SHALL process Triage_Packages synchronously and mark them as available for specialist review
4. **Phase 2 (Future)**: THE Cloud_Backend SHALL use a message queue system (e.g., RabbitMQ, AWS SQS) that supports guaranteed delivery for asynchronous processing
5. **Phase 2 (Future)**: THE Cloud_Backend SHALL process Triage_Packages in the order they were received
6. **Phase 2 (Future)**: IF processing fails, THEN THE Cloud_Backend SHALL retry processing up to 3 times before marking as failed
7. **Phase 2 (Future)**: THE Cloud_Backend SHALL migrate from JSON_Database to PostgreSQL or MongoDB for production scalability

### Requirement 11: Specialist Dashboard Access and Authentication

**User Story:** As an OB-GYN specialist, I want secure access to the review dashboard, so that I can verify cases assigned to me.

**Implementation Status:** 🔶 PARTIAL (Phase 1) - Basic login screen without authentication backend

#### Acceptance Criteria

1. **Phase 1 (Current)**: THE Specialist_Dashboard SHALL be accessible at `/specialist` route and display login interface
2. **Phase 1 (Current)**: THE Specialist_Dashboard SHALL allow access without credential validation for MVP demonstration purposes
3. **Phase 2 (Future)**: THE Specialist_Dashboard SHALL require authentication with username and password before granting access
4. **Phase 2 (Future)**: WHEN a specialist provides valid credentials, THE Specialist_Dashboard SHALL grant access to the case review interface
5. **Phase 2 (Future)**: WHEN a specialist provides invalid credentials, THE Specialist_Dashboard SHALL deny access and display an error message
6. **Phase 2 (Future)**: THE Specialist_Dashboard SHALL maintain session security for up to 8 hours
7. **Phase 2 (Future)**: THE Specialist_Dashboard SHALL automatically log out inactive sessions after 30 minutes
8. **Phase 2 (Future)**: THE Specialist_Dashboard SHALL use secure HTTPS connections for all communications

### Requirement 12: Case Review Interface for Specialists

**User Story:** As an OB-GYN specialist, I want to efficiently review AI-selected frames and maternal data, so that I can verify diagnoses in under 60 seconds per case.

**Implementation Status:** ✅ FULLY IMPLEMENTED (Phase 1) - Complete specialist review interface with verdict submission

#### Acceptance Criteria

1. WHEN a specialist accesses the Specialist_Dashboard, THE Specialist_Dashboard SHALL display all Triage_Packages with status "Submitted" under "Pending Review" section
2. WHEN a specialist selects a case, THE Specialist_Dashboard SHALL display patient demographics, vital signs, Preeclampsia_Risk_Score, and selected Diagnostic_Frames
3. THE Specialist_Dashboard SHALL display Diagnostic_Frames in a review gallery with quality metadata
4. THE Specialist_Dashboard SHALL display simulated FetalCLIP classification results (Phase 1) or real FetalCLIP results (Phase 2) for each frame
5. THE Specialist_Dashboard SHALL provide controls for zooming and viewing ultrasound images
6. THE Specialist_Dashboard SHALL allow specialists to add text notes to the case via recommendation text field
7. WHEN a specialist completes review, THE Specialist_Dashboard SHALL allow selection of diagnostic verdict options including "Normal", "High Risk", or "Urgent Referral" via button group

### Requirement 13: Specialist Verification and Report Generation

**User Story:** As an OB-GYN specialist, I want to validate AI predictions and generate diagnostic reports, so that midwives receive expert guidance for patient care.

**Implementation Status:** ✅ FULLY IMPLEMENTED (Phase 1) - Full verdict submission with notification generation

#### Acceptance Criteria

1. WHEN a specialist submits a case verdict, THE Specialist_Dashboard SHALL generate a diagnostic report including specialist notes and recommendations via PATCH `/api/scans/:id/verify` endpoint
2. THE Specialist_Dashboard SHALL timestamp the diagnostic report with review completion time
3. THE Specialist_Dashboard SHALL include the specialist's name (currently "Dr. Duque" in Phase 1) and credentials in the report
4. WHEN a report is generated, THE Cloud_Backend SHALL store the report linked to the patient record in JSON_Database
5. WHEN a report is generated, THE Cloud_Backend SHALL mark the Triage_Package status as "Reviewed"
6. WHEN a report is generated, THE Cloud_Backend SHALL create a notification record for delivery to the Midwife_App with verdict, patient information, and specialist details

### Requirement 14: Notification and Result Delivery to Midwives

**User Story:** As a midwife, I want to receive specialist verification results, so that I can provide appropriate follow-up care to patients.

**Implementation Status:** ✅ FULLY IMPLEMENTED (Phase 1) - Notification polling with badge indicators

#### Acceptance Criteria

1. WHEN a specialist completes case verification, THE Cloud_Backend SHALL create a notification record via `/api/notifications` endpoint with patient ID, verdict, and specialist information
2. WHEN the Midwife_App is in Online Mode, THE Midwife_App SHALL poll for pending notifications every 8 seconds via GET `/api/notifications` endpoint
3. WHEN notifications are available, THE Midwife_App SHALL display a notification badge on the bell icon with the count of unread results
4. WHEN a midwife clicks the notification bell, THE Midwife_App SHALL navigate to `/notifications` route and display the complete list of notifications grouped by unread and read status
5. WHEN a midwife selects a notification, THE Midwife_App SHALL mark it as read via PATCH `/api/notifications/:id/read` and navigate to the patient details page showing the specialist's diagnostic report
6. THE Midwife_App SHALL cache notification data in localStorage for offline access to previously loaded notifications

### Requirement 15: Data Privacy Compliance

**User Story:** As a healthcare system administrator, I want the system to comply with Philippine Data Privacy Act 2012, so that patient data is legally protected.

**Implementation Status:** 🔶 PARTIAL (Phase 1) - Basic localStorage storage, full encryption and RBAC pending

#### Acceptance Criteria

1. **Phase 1 (Current)**: THE Midwife_App SHALL store patient data in browser localStorage with transaction lock mechanism to prevent concurrent access issues
2. **Phase 2 (Future)**: THE Midwife_App SHALL encrypt all patient data stored on the mobile device using AES-256 encryption
3. **Phase 2 (Future)**: THE Cloud_Backend SHALL encrypt all patient data at rest in JSON_Database or PostgreSQL using AES-256 encryption
4. **Phase 2 (Future)**: THE Cloud_Backend SHALL encrypt all data in transit using TLS 1.3 or higher via HTTPS
5. **Phase 2 (Future)**: THE Cloud_Backend SHALL implement role-based access control (RBAC) limiting data access to authorized personnel
6. **Phase 2 (Future)**: THE Cloud_Backend SHALL maintain audit logs of all data access operations including who accessed what data and when
7. **Phase 2 (Future)**: THE Cloud_Backend SHALL support patient data deletion requests within 30 days
8. **Phase 2 (Future)**: THE Specialist_Dashboard SHALL mask patient identity information in the interface unless explicitly revealed by the specialist

### Requirement 16: Model Deployment for Edge Devices

**User Story:** As a system operator, I want AI models optimized for mobile deployment, so that edge processing is performant on midwife devices.

**Implementation Status:** 🔶 NOT IMPLEMENTED (Phase 1) - No actual models deployed, full simulation mode

#### Acceptance Criteria

1. **Phase 1 (Current)**: THE Midwife_App SHALL simulate AI processing without deploying actual neural network models to demonstrate UX and workflow
2. **Phase 2 (Future)**: THE Edge_AI_Module SHALL use TensorFlow Lite or PyTorch Mobile for model deployment
3. **Phase 2 (Future)**: THE CNN_Guidance_Model SHALL have a model file size under 50 megabytes
4. **Phase 2 (Future)**: THE Frame_Selection_Model SHALL have a model file size under 100 megabytes
5. **Phase 2 (Future)**: THE Edge_AI_Module SHALL operate on devices with at least 2 gigabytes of RAM
6. **Phase 2 (Future)**: THE Edge_AI_Module SHALL complete full frame analysis within 500 milliseconds per frame on target hardware
7. **Phase 2 (Future)**: THE Edge_AI_Module SHALL support model updates delivered through the Cloud_Backend

### Requirement 17: Hardware Compatibility with DOH Equipment

**User Story:** As a deployment coordinator, I want the system to work with various DOH ultrasound equipment, so that existing infrastructure can be activated without new hardware purchases.

**Implementation Status:** 🔶 SIMULATED (Phase 1) - Camera fallback for ultrasound feed simulation

#### Acceptance Criteria

1. **Phase 1 (Current)**: THE Midwife_App SHALL use device camera (via `navigator.mediaDevices.getUserMedia`) as fallback for ultrasound feed simulation during scanning sessions
2. **Phase 1 (Current)**: WHEN camera access fails or is denied, THE Midwife_App SHALL display static ultrasound_sweep.png asset as visual placeholder
3. **Phase 2 (Future)**: THE Midwife_App SHALL support ultrasound probes using standard USB Video Class (UVC) protocol
4. **Phase 2 (Future)**: THE Midwife_App SHALL support ultrasound probes using Wi-Fi Direct connectivity
5. **Phase 2 (Future)**: THE Midwife_App SHALL detect and configure video stream resolution automatically
6. **Phase 2 (Future)**: THE Midwife_App SHALL support video frame rates between 15 and 60 frames per second
7. **Phase 2 (Future)**: WHEN a Probe uses a non-standard protocol, THE Midwife_App SHALL display a compatibility warning with instructions

### Requirement 18: Continuous Learning and Model Retraining

**User Story:** As an AI engineer, I want specialist annotations to feed back into model training, so that the system improves accuracy over time.

**Implementation Status:** 🔶 PARTIAL (Phase 1) - Verdict storage implemented, training pipeline not yet built

#### Acceptance Criteria

1. **Phase 1 (Current)**: WHEN a specialist completes case verification, THE Cloud_Backend SHALL store the specialist's diagnostic verdict linked to the scan record in JSON_Database
2. **Phase 2 (Future)**: THE Cloud_Backend SHALL maintain a training dataset combining Diagnostic_Frames with specialist annotations for model retraining
3. **Phase 2 (Future)**: THE Cloud_Backend SHALL support export of annotated training data for model retraining workflows
4. **Phase 2 (Future)**: THE Cloud_Backend SHALL track model prediction accuracy by comparing AI predictions to specialist verdicts
5. **Phase 2 (Future)**: THE Cloud_Backend SHALL generate monthly accuracy reports comparing Preeclampsia_Risk_Score to specialist findings

### Requirement 19: System Monitoring and Logging

**User Story:** As a system administrator, I want comprehensive logging of system operations, so that I can diagnose issues and monitor system health.

**Implementation Status:** 🔶 PARTIAL (Phase 1) - Console logging implemented, centralized logging system pending

#### Acceptance Criteria

1. **Phase 1 (Current)**: THE Midwife_App SHALL log major operations to browser console including patient registration, scan sessions, uploads, and sync events
2. **Phase 1 (Current)**: THE Cloud_Backend SHALL log API requests with basic console output including endpoints and timestamps
3. **Phase 2 (Future)**: THE Cloud_Backend SHALL log all API requests with timestamps, user identifiers, and response codes to centralized logging system
4. **Phase 2 (Future)**: THE Cloud_Backend SHALL log all Triage_Package processing events including queue entry, processing start, and completion
5. **Phase 2 (Future)**: THE Specialist_Dashboard SHALL log all specialist actions including case views, verdicts, and report generation
6. **Phase 2 (Future)**: THE Cloud_Backend SHALL aggregate logs in a centralized logging system (e.g., ELK stack, CloudWatch)
7. **Phase 2 (Future)**: THE Cloud_Backend SHALL retain logs for at least 90 days
8. **Phase 2 (Future)**: THE Cloud_Backend SHALL support log querying by date range, user identifier, and event type

### Requirement 20: Performance Benchmarks and Scalability

**User Story:** As a program manager, I want the system to handle the planned deployment scale, so that the national rollout succeeds.

**Implementation Status:** 🔶 BASELINE (Phase 1) - Single-server JSON database suitable for pilot deployment

#### Acceptance Criteria

1. **Phase 1 (Current)**: THE Cloud_Backend SHALL support basic concurrent connections for pilot deployment testing
2. **Phase 2 (Future)**: THE Cloud_Backend SHALL support at least 1000 concurrent Midwife_App connections
3. **Phase 2 (Future)**: THE Cloud_Backend SHALL process at least 500 Triage_Package uploads per hour
4. **Phase 2 (Future)**: THE Cloud_Backend SHALL deliver notifications to connected Midwife_Apps within 5 seconds of specialist report generation
5. **Phase 2 (Future)**: THE Specialist_Dashboard SHALL load case data within 2 seconds for cases under 50 megabytes
6. **Phase 2 (Future)**: THE Cloud_Backend SHALL maintain 99.5 percent uptime during operational hours
7. **Phase 2 (Future)**: THE Cloud_Backend SHALL scale horizontally to support increased load via load balancers and database replication

### Requirement 21: Bias Mitigation and Geographic Diversity

**User Story:** As an AI ethics officer, I want the models trained on geographically diverse data, so that the system performs equitably across different patient populations.

**Implementation Status:** 🔶 NOT APPLICABLE (Phase 1) - No AI models trained yet, will apply in Phase 2

#### Acceptance Criteria

1. **Phase 2 (Future)**: THE Cloud_Backend SHALL track the geographic origin of training data samples
2. **Phase 2 (Future)**: THE Cloud_Backend SHALL generate reports showing training data distribution by region
3. **Phase 2 (Future)**: THE Cloud_Backend SHALL flag model accuracy disparities across geographic regions
4. **Phase 2 (Future)**: THE Cloud_Backend SHALL support targeted data collection campaigns for underrepresented regions
5. **Phase 2 (Future)**: WHEN model accuracy for a region falls below 85 percent of the global average, THE Cloud_Backend SHALL trigger a data collection alert

### Requirement 22: Maternal BMI Accommodation

**User Story:** As a clinical researcher, I want the system to handle varying maternal BMI, so that the models account for this known accuracy constraint.

**Implementation Status:** 🔶 PARTIAL (Phase 1) - BMI tracking in place, BMI-specific model fine-tuning pending

#### Acceptance Criteria

1. **Phase 1 (Current)**: THE Edge_AI_Module SHALL record maternal Body Mass Index with each Triage_Package as part of patient vitals data
2. **Phase 1 (Current)**: THE Midwife_App SHALL compute BMI automatically from weight and height inputs during patient registration
3. **Phase 2 (Future)**: THE Cloud_Backend SHALL track model prediction accuracy segmented by BMI ranges
4. **Phase 2 (Future)**: WHEN maternal Body Mass Index exceeds 35, THE Midwife_App SHALL display a notice that image quality may be reduced
5. **Phase 2 (Future)**: THE Cloud_Backend SHALL generate accuracy reports comparing performance across BMI categories
6. **Phase 2 (Future)**: THE Cloud_Backend SHALL support BMI-specific model fine-tuning workflows

### Requirement 23: User Interface Localization

**User Story:** As a midwife in the Philippines, I want the interface in my preferred language, so that I can use the system effectively.

**Implementation Status:** 🔶 PARTIAL (Phase 1) - English-only MVP, Filipino localization pending

#### Acceptance Criteria

1. **Phase 1 (Current)**: THE Midwife_App SHALL support English language interface for all screens and components
2. **Phase 2 (Future)**: THE Midwife_App SHALL support Filipino (Tagalog) language interface
3. **Phase 2 (Future)**: THE Midwife_App SHALL allow language selection during initial setup
4. **Phase 2 (Future)**: THE Midwife_App SHALL persist language preference across sessions in localStorage
5. **Phase 2 (Future)**: THE Specialist_Dashboard SHALL support English language interface
6. **Phase 2 (Future)**: WHERE language preference is set to Filipino, THE Midwife_App SHALL display all interface text, buttons, and messages in Filipino

### Requirement 24: Ultrasound Frame Parser and Pretty Printer

**User Story:** As a developer, I want to parse and format ultrasound metadata, so that image data is correctly interpreted and stored.

**Implementation Status:** 🔶 SIMULATED (Phase 1) - Static metadata, parser/printer will be needed for real ultrasound data in Phase 2

#### Acceptance Criteria

1. **Phase 1 (Current)**: THE Edge_AI_Module SHALL store simulated metadata including timestamp, scan quality score, and frame references with each Triage_Package
2. **Phase 2 (Future)**: WHEN a Diagnostic_Frame is captured, THE Edge_AI_Module SHALL parse embedded DICOM or ultrasound-specific metadata including timestamp, probe settings, and image dimensions
3. **Phase 2 (Future)**: WHEN metadata parsing fails, THE Edge_AI_Module SHALL log an error and use default values
4. **Phase 2 (Future)**: THE Edge_AI_Module SHALL format parsed metadata into a standardized JSON structure
5. **Phase 2 (Future)**: FOR ALL valid parsed metadata, formatting then parsing then formatting SHALL produce an equivalent metadata structure (round-trip property)
6. **Phase 2 (Future)**: THE Edge_AI_Module SHALL validate that all required metadata fields are present before including a frame in the Triage_Package

### Requirement 25: Triage Package Parser and Pretty Printer

**User Story:** As a developer, I want to parse and format Triage_Package structures, so that data interchange between components is reliable.

**Implementation Status:** ✅ FULLY IMPLEMENTED (Phase 1) - JSON serialization/deserialization working across client-server

#### Acceptance Criteria

1. WHEN a Triage_Package is created, THE Edge_AI_Module SHALL serialize it into JSON format for storage and transmission
2. WHEN the Cloud_Backend receives a Triage_Package, THE Cloud_Backend SHALL parse it into structured data objects via Express JSON middleware
3. WHEN parsing fails due to invalid format, THE Cloud_Backend SHALL reject the Triage_Package and return an HTTP 400 error message
4. THE Cloud_Backend SHALL format Triage_Packages for specialist display in the Specialist_Dashboard using JSON response format
5. FOR ALL valid Triage_Packages, parsing then formatting then parsing SHALL produce an equivalent Triage_Package structure (round-trip property validated through localStorage and API calls)
6. **Phase 2 (Future)**: THE Cloud_Backend SHALL validate Triage_Package schema version compatibility before processing using JSON Schema validation

### Requirement 26: Demo Data Seeding System

**User Story:** As a developer, I want pre-populated demo patient data, so that stakeholders can evaluate the system workflow without manual data entry.

**Implementation Status:** ✅ FULLY IMPLEMENTED (Phase 1) - Seed patient system with Maria Santos Cruz and other demo cases

#### Acceptance Criteria

1. THE Cloud_Backend SHALL initialize demo patient data on server startup via seed script (`server/src/data/seed.js`)
2. THE Midwife_App SHALL provide access to seed patient data via `client/src/data/seedPatients.js` for offline fallback scenarios
3. THE seed data SHALL include at least 3 demo patients with varying risk profiles (high risk, moderate risk, low risk)
4. THE seed data SHALL include complete patient demographics, vitals, risk factors, and scan results for demonstration purposes
5. WHERE seed patient "Maria Santos Cruz" is used, THE Edge_AI_Module SHALL calibrate Preeclampsia_Risk_Score to exactly 78% for demo consistency
6. THE Cloud_Backend SHALL merge seed data with user-created patient records without duplication based on patient ID

### Requirement 27: Ultrasound Sweep Simulation Timer

**User Story:** As a midwife, I want timed guidance during ultrasound sweeps, so that I complete diagnostic-quality scans within the recommended timeframe.

**Implementation Status:** ✅ FULLY IMPLEMENTED (Phase 1) - 15-second sweep timer with dynamic guidance

#### Acceptance Criteria

1. WHEN a scanning session starts, THE Midwife_App SHALL display a circular progress indicator showing elapsed time during the sweep
2. THE Midwife_App SHALL target a 15-second sweep duration for optimal diagnostic frame collection
3. WHILE scanning is active, THE Midwife_App SHALL update elapsed time counter every 100 milliseconds
4. WHILE scanning is active, THE Midwife_App SHALL display SVG radial progress visualization around the "TAP TO START" button with strokeDashoffset calculation
5. THE Midwife_App SHALL fill frame thumbnail placeholders sequentially (1 frame approximately every 2.5 seconds during the 15-second sweep)
6. WHEN the sweep duration reaches 15 seconds, THE Midwife_App SHALL automatically complete the scan and display "Save" button
7. THE Midwife_App SHALL allow manual scan completion before the 15-second target if the midwife determines sufficient frames are collected
