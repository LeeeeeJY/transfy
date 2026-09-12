#!/bin/bash
# Claude Code on the web는 세션마다 저장소를 새로 클론하므로 node_modules가 비어
# 있는 상태로 시작합니다. 여기서 의존성을 먼저 설치해 두어야 세션의 첫 턴부터
# npm run lint와 npm run typecheck를 실행할 수 있습니다.
set -euo pipefail

# 로컬 세션에서는 개발자가 직접 설치를 관리하므로 아무것도 하지 않습니다.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

# npm ci 대신 npm install을 쓰면 컨테이너 캐시를 재사용할 수 있어 더 빠릅니다.
# 이미 설치된 상태에서 다시 실행해도 안전합니다.
npm install --no-audit --no-fund
