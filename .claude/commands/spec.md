Generate a spec for the component: $ARGUMENTS

## Steps

1. **Resolve the component name** from the argument (e.g., `CustomerCard`).
   - Derive the kebab-case filename: `customer-card`
   - Requirements file path: `requirements/[kebab-case].md`
   - Output spec path: `specs/[kebab-case]-spec.md`

2. **Read the spec template** at `@templates/spec-template.md`.

3. **Check for a requirements file** at `requirements/[kebab-case].md`.
   - If it exists, read it and use its content to inform every section of the spec.
   - If it does not exist, proceed using knowledge of the component name and the existing codebase.

4. **Explore the codebase for context**:
   - Check `src/components/[ComponentName].tsx` if it exists.
   - Check `src/data/mock-customers.ts` for data shape.
   - Review related specs in `specs/` for style and patterns.

5. **Generate the spec** following the template structure exactly:

   ```
   ## Feature: [ComponentName]

   ### Context
   - Purpose and role in the application
   - How it fits into the larger system
   - Who will use it and when

   ### Requirements
   - Functional requirements (what it must do)
   - User interface requirements
   - Data requirements
   - Integration requirements

   ### Constraints
   - Technical stack: Next.js 15, React 19, TypeScript, Tailwind CSS
   - Performance requirements
   - Design constraints (responsive breakpoints, component size limits)
   - File structure: `src/components/[ComponentName].tsx`
   - Props interface and TypeScript definitions
   - Security considerations

   ### Acceptance Criteria
   - [ ] (testable success criteria)
   - [ ] (edge cases handled)
   - [ ] (user experience validated)
   - [ ] (integration points verified)
   ```

   - All sections must have substantive content — no template placeholders left in.
   - Acceptance criteria must be specific and testable checkboxes.
   - Include TypeScript prop interface definition in Constraints.

6. **Save the spec** to `specs/[kebab-case]-spec.md`.

7. **Confirm** by printing the output path and a one-line summary of what was generated.
