# Maintainer Guide

Everything you need to know to maintain and release `ecb-exchange-rates-ts`.

## Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Daily Workflow](#daily-workflow)
- [Releasing a New Version](#releasing-a-new-version)
- [CI/CD Pipeline](#cicd-pipeline)
- [Trusted Publishing](#trusted-publishing)
- [Codecov](#codecov)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)

---

## Development Setup

**Prerequisites:** Node.js >= 18, pnpm, GitHub CLI (`gh`)

```bash
git clone https://github.com/Ntelikatos/ecb-exchange-rates.git
cd ecb-exchange-rates
pnpm install
```

### Available Scripts

| Command | What it does |
|---|---|
| `pnpm build` | Build ESM + CJS + type declarations with tsup |
| `pnpm test` | Run all tests with Vitest |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:coverage` | Run tests with V8 coverage report |
| `pnpm typecheck` | TypeScript type checking (no emit) |
| `pnpm lint` | Lint + format check with Biome |
| `pnpm lint:fix` | Auto-fix lint and format issues |
| `pnpm format` | Format all files with Biome |
| `pnpm release` | Release a new version (see below) |

---

## Project Structure

```
ecb-exchange-rates/
├── src/
│   ├── index.ts                  # Public API exports
│   ├── client.ts                 # EcbClient class (main facade)
│   ├── client.test.ts            # Client tests
│   ├── types/index.ts            # All TypeScript types
│   ├── errors/index.ts           # Error class hierarchy
│   ├── services/http-fetcher.ts  # HTTP abstraction (HttpFetcher interface)
│   ├── parsers/
│   │   ├── sdmx-json-parser.ts       # SDMX-JSON response parser
│   │   └── sdmx-json-parser.test.ts  # Parser tests
│   ├── utils/
│   │   ├── url-builder.ts        # ECB API URL construction
│   │   ├── url-builder.test.ts   # URL builder tests
│   │   ├── validation.ts         # Input validation
│   │   └── validation.test.ts    # Validation tests
│   └── __tests__/fixtures.ts     # Shared test fixtures & MockFetcher
├── dist/                         # Built output (git-ignored)
├── docs/                         # Maintainer docs (not published to npm)
├── scripts/release.sh            # Release automation script
├── .github/workflows/
│   ├── ci.yml                    # CI: test + lint + build on push/PR
│   └── publish.yml               # Publish to npm on GitHub release
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts
└── biome.json
```

### What gets published to npm

Only the files listed in `package.json` `"files"`:
- `dist/` (ESM, CJS, type declarations)
- `README.md`
- `LICENSE`

Everything else (source, tests, docs, configs) stays out of the bundle.

---

## Daily Workflow

### Making changes

1. Create a branch: `git checkout -b feat/my-change`
2. Make your changes
3. Run checks locally: `pnpm typecheck && pnpm lint && pnpm test`
4. Push and open a PR against `main`
5. CI runs automatically on the PR
6. Merge when green

### Running the full check suite

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

This is exactly what CI runs and what the release script runs before publishing.

---

## Releasing a New Version

### One-command release

```bash
pnpm release patch   # 0.1.2 → 0.1.3  (bug fixes)
pnpm release minor   # 0.1.2 → 0.2.0  (new features)
pnpm release major   # 0.1.2 → 1.0.0  (breaking changes)
```

### What the release script does

1. Checks you're on `main` with a clean working directory
2. Pulls latest from remote
3. Runs typecheck, lint, test, and build
4. Bumps the version in `package.json`
5. Commits: `release: v0.x.x`
6. Creates a git tag
7. Pushes commit + tag to GitHub
8. Creates a GitHub release with auto-generated notes
9. The GitHub release triggers the publish workflow → npm

### Version number guide

- **patch** (`0.1.2 → 0.1.3`): Bug fixes, docs updates, internal refactors
- **minor** (`0.1.2 → 0.2.0`): New features that don't break existing API
- **major** (`0.1.2 → 1.0.0`): Breaking changes to the public API

### Manual release (if needed)

If the script fails or you need more control:

```bash
# 1. Bump version
npm version patch --no-git-tag-version

# 2. Commit and tag
git add package.json
git commit -m "release: v0.1.3"
git tag v0.1.3

# 3. Push
git push origin main --tags

# 4. Create release on GitHub (triggers npm publish)
gh release create v0.1.3 --title "v0.1.3" --generate-notes
```

---

## CI/CD Pipeline

### CI Workflow (`.github/workflows/ci.yml`)

**Triggers:** Push to `main`, pull requests to `main`

**Matrix:** Node.js 18, 20, 22

**Steps:** install → typecheck → lint → test with coverage → build

Coverage is uploaded to Codecov on the Node 22 run.

### Publish Workflow (`.github/workflows/publish.yml`)

**Triggers:** GitHub release published

**Steps:** install → test → build → `npm publish --provenance`

Uses **OIDC trusted publishing** — no npm token needed. The `id-token: write` permission allows GitHub to authenticate directly with npm.

---

## Trusted Publishing

The package uses npm trusted publishing (OIDC) instead of access tokens.

**How it works:** GitHub Actions proves its identity to npm via a short-lived OIDC token. npm verifies the request came from the correct repo and workflow, then allows the publish. No secrets to leak.

**Configuration on npmjs.com:**
- Package → Settings → Trusted Publishers
- Owner: `Ntelikatos`
- Repository: `ecb-exchange-rates`
- Workflow: `publish.yml`
- Publishing access: "Require two-factor authentication and disallow tokens"

**If you need to change the workflow filename** or repo, update it on npmjs.com too.

---

## Codecov

Coverage reports are uploaded to [Codecov](https://codecov.io/gh/Ntelikatos/ecb-exchange-rates) on every push to `main`.

**Setup:**
- The `CODECOV_TOKEN` secret must exist in GitHub repo secrets
- Get the token from the Codecov dashboard after adding the repo

**Running coverage locally:**

```bash
pnpm test:coverage
# Opens coverage/index.html in your browser for a detailed report
```

---

## Common Tasks

### Adding a new public method

1. Add the method to `src/client.ts`
2. Export any new types from `src/types/index.ts`
3. Re-export from `src/index.ts` if needed
4. Add tests in `src/client.test.ts`
5. Update `README.md` API table

### Adding a new error type

1. Create the class in `src/errors/index.ts` extending `EcbError`
2. Export from `src/index.ts`
3. Document in `README.md` error handling section

### Updating dependencies

```bash
pnpm update --latest      # Update all to latest
pnpm typecheck && pnpm lint && pnpm test  # Verify nothing broke
```

### Checking what gets published

```bash
npm pack --dry-run
```

This shows exactly which files and their sizes will be in the npm tarball.

---

## Troubleshooting

### `npm publish` fails with 403

- Verify trusted publisher config on npmjs.com matches the repo/workflow
- Ensure `package.json` `repository.url` matches the GitHub repo exactly
- Check that `id-token: write` permission is set in the workflow

### Tests fail in CI but pass locally

- Check the Node.js version — CI tests on 18, 20, and 22
- Run `pnpm install --frozen-lockfile` locally to match CI

### Biome lint fails

```bash
pnpm lint:fix   # Auto-fix most issues
```

### Build output is unexpectedly large

- Check `tsup.config.ts` — `minify: "terser"` and `sourcemap: false` should be set
- Run `npm pack --dry-run` to inspect the tarball contents

### Release script fails

- Must be on `main` branch with clean working directory
- `gh` CLI must be authenticated: `gh auth login`
- All checks (typecheck, lint, test, build) must pass
