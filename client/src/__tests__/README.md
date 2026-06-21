# Testing Infrastructure

This directory contains all tests for the Kalinga AI Maternal Health System client application.

## Directory Structure

```
__tests__/
├── unit/               # Unit tests for individual functions/components
├── properties/         # Property-based tests using fast-check
├── integration/        # Integration tests for multiple modules
├── e2e/               # End-to-end tests using Playwright
├── testUtils.js       # Shared test utilities and helpers
└── README.md          # This file
```

## Testing Strategy

### Unit Tests (`unit/`)

Unit tests verify individual functions and components in isolation. They test specific examples, edge cases, and boundary conditions.

**Example**: `bmiCalculator.test.js` tests the BMI calculation function with concrete input values.

**When to use**:
- Testing pure functions with predictable outputs
- Testing specific edge cases and error conditions
- Testing component rendering and behavior

### Property-Based Tests (`properties/`)

Property-based tests verify universal properties that should hold true for ALL inputs within a valid domain. Uses `fast-check` to generate hundreds or thousands of random test cases.

**Example**: `bmi.property.test.js` verifies the BMI formula holds for ALL valid weight/height combinations.

**When to use**:
- Testing mathematical formulas and calculations
- Testing data serialization/deserialization
- Testing invariants and business rules
- Finding edge cases you didn't think of

### Integration Tests (`integration/`)

Integration tests verify how multiple modules work together. They test interactions between services, storage, and data flow.

**Example**: `offlineQueue.test.js` tests how the queue service interacts with localStorage.

**When to use**:
- Testing API integrations
- Testing data persistence flows
- Testing service interactions
- Testing state management

### End-to-End Tests (`e2e/`)

E2E tests verify complete user workflows in a real browser environment using Playwright. They test the application from the user's perspective.

**Example**: `patientRegistration.spec.js` tests the entire registration workflow from form input to data persistence.

**When to use**:
- Testing critical user journeys
- Testing multi-page workflows
- Testing cross-browser compatibility
- Testing mobile responsiveness

## Test Utilities

The `testUtils.js` file provides shared utilities:

- **Mock Data Generators**: `createMockPatient()`, `createMockScan()`, etc.
- **localStorage Helpers**: `setupLocalStorageMock()`, `setLocalStorageData()`, etc.
- **API Mocking**: `setupFetchMock()`, `mockApiSuccess()`, `mockApiError()`
- **Async Helpers**: `wait()`, `waitFor()`
- **Validation Helpers**: `generateValidPhilHealthId()`, `calculateExpectedRiskScore()`
- **Cleanup**: `cleanupTests()` to reset all mocks

## Running Tests

### All Tests
```bash
npm test              # Run all Vitest tests once
npm run test:watch    # Run tests in watch mode
npm run test:ui       # Open Vitest UI
npm run test:all      # Run Vitest + Playwright tests
```

### Specific Test Types
```bash
npm run test:unit         # Run only unit tests
npm run test:properties   # Run only property-based tests
npm run test:integration  # Run only integration tests
npm run test:e2e         # Run E2E tests with Playwright
npm run test:e2e:ui      # Open Playwright UI
npm run test:e2e:debug   # Debug E2E tests
```

### Coverage
```bash
npm run test:coverage    # Run tests with coverage report
```

Coverage reports are generated in:
- `coverage/` - HTML coverage report
- Terminal output showing coverage percentages

**Coverage Targets**: 90% for business logic (utils/, services/)

## Writing Tests

### Unit Test Template

```javascript
import { describe, it, expect } from 'vitest';
import { myFunction } from '../../utils/myModule.js';

describe('MyFunction', () => {
  it('should do something specific', () => {
    const result = myFunction(input);
    expect(result).toBe(expectedOutput);
  });
});
```

### Property Test Template

```javascript
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

describe('Property: Universal Rule', () => {
  it('should hold for all valid inputs', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        (input) => {
          const result = myFunction(input);
          expect(result).toSatisfySomeCondition();
        }
      ),
      { numRuns: 1000 }
    );
  });
});
```

### Integration Test Template

```javascript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupLocalStorageMock, cleanupTests } from '../testUtils.js';

describe('Module Integration', () => {
  beforeEach(() => {
    setupLocalStorageMock();
  });

  afterEach(() => {
    cleanupTests();
  });

  it('should integrate modules correctly', () => {
    // Test interaction between modules
  });
});
```

### E2E Test Template

```javascript
import { test, expect } from '@playwright/test';

test.describe('User Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should complete workflow', async ({ page }) => {
    await page.getByLabel('Field').fill('Value');
    await page.getByRole('button', { name: 'Submit' }).click();
    await expect(page).toHaveURL(/success/);
  });
});
```

## Best Practices

### General
1. **Test behavior, not implementation** - Focus on what the code does, not how
2. **Use descriptive test names** - Tests should read like documentation
3. **Keep tests independent** - Each test should run in isolation
4. **Clean up after tests** - Use `beforeEach`/`afterEach` for setup/teardown
5. **Use test utilities** - Don't duplicate mock setup code

### Unit Tests
1. Test one thing per test
2. Use concrete examples that are easy to verify
3. Test both success and error cases
4. Test boundary conditions

### Property Tests
1. Use appropriate generators for your domain
2. Set reasonable `numRuns` (100-1000 typically)
3. Include shrinking for better failure messages
4. Document what property you're testing

### Integration Tests
1. Mock external dependencies (APIs, hardware)
2. Test realistic data flows
3. Verify state changes
4. Test error propagation

### E2E Tests
1. Focus on critical user paths
2. Test mobile and desktop viewports
3. Use accessible selectors (labels, roles)
4. Keep tests stable (avoid timing dependencies)
5. Clean up test data

## Continuous Integration

Tests run automatically in CI/CD:
- All Vitest tests must pass
- Coverage must meet 90% threshold for business logic
- E2E tests must pass on Chrome, Firefox, Safari
- Mobile tests must pass on Pixel 5 and iPhone 12

## Debugging Tests

### Vitest
```bash
# Run tests in watch mode
npm run test:watch

# Run specific test file
npx vitest run path/to/test.js

# Debug in VS Code
# Set breakpoint, then run "Debug Test" from Vitest extension
```

### Playwright
```bash
# Debug with UI
npm run test:e2e:debug

# Run specific test
npx playwright test path/to/test.spec.js

# View trace
npx playwright show-trace trace.zip
```

## Troubleshooting

### "Cannot find module" errors
- Check import paths are correct (relative paths with file extensions)
- Ensure `vitest.config.js` has correct path mappings

### localStorage errors
- Ensure `setupLocalStorageMock()` is called in `beforeEach`
- Call `cleanupTests()` in `afterEach`

### E2E test timeouts
- Increase timeout in `playwright.config.js`
- Check if dev server is running
- Verify network conditions

### Coverage not meeting threshold
- Check `vitest.config.js` coverage configuration
- Ensure test files are properly excluding UI components
- Add tests for uncovered business logic

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [fast-check Documentation](https://fast-check.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library Best Practices](https://testing-library.com/docs/guiding-principles/)
