import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, CheckCircle, AlertTriangle, Play, HelpCircle, HardDrive, Wifi } from 'lucide-react';
import { aiService } from '../services/aiService';

export default function ScanSimulator({ isOnline, activePatient, setActiveScan, showToast }) {
  const navigate = useNavigate();
  const [timeStr, setTimeStr] = useState('09:41');

  // Connection states
  const [isSearching, setIsSearching] = useState(true);
  const [searchFrame, setSearchFrame] = useState(1);

  // Scanner states
  const [scanStatus, setScanStatus] = useState('idle'); // 'idle', 'scanning', 'completed'
  const [elapsed, setElapsed] = useState(0);
  const [guidanceText, setGuidanceText] = useState('~ Position probe and press start to begin sweep ~');
  const [heartrate, setHeartrate] = useState('-- bpm');
  const [gestAge, setGestAge] = useState('--');
  const [collectedCount, setCollectedCount] = useState(0);
  const [showFlash, setShowFlash] = useState(false);
  const frameTimeoutsRef = useRef([]);

  // Video streams
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [showCameraError, setShowCameraError] = useState(false);
  const videoRef = useRef(null);
  const ekgCanvasRef = useRef(null);

  // Patient context defaults
  const patient = activePatient || {
    id: '7102-4481-9352',
    firstName: 'Maria',
    lastName: 'Cruz',
    bp: '155/95',
    bmi: '31.2',
    age: 27,
    lmp: '2025-12-30',
    location: 'Langkas, Dalaguete, Cebu',
    riskFactors: { hypertension: true, family: true }
  };

  // Time tracker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Animated EKG/Ultrasound Waveform loop
  useEffect(() => {
    if (scanStatus !== 'scanning') {
      if (ekgCanvasRef.current) {
        const ctx = ekgCanvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, ekgCanvasRef.current.width, ekgCanvasRef.current.height);
      }
      return;
    }
    const canvas = ekgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    let points = [];
    const maxPoints = 60;
    let index = 0;

    const animate = () => {
      ctx.fillStyle = '#020617'; // Match dark EKG canvas bg
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = '#1bb2a4'; // Teal glowing line
      ctx.lineWidth = 2;
      ctx.beginPath();

      // Simulates real-time clinical EKG heartbeat peaks
      let val = canvas.height / 2;
      const step = index % 12;
      if (step === 2) val -= 6; // P wave
      if (step === 4) val += 4; // S wave
      if (step === 5) val -= 22; // R peak spike
      if (step === 6) val += 15; // Q spike
      if (step === 8) val -= 4; // T wave

      points.push(val);
      if (points.length > maxPoints) {
        points.shift();
      }

      for (let i = 0; i < points.length; i++) {
        const x = (canvas.width / maxPoints) * i;
        const y = points[i];
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.stroke();
      index++;
      animationId = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationId);
  }, [scanStatus]);

  // 1. Connection searching animation loop
  useEffect(() => {
    if (!isSearching) return;
    const interval = setInterval(() => {
      setSearchFrame(prev => (prev % 8) + 1);
    }, 180);

    const timer = setTimeout(() => {
      setIsSearching(false);
      showToast("Probe connection established successfully", "success");
    }, 2500);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [isSearching]);

  // 2. Camera streams setup with enhanced error handling
  useEffect(() => {
    if (isSearching || scanStatus !== 'scanning') return;

    // Reset error state when attempting camera access
    setCameraError(null);
    setShowCameraError(false);

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: 280, height: 280 } })
      .then(stream => {
        setCameraStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        // Clear any previous errors on success
        setCameraError(null);
        setShowCameraError(false);
      })
      .catch(err => {
        console.warn("Camera access failed/denied, loading fallback simulation:", err);
        
        // Determine specific error type
        let errorType = 'unknown';
        let errorMessage = 'Unable to access camera';
        let troubleshootingSteps = [];

        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          errorType = 'permission';
          errorMessage = 'Camera access was denied';
          troubleshootingSteps = [
            'Click the camera icon in your browser\'s address bar',
            'Select "Allow" for camera permissions',
            'Click "Retry Camera Access" below'
          ];
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          errorType = 'notfound';
          errorMessage = 'No camera device found';
          troubleshootingSteps = [
            'Ensure your device has a working camera',
            'Check if another app is using the camera',
            'Try reconnecting external camera if applicable',
            'Using static simulation as fallback'
          ];
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          errorType = 'hardware';
          errorMessage = 'Camera is already in use';
          troubleshootingSteps = [
            'Close other apps that might be using the camera',
            'Restart your browser',
            'Using static simulation as fallback'
          ];
        } else if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
          errorType = 'constraint';
          errorMessage = 'Camera settings not supported';
          troubleshootingSteps = [
            'Your camera may not support the requested settings',
            'Using static simulation as fallback'
          ];
        } else {
          errorType = 'unknown';
          errorMessage = 'Camera initialization failed';
          troubleshootingSteps = [
            'Check browser camera permissions',
            'Ensure camera is not in use by another app',
            'Using static simulation as fallback'
          ];
        }

        setCameraError({
          type: errorType,
          message: errorMessage,
          steps: troubleshootingSteps,
          originalError: err.name
        });
        setShowCameraError(true);
        
        // Show toast notification
        showToast(`${errorMessage}. Using static ultrasound simulation.`, "warning");
      });

    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isSearching, scanStatus]);

  // Sweep scanning logic (15 seconds target)
  const handleStartSweep = () => {
    if (scanStatus !== 'idle') return;
    setScanStatus('scanning');
    setCollectedCount(0);
    showToast("Ultrasound sweep initialized. AI guide monitoring...", "info");
  };

  // Retry camera access
  const handleRetryCameraAccess = () => {
    setCameraError(null);
    setShowCameraError(false);
    
    // Trigger camera access by re-entering scanning state
    showToast("Retrying camera access...", "info");
    
    // Force re-trigger of camera useEffect
    const currentStatus = scanStatus;
    setScanStatus('idle');
    setTimeout(() => {
      setScanStatus(currentStatus);
    }, 100);
  };

  // Handle sweep completion
  const handleSweepComplete = async () => {
    setScanStatus('completed');
    setGuidanceText("✓ Scan complete ~ All diagnostic frames captured successfully");

    // Stop camera track
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }

    showToast("FetalCLIP sweep analysis completed successfully.", "success");
  };

  // Frame capture with precise 2.5-second intervals
  useEffect(() => {
    if (scanStatus !== 'scanning') {
      // Clear any existing frame capture timeouts
      frameTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      frameTimeoutsRef.current = [];
      return;
    }

    // Schedule 6 frame captures at 2.5-second intervals
    const frameCaptureInterval = 2500; // 2.5 seconds in milliseconds
    const totalFrames = 6;

    for (let i = 0; i < totalFrames; i++) {
      const timeout = setTimeout(() => {
        setCollectedCount(prev => {
          const newCount = prev + 1;
          // Show visual flash feedback
          setShowFlash(true);
          setTimeout(() => setShowFlash(false), 150); // Flash for 150ms
          return newCount;
        });
      }, i * frameCaptureInterval);
      
      frameTimeoutsRef.current.push(timeout);
    }

    // Cleanup function
    return () => {
      frameTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      frameTimeoutsRef.current = [];
    };
  }, [scanStatus]);

  // Elapsed time tracking for sweep progress
  useEffect(() => {
    if (scanStatus !== 'scanning') return;

    const totalDuration = 15; // 15 seconds target
    const interval = setInterval(() => {
      setElapsed(prev => {
        const next = parseFloat((prev + 0.1).toFixed(1));
        if (next >= totalDuration) {
          clearInterval(interval);
          handleSweepComplete();
          return totalDuration;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [scanStatus]);

  // Update dynamic telemetry
  useEffect(() => {
    if (scanStatus !== 'scanning') return;

    // AI Guidance overlay cycling - Clear, actionable instructions
    if (elapsed < 3) {
      setGuidanceText("🎯 Place probe on lower abdomen • Apply gentle pressure");
    } else if (elapsed < 6) {
      setGuidanceText("✓ Contact established • Hold steady for image stabilization");
    } else if (elapsed < 9) {
      setGuidanceText("↑ Sweep upward slowly • Maintain 90° probe angle");
    } else if (elapsed < 12) {
      setGuidanceText("⚡ Capturing fetal structures • Quality check in progress");
    } else {
      setGuidanceText("✓ Diagnostic frames captured • Sweep complete");
    }

    // Heart rate fluctuations (realistic range 138-145 bpm)
    const hr = 138 + Math.floor(Math.random() * 8);
    setHeartrate(`${hr} bpm`);
    
    // Update gestational age display
    setGestAge("24w 3d");

  }, [elapsed, scanStatus]);

  const handleSaveScan = async () => {
    showToast("Calculating diagnostic risk outputs...", "info");

    // Calculate risk
    const aiResult = await aiService.classify(patient, isOnline);

    // Build complete scan document with all data
    const scanDoc = {
      id: `scan-${Date.now()}`,
      patientId: patient.id,
      patient: patient, // Store complete patient reference
      timestamp: new Date().toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      location: patient.location,
      bp: patient.bp,
      bmi: patient.bmi,
      scanQualityScore: aiResult.scanQualityScore || 92,
      scanQuality: aiResult.scanQualityScore || 92,
      selectedBestFrame: 'http://localhost:5000/assets/ultrasound_sweep.png',
      fetalHeartRate: parseInt(heartrate.replace(' bpm', '')) || aiResult.fetalHeartRate || 140,
      gestationalAge: gestAge || '24w 3d',
      gestationalAgeEstimate: `Est: ${gestAge || '24w 3d'}`,
      preliminaryRiskLabel: aiResult.preliminaryRiskLabel,
      riskScore: aiResult.riskScore,
      riskDescription: aiResult.riskDescription || 'Potential Preeclampsia Indicators Detected',
      suggestedFlag: aiResult.suggestedFlag,
      findings: aiResult.findings || [
        'Elevated blood pressure detected',
        'High BMI risk factor',
        'Uterine artery resistance increased',
        'No nasal abnormality detected in this scan'
      ],
      status: isOnline ? 'Submitted' : 'Ready for Submission',
      recommendation: '',
      specialistName: '',
      verifiedTime: ''
    };

    // Store in localStorage for persistence
    try {
      localStorage.setItem('kalinga_current_patient', JSON.stringify(patient));
      localStorage.setItem('kalinga_current_scan', JSON.stringify(scanDoc));
      console.log('Stored scan data:', scanDoc);
    } catch (e) {
      console.warn('Failed to store scan data', e);
    }

    setActiveScan(scanDoc);
    navigate('/triage-summary');
  };

  const handleRetakeScan = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    // Clear frame capture timeouts
    frameTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    frameTimeoutsRef.current = [];
    
    setScanStatus('idle');
    setElapsed(0);
    setCollectedCount(0);
    setGuidanceText('~ Position probe and press start to begin sweep ~');
    setHeartrate('-- bpm');
    setGestAge('--');
    setShowFlash(false);
  };

  // Rendering logic for connection loader
  if (isSearching) {
    return (
      <div className="device-container">
        <div className="device-header-notch">
          <span>{timeStr}</span>
          <div className="icons">
            <span className="connectivity-toggle">
              <span className="indicator-dot"></span>
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </span>
          </div>
        </div>
        <div className="app-viewport">
          <div className="viewport-screen" style={{
            justifyContent: 'center',
            alignItems: 'center',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'var(--bg-light)',
            padding: '20px'
          }}>
            {/* Large animated spinner container */}
            <div className="searching-spinner-container" style={{
              width: '200px',
              height: '200px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: '32px',
              position: 'relative'
            }}>
              {/* Outer pulsing ring */}
              <div style={{
                position: 'absolute',
                width: '200px',
                height: '200px',
                border: '3px solid var(--primary-teal)',
                borderRadius: '50%',
                opacity: 0.2,
                animation: 'pulse-ring 2s ease-out infinite'
              }} />
              
              {/* Middle ring */}
              <div style={{
                position: 'absolute',
                width: '160px',
                height: '160px',
                border: '2px solid var(--primary-teal)',
                borderRadius: '50%',
                opacity: 0.4,
                animation: 'pulse-ring 2s ease-out infinite 0.5s'
              }} />
              
              {/* Animated searching image */}
              <img
                src={`http://localhost:5000/Screens/Searching ${searchFrame}.png`}
                alt="Connecting"
                style={{ 
                  width: '140px', 
                  height: '140px', 
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 4px 12px rgba(27, 178, 164, 0.3))',
                  animation: 'gentle-float 3s ease-in-out infinite'
                }}
              />
            </div>

            {/* Title */}
            <h2 style={{ 
              fontSize: '20px', 
              fontWeight: '700', 
              color: 'var(--text-dark)',
              marginBottom: '8px',
              textAlign: 'center'
            }}>
              Connecting Ultrasound Probe
            </h2>

            {/* Subtitle with animated dots */}
            <p style={{ 
              fontSize: '14px', 
              fontWeight: '500', 
              color: 'var(--text-medium)',
              marginBottom: '24px',
              textAlign: 'center'
            }}>
              Establishing secure connection<span className="loading-dots"></span>
            </p>

            {/* Status indicators */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              width: '100%',
              maxWidth: '280px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                backgroundColor: 'var(--bg-white)',
                borderRadius: '8px',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary-teal)',
                  animation: 'pulse-dot 1.5s ease-in-out infinite'
                }} />
                <span style={{ fontSize: '13px', color: 'var(--text-medium)', fontWeight: '500' }}>
                  Initializing hardware interface
                </span>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                backgroundColor: 'var(--bg-white)',
                borderRadius: '8px',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary-teal)',
                  animation: 'pulse-dot 1.5s ease-in-out infinite 0.3s'
                }} />
                <span style={{ fontSize: '13px', color: 'var(--text-medium)', fontWeight: '500' }}>
                  Calibrating sensors
                </span>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                backgroundColor: 'var(--bg-white)',
                borderRadius: '8px',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary-teal)',
                  animation: 'pulse-dot 1.5s ease-in-out infinite 0.6s'
                }} />
                <span style={{ fontSize: '13px', color: 'var(--text-medium)', fontWeight: '500' }}>
                  Loading AI guidance module
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{
              width: '100%',
              maxWidth: '280px',
              height: '4px',
              backgroundColor: 'var(--bg-white)',
              borderRadius: '2px',
              marginTop: '24px',
              overflow: 'hidden',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{
                height: '100%',
                backgroundColor: 'var(--primary-teal)',
                animation: 'loading-bar 2.5s ease-in-out infinite',
                borderRadius: '2px'
              }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate SVG radial dashboard details
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (elapsed / 15) * circumference;
  const progressPercentage = Math.floor((elapsed / 15) * 100);

  return (
    <div className="device-container" style={{ backgroundColor: 'var(--bg-light)' }}>
      {/* 7. Offline-First Status Bar */}
      <div className="device-header-notch" style={{ borderBottom: '1px solid var(--border-color)' }}>
        <span>{timeStr}</span>
        <div className="icons">
          <div 
            className={`connectivity-status ${!isOnline ? 'offline' : 'online'}`}
            title={isOnline ? 'Connected - Ready to sync' : 'Offline - Data will be queued'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              borderRadius: '20px',
              backgroundColor: isOnline ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              fontSize: '12px',
              fontWeight: '600',
              color: isOnline ? '#16a34a' : '#dc2626',
              cursor: 'default'
            }}
          >
            <span className="indicator-dot" style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isOnline ? '#16a34a' : '#dc2626',
              boxShadow: isOnline ? '0 0 8px rgba(34, 197, 94, 0.6)' : '0 0 8px rgba(239, 68, 68, 0.6)'
            }}></span>
            <span>{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>
      </div>

      <div className="app-viewport">
        <div className="viewport-screen" style={{ padding: '16px 20px', paddingBottom: '20px', backgroundColor: 'var(--bg-light)' }}>
          {/* Header row */}
          <div className="scan-header" style={{ marginBottom: '12px' }}>
            <button className="back-btn" onClick={() => navigate('/dashboard')} style={{ fontSize: '14px' }}>
              <ArrowLeft size={16} style={{ marginRight: '4px' }} />
              Abort Scan
            </button>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700' }}>
              PROBE v2.1 (ACTIVE)
            </div>
          </div>

          {/* 8. Patient Context Banner */}
          <div className="patient-context-card">
            <div className="patient-context-info">
              <h4>{patient.firstName} {patient.lastName}</h4>
              <p>ID: {patient.id} | {patient.location}</p>
            </div>
            <div className="patient-context-badge">
              24w 3d GA
            </div>
          </div>

          {/* 9. Specialist-Confidence Disclaimer Banner */}
          <div className="clinical-disclaimer-banner">
            🛡️ AI Preliminary Analysis — Final diagnosis requires OB-GYN verification
          </div>

          {/* 1. Large Live Scan Preview (Primary Focus) */}
          <div className="clinical-preview-card" style={{ marginBottom: '14px' }}>

            {/* Viewport content */}
            <div className="clinical-viewport-wrapper">

              {/* Flash feedback overlay when frame captured */}
              {showFlash && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  zIndex: 20,
                  pointerEvents: 'none',
                  animation: 'flashFeedback 150ms ease-out'
                }} />
              )}

              {/* Badges Overlays */}
              <div className="preview-badge-overlay">
                <div className="preview-badge teal">
                  <span className="scan-status-dot" style={{ backgroundColor: 'var(--primary-teal)', display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%' }}></span>
                  Good Signal
                </div>
                {scanStatus === 'scanning' && (
                  <div className="preview-badge blue" style={{ animation: 'pulseGlow 1.2s infinite' }}>
                    🤖 AI Guidance Active
                  </div>
                )}
              </div>

              {/* Ultrasound image feed or camera stream */}
              {scanStatus === 'scanning' && cameraStream ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <img
                  src="http://localhost:5000/assets/ultrasound_sweep.png"
                  alt="Ultrasound sweep"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: scanStatus === 'idle' ? 0.35 : 0.85
                  }}
                />
              )}

              {/* Camera Error Overlay */}
              {scanStatus === 'scanning' && showCameraError && cameraError && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  backgroundColor: 'rgba(0, 0, 0, 0.85)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '20px',
                  zIndex: 15,
                  gap: '12px'
                }}>
                  {/* Error Icon */}
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '8px'
                  }}>
                    <AlertTriangle size={32} color="var(--red-alert)" />
                  </div>

                  {/* Error Title */}
                  <h3 style={{
                    fontSize: '16px',
                    fontWeight: '700',
                    color: 'white',
                    margin: 0,
                    textAlign: 'center'
                  }}>
                    {cameraError.message}
                  </h3>

                  {/* Error Type Badge */}
                  <div style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid var(--red-alert)',
                    fontSize: '10px',
                    fontWeight: '600',
                    color: 'var(--red-alert)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {cameraError.originalError}
                  </div>

                  {/* Troubleshooting Steps */}
                  <div style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    width: '100%',
                    maxWidth: '280px',
                    marginTop: '8px'
                  }}>
                    <div style={{
                      fontSize: '11px',
                      fontWeight: '700',
                      color: 'var(--primary-teal)',
                      marginBottom: '8px',
                      textAlign: 'left'
                    }}>
                      💡 Troubleshooting Steps:
                    </div>
                    <ul style={{
                      margin: 0,
                      paddingLeft: '20px',
                      fontSize: '11px',
                      color: 'rgba(255, 255, 255, 0.9)',
                      lineHeight: '1.6',
                      textAlign: 'left'
                    }}>
                      {cameraError.steps.map((step, idx) => (
                        <li key={idx} style={{ marginBottom: '4px' }}>{step}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Action Buttons */}
                  <div style={{
                    display: 'flex',
                    gap: '8px',
                    marginTop: '12px',
                    width: '100%',
                    maxWidth: '280px'
                  }}>
                    {cameraError.type === 'permission' && (
                      <button
                        onClick={handleRetryCameraAccess}
                        style={{
                          flex: 1,
                          padding: '10px 16px',
                          backgroundColor: 'var(--primary-teal)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = 'var(--primary-teal-dark)'}
                        onMouseOut={(e) => e.target.style.backgroundColor = 'var(--primary-teal)'}
                      >
                        <RefreshCw size={14} />
                        Retry Camera Access
                      </button>
                    )}
                    <button
                      onClick={() => setShowCameraError(false)}
                      style={{
                        flex: cameraError.type === 'permission' ? 0 : 1,
                        padding: '10px 16px',
                        backgroundColor: 'rgba(255, 255, 255, 0.15)',
                        color: 'white',
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.25)'}
                      onMouseOut={(e) => e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.15)'}
                    >
                      {cameraError.type === 'permission' ? '✕' : 'Continue with Simulation'}
                    </button>
                  </div>

                  {/* Info Note */}
                  <div style={{
                    fontSize: '10px',
                    color: 'rgba(255, 255, 255, 0.6)',
                    textAlign: 'center',
                    marginTop: '8px',
                    maxWidth: '280px',
                    lineHeight: '1.4'
                  }}>
                    Using static ultrasound simulation. Scan quality analysis will continue normally.
                  </div>
                </div>
              )}

              {/* Target tracking box */}
              {scanStatus === 'scanning' && (
                <>
                  {/* Bounding outline */}
                  <div className="scanning-ai-box" style={{
                    position: 'absolute',
                    border: '1.5px dashed var(--primary-teal)',
                    borderRadius: '8px',
                    top: '70px',
                    left: '80px',
                    width: '120px',
                    height: '120px',
                    pointerEvents: 'none',
                    animation: 'pulseGlow 1.2s infinite',
                    zIndex: 4
                  }}>
                    <span style={{
                      position: 'absolute',
                      top: '-18px',
                      left: '2px',
                      fontSize: '8px',
                      backgroundColor: 'var(--primary-teal)',
                      color: 'white',
                      padding: '1px 4px',
                      borderRadius: '3px',
                      fontWeight: 'bold',
                      whiteSpace: 'nowrap'
                    }}>
                      Fetal Head [FetalCLIP: 94%]
                    </span>
                  </div>

                  {/* Sweep guidance path arrow - Enhanced with smooth pulsing animation */}
                  <div style={{
                    position: 'absolute',
                    top: '15px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    color: '#ffd700',
                    border: '2px solid #ffd700',
                    padding: '6px 14px',
                    borderRadius: '12px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    zIndex: 10,
                    animation: 'smoothPulseArrow 2s ease-in-out infinite',
                    boxShadow: '0 0 12px rgba(255, 215, 0, 0.7)'
                  }}>
                    ↑ SWEEP UPWARDS SLOWLY ↑
                  </div>

                  {/* Guide star target - Enhanced smooth pulsing */}
                  <div className="scan-guide-star" style={{
                    position: 'absolute',
                    top: '30px',
                    right: '45px',
                    width: '36px',
                    height: '36px',
                    backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23ffd700" stroke="%2300bfa5" stroke-width="1.5"><polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9"/></svg>')`,
                    backgroundSize: 'contain',
                    backgroundRepeat: 'no-repeat',
                    animation: 'smoothPulseStar 2.5s ease-in-out infinite',
                    filter: 'drop-shadow(0 0 6px rgba(255, 215, 0, 0.9))'
                  }} />

                  {/* Frame counter badge - More prominent display */}
                  <div style={{
                    position: 'absolute',
                    bottom: '15px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: 'rgba(27, 178, 164, 0.95)',
                    color: 'white',
                    padding: '6px 16px',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: '700',
                    zIndex: 10,
                    border: '2px solid rgba(255, 255, 255, 0.4)',
                    boxShadow: '0 3px 12px rgba(0, 0, 0, 0.4)',
                    letterSpacing: '0.3px'
                  }}>
                    📸 Captured {collectedCount} of 6 frames
                  </div>
                </>
              )}

              {/* Standby/Instruction overlay */}
              {scanStatus === 'idle' && (
                <div style={{
                  position: 'absolute',
                  color: 'white',
                  textAlign: 'center',
                  padding: '20px',
                  fontSize: '11px',
                  fontWeight: '600',
                  letterSpacing: '0.5px'
                }}>
                  STANDBY — READY TO SCAN
                </div>
              )}
            </div>

            {/* Depth Ruler Scale sidebar */}
            <div className="depth-ruler">
              <div className="depth-tick"><span>0cm</span></div>
              <div className="depth-tick"><span>5cm</span></div>
              <div className="depth-tick"><span>10cm</span></div>
              <div className="depth-tick"><span>15cm</span></div>
            </div>
          </div>

          {/* AI Guidance dynamic instruction ribbon */}
          <div className="scan-feedback-label" style={{
            fontSize: '12px',
            backgroundColor: 'var(--bg-white)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '10px',
            color: 'var(--primary-teal-dark)',
            textAlign: 'center',
            fontWeight: '600',
            marginBottom: '16px'
          }}>
            {guidanceText}
          </div>

          {/* 2. Real-Time AI Assistant Status Card */}
          <div className="ai-grid-card">
            <div className="ai-grid-title">Real-Time Guidance Telemetry</div>
            <div className="ai-assistant-grid">
              <div className="ai-assistant-metric">
                <span className="ai-metric-label">Stability</span>
                <span className={`ai-metric-status ${scanStatus === 'scanning' ? 'good' : ''}`}>
                  {scanStatus === 'scanning' ? '✓ Stable' : scanStatus === 'completed' ? '✓ Stable' : '--'}
                </span>
              </div>
              <div className="ai-assistant-metric">
                <span className="ai-metric-label">Probe Angle</span>
                <span className={`ai-metric-status ${scanStatus === 'scanning' ? 'good' : ''}`}>
                  {scanStatus === 'scanning' ? '✓ Good (90°)' : scanStatus === 'completed' ? '✓ Good (90°)' : '--'}
                </span>
              </div>
              <div className="ai-assistant-metric">
                <span className="ai-metric-label">Pressure</span>
                <span className={`ai-metric-status ${scanStatus === 'scanning' ? 'good' : ''}`}>
                  {scanStatus === 'scanning' ? '✓ Optimal' : scanStatus === 'completed' ? '✓ Optimal' : '--'}
                </span>
              </div>
              <div className="ai-assistant-metric">
                <span className="ai-metric-label">Quality Index</span>
                <span className={`ai-metric-status ${scanStatus === 'scanning' ? 'good' : ''}`}>
                  {scanStatus === 'scanning' ? '✓ Diagnostic' : scanStatus === 'completed' ? '✓ Diagnostic' : '--'}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Sweep Control Section */}
          <div className="sweep-control-card">
            <div className="sweep-side-label">
              <span>Transducer</span>
              <button
                type="button"
                onClick={handleRetakeScan}
                style={{
                  border: '1px solid var(--border-color)',
                  background: 'none',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '10px',
                  fontWeight: '700',
                  color: 'var(--text-medium)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  marginTop: '4px'
                }}
              >
                <RefreshCw size={10} /> Retake
              </button>
            </div>

            {/* Circular Sweep progress button with enhanced visualization */}
            <div
              className={`radial-sweep-button ${scanStatus === 'scanning' ? 'scanning' : scanStatus === 'completed' ? 'completed' : ''}`}
              onClick={scanStatus === 'idle' ? handleStartSweep : undefined}
              style={{ 
                cursor: scanStatus === 'idle' ? 'pointer' : 'default',
                opacity: scanStatus === 'completed' ? 0.9 : 1 
              }}
            >
              {/* SVG radial progress overlay with elapsed/remaining time indicator */}
              <svg width="90" height="90" style={{ position: 'absolute', top: -4, left: -4, transform: 'rotate(-90deg)' }}>
                {/* Background track circle */}
                <circle cx="45" cy="45" r={radius} fill="transparent" stroke="#e2e8f0" strokeWidth="4" />
                {/* Progress circle with smooth transition */}
                <circle
                  cx="45"
                  cy="45"
                  r={radius}
                  fill="transparent"
                  stroke={scanStatus === 'completed' ? '#10b981' : 'var(--primary-teal)'}
                  strokeWidth="4"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  style={{ 
                    transition: 'stroke-dashoffset 0.1s linear',
                    filter: scanStatus === 'scanning' ? 'drop-shadow(0 0 6px rgba(27, 178, 164, 0.8))' : scanStatus === 'completed' ? 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.8))' : 'none'
                  }}
                />
              </svg>

              <span className="radial-sweep-label" style={{
                fontSize: '11px',
                fontWeight: '700',
                color: scanStatus === 'completed' ? '#10b981' : 'var(--text-dark)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {scanStatus === 'idle' ? 'TAP TO' : scanStatus === 'scanning' ? 'SWEEPING' : 'COMPLETE'}
              </span>
              <span className="radial-sweep-timer" style={{
                fontSize: scanStatus === 'scanning' ? '28px' : '20px',
                fontWeight: '800',
                color: scanStatus === 'completed' ? '#10b981' : scanStatus === 'scanning' ? 'var(--primary-teal)' : 'var(--text-dark)',
                marginTop: scanStatus === 'scanning' ? '4px' : '2px'
              }}>
                {scanStatus === 'idle' ? 'START' : scanStatus === 'scanning' ? `${Math.floor(elapsed)}s` : '✓'}
              </span>
              
              {/* Show elapsed/remaining time with progress percentage during scan */}
              {scanStatus === 'scanning' && (
                <>
                  <span style={{
                    position: 'absolute',
                    bottom: '18px',
                    fontSize: '10px',
                    color: 'var(--primary-teal)',
                    fontWeight: '700',
                    backgroundColor: 'rgba(27, 178, 164, 0.1)',
                    padding: '2px 8px',
                    borderRadius: '10px'
                  }}>
                    {progressPercentage}% Complete
                  </span>
                  <span style={{
                    position: 'absolute',
                    bottom: '4px',
                    fontSize: '9px',
                    color: 'var(--text-muted)',
                    fontWeight: '600'
                  }}>
                    {Math.max(0, 15 - Math.floor(elapsed))}s left
                  </span>
                </>
              )}
              
              {/* Completed state badge */}
              {scanStatus === 'completed' && (
                <span style={{
                  position: 'absolute',
                  bottom: '8px',
                  fontSize: '9px',
                  color: '#10b981',
                  fontWeight: '700',
                  backgroundColor: 'rgba(16, 185, 129, 0.1)',
                  padding: '2px 10px',
                  borderRadius: '10px'
                }}>
                  15.0s
                </span>
              )}
            </div>

            <div className="sweep-side-label" style={{ textAlign: 'right' }}>
              <span>Target Duration</span>
              <span className="sweep-side-val" style={{ marginTop: '4px', display: 'block' }}>15 sec target</span>
            </div>
          </div>

          {/* 4. Collected Frame Strip */}
          <div className="clinical-scroller-card">
            <div className="clinical-scroller-header">
              <h4>AI Selected Diagnostic Frames</h4>
              <span>6 Frames target</span>
            </div>

            <div className="horizontal-frames-strip">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="horizontal-frame-item">
                  <div className="horizontal-frame-thumb">
                    {i <= collectedCount ? (
                      <>
                        <img src="http://localhost:5000/assets/ultrasound_sweep.png" alt={`frame ${i}`} />
                        <span className="frame-badge-check">✓</span>
                      </>
                    ) : (
                      <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--bg-light)' }} />
                    )}
                  </div>
                  <span className="frame-meta-tag">
                    {i <= collectedCount ? `Frame ${i}` : `Pending`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 5. Live Readings / Telemetry Panel */}
          <div className="clinical-readings-card">
            <div className="ai-grid-title">Fetal Telemetry Readings</div>
            <div className="readings-row-group">
              <div className="reading-row-item">
                <span className="reading-row-label">Heart Rate</span>
                <span className="reading-row-value">
                  {heartrate}
                  {scanStatus === 'scanning' && (
                    <canvas
                      ref={ekgCanvasRef}
                      width={100}
                      height={35}
                      style={{
                        backgroundColor: '#020617',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        marginLeft: '8px'
                      }}
                    />
                  )}
                </span>
              </div>
              <div className="reading-row-item">
                <span className="reading-row-label">Gestational Age</span>
                <span className="reading-row-value">{gestAge}</span>
              </div>
              <div className="reading-row-item">
                <span className="reading-row-label">Ultrasound Quality</span>
                <span className="reading-row-value" style={{ color: 'var(--green-normal)' }}>
                  {scanStatus === 'completed' ? '92% (High)' : scanStatus === 'scanning' ? 'Analyzing...' : '--'}
                </span>
              </div>
              <div className="reading-row-item">
                <span className="reading-row-label">AI Risk Assessment</span>
                <span className="reading-row-value" style={{ color: 'var(--red-alert)' }}>
                  {scanStatus === 'completed' ? 'Preeclampsia Flags' : scanStatus === 'scanning' ? 'Calculating...' : '--'}
                </span>
              </div>
            </div>
          </div>

          {/* 6. Save Triage Package Sticky Bottom CTA */}
          
        </div>

        {/* Footer outside scrollable area */}
        <div className="save-sticky-bar">
          <button
            className="btn-blue"
            disabled={scanStatus !== 'completed'}
            onClick={handleSaveScan}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '15px',
              fontWeight: '700',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            SAVE TRIAGE PACKAGE
          </button>
          <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', textAlign: 'center', fontWeight: '500' }}>
            Encrypted locally and ready for specialist verification
          </span>
        </div>
      </div>
    </div>
  );
}
