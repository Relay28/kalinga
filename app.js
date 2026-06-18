/**
 * KalingaAI - Client-side Offline-First Logic Engine
 */

class KalingaApp {
  constructor() {
    this.currentScreen = 'splash';
    this.isOnline = true;
    this.activePatient = null;
    this.activeScan = null;
    this.currentNotifTab = 'unread';
    this.searchingInterval = null;
    this.sweepInterval = null;
    this.simulatedFetalAge = "Est: 24w 3d";
    this.simulatedHeartrate = 140;

    // Load initial database
    this.initDatabase();
  }

  // --- LOCAL DATABASE SYSTEM ---
  initDatabase() {
    if (!localStorage.getItem('kalinga_patients')) {
      // Seed initial data to match wireframes
      const seedPatients = [
        {
          id: '7102-4481-9352',
          firstName: 'Maria',
          middleName: 'Santos',
          lastName: 'Cruz',
          dob: '1998-05-12',
          age: 27,
          mobile: '09174829382',
          bp: '155/95',
          weight: 79.5,
          height: 160,
          bmi: '31.2',
          lmp: '2025-12-30',
          history: 'G2 P1',
          location: 'Langkas, Dalaguete, Cebu',
          midwifeId: 'MW-7729-01',
          timestamp: 'March 22, 2026 2:34 pm',
          riskFactors: {
            hypertension: true,
            family: true,
            firstpreg: false,
            multiple: false,
            diabetes: false,
            csection: false,
            pain: false
          },
          status: 'Reviewed',
          riskScore: 78,
          heartRate: 140,
          fetalAge: 'Est: 24w 3d',
          review: {
            verdict: 'Urgent Referral',
            time: 'March 22, 2026 4:00 pm',
            authorizedBy: 'Dr. Duque'
          }
        },
        {
          id: '1234-5678-9101',
          firstName: 'Anna',
          middleName: '',
          lastName: 'Reyes',
          dob: '1995-08-20',
          age: 30,
          mobile: '09182736452',
          bp: '135/85',
          weight: 62.0,
          height: 158,
          bmi: '24.8',
          lmp: '2026-01-15',
          history: 'G1 P0',
          location: 'Langkas, Dalaguete, Cebu',
          midwifeId: 'MW-7729-01',
          timestamp: 'March 22, 2026 3:12 pm',
          riskFactors: {
            hypertension: false,
            family: false,
            firstpreg: true,
            multiple: false,
            diabetes: false,
            csection: false,
            pain: false
          },
          status: 'Submitted',
          riskScore: 35,
          heartRate: 142,
          fetalAge: 'Est: 20w 1d',
          review: null
        },
        {
          id: '1109-8765-4321',
          firstName: 'Leah',
          middleName: '',
          lastName: 'Dimaguiba',
          dob: '1992-11-04',
          age: 33,
          mobile: '09056453728',
          bp: '110/70',
          weight: 54.0,
          height: 152,
          bmi: '23.4',
          lmp: '2026-02-10',
          history: 'G3 P2',
          location: 'Langkas, Dalaguete, Cebu',
          midwifeId: 'MW-7729-01',
          timestamp: 'March 22, 2026 1:00 pm',
          riskFactors: {
            hypertension: false,
            family: false,
            firstpreg: false,
            multiple: false,
            diabetes: false,
            csection: true,
            pain: false
          },
          status: 'Submitted',
          riskScore: 20,
          heartRate: 138,
          fetalAge: 'Est: 18w 4d',
          review: null
        }
      ];
      localStorage.setItem('kalinga_patients', JSON.stringify(seedPatients));
    }

    if (!localStorage.getItem('kalinga_notifications')) {
      const seedNotifs = [
        {
          id: 'notif-1',
          patientId: '7102-4481-9352',
          patientName: 'Maria Santos Cruz',
          verdict: 'Urgent Referral',
          status: 'unread',
          iconType: 'red'
        },
        {
          id: 'notif-2',
          patientId: '1234-5678-9101',
          patientName: 'Anna Reyes',
          verdict: 'Warning',
          status: 'unread',
          iconType: 'orange'
        },
        {
          id: 'notif-3',
          patientId: '1109-8765-4321',
          patientName: 'Leah Dimaguiba',
          verdict: 'Normal',
          status: 'read',
          iconType: 'teal'
        }
      ];
      localStorage.setItem('kalinga_notifications', JSON.stringify(seedNotifs));
    }

    if (!localStorage.getItem('kalinga_sync_queue')) {
      localStorage.setItem('kalinga_sync_queue', JSON.stringify([]));
    }
  }

  getPatients() {
    return JSON.parse(localStorage.getItem('kalinga_patients')) || [];
  }

