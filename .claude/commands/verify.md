Verify a component implementation: $ARGUMENTS

The argument is a component file path (e.g., `components/CustomerCard.tsx` or `src/components/CustomerCard.tsx`).

## Steps

1. **Resolve the file path** — normalize to `src/components/[ComponentName].tsx` if needed.
   - Extract the component name (PascalCase filename without extension).

2. **Read the component file**.

3. **Find the corresponding spec** (if it exists):
   - Derive kebab-case name and look for `specs/[kebab-case]-spec.md`.
   - If found, read it and extract all Acceptance Criteria checkboxes.
   - If not found, proceed with general checks only.

4. **TypeScript type checks**:
   - Verify a `[ComponentName]Props` interface (or type) is exported or defined.
   - Check all props are typed (no `any` unless intentional).
   - Check all function parameters and return types are present.
   - Verify imports are typed correctly.
   - Run: `cd /workspaces/ai-for-engineering-teams-workshop && npx tsc --noEmit 2>&1 | grep -A2 "[ComponentName]"` to catch compiler errors.

5. **Mock data rendering check**:
   - Read `src/data/mock-customers.ts`.
   - Verify the component's props interface is compatible with the mock data shape.
   - Check that required props match fields available in the mock data.
   - Identify any props that would be undefined with mock data.

6. **Responsive design check** — inspect the component's JSX for:
   - Mobile-first base styles.
   - At least one responsive breakpoint (`sm:`, `md:`, `lg:`, or `xl:` Tailwind prefix).
   - No fixed pixel widths that would break on small screens (flag `w-[Npx]` wider than 320px).
   - Flex/grid layouts that adapt to screen size.

7. **Spec acceptance criteria check** (if spec was found):
   - For each criterion, evaluate whether the implementation satisfies it based on static analysis.
   - Mark each as PASS, FAIL, or MANUAL (requires runtime verification).

8. **Output a pass/fail summary**:

   ```
   ## Verification: [ComponentName]

   ### TypeScript Types
   | Check | Status | Detail |
   |-------|--------|--------|
   | Props interface defined     | PASS/FAIL | ... |
   | No untyped props            | PASS/FAIL | ... |
   | TSC compiler: no errors     | PASS/FAIL | ... |

   ### Mock Data Compatibility
   | Check | Status | Detail |
   |-------|--------|--------|
   | Props match mock data shape | PASS/FAIL | ... |
   | No missing required props   | PASS/FAIL | ... |

   ### Responsive Design
   | Breakpoint | Status | Detail |
   |------------|--------|--------|
   | Mobile base styles | PASS/FAIL | ... |
   | Tablet (md:)       | PASS/FAIL | ... |
   | Desktop (lg:)      | PASS/FAIL | ... |

   ### Acceptance Criteria (from spec)
   | Criterion | Status | Notes |
   |-----------|--------|-------|
   | ...       | PASS/FAIL/MANUAL | ... |

   ### Overall: PASS | NEEDS ATTENTION | FAIL

   ### Issues
   (Bulleted list of all FAIL items with specific fixes)
   ```

9. If there are FAIL items, suggest specific code fixes for each one.
