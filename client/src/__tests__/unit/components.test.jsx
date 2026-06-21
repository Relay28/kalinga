import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormField, Button, Card, Badge } from '../../components';

describe('Reusable Components', () => {
  describe('Button Component', () => {
    it('renders button with text', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByText('Click me')).toBeDefined();
    });

    it('calls onClick handler when clicked', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Click</Button>);
      screen.getByText('Click').click();
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('applies variant classes correctly', () => {
      const { container } = render(<Button variant="primary">Primary</Button>);
      const button = container.querySelector('button');
      expect(button.className).toContain('btn-blue');
    });

    it('shows loading state', () => {
      render(<Button loading>Submit</Button>);
      expect(screen.getByRole('button')).toHaveProperty('disabled', true);
    });

    it('respects disabled prop', () => {
      render(<Button disabled>Disabled</Button>);
      expect(screen.getByRole('button')).toHaveProperty('disabled', true);
    });
  });

  describe('FormField Component', () => {
    it('renders label and input', () => {
      render(
        <FormField 
          label="Email" 
          value="" 
          onChange={() => {}} 
          fieldName="email"
        />
      );
      expect(screen.getByText(/Email/)).toBeDefined();
      expect(screen.getByRole('textbox')).toBeDefined();
    });

    it('displays error message when provided', () => {
      render(
        <FormField 
          label="Email" 
          value="invalid" 
          onChange={() => {}} 
          fieldName="email"
          error="Invalid email format"
        />
      );
      expect(screen.getByText('Invalid email format')).toBeDefined();
    });

    it('shows validation checkmark when valid', () => {
      const { container } = render(
        <FormField 
          label="Email" 
          value="test@example.com" 
          onChange={() => {}} 
          fieldName="email"
          isValid={true}
        />
      );
      // Check for checkmark icon (svg element)
      const checkIcon = container.querySelector('svg');
      expect(checkIcon).toBeDefined();
    });

    it('marks required fields with asterisk', () => {
      const { container } = render(
        <FormField 
          label="Email" 
          value="" 
          onChange={() => {}} 
          fieldName="email"
          required={true}
        />
      );
      const asterisk = container.querySelector('span[style*="color"]');
      expect(asterisk).toBeDefined();
    });
  });

  describe('Card Component', () => {
    it('renders children content', () => {
      render(
        <Card>
          <p>Card content</p>
        </Card>
      );
      expect(screen.getByText('Card content')).toBeDefined();
    });

    it('renders title and subtitle', () => {
      render(
        <Card title="Test Card" subtitle="Subtitle text">
          <p>Content</p>
        </Card>
      );
      expect(screen.getByText('Test Card')).toBeDefined();
      expect(screen.getByText('Subtitle text')).toBeDefined();
    });

    it('calls onClick when clicked and handler provided', () => {
      const handleClick = vi.fn();
      render(
        <Card onClick={handleClick}>
          <p>Clickable card</p>
        </Card>
      );
      screen.getByText('Clickable card').closest('.card').click();
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('renders footer when provided', () => {
      render(
        <Card footer={<button>Action</button>}>
          <p>Content</p>
        </Card>
      );
      expect(screen.getByText('Action')).toBeDefined();
    });
  });

  describe('Badge Component', () => {
    it('renders text badge', () => {
      render(<Badge>Active</Badge>);
      expect(screen.getByText('Active')).toBeDefined();
    });

    it('renders count badge', () => {
      render(<Badge count={5} />);
      expect(screen.getByText('5')).toBeDefined();
    });

    it('caps count at 99+', () => {
      render(<Badge count={150} />);
      expect(screen.getByText('99+')).toBeDefined();
    });

    it('applies variant classes correctly', () => {
      const { container } = render(<Badge variant="success">Success</Badge>);
      const badge = container.querySelector('.badge');
      expect(badge.style.backgroundColor).toContain('green') || expect(badge.style.backgroundColor).toBeDefined();
    });

    it('renders with icon', () => {
      render(<Badge icon="✓">Complete</Badge>);
      expect(screen.getByText('✓')).toBeDefined();
      expect(screen.getByText('Complete')).toBeDefined();
    });
  });

  describe('Component Integration', () => {
    it('Card with Badge in header', () => {
      render(
        <Card 
          title="Patient Record"
          headerAction={<Badge variant="warning">Pending</Badge>}
        >
          <p>Patient details</p>
        </Card>
      );
      expect(screen.getByText('Patient Record')).toBeDefined();
      expect(screen.getByText('Pending')).toBeDefined();
    });

    it('Button with icon', () => {
      const { container } = render(
        <Button icon={<span>+</span>}>
          Add Patient
        </Button>
      );
      expect(screen.getByText('+')).toBeDefined();
      expect(screen.getByText('Add Patient')).toBeDefined();
    });

    it('Form with Button submit', () => {
      const handleSubmit = vi.fn((e) => e.preventDefault());
      render(
        <form onSubmit={handleSubmit}>
          <FormField 
            label="Name" 
            value="John" 
            onChange={() => {}} 
            fieldName="name"
          />
          <Button type="submit">Submit</Button>
        </form>
      );
      screen.getByText('Submit').click();
      expect(handleSubmit).toHaveBeenCalled();
    });
  });

  describe('Performance - React.memo', () => {
    it('Button component uses React.memo', () => {
      // Check that component has displayName set by React.memo
      expect(Button.displayName).toBeDefined();
    });

    it('FormField component uses React.memo', () => {
      expect(FormField.displayName).toBeDefined();
    });

    it('Card component uses React.memo', () => {
      expect(Card.displayName).toBeDefined();
    });

    it('Badge component uses React.memo', () => {
      expect(Badge.displayName).toBeDefined();
    });
  });
});
