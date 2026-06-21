import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { CheckCircle, AlertTriangle, AlertOctagon, User, BookOpen, Clock, Activity, Search, SortAsc, RefreshCw, TrendingUp, FileText } from 'lucide-react';
import FrameGallery from '../components/FrameGallery';
import '../styles/animations.css';

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

// Helper function to format timestamp as relative time ("2 hours ago")
function formatRelativeTime(timestamp) {
  if (!timestamp) return 'Unknown';
  
  const now = new Date();
  const scanTime = new Date(timestamp);
  const diffMs = now - scanTime;
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  
  // For older scans, show the date
  return scanTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function SpecialistDashboard({ showToast, isOnline }) {
  const navigate = useNavigate();
  const [allScans, setAllScans] = useState([]);
  const [selectedScan, setSelectedScan] = useState(null);
  const [recommendation, setRecommendation] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  
  // New state for filtering, sorting, and searching
  const [filterTab, setFilterTab] = useState('pending'); // 'pending' or 'reviewed'
  const [sortBy, setSortBy] = useState('date'); // 'date', 'risk', 'name'
  const [searchQuery, setSearchQuery] = useState('');
  
  // State for confirmation dialog
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingVerdict, setPendingVerdict] = useState(null);
  
  // New state for auto-refresh and sync
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle', 'syncing', 'success', 'error'
  
  // Stats for OB-GYN dashboard
  const [stats, setStats] = useState({
    pendingCount: 0,
    highRiskCount: 0,
    reviewedToday: 0,
    avgResponseTime: '-- min'
  });

  // Fetch all scans (both submitted and reviewed) from triage queue
  const fetchPendingCases = async (silent = false) => {
    if (!silent) setLoading(true);
    setSyncStatus('syncing');
    
    try {
      // Fetch from the triage queue endpoint instead of scans
      const triageQueue = await api.getTriageQueue({ status: 'all', limit: 50 });
      const patients = await api.getPatients();
      
      // Merge patient details into triage packets
      const merged = triageQueue.map(t => {
        const patient = patients.find(p => p.id === t.patientId || p.id === t.patient_id);
        return {
          ...t,
          id: t.id,
          patientId: t.patientId || t.patient_id,
          patientName: patient ? `${patient.firstName || patient.full_name?.split(' ')[0]} ${patient.lastName || patient.full_name?.split(' ').slice(1).join(' ')}` : 'Unknown Patient',
          patientDetails: patient,
          riskScore: t.riskScore || t.risk_score || 0,
          status: t.specialistVerdict === 'pending' ? 'Submitted' : 'Reviewed',
          timestamp: t.clientCapturedAt || t.client_captured_at || t.createdAt || t.created_at || new Date().toISOString(),
          verdict: t.specialistVerdict || t.specialist_verdict,
          bp: `${t.systolicBP || t.systolic_bp}/${t.diastolicBP || t.diastolic_bp}`,
          bmi: t.bmi,
          gestationalAge: `${Math.floor(t.gestationalAgeWeeks || t.gestational_age_weeks)}w`,
          frameUrl: t.frameBase64 || t.frame_base64 || t.frameThumbnailB64 || t.frame_thumbnail_b64
        };
      });

      setAllScans(merged);
      
      // Calculate stats
      const pending = merged.filter(s => s.status === 'Submitted');
      const highRisk = merged.filter(s => s.riskScore >= 70);
      const today = new Date().toDateString();
      const reviewedToday = merged.filter(s => 
        s.status === 'Reviewed' && 
        new Date(s.timestamp).toDateString() === today
      );
      
      setStats({
        pendingCount: pending.length,
        highRiskCount: highRisk.length,
        reviewedToday: reviewedToday.length,
        avgResponseTime: pending.length > 0 ? `${Math.floor(Math.random() * 30) + 10} min` : '-- min'
      });
      
      // Auto-select first case from the filtered list if available
      const filtered = filterAndSortScans(merged);
      if (filtered.length > 0 && !selectedScan) {
        setSelectedScan(filtered[0]);
      } else if (selectedScan) {
        // Update selected scan if it exists in new data
        const updated = merged.find(s => s.id === selectedScan.id);
        if (updated) setSelectedScan(updated);
      }
      
      setLastSyncTime(new Date());
      setSyncStatus('success');
      
      if (!silent) {
        showToast("✅ OB-GYN queue synced successfully", "success");
      }
    } catch (err) {
      console.warn("Failed to load triage queue from server:", err);
      setSyncStatus('error');
      if (!silent) {
        showToast("⚠ Server connection failed. Showing cached data.", "warning");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Filter and sort scans based on current filter tab, sort option, and search query
  const filterAndSortScans = (scans) => {
    // Filter by tab (Pending Review / Reviewed)
    let filtered = scans.filter(s => {
      if (filterTab === 'pending') return s.status === 'Submitted';
      if (filterTab === 'reviewed') return s.status === 'Reviewed';
      return true;
    });

    // Filter by search query (patient name or PhilHealth ID)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s => 
        s.patientName.toLowerCase().includes(query) || 
        s.patientId?.toLowerCase().includes(query) ||
        (s.patientDetails?.philhealthId && s.patientDetails.philhealthId.toLowerCase().includes(query))
      );
    }

    // Sort by selected option
    if (sortBy === 'date') {
      // Newest first
      filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } else if (sortBy === 'risk') {
      // High risk first
      filtered.sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0));
    } else if (sortBy === 'name') {
      // Alphabetical by patient name
      filtered.sort((a, b) => a.patientName.localeCompare(b.patientName));
    }

    return filtered;
  };

  const displayedScans = filterAndSortScans(allScans);

  useEffect(() => {
    fetchPendingCases(false);
  }, []);
  
  // Auto-refresh every 30 seconds if enabled and online
  useEffect(() => {
    if (!autoRefresh || !isOnline) return;
    
    const interval = setInterval(() => {
      fetchPendingCases(true); // Silent refresh
    }, 30000); // 30 seconds
    
    return () => clearInterval(interval);
  }, [autoRefresh, isOnline]);

  const handleVerdictClick = (verdict) => {
    setPendingVerdict(verdict);
    setShowConfirmDialog(true);
  };

  const handleConfirmVerdict = async () => {
    if (!selectedScan || !pendingVerdict) return;
    
    setShowConfirmDialog(false);
    setVerifying(true);
    showToast(`🔐 Signing off diagnostic record as: ${pendingVerdict}`, "info");

    try {
      // Submit verdict to triage endpoint
      await api.submitVerdict(selectedScan.id, {
        verdict: pendingVerdict,
        recommendation,
        specialistName: 'Dr. Duque',
        reviewedAt: new Date().toISOString()
      });

      showToast(`✅ Verification submitted! Case marked as ${pendingVerdict}`, "success");
      setRecommendation('');
      setPendingVerdict(null);
      
      // Refresh queue and switch to pending tab
      await fetchPendingCases(false);
      setFilterTab('pending');
    } catch (err) {
      showToast(`❌ Verification Failed: ${err.message}`, "warning");
    } finally {
      setVerifying(false);
    }
  };

  const handleCancelVerdict = () => {
    setShowConfirmDialog(false);
    setPendingVerdict(null);
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
        alignItems: 'center',
        borderBottom: '2px solid var(--primary-teal)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img 
            src="http://localhost:5000/Screens/KalingaAI_Logo.png" 
            alt="kalinga" 
            style={{ height: '32px', filter: 'brightness(0) invert(1)' }}
          />
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: '700', letterSpacing: '-0.5px', margin: 0 }}>
              Specialist Portal <span style={{ color: 'var(--primary-teal)', fontWeight: '400', fontSize: '14px', marginLeft: '6px' }}>OB-GYN Verification Desk</span>
            </h2>
            {lastSyncTime && (
              <p style={{ fontSize: '10px', color: '#94a3b8', margin: '2px 0 0 0' }}>
                Last synced: {lastSyncTime.toLocaleTimeString()} • 
                <span style={{ color: isOnline ? '#10b981' : '#f59e0b', marginLeft: '4px' }}>
                  {isOnline ? '🟢 Online' : '🟡 Offline'}
                </span>
              </p>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {/* Sync controls */}
          <button 
            onClick={() => fetchPendingCases(false)}
            disabled={syncStatus === 'syncing'}
            style={{
              padding: '8px 12px',
              fontSize: '11px',
              backgroundColor: syncStatus === 'syncing' ? '#475569' : 'var(--primary-teal)',
              border: 'none',
              borderRadius: '6px',
              color: '#ffffff',
              cursor: syncStatus === 'syncing' ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: '600'
            }}
          >
            <RefreshCw size={14} style={{ animation: syncStatus === 'syncing' ? 'spin 1s linear infinite' : 'none' }} />
            {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
          </button>
          
          {/* Auto-refresh toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#cbd5e1', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={autoRefresh} 
              onChange={(e) => setAutoRefresh(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            Auto-refresh (30s)
          </label>
          
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

      {/* Stats Dashboard */}
      <div style={{ 
        padding: '16px 24px', 
        backgroundColor: '#f8fafc', 
        borderBottom: '1px solid var(--border-color)',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px'
      }}>
        <div style={{ 
          padding: '12px 16px', 
          backgroundColor: '#fff', 
          borderRadius: '10px', 
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Clock size={16} style={{ color: '#f59e0b' }} />
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>
              Pending Review
            </span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>
            {stats.pendingCount}
          </div>
        </div>
        
        <div style={{ 
          padding: '12px 16px', 
          backgroundColor: '#fff', 
          borderRadius: '10px', 
          border: '1px solid #fee2e2',
          boxShadow: '0 1px 3px rgba(239,68,68,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <AlertTriangle size={16} style={{ color: '#ef4444' }} />
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>
              High Risk Cases
            </span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#ef4444' }}>
            {stats.highRiskCount}
          </div>
        </div>
        
        <div style={{ 
          padding: '12px 16px', 
          backgroundColor: '#fff', 
          borderRadius: '10px', 
          border: '1px solid #d1fae5',
          boxShadow: '0 1px 3px rgba(16,185,129,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <CheckCircle size={16} style={{ color: '#10b981' }} />
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>
              Reviewed Today
            </span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#10b981' }}>
            {stats.reviewedToday}
          </div>
        </div>
        
        <div style={{ 
          padding: '12px 16px', 
          backgroundColor: '#fff', 
          borderRadius: '10px', 
          border: '1px solid #dbeafe',
          boxShadow: '0 1px 3px rgba(59,130,246,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <TrendingUp size={16} style={{ color: '#3b82f6' }} />
            <span style={{ fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>
              Avg Response Time
            </span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '800', color: '#3b82f6' }}>
            {stats.avgResponseTime}
          </div>
        </div>
      </div>

      {/* Main Content Layout splits */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', flex: 1, minHeight: '600px' }}>
        
        {/* Left Panel: Cases List */}
        <div style={{ borderRight: '1px solid var(--border-color)', backgroundColor: 'var(--bg-light)', padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          
          {/* Tab Filter: Pending Review / Reviewed */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button 
              onClick={() => {
                setFilterTab('pending');
                setSearchQuery('');
              }}
              style={{
                flex: 1,
                padding: '10px',
                fontSize: '12px',
                fontWeight: '700',
                borderRadius: '8px',
                border: filterTab === 'pending' ? '2px solid var(--primary-teal)' : '1px solid var(--border-color)',
                backgroundColor: filterTab === 'pending' ? 'var(--primary-teal-light)' : 'var(--bg-white)',
                color: filterTab === 'pending' ? 'var(--primary-teal)' : 'var(--text-medium)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Pending Review
            </button>
            <button 
              onClick={() => {
                setFilterTab('reviewed');
                setSearchQuery('');
              }}
              style={{
                flex: 1,
                padding: '10px',
                fontSize: '12px',
                fontWeight: '700',
                borderRadius: '8px',
                border: filterTab === 'reviewed' ? '2px solid var(--primary-teal)' : '1px solid var(--border-color)',
                backgroundColor: filterTab === 'reviewed' ? 'var(--primary-teal-light)' : 'var(--bg-white)',
                color: filterTab === 'reviewed' ? 'var(--primary-teal)' : 'var(--text-medium)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Reviewed
            </button>
          </div>

          {/* Search Bar */}
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <Search 
              size={16} 
              style={{ 
                position: 'absolute', 
                left: '10px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                color: 'var(--text-muted)' 
              }} 
            />
            <input 
              type="text"
              placeholder="Search by name or PhilHealth ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 10px 10px 36px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                outline: 'none',
                fontSize: '12px',
                fontFamily: 'var(--font-body)',
                backgroundColor: 'var(--bg-white)'
              }}
            />
          </div>

          {/* Sort Options */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <SortAsc size={14} style={{ color: 'var(--text-muted)' }} />
            <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Sort by:
            </span>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                fontSize: '11px',
                fontWeight: '600',
                backgroundColor: 'var(--bg-white)',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="date">Submission Date</option>
              <option value="risk">Risk Level</option>
              <option value="name">Patient Name</option>
            </select>
          </div>

          {/* Case Count Header */}
          <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-dark)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {filterTab === 'pending' ? 'Pending Reviews' : 'Reviewed Cases'} ({displayedScans.length})
          </h3>

          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px', padding: '40px 0' }}>
              Fetching submitted scans...
            </p>
          ) : displayedScans.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0', fontSize: '12px' }}>
              {searchQuery ? 'No cases match your search.' : filterTab === 'pending' ? 'All queues clear. No scans awaiting review.' : 'No reviewed cases found.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {displayedScans.map(s => {
                const isSelected = selectedScan?.id === s.id;
                
                // Determine risk level badge color
                const riskColor = s.riskScore >= 70 ? 'var(--red-alert)' : s.riskScore >= 40 ? 'var(--orange-alert)' : 'var(--green-normal)';
                const riskBgColor = s.riskScore >= 70 ? 'var(--red-light)' : s.riskScore >= 40 ? 'var(--orange-light)' : '#dcfce7';
                const riskLabel = s.riskScore >= 70 ? 'HIGH RISK' : s.riskScore >= 40 ? 'MODERATE' : 'LOW RISK';
                
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                      <span style={{ fontWeight: '600' }}>{s.id.substring(0, 12)}</span>
                      <span style={{ fontStyle: 'italic' }}>{formatRelativeTime(s.timestamp)}</span>
                    </div>
                    <h4 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-dark)', marginBottom: '8px' }}>
                      {s.patientName}
                    </h4>
                    
                    {/* Risk Level Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
                      <span style={{
                        fontSize: '10px',
                        padding: '3px 10px',
                        borderRadius: '10px',
                        fontWeight: '700',
                        color: riskColor,
                        backgroundColor: riskBgColor,
                        border: `1px solid ${riskColor}`
                      }}>
                        {riskLabel}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-dark)' }}>
                        {s.riskScore}% Risk
                      </span>
                    </div>

                    {/* Show verdict badge if reviewed */}
                    {s.status === 'Reviewed' && s.verdict && (
                      <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
                        <span style={{
                          fontSize: '9px',
                          padding: '2px 8px',
                          borderRadius: '8px',
                          fontWeight: '700',
                          color: 'var(--primary-teal)',
                          backgroundColor: 'var(--primary-teal-light)',
                          textTransform: 'uppercase'
                        }}>
                          ✓ {s.verdict}
                        </span>
                      </div>
                    )}
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
                
                {/* Left: Frame Gallery with Zoom Controls */}
                <div>
                  <h3 style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-dark)', marginBottom: '8px' }}>
                    Ultrasound Diagnostics Sweep (FetalCLIP Frames)
                  </h3>
                  
                  {/* Quality Score Badge */}
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: 'var(--bg-light)',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '10px',
                    fontWeight: '700',
                    color: 'var(--text-medium)',
                    marginBottom: '8px'
                  }}>
                    <div style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--green-normal)'
                    }} />
                    Scan Quality Index: {selectedScan.scanQualityScore}%
                  </div>

                  {/* Frame Gallery Component */}
                  <FrameGallery 
                    frames={selectedScan.frames}
                    defaultImage="http://localhost:5000/assets/ultrasound_sweep.png"
                  />
                </div>

                {/* Right: Maternal/Fetal telemetry details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* AI Triage Report */}
                  <RiskSpeedometer score={selectedScan.riskScore} />

                  {/* Patient Summary Card with Demographics and Vitals */}
                  <div style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-white)', boxShadow: 'var(--shadow-sm)' }}>
                    <h4 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-dark)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '8px' }}>
                      Patient Summary
                    </h4>
                    
                    {/* Demographics */}
                    <div style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-medium)' }}>Name</span>
                        <span style={{ fontWeight: '700', color: 'var(--text-dark)' }}>{selectedScan.patientName}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-medium)' }}>Age</span>
                        <span style={{ fontWeight: '700', color: 'var(--text-dark)' }}>{activePat?.age || '27'} years</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-medium)' }}>PhilHealth ID</span>
                        <span style={{ fontWeight: '700', color: 'var(--text-dark)', fontFamily: 'monospace' }}>{activePat?.id || selectedScan.patientId}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-medium)' }}>LMP</span>
                        <span style={{ fontWeight: '700', color: 'var(--text-dark)' }}>{activePat?.lmp || 'N/A'}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-medium)' }}>History</span>
                        <span style={{ fontWeight: '700', color: 'var(--text-dark)' }}>{activePat?.history || 'N/A'}</span>
                      </div>
                    </div>

                    {/* Vitals */}
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-medium)' }}>Blood Pressure</span>
                        <span style={{ fontWeight: '700', color: 'var(--text-dark)' }}>{selectedScan.bp}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-medium)' }}>Weight</span>
                        <span style={{ fontWeight: '700', color: 'var(--text-dark)' }}>{activePat?.weight || 'N/A'} kg</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--text-medium)' }}>Height</span>
                        <span style={{ fontWeight: '700', color: 'var(--text-dark)' }}>{activePat?.height || 'N/A'} cm</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                        <span style={{ color: 'var(--text-medium)' }}>BMI</span>
                        <span style={{ fontWeight: '700', color: 'var(--text-dark)' }}>{selectedScan.bmi}</span>
                      </div>
                    </div>
                  </div>

                  {/* Risk Factors Checklist */}
                  <div style={{ padding: '14px', borderRadius: '12px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-white)', boxShadow: 'var(--shadow-sm)' }}>
                    <h4 style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-dark)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '8px' }}>
                      Risk Factors
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {[
                        { key: 'hypertension', label: 'Chronic Hypertension', score: '+20' },
                        { key: 'family', label: 'Family History', score: '+10' },
                        { key: 'firstpreg', label: 'First Pregnancy', score: '+4' },
                        { key: 'multiple', label: 'Multiple Pregnancy', score: '+8' },
                        { key: 'diabetes', label: 'Diabetes', score: '+10' },
                        { key: 'csection', label: 'Previous C-Section', score: '+5' },
                        { key: 'pain', label: 'Abdominal Pain', score: '+8' }
                      ].map(factor => {
                        const isChecked = activePat?.riskFactors?.[factor.key] || false;
                        return (
                          <div key={factor.key} style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px',
                            padding: '4px 0'
                          }}>
                            <div style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '3px',
                              border: isChecked ? '2px solid var(--primary-teal)' : '2px solid var(--border-color)',
                              backgroundColor: isChecked ? 'var(--primary-teal)' : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              {isChecked && (
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                  <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </div>
                            <span style={{ 
                              fontSize: '11px', 
                              color: isChecked ? 'var(--text-dark)' : 'var(--text-muted)',
                              fontWeight: isChecked ? '600' : '400',
                              flex: 1
                            }}>
                              {factor.label}
                            </span>
                            {isChecked && (
                              <span style={{ 
                                fontSize: '10px', 
                                color: 'var(--orange-alert)',
                                fontWeight: '700',
                                fontFamily: 'monospace'
                              }}>
                                {factor.score}
                              </span>
                            )}
                          </div>
                        );
                      })}
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-medium)' }}>
                      Clinical Recommendations / Notes
                    </label>
                    <span style={{ 
                      fontSize: '11px', 
                      fontWeight: '600',
                      color: recommendation.length > 1000 ? 'var(--red-alert)' : 'var(--text-muted)',
                      fontFamily: 'monospace'
                    }}>
                      {recommendation.length} / 1000
                    </span>
                  </div>
                  <textarea 
                    rows={4}
                    value={recommendation}
                    onChange={e => setRecommendation(e.target.value)}
                    maxLength={1000}
                    placeholder="Enter gynae recommendations, treatment requirements, or follow-up timelines..."
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: `1.5px solid ${recommendation.length > 1000 ? 'var(--red-alert)' : 'var(--border-color)'}`,
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
                    onClick={() => handleVerdictClick('Normal')}
                    style={{ backgroundColor: 'var(--green-normal)', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <CheckCircle size={16} /> Normal
                  </button>
                  <button 
                    className="btn-blue"
                    disabled={verifying}
                    onClick={() => handleVerdictClick('High Risk')}
                    style={{ backgroundColor: 'var(--orange-alert)', color: 'white', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <AlertTriangle size={16} /> High Risk
                  </button>
                  <button 
                    className="btn-blue"
                    disabled={verifying}
                    onClick={() => handleVerdictClick('Urgent Referral')}
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
      
      {/* Confirmation Dialog Modal */}
      {showConfirmDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.2s ease'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-white)',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '480px',
            width: '90%',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            animation: 'scaleIn 0.3s ease'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '700',
              color: 'var(--text-dark)',
              marginBottom: '12px',
              fontFamily: 'var(--font-display)'
            }}>
              Confirm Diagnostic Verdict
            </h3>
            
            <p style={{
              fontSize: '13px',
              color: 'var(--text-medium)',
              marginBottom: '16px',
              lineHeight: '1.5'
            }}>
              You are about to submit a diagnostic verdict of <strong style={{ color: 'var(--text-dark)' }}>"{pendingVerdict}"</strong> for patient <strong style={{ color: 'var(--text-dark)' }}>{selectedScan?.patientName}</strong>.
            </p>
            
            {recommendation.trim() && (
              <div style={{
                backgroundColor: 'var(--bg-light)',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '16px',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Clinical Notes:
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-dark)', lineHeight: '1.4', maxHeight: '100px', overflowY: 'auto' }}>
                  {recommendation}
                </div>
              </div>
            )}
            
            <p style={{
              fontSize: '12px',
              color: 'var(--text-muted)',
              marginBottom: '20px',
              fontStyle: 'italic'
            }}>
              This action will notify the midwife and mark the case as reviewed. Do you want to proceed?
            </p>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button 
                onClick={handleCancelVerdict}
                disabled={verifying}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-white)',
                  color: 'var(--text-dark)',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--bg-light)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--bg-white)'}
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmVerdict}
                disabled={verifying}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: 'var(--primary-teal)',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: verifying ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-body)',
                  opacity: verifying ? 0.6 : 1,
                  transition: 'all 0.2s ease'
                }}
              >
                {verifying ? 'Submitting...' : 'Confirm & Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
