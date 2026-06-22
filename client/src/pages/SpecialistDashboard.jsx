import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { CheckCircle, AlertTriangle, AlertOctagon, User, BookOpen, Clock, Activity, Search, Filter, TrendingUp, Users, FileText, Calendar, ArrowLeft } from 'lucide-react';

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
        <path d="M 10 60 A 50 50 0 0 1 44.5 12.5" fill="none" stroke="#10b981" strokeWidth="8" />
        <path d="M 44.5 12.5 A 50 50 0 0 1 89.4 19.6" fill="none" stroke="#f97316" strokeWidth="8" />
        <path d="M 89.4 19.6 A 50 50 0 0 1 110 60" fill="none" stroke="#ef4444" strokeWidth="8" strokeLinecap="round" />
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
  const [allScans, setAllScans] = useState([]);
  const [pendingScans, setPendingScans] = useState([]);
  const [selectedScan, setSelectedScan] = useState(null);
  const [recommendation, setRecommendation] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState('pending'); // pending, all, statistics
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRisk, setFilterRisk] = useState('all'); // all, high, moderate, low
  const [statistics, setStatistics] = useState({
    total: 0,
    pending: 0,
    reviewed: 0,
    highRisk: 0,
    avgRisk: 0
  });

  const [showDetail, setShowDetail] = useState(false);
  const [timeStr, setTimeStr] = useState('09:41');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch all scans and compute statistics
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const scans = await api.getScans();
      const patients = await api.getPatients();
      
      // Merge patient details into scans
      const merged = scans.map(s => {
        const patient = patients.find(p => p.id === s.patientId);
        return {
          ...s,
          patientName: patient ? `${patient.firstName} ${patient.lastName}` : 'Unknown Patient',
          patientDetails: patient
        };
      });

      setAllScans(merged);
      
      const pending = merged.filter(s => s.status === 'Submitted');
      setPendingScans(pending);
      
      // Calculate statistics
      const stats = {
        total: merged.length,
        pending: pending.length,
        reviewed: merged.filter(s => s.status !== 'Submitted' && s.status !== 'Ready for Submission').length,
        highRisk: merged.filter(s => s.riskScore >= 70).length,
        avgRisk: merged.length > 0 ? Math.round(merged.reduce((sum, s) => sum + (s.riskScore || 0), 0) / merged.length) : 0
      };
      setStatistics(stats);
      
      // Auto-select first pending case if available
      if (pending.length > 0 && !selectedScan) {
        setSelectedScan(pending[0]);
        setRecommendation(pending[0].recommendation || '');
      }
    } catch (err) {
      console.warn("Failed to load data from server:", err);
      showToast("Using offline data mode", "warning");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    // Refresh data every 30 seconds
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
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
      await fetchAllData();
      
      // Move to next pending case if available
      const remainingPending = pendingScans.filter(s => s.id !== selectedScan.id);
      if (remainingPending.length > 0) {
        setSelectedScan(remainingPending[0]);
        setRecommendation(remainingPending[0].recommendation || '');
      } else {
        setSelectedScan(null);
        setShowDetail(false);
      }
    } catch (err) {
      showToast(`Verification Failed: ${err.message}`, "warning");
    } finally {
      setVerifying(false);
    }
  };

  // Filter and search scans
  const getFilteredScans = () => {
    let scans = activeTab === 'pending' ? pendingScans : allScans;
    
    // Apply search filter
    if (searchQuery) {
      scans = scans.filter(s => 
        s.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.patientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply risk filter
    if (filterRisk !== 'all') {
      scans = scans.filter(s => {
        if (filterRisk === 'high') return s.riskScore >= 70;
        if (filterRisk === 'moderate') return s.riskScore >= 40 && s.riskScore < 70;
        if (filterRisk === 'low') return s.riskScore < 40;
        return true;
      });
    }
    
    return scans;
  };

  const filteredScans = getFilteredScans();

  const activePat = selectedScan?.patientDetails;
  return (
    <div className="device-container">
      {/* Time and Connectivity header */}
      <div className="device-header-notch" style={{ backgroundColor: '#0f172a', color: '#94a3b8', borderBottom: '1px solid #1e293b' }}>
        <span>{timeStr}</span>
        <div className="icons" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '10px', color: '#94a3b8' }}>OB-GYN Portal</span>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
        </div>
      </div>

      <div className="app-viewport" style={{ backgroundColor: '#f1f5f9' }}>
        {/* Header bar */}
        <header style={{
          backgroundColor: '#0f172a',
          color: '#ffffff',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img 
              src="http://localhost:5000/Screens/KalingaAI_Logo.png" 
              alt="kalinga" 
              style={{ height: '24px', filter: 'brightness(0) invert(1)' }}
            />
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: '700', letterSpacing: '-0.3px', margin: 0 }}>
                OB-GYN Portal
              </h2>
              <p style={{ fontSize: '9px', color: '#94a3b8', margin: '0' }}>Dr. Duque</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <button 
              className="btn-teal"
              style={{ padding: '4px 8px', fontSize: '9.5px', borderRadius: '6px' }}
              onClick={() => navigate('/dashboard')}
            >
              Midwife
            </button>
            <button 
              style={{
                padding: '4px 8px',
                fontSize: '9.5px',
                backgroundColor: 'transparent',
                border: '1px solid #475569',
                borderRadius: '6px',
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

        {/* Content Viewport */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          {!showDetail ? (
            /* LIST VIEW */
            <div style={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column', 
              padding: '12px 14px', 
              overflow: 'hidden'
            }}>
              {/* Statistics Dashboard */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px', marginBottom: '10px', flexShrink: 0 }}>
                <div style={{ backgroundColor: 'white', padding: '8px 10px', borderRadius: '8px', borderLeft: '3px solid #3b82f6', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ fontSize: '9px', color: '#64748b', fontWeight: '600' }}>Total Scans</div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{statistics.total}</div>
                </div>
                <div style={{ backgroundColor: 'white', padding: '8px 10px', borderRadius: '8px', borderLeft: '3px solid #f97316', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ fontSize: '9px', color: '#64748b', fontWeight: '600' }}>Pending</div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{statistics.pending}</div>
                </div>
                <div style={{ backgroundColor: 'white', padding: '8px 10px', borderRadius: '8px', borderLeft: '3px solid #10b981', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ fontSize: '9px', color: '#64748b', fontWeight: '600' }}>Reviewed</div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{statistics.reviewed}</div>
                </div>
                <div style={{ backgroundColor: 'white', padding: '8px 10px', borderRadius: '8px', borderLeft: '3px solid #ef4444', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ fontSize: '9px', color: '#64748b', fontWeight: '600' }}>High Risk</div>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>{statistics.highRisk}</div>
                </div>
                <div style={{ gridColumn: 'span 2', backgroundColor: 'white', padding: '6px 10px', borderRadius: '8px', borderLeft: '3px solid #8b5cf6', boxShadow: 'var(--shadow-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '9px', color: '#64748b', fontWeight: '600' }}>Avg Risk Score</span>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#8b5cf6' }}>{statistics.avgRisk}%</span>
                </div>
              </div>

              {/* Tabs */}
              <div style={{ marginBottom: '10px', display: 'flex', borderBottom: '2px solid #e2e8f0', flexShrink: 0 }}>
                <button
                  onClick={() => setActiveTab('pending')}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: activeTab === 'pending' ? '#0f172a' : '#64748b',
                    fontWeight: activeTab === 'pending' ? '700' : '500',
                    fontSize: '12px',
                    cursor: 'pointer',
                    borderBottom: activeTab === 'pending' ? '2.5px solid #0891b2' : '2.5px solid transparent',
                    marginBottom: '-2px',
                    fontFamily: 'var(--font-display)'
                  }}
                >
                  Pending ({statistics.pending})
                </button>
                <button
                  onClick={() => setActiveTab('all')}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    border: 'none',
                    backgroundColor: 'transparent',
                    color: activeTab === 'all' ? '#0f172a' : '#64748b',
                    fontWeight: activeTab === 'all' ? '700' : '500',
                    fontSize: '12px',
                    cursor: 'pointer',
                    borderBottom: activeTab === 'all' ? '2.5px solid #0891b2' : '2.5px solid transparent',
                    marginBottom: '-2px',
                    fontFamily: 'var(--font-display)'
                  }}
                >
                  All ({statistics.total})
                </button>
              </div>

              {/* Search and Filter */}
              <div style={{ padding: '8px 0', borderBottom: '1px solid #e2e8f0', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={12} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="Search patient name or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '5px 8px 5px 26px',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '11px',
                      outline: 'none',
                      fontFamily: 'var(--font-body)'
                    }}
                  />
                </div>
                
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <Filter size={11} color="#64748b" />
                  <select
                    value={filterRisk}
                    onChange={(e) => setFilterRisk(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '4px 6px',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '6px',
                      fontSize: '10.5px',
                      outline: 'none',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-body)'
                    }}
                  >
                    <option value="all">All Risks</option>
                    <option value="high">High Risk (≥70%)</option>
                    <option value="moderate">Mod Risk (40-69%)</option>
                    <option value="low">Low Risk (&lt;40%)</option>
                  </select>
                </div>
              </div>

              {/* Scrollable Cases List */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {loading ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '11px', padding: '20px 0' }}>
                    Loading cases...
                  </p>
                ) : filteredScans.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0', fontSize: '11px' }}>
                    <Activity size={20} style={{ marginBottom: '4px', opacity: 0.5 }} />
                    <p>No cases found.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {filteredScans.map(s => {
                      const isSelected = selectedScan?.id === s.id;
                      return (
                        <div 
                          key={s.id}
                          onClick={() => {
                            setSelectedScan(s);
                            setRecommendation(s.recommendation || '');
                            setShowDetail(true);
                          }}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '10px',
                            backgroundColor: '#ffffff',
                            border: isSelected ? '2px solid #0891b2' : '1px solid #e2e8f0',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: 'var(--shadow-sm)'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', color: '#64748b', marginBottom: '2px' }}>
                            <span>{s.timestamp}</span>
                            <span style={{
                              padding: '1px 4px',
                              borderRadius: '3px',
                              backgroundColor: s.status === 'Submitted' ? '#fef3c7' : '#d1fae5',
                              color: s.status === 'Submitted' ? '#92400e' : '#065f46',
                              fontWeight: '600'
                            }}>
                              {s.status}
                            </span>
                          </div>
                          <h4 style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', margin: '2px 0' }}>
                            {s.patientName}
                          </h4>
                          <div style={{ fontSize: '9.5px', color: '#64748b', marginBottom: '4px' }}>
                            ID: {s.patientId.substring(0, 16)}...
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{
                              fontSize: '8.5px',
                              padding: '1px 5px',
                              borderRadius: '10px',
                              fontWeight: '700',
                              color: s.riskScore >= 70 ? '#991b1b' : s.riskScore >= 40 ? '#9a3412' : '#065f46',
                              backgroundColor: s.riskScore >= 70 ? '#fee2e2' : s.riskScore >= 40 ? '#ffedd5' : '#d1fae5'
                            }}>
                              {s.riskScore >= 70 ? 'HIGH' : s.riskScore >= 40 ? 'MODERATE' : 'LOW'}
                            </span>
                            <span style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a' }}>
                              {s.riskScore}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* DETAIL VIEW */
            <div style={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column', 
              padding: '12px 14px', 
              overflowY: 'auto'
            }}>
              <button 
                className="back-btn" 
                onClick={() => setShowDetail(false)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-dark)',
                  fontFamily: 'var(--font-display)',
                  fontWeight: '700',
                  fontSize: '13px',
                  alignSelf: 'flex-start',
                  marginBottom: '10px'
                }}
              >
                <ArrowLeft size={14} /> Return to Cases
              </button>

              {selectedScan ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', animation: 'screenFadeIn 0.3s ease' }}>
                  
                  {/* Patient Header Details */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        backgroundColor: '#e0f2fe',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <User size={20} color="#0891b2" />
                      </div>
                      <div>
                        <h1 style={{ fontSize: '14px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                          {selectedScan.patientName}
                        </h1>
                        <p style={{ fontSize: '9.5px', color: '#64748b', marginTop: '1px' }}>
                          ID: <span style={{ fontWeight: '700' }}>{selectedScan.patientId.substring(0, 16)}...</span>
                        </p>
                        <p style={{ fontSize: '9px', color: '#64748b' }}>
                          Age: {activePat?.age || '27'} | Loc: {selectedScan.location}
                        </p>
                      </div>
                    </div>
                    
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        fontSize: '8.5px',
                        fontWeight: '700',
                        color: selectedScan.status === 'Submitted' ? '#f97316' : '#10b981',
                        backgroundColor: selectedScan.status === 'Submitted' ? '#ffedd5' : '#d1fae5',
                        padding: '2.5px 6px',
                        borderRadius: '4px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}>
                        <Clock size={8.5} /> {selectedScan.status}
                      </span>
                      <div style={{ fontSize: '8px', color: '#64748b', marginTop: '4px' }}>
                        {selectedScan.timestamp}
                      </div>
                    </div>
                  </div>

                  {/* AI Triage Gauge speedometer */}
                  <RiskSpeedometer score={selectedScan.riskScore} />

                  {/* Vitals Cards Stack */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* Maternal Vitals */}
                    <div style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#fefce8' }}>
                      <h4 style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a', borderBottom: '1px solid #fef08a', paddingBottom: '4px', marginBottom: '6px' }}>
                        Maternal Vitals
                      </h4>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '4px' }}>
                        <span style={{ color: '#64748b' }}>Blood Pressure</span>
                        <span style={{ fontWeight: '700', color: '#0f172a' }}>{selectedScan.bp}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '4px' }}>
                        <span style={{ color: '#64748b' }}>BMI</span>
                        <span style={{ fontWeight: '700', color: '#0f172a' }}>{selectedScan.bmi}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                        <span style={{ color: '#64748b' }}>Weight</span>
                        <span style={{ fontWeight: '700', color: '#0f172a' }}>{activePat?.weight || 'N/A'} kg</span>
                      </div>
                    </div>

                    {/* Blood Pressure Matrix */}
                    <BloodPressureScale bp={selectedScan.bp} />

                    {/* Fetal Vitals */}
                    <div style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#dbeafe' }}>
                      <h4 style={{ fontSize: '11px', fontWeight: '800', color: '#0f172a', borderBottom: '1px solid #93c5fd', paddingBottom: '4px', marginBottom: '6px' }}>
                        Fetal Vitals
                      </h4>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '4px' }}>
                        <span style={{ color: '#64748b' }}>Heart Rate</span>
                        <span style={{ fontWeight: '700', color: '#0f172a' }}>{selectedScan.fetalHeartRate} bpm</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                        <span style={{ color: '#64748b' }}>Gestational Age</span>
                        <span style={{ fontWeight: '700', color: '#0f172a' }}>{selectedScan.gestationalAgeEstimate}</span>
                      </div>
                    </div>

                    {/* AI suggested action */}
                    <div style={{ padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #fbbf24', backgroundColor: '#fffbeb' }}>
                      <h4 style={{ fontSize: '10.5px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>
                        AI Suggested Action
                      </h4>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: selectedScan.riskScore >= 70 ? '#991b1b' : '#9a3412' }}>
                        {selectedScan.suggestedFlag || 'Pending Review'}
                      </div>
                    </div>
                  </div>

                  {/* Ultrasound & Images */}
                  <div style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: 'white' }}>
                    <h4 style={{ fontSize: '11.5px', fontWeight: '700', color: '#0f172a', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Activity size={12} color="#0891b2" />
                      Sweep Image View
                    </h4>
                    
                    <div style={{
                      width: '100%',
                      aspectRatio: '1.4',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      backgroundColor: '#000',
                      position: 'relative'
                    }}>
                      <img 
                        src="http://localhost:5000/assets/ultrasound_sweep.png" 
                        alt="Ultrasound"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div style={{ position: 'absolute', bottom: '6px', right: '6px', backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', padding: '2px 6px', borderRadius: '3px', fontSize: '8px' }}>
                        Quality: {selectedScan.scanQualityScore}%
                      </div>
                    </div>

                    {/* Thumbnails */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginTop: '8px' }}>
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} style={{ aspectRatio: '1.4', borderRadius: '4px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                          <img 
                            src="http://localhost:5000/assets/ultrasound_sweep.png" 
                            alt="thumbnail"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${1 + (i*0.05)})` }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Patient History */}
                  <div style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                    <h4 style={{ fontSize: '11px', fontWeight: '700', color: '#0f172a', marginBottom: '6px' }}>
                      Clinical History
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '9.5px' }}>
                      <div><span style={{ color: '#64748b' }}>History:</span> <strong style={{ color: '#0f172a' }}>{activePat?.history || 'G2 P1'}</strong></div>
                      <div><span style={{ color: '#64748b' }}>LMP:</span> <strong style={{ color: '#0f172a' }}>{activePat?.lmp || 'N/A'}</strong></div>
                      <div><span style={{ color: '#64748b' }}>Mobile:</span> <strong style={{ color: '#0f172a' }}>{activePat?.mobile || 'N/A'}</strong></div>
                      <div><span style={{ color: '#64748b' }}>Midwife:</span> <strong style={{ color: '#0f172a' }}>{activePat?.midwifeId || 'N/A'}</strong></div>
                    </div>
                    {activePat?.riskFactors && (
                      <div style={{ marginTop: '8px' }}>
                        <div style={{ fontSize: '9px', color: '#64748b', marginBottom: '3px' }}>Risk Factors:</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px' }}>
                          {Object.entries(activePat.riskFactors)
                            .filter(([_, value]) => value)
                            .map(([key, _]) => (
                              <span key={key} style={{ fontSize: '8px', padding: '1px 4px', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '3px', fontWeight: '600' }}>
                                {key.replace(/([A-Z])/g, ' $1').trim()}
                              </span>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Specialist Signoff */}
                  <div style={{ padding: '10px 12px', borderRadius: '10px', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                    <h3 style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>
                      Specialist Sign-off & Verdict
                    </h3>
                    <textarea
                      rows={3}
                      value={recommendation}
                      onChange={e => setRecommendation(e.target.value)}
                      placeholder="Enter clinical recommendations, treatment requirements, or follow-up notes..."
                      style={{
                        width: '100%',
                        padding: '6px 8px',
                        borderRadius: '6px',
                        border: '1.5px solid #e2e8f0',
                        fontSize: '11px',
                        fontFamily: 'var(--font-body)',
                        resize: 'none',
                        backgroundColor: 'white',
                        outline: 'none',
                        marginBottom: '8px'
                      }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <button 
                        className="btn-teal"
                        disabled={verifying}
                        onClick={() => handleVerify('Normal')}
                        style={{ backgroundColor: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '6px 10px', fontSize: '10px', fontWeight: '600', borderRadius: '6px' }}
                      >
                        <CheckCircle size={12} /> Verify Normal
                      </button>
                      <button 
                        className="btn-blue"
                        disabled={verifying}
                        onClick={() => handleVerify('Warning')}
                        style={{ backgroundColor: '#f97316', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '6px 10px', fontSize: '10px', fontWeight: '600', borderRadius: '6px' }}
                      >
                        <AlertTriangle size={12} /> Mark Warning
                      </button>
                      <button 
                        className="btn-blue"
                        disabled={verifying}
                        onClick={() => handleVerify('Urgent Referral')}
                        style={{ backgroundColor: '#ef4444', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', padding: '6px 10px', fontSize: '10px', fontWeight: '600', borderRadius: '6px' }}
                      >
                        <AlertOctagon size={12} /> Urgent Referral
                      </button>
                    </div>
                  </div>

                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', color: '#94a3b8' }}>
                  <Activity size={32} />
                  <p style={{ fontSize: '11px', marginTop: '6px' }}>No Case Selected</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
