import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api } from '../services/api';

export default function Notifications({ isOnline, onToggleOnline, showToast }) {
  const navigate = useNavigate();
  const [timeStr, setTimeStr] = useState('09:41');
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState('unread');
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

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      if (isOnline) {
        const list = await api.getNotifications();
        setNotifications(list);
      } else {
        const cached = JSON.parse(localStorage.getItem('kalinga_notifications') || '[]');
        setNotifications(cached);
      }
    } catch (err) {
      console.warn("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, [isOnline]);

  const handleReadClick = async (notif) => {
    if (isOnline) {
      try {
        await api.markNotificationRead(notif.id);
      } catch (err) {
        console.warn("Failed to mark notification read on server:", err);
      }
    }

    // Update locally too
    const cached = JSON.parse(localStorage.getItem('kalinga_notifications') || '[]');
    const match = cached.find(n => n.id === notif.id);
    if (match) {
      match.status = 'read';
      localStorage.setItem('kalinga_notifications', JSON.stringify(cached));
    }

    navigate(`/patient/${notif.patientId}`);
  };

  const filteredNotifs = notifications.filter(n => n.status === activeTab);

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

          {/* Unread / Read Tab headers */}
          <div className="notif-tabs" style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginTop: '14px', marginBottom: '16px' }}>
            <div 
              className={`notif-tab ${activeTab === 'unread' ? 'active' : ''}`} 
              onClick={() => setActiveTab('unread')}
              style={{
                flex: 1, padding: '10px 0', textAlign: 'center', cursor: 'pointer',
                fontWeight: '600', fontSize: '14px', borderBottom: activeTab === 'unread' ? '2px solid var(--text-dark)' : '2px solid transparent',
                color: activeTab === 'unread' ? 'var(--text-dark)' : 'var(--text-muted)'
              }}
            >
              Unread
            </div>
            <div 
              className={`notif-tab ${activeTab === 'read' ? 'active' : ''}`} 
              onClick={() => setActiveTab('read')}
              style={{
                flex: 1, padding: '10px 0', textAlign: 'center', cursor: 'pointer',
                fontWeight: '600', fontSize: '14px', borderBottom: activeTab === 'read' ? '2px solid var(--text-dark)' : '2px solid transparent',
                color: activeTab === 'read' ? 'var(--text-dark)' : 'var(--text-muted)'
              }}
            >
              Read
            </div>
          </div>

          <div className="notif-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {loading ? (
              <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', padding: '20px' }}>
                Fetching notification alerts...
              </p>
            ) : filteredNotifs.length === 0 ? (
              <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', padding: '20px' }}>
                No {activeTab} notifications.
              </p>
            ) : (
              filteredNotifs.map(n => {
                let classType = 'teal';
                let symbol = '✚';
                if (n.iconType === 'red') {
                  classType = 'red';
                  symbol = '🔔';
                } else if (n.iconType === 'orange') {
                  classType = 'orange';
                  symbol = '⚠️';
                }

                return (
                  <div key={n.id} className="notif-card" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className={`notif-icon-circle ${n.iconType}`} style={{
                      backgroundColor: n.iconType === 'red' ? 'var(--red-light)' : n.iconType === 'orange' ? 'var(--orange-light)' : 'var(--primary-teal-light)',
                      color: n.iconType === 'red' ? 'var(--red-alert)' : n.iconType === 'orange' ? 'var(--orange-alert)' : 'var(--primary-teal)',
                      width: '40px', height: '40px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                    }}>
                      {symbol}
                    </div>
                    <div className="notif-content" style={{ flex: 1 }}>
                      <div className="notif-title" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        New Report Received:
                      </div>
                      <div className="notif-patient" style={{ fontWeight: '700', fontSize: '13px', marginTop: '2px' }}>
                        For: {n.patientName}
                      </div>
                      <div className={`notif-verdict ${classType}`} style={{ fontSize: '11px', marginTop: '2px' }}>
                        Specialist Verdict: <span style={{ fontWeight: 'bold' }}>{n.verdict}</span>
                      </div>
                    </div>
                    <div className="notif-action">
                      <button 
                        className="btn-blue" 
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => handleReadClick(n)}
                      >
                        Read
                      </button>
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
