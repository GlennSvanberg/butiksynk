#!/usr/bin/env bash
# Vercel build: deploy Convex prod only for production builds.
set -euo pipefail
if [ "${VERCEL_ENV:-}" = "production" ]; then
  echo "VERCEL_ENV=production: deploying Convex + building frontend"
  npx convex deploy --cmd 'npm run build' --cmd-url-env-var-name VITE_CONVEX_URL
else
  echo "VERCEL_ENV=${VERCEL_ENV:-unset}: frontend build only (no Convex deploy)"
  npm run build
fi
