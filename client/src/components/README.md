# Kalinga AI Component Library

This directory contains reusable React components designed for the Kalinga AI Maternal Health System. All components are optimized with `React.memo` for performance and include PropTypes validation.

## Components

### FormField
**Location:** `FormField.jsx`

Reusable form input field with built-in validation support and accessibility features.

**Props:**
- `label` (string, required): Field label text
- `value` (string|number, required): Input value
- `onChange` (function, required): Change handler
- `fieldName` (string): Field identifier for error messages
- `error` (string): Error message to display
- `isValid` (boolean): Whether field is valid (shows checkmark)
- `type` (string): Input type (text, email, tel, date, number, password)
- `placeholder` (string): Placeholder text
- `required` (boolean): Whether field is required (default: true)
- `readOnly` (boolean): Whether field is read-only
- `step` (string): Step attribute for number inputs
- `onBlur` (function): Blur event handler
- `subLabel` (string): Additional descriptive text below label

**Example:**
```jsx
import { FormField } from '../components';

<FormField
  label="Email Address"
  value={email}
  onChange={setEmail}
  fieldName="email"
  type="email"
  placeholder="you@example.com"
  error={emailError}
  isValid={isValidEmail(email)}
  required
/>
```

**Accessibility:**
- Includes `aria-label`, `aria-invalid`, and `aria-describedby` attributes
- Error messages have `role="alert"`
- Visual checkmark indicator for valid fields

---

### Button
**Location:** `Button.jsx`

Flexible button component with multiple variants, sizes, and states.

**Props:**
- `children` (node): Button content
- `onClick` (function): Click handler
- `variant` (string): Button style - 'primary', 'secondary', 'danger', 'success', 'teal', 'outline'
- `size` (string): Button size - 'small', 'medium', 'large'
- `disabled` (boolean): Whether button is disabled
- `loading` (boolean): Whether button is in loading state
- `type` (string): Button type - 'button', 'submit', 'reset'
- `fullWidth` (boolean): Whether button takes full container width
- `icon` (node): Icon element to display before text
- `className` (string): Additional CSS classes
- `style` (object): Inline styles

**Example:**
```jsx
import { Button } from '../components';
import { Plus } from 'lucide-react';

<Button 
  variant="primary" 
  size="medium"
  icon={<Plus size={16} />}
  onClick={handleSubmit}
  loading={isSubmitting}
>
  Register Patient
</Button>
```

**Variants:**
- `primary`: Blue primary action button
- `secondary`: Gray secondary button with border
- `danger`: Red destructive action button
- `success`: Green positive action button
- `teal`: Teal accent button
- `outline`: Transparent with border

**Accessibility:**
- Includes `aria-busy` when loading
- Includes `aria-disabled` when disabled
- Focus-visible outline for keyboard navigation

---

### Card
**Location:** `Card.jsx`

Container component for consistent content grouping and layout.

**Props:**
- `children` (node, required): Card content
- `title` (string): Card header title
- `subtitle` (string): Card header subtitle
- `variant` (string): Card style - 'default', 'outlined', 'elevated', 'flat', 'teal', 'warning', 'danger', 'success'
- `padding` (string): Content padding - 'none', 'small', 'medium', 'large'
- `onClick` (function): Click handler (makes card interactive)
- `className` (string): Additional CSS classes
- `style` (object): Inline styles
- `headerAction` (node): Element to display in header (e.g., badge)
- `footer` (node): Footer content

**Example:**
```jsx
import { Card, Badge } from '../components';

<Card
  variant="teal"
  title="Patient Summary"
  subtitle="Maria Cruz"
  padding="medium"
  headerAction={<Badge variant="warning">Pending</Badge>}
  onClick={() => navigate(`/patient/${id}`)}
>
  <p>Risk Score: 78%</p>
  <p>Status: Awaiting Review</p>
</Card>
```

**Variants:**
- `default`: White background with subtle shadow
- `outlined`: White with thicker border
- `elevated`: White with larger shadow
- `flat`: Light gray background, no shadow
- `teal`: Teal-accented card with left border
- `warning`: Orange-accented warning card
- `danger`: Red-accented alert card
- `success`: Green-accented success card

**Accessibility:**
- Interactive cards have `role="button"` and keyboard support
- Focus-visible outline for keyboard navigation

---

### Badge
**Location:** `Badge.jsx`

Status indicator and label component with multiple styles and types.

**Props:**
- `children` (node): Badge content/text
- `variant` (string): Badge style - 'default', 'primary', 'success', 'warning', 'danger', 'teal', 'info'
- `size` (string): Badge size - 'small', 'medium', 'large'
- `icon` (node): Icon to display before text
- `count` (number): Numeric count to display (creates circular count badge)
- `dot` (boolean): Display as dot indicator instead of text badge
- `className` (string): Additional CSS classes
- `style` (object): Inline styles

**Example:**
```jsx
import { Badge } from '../components';

// Text badge
<Badge variant="success" icon="✓">Active</Badge>

// Count badge
<Badge variant="danger" count={5} />

// Dot indicator
<Badge variant="success" dot />
```

