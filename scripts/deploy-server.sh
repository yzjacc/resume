#!/usr/bin/env bash
set -euo pipefail

repo=${RESUME_REPO:-/www/wwwroot/resume}
site=${RESUME_SITE:-/www/wwwroot/resume-site}
export GIT_TERMINAL_PROMPT=0
export npm_config_audit=false
export npm_config_fund=false
export PUPPETEER_NO_SANDBOX=${PUPPETEER_NO_SANDBOX:-true}

mkdir -p "$site/releases"
exec 9>"$site/deploy.lock"
flock -n 9 || exit 0
stage=''
cleanup() {
  if [[ -n "$stage" ]]; then rm -rf -- "$stage"; fi
  rm -f -- "$site/current.next"
}
trap cleanup EXIT

if [[ -n "$(git -C "$repo" status --porcelain)" ]]; then
  echo 'Repository has uncommitted changes; deployment skipped.' >&2
  exit 1
fi
if [[ "$(git -C "$repo" branch --show-current)" != main ]]; then
  echo 'Expected the main branch.' >&2
  exit 1
fi
git -C "$repo" fetch origin main
git -C "$repo" merge --ff-only origin/main
sha=$(git -C "$repo" rev-parse HEAD)
if [[ "$sha" != "$(git -C "$repo" rev-parse origin/main)" ]]; then
  echo 'Local branch is ahead of origin/main; deployment skipped.' >&2
  exit 1
fi
if [[ -f "$site/current/.release-sha" && "$(cat "$site/current/.release-sha")" == "$sha" ]]; then
  echo "Already published: $sha"
  exit 0
fi

# Never build inside the directory that Nginx is currently serving.
stage=$(mktemp -d "$site/.build-XXXXXXXX")
git -C "$repo" archive "$sha" | tar -x -C "$stage"
(
  cd "$stage"
  npm ci
  npm run check
  npm run build
  node --input-type=module -e '
    const { validateManifest, sourceFingerprint } = await import("./scripts/lib/manifest.mjs");
    await validateManifest(undefined, await sourceFingerprint());
  '
)

release="$site/releases/$sha-$(date +%s)"
mv "$stage/dist" "$release"
# Cached HTML may still reference the previous version's hashed assets.
if [[ -d "$site/current/assets" ]]; then
  mkdir -p "$release/assets"
  cp -an "$site/current/assets/." "$release/assets/"
fi
printf '%s\n' "$sha" > "$release/.release-sha"
ln -s "$release" "$site/current.next"
mv -Tf "$site/current.next" "$site/current"
echo "Published: $sha"
