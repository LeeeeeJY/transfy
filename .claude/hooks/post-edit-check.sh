#!/bin/bash
# 파일을 편집한 직후에 ESLint와 타입 검사를 돌려, 오류를 작업이 끝난 뒤가 아니라
# 편집한 시점에 알려 줍니다. 두 검사를 합쳐 약 4초가 걸립니다.
#
# 오류는 종료 코드 2로 돌려주어 바로 고치게 하고, ESLint 경고는 작업을 막을 만큼
# 심각하지 않으므로 참고 정보로만 전달합니다.
set -uo pipefail

INPUT=$(cat)
FILE_PATH=$(printf '%s' "$INPUT" | jq -r '.tool_input.file_path // empty')

# 편집한 파일이 없거나 TypeScript/JavaScript가 아니면 검사할 대상이 없습니다.
case "$FILE_PATH" in
  *.ts | *.tsx | *.mts | *.js | *.jsx | *.mjs) ;;
  *) exit 0 ;;
esac

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
cd "$PROJECT_DIR" || exit 0

# 저장소 밖의 파일은 이 프로젝트의 설정으로 검사할 수 없습니다.
case "$FILE_PATH" in
  "$PROJECT_DIR"/*) ;;
  *) exit 0 ;;
esac

# 의존성이 아직 설치되지 않았다면 검사를 건너뜁니다. 설치는 SessionStart 훅이 맡습니다.
[ -d node_modules ] || exit 0

LINT_OUTPUT=$(npx --no-install eslint "$FILE_PATH" 2>&1)
LINT_STATUS=$?

# tsconfig.json이 프로젝트 전체를 대상으로 하므로 파일 하나만 검사할 수는 없습니다.
# 대신 incremental 옵션 덕분에 두 번째 실행부터는 2초 안에 끝납니다.
TYPE_OUTPUT=$(npx --no-install tsc --noEmit 2>&1 | head -30)

BLOCKING=""
if [ "$LINT_STATUS" -ne 0 ] && [ -n "$LINT_OUTPUT" ]; then
  BLOCKING="${BLOCKING}[ESLint 오류] ${FILE_PATH}
${LINT_OUTPUT}
"
fi
if [ -n "$TYPE_OUTPUT" ]; then
  BLOCKING="${BLOCKING}[타입 오류] 프로젝트 전체
${TYPE_OUTPUT}
"
fi

if [ -n "$BLOCKING" ]; then
  printf '%s\n' "$BLOCKING" >&2
  echo "여러 파일을 연달아 고치는 중이라면 아직 남은 편집 때문에 실패했을 수 있습니다. 작업을 마친 뒤 npm run lint와 npm run typecheck로 다시 확인하세요." >&2
  exit 2
fi

# 여기까지 왔다면 오류는 없습니다. ESLint가 경고만 남겼다면 참고 정보로 전달합니다.
if [ -n "$LINT_OUTPUT" ]; then
  jq -n --arg context "[ESLint 경고] ${FILE_PATH}
${LINT_OUTPUT}
빌드를 막지는 않지만, 방금 수정한 부분에서 생긴 경고라면 함께 정리하세요." \
    '{hookSpecificOutput: {hookEventName: "PostToolUse", additionalContext: $context}}'
fi

exit 0