**Badge Types:**
- **Text Badge**: Default - displays text with optional icon
- **Count Badge**: When `count` prop provided - circular numeric indicator
- **Dot Badge**: When `dot` prop is true - small circular indicator

**Variants:**
- `default`: Gray neutral badge
- `primary`: Blue primary badge
- `success`: Green success badge
- `warning`: Orange warning badge
- `danger`: Red alert badge
- `teal`: Teal accent badge
- `info`: Light blue info badge

**Accessibility:**
- Includes `role="status"` for status indicators
- Includes `aria-label` for count and dot badges

---

### RiskScoreDisplay
**Location:** `RiskScoreDisplay.jsx`

Specialized component for displaying preeclampsia risk scores with circular progress visualization.

**Props:**
- `riskScore` (number, required): Risk percentage (5-95)
- `riskLevel` (string, required): 'LOW RISK', 'MODERATE RISK', or 'HIGH RISK'
- `riskFactors` (array of strings): Contributing factors to display
- `size` (string): Display size - 'small', 'medium', 'large'

**Example:**
```jsx
import { RiskScoreDisplay } from '../components';

<RiskScoreDisplay
  riskScore={78}
  riskLevel="HIGH RISK"
  riskFactors={[
    'Elevated blood pressure',
    'High BMI risk factor',
    'Family history present'
  ]}
  size="medium"
/>
```

---

## Usage

### Importing Components

```jsx
// Import individual components
import { FormField, Button, Card, Badge } from '../components';

// Or import from index
import { FormField } from '../components/FormField';
```

### Component Showcase

A demonstration page is available at `pages/ComponentShowcase.jsx` showing all components in action. This is useful for:
- Testing component behavior
- Visual regression testing
- Design review
- Documentation purposes

---

## Performance Optimization

All components use `React.memo` for performance optimization. Components will only re-render when their props change, reducing unnecessary rendering in parent components.

**When to use React.memo:**
- ✅ Components that render frequently with the same props
- ✅ Components used in lists or repeated patterns
- ✅ Components with expensive render logic
- ❌ Components that rarely render or have frequently changing props

---

## PropTypes Validation

All components include PropTypes validation for development-time prop checking. This helps catch errors early and provides better documentation.

**Benefits:**
- Type safety in development mode
- Better IDE autocomplete and hints
- Self-documenting component interfaces
- Runtime warnings for incorrect prop usage

---

## Accessibility

All components follow WCAG 2.1 Level AA accessibility guidelines:

- **Keyboard Navigation**: All interactive elements are keyboard accessible
- **Focus Indicators**: Clear focus-visible outlines for keyboard users
- **ARIA Attributes**: Proper ARIA roles and attributes for screen readers
- **Color Contrast**: Meets WCAG contrast requirements
- **Form Validation**: Error messages are announced to screen readers

---

## Styling

Components use CSS variables defined in `styles/globals.css` for consistent theming:

```css
--primary-teal: #1bb2a4
--primary-blue: #095cc5
--red-alert: #ef4444
--orange-alert: #f97316
--green-normal: #10b981
```

Components can be customized via:
1. `className` prop for CSS classes
2. `style` prop for inline styles
3. CSS variable overrides in parent context

---

## Testing

Components should be tested with:

1. **Unit Tests**: Test prop variations and edge cases
2. **Integration Tests**: Test component interactions
3. **Accessibility Tests**: Test keyboard navigation and screen reader support
4. **Visual Tests**: Snapshot testing for UI consistency

Example test structure:
```jsx
import { render, screen } from '@testing-library/react';
import { Button } from '../Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    screen.getByText('Click').click();
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('shows loading state', () => {
    render(<Button loading>Submit</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
  });
});
```

---

## Best Practices

1. **Always use PropTypes**: Include prop validation for all components
2. **Use React.memo wisely**: Only for components that benefit from memoization
3. **Provide displayName**: Always set displayName for memoized components
4. **Follow accessibility guidelines**: Include proper ARIA attributes
5. **Keep components focused**: Each component should have a single responsibility
6. **Document props thoroughly**: Use JSDoc comments for prop documentation
7. **Test thoroughly**: Include unit, integration, and accessibility tests

---

## Future Enhancements

Potential improvements to the component library:

- [ ] Add TypeScript support for better type safety
- [ ] Create Storybook documentation for visual component catalog
- [ ] Add animation props for customizable transitions
- [ ] Implement theme provider for dynamic color schemes
- [ ] Add more specialized healthcare components (vital signs, scan viewers)
- [ ] Create compound components for complex patterns (modal, dialog, drawer)
- [ ] Add internationalization (i18n) support
- [ ] Performance monitoring and optimization metrics

---

## Contributing

When adding new components:

1. Create component file in `src/components/`
2. Add PropTypes validation
3. Wrap with React.memo if appropriate
4. Add to `index.js` exports
5. Update this README with documentation
6. Add example usage to ComponentShowcase
7. Write unit tests
8. Test accessibility with screen reader

---

## Related Files

- `styles/globals.css` - Global styles and CSS variables
- `pages/ComponentShowcase.jsx` - Component demonstration page
- `__tests__/unit/` - Unit tests for components

---

## Support

For questions or issues with the component library, contact the Kalinga AI development team or create an issue in the project repository.
