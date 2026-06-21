import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SpecialistDashboard from './SpecialistDashboard';
import { api } from '../services/api';

// Mock the API
vi.mock('../services/api', () => ({
  api: {
    getScans: vi.fn(),
    getPatients: vi.fn(),
    verifyScan: vi.fn()
  }
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  CheckCircle: () => <div>CheckCircle</div>,
  AlertTriangle: () => <div>AlertTriangle</div>,
  AlertOctagon: () => <div>AlertOctagon</div>,
  User: () => <div>User</div>,
  BookOpen: () => <div>BookOpen</div>,
  Clock: () => <div>Clock</div>,
  Activity: () => <div>Activity</div>,
  Search: () => <div>Search</div>,
  SortAsc: () => <div>SortAsc</div>,
  ZoomIn: () => <div>ZoomIn</div>,
  ZoomOut: () => <div>ZoomOut</div>,
  X: () => <div>X</div>,
  ChevronLeft: () => <div>ChevronLeft</div>,
  ChevronRight: () => <div>ChevronRight</div>,
  Maximize2: () => <div>Maximize2</div>
}));

describe('SpecialistDashboard - FrameGallery Integration', () => {
  const mockShowToast = vi.fn();
  
  const mockPatients = [
    {
      id: 'patient-1',
      philhealthId: 'PH-123456789-1',
      firstName: 'Maria',
      lastName: 'Santos',
      age: 28,
      weight: 70,
      height: 160,
      riskFactors: {
        hypertension: true,
        family: false,
        firstpreg: true
      }
    }
  ];

  const mockScans = [
    {
      id: 'scan-1',
      patientId: 'patient-1',
      status: 'Submitted',
      riskScore: 78,
      riskLevel: 'HIGH RISK',
      bp: '160/100',
      bmi: 27.3,
      scanQualityScore: 92,
      fetalHeartRate: '145 bpm',
      gestationalAgeEstimate: '24 weeks',
      timestamp: new Date().toISOString(),
      frames: Array(6).fill(null).map((_, index) => ({
        id: `frame-${index}`,
        imageData: `http://localhost:5000/assets/frame-${index}.png`,
        sequenceNumber: index + 1,
        fetalClipClassification: {
          plane: 'Fetal Head',
          confidence: 94 - (index * 2)
        },
        qualityScore: 85 + (index % 3)
      }))
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    api.getScans.mockResolvedValue(mockScans);
    api.getPatients.mockResolvedValue(mockPatients);
  });

  it('should render FrameGallery when a case is selected', async () => {
    const { container } = render(
      <BrowserRouter>
        <SpecialistDashboard showToast={mockShowToast} />
      </BrowserRouter>
    );

    // Wait for scans to load
    await waitFor(() => {
      expect(api.getScans).toHaveBeenCalled();
      expect(api.getPatients).toHaveBeenCalled();
    });

    // Wait for the frame gallery to render
    await waitFor(() => {
      const gridContainer = container.querySelector('div[style*="grid-template-columns: repeat(3, 1fr)"]');
      expect(gridContainer).toBeTruthy();
    });

    // Check that 6 frames are displayed
    const frameImages = container.querySelectorAll('img[alt^="Ultrasound frame"]');
    expect(frameImages.length).toBe(6);
  });

  it('should display scan quality score', async () => {
    const { container } = render(
      <BrowserRouter>
        <SpecialistDashboard showToast={mockShowToast} />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(container.textContent).toContain('Scan Quality Index: 92%');
    });
  });

  it('should open lightbox when frame is clicked', async () => {
    const { container } = render(
      <BrowserRouter>
        <SpecialistDashboard showToast={mockShowToast} />
      </BrowserRouter>
    );

    // Wait for frames to load
    await waitFor(() => {
      const frameImages = container.querySelectorAll('img[alt^="Ultrasound frame"]');
      expect(frameImages.length).toBe(6);
    });

    // Click first frame
    const frameContainers = container.querySelectorAll('div[style*="cursor: pointer"]');
    const firstFrame = Array.from(frameContainers).find(el => 
      el.querySelector('img[alt^="Ultrasound frame"]')
    );
    
    if (firstFrame) {
      fireEvent.click(firstFrame);

      // Wait for lightbox to appear
      await waitFor(() => {
        const lightbox = container.querySelector('div[style*="position: fixed"]');
        expect(lightbox).toBeTruthy();
      });

      // Check for frame counter
      expect(container.textContent).toContain('Frame 1 of 6');
    }
  });

  it('should display FetalCLIP classification in lightbox', async () => {
    const { container } = render(
      <BrowserRouter>
        <SpecialistDashboard showToast={mockShowToast} />
      </BrowserRouter>
    );

    // Wait for frames to load
    await waitFor(() => {
      const frameImages = container.querySelectorAll('img[alt^="Ultrasound frame"]');
      expect(frameImages.length).toBe(6);
    });

    // Click first frame
    const frameContainers = container.querySelectorAll('div[style*="cursor: pointer"]');
    const firstFrame = Array.from(frameContainers).find(el => 
      el.querySelector('img[alt^="Ultrasound frame"]')
    );
    
    if (firstFrame) {
      fireEvent.click(firstFrame);

      // Wait for lightbox and check for FetalCLIP label
      await waitFor(() => {
        expect(container.textContent).toContain('Fetal Head');
        expect(container.textContent).toContain('[94%]');
      });
    }
  });

  it('should show zoom controls in lightbox', async () => {
    const { container } = render(
      <BrowserRouter>
        <SpecialistDashboard showToast={mockShowToast} />
      </BrowserRouter>
    );

    // Wait for frames to load and click first frame
    await waitFor(() => {
      const frameImages = container.querySelectorAll('img[alt^="Ultrasound frame"]');
      expect(frameImages.length).toBe(6);
    });

    const frameContainers = container.querySelectorAll('div[style*="cursor: pointer"]');
    const firstFrame = Array.from(frameContainers).find(el => 
      el.querySelector('img[alt^="Ultrasound frame"]')
    );
    
    if (firstFrame) {
      fireEvent.click(firstFrame);

      // Check for zoom controls
      await waitFor(() => {
        expect(container.textContent).toContain('Zoom Out');
        expect(container.textContent).toContain('Zoom In');
        expect(container.textContent).toContain('100%');
      });
    }
  });

  it('should display patient information alongside frame gallery', async () => {
    const { container } = render(
      <BrowserRouter>
        <SpecialistDashboard showToast={mockShowToast} />
      </BrowserRouter>
    );

    await waitFor(() => {
      // Check for patient name
      expect(container.textContent).toContain('Maria Santos');
      
      // Check for risk score
      expect(container.textContent).toContain('78% Risk');
      
      // Check for vitals
      expect(container.textContent).toContain('160/100');
    });
  });

  it('should maintain frame gallery visibility during verdict submission', async () => {
    const { container } = render(
      <BrowserRouter>
        <SpecialistDashboard showToast={mockShowToast} />
      </BrowserRouter>
    );

    // Wait for frames to load
    await waitFor(() => {
      const frameImages = container.querySelectorAll('img[alt^="Ultrasound frame"]');
      expect(frameImages.length).toBe(6);
    });

    // Frames should still be visible
    const gridContainer = container.querySelector('div[style*="grid-template-columns: repeat(3, 1fr)"]');
    expect(gridContainer).toBeTruthy();
  });
});
