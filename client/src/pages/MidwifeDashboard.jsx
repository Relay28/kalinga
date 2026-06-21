import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Plus, Users, Scan, Cloud, AlertCircle, Wifi, WifiOff, Lock, Unlock, HardDrive } from 'lucide-react';
import { api } from '../services/api';
import { offlineQueue } from '../services/offlineQueue';
import { seedPatients } from '../data/seedPatients';
import storage from '../services/storage';
import { getStorageUsage } from '../services/storageMonitor';
import { announceToScreenReader, setPageTitle } from '../utils/accessibility';

export default function MidwifeDashboard({
  isOnline,
  syncQueueCount,
  refreshSyncCount,
  unreadNotifsCount,
  setActivePatient,
  showToast
}) {
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lockStatus, setLockStatus] = useState({ locked: false });
  const [storageUsage, setStorageUsage] = useState(null);
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

  // Set page title for accessibility
  useEffect(() => {
    setPageTitle('Midwife Dashboard');
  }, []);

  // Check lock status periodically
  useEffect(() => {
    const checkLock = () => {
      const status = offlineQueue.isLocked();
      setLockStatus(status);
    };
    
    checkLock(); // Initial check
    const lockCheckInterval = setInterval(checkLock, 2000); // Check every 2 seconds
    
    return () => clearInterval(lockCheckInterval);
  }, []);

  // Monitor storage usage
  useEffect(() => {
    const checkStorage = () => {
      const usage = getStorageUsage();
      setStorageUsage(usage);
      
      // Show warning toast if near limit (only once per session)
      if (usage.isNearLimit && !sessionStorage.getItem('storage_warning_shown')) {
        showToast(`⚠ Storage at ${usage.percentageFormatted} capacity. Consider clearing uploaded data.`, 'warning');
        sessionStorage.setItem('storage_warning_shown', 'true');
      }
    };
    
    checkStorage(); // Initial check
    const storageCheckInterval = setInterval(checkStorage, 10000); // Check every 10 seconds
    
    return () => clearInterval(storageCheckInterval);
  }, [showToast]);

  // Fetch Patients & Calculate stats with OB-GYN sync awareness
  const fetchDashboardData = async () => {
    setLoading(true);
    let patientList = [];

    // 1. Try to load patients from Server database
    if (isOnline) {
      try {
        patientList = await api.getPatients();
        
        // Also check if there are triage packets being reviewed by OB-GYN
        try {
          const triageQueue = await api.getTriageQueue({ status: 'all', limit: 10 });
          if (triageQueue && triageQueue.length > 0) {
            console.log(`📋 ${triageQueue.length} scans in OB-GYN review queue (synced with specialists)`);
          }
        } catch (triageErr) {
          console.warn('Could not fetch OB-GYN queue status:', triageErr);
        }
      } catch (err) {
        console.warn("Could not load patients from server, falling back to local storage:", err);
        patientList = seedPatients;
      }
    } else {
      // Offline mode fallback patient records
      try {
        const savedPatients = localStorage.getItem('kalinga_patients');
        patientList = savedPatients ? JSON.parse(savedPatients) : seedPatients;
      } catch (err) {
        console.warn('Failed to load patients from localStorage:', err);
        patientList = seedPatients;
      }
    }

    // 2. Overlay any patients in the offline queue that aren't synced
    try {
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
      try {
        localStorage.setItem('kalinga_patients', JSON.stringify(mergedList));
      } catch (storageErr) {
        console.warn('Failed to save patients to localStorage:', storageErr);
      }

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
    } catch (err) {
      console.error('Error processing dashboard data:', err);
      // Fallback to empty state
      setPatients([]);
      setStats({
        total: 0,
        pendingSync: 0,
        submitted: 0,
        reviewed: 0
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDashboardData();
    refreshSyncCount();
  }, [isOnline, syncQueueCount]);

  // Synchronize queue with detailed progress feedback
  const handleSyncClick = async () => {
    if (syncQueueCount === 0) {
      showToast("No scans in offline sync queue", "info");
      announceToScreenReader("No scans in offline sync queue");
      return;
    }

    if (!isOnline) {
      showToast("Device is offline. Safe-sync requires Online Mode.", "warning");
      announceToScreenReader("Device is offline. Cannot sync.");
      return;
    }

    setLoading(true);
    showToast("Starting upload...", "info");
    announceToScreenReader("Starting upload of pending scans");

    try {
      // Progress callback to show detailed upload status
      const onProgress = (current, total, scanInfo) => {
        // Show detailed progress: "Uploading 2 of 5 packages..."
        const message = `Uploading ${current} of ${total} packages... (${scanInfo.patientName})`;
        showToast(message, "info");
        announceToScreenReader(message);
      };

      const result = await offlineQueue.syncQueue(onProgress);
      refreshSyncCount();
      await fetchDashboardData();

      if (result.success) {
        const successMsg = `✓ Successfully uploaded ${result.syncedCount} package${result.syncedCount !== 1 ? 's' : ''}.`;
        showToast(successMsg, "success");
        announceToScreenReader(`Successfully uploaded ${result.syncedCount} packages`);
      } else if (result.syncedCount > 0 && result.failedCount > 0) {
        // Partial success - show specific error details
        const errorDetails = result.errors.map(e => `${e.patientName}: ${e.error}`).join('; ');
        showToast(`⚠ Partial upload: ${result.syncedCount} succeeded, ${result.failedCount} failed. ${errorDetails}`, "warning");
        announceToScreenReader(`Partial upload: ${result.syncedCount} succeeded, ${result.failedCount} failed`);
      } else {
        // All failed - show specific error messages
        const firstError = result.errors && result.errors.length > 0 ? result.errors[0] : null;
        const errorMsg = firstError ? `${firstError.patientName}: ${firstError.error}` : 'Network error occurred';
        showToast(`✗ Upload failed: ${errorMsg}`, "warning");
        announceToScreenReader(`Upload failed: ${errorMsg}`);
      }
    } catch (err) {
      showToast(`✗ Upload failed: ${err.message}`, "warning");
      announceToScreenReader(`Upload failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Retry failed uploads
  const handleRetryFailed = async () => {
    const failedUploads = offlineQueue.getFailedUploads();
    
    if (failedUploads.length === 0) {
      showToast("No failed uploads to retry", "info");
      return;
    }

    if (!isOnline) {
      showToast("Device is offline. Retry requires Online Mode.", "warning");
      return;
    }

    setLoading(true);
    showToast(`Retrying ${failedUploads.length} failed upload${failedUploads.length !== 1 ? 's' : ''}...`, "info");

    try {
      const onProgress = (current, total, scanInfo) => {
        // Show detailed progress: "Uploading 2 of 5 packages..."
        showToast(`Uploading ${current} of ${total} packages... (${scanInfo.patientName})`, "info");
      };

      const result = await offlineQueue.syncQueue(onProgress);
      refreshSyncCount();
      await fetchDashboardData();

      if (result.success) {
        showToast(`✓ Successfully uploaded ${result.syncedCount} package${result.syncedCount !== 1 ? 's' : ''}.`, "success");
      } else if (result.syncedCount > 0 && result.failedCount > 0) {
        // Partial success with detailed error messages
        const errorDetails = result.errors.map(e => `${e.patientName}: ${e.error}`).join('; ');
        showToast(`⚠ Retry partial: ${result.syncedCount} succeeded, ${result.failedCount} still failed. ${errorDetails}`, "warning");
      } else {
        // All failed - show specific error messages
        const firstError = result.errors && result.errors.length > 0 ? result.errors[0] : null;
        const errorMsg = firstError ? `${firstError.patientName}: ${firstError.error}` : 'Network error occurred';
        showToast(`✗ Retry failed: ${errorMsg}`, "warning");
      }
    } catch (err) {
      showToast(`✗ Retry failed: ${err.message}`, "warning");
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

          {/* Storage Warning Banner */}
          {storageUsage && storageUsage.isNearLimit && (
            <div style={{
              backgroundColor: 'var(--warning-bg, #fff3cd)',
              border: '1px solid var(--warning-border, #ffc107)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <HardDrive size={16} color="var(--warning-text, #856404)" />
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  color: 'var(--warning-text, #856404)',
                  marginBottom: '2px'
                }}>
                  Storage at {storageUsage.percentageFormatted} capacity
                </div>
                <div style={{ 
                  fontSize: '11px', 
                  color: 'var(--warning-text, #856404)',
                  opacity: 0.8
                }}>
                  {storageUsage.usedMB} MB / {storageUsage.quotaMB} MB used
                </div>
              </div>
              <button
                onClick={() => navigate('/storage-settings')}
                style={{
                  padding: '6px 12px',
                  backgroundColor: 'var(--warning-text, #856404)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Manage
              </button>
            </div>
          )}

          {/* Lock Status Warning Banner */}
          {lockStatus.locked && (
            <div style={{
              backgroundColor: 'var(--warning-bg, #fff3cd)',
              border: '1px solid var(--warning-border, #ffc107)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Lock size={16} color="var(--warning-text, #856404)" />
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontSize: '13px', 
                  fontWeight: '600', 
                  color: 'var(--warning-text, #856404)',
                  marginBottom: '2px'
                }}>
                  Another session is active
                </div>
                <div style={{ 
                  fontSize: '11px', 
                  color: 'var(--warning-text, #856404)',
                  opacity: 0.8
                }}>
                  Queue operations are locked by session {lockStatus.sessionId?.substring(0, 15)}... 
                  {lockStatus.remainingTime && ` (auto-release in ${Math.round(lockStatus.remainingTime / 1000)}s)`}
                </div>
              </div>
            </div>
          )}

          {/* Lock Status Indicator for debugging - small icon in corner */}
          <div style={{
            position: 'fixed',
            bottom: '80px',
            right: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 10px',
            backgroundColor: lockStatus.locked ? 'var(--warning-bg, #fff3cd)' : 'var(--success-bg, #d4edda)',
            borderRadius: '20px',
            fontSize: '10px',
            color: lockStatus.locked ? 'var(--warning-text, #856404)' : 'var(--success-text, #155724)',
            border: `1px solid ${lockStatus.locked ? 'var(--warning-border, #ffc107)' : 'var(--success-border, #28a745)'}`,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            zIndex: 1000,
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onClick={() => {
            if (lockStatus.locked) {
              showToast(`Lock held by ${lockStatus.sessionId}`, "info");
            } else {
              showToast(`Current session: ${storage.getSessionId()}`, "info");
            }
          }}
          title={lockStatus.locked ? 
            `Queue locked by ${lockStatus.sessionId}\nAge: ${Math.round(lockStatus.age / 1000)}s\nAuto-release: ${Math.round(lockStatus.remainingTime / 1000)}s` :
            `Queue available\nSession: ${storage.getSessionId()}`
          }
          >
            {lockStatus.locked ? <Lock size={12} /> : <Unlock size={12} />}
            <span style={{ fontWeight: '600' }}>
              {lockStatus.locked ? 'LOCKED' : 'UNLOCKED'}
            </span>
          </div>

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
              role="button"
              tabIndex={0}
              aria-label={`Notifications${unreadNotifsCount > 0 ? `, ${unreadNotifsCount} unread` : ''}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate('/notifications');
                }
              }}
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
              <Bell size={20} color="var(--text-dark)" aria-hidden="true" />
              {unreadNotifsCount > 0 && (
                <>
                  <span className="bell-badge" style={{
                    position: 'absolute',
                    top: '6px',
                    right: '6px',
                    width: '10px',
                    height: '10px',
                    backgroundColor: 'var(--red-alert)',
                    border: '2px solid var(--bg-white)',
                    borderRadius: '50%'
                  }} aria-hidden="true" />
                  <span className="sr-only">{unreadNotifsCount} unread notifications</span>
                </>
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
          }}
          role="navigation"
          aria-label="Main actions"
          >
            <div 
              className="action-card teal" 
              onClick={() => navigate('/register')}
              role="button"
              tabIndex={0}
              aria-label="Register new patient"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate('/register');
                }
              }}
            >
              <div className="action-card-icon" aria-hidden="true"><Plus size={18} /></div>
              <div className="action-card-title">Register Patient</div>
            </div>

            <div 
              className="action-card blue" 
              onClick={() => showToast("Viewing active midwife patient registry.", "info")}
              role="button"
              tabIndex={0}
              aria-label={`View patients, ${stats.total} total`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  showToast("Viewing active midwife patient registry.", "info");
                }
              }}
            >
              <div className="action-card-icon" aria-hidden="true"><Users size={18} /></div>
              <div className="action-card-title">Patients ({stats.total})</div>
            </div>

            <div 
              className="action-card blue" 
              onClick={() => {
                setActivePatient(null);
                navigate('/scan');
              }}
              role="button"
              tabIndex={0}
              aria-label="Start new triage scan"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActivePatient(null);
                  navigate('/scan');
                }
              }}
            >
              <div className="action-card-icon" aria-hidden="true"><Scan size={18} /></div>
              <div className="action-card-title">New Triage Scan</div>
            </div>

            <div 
              className="action-card teal" 
              onClick={handleSyncClick}
              role="button"
              tabIndex={0}
              aria-label={`Pending uploads, ${syncQueueCount} ${syncQueueCount === 1 ? 'scan' : 'scans'} waiting`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSyncClick();
                }
              }}
              style={{ position: 'relative' }}
            >
              <div className="action-card-icon" aria-hidden="true"><Cloud size={18} /></div>
              <div className="action-card-title">
                Pending Uploads
                {syncQueueCount > 0 && (
                  <span style={{
                    marginLeft: '6px',
                    backgroundColor: 'var(--orange-alert)',
                    color: 'white',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: '700'
                  }}
                  aria-label={`${syncQueueCount} pending`}
                  >
                    {syncQueueCount}
                  </span>
                )}
              </div>
            </div>

            {/* Show Retry Failed button only if there are items in queue (indicating previous failures) */}
            {syncQueueCount > 0 && (
              <div 
                className="action-card" 
                onClick={handleRetryFailed}
                style={{
                  gridColumn: '1 / -1',
                  backgroundColor: 'var(--orange-alert)',
                  color: 'white'
                }}
              >
                <div className="action-card-icon">
                  <AlertCircle size={18} />
                </div>
                <div className="action-card-title">Retry Failed Uploads</div>
              </div>
            )}
          </div>

          {/* Patient Activities list */}
          <h3 className="recent-header" style={{
            fontFamily: 'var(--font-display)',
            fontWeight: '700',
            fontSize: '16px',
            marginBottom: '16px'
          }}
          id="recent-activities-heading"
          >
            Recent Activities
          </h3>

          <div className="recent-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            role="region"
            aria-labelledby="recent-activities-heading"
          >
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
                    role="button"
                    tabIndex={0}
                    aria-label={`Patient ${p.firstName} ${p.lastName}, status: ${p.status}, ID: ${p.id}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handlePatientCardClick(p);
                      }
                    }}
                  >
                    <div className="patient-avatar-wrapper">
                      <svg className="patient-avatar" viewBox="0 0 24 24" aria-hidden="true">
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
                      <div className="patient-card-status" style={{ color: statusColor }} role="status">
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
