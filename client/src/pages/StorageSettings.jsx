import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, HardDrive, AlertTriangle, Trash2, RefreshCw, Info } from 'lucide-react';
import { 
  getStorageUsage, 
  getStorageBreakdown, 
  clearUploadedData, 
  clearAllKalingaData 
} from '../services/storageMonitor';

export default function StorageSettings({ showToast }) {
  const navigate = useNavigate();
  const [usage, setUsage] = useState(null);
  const [breakdown, setBreakdown] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  // Load storage stats
  const loadStorageStats = () => {
    const usageData = getStorageUsage();
    const breakdownData = getStorageBreakdown();
    setUsage(usageData);
    setBreakdown(breakdownData);
  };

  useEffect(() => {
    loadStorageStats();
    
    // Refresh every 5 seconds
    const interval = setInterval(loadStorageStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleClearUploadedData = async () => {
    setLoading(true);
    try {
      const result = clearUploadedData();
      
      if (result.success) {
        showToast(result.message, 'success');
        loadStorageStats(); // Refresh stats
      } else {
        showToast(result.message, 'warning');
      }
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAllData = async () => {
    setLoading(true);
    try {
      const result = clearAllKalingaData();
      
      if (result.success) {
        showToast(`✓ ${result.message}`, 'success');
        loadStorageStats(); // Refresh stats
        setShowConfirmClear(false);
        
        // Optionally navigate back to dashboard
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        showToast(result.message, 'error');
      }
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (!usage) {
    return (
      <div className="device-container">
        <div className="app-viewport">
          <div className="viewport-screen" style={{ padding: '20px', textAlign: 'center' }}>
            <p>Loading storage statistics...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="device-container">
      <div className="app-viewport">
        <div className="viewport-screen" style={{ padding: '16px' }}>
          {/* Header */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            marginBottom: '20px',
            paddingBottom: '16px',
            borderBottom: '1px solid var(--border-light)'
          }}>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-light)'
              }}
            >
              <ArrowLeft size={20} color="var(--text-dark)" />
            </button>
            <div>
              <h2 style={{ 
                fontSize: '20px', 
                fontWeight: '700', 
                color: 'var(--text-dark)',
                marginBottom: '2px'
              }}>
                Storage Settings
              </h2>
              <p style={{ 
                fontSize: '12px', 
                color: 'var(--text-muted)',
                margin: 0
              }}>
                Manage device storage and data
              </p>
            </div>
          </div>

          {/* Storage Usage Overview */}
          <div style={{
            backgroundColor: usage.isNearLimit ? 'var(--warning-bg, #fff3cd)' : 'var(--bg-light)',
            border: `1px solid ${usage.isNearLimit ? 'var(--warning-border, #ffc107)' : 'var(--border-light)'}`,
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              marginBottom: '12px'
            }}>
              <HardDrive size={24} color={usage.isNearLimit ? 'var(--warning-text, #856404)' : 'var(--primary-teal)'} />
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: '600',
                  color: usage.isNearLimit ? 'var(--warning-text, #856404)' : 'var(--text-dark)',
                  marginBottom: '4px'
                }}>
                  Storage Usage: {usage.percentageFormatted}
                </div>
                <div style={{ 
                  fontSize: '11px', 
                  color: 'var(--text-muted)'
                }}>
                  {usage.usedMB} MB used of {usage.quotaMB} MB estimated quota
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div style={{
              width: '100%',
              height: '8px',
              backgroundColor: 'var(--bg-white)',
              borderRadius: '4px',
              overflow: 'hidden',
              marginBottom: '8px'
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min(usage.percentage * 100, 100)}%`,
                backgroundColor: usage.isNearLimit ? 'var(--orange-alert)' : 'var(--primary-teal)',
                transition: 'width 0.3s ease'
              }} />
            </div>

            {/* Warning Message */}
            {usage.isNearLimit && (
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                padding: '10px',
                backgroundColor: 'rgba(255, 193, 7, 0.1)',
                borderRadius: '8px',
                marginTop: '12px'
              }}>
                <AlertTriangle size={16} color="var(--orange-alert)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '11px', color: 'var(--warning-text, #856404)', lineHeight: '1.4' }}>
                  <strong>Warning:</strong> Storage is at {usage.percentageFormatted} capacity. 
                  Consider clearing uploaded data to free space.
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '12px',
            marginBottom: '24px'
          }}>
            <button
              onClick={handleClearUploadedData}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 16px',
                backgroundColor: 'var(--primary-teal)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                transition: 'all 0.2s ease'
              }}
            >
              <Trash2 size={16} />
              {loading ? 'Clearing...' : 'Clear Uploaded Data'}
            </button>

            <button
              onClick={loadStorageStats}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 16px',
                backgroundColor: 'var(--bg-light)',
                color: 'var(--text-dark)',
                border: '1px solid var(--border-light)',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                transition: 'all 0.2s ease'
              }}
            >
              <RefreshCw size={16} />
              Refresh Stats
            </button>
          </div>

          {/* Storage Breakdown */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ 
              fontSize: '16px', 
              fontWeight: '700',
              color: 'var(--text-dark)',
              marginBottom: '12px'
            }}>
              Storage Breakdown
            </h3>

            {breakdown.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '20px',
                backgroundColor: 'var(--bg-light)',
                borderRadius: '8px',
                fontSize: '12px',
                color: 'var(--text-muted)'
              }}>
                No data stored
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {breakdown.slice(0, 10).map((item, index) => (
                  <div 
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-light)',
                      borderRadius: '8px',
                      fontSize: '11px'
                    }}
                  >
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ 
                        fontWeight: '600',
                        color: 'var(--text-dark)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginBottom: '2px'
                      }}>
                        {item.key}
                      </div>
                      <div style={{ color: 'var(--text-muted)' }}>
                        {item.sizeKB} KB ({item.percentageFormatted})
                      </div>
                    </div>
                  </div>
                ))}
                
                {breakdown.length > 10 && (
                  <div style={{
                    textAlign: 'center',
                    padding: '8px',
                    fontSize: '11px',
                    color: 'var(--text-muted)'
                  }}>
                    + {breakdown.length - 10} more items
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Danger Zone */}
          <div style={{
            backgroundColor: 'rgba(220, 53, 69, 0.05)',
            border: '1px solid rgba(220, 53, 69, 0.2)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '20px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '12px'
            }}>
              <AlertTriangle size={18} color="var(--red-alert)" />
              <h4 style={{
                fontSize: '14px',
                fontWeight: '700',
                color: 'var(--red-alert)',
                margin: 0
              }}>
                Danger Zone
              </h4>
            </div>

            <p style={{
              fontSize: '11px',
              color: 'var(--text-muted)',
              lineHeight: '1.4',
              marginBottom: '12px'
            }}>
              Clear all Kalinga data including pending uploads. This action cannot be undone.
            </p>

            {!showConfirmClear ? (
              <button
                onClick={() => setShowConfirmClear(true)}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: 'transparent',
                  color: 'var(--red-alert)',
                  border: '1px solid var(--red-alert)',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Clear All Kalinga Data
              </button>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{
                  backgroundColor: 'rgba(220, 53, 69, 0.1)',
                  padding: '10px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  color: 'var(--red-alert)',
                  marginBottom: '4px'
                }}>
                  <strong>⚠ Are you sure?</strong> This will delete ALL pending uploads and patient data.
                </div>
                <button
                  onClick={handleClearAllData}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: 'var(--red-alert)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.6 : 1
                  }}
                >
                  {loading ? 'Clearing...' : 'Yes, Clear All Data'}
                </button>
                <button
                  onClick={() => setShowConfirmClear(false)}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: 'transparent',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border-light)',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: loading ? 'not-allowed' : 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            padding: '12px',
            backgroundColor: 'rgba(23, 162, 184, 0.05)',
            border: '1px solid rgba(23, 162, 184, 0.2)',
            borderRadius: '8px',
            fontSize: '11px',
            color: 'var(--text-muted)',
            lineHeight: '1.4'
          }}>
            <Info size={16} color="var(--primary-teal)" style={{ flexShrink: 0, marginTop: '1px' }} />
            <div>
              <strong style={{ color: 'var(--text-dark)' }}>About Storage:</strong> The browser's localStorage 
              has an estimated quota of ~5MB. When storage reaches 80% capacity, you'll see warnings. 
              Clearing uploaded data removes cached notifications and temporary files, but preserves 
              pending uploads in the sync queue.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
