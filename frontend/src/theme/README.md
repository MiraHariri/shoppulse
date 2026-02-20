# ShopPulse Analytics Design System

This directory contains the design system configuration for ShopPulse Analytics, implementing the design specifications from Requirements 9.1.

## Overview

The design system provides a consistent, modern, and trendy visual language across the application with:

- **Primary Color**: Deep Purple (#6366F1) for brand identity
- **Secondary Color**: Teal (#14B8A6) for accents and CTAs
- **Typography**: Poppins for headings, Inter for body text
- **Spacing**: Consistent 4px-based spacing scale
- **Breakpoints**: Mobile-first responsive design

## Usage

### In CSS

Use CSS custom properties (CSS variables) directly in your stylesheets:

```css
.my-component {
  color: var(--color-primary);
  background-color: var(--color-bg-primary);
  padding: var(--spacing-4);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  transition: all var(--transition-base);
}

.my-heading {
  font-family: var(--font-primary);
  font-size: var(--font-size-3xl);
  font-weight: var(--font-weight-bold);
}
```

### In TypeScript/React

Import and use the theme tokens in your components:

```typescript
import { theme, useTheme } from '../theme';

// Direct import
const MyComponent = () => {
  return (
    <div style={{ 
      color: theme.colors.primary[600],
      padding: theme.spacing[4]
    }}>
      Content
    </div>
  );
};

// Using the hook
const MyThemedComponent = () => {
  const { colors, spacing } = useTheme();
  
  return (
    <div style={{ 
      color: colors.primary[600],
      padding: spacing[4]
    }}>
      Content
    </div>
  );
};
```

## Design Tokens

### Colors

#### Primary (Deep Purple)
- `--color-primary-600` (#6366F1) - Main primary color
- Shades from 50 (lightest) to 900 (darkest)

#### Secondary (Teal)
- `--color-secondary-500` (#14B8A6) - Main secondary color
- Shades from 50 (lightest) to 900 (darkest)

#### Background
- `--color-bg-primary` (#FFFFFF) - White
- `--color-bg-secondary` (#F9FAFB) - Light gray
- `--color-bg-tertiary` (#F3F4F6) - Medium gray

#### Text
- `--color-text-primary` (#1F2937) - Dark gray
- `--color-text-secondary` (#6B7280) - Medium gray
- `--color-text-tertiary` (#9CA3AF) - Light gray
- `--color-text-inverse` (#FFFFFF) - White

#### Status
- Success: Green (#10B981)
- Error: Red (#EF4444)
- Warning: Orange (#F59E0B)
- Info: Blue (#3B82F6)

### Typography

#### Font Families
- `--font-primary`: Poppins (for headings)
- `--font-secondary`: Inter (for body text)
- `--font-mono`: JetBrains Mono (for code)

#### Font Sizes
- `--font-size-xs`: 0.75rem (12px)
- `--font-size-sm`: 0.875rem (14px)
- `--font-size-base`: 1rem (16px)
- `--font-size-lg`: 1.125rem (18px)
- `--font-size-xl`: 1.25rem (20px)
- `--font-size-2xl`: 1.5rem (24px)
- `--font-size-3xl`: 1.875rem (30px)
- `--font-size-4xl`: 2.25rem (36px)
- `--font-size-5xl`: 3rem (48px)

#### Font Weights
- `--font-weight-light`: 300
- `--font-weight-regular`: 400
- `--font-weight-medium`: 500
- `--font-weight-semibold`: 600
- `--font-weight-bold`: 700

### Spacing

Based on a 4px scale:
- `--spacing-1`: 0.25rem (4px)
- `--spacing-2`: 0.5rem (8px)
- `--spacing-3`: 0.75rem (12px)
- `--spacing-4`: 1rem (16px)
- `--spacing-5`: 1.25rem (20px)
- `--spacing-6`: 1.5rem (24px)
- `--spacing-8`: 2rem (32px)
- `--spacing-10`: 2.5rem (40px)
- `--spacing-12`: 3rem (48px)
- `--spacing-16`: 4rem (64px)
- `--spacing-20`: 5rem (80px)
- `--spacing-24`: 6rem (96px)

### Breakpoints

Mobile-first responsive design:
- `xs`: 320px
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

Example media query:
```css
@media (min-width: 768px) {
  /* Styles for md and up */
}
```

### Border Radius
- `--radius-sm`: 0.125rem (2px)
- `--radius-base`: 0.25rem (4px)
- `--radius-md`: 0.375rem (6px)
- `--radius-lg`: 0.5rem (8px)
- `--radius-xl`: 0.75rem (12px)
- `--radius-2xl`: 1rem (16px)
- `--radius-full`: 9999px (fully rounded)

### Shadows
- `--shadow-sm`: Subtle shadow
- `--shadow-base`: Default shadow
- `--shadow-md`: Medium shadow
- `--shadow-lg`: Large shadow
- `--shadow-xl`: Extra large shadow
- `--shadow-2xl`: Maximum shadow
- `--shadow-inner`: Inner shadow

### Transitions
- `--transition-fast`: 150ms
- `--transition-base`: 200ms
- `--transition-slow`: 300ms

All use `cubic-bezier(0.4, 0, 0.2, 1)` easing.

## Utility Classes

The design system includes utility classes for common patterns:

```css
.text-primary       /* Primary text color */
.text-secondary     /* Secondary text color */
.text-tertiary      /* Tertiary text color */
.bg-primary         /* Primary background */
.bg-secondary       /* Secondary background */
.shadow-card        /* Card shadow */
.transition-base    /* Base transition */
```

## Best Practices

1. **Use CSS Variables**: Prefer CSS custom properties over hardcoded values
2. **Consistent Spacing**: Use the spacing scale for margins, padding, and gaps
3. **Typography Hierarchy**: Use Poppins for headings, Inter for body text
4. **Color Contrast**: Ensure sufficient contrast for accessibility (WCAG AA)
5. **Responsive Design**: Use breakpoints for mobile-first responsive layouts
6. **Smooth Transitions**: Apply transitions to interactive elements (200-300ms)
7. **Generous Whitespace**: Use adequate spacing for breathing room

## Files

- `design-tokens.ts` - TypeScript design token definitions
- `ThemeProvider.tsx` - React context provider for theme access
- `index.ts` - Main export file
- `README.md` - This documentation

## Related Requirements

This design system implements Requirements 9.1 from the ShopPulse Analytics specification.
