Review the spec file at: $ARGUMENTS

Validate it against the template at @templates/spec-template.md and provide structured feedback.

## Validation Steps

1. **Read the spec file** at the provided path.

2. **Check for required top-level sections** (each must be present as a `###` heading):
   - `### Context`
   - `### Requirements`
   - `### Constraints`
   - `### Acceptance Criteria`

3. **For each section found**, evaluate completeness:

   **Context** — must address all three points:
   - [ ] Purpose and role in the application
   - [ ] How it fits into the larger system
   - [ ] Who will use it and when

   **Requirements** — must address all four areas:
   - [ ] Functional requirements (what it must do)
   - [ ] User interface requirements
   - [ ] Data requirements
   - [ ] Integration requirements

   **Constraints** — must address all six areas:
   - [ ] Technical stack and frameworks
   - [ ] Performance requirements
   - [ ] Design constraints
   - [ ] File structure and naming conventions
   - [ ] Props interface and TypeScript definitions
   - [ ] Security considerations

   **Acceptance Criteria** — must contain:
   - [ ] At least one checkbox item (`- [ ]`)
   - [ ] Coverage of edge cases
   - [ ] UX validation criteria
   - [ ] Integration verification

4. **Also check**:
   - The spec has a `## Feature:` heading with a real name (not `[Component/Feature Name]`)
   - Sections contain actual content, not just the template placeholder bullets verbatim

## Output Format

Return a validation report in this exact structure:

```
## Spec Review: <filename>

### Overall Status: PASS | FAIL | NEEDS WORK

### Section Checklist
| Section              | Present | Complete |
|----------------------|---------|----------|
| Feature heading      | ✅/❌   | ✅/❌    |
| Context              | ✅/❌   | ✅/❌    |
| Requirements         | ✅/❌   | ✅/❌    |
| Constraints          | ✅/❌   | ✅/❌    |
| Acceptance Criteria  | ✅/❌   | ✅/❌    |

### Issues Found
(List each missing or incomplete item as an actionable bullet)

### Recommendations
(Specific suggestions to improve the spec)

### Summary
(1-2 sentence overall assessment)
```

- **PASS**: all sections present and complete
- **NEEDS WORK**: all sections present but one or more are incomplete
- **FAIL**: one or more required sections are missing entirely
