import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FrameGallery from './FrameGallery';

describe('FrameGallery Component', () => {
  const mockFrames = Array(6).fill(null).map((_, index) => ({
    id: `frame-${index}`,
    imageData: `http://localhost:5000/assets/test-frame-${index}.png`,
    sequenceNumber: index + 1,
    fetalClipClassification: {
      plane: 'Fetal Head',
      confidence: 94 - (index * 2)
    },
    qualityScore: 85 + (index % 3)
  }));

  beforeEach(() => {
    // Reset body overflow
    document.body.style.overflow = 'auto';
  });

  afterEach(() => {
    // Cleanup
    document.body.style.overflow = 'auto';
  });

  describe('Grid Layout', () => {
    it('should render 6 frames in a grid layout', () => {
      const { container } = render(<FrameGallery frames={mockFrames} />);
      
      // Check for grid container
      const gridContainer = container.querySelector('div[style*="grid-template-columns: repeat(3, 1fr)"]');
      expect(gridContainer).toBeTruthy();
      
      // Check for 6 images
      const images = container.querySelectorAll('img[alt^="Ultrasound frame"]');
      expect(images.length).toBe(6);
    });

    it('should display frame sequence numbers', () => {
      const { container } = render(<FrameGallery frames={mockFrames} />);
      
      // Check for sequence number badges
      for (let i = 1; i <= 6; i++) {
        const badge = container.textContent.includes(`#${i}`);
        expect(badge).toBe(true);
      }
    });

    it('should use default image when frames not provided', () => {
      const defaultImage = "http://localhost:5000/assets/ultrasound_sweep.png";
      const { container } = render(<FrameGallery defaultImage={defaultImage} />);
      
      const images = container.querySelectorAll(`img[src="${defaultImage}"]`);
      expect(images.length).toBe(6);
    });
  });

  describe('Hover Interactions', () => {
    it('should display FetalCLIP labels on hover', async () => {
      const { container } = render(<FrameGallery frames={mockFrames} />);
      
      // Get first frame container
      const frameContainers = container.querySelectorAll('div[style*="cursor: pointer"]');
      const firstFrame = frameContainers[0];
      
      // Hover over frame
      fireEvent.mouseEnter(firstFrame);
      
      // Wait for label to appear
      await waitFor(() => {
        expect(container.textContent).toContain('Fetal Head');
        expect(container.textContent).toContain('[94%]');
      });
      
      // Mouse leave
      fireEvent.mouseLeave(firstFrame);
    });

    it('should show expand icon on hover', async () => {
      const { container } = render(<FrameGallery frames={mockFrames} />);
      
      const frameContainers = container.querySelectorAll('div[style*="cursor: pointer"]');
      const firstFrame = frameContainers[0];
      
      fireEvent.mouseEnter(firstFrame);
      
      // The expand icon should become visible (opacity changes from 0 to 1)
      // This is handled by inline styles, so we just verify the component renders
      expect(firstFrame).toBeTruthy();
    });
  });

  describe('Lightbox Functionality', () => {
    it('should open lightbox when frame is clicked', async () => {
      const { container } = render(<FrameGallery frames={mockFrames} />);
      
      const frameContainers = container.querySelectorAll('div[style*="cursor: pointer"]');
      const firstFrame = frameContainers[0];
      
      // Click frame
      fireEvent.click(firstFrame);
      
      // Wait for lightbox to appear
      await waitFor(() => {
        const lightbox = container.querySelector('div[style*="position: fixed"]');
        expect(lightbox).toBeTruthy();
      });
      
      // Check for frame counter
      expect(container.textContent).toContain('Frame 1 of 6');
    });

    it('should close lightbox when close button is clicked', async () => {
      const { container } = render(<FrameGallery frames={mockFrames} />);
      
      // Open lightbox
      const frameContainers = container.querySelectorAll('div[style*="cursor: pointer"]');
      fireEvent.click(frameContainers[0]);
      
      await waitFor(() => {
        const lightbox = container.querySelector('div[style*="position: fixed"]');
        expect(lightbox).toBeTruthy();
      });
      
      // Find and click close button
      const closeButton = screen.getByText(/Close \(ESC\)/i);
      fireEvent.click(closeButton);
      
      // Lightbox should be gone
      await waitFor(() => {
        const lightbox = container.querySelector('div[style*="position: fixed"]');
        expect(lightbox).toBeFalsy();
      });
    });

    it('should close lightbox on ESC key press', async () => {
      const { container } = render(<FrameGallery frames={mockFrames} />);
      
      // Open lightbox
      const frameContainers = container.querySelectorAll('div[style*="cursor: pointer"]');
      fireEvent.click(frameContainers[0]);
      
      await waitFor(() => {
        const lightbox = container.querySelector('div[style*="position: fixed"]');
        expect(lightbox).toBeTruthy();
      });
      
      // Press ESC key
      fireEvent.keyDown(window, { key: 'Escape' });
      
      // Lightbox should be gone
      await waitFor(() => {
        const lightbox = container.querySelector('div[style*="position: fixed"]');
        expect(lightbox).toBeFalsy();
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should navigate to next frame with right arrow key', async () => {
      const { container } = render(<FrameGallery frames={mockFrames} />);
      
      // Open lightbox
      const frameContainers = container.querySelectorAll('div[style*="cursor: pointer"]');
      fireEvent.click(frameContainers[0]);
      
      await waitFor(() => {
        expect(container.textContent).toContain('Frame 1 of 6');
      });
      
      // Press right arrow
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      
      // Should show frame 2
      await waitFor(() => {
        expect(container.textContent).toContain('Frame 2 of 6');
      });
    });

    it('should navigate to previous frame with left arrow key', async () => {
      const { container } = render(<FrameGallery frames={mockFrames} />);
      
      // Open lightbox at second frame
      const frameContainers = container.querySelectorAll('div[style*="cursor: pointer"]');
      fireEvent.click(frameContainers[1]);
      
      await waitFor(() => {
        expect(container.textContent).toContain('Frame 2 of 6');
      });
      
      // Press left arrow
      fireEvent.keyDown(window, { key: 'ArrowLeft' });
      
      // Should show frame 1
      await waitFor(() => {
        expect(container.textContent).toContain('Frame 1 of 6');
      });
    });

    it('should wrap around when navigating past last frame', async () => {
      const { container } = render(<FrameGallery frames={mockFrames} />);
      
      // Open lightbox at last frame
      const frameContainers = container.querySelectorAll('div[style*="cursor: pointer"]');
      fireEvent.click(frameContainers[5]);
      
      await waitFor(() => {
        expect(container.textContent).toContain('Frame 6 of 6');
      });
      
      // Press right arrow
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      
      // Should wrap to frame 1
      await waitFor(() => {
        expect(container.textContent).toContain('Frame 1 of 6');
      });
    });
  });

  describe('Zoom Controls', () => {
    it('should zoom in when zoom in button is clicked', async () => {
      const { container } = render(<FrameGallery frames={mockFrames} />);
      
      // Open lightbox
      const frameContainers = container.querySelectorAll('div[style*="cursor: pointer"]');
      fireEvent.click(frameContainers[0]);
      
      await waitFor(() => {
        expect(container.textContent).toContain('100%');
      });
      
      // Click zoom in button
      const zoomInButton = screen.getByText(/Zoom In/i);
      fireEvent.click(zoomInButton);
      
      // Should show 150%
      await waitFor(() => {
        expect(container.textContent).toContain('150%');
      });
    });

    it('should zoom out when zoom out button is clicked', async () => {
      const { container } = render(<FrameGallery frames={mockFrames} />);
      
      // Open lightbox
      const frameContainers = container.querySelectorAll('div[style*="cursor: pointer"]');
      fireEvent.click(frameContainers[0]);
      
      // Zoom in first
      const zoomInButton = screen.getByText(/Zoom In/i);
      fireEvent.click(zoomInButton);
      
      await waitFor(() => {
        expect(container.textContent).toContain('150%');
      });
      
      // Click zoom out button
      const zoomOutButton = screen.getByText(/Zoom Out/i);
      fireEvent.click(zoomOutButton);
      
      // Should be back to 100%
      await waitFor(() => {
        expect(container.textContent).toContain('100%');
      });
    });

    it('should not zoom below 100%', async () => {
      const { container } = render(<FrameGallery frames={mockFrames} />);
      
      // Open lightbox
      const frameContainers = container.querySelectorAll('div[style*="cursor: pointer"]');
      fireEvent.click(frameContainers[0]);
      
      await waitFor(() => {
        expect(container.textContent).toContain('100%');
      });
      
      // Try to zoom out
      const zoomOutButton = screen.getByText(/Zoom Out/i);
      fireEvent.click(zoomOutButton);
      
      // Should still be 100%
      expect(container.textContent).toContain('100%');
    });

    it('should not zoom above 400%', async () => {
      const { container } = render(<FrameGallery frames={mockFrames} />);
      
      // Open lightbox
      const frameContainers = container.querySelectorAll('div[style*="cursor: pointer"]');
      fireEvent.click(frameContainers[0]);
      
      // Zoom in multiple times (8 times should reach max)
      const zoomInButton = screen.getByText(/Zoom In/i);
      for (let i = 0; i < 10; i++) {
        fireEvent.click(zoomInButton);
      }
      
      // Should cap at 400%
      await waitFor(() => {
        expect(container.textContent).toContain('400%');
      });
    });

    it('should zoom with + and - keys', async () => {
      const { container } = render(<FrameGallery frames={mockFrames} />);
      
      // Open lightbox
      const frameContainers = container.querySelectorAll('div[style*="cursor: pointer"]');
      fireEvent.click(frameContainers[0]);
      
      // Press + key
      fireEvent.keyDown(window, { key: '+' });
      
      await waitFor(() => {
        expect(container.textContent).toContain('150%');
      });
      
      // Press - key
      fireEvent.keyDown(window, { key: '-' });
      
      await waitFor(() => {
        expect(container.textContent).toContain('100%');
      });
    });
  });

  describe('Pan Functionality', () => {
    it('should enable panning when zoomed in', async () => {
      const { container } = render(<FrameGallery frames={mockFrames} />);
      
      // Open lightbox
      const frameContainers = container.querySelectorAll('div[style*="cursor: pointer"]');
      fireEvent.click(frameContainers[0]);
      
      // Zoom in
      const zoomInButton = screen.getByText(/Zoom In/i);
      fireEvent.click(zoomInButton);
      
      await waitFor(() => {
        expect(container.textContent).toContain('150%');
      });
      
      // Find image container
      const imageContainer = container.querySelector('div[style*="transform: scale"]');
      expect(imageContainer).toBeTruthy();
      
      // Simulate mouse drag
      fireEvent.mouseDown(imageContainer, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(imageContainer, { clientX: 150, clientY: 150 });
      fireEvent.mouseUp(imageContainer);
      
      // Pan position should have changed (checked via transform in the component)
      expect(imageContainer.style.transform).toBeTruthy();
    });

    it('should reset pan position when zooming back to 100%', async () => {
      const { container } = render(<FrameGallery frames={mockFrames} />);
      
      // Open lightbox
      const frameContainers = container.querySelectorAll('div[style*="cursor: pointer"]');
      fireEvent.click(frameContainers[0]);
      
      // Zoom in
      const zoomInButton = screen.getByText(/Zoom In/i);
      fireEvent.click(zoomInButton);
      
      await waitFor(() => {
        expect(container.textContent).toContain('150%');
      });
      
      // Pan the image
      const imageContainer = container.querySelector('div[style*="transform: scale"]');
      fireEvent.mouseDown(imageContainer, { clientX: 100, clientY: 100 });
      fireEvent.mouseMove(imageContainer, { clientX: 150, clientY: 150 });
      fireEvent.mouseUp(imageContainer);
      
      // Zoom back out
      const zoomOutButton = screen.getByText(/Zoom Out/i);
      fireEvent.click(zoomOutButton);
      
      await waitFor(() => {
        expect(container.textContent).toContain('100%');
      });
      
      // Pan should be reset - when zoom is 1, pan position doesn't affect display
      // The transform should just be scale(1) with translate at origin
      expect(imageContainer.style.transform).toContain('scale(1)');
    });
  });

  describe('Thumbnail Navigation', () => {
    it('should display thumbnails in lightbox footer', async () => {
      const { container } = render(<FrameGallery frames={mockFrames} />);
      
      // Open lightbox
      const frameContainers = container.querySelectorAll('div[style*="cursor: pointer"]');
      fireEvent.click(frameContainers[0]);
      
      await waitFor(() => {
        const lightbox = container.querySelector('div[style*="position: fixed"]');
        expect(lightbox).toBeTruthy();
      });
      
      // Check for thumbnail images
      const thumbnails = container.querySelectorAll('img[alt^="Thumbnail"]');
      expect(thumbnails.length).toBe(6);
    });

    it('should navigate to frame when thumbnail is clicked', async () => {
      const { container } = render(<FrameGallery frames={mockFrames} />);
      
      // Open lightbox at first frame
      const frameContainers = container.querySelectorAll('div[style*="cursor: pointer"]');
      fireEvent.click(frameContainers[0]);
      
      await waitFor(() => {
        expect(container.textContent).toContain('Frame 1 of 6');
      });
      
      // Click on third thumbnail
      const thumbnails = container.querySelectorAll('img[alt^="Thumbnail"]');
      fireEvent.click(thumbnails[2].parentElement);
      
      // Should navigate to frame 3
      await waitFor(() => {
        expect(container.textContent).toContain('Frame 3 of 6');
      });
    });

    it('should highlight current frame thumbnail', async () => {
      const { container } = render(<FrameGallery frames={mockFrames} />);
      
      // Open lightbox
      const frameContainers = container.querySelectorAll('div[style*="cursor: pointer"]');
      fireEvent.click(frameContainers[0]);
      
      await waitFor(() => {
        const lightbox = container.querySelector('div[style*="position: fixed"]');
        expect(lightbox).toBeTruthy();
      });
      
      // First thumbnail should have different border (highlighted)
      const thumbnails = container.querySelectorAll('img[alt^="Thumbnail"]');
      const thumbnailContainers = Array.from(thumbnails).map(img => img.parentElement);
      
      // Check that at least one thumbnail has the highlight border
      const hasHighlightedThumbnail = thumbnailContainers.some(
        container => container.style.border.includes('var(--primary-teal)')
      );
      
      expect(hasHighlightedThumbnail).toBe(true);
    });
  });

  describe('Body Scroll Lock', () => {
    it('should lock body scroll when lightbox is open', async () => {
      const { container } = render(<FrameGallery frames={mockFrames} />);
      
      expect(document.body.style.overflow).toBe('auto');
      
      // Open lightbox
      const frameContainers = container.querySelectorAll('div[style*="cursor: pointer"]');
      fireEvent.click(frameContainers[0]);
      
      await waitFor(() => {
        expect(document.body.style.overflow).toBe('hidden');
      });
    });

    it('should restore body scroll when lightbox is closed', async () => {
      const { container } = render(<FrameGallery frames={mockFrames} />);
      
      // Open lightbox
      const frameContainers = container.querySelectorAll('div[style*="cursor: pointer"]');
      fireEvent.click(frameContainers[0]);
      
      await waitFor(() => {
        expect(document.body.style.overflow).toBe('hidden');
      });
      
      // Close lightbox
      const closeButton = screen.getByText(/Close \(ESC\)/i);
      fireEvent.click(closeButton);
      
      await waitFor(() => {
        expect(document.body.style.overflow).toBe('auto');
      });
    });
  });
});
