import React, { useState, useEffect, useRef } from 'react';
import { 
  Check, 
  Edit, 
  Printer, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Activity,
  FileText
} from 'lucide-react';

interface QueueItem {
  id: string;
  risk_score: number;
  triage_level: 'LOW' | 'MODERATE' | 'HIGH';
  systolic_bp: number;
  diastolic_bp: number;
  gestational_age_weeks: number;
  protein_urine: string;
  symptoms: string[];
  frame_thumbnail_b64: string | null;
  ai_prediction_abnormal: number;
  specialist_verdict: string;
  client_captured_at: string;
  synced_at: string;
  patient_name: string;
  patient_age: number;
  gravida: number;
  para: number;
  midwife_name: string;
  station: string;
}

interface QueueStats {
  pending: number;
  critical: number;
  reviewed: number;
  total: number;
}

export default function SpecialistPortal() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<QueueStats | null>(null);
  const [selectedItem, setSelectedItem] = useState<QueueItem | null>(null);
  
  // Detailed single triage item fetch
  const [detailedTriage, setDetailedTriage] = useState<any>(null);
  const [activeReportData, setActiveReportData] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'work' | 'report'>('work');

  // Form inputs
  const [verdict, setVerdict] = useState<'confirmed' | 'escalated' | 'overridden'>('confirmed');
  const [notes, setNotes] = useState('');
  const [specialistRecommendations, setSpecialistRecommendations] = useState('');
  const [overrideRiskScore, setOverrideRiskScore] = useState<number>(50);

  // Review timer (Target: <60 seconds checkout)
  const [reviewSeconds, setReviewSeconds] = useState(0);
  const timerRef = useRef<any>(null);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

  const fetchQueue = async () => {
    try {
      const token = localStorage.getItem('kalinga_auth_token') || 'mock-jwt-token';
      const res = await fetch(`${API_URL}/api/triage/queue?status=pending&limit=50`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setQueue(data.queue);
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch specialist queue:', err);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 15000); // Auto-refresh queue list every 15 seconds
    return () => clearInterval(interval);
  }, []);

  // Timer counter
  useEffect(() => {
    if (selectedItem) {
      setReviewSeconds(0);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setReviewSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [selectedItem]);

  const handleSelectItem = async (item: QueueItem) => {
    setSelectedItem(item);
    setDetailedTriage(null);
    setActiveReportData(null);
    setViewMode('work');
    setVerdict('confirmed');
    setNotes('');
    setSpecialistRecommendations('');
    setOverrideRiskScore(item.risk_score);

    // Fetch detailed packet (containing potentially large full base64 frame)
    try {
      const token = localStorage.getItem('kalinga_auth_token') || 'mock-jwt-token';
      const res = await fetch(`${API_URL}/api/triage/${item.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDetailedTriage(data);
      }
    } catch (err) {
      console.error('Failed to load triage detail:', err);
    }
  };

  const handleSubmitVerdict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    try {
      const token = localStorage.getItem('kalinga_auth_token') || 'mock-jwt-token';
      const res = await fetch(`${API_URL}/api/triage/${selectedItem.id}/verdict`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          verdict,
          notes,
          specialistRecommendations,
          overrideRiskScore: verdict === 'overridden' ? overrideRiskScore : undefined
        })
      });

      if (res.ok) {
        // Fetch report data for immediate view/print capability
        const reportRes = await fetch(`${API_URL}/api/triage/${selectedItem.id}/report`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (reportRes.ok) {
          const reportData = await reportRes.json();
          setActiveReportData(reportData);
          setViewMode('report');
        }

        // Refresh queue
        setSelectedItem(null);
        setDetailedTriage(null);
        fetchQueue();
      }
    } catch (err) {
      console.error('Failed to submit specialist verdict:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="dashboard-grid">
      
      {/* SIDEBAR QUEUE LIST */}
      <div className="queue-sidebar">
        <div className="glass-card" style={{ padding: '16px' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>📊 Triage Inbox Status</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.85rem' }}>
            <div style={{ background: '#131924', padding: '10px', borderRadius: '6px' }}>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>PENDING</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-primary)' }}>{stats?.pending || 0}</div>
            </div>
            <div style={{ background: '#131924', padding: '10px', borderRadius: '6px' }}>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>CRITICAL</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-accent)' }}>{stats?.critical || 0}</div>
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ flex: 1, padding: '16px', display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '12px' }}>Inbox Queue</h3>
          <div className="queue-list">
            {queue.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 10px', color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                <CheckCircle2 size={36} style={{ color: 'var(--color-low)', marginBottom: '8px', opacity: 0.8 }} />
                <p>All scanned sweeps reviewed. Queue clear!</p>
              </div>
            ) : (
              queue.map(item => (
                <div 
                  key={item.id} 
                  onClick={() => handleSelectItem(item)}
                  className={`queue-item card-triage-${item.triage_level} ${selectedItem?.id === item.id ? 'active' : ''}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.patient_name}</span>
                    <span className={`text-triage-${item.triage_level}`} style={{ fontWeight: 700, fontSize: '0.8rem' }}>
                      {item.risk_score}%
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    <span>GA: {item.gestational_age_weeks}w</span>
                    <span>{item.station.split(' ')[1] || 'BHS'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* DETAIL WORKSPACE / REPORT VIEW */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {viewMode === 'work' && selectedItem && (
          <div className="glass-card">
            
            {/* Active Specialist Verification Timer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: '14px', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem' }}>🩺 Reviewing Scan: {selectedItem.patient_name}</h2>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                  Submitted from: <span style={{ color: '#fff' }}>{selectedItem.station}</span> by {selectedItem.midwife_name || 'BHW Midwife'}
                </p>
              </div>
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  background: reviewSeconds > 60 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(0, 181, 165, 0.15)', 
                  border: '1px solid',
                  borderColor: reviewSeconds > 60 ? 'var(--color-high)' : 'var(--color-primary)',
                  padding: '6px 12px', 
                  borderRadius: '6px',
                  color: reviewSeconds > 60 ? 'var(--color-high)' : 'var(--color-primary)'
                }}
              >
                <Clock size={16} />
                <span style={{ fontWeight: 600, fontSize: '0.9rem', fontFamily: 'monospace' }}>
                  {Math.floor(reviewSeconds / 60)}:{(reviewSeconds % 60).toString().padStart(2, '0')}
                </span>
                {reviewSeconds > 60 && <span style={{ fontSize: '0.75rem' }}>(Over Target)</span>}
              </div>
            </div>

            <div className="detail-panel">
              {/* Vitals, Stats & Frame column */}
              <div>
                {/* Vitals Cards */}
                <h3 style={{ fontSize: '1rem', marginBottom: '12px' }}>📊 Patient Demographics & Vitals</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ background: '#131924', padding: '10px', borderRadius: '6px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>AGE | GRAVIDA/PARA</span>
                    <p style={{ fontWeight: 500 }}>{selectedItem.patient_age} y/o | G{selectedItem.gravida}P{selectedItem.para}</p>
                  </div>
                  <div style={{ background: '#131924', padding: '10px', borderRadius: '6px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>BLOOD PRESSURE</span>
                    <p style={{ fontWeight: 600, color: selectedItem.systolic_bp >= 140 ? 'var(--color-high)' : '#fff' }}>
                      {selectedItem.systolic_bp}/{selectedItem.diastolic_bp} mmHg
                    </p>
                  </div>
                  <div style={{ background: '#131924', padding: '10px', borderRadius: '6px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>GESTATIONAL AGE | BMI</span>
                    <p style={{ fontWeight: 500 }}>{selectedItem.gestational_age_weeks} weeks | {detailedTriage?.bmi || 'N/A'}</p>
                  </div>
                  <div style={{ background: '#131924', padding: '10px', borderRadius: '6px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>URINE PROTEIN</span>
                    <p style={{ fontWeight: 600, color: selectedItem.protein_urine !== 'negative' ? 'var(--color-high)' : '#fff' }}>
                      {selectedItem.protein_urine}
                    </p>
                  </div>
                </div>

                {/* Symptoms list */}
                {selectedItem.symptoms && selectedItem.symptoms.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>ACTIVE CLINICAL SYMPTOMS</span>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                      {selectedItem.symptoms.map((s, idx) => (
                        <span key={idx} style={{ background: 'rgba(255, 90, 54, 0.15)', border: '1px solid rgba(255,90,54,0.3)', color: 'var(--color-high)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ultrasound Snapshot Viewer */}
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>CAPURED ULTRASOUND FRAME</span>
                  <div 
                    style={{ 
                      marginTop: '6px', 
                      background: '#000', 
                      borderRadius: '8px', 
                      overflow: 'hidden', 
                      aspectRatio: '4/3', 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      border: '1px solid var(--color-border)' 
                    }}
                  >
                    {detailedTriage?.frame_base64 ? (
                      <img src={detailedTriage.frame_base64} alt="Ultrasound frame" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>No frame capture sent</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Verdict submit column */}
              <div>
                <div className="glass-card" style={{ background: 'rgba(12, 16, 23, 0.5)' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: '16px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <Activity size={16} className="text-teal" /> AI Evaluation Stats
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Composite AI Abnormality Confidence:</span>
                      <span style={{ fontWeight: 600 }}>{(selectedItem.ai_prediction_abnormal * 100).toFixed(0)}%</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Estimated Risk Score:</span>
                      <span style={{ fontWeight: 600 }}>{selectedItem.risk_score}% ({selectedItem.triage_level} Risk)</span>
                    </div>
                  </div>

                  {detailedTriage?.aiSummary && (
                    <div style={{ background: '#131924', padding: '12px', borderRadius: '6px', marginBottom: '20px', fontSize: '0.85rem', border: '1px dashed var(--color-primary)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600 }}>🧠 CLINICAL AI DETECTION SUMMARY</span>
                      <p style={{ marginTop: '6px', color: '#e2e8f0', lineHeight: '1.4' }}>{detailedTriage.aiSummary}</p>
                    </div>
                  )}

                  <form onSubmit={handleSubmitVerdict}>
                    <div className="input-group">
                      <label className="input-label">Verification Verdict *</label>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                        <button 
                          type="button" 
                          onClick={() => setVerdict('confirmed')} 
                          className={`btn ${verdict === 'confirmed' ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ flex: 1, padding: '8px 4px', fontSize: '0.8rem' }}
                        >
                          <Check size={14} /> Confirm
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setVerdict('escalated')} 
                          className={`btn ${verdict === 'escalated' ? 'btn-accent' : 'btn-secondary'}`}
                          style={{ flex: 1, padding: '8px 4px', fontSize: '0.8rem' }}
                        >
                          <AlertTriangle size={14} /> Escalate
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setVerdict('overridden')} 
                          className={`btn ${verdict === 'overridden' ? 'btn-danger' : 'btn-secondary'}`}
                          style={{ flex: 1, padding: '8px 4px', fontSize: '0.8rem' }}
                        >
                          <Edit size={14} /> Override
                        </button>
                      </div>
                    </div>

                    {verdict === 'overridden' && (
                      <div className="input-group">
                        <label className="input-label">Adjust Risk Score Override (0-100%)</label>
                        <input 
                          type="number" 
                          className="form-input" 
                          min={0} 
                          max={100} 
                          value={overrideRiskScore} 
                          onChange={e => setOverrideRiskScore(parseInt(e.target.value) || 0)} 
                        />
                      </div>
                    )}

                    <div className="input-group">
                      <label className="input-label">Verification notes / comments</label>
                      <textarea 
                        className="form-textarea" 
                        rows={3} 
                        placeholder="Add comments on standard plane sweep quality, biometry landmarks, etc..."
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                      />
                    </div>

                    <div className="input-group">
                      <label className="input-label">Clinical recommendations for BHC midwife *</label>
                      <textarea 
                        required
                        className="form-textarea" 
                        rows={3} 
                        placeholder="Define recommendations (e.g. routine monitoring, weekly BP monitoring, immediate referral)..."
                        value={specialistRecommendations}
                        onChange={e => setSpecialistRecommendations(e.target.value)}
                      />
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>
                      Submit Diagnostic Verdict
                    </button>
                  </form>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* WORKSPACE DETAILED DIAGNOSTIC REPORT SHEET */}
        {viewMode === 'report' && activeReportData && (
          <div className="glass-card" style={{ maxWidth: '800px', margin: '0 auto', background: '#fff', color: '#000', padding: 0 }}>
            
            {/* Header toolbar */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', background: 'var(--color-bg-deepest)', borderBottom: '1px solid var(--color-border)', borderRadius: '12px 12px 0 0' }}>
              <button onClick={() => setViewMode('work')} className="btn btn-secondary">
                Back to Dashboard
              </button>
              <button onClick={handlePrint} className="btn btn-primary">
                <Printer size={16} /> Print Diagnostic Report
              </button>
            </div>

            {/* Diagnostic Report Sheet */}
            <div className="report-sheet">
              <div className="report-header">
                <h1 className="report-title">{activeReportData.reportHeader.title}</h1>
                <p className="report-meta">Reference: {activeReportData.reportHeader.referenceId} | Issued: {new Date(activeReportData.reportHeader.timestamp).toLocaleString()}</p>
                <p className="report-meta" style={{ fontStyle: 'italic', color: 'red', marginTop: '6px' }}>{activeReportData.reportHeader.disclaimer}</p>
              </div>

              <div className="report-grid">
                {/* Patient section */}
                <div className="report-section">
                  <h4 className="report-section-title">👤 Patient Demographics</h4>
                  <table style={{ width: '100%', fontSize: '0.85rem' }}>
                    <tbody>
                      <tr>
                        <td className="report-label">Full Name:</td>
                        <td className="report-value">{activeReportData.patientInfo.name}</td>
                      </tr>
                      <tr>
                        <td className="report-label">Age:</td>
                        <td className="report-value">{activeReportData.patientInfo.age} years old</td>
                      </tr>
                      <tr>
                        <td className="report-label">PhilHealth ID:</td>
                        <td className="report-value" style={{ fontFamily: 'monospace' }}>{activeReportData.patientInfo.philhealthId || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td className="report-label">Gravida/Para:</td>
                        <td className="report-value">G{activeReportData.patientInfo.gravida} P{activeReportData.patientInfo.para}</td>
                      </tr>
                      <tr>
                        <td className="report-label">LMP | EDD:</td>
                        <td className="report-value">{activeReportData.patientInfo.lmp || 'N/A'} | {activeReportData.patientInfo.edd || 'N/A'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Vitals Section */}
                <div className="report-section">
                  <h4 className="report-section-title">📊 Clinical Parameters</h4>
                  <table style={{ width: '100%', fontSize: '0.85rem' }}>
                    <tbody>
                      <tr>
                        <td className="report-label">Blood Pressure:</td>
                        <td className="report-value">{activeReportData.clinicalData.vitals.bloodPressure}</td>
                      </tr>
                      <tr>
                        <td className="report-label">Heart Rate:</td>
                        <td className="report-value">{activeReportData.clinicalData.vitals.heartRate}</td>
                      </tr>
                      <tr>
                        <td className="report-label">Gestational Age:</td>
                        <td className="report-value">{activeReportData.clinicalData.vitals.gestationalAge}</td>
                      </tr>
                      <tr>
                        <td className="report-label">Maternal BMI:</td>
                        <td className="report-value">{activeReportData.clinicalData.vitals.bmi}</td>
                      </tr>
                      <tr>
                        <td className="report-label">Urine Protein:</td>
                        <td className="report-value" style={{ fontWeight: 600 }}>{activeReportData.clinicalData.triageIndicators.proteinuria}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Assessment Section */}
              <div className="report-section" style={{ background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                <h4 className="report-section-title">🧠 AI Triage & Specialist Assessment</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: '0.85rem' }}>AI Estimated Probability: <strong>{activeReportData.assessment.initialAiScore}% ({activeReportData.assessment.initialAiLevel} Risk)</strong></p>
                    <p style={{ fontSize: '0.85rem' }}>Specialist Adjusted Override: <strong>{activeReportData.assessment.specialistOverrideScore !== null ? `${activeReportData.assessment.specialistOverrideScore}%` : 'None'}</strong></p>
                    <p style={{ fontSize: '1rem', marginTop: '6px' }}>Final Risk Assessment: <strong>{activeReportData.assessment.finalScore}%</strong></p>
                  </div>
                  <div className={`report-risk-badge report-badge-${activeReportData.assessment.finalRiskLevel}`}>
                    {activeReportData.assessment.finalRiskLevel} RISK
                  </div>
                </div>
                {activeReportData.assessment.aiSummary && (
                  <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed #cbd5e1', fontSize: '0.85rem' }}>
                    <strong style={{ color: '#0f172a' }}>AI Detection Analysis:</strong>
                    <p style={{ marginTop: '2px', color: '#334155', fontStyle: 'italic' }}>{activeReportData.assessment.aiSummary}</p>
                  </div>
                )}
              </div>

              {/* Specialist Verdict Section */}
              <div className="report-section" style={{ marginBottom: '24px' }}>
                <h4 className="report-section-title">🩺 OB-GYN Specialist Verification</h4>
                <p style={{ fontSize: '0.85rem', marginBottom: '4px' }}><strong>Verdict Status:</strong> <span style={{ textTransform: 'uppercase', fontWeight: 700 }}>{activeReportData.verification.verdict}</span></p>
                <p style={{ fontSize: '0.85rem', marginBottom: '8px' }}><strong>Specialist Notes:</strong> {activeReportData.verification.notes}</p>
                <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', padding: '12px', borderRadius: '4px', fontSize: '0.9rem' }}>
                  <strong>📋 Specialist Clinical Recommendations:</strong>
                  <p style={{ marginTop: '4px', fontWeight: 500, color: '#92400e' }}>{activeReportData.verification.clinicalRecommendations}</p>
                </div>
              </div>

              {/* Signatures & Tracking */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', borderTop: '1px solid #eee', paddingTop: '20px' }}>
                <div>
                  <p><strong>Midwife Intake:</strong> {activeReportData.epidemiology.midwife}</p>
                  <p><strong>Health Center:</strong> {activeReportData.epidemiology.barangayHealthStation}</p>
                  <p><strong>Location coordinates:</strong> Lat {activeReportData.epidemiology.coordinates.latitude?.toFixed(4)}, Lng {activeReportData.epidemiology.coordinates.longitude?.toFixed(4)}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: 700 }}>{activeReportData.verification.specialistName}</p>
                  <p>POGS Specialist Consultant</p>
                  <p>License ID: {activeReportData.verification.specialistLicense}</p>
                </div>
              </div>

              <div style={{ marginTop: '40px', borderTop: '1px solid #ddd', paddingTop: '10px', fontSize: '0.65rem', color: '#666', textAlign: 'center' }}>
                {activeReportData.reportHeader.frameworkCompliance}
              </div>
            </div>

          </div>
        )}

        {!selectedItem && !activeReportData && (
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '400px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            <FileText size={64} style={{ marginBottom: '16px', opacity: 0.3 }} />
            <h3 style={{ color: '#fff', fontSize: '1.25rem', marginBottom: '6px' }}>Remote OB-GYN Verification Desk</h3>
            <p style={{ maxWidth: '400px', fontSize: '0.9rem' }}>
              Select a pending patient scan sweep from the sidebar queue to start the 60-second verification review checkout.
            </p>
          </div>
        )}

      </div>

    </div>
  );
}
