import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell } from 'lucide-react';
import { api } from '../services/api';
import { announceToScreenReader, setPageTitle } from '../utils/accessibility';

export default function Notifications({ isOnline, showToast }) {
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

  // Set page title
  useEffect(() => {
    setPageTitle('Notifications');
  }, []);

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      if (isOnline) {
        const list = await api.getNotifications();
        setNotifications(list);
        const unreadCount = list.filter(n => n.status === 'unread').length;
        if (unreadCount > 0) {
          announceToScreenReader(`${unreadCount} unread ${unreadCount === 1 ? 'notification' : 'notifications'}`);
        }
      } else {
        const cached = JSON.parse(localStorage.getItem('kalinga_notifications') || '[]');
        setNotifications(cached);
      }
    } catch (err) {
      console.warn("Failed to fetch notifications:", err);
      announceToScreenReader("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, [isOnline]);

  const handleReadClick = async (notif) => {
    announceToScreenReader(`Opening notification for ${notif.patientName}`);
    
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

    // Update state to reflect the change immediately
    setNotifications(prevNotifs => 
      prevNotifs.map(n => n.id === notif.id ? { ...n, status: 'read' } : n)
    );

    navigate(`/patient/${notif.patientId}`);
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Recently';
    
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;
      
      // Format as date
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (err) {
      return 'Recently';
    }
  };

  const unreadNotifs = notifications.filter(n => n.status === 'unread');
  const readNotifs = notifications.filter(n => n.status === 'read');

  // Render a notification card
  const renderNotificationCard = (n, isUnread) => {
    let classType = 'teal';
    let symbol = '✚';
    if (n.iconType === 'red') {
      classType = 'red';
      symbol = '🔔';
    } else if (n.iconType === 'orange') {
      classType = 'orange';
      symbol = '⚠️';
    }

    const specialistName = n.specialistName || 'Dr. Duque';
    const timestamp = formatTimestamp(n.createdAt || n.timestamp);

    return (
      <div 
        key={n.id} 
        className={`notif-card ${isUnread ? 'unread' : ''}`}
        style={{ 
          display: 'flex', 
          alignItems: 'flex-start', 
          gap: '12px',
          position: 'relative',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        role="article"
        aria-label={`${isUnread ? 'Unread notification' : 'Notification'}: ${n.verdict} result for ${n.patientName}`}
        onClick={() => handleReadClick(n)}
      >
        {/* Blue dot indicator for unread notifications */}
        {isUnread && (
          <div 
            style={{
              position: 'absolute',
              top: '14px',
              left: '14px',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: 'var(--primary-blue)',
              boxShadow: '0 0 6px rgba(37, 99, 235, 0.6)',
              zIndex: 1
            }}
            aria-label="Unread"
          />
        )}

        <div 
          className={`notif-icon-circle ${n.iconType}`} 
          style={{
            backgroundColor: n.iconType === 'red' ? 'var(--red-light)' : n.iconType === 'orange' ? 'var(--orange-light)' : 'var(--primary-teal-light)',
            color: n.iconType === 'red' ? 'var(--red-alert)' : n.iconType === 'orange' ? 'var(--orange-alert)' : 'var(--primary-teal)',
            width: '44px', 
            height: '44px', 
            borderRadius: '10px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            fontWeight: 'bold',
            flexShrink: 0,
            marginLeft: isUnread ? '10px' : '0' // Offset for blue dot
          }}
          aria-hidden="true"
        >
          {symbol}
        </div>

        <div className="notif-content" style={{ flex: 1, minWidth: 0 }}>
          <div 
            className="notif-patient" 
            style={{ 
              fontWeight: isUnread ? '700' : '600', 
              fontSize: '14px', 
              marginBottom: '4px',
              color: isUnread ? 'var(--text-dark)' : 'var(--text-medium)'
            }}
          >
            {n.patientName}
          </div>

          <div 
            className={`notif-verdict ${classType}`} 
            style={{ 
              fontSize: '12px', 
              marginBottom: '4px',
              fontWeight: isUnread ? '600' : '500',
              color: n.iconType === 'red' ? 'var(--red-alert)' : 
                     n.iconType === 'orange' ? 'var(--orange-alert)' : 
                     'var(--primary-teal)'
            }}
          >
            Verdict: <span style={{ fontWeight: 'bold' }}>{n.verdict}</span>
          </div>

          <div 
            className="notif-meta" 
            style={{ 
              fontSize: '11px', 
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap'
            }}
          >
            <span>{specialistName}</span>
            <span>•</span>
            <span>{timestamp}</span>
          </div>
        </div>

        <div 
          className="notif-action"
          style={{ flexShrink: 0, marginTop: '4px' }}
        >
          <ArrowLeft 
            size={16} 
            style={{ 
              transform: 'rotate(180deg)',
              color: 'var(--text-muted)' 
            }}
            aria-hidden="true"
          />
        </div>
      </div>
    );
  };

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
          {/* Header with bell icon and title */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button 
                className="back-btn" 
                onClick={() => navigate('/dashboard')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  color: 'var(--text-dark)'
                }}
              >
                <ArrowLeft size={20} />
              </button>
              <h2 style={{ 
                fontSize: '20px', 
                fontWeight: '700', 
                color: 'var(--text-dark)',
                margin: 0 
              }}>
                Notifications
              </h2>
            </div>

            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px',
              padding: '6px 12px',
              backgroundColor: 'var(--bg-light)',
              borderRadius: '20px'
            }}>
              <Bell size={16} color="var(--primary-teal)" />
              <span style={{ 
                fontSize: '12px', 
                fontWeight: '600',
                color: 'var(--text-dark)' 
              }}>
                {unreadNotifs.length} new
              </span>
            </div>
          </div>

          {loading ? (
            <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', padding: '40px 20px' }}>
              Fetching notification alerts...
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Unread Section */}
              {unreadNotifs.length > 0 && (
                <div>
                  <h3 style={{ 
                    fontSize: '14px', 
                    fontWeight: '700', 
                    color: 'var(--text-dark)',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--primary-blue)',
                      display: 'inline-block'
                    }}></span>
                    Unread ({unreadNotifs.length})
                  </h3>
                  <div 
                    className="notif-list" 
                    style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
                    role="region"
                    aria-label="Unread notifications"
                  >
                    {unreadNotifs.map(n => renderNotificationCard(n, true))}
                  </div>
                </div>
              )}

              {/* Read Section */}
              {readNotifs.length > 0 && (
                <div>
                  <h3 style={{ 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    color: 'var(--text-muted)',
                    marginBottom: '12px'
                  }}>
                    Read ({readNotifs.length})
                  </h3>
                  <div 
                    className="notif-list" 
                    style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
                    role="region"
                    aria-label="Read notifications"
                  >
                    {readNotifs.map(n => renderNotificationCard(n, false))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {unreadNotifs.length === 0 && readNotifs.length === 0 && (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '60px 20px',
                  color: 'var(--text-muted)'
                }}>
                  <Bell size={48} color="var(--text-muted)" style={{ opacity: 0.3, marginBottom: '12px' }} />
                  <p style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                    No notifications yet
                  </p>
                  <p style={{ fontSize: '12px' }}>
                    You'll be notified when specialists review scans
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