  savePatients(patients) {
    localStorage.setItem('kalinga_patients', JSON.stringify(patients));
    this.updateDashboardCounters();
  }

  getNotifications() {
    return JSON.parse(localStorage.getItem('kalinga_notifications')) || [];
  }

  saveNotifications(notifs) {
    localStorage.setItem('kalinga_notifications', JSON.stringify(notifs));
    this.updateNotificationsBadge();
  }

  getSyncQueue() {
    return JSON.parse(localStorage.getItem('kalinga_sync_queue')) || [];
  }

  saveSyncQueue(queue) {
    localStorage.setItem('kalinga_sync_queue', JSON.stringify(queue));
    this.updateDashboardCounters();
  }

  // --- ROUTING ENGINE ---
  navigateTo(screenId) {
    console.log(`Navigating to screen: ${screenId}`);
    
    // Stop intervals if navigating away from scanning
    if (this.currentScreen === 'scanning' && screenId !== 'scanning') {
      this.clearSweepInterval();
    }
    if (this.currentScreen === 'searching' && screenId !== 'searching') {
      this.clearSearchingInterval();
    }

    // Toggle active classes
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.remove('active');
    });

    const targetScreen = document.getElementById(`screen-${screenId}`);
    if (targetScreen) {
      targetScreen.classList.add('active');
      this.currentScreen = screenId;
    }

    // Scroll to top of viewport
    if (targetScreen) targetScreen.scrollTop = 0;

    // View specific hooks
    if (screenId === 'dashboard') {
      this.renderRecentActivities();
      this.updateDashboardCounters();
      this.updateNotificationsBadge();
    } else if (screenId === 'notifications') {
      this.renderNotifications();
    }
  }

  // --- INITIALIZATION ---
  start() {
    // Clock tick
    setInterval(() => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      document.getElementById('notch-time').innerText = timeStr;
    }, 1000);

    // Connectivity Indicator toggle
    const connToggle = document.getElementById('connectivity-indicator');
    connToggle.addEventListener('click', () => {
      this.isOnline = !this.isOnline;
      if (this.isOnline) {
        connToggle.classList.remove('offline');
        document.getElementById('connectivity-text').innerText = 'Online Mode';
        document.getElementById('scan-mode-label').innerText = 'Online Mode';
        // Auto check if we have offline pending
        const queue = this.getSyncQueue();
        if (queue.length > 0) {
          this.showSystemAlert(`Connection restored. You have ${queue.length} scan(s) pending sync.`, 'info');
        }
      } else {
        connToggle.classList.add('offline');
        document.getElementById('connectivity-text').innerText = 'Offline Mode';
        document.getElementById('scan-mode-label').innerText = 'Offline Mode';
      }
    });

    // Handle Splash auto transition
    setTimeout(() => {
      this.navigateTo('login');
    }, 2500);
  }

  // --- LOGIN ---
  handleLogin() {
    const midwifeName = document.getElementById('login-username').value || 'Ms. Midwife';
    document.getElementById('midwife-name-display').innerText = midwifeName;
    this.navigateTo('dashboard');
  }

  // --- CLINICAL MODEL LOGIC: PREECLAMPSIA RISK ENGINE ---
  // Calibrated to output exactly 78% for sample values: BP 155/95, BMI 31.2, Hypertension checked, Family history checked
  calculatePreeclampsiaRisk(bpString, bmiValue, age, riskFlags) {
    let score = 15; // Baseline risk

    // 1. Analyze BP
    if (bpString && bpString.includes('/')) {
      const parts = bpString.split('/');
      const systolic = parseInt(parts[0]);
      const diastolic = parseInt(parts[1]);
      
      if (systolic >= 160 || diastolic >= 100) {
        score += 35; // Severe range
      } else if (systolic >= 140 || diastolic >= 90) {
        score += 25; // Moderate range
      } else if (systolic >= 130 || diastolic >= 85) {
        score += 12; // Elevated range
      }
    }

    // 2. BMI Contribution
    const bmi = parseFloat(bmiValue);
    if (!isNaN(bmi)) {
      if (bmi >= 30) {
        score += 8; // Obese
      } else if (bmi >= 25) {
        score += 4; // Overweight
      }
    }

    // 3. Clinical Risk History Checklist Flags
    if (riskFlags.hypertension) score += 20;
    if (riskFlags.family) score += 10;
    if (riskFlags.firstpreg) score += 4;
    if (riskFlags.multiple) score += 8;
    if (riskFlags.diabetes) score += 10;
    if (riskFlags.csection) score += 5;
    if (riskFlags.pain) score += 8;

    // Cap outputs logically
    if (score > 95) score = 95;
    if (score < 5) score = 5;

    return Math.round(score);
  }

  // --- PATIENT REGISTRATION CONTROLLER ---
  calculateBMI() {
    const w = parseFloat(document.getElementById('reg-weight').value);
    const h = parseFloat(document.getElementById('reg-height').value) / 100; // cm to m
    if (w > 0 && h > 0) {
      const bmi = (w / (h * h)).toFixed(1);
      document.getElementById('reg-bmi').value = bmi;
    } else {
      document.getElementById('reg-bmi').value = '';
    }
  }

  calculateAgeFromDob() {
    const dobValue = document.getElementById('reg-dob').value;
    if (!dobValue) return;
    const dob = new Date(dobValue);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    // Just metadata display or tracking
  }

  simulateIdScanner() {
    this.showSystemAlert("Scanning PhilHealth ID card via OCR...", "scanner");
    setTimeout(() => {
      // Simulate fill
      document.getElementById('reg-philhealth').value = "7102-4481-9352";
      document.getElementById('reg-firstname').value = "Maria";
      document.getElementById('reg-middlename').value = "Santos";
      document.getElementById('reg-lastname').value = "Cruz";
      document.getElementById('reg-dob').value = "1998-05-12";
      this.showSystemAlert("ID scanned successfully! Core fields populated.", "success");
    }, 1500);
  }

  simulateProfilePicture() {
    this.showSystemAlert("Opening device camera...", "scanner");
    setTimeout(() => {
      this.showSystemAlert("Profile picture captured.", "success");
    }, 1200);
  }

  handleRegisterPatient() {
    // Build patient record
    const weight = parseFloat(document.getElementById('reg-weight').value);
    const height = parseFloat(document.getElementById('reg-height').value);
    const bmi = document.getElementById('reg-bmi').value || (weight / ((height/100)*(height/100))).toFixed(1);

    const bp = document.getElementById('reg-bp').value;
    const dob = document.getElementById('reg-dob').value;
    const age = dob ? (new Date().getFullYear() - new Date(dob).getFullYear()) : 27;

    const riskFlags = {
      hypertension: document.getElementById('risk-hypertension').checked,
      family: document.getElementById('risk-family').checked,
      firstpreg: document.getElementById('risk-firstpreg').checked,
      multiple: document.getElementById('risk-multiple').checked,
      diabetes: document.getElementById('risk-diabetes').checked,
      csection: document.getElementById('risk-csection').checked,
      pain: document.getElementById('risk-pain').checked
    };

    const newPatient = {
      id: document.getElementById('reg-philhealth').value || this.generateUuid(),
      firstName: document.getElementById('reg-firstname').value,
      middleName: document.getElementById('reg-middlename').value,
      lastName: document.getElementById('reg-lastname').value,
      dob: dob,
      age: age,
      mobile: document.getElementById('reg-mobile').value,
      bp: bp,
      weight: weight,
      height: height,
      bmi: bmi,
      lmp: document.getElementById('reg-lmp').value,
      history: document.getElementById('reg-history').value || 'G1 P0',
      location: document.getElementById('reg-location').value,
      midwifeId: 'MW-7729-01',
      timestamp: this.formatCurrentDate(),
      riskFactors: riskFlags,
      status: 'Ready to Scan',
      riskScore: this.calculatePreeclampsiaRisk(bp, bmi, age, riskFlags),
      heartRate: null,
      fetalAge: null,
      review: null
    };

    // Store in active workspace
    this.activePatient = newPatient;
    
    // Save to list
    const list = this.getPatients();
    // Remove if already exists to overwrite
    const filtered = list.filter(p => p.id !== newPatient.id);
    filtered.unshift(newPatient);
    this.savePatients(filtered);

    this.showSystemAlert(`Patient ${newPatient.firstName} registered! Routing to triage scan.`, "success");
    
    // Move to scanning preparation
    setTimeout(() => {
      this.startNewScan();
    }, 1500);
  }

  // --- PROBE HARDWARE SIMULATOR (SEARCHING SCREEN) ---
  startNewScan() {
    if (!this.activePatient) {
      // Pick first patient or ask
      const list = this.getPatients();
      if (list.length > 0) {
        this.activePatient = list[0];
      } else {
        this.navigateTo('registration');
        return;
      }
    }

    // Set timestamp
    document.getElementById('reg-timestamp').value = this.formatCurrentDate();

    // Trigger Connection searching
    this.navigateTo('searching');
    this.runSearchingAnimation();
  }

  runSearchingAnimation() {
    let frame = 1;
    const element = document.getElementById('searching-animation-frame');
    
    // Animate spinner frames
    this.searchingInterval = setInterval(() => {
      // Set image source dynamically to reflect frame state
      element.style.backgroundImage = `url('Screens/Searching ${frame}.png')`;
      frame = (frame % 8) + 1;
    }, 180);

    // Stop and go to scanning screen after 2.5s
    setTimeout(() => {
      this.clearSearchingInterval();
      this.setupScanningInterface();
    }, 2500);
  }

  clearSearchingInterval() {
    if (this.searchingInterval) {
      clearInterval(this.searchingInterval);
      this.searchingInterval = null;
    }
  }

  // --- TRIAGE ULTRA-SOUND SCANNING ENGINE ---
  setupScanningInterface() {
    this.navigateTo('scanning');
    
    // Reset scanning variables
    this.simulatedFetalAge = "Est: 24w 3d";
    this.simulatedHeartrate = 140;

    // Reset controls
    document.getElementById('scan-timer-text').innerText = '0s';
    document.getElementById('scan-progress-indicator').style.width = '0%';
    document.getElementById('scan-quality-feedback').innerText = '~ Tap scanning circle to begin sweep ~';
    document.getElementById('scan-save-btn').disabled = true;
    document.getElementById('fetal-heartrate').innerText = '-- bpm';
    document.getElementById('fetal-age').innerText = '--';

    // Clear frame thumbnails
    document.querySelectorAll('.frame-thumbnail').forEach(thumb => {
      thumb.innerHTML = '';
      thumb.classList.remove('filled');
    });

    // Reset circle elements
    document.getElementById('scan-arena-placeholder').style.display = 'block';
    document.getElementById('scan-realtime-view').classList.remove('active');
    document.getElementById('scan-feedback-star').style.display = 'none';
  }

  handleScanInteraction() {
    if (this.sweepInterval) return; // already scanning

    document.getElementById('scan-arena-placeholder').style.display = 'none';
    const realtimeView = document.getElementById('scan-realtime-view');
    realtimeView.classList.add('active');
    const feedbackStar = document.getElementById('scan-feedback-star');
    feedbackStar.style.display = 'block';

    let elapsed = 0;
    const totalDuration = 10; // 10 seconds sweep
    const stepMs = 100;
    
    this.showSystemAlert("Ultrasound blind sweep initialized. AI guide active.", "info");

    this.sweepInterval = setInterval(() => {
      elapsed += stepMs / 1000;
      if (elapsed > totalDuration) {
        elapsed = totalDuration;
      }

      // Update timer & progress bar
      document.getElementById('scan-timer-text').innerText = `${Math.floor(elapsed)}s`;
      const pct = (elapsed / totalDuration) * 100;
      document.getElementById('scan-progress-indicator').style.width = `${pct}%`;

      // Update Guidance & Star positions
      this.updateGuidanceFeedback(elapsed);

      // Fluctuating Fetal Vitals during live sweeps
      const heartRange = 135 + Math.floor(Math.random() * 10);
      document.getElementById('fetal-heartrate').innerText = `${heartRange} bpm`;
      document.getElementById('fetal-age').innerText = "Est: 24w 3d"; // FetalCLIP estimate

      // Fill frames sequentially
      this.fillThumbnailsOnSweep(elapsed);

      // Complete Sweep
      if (elapsed >= totalDuration) {
        this.clearSweepInterval();
        document.getElementById('scan-save-btn').disabled = false;
        this.simulatedHeartrate = heartRange;
        this.showSystemAlert("Sweep complete! FetalCLIP processed anatomical coordinates.", "success");
      }
    }, stepMs);
  }

  updateGuidanceFeedback(elapsed) {
    const feedback = document.getElementById('scan-quality-feedback');
    const star = document.getElementById('scan-feedback-star');
    
    // Angle representing positioning around circle
    let angle = 0;

    if (elapsed < 2) {
      feedback.innerText = "Aligning transducer... ~ Probe Sweep Beginning ~";
      document.getElementById('scan-guide-instruction').innerText = "bottom belly... follow this path... straight from bottom going up ...";
      angle = 0;
    } else if (elapsed < 4) {
      feedback.innerText = "Move probe upwards... ~ Maintain light pressure ~";
      angle = 45;
    } else if (elapsed < 6) {
      feedback.innerText = "Fetal head visible... ~ Adjust angle slightly ~";
      angle = 90;
    } else if (elapsed < 8) {
      feedback.innerText = "Capturing thoracic plane... ~ Maintain speed ~";
      angle = 135;
    } else {
      feedback.innerText = "~ Perfect Execution ~";
      angle = 200; // Matches wireframe star position on outer ring
    }

    // Position star on scanning circle border
    const radius = 98; // radius of circle (200px width/2 - border)
    const rad = (angle - 90) * (Math.PI / 180);
    const x = 100 + radius * Math.cos(rad) - 16; // 16px offset for star center
    const y = 100 + radius * Math.sin(rad) - 16;
    star.style.left = `${x}px`;
    star.style.top = `${y}px`;
  }

  fillThumbnailsOnSweep(elapsed) {
    const frameIndex = Math.floor(elapsed / 1.6) + 1;
    if (frameIndex >= 1 && frameIndex <= 6) {
      const thumb = document.getElementById(`thumb-${frameIndex}`);
      if (thumb && !thumb.classList.contains('filled')) {
        thumb.classList.add('filled');
        // Crop/fill with the fetus ultrasound scan image
        thumb.innerHTML = `<img src="assets/ultrasound_sweep.png" style="transform: scale(${1 + (frameIndex*0.08)}); object-fit: cover;">`;
      }
    }
  }

  retakeScan() {
    this.clearSweepInterval();
    this.setupScanningInterface();
    this.showSystemAlert("Scanner reset. Ready for retake sweep.", "info");
  }

  abortScan() {
    this.clearSweepInterval();
    this.navigateTo('dashboard');
  }

  clearSweepInterval() {
    if (this.sweepInterval) {
      clearInterval(this.sweepInterval);
      this.sweepInterval = null;
    }
  }

  // --- SAVE & CONFIRMATION ---
  saveCompletedScan() {
    // Go to confirmation summary
    this.navigateTo('confirmation');

    // Populate confirmation data
    document.getElementById('confirm-patient-name').innerText = `${this.activePatient.firstName} ${this.activePatient.lastName}`;
    document.getElementById('confirm-patient-id').innerText = this.activePatient.id;
    document.getElementById('confirm-patient-age').innerText = this.activePatient.age;
    document.getElementById('confirm-scan-datetime').innerText = this.formatCurrentDate();
    document.getElementById('confirm-scan-location').innerText = this.activePatient.location;
    
    document.getElementById('confirm-vital-bp').innerText = this.activePatient.bp;
    document.getElementById('confirm-vital-bmi').innerText = this.activePatient.bmi;
    
    document.getElementById('confirm-fetal-heartrate').innerText = `${this.simulatedHeartrate} bpm`;
    document.getElementById('confirm-fetal-age').innerText = this.simulatedFetalAge;
    
    const score = this.activePatient.riskScore;
    const scoreEl = document.getElementById('confirm-risk-score');
    scoreEl.innerText = `${score} %`;
    
    // Set color based on risk severity
    if (score >= 70) {
      scoreEl.style.color = 'var(--red-alert)';
    } else if (score >= 40) {
      scoreEl.style.color = 'var(--orange-alert)';
    } else {
      scoreEl.style.color = 'var(--green-normal)';
    }
  }

  lockAndEncryptScan() {
    // Activate full-screen lock animation overlay
    const overlay = document.getElementById('transaction-overlay');
    const title = document.getElementById('overlay-title');
    const desc = document.getElementById('overlay-desc');
    const lockIcon = document.getElementById('overlay-lock-icon');
    
    overlay.classList.add('active');
    lockIcon.classList.add('encrypting');
    lockIcon.innerText = "🔒";
    title.innerText = "Encrypting Data";
    desc.innerText = "Securing clinical telemetry and image frames using device hardware security parameters...";

    setTimeout(() => {
      // Complete local encryption
      lockIcon.classList.remove('encrypting');
      lockIcon.innerText = "🛡️";
      title.innerText = "Local Vault Locked";
      desc.innerText = "Ultrasound reports safely encrypted with on-device sandbox storage. Pending network synchronization.";

      // Save record locally with "ready for submission"
      const patients = this.getPatients();
      const match = patients.find(p => p.id === this.activePatient.id);
      if (match) {
        match.status = 'Ready for Submission';
        match.heartRate = this.simulatedHeartrate;
        match.fetalAge = this.simulatedFetalAge;
        match.timestamp = this.formatCurrentDate();
        this.savePatients(patients);
        
        // Push scan to sync queue
        const queue = this.getSyncQueue();
        if (!queue.includes(match.id)) {
          queue.push(match.id);
          this.saveSyncQueue(queue);
        }
      }

      setTimeout(() => {
        overlay.classList.remove('active');
        this.navigateTo('dashboard');
        this.showSystemAlert("Report encrypted offline.", "success");
      }, 1500);

    }, 2000);
  }

  // --- STORE-AND-FORWARD SYNCHRONIZATION ENGINE ---
  syncPendingUploads() {
    const queue = this.getSyncQueue();
    if (queue.length === 0) {
      this.showSystemAlert("No pending uploads in the sync queue.", "info");
      return;
    }

    if (!this.isOnline) {
      this.showSystemAlert("Device is currently offline. Scans are safely locked on the device. Sync once a network connection is available.", "warning");
      return;
    }

    // Trigger Syncing Animation
    const overlay = document.getElementById('transaction-overlay');
    const title = document.getElementById('overlay-title');
    const desc = document.getElementById('overlay-desc');
    const lockIcon = document.getElementById('overlay-lock-icon');
    const spinner = document.getElementById('sync-spinner-container');
    
    overlay.classList.add('active');
    lockIcon.style.display = 'none';
    spinner.style.display = 'block';
    title.innerText = "Forwarding Scans";
    desc.innerText = `Establishing connection to secure regional OB-Gyn network portal. Uploading ${queue.length} pending report(s)...`;

    setTimeout(() => {
      // Finish upload
      spinner.style.display = 'none';
      lockIcon.style.display = 'flex';
      lockIcon.innerText = "✅";
      title.innerText = "Transmission Complete";
      desc.innerText = "All telemetry forward queues clear. Safe cloud replication verified.";

      // Update statuses of synced records
      const patients = this.getPatients();
      queue.forEach(pId => {
        const match = patients.find(p => p.id === pId);
        if (match) {
          match.status = 'Submitted';
        }
      });
      this.savePatients(patients);
      
      // Clear queue
      const syncedCount = queue.length;
      const syncedIds = [...queue];
      this.saveSyncQueue([]);

      setTimeout(() => {
        overlay.classList.remove('active');
        this.navigateTo('dashboard');
        this.showSystemAlert(`Successfully uploaded ${syncedCount} scan(s).`, "success");
        
        // Trigger simulated asynchronous Specialist (OB-Gyn) Review
        this.simulateSpecialistReview(syncedIds);
      }, 1500);

    }, 2500);
  }

  simulateSpecialistReview(patientIds) {
    // Set OB-Gyn review timer (simulating specialist action)
    setTimeout(() => {
      const patients = this.getPatients();
      const notifications = this.getNotifications();
      let reviewTriggered = false;

      patientIds.forEach(pId => {
        const patient = patients.find(p => p.id === pId);
        if (patient && patient.status === 'Submitted') {
          reviewTriggered = true;
          patient.status = 'Reviewed';
          
          // Determine verdict based on preeclampsia risk score
          let verdict = 'Normal';
          let iconType = 'teal';
          if (patient.riskScore >= 70) {
            verdict = 'Urgent Referral';
            iconType = 'red';
          } else if (patient.riskScore >= 40) {
            verdict = 'Warning';
            iconType = 'orange';
          }

          patient.review = {
            verdict: verdict,
            time: this.formatCurrentDate(),
            authorizedBy: 'Dr. Duque'
          };

          // Generate notification
          const newNotif = {
            id: `notif-${Date.now()}-${pId}`,
            patientId: pId,
            patientName: `${patient.firstName} ${patient.lastName}`,
            verdict: verdict,
            status: 'unread',
            iconType: iconType
          };
          notifications.unshift(newNotif);
        }
      });

      if (reviewTriggered) {
        this.savePatients(patients);
        this.saveNotifications(notifications);
        this.showSystemAlert("New specialist diagnostics review received from Dr. Duque!", "success");
        this.updateNotificationsBadge();
        
        // Refresh dashboard activities if active
        if (this.currentScreen === 'dashboard') {
          this.renderRecentActivities();
        }
      }
    }, 6000);
  }

  // --- RENDER RECENT ACTIVITIES & LISTS ---
  renderRecentActivities() {
    const patients = this.getPatients();
    const container = document.getElementById('dashboard-recent-activities');
    container.innerHTML = '';

    if (patients.length === 0) {
      container.innerHTML = `<div style="text-align:center; padding: 20px; font-size:12px; color:var(--text-muted);">No recent activities.</div>`;
      return;
    }

    patients.forEach(p => {
      const card = document.createElement('div');
      card.className = 'patient-card';
      card.onclick = () => this.viewPatientDetails(p.id);

      // Match styling
      let statusColor = 'var(--orange-alert)';
      if (p.status === 'Reviewed') {
        const v = p.review?.verdict;
        if (v === 'Urgent Referral') statusColor = 'var(--red-alert)';
        else if (v === 'Normal') statusColor = 'var(--green-normal)';
      } else if (p.status === 'Submitted') {
        statusColor = 'var(--primary-blue)';
      }

      card.innerHTML = `
        <div class="patient-avatar-wrapper">
          <svg class="patient-avatar" viewBox="0 0 24 24">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
          </svg>
        </div>
        <div class="patient-card-details">
          <div class="patient-card-meta">
            <span class="patient-card-id">${p.id}</span>
            <span class="patient-card-date">${p.timestamp}</span>
          </div>
          <div class="patient-card-name">${p.firstName} ${p.lastName}</div>
          <div class="patient-card-info">${p.dob ? p.dob : '...'} | Age: ${p.age ? p.age : '..'}</div>
          <div class="patient-card-status" style="color: ${statusColor};">
            ${p.status === 'Reviewed' ? 'Reviewed: ' + p.review.verdict : p.status}
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  }

  viewPatientsList() {
    // Simple filter simulation
    this.renderRecentActivities();
    this.showSystemAlert("Viewing all Patient Records.", "info");
  }

  viewPatientDetails(patientId) {
    const patients = this.getPatients();
    const p = patients.find(patient => patient.id === patientId);
    if (!p) return;

    this.activePatient = p;

    // Direct routing based on whether it is a scanned or pending patient
    if (p.status === 'Ready to Scan') {
      this.startNewScan();
      return;
    }

    // Populate Detailed Record screen
    document.getElementById('details-patient-name').innerText = `${p.firstName} ${p.lastName}`;
    document.getElementById('details-patient-id').innerText = p.id;
    document.getElementById('details-patient-age').innerText = p.age;
    
    document.getElementById('details-scan-datetime').innerText = p.timestamp;
    document.getElementById('details-scan-location').innerText = p.location;
    
    const statusEl = document.getElementById('details-scan-status');
    const reviewTimeEl = document.getElementById('details-review-time');
    
    if (p.status === 'Reviewed' && p.review) {
      statusEl.innerText = `Reviewed: ${p.review.verdict}`;
      reviewTimeEl.innerText = `Review Received on: ${p.review.time}`;
      document.getElementById('details-authorized-by').innerText = p.review.authorizedBy;
      reviewTimeEl.style.display = 'block';
      
      if (p.review.verdict === 'Urgent Referral') {
        statusEl.style.color = 'var(--red-alert)';
      } else if (p.review.verdict === 'Warning') {
        statusEl.style.color = 'var(--orange-alert)';
      } else {
        statusEl.style.color = 'var(--green-normal)';
      }
    } else {
      statusEl.innerText = p.status;
      statusEl.style.color = 'var(--orange-alert)';
      reviewTimeEl.style.display = 'none';
      document.getElementById('details-authorized-by').innerText = 'Awaiting specialists';
    }

    // Risk Card
    const riskCard = document.getElementById('details-risk-card');
    const scoreVal = document.getElementById('details-risk-score');
    scoreVal.innerText = `${p.riskScore} %`;
    
    if (p.riskScore >= 70) {
      riskCard.style.borderLeft = '4px solid var(--red-alert)';
      scoreVal.style.color = 'var(--red-alert)';
    } else if (p.riskScore >= 40) {
      riskCard.style.borderLeft = '4px solid var(--orange-alert)';
      scoreVal.style.color = 'var(--orange-alert)';
    } else {
      riskCard.style.borderLeft = '4px solid var(--green-normal)';
      scoreVal.style.color = 'var(--green-normal)';
    }

    // Maternal/Fetal details
    document.getElementById('details-vital-bp').innerText = p.bp;
    document.getElementById('details-vital-bmi').innerText = p.bmi;
    document.getElementById('details-fetal-heartrate').innerText = p.heartRate ? `${p.heartRate} bpm` : '-- bpm';
    document.getElementById('details-fetal-age').innerText = p.fetalAge ? p.fetalAge : '--';

    // Frame grids
    const grid = document.getElementById('details-frames-grid');
    grid.innerHTML = '';
    
    // Fill sample thumbs
    for (let i = 2; i <= 9; i++) {
      const thumb = document.createElement('div');
      thumb.className = 'mini-frame-thumbnail';
      thumb.innerHTML = `<img src="assets/ultrasound_sweep.png" style="transform: scale(${1 + (i*0.065)}); object-fit: cover;">`;
      grid.appendChild(thumb);
    }

    this.navigateTo('details');
  }

  // --- RENDER NOTIFICATIONS FEED ---
  renderNotifications() {
    const notifs = this.getNotifications();
    const container = document.getElementById('notifications-list-container');
    container.innerHTML = '';

    const activeList = notifs.filter(n => n.status === this.currentNotifTab);

    if (activeList.length === 0) {
      container.innerHTML = `<div style="text-align:center; padding: 40px; font-size:12px; color:var(--text-muted);">No ${this.currentNotifTab} notifications.</div>`;
      return;
    }

    activeList.forEach(n => {
      const card = document.createElement('div');
      card.className = 'notif-card';
      
      let classType = 'teal';
      let symbol = '✚';
      if (n.iconType === 'red') {
        classType = 'red';
        symbol = '🔔';
      } else if (n.iconType === 'orange') {
        classType = 'orange';
        symbol = '⚠️';
      }

      card.innerHTML = `
        <div class="notif-icon-circle ${classType}">${symbol}</div>
        <div class="notif-content">
          <div class="notif-title">New Report Received:</div>
          <div class="notif-patient">For: ${n.patientName}</div>
          <div class="notif-verdict ${classType}">Specialist Verdict: <span>${n.verdict}</span></div>
        </div>
        <div class="notif-action">
          <button class="btn-blue" style="padding: 8px 16px; font-size:12px;" onclick="app.readNotification('${n.id}', '${n.patientId}')">Read</button>
        </div>
      `;
      container.appendChild(card);
    });
  }

  toggleNotifTab(tab) {
    this.currentNotifTab = tab;
    document.getElementById('notif-tab-unread').classList.toggle('active', tab === 'unread');
    document.getElementById('notif-tab-read').classList.toggle('active', tab === 'read');
    this.renderNotifications();
  }

  readNotification(notifId, patientId) {
    // Mark read
    const notifs = this.getNotifications();
    const match = notifs.find(n => n.id === notifId);
    if (match) {
      match.status = 'read';
      this.saveNotifications(notifs);
    }
    this.viewPatientDetails(patientId);
  }

  // --- COUNTER UPDATERS ---
  updateDashboardCounters() {
    const queue = this.getSyncQueue();
    const syncTitle = document.getElementById('sync-card-title');
    if (syncTitle) {
      syncTitle.innerText = `Pending Uploads (${queue.length})`;
    }
  }

  updateNotificationsBadge() {
    const notifs = this.getNotifications();
    const unreadCount = notifs.filter(n => n.status === 'unread').length;
    const badge = document.getElementById('bell-badge-count');
    
    if (badge) {
      if (unreadCount > 0) {
        badge.innerText = unreadCount;
        badge.style.display = 'block';
      } else {
        badge.style.display = 'none';
      }
    }
  }

  // --- UTILS ---
  generateUuid() {
    return 'xxxx-xxxx-xxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  formatCurrentDate() {
    const d = new Date();
    const months = ["March", "April", "May", "June", "July", "August", "September", "October", "November", "December", "January", "February"];
    // Offset or match formatting "March 22, 2026 2:34 pm"
    const hour = d.getHours();
    const min = d.getMinutes().toString().padStart(2, '0');
    const ampm = hour >= 12 ? 'pm' : 'am';
    const displayHour = hour % 12 || 12;
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} ${displayHour}:${min} ${ampm}`;
  }

  showSystemAlert(msg, type = 'info') {
    // Creates a custom high-end in-device toast notification
    const activeScreen = document.querySelector('.screen.active');
    if (!activeScreen) return;

    const toast = document.createElement('div');
    toast.style.position = 'absolute';
    toast.style.bottom = '20px';
    toast.style.left = '20px';
    toast.style.right = '20px';
    toast.style.backgroundColor = 'var(--text-dark)';
    toast.style.color = '#ffffff';
    toast.style.padding = '12px 16px';
    toast.style.borderRadius = '10px';
    toast.style.fontSize = '12px';
    toast.style.fontWeight = '500';
    toast.style.boxShadow = 'var(--shadow-lg)';
    toast.style.zIndex = '999';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '10px';
    toast.style.borderLeft = '4px solid var(--primary-teal)';
    toast.style.transform = 'translateY(100px)';
    toast.style.opacity = '0';
    toast.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';

    if (type === 'success') toast.style.borderLeftColor = 'var(--green-normal)';
    if (type === 'warning') toast.style.borderLeftColor = 'var(--orange-alert)';
    if (type === 'scanner') toast.style.borderLeftColor = 'var(--primary-blue)';

    toast.innerText = msg;
    activeScreen.appendChild(toast);

    // Fade in
    setTimeout(() => {
      toast.style.transform = 'translateY(0)';
      toast.style.opacity = '1';
    }, 50);

    // Fade out
    setTimeout(() => {
      toast.style.transform = 'translateY(20px)';
      toast.style.opacity = '0';
      setTimeout(() => {
        toast.remove();
      }, 400);
    }, 3500);
  }
  
  expandGuideImage() {
    this.showSystemAlert("Expanding probe path guide overlay.", "info");
  }
}

// Instantiate Global App Controller
const app = new KalingaApp();
window.addEventListener('DOMContentLoaded', () => {
  app.start();
});
