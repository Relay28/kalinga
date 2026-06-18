import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Plus, Users, Scan, Cloud, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { api } from '../services/api';
import { offlineQueue } from '../services/offlineQueue';
import { seedPatients } from '../data/seedPatients';

export default function MidwifeDashboard({ 
  isOnline, 
  onToggleOnline, 
  syncQueueCount, 
  refreshSyncCount,
  unreadNotifsCount,
  setActivePatient,
  showToast 
}) {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pendingSync: 0,
    submitted: 0,
    reviewed: 0
  });

  // Time stamp timer
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

  // Fetch Patients & Calculate stats
  const fetchDashboardData = async () => {
    setLoading(true);
    let patientList = [];
    
    // 1. Try to load patients from Server database
    if (isOnline) {
      try {
        patientList = await api.getPatients();
      } catch (err) {
        console.warn("Could not load patients from server, falling back to local storage:", err);
        patientList = seedPatients;
      }
    } else {
      // Offline mode fallback patient records
      const savedPatients = localStorage.getItem('kalinga_patients');
      patientList = savedPatients ? JSON.parse(savedPatients) : seedPatients;
    }

    // 2. Overlay any patients in the offline queue that aren't synced
    const queue = offlineQueue.getQueue();
    const queuedPatients = queue.map(q => q.patient).filter(Boolean);

    // Merge databases
    const mergedList = [...queuedPatients];
    patientList.forEach(p => {
      if (!mergedList.some(item => item.id === p.id)) {
        mergedList.push(p);
      }
    });

    setPatients(mergedList);
    
    // Save to local storage for offline retrieval
    localStorage.setItem('kalinga_patients', JSON.stringify(mergedList));

    // Calculate metrics
    const total = mergedList.length;
    const pendingSync = queue.length;
    const submitted = mergedList.filter(p => p.status === 'Submitted').length;
    const reviewed = mergedList.filter(p => p.status === 'Reviewed').length;

    setStats({
      total,
      pendingSync,
      submitted,
      reviewed
    });
    setLoading(false);
  };

  useEffect(() => {
    fetchDashboardData();
    refreshSyncCount();
  }, [isOnline, syncQueueCount]);

  // Synchronize queue
  const handleSyncClick = async () => {
    if (syncQueueCount === 0) {
      showToast("No scans in offline sync queue", "info");
      return;
    }

    if (!isOnline) {
      showToast("Device is offline. Safe-sync requires Online Mode.", "warning");
      return;
    }

    setLoading(true);
    showToast("Forwarding data packets to specialist network...", "info");

    try {
      const result = await offlineQueue.syncQueue();
      refreshSyncCount();
      await fetchDashboardData();
      
      if (result.success) {
        showToast(`Successfully synchronized ${result.syncedCount} diagnostic report(s).`, "success");
      } else {
        showToast(`Partial sync complete. ${result.errors.length} failed.`, "warning");
      }
    } catch (err) {
      showToast(`Sync Failed: ${err.message}`, "warning");
    } finally {
      setLoading(false);
    }
  };

  const handlePatientCardClick = (patient) => {
    setActivePatient(patient);
    if (patient.status === 'Ready to Scan') {
      navigate('/scan');
    } else {
      navigate(`/patient/${patient.id}`);
    }
  };

  return (
    <div className="device-container">
      {/* Time and Connectivity header */}
      <div className="device-header-notch">
        <span>{timeStr}</span>
        <div className="icons">
          <div 
            className={`connectivity-toggle ${!isOnline ? 'offline' : ''}`}
            onClick={onToggleOnline}
          >
            <span className="indicator-dot"></span>
            <span>{isOnline ? 'Online Mode' : 'Offline Mode'}</span>
          </div>
        </div>
      </div>

      <div className="app-viewport">
        <div className="viewport-screen">
          
          {/* Header Dashboard section */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '20px'
          }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-dark)' }}>
                Welcome back!
              </h2>
              <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--primary-teal)', marginTop: '2px' }}>
                Ms. Midwife
              </h1>
              <button 
                onClick={() => {
                  showToast("Logging out...", "info");
                  navigate('/login');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '11px',
                  cursor: 'pointer',
                  padding: '2px 0',
                  textDecoration: 'underline',
                  textAlign: 'left'
                }}
              >
                Logout / Switch Portal
              </button>
            </div>
            
            <div 
              className="notification-bell" 
              onClick={() => navigate('/notifications')}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: 'var(--bg-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                cursor: 'pointer'
              }}
            >
              <Bell size={20} color="var(--text-dark)" />
              {unreadNotifsCount > 0 && (
                <span className="bell-badge" style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  width: '10px',
                  height: '10px',
                  backgroundColor: 'var(--red-alert)',
                  border: '2px solid var(--bg-white)',
                  borderRadius: '50%'
                }} />
              )}
            </div>
          </div>
          
          <p style={{ fontSize: '12px', color: 'var(--text-medium)', lineHeight: '1.5', marginBottom: '24px' }}>
            There are patients awaiting for your review, check them out! You may click on a record to display detailed.
          </p>

          {/* Core Navigation Action Cards Grid */}
          <div className="dashboard-actions-grid" style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '14px',
            marginBottom: '28px'
          }}>
            <div className="action-card teal" onClick={() => navigate('/register')}>
              <div className="action-card-icon"><Plus size={18} /></div>
              <div className="action-card-title">Register Patient</div>
            </div>
            
            <div className="action-card blue" onClick={() => showToast("Viewing active midwife patient registry.", "info")}>
              <div className="action-card-icon"><Users size={18} /></div>
              <div className="action-card-title">Patients ({stats.total})</div>
            </div>
            
            <div className="action-card blue" onClick={() => {
              setActivePatient(null);
              navigate('/scan');
            }}>
              <div className="action-card-icon"><Scan size={18} /></div>
              <div className="action-card-title">New Triage Scan</div>
            </div>
            
            <div className="action-card teal" onClick={handleSyncClick}>
              <div className="action-card-icon"><Cloud size={18} /></div>
              <div className="action-card-title">Pending Uploads ({syncQueueCount})</div>
            </div>
          </div>

          {/* Patient Activities list */}
          <h3 className="recent-header" style={{
            fontFamily: 'var(--font-display)',
            fontWeight: '700',
            fontSize: '16px',
            marginBottom: '16px'
          }}>
            Recent Activities
          </h3>

          <div className="recent-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '20px', fontSize: '12px', color: 'var(--text-muted)' }}>
                Syncing midwife record logs...
              </div>
            ) : patients.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', fontSize: '12px', color: 'var(--text-muted)' }}>
                No registered patient logs.
              </div>
            ) : (
              patients.map(p => {
                let statusColor = 'var(--orange-alert)';
                if (p.status === 'Reviewed') {
                  statusColor = 'var(--green-normal)';
                } else if (p.status === 'Submitted') {
                  statusColor = 'var(--primary-blue)';
                } else if (p.status === 'Ready for Submission') {
                  statusColor = 'var(--orange-alert)';
                }
                
                return (
                  <div 
                    key={p.id} 
                    className="patient-card"
                    onClick={() => handlePatientCardClick(p)}
                  >
                    <div className="patient-avatar-wrapper">
                      <svg className="patient-avatar" viewBox="0 0 24 24">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                      </svg>
                    </div>
                    <div className="patient-card-details">
                      <div className="patient-card-meta">
                        <span className="patient-card-id">{p.id}</span>
                        <span className="patient-card-date">{p.timestamp}</span>
                      </div>
                      <div className="patient-card-name">{p.firstName} {p.lastName}</div>
                      <div className="patient-card-info">{p.dob} | Age: {p.age}</div>
                      <div className="patient-card-status" style={{ color: statusColor }}>
                        {p.status}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
