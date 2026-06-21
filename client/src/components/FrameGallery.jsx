import React, { useState, useEffect, useRef } from 'react';
import { ZoomIn, ZoomOut, X, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';

/**
 * FrameGallery Component - Displays ultrasound frames with zoom and lightbox functionality
 * 
 * Features:
 * - 2x3 grid layout displaying 6 frames
 * - Click to open full-screen lightbox viewer
 * - Zoom in/out controls with pan functionality
 * - FetalCLIP labels displayed on hover
 * - Keyboard navigation (arrow keys, ESC to close)
 * 
 * @param {Array} frames - Array of frame objects with imageData and metadata
 * @param {string} defaultImage - Fallback image URL if frames not provided
 */
export default function FrameGallery({ frames = [], defaultImage = "http://localhost:5000/assets/ultrasound_sweep.png" }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredFrame, setHoveredFrame] = useState(null);
  
  const imageRef = useRef(null);
  const lightboxRef = useRef(null);

  // Generate 6 frames - use provided frames or default image
  const displayFrames = Array(6).fill(null).map((_, index) => {
    const frame = frames[index];
    return {
      id: frame?.id || `frame-${index}`,
      imageData: frame?.imageData || defaultImage,
      sequenceNumber: frame?.sequenceNumber || index + 1,
      fetalClipClassification: frame?.fetalClipClassification || {
        plane: 'Fetal Head',
        confidence: 94 - (index * 2) // Simulated confidence scores
      },
      qualityScore: frame?.qualityScore || 85 + (index % 3)
    };
  });

  // Open lightbox with selected frame
  const openLightbox = (index) => {
    setCurrentFrameIndex(index);
    setLightboxOpen(true);
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  };

  // Close lightbox
  const closeLightbox = () => {
    setLightboxOpen(false);
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  };

  // Navigate to previous frame
  const previousFrame = () => {
    setCurrentFrameIndex((prev) => (prev - 1 + displayFrames.length) % displayFrames.length);
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  };

  // Navigate to next frame
  const nextFrame = () => {
    setCurrentFrameIndex((prev) => (prev + 1) % displayFrames.length);
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  };

  // Zoom in
  const zoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.5, 4));
  };

  // Zoom out
  const zoomOut = () => {
    setZoomLevel((prev) => {
      const newZoom = Math.max(prev - 0.5, 1);
      if (newZoom === 1) {
        setPanPosition({ x: 0, y: 0 });
      }
      return newZoom;
    });
  };

  // Handle mouse down for panning
  const handleMouseDown = (e) => {
    if (zoomLevel > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - panPosition.x,
        y: e.clientY - panPosition.y
      });
    }
  };

  // Handle mouse move for panning
  const handleMouseMove = (e) => {
    if (isDragging && zoomLevel > 1) {
      setPanPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  // Handle mouse up
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!lightboxOpen) return;

      switch (e.key) {
        case 'Escape':
          closeLightbox();
          break;
        case 'ArrowLeft':
          previousFrame();
          break;
        case 'ArrowRight':
          nextFrame();
          break;
        case '+':
        case '=':
          zoomIn();
          break;
        case '-':
        case '_':
          zoomOut();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  // Lock body scroll when lightbox is open
  useEffect(() => {
    if (lightboxOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }, [lightboxOpen]);

  const currentFrame = displayFrames[currentFrameIndex];

  return (
    <>
      {/* Frame Grid (2x3 layout) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
        marginTop: '12px'
      }}>
        {displayFrames.map((frame, index) => (
          <div
            key={frame.id}
            onMouseEnter={() => setHoveredFrame(index)}
            onMouseLeave={() => setHoveredFrame(null)}
            onClick={() => openLightbox(index)}
            style={{
              position: 'relative',
              aspectRatio: '1.3',
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1.5px solid var(--border-color)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              transform: hoveredFrame === index ? 'scale(1.05)' : 'scale(1)',
              boxShadow: hoveredFrame === index ? '0 4px 12px rgba(0,0,0,0.15)' : '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            <img
              src={frame.imageData}
              alt={`Ultrasound frame ${frame.sequenceNumber}`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
            
            {/* Frame sequence number badge */}
            <div style={{
              position: 'absolute',
              top: '6px',
              left: '6px',
              backgroundColor: 'rgba(0,0,0,0.7)',
              color: 'white',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: '700'
            }}>
              #{frame.sequenceNumber}
            </div>

            {/* Expand icon overlay */}
            <div style={{
              position: 'absolute',
              top: '6px',
              right: '6px',
              backgroundColor: 'rgba(0,0,0,0.7)',
              color: 'white',
              padding: '4px',
              borderRadius: '4px',
              opacity: hoveredFrame === index ? 1 : 0,
              transition: 'opacity 0.2s ease'
            }}>
              <Maximize2 size={14} />
            </div>

            {/* FetalCLIP label on hover */}
            {hoveredFrame === index && (
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                backgroundColor: 'rgba(16, 185, 129, 0.95)',
                color: 'white',
                padding: '6px 8px',
                fontSize: '10px',
                fontWeight: '700',
                textAlign: 'center',
                animation: 'slideUp 0.2s ease'
              }}>
                {frame.fetalClipClassification.plane} [{frame.fetalClipClassification.confidence}%]
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Full-screen Lightbox Viewer */}
      {lightboxOpen && (
        <div
          ref={lightboxRef}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            animation: 'fadeIn 0.2s ease'
          }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Header with controls */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 24px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ color: 'white', fontSize: '14px', fontWeight: '700' }}>
              Frame {currentFrame.sequenceNumber} of {displayFrames.length}
              <span style={{
                marginLeft: '12px',
                fontSize: '12px',
                fontWeight: '400',
                color: 'rgba(255, 255, 255, 0.7)'
              }}>
                {currentFrame.fetalClipClassification.plane} [{currentFrame.fetalClipClassification.confidence}%]
              </span>
            </div>

            {/* Zoom controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={zoomOut}
                disabled={zoomLevel <= 1}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: zoomLevel <= 1 ? 'rgba(255, 255, 255, 0.3)' : 'white',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  cursor: zoomLevel <= 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  transition: 'all 0.2s ease'
                }}
              >
                <ZoomOut size={16} /> Zoom Out
              </button>

              <span style={{
                color: 'white',
                fontSize: '12px',
                fontWeight: '700',
                minWidth: '50px',
                textAlign: 'center'
              }}>
                {Math.round(zoomLevel * 100)}%
              </span>

              <button
                onClick={zoomIn}
                disabled={zoomLevel >= 4}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  color: zoomLevel >= 4 ? 'rgba(255, 255, 255, 0.3)' : 'white',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  cursor: zoomLevel >= 4 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  transition: 'all 0.2s ease'
                }}
              >
                <ZoomIn size={16} /> Zoom In
              </button>

              <button
                onClick={closeLightbox}
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.5)',
                  color: 'white',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  marginLeft: '12px',
                  transition: 'all 0.2s ease'
                }}
              >
                <X size={16} /> Close (ESC)
              </button>
            </div>
          </div>

          {/* Main image viewer with pan functionality */}
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            position: 'relative',
            cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
          }}>
            {/* Previous button */}
            <button
              onClick={previousFrame}
              style={{
                position: 'absolute',
                left: '24px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: 'white',
                padding: '12px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                zIndex: 10
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
            >
              <ChevronLeft size={24} />
            </button>

            {/* Image container */}
            <div
              ref={imageRef}
              onMouseDown={handleMouseDown}
              style={{
                maxWidth: '90%',
                maxHeight: '90%',
                transform: `scale(${zoomLevel}) translate(${panPosition.x / zoomLevel}px, ${panPosition.y / zoomLevel}px)`,
                transition: isDragging ? 'none' : 'transform 0.2s ease',
                transformOrigin: 'center center',
                userSelect: 'none',
                WebkitUserSelect: 'none'
              }}
            >
              <img
                src={currentFrame.imageData}
                alt={`Ultrasound frame ${currentFrame.sequenceNumber}`}
                style={{
                  maxWidth: '100%',
                  maxHeight: '80vh',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  pointerEvents: 'none',
                  userSelect: 'none'
                }}
                draggable={false}
              />
            </div>

            {/* Next button */}
            <button
              onClick={nextFrame}
              style={{
                position: 'absolute',
                right: '24px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: 'white',
                padding: '12px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                zIndex: 10
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
            >
              <ChevronRight size={24} />
            </button>
          </div>

          {/* Footer with frame thumbnails */}
          <div style={{
            padding: '16px 24px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'center',
            gap: '8px',
            overflowX: 'auto'
          }}>
            {displayFrames.map((frame, index) => (
              <div
                key={frame.id}
                onClick={() => {
                  setCurrentFrameIndex(index);
                  setZoomLevel(1);
                  setPanPosition({ x: 0, y: 0 });
                }}
                style={{
                  width: '80px',
                  height: '60px',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  border: index === currentFrameIndex ? '2px solid var(--primary-teal)' : '2px solid rgba(255, 255, 255, 0.3)',
                  cursor: 'pointer',
                  opacity: index === currentFrameIndex ? 1 : 0.6,
                  transition: 'all 0.2s ease',
                  flexShrink: 0
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                onMouseLeave={(e) => {
                  if (index !== currentFrameIndex) {
                    e.currentTarget.style.opacity = 0.6;
                  }
                }}
              >
                <img
                  src={frame.imageData}
                  alt={`Thumbnail ${frame.sequenceNumber}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              </div>
            ))}
          </div>

          {/* Keyboard hints */}
          <div style={{
            position: 'absolute',
            bottom: '100px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '11px',
            textAlign: 'center',
            pointerEvents: 'none'
          }}>
            Use arrow keys to navigate • +/- to zoom • ESC to close
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes fadeIn {
            from {
              opacity: 0;
            }
            to {
              opacity: 1;
            }
          }

          @keyframes slideUp {
            from {
              transform: translateY(100%);
            }
            to {
              transform: translateY(0);
            }
          }
        `}
      </style>
    </>
  );
}
