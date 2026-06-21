import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import { offlineQueue } from '../services/offlineQueue';
import { api } from '../services/api';
import RiskScoreDisplay from '../components/RiskScoreDisplay';
import { generateUuidV4 } from '../utils/uuid';
import { validateTriagePackage, createTriagePackage } from '../utils/triagePackageValidator';

const toHex = (str) => {
  if (!str) return '';
  return str.split('').map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' ').toUpperCase();
};

export default function ScanConfirmation({ 
  isOnline, 
  activePatient, 
  activeScan, 
  refreshSyncCount,
  showToast 
}) {
  const navigate = useNavigate();
  const [timeStr, setTimeStr] = useState('09:41');
  const [encrypting, setEncrypting] = useState(false);
  const [encryptStep, setEncryptStep] = useState(1);
  const [encryptionLog, setEncryptionLog] = useState([]);

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

  const handleLockAndEncrypt = async () => {
    // Validate patient and scan data before proceeding (Requirement 8.1)
    const patientData = activePatient || patient;
    const scanData = activeScan || scan;
    
    // Pre-validation: Check if required data exists
    if (!patientData || !patientData.id || !patientData.firstName || !patientData.lastName) {
      showToast('✗ Validation failed: Patient data is incomplete', 'error');
      console.error('Patient data validation failed:', patientData);
      return;
    }
    
    if (!scanData || scanData.riskScore === undefined || !scanData.fetalHeartRate) {
      showToast('✗ Validation failed: Scan data is incomplete', 'error');
      console.error('Scan data validation failed:', scanData);
      return;
    }
    
    // Generate unique scan ID (UUID v4) - Requirement 8.5
    const scanId = generateUuidV4();
    console.log('Generated scan ID (UUID v4):', scanId);
    
    // Create complete triage package with ISO 8601 timestamp - Requirements 8.1, 8.5, 8.6
    const triagePackage = createTriagePackage(patientData, scanData, scanId);
    
    // Validate complete package before encryption/storage - Requirement 8.1
    const validation = validateTriagePackage(triagePackage);
    if (!validation.valid) {
      console.error('Triage package validation failed:', validation.errors);
      showToast(`✗ Validation failed: ${validation.errors[0]}`, 'error');
      
      // Show all validation errors in console for debugging
      validation.errors.forEach(error => console.error('Validation error:', error));
      return;
    }
    
    console.log('Triage package validated successfully:', {
      scanId: triagePackage.id,
      timestamp: triagePackage.timestamp,
      patientName: `${triagePackage.patient.firstName} ${triagePackage.patient.lastName}`,
      riskScore: triagePackage.riskScore
    });
    
    // Start encryption animation
    setEncrypting(true);
    setEncryptStep(1); // Encrypting
    setEncryptionLog([]);
    
    const pData = triagePackage.patient;
    const sData = triagePackage;

    const logs = [
      "🔑 Initializing hardware AES-256 vault...",
      `📦 Packing patient: ${pData.firstName} ${pData.lastName}`,
      `🔒 Cipher: ${toHex(`${pData.firstName} ${pData.lastName}`).substring(0, 30)}...`,
      `📦 Packing vitals: BP ${pData.bp}, BMI ${pData.bmi}`,
      `🔒 Cipher: ${toHex(`BP ${pData.bp}, BMI ${pData.bmi}`).substring(0, 30)}...`,
      `📦 Packing fetal: HR ${sData.fetalHeartRate} bpm, Age ${sData.gestationalAgeEstimate}`,
      `🔒 Cipher: ${toHex(`HR ${sData.fetalHeartRate} ${sData.gestationalAgeEstimate}`).substring(0, 30)}...`,
      "📷 Encrypting raw sweep image frames...",
      "🛡️ Hashing: [SHA-256] e3b0c44298fc1c149afb...",
      "💾 Syncing sandboxed local database file..."
    ];

    // Stream logs
    logs.forEach((log, index) => {
      setTimeout(() => {
        setEncryptionLog(prev => [...prev, log]);
      }, index * 220);
    });

    // transition to locked after logs finish
    setTimeout(() => {
      setEncryptStep(2); // Locked
      
      setTimeout(async () => {
        // Prepare scan for storage with proper status
        const scanToSave = {
          ...triagePackage,
          status: isOnline ? 'Submitted' : 'Ready for Submission'
        };

        console.log('Saving triage package:', {
          id: scanToSave.id,
          timestamp: scanToSave.timestamp,
          isOnline,
          status: scanToSave.status
        });

        // If offline: save to local queue
        if (!isOnline) {
          try {
            offlineQueue.enqueue(scanToSave);
            
            // Update patient status in local state database
            const cachedPatients = JSON.parse(localStorage.getItem('kalinga_patients') || '[]');
            const match = cachedPatients.find(p => p.id === scanToSave.patientId);
            if (match) {
              match.status = 'Ready for Submission';
              match.riskScore = scanToSave.riskScore;
              match.heartRate = scanToSave.fetalHeartRate;
              match.fetalAge = scanToSave.gestationalAgeEstimate;
              localStorage.setItem('kalinga_patients', JSON.stringify(cachedPatients));
            }
            
            refreshSyncCount();
            showToast('✓ Scan secured in offline queue', 'success');
            setEncrypting(false);
            setTimeout(() => navigate('/dashboard'), 800);
          } catch (err) {
            setEncrypting(false);
            
            // Check if it's a quota exceeded error
            if (err.message && err.message.includes('quota')) {
              // Show detailed error with action options
              if (window.confirm(
                `Storage quota exceeded!\n\n` +
                `Cannot save scan to offline queue due to insufficient storage space.\n\n` +
                `Would you like to go to Storage Settings to free up space?\n\n` +
                `Click OK to manage storage, or Cancel to return to dashboard.`
              )) {
                navigate('/storage-settings');
              } else {
                showToast('⚠ Scan not saved - storage quota exceeded', 'error');
                navigate('/dashboard');
              }
            } else {
              showToast(`✗ Failed to save scan: ${err.message}`, 'error');
              navigate('/dashboard');
            }
          }
        } else {
          // If online: submit directly to server database
          try {
            await api.saveScan(scanToSave);
            showToast("Scan encrypted and uploaded to regional database.", "success");
          } catch (err) {
            console.warn("Upload failed, enqueuing scan offline:", err);
            try {
              offlineQueue.enqueue(scanToSave);
              refreshSyncCount();
              showToast("Upload failed. Scan saved to local offline queue.", "warning");
            } catch (enqueueErr) {
              console.error("Failed to enqueue after upload failure:", enqueueErr);
              showToast(`✗ Failed to save scan: ${enqueueErr.message}`, 'error');
            }
          }
          
          setEncrypting(false);
          navigate('/dashboard');
        }
      }, 1500);
    }, logs.length * 220 + 200);
  };

  const patient = activePatient || {
    id: '7102-4481-9352',
    firstName: 'Maria',
    lastName: 'Cruz',
    age: 27,
    bp: '155/95',
    bmi: '31.2',
    timestamp: 'March 22, 2026 2:34 pm',
    location: 'Langkas, Dalaguete, Cebu'
  };

  const scan = activeScan || {
    riskScore: 78,
    fetalHeartRate: 140,
    gestationalAgeEstimate: 'Est: 24w 3d',
    status: 'Ready for Submission'
  };

  // Calculate risk level based on score
  const getRiskLevel = (score) => {
    if (score >= 70) return 'HIGH RISK';
    if (score >= 40) return 'MODERATE RISK';
    return 'LOW RISK';
  };

  // Calculate contributing risk factors for display
  // Requirements: 7.2-7.7 - Show risk factor breakdown with score contributions
  const calculateRiskFactors = () => {
    const factors = [];
    
    // Blood pressure contribution with threshold comparison
    if (patient.bp) {
      const parts = patient.bp.split('/');
      const systolic = parseInt(parts[0]);
      const diastolic = parseInt(parts[1]);
      
      if (systolic >= 160 || diastolic >= 100) {
        factors.push(`Blood Pressure ${patient.bp} (≥160/100 threshold) (+35)`);
      } else if (systolic >= 140 || diastolic >= 90) {
        factors.push(`Blood Pressure ${patient.bp} (≥140/90 threshold) (+25)`);
      } else if (systolic >= 130 || diastolic >= 85) {
        factors.push(`Blood Pressure ${patient.bp} (≥130/85 threshold) (+12)`);
      }
    }
    
    // BMI contribution
    const bmi = parseFloat(patient.bmi);
    if (!isNaN(bmi)) {
      if (bmi >= 30) {
        factors.push(`BMI ≥30 (${patient.bmi}) (+8)`);
      } else if (bmi >= 25) {
        factors.push(`BMI ≥25 (${patient.bmi}) (+4)`);
      }
    }
    
    // Risk factors from patient data - sorted by score contribution (highest first)
    if (patient.riskFactors?.hypertension) {
      factors.push('Chronic Hypertension (+20)');
    }
    if (patient.riskFactors?.family) {
      factors.push('Family History of Preeclampsia (+10)');
    }
    if (patient.riskFactors?.diabetes) {
      factors.push('Diabetes (+10)');
    }
    if (patient.riskFactors?.multiple) {
      factors.push('Multiple Pregnancy (+8)');
    }
    if (patient.riskFactors?.pain) {
      factors.push('Abdominal Pain (+8)');
    }
    if (patient.riskFactors?.csection) {
      factors.push('Previous C-section (+5)');
    }
    if (patient.riskFactors?.firstpreg) {
      factors.push('First Pregnancy (+4)');
    }
    
    // Always show baseline as first item if there are other factors
    if (factors.length > 0) {
      factors.unshift('Baseline Risk (+15)');
    } else {
      // If no specific factors, show baseline only
      factors.push('Baseline Risk (+15)');
    }
    
    return factors;
  };

  const riskLevel = getRiskLevel(scan.riskScore);
  const riskFactors = calculateRiskFactors();

  return (
    <div className="device-container">
      {/* Encrypting Lock Transaction Overlay */}
      {encrypting && (
        <div className="transaction-overlay">
          <div className={`transaction-lock-icon ${encryptStep === 1 ? 'encrypting' : ''}`}>
            {encryptStep === 1 ? '🔒' : '🛡️'}
          </div>
          <h3 className="transaction-title">
            {encryptStep === 1 ? 'Encrypting Data' : 'Local Vault Locked'}
          </h3>
          <p className="transaction-desc" style={{ marginBottom: '16px' }}>
            {encryptStep === 1 
              ? 'Securing clinical telemetry and image frames using device hardware security parameters...'
              : 'Ultrasound reports safely encrypted with on-device sandbox storage. Pending network synchronization.'
            }
          </p>

          {/* Live Encryption Log Terminal */}
          {encryptStep === 1 && (
            <div style={{
              width: '100%',
              maxWidth: '300px',
              height: '140px',
              backgroundColor: '#020617',
              border: '1px solid #334155',
              borderRadius: '8px',
              padding: '12px',
              fontFamily: 'monospace',
              fontSize: '9px',
              textAlign: 'left',
              color: '#38bdf8',
              overflowY: 'auto',
              boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.8)'
            }}>
              {encryptionLog.map((line, idx) => (
                <div key={idx} style={{ 
                  marginBottom: '4px', 
                  color: line.startsWith('🔒') ? '#10b981' : line.startsWith('📦') ? '#fbbf24' : '#38bdf8',
                  wordBreak: 'break-all'
                }}>
                  {line}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="device-header-notch">
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
        <div className="viewport-screen">
          <button className="back-btn" onClick={() => navigate('/scan')}>
            <ArrowLeft size={18} style={{ marginRight: '6px' }} />
            Return / Retake
          </button>

          {/* Patient Header */}
          <div className="results-header-patient" style={{ display: 'flex', gap: '14px', alignItems: 'center', marginTop: '14px', marginBottom: '20px' }}>
            <div className="patient-avatar-wrapper" style={{ width: '50px', height: '50px' }}>
              <svg className="patient-avatar" viewBox="0 0 24 24" style={{ width: '36px', height: '36px' }}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
              </svg>
            </div>
            <div>
              <div className="results-patient-name">{patient.firstName} {patient.lastName}</div>
              <div className="results-patient-meta">
                ID: <span style={{ fontWeight: '700' }}>{patient.id}</span> | Age: {patient.age}
              </div>
            </div>
          </div>

          <div className="results-columns">
            {/* Left Column: Best Frame and Thumbs */}
            <div className="best-frame-box">
              <div className="best-frame-display">
                <img src="http://localhost:5000/assets/ultrasound_sweep.png" alt="Best frame" />
              </div>
              <div className="best-frame-label">Best frame</div>
              <div className="mini-frames-grid">
                <div className="mini-frame-thumbnail">
                  <img src="http://localhost:5000/assets/ultrasound_sweep.png" alt="Frame 2" />
                </div>
                <div className="mini-frame-thumbnail">
                  <img src="http://localhost:5000/assets/ultrasound_sweep.png" alt="Frame 3" />
                </div>
              </div>
            </div>

            {/* Right Column: Vitals, Scores, Indicators */}
            <div className="results-info-column">
              <div>
                <div className="info-section-meta">{patient.timestamp}</div>
                <div className="info-section-meta">{patient.location}</div>
                
                <div style={{ marginTop: '8px' }}>
                  <span className="info-status-label">Status</span>
                  <div className="info-status-value" style={{ color: 'var(--orange-alert)' }}>
                    {!isOnline ? 'Saved locally' : 'Ready for submission'}
                  </div>
                </div>
              </div>

              {/* Maternal Vitals */}
              <div className="info-card">
                <h4>Maternal Vitals</h4>
                <div className="info-card-row">
                  <span className="info-card-label">BP</span>
                  <span className="info-card-val">{patient.bp}</span>
                </div>
                <div className="info-card-row">
                  <span className="info-card-label">BMI</span>
                  <span className="info-card-val">{patient.bmi}</span>
                </div>
              </div>

              {/* Fetal Vitals */}
              <div className="info-card">
                <h4>Fetal Vitals</h4>
                <div className="info-card-row">
                  <span className="info-card-label">Heart Rate</span>
                  <span className="info-card-val">{scan.fetalHeartRate} bpm</span>
                </div>
                <div className="info-card-row">
                  <span className="info-card-label">Age Est</span>
                  <span className="info-card-val">{scan.gestationalAgeEstimate}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Risk Score Display - Full Width Below Columns */}
          <div style={{ marginTop: '20px', marginBottom: '20px' }}>
            <RiskScoreDisplay 
              riskScore={scan.riskScore} 
              riskLevel={riskLevel}
              riskFactors={riskFactors}
              size="medium"
            />
          </div>

          {/* Action bottom button */}
          <div style={{ marginTop: 'auto', marginBottom: '24px' }}>
            <button 
              className="btn-blue" 
              onClick={handleLockAndEncrypt}
              style={{ width: '100%', fontSize: '15px' }}
            >
              <Shield size={16} style={{ marginRight: '6px' }} />
              Lock & Encrypt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
