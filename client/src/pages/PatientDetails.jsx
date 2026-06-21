import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit2, Save, X } from 'lucide-react';
import { api } from '../services/api';
import { seedPatients } from '../data/seedPatients';
import { calculateRiskLocally } from '../services/aiService';
import { calculateBMI } from '../utils/bmiCalculator';
import storage from '../services/storage';

// 1. Preeclampsia Risk Speedometer Gauge Chart
function RiskSpeedometer({ score }) {
  const needleRotation = (score / 100) * 180 - 90;
  const color = score >= 70 ? 'var(--red-alert)' : score >= 40 ? 'var(--orange-alert)' : 'var(--green-normal)';
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '4px 0', padding: '12px', backgroundColor: 'var(--bg-light)', borderRadius: '12px', borderLeft: `4px solid ${color}`, boxShadow: 'var(--shadow-sm)' }}>
      <h4 style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-medium)', marginBottom: '8px', width: '100%', textAlign: 'left' }}>
        AI Preliminary Flag: <span style={{ color }}>{score >= 70 ? 'HIGH' : score >= 40 ? 'MODERATE' : 'LOW'}</span>
      </h4>
      <svg width="140" height="75" viewBox="0 0 120 70">
        <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke="#e2e8f0" strokeWidth="8" strokeLinecap="round" />
        <path d="M 10 60 A 50 50 0 0 1 50 22" fill="none" stroke="#10b981" strokeWidth="8" />
        <path d="M 50 22 A 50 50 0 0 1 80 27" fill="none" stroke="#f97316" strokeWidth="8" />
        <path d="M 80 27 A 50 50 0 0 1 110 60" fill="none" stroke="#ef4444" strokeWidth="8" strokeLinecap="round" />
        <circle cx="60" cy="60" r="5" fill="#1e293b" />
        <line x1="60" y1="60" x2="60" y2="20" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" 
              transform={`rotate(${needleRotation} 60 60)`} style={{ transition: 'transform 1s ease-in-out' }} />
      </svg>
      <div style={{ fontSize: '20px', fontWeight: '800', color, marginTop: '-8px' }}>
        {score}% Risk
      </div>
    </div>
  );
}

