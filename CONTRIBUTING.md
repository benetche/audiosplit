# Contributing to AudioSplit

Thanks for considering contributing to AudioSplit. This document defines the expected flow for issues, pull requests, code style, and local setup.

## Code of Conduct

Be respectful and constructive in all interactions. Assume good intent and focus discussions on technical outcomes.

## Local Development Setup

### Requirements

- Node.js 18+ and npm
- Python 3.10+
- FFmpeg installed in your system PATH

### Setup steps

```bash
git clone <your-fork-url>
cd AudioSplit
npm install
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r engine/requirements.txt
```

Run in development:

```bash
npm run dev
```

Build:

```bash
npm run build
```

## Branch and Git Flow

We use a simple GitHub-flow style:

1. Create branch from `main`
2. Use descriptive branch names:
   - `feature/<short-description>`
   - `fix/<short-description>`
   - `docs/<short-description>`
3. Open a Pull Request to `main`
4. Request review and wait for CI/checks
5. Merge after approval

Example:

```bash
git checkout -b feature/add-model-selector
```

## Pull Request Expectations

- Keep PRs focused and small when possible.
- Include why the change is needed, not only what changed.
- Link related issue(s) using `Closes #123` when applicable.
- Add screenshots/gifs for UI changes.
- Update docs when behavior or setup changes.

Before opening a PR:

- Run app locally and verify critical flows.
- Ensure no secrets were added.
- Ensure generated artifacts and local caches are not committed.

## How to Open Issues

Use the templates in `.github/ISSUE_TEMPLATE/`.

- **Bug report:** include reproducible steps, expected behavior, and environment.
- **Feature request:** include problem statement, proposal, and alternatives considered.

Issues missing required reproduction details may be triaged as `needs-info`.

## Code Style Guidelines

### TypeScript / React

- Keep components small and focused.
- Prefer explicit and readable naming.
- Avoid large inline logic in JSX; extract helper functions when needed.
- Use project formatting conventions already present in the codebase.
- Keep state updates predictable and side effects isolated.

### Python

- Follow clear, modular function boundaries.
- Keep IO/emission logic separated from processing logic where possible.
- Prefer explicit error messages with actionable guidance.

### General

- Do not introduce unrelated refactors in feature/bug PRs.
- Preserve backward compatibility unless the PR clearly documents a breaking change.
- Add comments only where logic is non-obvious.

## Security Checklist for Contributors

Before pushing, scan for:

- API keys (`apiKey`, `API_KEY`, `token`, `secret`, `private_key`)
- Firebase service credentials (`firebase`, `serviceAccount`, `private_key_id`)
- `.env` files and any copied variants (`.env.local`, `.env.production`)
- Internal/private addresses and hostnames (`10.*`, `172.16-31.*`, `192.168.*`, `*.internal`)
- Personal data in fixtures/logs/exports

Recommended quick scan:

```bash
rg -n "(api[_-]?key|token|secret|private[_-]?key|firebase|serviceaccount|BEGIN PRIVATE KEY|192\\.168\\.|10\\.|172\\.(1[6-9]|2[0-9]|3[0-1])\\.)" .
```

If you accidentally commit a secret, rotate it immediately and remove it from git history before public release.
