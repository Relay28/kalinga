import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api } from '../services/api';
import { seedPatients } from '../data/seedPatients';

// 1. Preeclampsia Risk Speedometer Gauge Chart
function RiskSpeedometer({ score }) {
  const needleRotation = (score / 100) * 180 - 90;
  const color = score >= 70 ? 'var(--red-alert)' : score >= 40 ? 'var(--orange-alert)' : 'var(--green-normal)';
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', margin: '8px 0', width: '100%' }}>
      <svg width="160" height="85" viewBox="0 0 120 70">
        <path d="M 10 60 A 50 50 0 0 1 110 60" fill="none" stroke="#e2e8f0" strokeWidth="8" strokeLinecap="round" />
        <path d="M 10 60 A 50 50 0 0 1 44.5 12.5" fill="none" stroke="#10b981" strokeWidth="8" />
        <path d="M 44.5 12.5 A 50 50 0 0 1 89.4 19.6" fill="none" stroke="#f97316" strokeWidth="8" />
        <path d="M 89.4 19.6 A 50 50 0 0 1 110 60" fill="none" stroke="#ef4444" strokeWidth="8" strokeLinecap="round" />
        <circle cx="60" cy="60" r="5" fill="#1e293b" />
        <line x1="60" y1="60" x2="60" y2="20" stroke="#1e293b" strokeWidth="2.5" strokeLinecap="round" 
              transform={`rotate(${needleRotation} 60 60)`} style={{ transition: 'transform 1s ease-in-out' }} />
      </svg>
      <div style={{ fontSize: '22px', fontWeight: '800', color, marginTop: '-8px' }}>
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
    <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '12px', paddingTop: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold', marginBottom: '8px' }}>
        <span style={{ color: 'var(--text-medium)', fontWeight: '500' }}>Blood Pressure</span>
        <span style={{ color: bpInfo.color }}>{bp} — {bpInfo.label}</span>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', height: '8px', marginBottom: '6px' }}>
        {[0, 1, 2, 3, 4].map(lvl => (
          <div key={lvl} style={{
            borderRadius: '2px',
            backgroundColor: lvl === bpInfo.level ? bpInfo.color : '#e2e8f0',
            boxShadow: lvl === bpInfo.level ? `0 0 6px ${bpInfo.color}` : 'none',
            opacity: lvl === bpInfo.level ? 1 : 0.35,
            transition: 'all 0.5s ease'
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: 'var(--text-muted)', fontWeight: '600' }}>
        <span>Normal</span>
        <span>Elevated</span>
        <span>Stage 1</span>
        <span>Stage 2</span>
        <span>Crisis</span>
      </div>
    </div>
  );
}


export default function PatientDetails({ isOnline, onToggleOnline, showToast }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [timeStr, setTimeStr] = useState('09:41');
  const [patient, setPatient] = useState(null);
  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);

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
      } catch (err) {
        showToast("Error loading patient details", "warning");
      } finally {
        setLoading(false);
      }
    };

    fetchPatientData();
  }, [id, isOnline]);

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

  const riskScore = scan?.riskScore || patient.riskScore || 15;

  return (
    <div className="device-container">
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
          <button className="back-btn" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={18} style={{ marginRight: '6px' }} />
            Return
          </button>

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

          {/* Clean Vertical Feed */}
          <div className="patient-details-feed" style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '24px' }}>
            
            {/* 1. Clinical Status & Specialist Notes Card */}
            <div className="info-card" style={{ borderLeft: `4px solid ${
              showReview && reviewData?.verdict === 'Urgent Referral' ? 'var(--red-alert)' :
              showReview && reviewData?.verdict === 'Warning' ? 'var(--orange-alert)' :
              showReview ? 'var(--green-normal)' : 'var(--orange-alert)'
            }` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <h4 style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0, letterSpacing: '0.5px' }}>Triage Status</h4>
                  <div style={{ 
                    fontFamily: 'var(--font-display)',
                    fontSize: '14px',
                    fontWeight: '800',
                    color: showReview && reviewData?.verdict === 'Urgent Referral' ? 'var(--red-alert)' :
                           showReview && reviewData?.verdict === 'Warning' ? 'var(--orange-alert)' :
                           showReview ? 'var(--green-normal)' : 'var(--orange-alert)',
                    marginTop: '4px'
                  }}>
                    {displayStatus}
                  </div>
                </div>
              </div>
              
              <div style={{ fontSize: '11px', color: 'var(--text-medium)', display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid var(--border-color)', paddingTop: '8px', marginTop: '8px' }}>
                <div><strong>Scan Taken:</strong> {patient.timestamp}</div>
                <div><strong>Location:</strong> {patient.location}</div>
                {showReview && (
                  <>
                    <div><strong>Reviewed On:</strong> {reviewData?.time}</div>
                    <div><strong>Authorized By:</strong> <span style={{ color: 'var(--primary-teal-dark)', fontWeight: '700' }}>{reviewData?.authorizedBy}</span></div>
                  </>
                )}
              </div>

              {/* Specialist recommendation notes integrated in status card */}
              {showReview && reviewData?.recommendation && (
                <div style={{ 
                  marginTop: '12px', 
                  padding: '10px 12px',
                  borderRadius: '8px', 
                  borderLeft: '3px solid var(--primary-teal)',
                  backgroundColor: 'var(--primary-teal-light)'
                }}>
                  <h5 style={{ fontSize: '10px', fontWeight: '800', color: 'var(--primary-teal-dark)', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.3px' }}>
                    Specialist Notes & Actions
                  </h5>
                  <p style={{ fontSize: '11px', color: 'var(--text-dark)', margin: 0, lineHeight: '1.4', fontStyle: 'italic' }}>
                    "{reviewData.recommendation}"
                  </p>
                </div>
              )}
            </div>

            {/* 2. Ultrasound Scan Card */}
            <div className="info-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h4 style={{ fontSize: '12px', fontWeight: '800', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', margin: 0 }}>Ultrasound Scan</h4>
              
              <div style={{ width: '100%', position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1.5px solid var(--border-color)', backgroundColor: 'var(--primary-teal-light)' }}>
                <img src="http://localhost:5000/assets/ultrasound_sweep.png" alt="Best frame" style={{ width: '100%', display: 'block', objectFit: 'cover', height: '180px' }} />
                <div style={{ position: 'absolute', bottom: '8px', left: '8px', backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', padding: '2px 8px', borderRadius: '4px', fontSize: '9px', fontWeight: 'bold' }}>
                  Best Frame
                </div>
              </div>

              <div>
                <h5 style={{ fontSize: '10px', fontWeight: '700', color: 'var(--text-medium)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Other Sweep Frames</h5>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {[2, 3, 4, 5].map(i => (
                    <div key={i} style={{ aspectRatio: '1.2', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-color)', backgroundColor: 'var(--primary-teal-light)' }}>
                      <img src="http://localhost:5000/assets/ultrasound_sweep.png" alt={`frame ${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. AI Preliminary Flag Card */}
            <div className="info-card" style={{ 
              borderLeft: `4px solid ${riskScore >= 70 ? 'var(--red-alert)' : riskScore >= 40 ? 'var(--orange-alert)' : 'var(--green-normal)'}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              <h4 style={{ fontSize: '12px', fontWeight: '800', width: '100%', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '8px', textAlign: 'left' }}>
                AI Preliminary Assessment
              </h4>
              <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold', marginBottom: '8px' }}>
                <span style={{ color: 'var(--text-medium)' }}>Risk Level:</span>
                <span style={{ color: riskScore >= 70 ? 'var(--red-alert)' : riskScore >= 40 ? 'var(--orange-alert)' : 'var(--green-normal)' }}>
                  {riskScore >= 70 ? 'HIGH RISK' : riskScore >= 40 ? 'MODERATE RISK' : 'LOW RISK'}
                </span>
              </div>
              
              <RiskSpeedometer score={riskScore} />
              
              <div style={{ fontSize: '9.5px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '4px', lineHeight: '1.3' }}>
                *This is an AI screening estimation computed based on sweep telemetry and is not a definitive diagnosis.
              </div>
            </div>

            {/* 4. Maternal Health Vitals Card */}
            <div className="info-card">
              <h4 style={{ fontSize: '12px', fontWeight: '800', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '10px' }}>
                Maternal Health Vitals
              </h4>
              <div className="info-card-row" style={{ paddingBottom: '6px', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                <span className="info-card-label" style={{ fontWeight: '500', color: 'var(--text-medium)' }}>BMI</span>
                <span className="info-card-val" style={{ fontWeight: '700', color: 'var(--text-dark)' }}>
                  {patient.bmi} <span style={{ fontWeight: 'normal', fontSize: '10px', color: 'var(--text-muted)' }}>({parseFloat(patient.bmi) >= 30 ? 'Obese' : parseFloat(patient.bmi) >= 25 ? 'Overweight' : 'Normal'})</span>
                </span>
              </div>
              
              <BloodPressureScale bp={patient.bp} />
            </div>

            {/* 5. Fetal Health Vitals Card */}
            <div className="info-card">
              <h4 style={{ fontSize: '12px', fontWeight: '800', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '10px' }}>
                Fetal Health Vitals
              </h4>
              <div className="info-card-row" style={{ fontSize: '12px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span className="info-card-label" style={{ fontWeight: '500', color: 'var(--text-medium)' }}>Fetal Heart Rate</span>
                <span className="info-card-val" style={{ fontWeight: '700', color: 'var(--primary-teal-dark)' }}>
                  {patient.heartRate ? `${patient.heartRate} bpm` : '140 bpm'}
                </span>
              </div>
              <div className="info-card-row" style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
                <span className="info-card-label" style={{ fontWeight: '500', color: 'var(--text-medium)' }}>Gestational Age Estimate</span>
                <span className="info-card-val" style={{ fontWeight: '700', color: 'var(--text-dark)' }}>
                  {patient.fetalAge || 'Est: 24w 3d'}
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
