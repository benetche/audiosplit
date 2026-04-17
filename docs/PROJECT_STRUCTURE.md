# Project Structure Guide

This document describes a contributor-friendly folder organization for AudioSplit as it grows.

## Current Core Directories

- `electron/` - Electron main process, preload bridge, IPC wiring
- `src/` - React renderer app (UI, state, view logic)
- `engine/` - Python sidecar separation engine and model integration
- `scripts/` - build tooling scripts
- `output/` - generated stem files (runtime artifacts, not source)

## Recommended Growth Structure

As new contributors join, prefer this split:

- `src/components/` - reusable React components
- `src/pages/` - page-level screens
- `src/store/` - Zustand store slices and actions
- `src/lib/` - pure utilities and helpers
- `src/types/` - shared TypeScript types
- `engine/core/` - separation orchestration logic
- `engine/adapters/` - model/provider integrations
- `engine/tests/` - Python-side tests
- `tests/` - integration/e2e tests
- `docs/` - architecture, decisions, troubleshooting, contribution docs
- `.github/` - issue/PR templates and CI workflows

## Naming Conventions

- Files and symbols should use descriptive names over abbreviations.
- Prefer `kebab-case` for file names in docs/config.
- Keep React component names in `PascalCase`.
- Keep utility modules concise and single-purpose.

## Dependency Boundaries

- UI (`src/`) must not import Python internals directly.
- Electron (`electron/`) is the boundary between renderer and engine.
- Engine (`engine/`) should expose machine-readable events/messages and avoid UI-specific assumptions.
