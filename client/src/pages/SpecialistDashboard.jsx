import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { CheckCircle, AlertTriangle, AlertOctagon, User, BookOpen, Clock, Activity } from 'lucide-react';

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
    <div style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-white)', boxShadow: 'var(--shadow-sm)' }}>
      <h4 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-dark)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '8px' }}>
        Maternal BP Danger Matrix
      </h4>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 'bold', marginBottom: '6px' }}>
        <span style={{ color: 'var(--text-medium)' }}>BP Ratio:</span>
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
        <span>Elevated</span>
        <span>Stage 1</span>
        <span>Stage 2</span>
        <span>Crisis</span>
      </div>
    </div>
  );
}

export default function SpecialistDashboard({ showToast }) {
  const navigate = useNavigate();
  const [pendingScans, setPendingScans] = useState([]);
  const [selectedScan, setSelectedScan] = useState(null);
  const [recommendation, setRecommendation] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  // Fetch all pending scans (status === 'Submitted')
  const fetchPendingCases = async () => {
    setLoading(true);
    try {
      const scans = await api.getScans();
      const patients = await api.getPatients();
      
      // Merge patient details into scans
      const merged = scans
        .filter(s => s.status === 'Submitted')
        .map(s => {
          const patient = patients.find(p => p.id === s.patientId);
          return {
            ...s,
            patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient',
            patientDetails: patient
          };
        });

      setPendingScans(merged);
      
      // Auto-select first case if available
      if (merged.length > 0) {
        setSelectedScan(merged[0]);
      } else {
        setSelectedScan(null);
      }
    } catch (err) {
      console.warn("Failed to load pending cases from server:", err);
      showToast("Server connection failed. Showing seed data.", "warning");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingCases();
  }, []);

  const handleVerify = async (verdict) => {
    if (!selectedScan) return;
    setVerifying(true);
    showToast(`Signing off diagnostic record as: ${verdict}`, "info");

    try {
      await api.verifyScan(selectedScan.id, {
        verdict,
        recommendation,
        specialistName: 'Dr. Duque'
      });

      showToast(`Verification submitted successfully! Status updated to ${verdict}`, "success");
      setRecommendation('');
      await fetchPendingCases();
    } catch (err) {
      showToast(`Verification Failed: ${err.message}`, "warning");
    } finally {
      setVerifying(false);
    }
  };

  const activePat = selectedScan?.patientDetails;

  return (
    <div style={{
      width: '100%',
      maxWidth: '1200px',
      minHeight: '80vh',
      backgroundColor: 'var(--bg-white)',
      borderRadius: '24px',
      boxShadow: 'var(--shadow-lg)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      fontFamily: 'var(--font-body)',
      margin: '0 auto'
    }}>
      {/* Header bar */}
      <header style={{
        backgroundColor: '#0f172a',
        color: '#ffffff',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img 
            src="http://localhost:5000/Screens/KalingaAI_Logo.png" 
            alt="kalinga" 
            style={{ height: '32px', filter: 'brightness(0) invert(1)' }}
          />
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: '700', letterSpacing: '-0.5px' }}>
            Specialist Portal <span style={{ color: 'var(--primary-teal)', fontWeight: '400', fontSize: '14px', marginLeft: '6px' }}>OB-GYN Verification Desk</span>
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn-teal"
            style={{ padding: '8px 16px', fontSize: '12px' }}
            onClick={() => navigate('/dashboard')}
          >
            Go to Midwife App
          </button>
          <button 
            style={{
              padding: '8px 16px',
              fontSize: '12px',
              backgroundColor: 'transparent',
              border: '1px solid #475569',
              borderRadius: '8px',
              color: '#94a3b8',
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
              fontWeight: '600'
            }}
            onClick={() => {
              showToast("Logging out...", "info");
              navigate('/login');
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content Layout splits */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', flex: 1, minHeight: '600px' }}>
        
        {/* Left Panel: Cases List */}
        <div style={{ borderRight: '1px solid var(--border-color)', backgroundColor: 'var(--bg-light)', padding: '20px', overflowY: 'auto' }}>
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-dark)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Pending Reviews ({pendingScans.length})
          </h3>

          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', padding: '40px 0' }}>
              Fetching submitted scans...
            </p>
          ) : pendingScans.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0', fontSize: '12px' }}>
              All queues clear. No scans awaiting review.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {pendingScans.map(s => {
                const isSelected = selectedScan?.id === s.id;
                return (
                  <div 
                    key={s.id}
                    onClick={() => {
                      setSelectedScan(s);
                      setRecommendation(s.recommendation || '');
                    }}
                    style={{
                      padding: '14px',
                      borderRadius: '12px',
                      backgroundColor: isSelected ? 'var(--primary-teal-light)' : 'var(--bg-white)',
                      border: isSelected ? '1.5px solid var(--primary-teal)' : '1.5px solid var(--border-color)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                      <span>{s.id.substring(0, 12)}</span>
                      <span>{s.timestamp}</span>
                    </div>
                    <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-dark)', marginTop: '4px' }}>
                      {s.patientName}
                    </h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                      <span style={{
                        fontSize: '10px',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontWeight: '700',
                        color: s.riskScore >= 70 ? 'var(--red-alert)' : 'var(--orange-alert)',
                        backgroundColor: s.riskScore >= 70 ? 'var(--red-light)' : 'var(--orange-light)'
                      }}>
                        AI Flag: {s.preliminaryRiskLabel}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-dark)' }}>
                        {s.riskScore}% Risk
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Panel: Case Details and OB-GYN verification */}
        <div style={{ padding: '28px', overflowY: 'auto' }}>
          {selectedScan ? (
            <div style={{ animation: 'screenFadeIn 0.35s ease' }}>
              
              {/* Patient Header Details */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '18px', marginBottom: '20px' }}>
                <div>
                  <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-dark)' }}>
                    {selectedScan.patientName}
                  </h1>
                  <p style={{ fontSize: '12px', color: 'var(--text-medium)', marginTop: '4px' }}>
                    PhilHealth ID: <span style={{ fontWeight: '700' }}>{selectedScan.patientId}</span> | Age: {activePat?.age || '27'} | Location: {selectedScan.location}
                  </p>
                </div>
                
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: 'var(--orange-alert)',
                    backgroundColor: 'var(--orange-light)',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Clock size={12} /> Pending OB-GYN Verification
                  </div>
                </div>
              </div>

              {/* Grid: Scan Frame vs Vitals */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '28px', marginBottom: '28px' }}>
                
                {/* Left: Best Frame & ultrasound strip */}
                <div>
                  <h3 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-dark)', marginBottom: '8px' }}>
                    Ultrasound Diagnostics Sweep (FetalCLIP Frame)
                  </h3>
                  
                  <div style={{
                    width: '100%',
                    aspectRatio: '1.3',
                    borderRadius: '14px',
                    overflow: 'hidden',
                    border: '1.5px solid var(--border-color)',
                    backgroundColor: '#000000',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    position: 'relative'
                  }}>
                    <img 
                      src="http://localhost:5000/assets/ultrasound_sweep.png" 
                      alt="Ultrasound sweep"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div style={{
                      position: 'absolute',
                      bottom: '10px',
                      right: '10px',
                      backgroundColor: 'rgba(0,0,0,0.6)',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '9px'
                    }}>
                      Scan Quality Index: {selectedScan.scanQualityScore}%
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '12px' }}>
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} style={{ aspectRatio: '1.3', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                        <img 
                          src="http://localhost:5000/assets/ultrasound_sweep.png" 
                          alt="thumbnail"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${1 + (i*0.05)})` }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Maternal/Fetal telemetry details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* AI Triage Report */}
                  <RiskSpeedometer score={selectedScan.riskScore} />

                  {/* Vitals */}
                  <div style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <h4 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-dark)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '8px' }}>
                      Maternal Vitals
                    </h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                      <span style={{ color: 'var(--text-medium)' }}>BP</span>
                      <span style={{ fontWeight: '700' }}>{selectedScan.bp}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ color: 'var(--text-medium)' }}>BMI</span>
                      <span style={{ fontWeight: '700' }}>{selectedScan.bmi}</span>
                    </div>
                  </div>

                  {/* Blood Pressure Scale Matrix */}
                  <BloodPressureScale bp={selectedScan.bp} />

                  {/* Fetal Vitals */}
                  <div style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <h4 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-dark)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '8px' }}>
                      Fetal Vitals
                    </h4>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                      <span style={{ color: 'var(--text-medium)' }}>Heart Rate</span>
                      <span style={{ fontWeight: '700' }}>{selectedScan.fetalHeartRate} bpm</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ color: 'var(--text-medium)' }}>Gestational Age</span>
                      <span style={{ fontWeight: '700' }}>{selectedScan.gestationalAgeEstimate}</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* OB-GYN Clinical Verification panel */}
              <div style={{ 
                borderTop: '1px solid var(--border-color)', 
                paddingTop: '20px', 
                backgroundColor: 'var(--bg-light)', 
                borderRadius: '16px', 
                padding: '20px' 
              }}>
                <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-dark)', marginBottom: '12px' }}>
                  OB-GYN Clinical Verdict & Sign-off
                </h3>
                
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--text-medium)', marginBottom: '6px' }}>
                    Clinical Recommendations / Notes
                  </label>
                  <textarea 
                    rows={4}
                    value={recommendation}
                    onChange={e => setRecommendation(e.target.value)}
                    placeholder="Enter gynae recommendations, treatment requirements, or follow-up timelines..."
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1.5px solid var(--border-color)',
                      outline: 'none',
                      fontSize: '12px',
                      fontFamily: 'var(--font-body)',
                      resize: 'vertical'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button 
                    className="btn-teal"
                    disabled={verifying}
                    onClick={() => handleVerify('Normal')}
                    style={{ backgroundColor: 'var(--green-normal)', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <CheckCircle size={16} /> Verify Normal
                  </button>
                  <button 
                    className="btn-blue"
                    disabled={verifying}
                    onClick={() => handleVerify('Warning')}
                    style={{ backgroundColor: 'var(--orange-alert)', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <AlertTriangle size={16} /> Mark Warning
                  </button>
                  <button 
                    className="btn-blue"
                    disabled={verifying}
                    onClick={() => handleVerify('Urgent Referral')}
                    style={{ backgroundColor: 'var(--red-alert)', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <AlertOctagon size={16} /> Urgent Referral
                  </button>
                </div>
              </div>

            </div>
          ) : (
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '100%', 
              color: 'var(--text-muted)' 
            }}>
              <Activity size={48} style={{ marginBottom: '12px' }} />
              <p>Select a pending triage case from the sidebar to review.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
