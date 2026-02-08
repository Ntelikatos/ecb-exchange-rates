#!/usr/bin/env bash
set -euo pipefail

# Release script: bumps version, commits, tags, pushes, and creates a GitHub release.
#
# Usage:
#   ./scripts/release.sh patch   # 0.1.2 -> 0.1.3
#   ./scripts/release.sh minor   # 0.1.2 -> 0.2.0
#   ./scripts/release.sh major   # 0.1.2 -> 1.0.0

BUMP="${1:-patch}"

if [[ "$BUMP" != "patch" && "$BUMP" != "minor" && "$BUMP" != "major" ]]; then
  echo "Usage: ./scripts/release.sh [patch|minor|major]"
  exit 1
fi

# Ensure gh is authenticated
if ! gh auth status &>/dev/null; then
  echo "Error: gh CLI is not authenticated. Run 'gh auth login' first."
  exit 1
fi

# Ensure clean working directory
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Error: Working directory is not clean. Commit or stash changes first."
  exit 1
fi

# Ensure we're on main
BRANCH="$(git branch --show-current)"
if [[ "$BRANCH" != "main" ]]; then
  echo "Error: Must be on 'main' branch (currently on '$BRANCH')."
  exit 1
fi

# Pull latest
git pull --rebase

# Run checks
echo "Running checks..."
pnpm typecheck
pnpm lint
pnpm test
pnpm build

# Bump version (updates package.json, no git commit)
NEW_VERSION="$(npm version "$BUMP" --no-git-tag-version)"
echo "Bumped to $NEW_VERSION"

# Commit, tag, push
git add package.json
git commit -m "release: $NEW_VERSION"
git tag "$NEW_VERSION"
git push origin main --tags

# Create GitHub release (triggers the publish workflow)
gh release create "$NEW_VERSION" \
  --title "$NEW_VERSION" \
  --generate-notes

echo ""
echo "Done! Release $NEW_VERSION created."
echo "The publish workflow will automatically push to npm and GitHub Packages."
echo "Track it at: https://github.com/Ntelikatos/ecb-exchange-rates-ts/actions"
