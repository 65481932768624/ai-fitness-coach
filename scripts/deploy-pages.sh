#!/usr/bin/env bash
# 一键发布到 GitHub Pages：构建 → 提交到 gh-pages 分支 → 推送。
#
# 前置：本仓库已配置 origin，且本机已通过 Git Credential Manager 登录过 GitHub。
# 用法：bash scripts/deploy-pages.sh [仓库名]
set -euo pipefail

cd "$(dirname "$0")/.."
REPO="${1:-ai-fitness-coach}"

echo "[deploy] 1/4 构建（base=/$REPO/）"
node scripts/build-pages.mjs "$REPO"

echo "[deploy] 2/4 准备 gh-pages 工作树"
git fetch origin gh-pages >/dev/null 2>&1 || true
git worktree remove .gh-pages --force >/dev/null 2>&1 || true
rm -rf .gh-pages
git worktree add --detach .gh-pages origin/gh-pages >/dev/null

echo "[deploy] 3/4 覆盖构建产物"
find .gh-pages -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
cp -r dist/. .gh-pages/
cd .gh-pages
git add -A
if git diff --cached --quiet; then
  echo "[deploy] 产物无变化，跳过提交"
else
  git commit -q -m "deploy: $(date '+%Y-%m-%d %H:%M:%S')"
fi

echo "[deploy] 4/4 推送 gh-pages"
git push origin HEAD:gh-pages
cd ..
git worktree remove .gh-pages --force

echo "[deploy] 完成：https://$(git config --get remote.origin.url | sed -E 's#.*github.com[:/]([^/]+)/.*#\1#').github.io/$REPO/"