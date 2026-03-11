# Feature: Button Component

## Context
- Reusable button component for the Customer Intelligence Dashboard
- Used throughout the dashboard for primary actions (form submissions, confirmations, navigation triggers)
- Part of the design system to ensure consistent interaction patterns across all views
- Consumed by business analysts and internal users interacting with dashboard controls

## Requirements

### Functional Requirements
- Accept `label`, `onClick`, and `variant` props
- Support three variants: `primary`, `secondary`, `danger`
- Include a loading state that displays a spinner and disables interaction
- Keyboard accessible and screen-reader friendly with proper ARIA attributes
- Disabled state support (visually and functionally)

### User Interface Requirements
- Variant styles:
  - `primary`: solid fill, main brand color (e.g. blue), white text
  - `secondary`: outlined or muted style, secondary color
  - `danger`: red fill or red-outlined, used for destructive actions
- Loading state: replaces label with an inline spinner; button remains disabled
- Hover and focus states clearly visible for keyboard navigation
- Maximum width: 200px

### Data Requirements
- No external data dependencies; fully controlled via props
- `loading` prop triggers spinner display and disables click handler
- `disabled` prop prevents interaction independent of loading state

### Integration Requirements
- Standalone, composable component — no coupling to specific dashboard sections
- Props-based API; parent manages state
- Properly typed TypeScript interface exported from component file

## Constraints

### Technical Stack
- React 19
- TypeScript with strict mode
- Tailwind CSS for styling

### Performance Requirements
- Lightweight — no external icon libraries required (inline SVG spinner acceptable)
- No unnecessary re-renders; pure/memoized if wrapped in larger forms

### Design Constraints
- Maximum width: 200px
- Consistent padding and typography using Tailwind spacing/text scale
- Spinner must be visually centered within the button during loading state
- Do not change button dimensions when switching to loading state (prevent layout shift)

### File Structure and Naming
- Component file: `components/Button.tsx`
- Props interface: `ButtonProps` exported from component file
- Follow project naming conventions (PascalCase for components)

### Accessibility Requirements
- `aria-disabled` set when disabled or loading
- `aria-busy` set when loading
- `aria-label` prop accepted to override visible label for screen readers
- Focus ring visible for keyboard users

### Security Considerations
- `label` rendered as text content, not HTML — no XSS risk
- `onClick` handler only invoked when not disabled or loading

## Acceptance Criteria

- [ ] Renders correctly for all three variants: `primary`, `secondary`, `danger`
- [ ] `loading` prop shows spinner, hides label, and prevents `onClick` from firing
- [ ] `disabled` prop prevents click and applies disabled visual style
- [ ] Maximum width does not exceed 200px
- [ ] Button dimensions remain stable when switching between normal and loading states
- [ ] `aria-busy` is `true` when loading; `aria-disabled` is `true` when disabled or loading
- [ ] `aria-label` prop overrides visible label for screen readers when provided
- [ ] Focus ring is visible when navigating by keyboard
- [ ] `ButtonProps` TypeScript interface is exported from `components/Button.tsx`
- [ ] Passes TypeScript strict mode checks
- [ ] No console errors or warnings
- [ ] Follows project code style and Tailwind CSS conventions
