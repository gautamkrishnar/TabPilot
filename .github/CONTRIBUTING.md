# Contributing to Tab Pilot

Thank you for your interest in contributing to Tab Pilot. This guide explains how to get involved — whether you're reporting a bug, requesting a feature, or submitting a pull request.

---

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). By participating, you agree to uphold a welcoming and respectful environment for all contributors. Harassment, discrimination, and disrespectful behaviour will not be tolerated.

---

## Ways to Contribute

### Report a Bug

Use the [Bug Report](.github/ISSUE_TEMPLATE/bug_report.yml) issue template. Include steps to reproduce, expected vs. actual behaviour, browser and OS details, and any relevant logs. The more information you provide, the faster the issue can be diagnosed.

Before filing, please check existing [open issues](https://github.com/[OWNER]/TabPilot/issues) to avoid duplicates.

### Request a Feature

Use the [Feature Request](.github/ISSUE_TEMPLATE/feature_request.yml) issue template. Describe the problem you are trying to solve, not just the solution you have in mind. This helps evaluate whether the feature fits the project's direction and may reveal better approaches.

### Ask a Question

Use [GitHub Discussions](https://github.com/[OWNER]/TabPilot/discussions) for questions about usage, self-hosting, configuration, or general discussion. Issues are reserved for actionable bug reports and feature requests.

### Submit a Pull Request

All code contributions go through pull requests. See the PR process section below.

---

## Development Setup

Follow the full setup guide in [docs/DEVELOPMENT.md](../docs/DEVELOPMENT.md). The short version:

```bash
git clone https://github.com/[OWNER]/TabPilot.git
cd TabPilot
nvm use
corepack enable
yarn install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
podman compose -f compose.dev.yml up -d
yarn dev
```

---

## Branch Naming Conventions

All branches must be created from `master` and follow this naming pattern:

| Prefix | Use for |
|--------|---------|
| `feat/` | New features or enhancements |
| `fix/` | Bug fixes |
| `docs/` | Documentation changes only |
| `chore/` | Dependency updates, config changes, tooling |
| `test/` | Adding or fixing tests |
| `refactor/` | Code restructuring without behaviour changes |

**Examples:**

```
feat/session-expiry-warning
fix/socket-reconnect-race-condition
docs/update-websocket-event-table
chore/upgrade-nestjs-11
test/session-gateway-integration
```

Use lowercase and hyphens. Keep branch names short and descriptive. Reference the issue number if one exists:

```
fix/483-host-key-not-persisted
```

---

## Commit Message Format

Tab Pilot uses [Conventional Commits](https://www.conventionalcommits.org/). Every commit message must follow this format:

```
<type>(<optional scope>): <short description>

[optional body]

[optional footer(s)]
```

### Types

| Type | When to use |
|------|-------------|
| `feat` | A new feature visible to users |
| `fix` | A bug fix |
| `docs` | Documentation changes only |
| `chore` | Build process, dependency updates, CI config |
| `test` | Adding or updating tests |
| `refactor` | Code change that is not a bug fix or new feature |
| `perf` | Performance improvement |
| `ci` | Changes to GitHub Actions workflows |

### Examples

```
feat(gateway): add host_open_url WebSocket event

fix(sessions): handle expired session gracefully on join

docs(development): add WebSocket event payload shapes

chore: upgrade mongoose to 8.9.0

test(sessions): add integration tests for host key validation

refactor(participants): extract avatar URL generation to utility function
```

**Rules:**
- Use the imperative mood in the short description: "add", "fix", "update" — not "added", "fixed", "updated"
- Do not end the short description with a period
- Keep the short description under 72 characters
- Reference issues in the footer with `Closes #N` or `Fixes #N`

---

## Pull Request Process

1. **Fork** the repository and create your branch from `master` using the naming convention above.

2. **Implement** your change. Follow the code style guidelines below.

3. **Write or update tests.** All new features must include tests. Bug fixes should include a regression test where practical.

4. **Ensure everything passes locally:**
   ```bash
   yarn build    # TypeScript must compile cleanly
   yarn test     # All tests must pass
   yarn lint     # No lint errors
   ```

5. **Push your branch** to your fork and [open a pull request](https://github.com/[OWNER]/TabPilot/compare) against `master`.

6. **Fill in the PR template** completely. Incomplete PRs without a summary, test description, or checklist will be asked to update before review.

7. **Address review feedback.** Push additional commits to your branch — do not force-push once a PR is under review, as this makes it hard to follow changes.

8. **Merge.** Once approved and all checks pass, a maintainer will merge the PR. Commits are squashed on merge for a clean history.

---

## Code Style Guidelines

### TypeScript

- **Strict mode is on.** `tsconfig.json` enables `strict: true` in all workspaces. The compiler must produce zero errors.
- **No `any`.** Avoid `any` types. If you genuinely need escape hatches, use `unknown` and narrow with type guards. If `any` is truly necessary, add a comment explaining why.
- **Meaningful names.** Variable, function, and type names should communicate intent. Avoid abbreviations except for well-understood conventions (`dto`, `id`, `url`, `ws`).
- **Explicit return types.** Public functions and class methods should have explicit return type annotations.
- **Use `@tabpilot/shared` types.** Do not re-declare types that already exist in the shared package. Import from `@tabpilot/shared`.

### API (NestJS)

- Follow the existing module/controller/service/schema file structure.
- Use `class-validator` decorators for all DTO validation. Do not perform ad-hoc validation in controllers or services.
- Services are the correct place for business logic. Controllers should only handle HTTP concerns (routing, error mapping).
- WebSocket event handlers live exclusively in `session.gateway.ts`. Keep the gateway thin; delegate to services.

### Web (React)

- Prefer functional components with hooks. No class components.
- State that is shared across more than one component tree belongs in a Zustand store.
- Use Tailwind CSS utility classes for styling. Do not write raw CSS except in `src/styles/globals.css` for base styles.
- Framer Motion is the animation library of choice. Do not add other animation libraries.
- `@tanstack/react-query` is used for server-state fetching. Use `useQuery` / `useMutation` hooks, not `useEffect` + `fetch`.

### General

- Do not commit `console.log` statements to `main`. Use structured logging in the API.
- Environment variables accessed in the API must be read from `process.env` with sensible defaults. Do not hard-code configuration values.
- Keep commits atomic: one logical change per commit.

---

## Test Requirements

- **New features** must include unit tests for service-layer logic and, where practical, integration tests for the full request/WebSocket flow.
- **Bug fixes** should include a regression test that fails before the fix and passes after.
- Tests live alongside the source they test (e.g., `sessions.service.spec.ts` next to `sessions.service.ts`).
- Aim for meaningful coverage, not coverage percentage. Test the behaviour, not the implementation.

---

## Review SLA

Maintainers aim to triage new issues within **3 business days** and provide an initial review on pull requests within **5 business days**. Complex PRs that require architectural discussion may take longer. If you have not received a response after 7 days, it is perfectly fine to leave a polite comment on the issue or PR to bump it.

---

Thank you for contributing to Tab Pilot.