// 2. Maternal Blood Pressure scale Danger Band Matrix
function BloodPressureScale({ bp }) {
  const parseBP = (bpStr) => {
    if (!bpStr || !bpStr.includes('/')) return { label: 'Normal', level: 0, color: '#10b981' };
    const parts = bpStr.split('/');
    const sys = parseInt(parts[0]);
    const dia = parseInt(parts[1]);
    
    if (sys >= 180 || dia >= 120) return { label: 'Crisis', level: 4, color: '#ef4444' };
    if (sys >= 140 || dia >= 90) return { label: 'Stage 2 Hypertension', level: 3, color: '#f97316' };
    if (sys >= 130 || dia >= 80) return { label: 'Stage 1 Hypertension', level: 2, color: '#eab308' };
    if (sys >= 120 && dia < 80) return { label: 'Elevated BP', level: 1, color: '#3b82f6' };
    return { label: 'Normal BP', level: 0, color: '#10b981' };
  };

  const bpInfo = parseBP(bp);

  return (
    <div style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-white)', boxShadow: 'var(--shadow-sm)', margin: '4px 0' }}>
      <h4 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-dark)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '8px' }}>
        Maternal BP Danger Matrix
      </h4>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold', marginBottom: '6px' }}>
        <span style={{ color: 'var(--text-medium)' }}>BP:</span>
        <span style={{ color: bpInfo.color }}>{bp} — {bpInfo.label}</span>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', height: '8px', marginBottom: '6px' }}>
        {[0, 1, 2, 3, 4].map(lvl => (
          <div key={lvl} style={{
            borderRadius: '2px',
            backgroundColor: lvl === bpInfo.level ? bpInfo.color : '#e2e8f0',
            boxShadow: lvl === bpInfo.level ? `0 0 8px ${bpInfo.color}` : 'none',
            opacity: lvl === bpInfo.level ? 1 : 0.35,
            transition: 'all 0.5s ease'
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '7.5px', color: 'var(--text-muted)', fontWeight: '600' }}>
        <span>Normal</span>
        <span>Elev</span>
        <span>Stg 1</span>
        <span>Stg 2</span>
        <span>Crisis</span>
      </div>
    </div>
  );
}

export default function PatientDetails({ isOnline, showToast }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [timeStr, setTimeStr] = useState('09:41');
  const [patient, setPatient] = useState(null);
  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedPatient, setEditedPatient] = useState(null);
  const [recalculationHistory, setRecalculationHistory] = useState([]);

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

  // Fetch patient details
  useEffect(() => {
    const fetchPatientData = async () => {
      setLoading(true);
      try {
        let pRecord = null;
        let sRecord = null;

        if (isOnline) {
          try {
            // Load patients list
            const patientsList = await api.getPatients();
            pRecord = patientsList.find(p => p.id === id);
            
            // Try to find matching scan
            const scansList = await api.getScans();
            sRecord = scansList.find(s => s.patientId === id);
          } catch (err) {
            console.warn("API load failed, using local offline fallback:", err);
          }
        }

        // Fallback local storage
        if (!pRecord) {
          const cachedPatients = JSON.parse(localStorage.getItem('kalinga_patients') || '[]');
          pRecord = cachedPatients.find(p => p.id === id) || seedPatients.find(p => p.id === id);
        }

        setPatient(pRecord);
        setScan(sRecord);
        
        // Load recalculation history
        const history = storage.get(`kalinga_recalc_history_${id}`, []);
        setRecalculationHistory(history);
      } catch (err) {
        showToast("Error loading patient details", "warning");
      } finally {
        setLoading(false);
      }
    };

    fetchPatientData();
  }, [id, isOnline]);

  // Start editing mode
  const handleStartEdit = () => {
    setEditedPatient({ ...patient });
    setIsEditing(true);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditedPatient(null);
    setIsEditing(false);
  };

  // Update field in edited patient
  const handleFieldChange = (field, value) => {
    setEditedPatient(prev => ({ ...prev, [field]: value }));
    
    // Auto-recalculate BMI if weight or height changes
    if (field === 'weight' || field === 'height') {
      const weight = field === 'weight' ? parseFloat(value) : parseFloat(editedPatient.weight);
      const height = field === 'height' ? parseFloat(value) : parseFloat(editedPatient.height);
      
      if (weight > 0 && height > 0) {
        const newBMI = calculateBMI(weight, height);
        setEditedPatient(prev => ({ ...prev, bmi: newBMI.toString() }));
      }
    }
  };

  // Update risk factor
  const handleRiskFactorChange = (factor, value) => {
    setEditedPatient(prev => ({
      ...prev,
      riskFactors: {
        ...prev.riskFactors,
        [factor]: value
      }
    }));
  };

  // Save changes and recalculate risk score
  const handleSaveEdit = async () => {
    try {
      // Recalculate risk score with updated data
      const oldRiskScore = patient.riskScore;
      const newRiskScore = calculateRiskLocally(
        editedPatient.bp,
        editedPatient.bmi,
        editedPatient.age,
        editedPatient.riskFactors
      );

      // Update patient with new risk score
      const updatedPatient = {
        ...editedPatient,
        riskScore: newRiskScore,
        lastUpdated: new Date().toISOString()
      };

      // Save recalculation to history
      const historyEntry = {
        timestamp: new Date().toISOString(),
        oldRiskScore,
        newRiskScore,
        changedFields: getChangedFields(patient, editedPatient),
        reason: 'Manual data update'
      };

      const updatedHistory = [...recalculationHistory, historyEntry];
      storage.set(`kalinga_recalc_history_${id}`, updatedHistory);
      setRecalculationHistory(updatedHistory);

      // Update in localStorage
      const cachedPatients = JSON.parse(localStorage.getItem('kalinga_patients') || '[]');
      const patientIndex = cachedPatients.findIndex(p => p.id === id);
      
      if (patientIndex !== -1) {
        cachedPatients[patientIndex] = updatedPatient;
        localStorage.setItem('kalinga_patients', JSON.stringify(cachedPatients));
      }

      // Update current patient state
      setPatient(updatedPatient);
      setIsEditing(false);
      setEditedPatient(null);

      // Show notification
      const riskChange = newRiskScore - oldRiskScore;
      const changeText = riskChange > 0 ? `increased by ${riskChange}%` : riskChange < 0 ? `decreased by ${Math.abs(riskChange)}%` : 'unchanged';
      showToast(`Risk score updated: ${changeText} (now ${newRiskScore}%)`, "success");

      // Try to sync with server if online
      if (isOnline) {
        try {
          await api.updatePatient(id, updatedPatient);
          console.log('Patient updated on server');
        } catch (err) {
          console.warn('Failed to sync updated patient to server:', err);
        }
      }
    } catch (err) {
      console.error('Error saving patient updates:', err);
      showToast('Error saving changes', 'error');
    }
  };

  // Helper to determine which fields changed
  const getChangedFields = (original, updated) => {
    const changes = [];
    
    if (original.bp !== updated.bp) changes.push(`BP: ${original.bp} → ${updated.bp}`);
    if (original.weight !== updated.weight) changes.push(`Weight: ${original.weight} → ${updated.weight}`);
    if (original.height !== updated.height) changes.push(`Height: ${original.height} → ${updated.height}`);
    if (original.bmi !== updated.bmi) changes.push(`BMI: ${original.bmi} → ${updated.bmi}`);
    
    // Check risk factors
    const originalRF = original.riskFactors || {};
    const updatedRF = updated.riskFactors || {};
    
    Object.keys(updatedRF).forEach(key => {
      if (originalRF[key] !== updatedRF[key]) {
        changes.push(`${key}: ${originalRF[key]} → ${updatedRF[key]}`);
      }
    });
    
    return changes;
  };

  if (loading) {
    return (
      <div className="device-container">
        <div className="device-header-notch"><span>{timeStr}</span></div>
        <div className="app-viewport">
          <div className="viewport-screen" style={{ justifyContent: 'center', alignItems: 'center' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Loading patient vault...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="device-container">
        <div className="device-header-notch"><span>{timeStr}</span></div>
        <div className="app-viewport">
          <div className="viewport-screen">
            <button className="back-btn" onClick={() => navigate('/dashboard')}><ArrowLeft size={16} /> Return</button>
            <p style={{ padding: '20px 0', color: 'var(--red-alert)', fontWeight: '700' }}>Patient record not found</p>
          </div>
        </div>
      </div>
    );
  }

  // Handle display states
  const showReview = patient.status === 'Reviewed' || (scan && scan.status === 'Reviewed');
  const reviewData = patient.review || (scan?.status === 'Reviewed' ? {
    verdict: scan.suggestedFlag,
    time: scan.verifiedTime || patient.timestamp,
    authorizedBy: scan.specialistName || 'Dr. Duque',
    recommendation: scan.recommendation
  } : null);

  const displayStatus = showReview 
    ? `Specialist Verified: ${reviewData?.verdict}` 
    : patient.status === 'Submitted' 
      ? 'Pending OB-GYN Verification' 
      : 'Ready for Submission';

  const displayPatient = isEditing ? editedPatient : patient;
  const riskScore = scan?.riskScore || displayPatient.riskScore || 15;

  return (
    <div className="device-container">
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
          <button className="back-btn" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={18} style={{ marginRight: '6px' }} />
            Return
          </button>

          {/* Edit controls */}
          <div style={{ 
            display: 'flex', 
            gap: '8px', 
            marginTop: '14px', 
            justifyContent: 'flex-end' 
          }}>
            {!isEditing ? (
              <button 
                onClick={handleStartEdit}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: '600',
                  backgroundColor: 'var(--primary-teal)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <Edit2 size={14} />
                Edit Patient Data
              </button>
            ) : (
              <>
                <button 
                  onClick={handleCancelEdit}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: '600',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <X size={14} />
                  Cancel
                </button>
                <button 
                  onClick={handleSaveEdit}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: '600',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <Save size={14} />
                  Save & Recalculate
                </button>
              </>
            )}
          </div>

          {/* Header patient */}
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
            {/* Left: Best Frame and strips */}
            <div className="best-frame-box">
              <div className="best-frame-display">
                <img src="http://localhost:5000/assets/ultrasound_sweep.png" alt="Best frame" />
              </div>
              <div className="best-frame-label">Best frame</div>
              <div className="mini-frames-grid">
                {[2, 3, 4, 5].map(i => (
                  <div key={i} className="mini-frame-thumbnail">
                    <img src="http://localhost:5000/assets/ultrasound_sweep.png" alt={`frame ${i}`} />
                  </div>
                ))}
              </div>
            </div>

            {/* Right: details, status, recommendations */}
            <div className="results-info-column">
              <div>
                <div className="info-section-meta">{patient.timestamp}</div>
                <div className="info-section-meta">{patient.location}</div>
                
                <div style={{ marginTop: '8px' }}>
                  <span className="info-status-label">Status</span>
                  <div className="info-status-value" style={{ 
                    color: showReview && reviewData?.verdict === 'Urgent Referral' ? 'var(--red-alert)' :
                           showReview && reviewData?.verdict === 'Warning' ? 'var(--orange-alert)' :
                           showReview ? 'var(--green-normal)' : 'var(--orange-alert)'
                  }}>
                    {displayStatus}
                  </div>
                  {showReview && (
                    <>
                      <div className="info-section-meta" style={{ marginTop: '2px' }}>
                        Review Received on: {reviewData?.time}
                      </div>
                      <div className="info-section-meta">
                        Authorized by: <span style={{ color: 'var(--primary-teal)', fontWeight: '700' }}>
                          {reviewData?.authorizedBy}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Risk Score */}
              <RiskSpeedometer score={riskScore} />

              {/* Maternal Vitals */}
              <div className="info-card">
                <h4>Vitals</h4>
                <div className="info-card-row">
                  <span className="info-card-label">BMI</span>
                  <span className="info-card-val">{displayPatient.bmi}</span>
                </div>
                {isEditing && (
                  <>
                    <div className="info-card-row" style={{ marginTop: '8px' }}>
                      <span className="info-card-label">Weight (kg)</span>
                      <input
                        type="number"
                        step="0.1"
                        value={editedPatient.weight}
                        onChange={(e) => handleFieldChange('weight', e.target.value)}
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          width: '80px'
                        }}
                      />
                    </div>
                    <div className="info-card-row">
                      <span className="info-card-label">Height (cm)</span>
                      <input
                        type="number"
                        step="0.1"
                        value={editedPatient.height}
                        onChange={(e) => handleFieldChange('height', e.target.value)}
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          width: '80px'
                        }}
                      />
                    </div>
                    <div className="info-card-row">
                      <span className="info-card-label">BP</span>
                      <input
                        type="text"
                        value={editedPatient.bp}
                        onChange={(e) => handleFieldChange('bp', e.target.value)}
                        placeholder="120/80"
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          width: '80px'
                        }}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Blood Pressure Scale Matrix */}
              <BloodPressureScale bp={displayPatient.bp} />

              {/* Fetal Vitals */}
              <div className="info-card">
                <h4>Fetal Vitals</h4>
                <div className="info-card-row">
                  <span className="info-card-label">Heart Rate</span>
                  <span className="info-card-val">{patient.heartRate ? `${patient.heartRate} bpm` : '140 bpm'}</span>
                </div>
                <div className="info-card-row">
                  <span className="info-card-label">Age Est</span>
                  <span className="info-card-val">{patient.fetalAge || 'Est: 24w 3d'}</span>
                </div>
              </div>

              {/* Risk Factors - Editable */}
              {isEditing && (
                <div className="info-card" style={{ marginTop: '8px' }}>
                  <h4 style={{ marginBottom: '12px' }}>Risk Factors</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={editedPatient.riskFactors?.hypertension || false}
                        onChange={(e) => handleRiskFactorChange('hypertension', e.target.checked)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span>Chronic Hypertension</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={editedPatient.riskFactors?.family || false}
                        onChange={(e) => handleRiskFactorChange('family', e.target.checked)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span>Family History</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={editedPatient.riskFactors?.firstpreg || false}
                        onChange={(e) => handleRiskFactorChange('firstpreg', e.target.checked)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span>First Pregnancy</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={editedPatient.riskFactors?.multiple || false}
                        onChange={(e) => handleRiskFactorChange('multiple', e.target.checked)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span>Multiple Gestation</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={editedPatient.riskFactors?.diabetes || false}
                        onChange={(e) => handleRiskFactorChange('diabetes', e.target.checked)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span>Diabetes</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={editedPatient.riskFactors?.csection || false}
                        onChange={(e) => handleRiskFactorChange('csection', e.target.checked)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span>Previous C-Section</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={editedPatient.riskFactors?.pain || false}
                        onChange={(e) => handleRiskFactorChange('pain', e.target.checked)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span>Current Pain/Bleeding</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recalculation History */}
          {recalculationHistory.length > 0 && (
            <div className="info-card" style={{ 
              marginTop: '16px', 
              marginBottom: '12px',
              borderLeft: '4px solid var(--orange-alert)',
              backgroundColor: 'var(--bg-light)'
            }}>
              <h4 style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-dark)', marginBottom: '8px' }}>
                Risk Score Recalculation History
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recalculationHistory.slice(-3).reverse().map((entry, idx) => (
                  <div key={idx} style={{ 
                    padding: '8px',
                    backgroundColor: 'var(--bg-white)',
                    borderRadius: '6px',
                    fontSize: '10px',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ fontWeight: '700', color: 'var(--text-dark)', marginBottom: '4px' }}>
                      {new Date(entry.timestamp).toLocaleString()}
                    </div>
                    <div style={{ color: 'var(--text-medium)', marginBottom: '4px' }}>
                      Risk Score: {entry.oldRiskScore}% → {entry.newRiskScore}%
                      {entry.newRiskScore > entry.oldRiskScore && (
                        <span style={{ color: 'var(--red-alert)', marginLeft: '4px' }}>↑ Increased</span>
                      )}
                      {entry.newRiskScore < entry.oldRiskScore && (
                        <span style={{ color: 'var(--green-normal)', marginLeft: '4px' }}>↓ Decreased</span>
                      )}
                    </div>
                    {entry.changedFields.length > 0 && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '9px' }}>
                        Changes: {entry.changedFields.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Specialist notes */}
          {showReview && reviewData?.recommendation && (
            <div className="info-card" style={{ 
              marginTop: '16px', 
              marginBottom: '24px', 
              borderLeft: '4px solid var(--primary-teal)',
              backgroundColor: 'var(--primary-teal-light)'
            }}>
              <h4 style={{ fontSize: '11px', fontWeight: '700', color: 'var(--primary-teal-dark)' }}>
                Specialist Verified Notes
              </h4>
              <p style={{ fontSize: '11px', color: 'var(--text-dark)', marginTop: '4px', lineHeight: '1.4' }}>
                {reviewData.recommendation}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
