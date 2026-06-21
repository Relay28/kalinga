import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { CheckCircle, AlertTriangle, AlertOctagon, User, BookOpen, Clock, Activity, Search, Filter, TrendingUp, Users, FileText, Calendar } from 'lucide-react';

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
    <div style={{
      width: '100%',
      minHeight: '100vh',
      backgroundColor: '#f1f5f9',
      fontFamily: 'var(--font-body)'
    }}>
      {/* Header bar */}
      <header style={{
        backgroundColor: '#0f172a',
        color: '#ffffff',
        padding: '16px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img 
            src="http://localhost:5000/Screens/KalingaAI_Logo.png" 
            alt="kalinga" 
            style={{ height: '32px', filter: 'brightness(0) invert(1)' }}
          />
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: '700', letterSpacing: '-0.5px', margin: 0 }}>
              OB-GYN Specialist Portal
            </h2>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0 0' }}>Dr. Duque - Regional Verification Desk</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ textAlign: 'right', marginRight: '12px' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>Online Status</div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
              Connected
            </div>
          </div>
          <button 
            className="btn-teal"
            style={{ padding: '8px 16px', fontSize: '12px' }}
            onClick={() => navigate('/dashboard')}
          >
            Midwife Dashboard
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

      <div style={{ padding: '24px 32px', maxWidth: '1800px', margin: '0 auto' }}>
        
        {/* Statistics Dashboard */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', marginBottom: '24px' }}>
          <div style={{ 
            backgroundColor: 'white', 
            padding: '20px', 
            borderRadius: '12px', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #3b82f6'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Total Scans</div>
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>{statistics.total}</div>
              </div>
              <FileText size={24} color="#3b82f6" />
            </div>
          </div>

          <div style={{ 
            backgroundColor: 'white', 
            padding: '20px', 
            borderRadius: '12px', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #f97316'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Pending Review</div>
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>{statistics.pending}</div>
              </div>
              <Clock size={24} color="#f97316" />
            </div>
          </div>

          <div style={{ 
            backgroundColor: 'white', 
            padding: '20px', 
            borderRadius: '12px', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #10b981'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Reviewed</div>
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>{statistics.reviewed}</div>
              </div>
              <CheckCircle size={24} color="#10b981" />
            </div>
          </div>

          <div style={{ 
            backgroundColor: 'white', 
            padding: '20px', 
            borderRadius: '12px', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #ef4444'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>High Risk Cases</div>
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>{statistics.highRisk}</div>
              </div>
              <AlertOctagon size={24} color="#ef4444" />
            </div>
          </div>

          <div style={{ 
            backgroundColor: 'white', 
            padding: '20px', 
            borderRadius: '12px', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            borderLeft: '4px solid #8b5cf6'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>Avg Risk Score</div>
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#0f172a', marginTop: '4px' }}>{statistics.avgRisk}%</div>
              </div>
              <TrendingUp size={24} color="#8b5cf6" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ marginBottom: '20px', display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0' }}>
          <button
            onClick={() => setActiveTab('pending')}
            style={{
              padding: '12px 24px',
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === 'pending' ? '#0f172a' : '#64748b',
              fontWeight: activeTab === 'pending' ? '700' : '500',
              fontSize: '14px',
              cursor: 'pointer',
              borderBottom: activeTab === 'pending' ? '3px solid #0891b2' : '3px solid transparent',
              marginBottom: '-2px',
              fontFamily: 'var(--font-display)'
            }}
          >
            Pending Reviews ({statistics.pending})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            style={{
              padding: '12px 24px',
              border: 'none',
              backgroundColor: 'transparent',
              color: activeTab === 'all' ? '#0f172a' : '#64748b',
              fontWeight: activeTab === 'all' ? '700' : '500',
              fontSize: '14px',
              cursor: 'pointer',
              borderBottom: activeTab === 'all' ? '3px solid #0891b2' : '3px solid transparent',
              marginBottom: '-2px',
              fontFamily: 'var(--font-display)'
            }}
          >
            All Cases ({statistics.total})
          </button>
        </div>

        {/* Main Content Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '20px', minHeight: '600px' }}>
          
          {/* Left Panel: Cases List with Search and Filter */}
          <div style={{ 
            backgroundColor: 'white', 
            borderRadius: '12px', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Search and Filter */}
            <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ position: 'relative', marginBottom: '12px' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search by patient name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 8px 8px 36px',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '13px',
                    outline: 'none',
                    fontFamily: 'var(--font-body)'
                  }}
                />
              </div>
              
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <Filter size={14} color="#64748b" />
                <select
                  value={filterRisk}
                  onChange={(e) => setFilterRisk(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '12px',
                    outline: 'none',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)'
                  }}
                >
                  <option value="all">All Risk Levels</option>
                  <option value="high">High Risk (≥70%)</option>
                  <option value="moderate">Moderate Risk (40-69%)</option>
                  <option value="low">Low Risk (&lt;40%)</option>
                </select>
              </div>
            </div>

            {/* Cases List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
              {loading ? (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', padding: '40px 0' }}>
                  Loading cases...
                </p>
              ) : filteredScans.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0', fontSize: '12px' }}>
                  <Activity size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
                  <p>No cases match your filters.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {filteredScans.map(s => {
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
                          borderRadius: '10px',
                          backgroundColor: isSelected ? '#e0f2fe' : '#f8fafc',
                          border: isSelected ? '2px solid #0891b2' : '1px solid #e2e8f0',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#64748b', marginBottom: '4px' }}>
                          <span>{s.timestamp}</span>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: s.status === 'Submitted' ? '#fef3c7' : '#d1fae5',
                            color: s.status === 'Submitted' ? '#92400e' : '#065f46',
                            fontWeight: '600'
                          }}>
                            {s.status}
                          </span>
                        </div>
                        <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a', margin: '4px 0' }}>
                          {s.patientName}
                        </h4>
                        <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>
                          ID: {s.patientId.substring(0, 16)}...
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{
                            fontSize: '10px',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontWeight: '700',
                            color: s.riskScore >= 70 ? '#991b1b' : s.riskScore >= 40 ? '#9a3412' : '#065f46',
                            backgroundColor: s.riskScore >= 70 ? '#fee2e2' : s.riskScore >= 40 ? '#ffedd5' : '#d1fae5'
                          }}>
                            {s.riskScore >= 70 ? 'HIGH' : s.riskScore >= 40 ? 'MODERATE' : 'LOW'} RISK
                          </span>
                          <span style={{ fontSize: '13px', fontWeight: '800', color: '#0f172a' }}>
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

          {/* Right Panel: Case Details and OB-GYN verification */}
          <div style={{ 
            backgroundColor: 'white', 
            borderRadius: '12px', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            padding: '28px',
            overflowY: 'auto' 
          }}>
            {selectedScan ? (
              <div style={{ animation: 'screenFadeIn 0.35s ease' }}>
                
                {/* Patient Header Details */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #e2e8f0', paddingBottom: '18px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <div style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '12px',
                      backgroundColor: '#e0f2fe',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <User size={32} color="#0891b2" />
                    </div>
                    <div>
                      <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
                        {selectedScan.patientName}
                      </h1>
                      <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                        PhilHealth ID: <span style={{ fontWeight: '700' }}>{selectedScan.patientId}</span>
                      </p>
                      <p style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        Age: {activePat?.age || '27'} | Location: {selectedScan.location}
                      </p>
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: '11px',
                      fontWeight: '700',
                      color: selectedScan.status === 'Submitted' ? '#f97316' : '#10b981',
                      backgroundColor: selectedScan.status === 'Submitted' ? '#ffedd5' : '#d1fae5',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      marginBottom: '8px'
                    }}>
                      <Clock size={12} /> {selectedScan.status}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      Submitted: {selectedScan.timestamp}
                    </div>
                  </div>
                </div>

                {/* Grid: Scan Frame vs Vitals */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '28px', marginBottom: '28px' }}>
                  
                  {/* Left: Best Frame & ultrasound strip */}
                  <div>
                    <h3 style={{ fontSize: '13px', fontWeight: '700', color: '#0f172a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Activity size={16} color="#0891b2" />
                      Ultrasound Diagnostics Sweep
                    </h3>
                    
                    <div style={{
                      width: '100%',
                      aspectRatio: '1.3',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      border: '2px solid #e2e8f0',
                      backgroundColor: '#000000',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      position: 'relative',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                    }}>
                      <img 
                        src="http://localhost:5000/assets/ultrasound_sweep.png" 
                        alt="Ultrasound sweep"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div style={{
                        position: 'absolute',
                        bottom: '12px',
                        right: '12px',
                        backgroundColor: 'rgba(0,0,0,0.75)',
                        color: 'white',
                        padding: '4px 12px',
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: '600'
                      }}>
                        Scan Quality: {selectedScan.scanQualityScore}%
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '12px' }}>
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} style={{ 
                          aspectRatio: '1.3', 
                          borderRadius: '8px', 
                          overflow: 'hidden', 
                          border: '2px solid #e2e8f0',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}>
                          <img 
                            src="http://localhost:5000/assets/ultrasound_sweep.png" 
                            alt="thumbnail"
                            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${1 + (i*0.05)})` }}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Patient History Section */}
                    <div style={{ 
                      marginTop: '20px', 
                      padding: '16px', 
                      backgroundColor: '#f8fafc', 
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0'
                    }}>
                      <h4 style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <BookOpen size={14} color="#64748b" />
                        Clinical History
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '11px' }}>
                        <div>
                          <span style={{ color: '#64748b' }}>Pregnancy History:</span>
                          <div style={{ fontWeight: '600', color: '#0f172a' }}>{activePat?.history || 'G2 P1'}</div>
                        </div>
                        <div>
                          <span style={{ color: '#64748b' }}>LMP:</span>
                          <div style={{ fontWeight: '600', color: '#0f172a' }}>{activePat?.lmp || 'N/A'}</div>
                        </div>
                        <div>
                          <span style={{ color: '#64748b' }}>Mobile:</span>
                          <div style={{ fontWeight: '600', color: '#0f172a' }}>{activePat?.mobile || 'N/A'}</div>
                        </div>
                        <div>
                          <span style={{ color: '#64748b' }}>Midwife ID:</span>
                          <div style={{ fontWeight: '600', color: '#0f172a' }}>{activePat?.midwifeId || 'N/A'}</div>
                        </div>
                      </div>
                      
                      {/* Risk Factors */}
                      {activePat?.riskFactors && (
                        <div style={{ marginTop: '12px' }}>
                          <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '6px' }}>Risk Factors:</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {Object.entries(activePat.riskFactors)
                              .filter(([_, value]) => value)
                              .map(([key, _]) => (
                                <span key={key} style={{
                                  fontSize: '10px',
                                  padding: '3px 8px',
                                  backgroundColor: '#fee2e2',
                                  color: '#991b1b',
                                  borderRadius: '4px',
                                  fontWeight: '600'
                                }}>
                                  {key.replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Maternal/Fetal telemetry details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    {/* AI Triage Report */}
                    <RiskSpeedometer score={selectedScan.riskScore} />

                    {/* Vitals */}
                    <div style={{ padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#fefce8' }}>
                      <h4 style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #fef08a', paddingBottom: '8px', marginBottom: '10px' }}>
                        Maternal Vitals
                      </h4>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
                        <span style={{ color: '#64748b' }}>Blood Pressure</span>
                        <span style={{ fontWeight: '700', color: '#0f172a' }}>{selectedScan.bp}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
                        <span style={{ color: '#64748b' }}>BMI</span>
                        <span style={{ fontWeight: '700', color: '#0f172a' }}>{selectedScan.bmi}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ color: '#64748b' }}>Weight</span>
                        <span style={{ fontWeight: '700', color: '#0f172a' }}>{activePat?.weight || 'N/A'} kg</span>
                      </div>
                    </div>

                    {/* Blood Pressure Scale Matrix */}
                    <BloodPressureScale bp={selectedScan.bp} />

                    {/* Fetal Vitals */}
                    <div style={{ padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0', backgroundColor: '#dbeafe' }}>
                      <h4 style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #93c5fd', paddingBottom: '8px', marginBottom: '10px' }}>
                        Fetal Vitals
                      </h4>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
                        <span style={{ color: '#64748b' }}>Heart Rate</span>
                        <span style={{ fontWeight: '700', color: '#0f172a' }}>{selectedScan.fetalHeartRate} bpm</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                        <span style={{ color: '#64748b' }}>Gestational Age</span>
                        <span style={{ fontWeight: '700', color: '#0f172a' }}>{selectedScan.gestationalAgeEstimate}</span>
                      </div>
                    </div>

                    {/* AI Recommendation */}
                    <div style={{ 
                      padding: '16px', 
                      borderRadius: '12px', 
                      border: '2px solid #fbbf24',
                      backgroundColor: '#fffbeb'
                    }}>
                      <h4 style={{ fontSize: '12px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>
                        AI Suggested Action
                      </h4>
                      <div style={{ 
                        fontSize: '13px', 
                        fontWeight: '700',
                        color: selectedScan.riskScore >= 70 ? '#991b1b' : '#9a3412'
                      }}>
                        {selectedScan.suggestedFlag || 'Pending Review'}
                      </div>
                    </div>
                  </div>

                </div>

                {/* OB-GYN Clinical Verification panel */}
                <div style={{ 
                  borderTop: '2px solid #e2e8f0', 
                  paddingTop: '24px', 
                  backgroundColor: '#f8fafc', 
                  borderRadius: '12px', 
                  padding: '24px',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
                }}>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={18} color="#0891b2" />
                    OB-GYN Clinical Verdict & Sign-off
                  </h3>
                  
                  <div style={{ marginBottom: '18px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '8px' }}>
                      Clinical Recommendations / Treatment Notes
                    </label>
                    <textarea 
                      rows={5}
                      value={recommendation}
                      onChange={e => setRecommendation(e.target.value)}
                      placeholder="Enter clinical recommendations, treatment requirements, follow-up timelines, or specialist referral notes..."
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '2px solid #e2e8f0',
                        outline: 'none',
                        fontSize: '13px',
                        fontFamily: 'var(--font-body)',
                        resize: 'vertical',
                        backgroundColor: 'white'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                    <button 
                      className="btn-teal"
                      disabled={verifying}
                      onClick={() => handleVerify('Normal')}
                      style={{ 
                        backgroundColor: '#10b981', 
                        color: 'white', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        padding: '10px 20px',
                        fontSize: '13px',
                        fontWeight: '600'
                      }}
                    >
                      <CheckCircle size={16} /> Verify Normal
                    </button>
                    <button 
                      className="btn-blue"
                      disabled={verifying}
                      onClick={() => handleVerify('Warning')}
                      style={{ 
                        backgroundColor: '#f97316', 
                        color: 'white', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        padding: '10px 20px',
                        fontSize: '13px',
                        fontWeight: '600'
                      }}
                    >
                      <AlertTriangle size={16} /> Mark Warning
                    </button>
                    <button 
                      className="btn-blue"
                      disabled={verifying}
                      onClick={() => handleVerify('Urgent Referral')}
                      style={{ 
                        backgroundColor: '#ef4444', 
                        color: 'white', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px',
                        padding: '10px 20px',
                        fontSize: '13px',
                        fontWeight: '600'
                      }}
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
                color: '#94a3b8',
                textAlign: 'center'
              }}>
                <Activity size={64} style={{ marginBottom: '16px', opacity: 0.3 }} />
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>
                  No Case Selected
                </h3>
                <p style={{ fontSize: '13px', maxWidth: '300px' }}>
                  Select a pending triage case from the sidebar to begin review and verification.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
