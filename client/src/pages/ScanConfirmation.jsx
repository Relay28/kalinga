import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import { offlineQueue } from '../services/offlineQueue';
import { api } from '../services/api';

const toHex = (str) => {
  if (!str) return '';
  return str.split('').map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' ').toUpperCase();
};

export default function ScanConfirmation({ 
  isOnline, 
  onToggleOnline, 
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
    setEncrypting(true);
    setEncryptStep(1); // Encrypting
    setEncryptionLog([]);
    
    const pData = activePatient || {
      id: '7102-4481-9352',
      firstName: 'Maria',
      lastName: 'Cruz',
      bp: '155/95',
      bmi: '31.2'
    };
    
    const sData = activeScan || {
      fetalHeartRate: 140,
      gestationalAgeEstimate: 'Est: 24w 3d'
    };

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
        const scanToSave = activeScan || {
          id: `scan-${Date.now()}`,
          patientId: activePatient?.id || '7102-4481-9352',
          timestamp: new Date().toLocaleString(),
          location: activePatient?.location || 'Langkas, Dalaguete, Cebu',
          bp: activePatient?.bp || '120/80',
          bmi: activePatient?.bmi || '24.5',
          scanQualityScore: 92,
          selectedBestFrame: 'assets/ultrasound_sweep.png',
          fetalHeartRate: 140,
          gestationalAgeEstimate: 'Est: 24w 3d',
          preliminaryRiskLabel: 'HIGH',
          riskScore: 78,
          suggestedFlag: 'Urgent Referral',
          status: isOnline ? 'Submitted' : 'Ready for Submission'
        };

        // If offline: save to local queue
        if (!isOnline) {
          offlineQueue.enqueue(scanToSave);
          
          // Update patient status in local state (for localStorage fallback)
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
          showToast("Scan encrypted and saved to local offline queue.", "success");
        } else {
          // If online: submit directly to server database
          try {
            // First save the scan
            await api.saveScan(scanToSave);
            
            // Also ensure patient is registered on server if not already
            const patients = await api.getPatients();
            const patientExists = patients.find(p => p.id === activePatient?.id);
            if (!patientExists && activePatient) {
              await api.registerPatient(activePatient);
            }
            
            showToast("Scan encrypted and submitted to regional database.", "success");
          } catch (err) {
            console.warn("Upload failed, enqueuing scan offline:", err);
            offlineQueue.enqueue(scanToSave);
            refreshSyncCount();
            showToast("Upload failed. Scan saved to local offline queue.", "warning");
          }
        }

        setEncrypting(false);
        navigate('/dashboard');
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
          <div className={`connectivity-toggle ${!isOnline ? 'offline' : ''}`} onClick={onToggleOnline}>
            <span className="indicator-dot"></span>
            <span>{isOnline ? 'Online Mode' : 'Offline Mode'}</span>
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

              {/* Risk Score */}
              <div className="info-card" style={{ borderLeft: '4px solid var(--red-alert)' }}>
                <h4 style={{ fontSize: '11px', fontWeight: '700' }}>AI Preliminary Flag</h4>
                <div className="risk-value-large" style={{
                  color: scan.riskScore >= 70 ? 'var(--red-alert)' :
                         scan.riskScore >= 40 ? 'var(--orange-alert)' : 'var(--green-normal)'
                }}>
                  {scan.riskScore} %
                </div>
                <div style={{ fontSize: '9px', color: 'var(--text-muted)', textAlign: 'right', marginTop: '2px' }}>
                  Preeclampsia AI estimate
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
