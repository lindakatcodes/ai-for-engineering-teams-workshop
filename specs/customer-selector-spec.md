# Spec: CustomerSelector

## Feature: CustomerSelector Component

### Context
- Main customer selection interface for the Customer Intelligence Dashboard
- Acts as a container component that renders a list of `CustomerCard` components
- Used by dashboard users to quickly find and select a customer for deeper analysis
- Must handle large customer lists (100+) efficiently without performance degradation

### Requirements
- **Display:** Render a scrollable list of `CustomerCard` components, one per customer
- **Search/filter:** Text input to filter customers by name or company in real time
- **Selection state:** Highlight the currently selected customer card visually
- **Persist selection:** Maintain selected customer state across interactions on the same page
- **Empty state:** Show a message when no customers match the current search query
- **Loading state:** Handle the case where customer data is being fetched

### Constraints
- **Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS
- **Data source:** `src/data/mock-customers.ts` — uses the `Customer` interface from that file
- **Child component:** Composes `CustomerCard` (`src/components/CustomerCard.tsx`) for each list item
- **Props interface:**
  ```ts
  interface CustomerSelectorProps {
    customers: Customer[];
    selectedCustomerId?: string;
    onSelectCustomer: (customer: Customer) => void;
  }
  ```
- **File location:** `src/components/CustomerSelector.tsx`
- **No external UI libraries** — Tailwind utility classes only
- **Performance:** Filter logic must be synchronous and non-blocking; list must render without layout shift
- **Responsive:** Works at 375 px (mobile) and 1280 px (desktop)

### Acceptance Criteria
- [ ] Renders a `CustomerCard` for every customer in the `customers` prop
- [ ] Search input filters the list by customer name or company (case-insensitive)
- [ ] Filtered list updates in real time as the user types
- [ ] Selected customer card is visually distinguished (e.g., highlighted border or background)
- [ ] Clicking a card calls `onSelectCustomer` with the corresponding `Customer` object
- [ ] Selection persists when the search query is cleared
- [ ] Displays an empty-state message when no customers match the search query
- [ ] Handles an empty `customers` array without errors
- [ ] Component is strongly typed — no `any` types
- [ ] Responsive layout works at 375 px (mobile) and 1280 px (desktop)
