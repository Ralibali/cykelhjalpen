#!/usr/bin/env bash
# Idempotent Cloud Agent bootstrap for Cykelhjälpen.
# Installs the pinned Bun version (matching package.json / CI) and project deps.
# Self-locating so it works regardless of the caller's working directory.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

BUN_VERSION="1.2.0"
export BUN_INSTALL="${BUN_INSTALL:-$HOME/.bun}"
export PATH="$BUN_INSTALL/bin:$PATH"

if ! command -v bun >/dev/null 2>&1 || [ "$(bun --version 2>/dev/null)" != "$BUN_VERSION" ]; then
  echo "Installing Bun ${BUN_VERSION}..."
  curl -fsSL https://bun.sh/install | bash -s "bun-v${BUN_VERSION}"
fi

bun --version
bun install --frozen-lockfile
