# Spec: CustomerCard

## Feature: CustomerCard Component

### Context
- Displays individual customer information within the Customer Intelligence Dashboard
- Used as a child component inside the `CustomerSelector` container component
- Gives users at-a-glance identification of a customer: name, company, and domain health status
- Serves as the foundation for domain health monitoring by surfacing customer domains

### Requirements
- **Display:** Render `name`, `company`, and `healthScore` from the `Customer` interface
- **Health indicator:** Color-coded badge/dot using health score ranges:
  - Red for scores 0–30 (poor)
  - Yellow for scores 31–70 (moderate)
  - Green for scores 71–100 (good)
- **Domains:** List customer `domains` when present; show a count badge when there are multiple domains
- **Responsive:** Adapts layout for mobile and desktop breakpoints
- **Visual design:** Card-based layout with clear visual hierarchy

### Constraints
- **Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS
- **Data source:** `src/data/mock-customers.ts` — uses the `Customer` interface exported from that file
- **Props interface:**
  ```ts
  interface CustomerCardProps {
    customer: Customer;
    onClick?: (customer: Customer) => void;
  }
  ```
- **File location:** `src/components/CustomerCard.tsx`
- **No external UI libraries** — use Tailwind utility classes only
- **Performance:** Must render without layout shift; no async data fetching inside the component

### Acceptance Criteria
- [ ] Displays customer name and company name
- [ ] Health score badge renders in red (0–30), yellow (31–70), or green (71–100)
- [ ] Domains list renders when `domains` is present and non-empty
- [ ] Shows domain count badge when customer has more than one domain
- [ ] Renders without errors when `domains` is undefined or empty
- [ ] Responsive layout works at 375 px (mobile) and 1280 px (desktop)
- [ ] `onClick` prop fires with the `Customer` object when the card is clicked
- [ ] Component is strongly typed — no `any` types
