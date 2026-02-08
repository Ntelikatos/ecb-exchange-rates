#Requires -Version 5.1

# Release script: bumps version, commits, tags, pushes, and creates a GitHub release.
#
# Usage:
#   .\scripts\release.ps1 patch   # 0.1.2 -> 0.1.3
#   .\scripts\release.ps1 minor   # 0.1.2 -> 0.2.0
#   .\scripts\release.ps1 major   # 0.1.2 -> 1.0.0

param(
    [ValidateSet("patch", "minor", "major")]
    [string]$Bump = "patch"
)

$ErrorActionPreference = "Stop"

# Ensure gh is authenticated
gh auth status 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Error "gh CLI is not authenticated. Run 'gh auth login' first."
    exit 1
}

# Ensure clean working directory
$status = git status --porcelain
if ($status) {
    Write-Error "Working directory is not clean. Commit or stash changes first."
    exit 1
}

# Ensure we're on main
$branch = git branch --show-current
if ($branch -ne "main") {
    Write-Error "Must be on 'main' branch (currently on '$branch')."
    exit 1
}

# Pull latest
git pull --rebase
if ($LASTEXITCODE -ne 0) { exit 1 }

# Run checks
Write-Host "Running checks..." -ForegroundColor Cyan
pnpm typecheck
if ($LASTEXITCODE -ne 0) { exit 1 }
pnpm lint
if ($LASTEXITCODE -ne 0) { exit 1 }
pnpm test
if ($LASTEXITCODE -ne 0) { exit 1 }
pnpm build
if ($LASTEXITCODE -ne 0) { exit 1 }

# Bump version (updates package.json, no git commit)
$newVersion = npm version $Bump --no-git-tag-version --loglevel=error
if ($LASTEXITCODE -ne 0) { exit 1 }
Write-Host "Bumped to $newVersion" -ForegroundColor Green

# Re-format package.json (npm version uses its own formatting)
pnpm lint:fix
if ($LASTEXITCODE -ne 0) { exit 1 }

# Commit, tag, push
git add package.json
if ($LASTEXITCODE -ne 0) { exit 1 }
git commit -m "release: $newVersion"
if ($LASTEXITCODE -ne 0) { exit 1 }
git tag $newVersion
if ($LASTEXITCODE -ne 0) { exit 1 }
git push origin main --tags
if ($LASTEXITCODE -ne 0) { exit 1 }

# Create GitHub release (triggers the publish workflow)
gh release create $newVersion --title $newVersion --generate-notes
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ""
Write-Host "Done! Release $newVersion created." -ForegroundColor Green
Write-Host "The publish workflow will automatically push to npm and GitHub Packages."
Write-Host "Track it at: https://github.com/Ntelikatos/ecb-exchange-rates-ts/actions"
