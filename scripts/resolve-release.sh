#!/usr/bin/env bash
# Decides what release.yml does for the pushed commit and writes the decision to $GITHUB_OUTPUT.
#
# Outputs: run (build and finish a release), publish (the npm version is still missing), npm_version, tag, dist_tag, prerelease.
# Input: REF_NAME, the pushed branch (main or release/<X.Y.Z>). Run from a full clone with tags.
#
# VERSION 0.0.0 is the template sentinel and resolves to run=false. Anything the script cannot establish (a registry error, a VERSION that disagrees with package.json or the branch) fails the run instead of guessing.

set -euo pipefail

registry="https://registry.npmjs.org"

fail() {
  echo "::error::$1" >&2
  exit 1
}

emit() {
  echo "$1=$2" >> "$GITHUB_OUTPUT"
}

version=$(tr -d '[:space:]' < VERSION)
[ -n "$version" ] || fail "VERSION file is empty"

if [ "$version" = "0.0.0" ]; then
  echo "VERSION=0.0.0 is the template sentinel; nothing to release."
  emit run false
  emit publish false
  exit 0
fi

[[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || fail "VERSION '$version' is not X.Y.Z"

name=$(node -p "require('./package.json').name")
package_version=$(node -p "require('./package.json').version")
[ "$package_version" = "$version" ] || fail "package.json version $package_version does not match VERSION $version"

# 404 means the package does not exist yet. Any other failure must not read as "not published".
packument=$(mktemp)
status=$(curl -sS -o "$packument" -w '%{http_code}' "$registry/$name")
case "$status" in
  200) ;;
  404) echo '{}' > "$packument" ;;
  *) fail "registry answered HTTP $status for $name" ;;
esac

published_versions=$(node -e '
  const { versions = {} } = JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8"));
  console.log(Object.keys(versions).join("\n"));
' "$packument")

is_on_npm() {
  grep -Fxq -- "$1" <<< "$published_versions"
}

case "$REF_NAME" in
  main)
    npm_version="$version"
    dist_tag=latest
    prerelease=false
    ;;
  release/*)
    [ "${REF_NAME#release/}" = "$version" ] || fail "branch $REF_NAME does not match VERSION $version"
    dist_tag=next
    prerelease=true
    # A rerun on the same commit resumes its rc. Otherwise take the next number after every tag and every npm version: trimmed tags must not free a number npm will never accept again.
    at_head=$(git tag --points-at HEAD --list "v${version}-rc.*" | sort -V | tail -n 1)
    if [ -n "$at_head" ]; then
      npm_version="${at_head#v}"
    else
      prefix="${version}-rc."
      last=$( { git tag --list "v${prefix}*" | sed 's/^v//'; echo "$published_versions"; } \
        | grep -F -- "$prefix" \
        | sed -n "s/^${prefix//./\\.}\([0-9][0-9]*\)$/\1/p" \
        | sort -n | tail -n 1 || true)
      npm_version="${prefix}$(( ${last:-0} + 1 ))"
    fi
    ;;
  *)
    fail "release.yml does not handle branch $REF_NAME"
    ;;
esac

tag="v${npm_version}"

publish=true
if is_on_npm "$npm_version"; then
  echo "${name}@${npm_version} is already on npm; skipping publish."
  publish=false
fi

tag_exists=false
if tag_sha=$(git rev-parse -q --verify "refs/tags/${tag}^{commit}"); then
  # A tag on an unrelated commit is a leftover to delete by hand, not a prior release.
  git merge-base --is-ancestor "$tag_sha" HEAD \
    || fail "tag $tag exists at $tag_sha, which is not an ancestor of HEAD. Delete it (git push origin :refs/tags/$tag) and re-run."
  echo "Tag $tag already exists at $tag_sha."
  tag_exists=true
fi

run=false
if [ "$publish" = "true" ] || [ "$tag_exists" = "false" ]; then
  run=true
fi

echo "Resolved ${name}@${npm_version} (dist-tag ${dist_tag}): run=$run publish=$publish"
emit run "$run"
emit publish "$publish"
emit npm_version "$npm_version"
emit tag "$tag"
emit dist_tag "$dist_tag"
emit prerelease "$prerelease"
