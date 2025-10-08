# Repository Guidelines

## Project Structure & Module Organization
Frontend code lives in `src/`, with UI primitives in `src/components`, routed screens in `src/pages`, and shared services in `src/lib` and `src/services`. Static assets sit in `public/`, while builds emit to `dist/`. The Python backend resides in `backend/`: FastAPI APIs live under `backend/src/job_automation`, autonomous agents under `backend/application_agent`, and the CV microservice in `backend/cv_api`. Use `supabase/` for migrations and local tooling, `terraform/` for infrastructure, and `docs/` plus `deploy/` for architecture notes and runtime manifests.

## Build, Test, and Development Commands
- `npm run install:deps` wires up Node modules and backend dependencies through `uv`.
- `npm run dev` starts the Vite frontend; pair it with `npm run backend` or `npm run dev:full` when the API should run locally.
- `npm run build` compiles the production bundle, and `npm run preview` serves the result locally.
- `npm run lint`, `npm run typecheck`, and `npm run test:system` cover frontend linting, types, and Supabase smoke tests.
- Backend suites run with `cd backend && uv run pytest`; specialized agents can be inspected using `npm run backend:agent` or `npm run backend:cv`.

## Coding Style & Naming Conventions
Follow ESLint defaults with 2-space indentation, explicit TypeScript types, and Tailwind classes grouped from layout to color. Name React components and files in PascalCase, keep hooks under `src/hooks` prefixed with `use`, and publish shared utilities as camelCase modules. Python packages remain snake_case, public classes use PascalCase, and functions should be typed descriptive verbs with imports grouped standard-library → third-party → local.

## Testing Guidelines
Co-locate frontend tests with their feature or group cross-cutting specs under `src/__tests__`, naming files `*.test.ts[x]`. Backend tests live in `backend/tests`, use `test_` prefixes, and mark async flows with `pytest.mark.asyncio`. Prioritize coverage on Supabase, GitHub, and orchestration paths. Run `npm run test:quick` before commits, then `uv run pytest` and `npm run test:system` for integrated checks.

## Commit & Pull Request Guidelines
Write commit subjects in present-tense imperative voice (example: `Add Supabase resume seed script`) and expand with issue links when needed. Pull requests should summarize the change, list tests run, flag affected areas (frontend, backend, infra), and attach dashboard screenshots when UI shifts.

## Security & Configuration Tips
Keep secrets in untracked env files (`.env.local` for Vite, `backend/.env` for FastAPI`) and regenerate them after `supabase/setup-database.js` runs. Rotate Supabase keys through the dashboard, mirror changes in Terraform vars, and exclude Playwright profiles or large logs from commits.
