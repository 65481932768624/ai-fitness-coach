#!/usr/bin/env bash
# 双通道推送：先走正常 git push；失败时自动回退到 GitHub API。
#
# 背景：本机到 github.com:443 偶尔会被阻断，git push 会超时；
# 而 api.github.com 通常仍可用。回退路径会用 git 索引里的字节推送，
# 推完再 fetch + 对齐本地分支，避免出现分叉。
#
# 用法：bash scripts/push.sh ["提交说明"]
set -uo pipefail
cd "$(dirname "$0")/.."
MSG="${1:-chore: update}"

if timeout 60 git push origin main 2>/dev/null; then
  echo "[push] 直连推送成功"
  exit 0
fi

echo "[push] 直连失败，改用 GitHub API 推送…"
PY="../tools/.venv/Scripts/python.exe"
[ -x "$PY" ] || PY="python"
"$PY" ../tools/git_sync.py "$MSG" || exit 1

echo "[push] 对齐本地引用…"
git fetch origin >/dev/null 2>&1 && git checkout -B main origin/main >/dev/null 2>&1
git status -sb | head -1