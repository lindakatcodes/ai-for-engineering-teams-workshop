# CLAUDE.md

## Architecture

This is a **Next.js 15 App Router** application using React 19, TypeScript, and Tailwind CSS v4. It's an AI engineering workshop project built around **spec-driven development**.

### Key directories

- `src/app/` — App Router pages and layouts
- `src/components/` — React components (built from specs)
- `src/data/` — Mock data (no external APIs; all data is local)
- `specs/` — AI-generated component specifications (source of truth for implementations)
- `requirements/` — Raw feature requirement documents (input to spec generation)
- `templates/` — Spec template used by `/spec` command
- `exercises/` — Workshop exercise documents (8 sessions)

### Data flow

All data comes from `src/data/mock-customers.ts` and `src/data/mock-market-intelligence.ts`. There are no real API calls. Future API routes go in `src/app/api/`.

### Component patterns

- Components are implemented from specs in `specs/`. Read the relevant spec before modifying a component.
- Path alias `@/*` maps to `src/*`
- No global state management — all data is passed via typed props
- Strict TypeScript: no `any` types
- Tailwind CSS utility classes only — no CSS modules or styled-components

### Custom slash commands

Three workflow commands are defined in `.claude/commands/`:

- `/spec <ComponentName>` — Generate a spec from `templates/spec-template.md` and save to `specs/`
- `/implement <spec-file-path>` — Implement a component from its spec file
- `/verify <component-file-path>` — Validate implementation against TypeScript, ESLint, and spec acceptance criteria
