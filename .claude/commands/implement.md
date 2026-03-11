Implement a component from its spec: $ARGUMENTS

The argument is a spec file path (e.g., `specs/customer-card-spec.md` or `@specs/customer-card-spec.md`).

## Steps

1. **Read the spec file** at the provided path (strip leading `@` if present).

2. **Parse the spec**:
   - Extract the component name from the `## Feature:` heading.
   - Derive the PascalCase component name (e.g., `CustomerCard`).
   - Extract all Acceptance Criteria checkboxes — these are the pass/fail targets.
   - Note the Props interface from Constraints.
   - Note all Requirements and Constraints.

3. **Explore the codebase for context**:
   - Read `src/data/mock-customers.ts` to understand available data shapes.
   - Check `src/components/` for existing components to follow patterns.
   - Check `src/app/page.tsx` for how components are currently used.
   - Review any related components mentioned in the spec.

4. **Generate the component** at `src/components/[ComponentName].tsx`:
   - Use Next.js 15, React 19, TypeScript, Tailwind CSS.
   - Export a named default export matching the component name.
   - Define a `[ComponentName]Props` TypeScript interface.
   - Implement all functional requirements from the spec.
   - Apply responsive design using Tailwind breakpoint classes.
   - Follow patterns from existing components in the codebase.

5. **Verify against Acceptance Criteria**:
   - Go through each `- [ ]` criterion from the spec.
   - Check whether the generated code satisfies it.
   - For each criterion, mark as PASS or FAIL with a brief reason.

6. **Iterate if needed**:
   - If any criterion is FAIL, revise the component to address it.
   - Re-check the criterion after revision.
   - Repeat until all criteria pass or until a criterion is genuinely untestable statically (flag it).

7. **Output a verification summary**:
   ```
   ## Implementation: [ComponentName]

   ### File: src/components/[ComponentName].tsx

   ### Acceptance Criteria Verification
   | Criterion | Status | Notes |
   |-----------|--------|-------|
   | ...       | PASS   | ...   |

   ### Overall: PASS | PARTIAL | FAIL
   ```

8. **If PARTIAL or FAIL**, list the remaining issues and ask the user if they want to continue refining.
