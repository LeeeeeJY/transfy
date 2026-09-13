# Transfy

스포티파이에서 재생 중인 곡의 싱크 가사를 가져와 실시간으로 번역해 보여 주는
Next.js 웹 애플리케이션입니다. 시스템 구조는 `docs/DESIGN.md`, 환경 변수와 배포
방법은 `docs/GUIDE.md`에 정리되어 있으므로 작업 전에 관련 부분을 확인하세요.

## 명령어

| 명령어 | 용도 |
| --- | --- |
| `npm run dev` | 개발 서버를 실행합니다. |
| `npm run lint` | ESLint로 검사합니다. |
| `npm run typecheck` | `tsc --noEmit`으로 타입을 검사합니다. |
| `npm run build` | 프로덕션 빌드를 만듭니다. |

코드를 수정한 뒤에는 `npm run lint`와 `npm run typecheck`를 모두 통과시켜야 합니다.
테스트 프레임워크는 아직 도입되어 있지 않으므로, 이 두 명령이 유일한 자동 검증
수단입니다. `tsconfig.json`이 `strict: true`이기 때문에 타입 검사를 건너뛰면
`npm run build` 단계에서야 오류가 드러납니다.

의존성 설치는 `.claude/hooks/session-start.sh`가 세션 시작 시 자동으로 처리합니다.
파일을 편집하면 `.claude/hooks/post-edit-check.sh`가 ESLint와 타입 검사를 돌립니다.

## 기술 스택

- **프레임워크**: Next.js 16 (App Router), React 19, TypeScript
- **스타일**: Tailwind CSS 4
- **상태 관리**: Zustand
- **인증**: NextAuth.js v4 (스포티파이 프로바이더)
- **외부 API**: Spotify Web API, LRCLIB(가사), iTunes Search API(폴백),
  google-translate-api-x(번역)

## 구조와 규칙

### 데이터베이스를 쓰지 않습니다

예전에는 Supabase에 번역 캐시와 접속 로그를 저장했지만, 무료 플랜에서 프로젝트가
자동으로 일시 중지되는 문제 때문에 제거했습니다. 지금은 Next.js 데이터 캐시
(`unstable_cache`)로 가사 원문을 7일, 번역 결과를 30일 보관하고, 접속 통계는 Vercel
Web Analytics로 수집합니다. 새 기능을 만들 때 데이터베이스를 다시 도입하지 마세요.

캐시 계층에 문제가 생기면 캐시를 건너뛰고 원래 동작을 이어 가도록 작성해야 합니다.
"가사 없음"이라는 결과는 캐시하지 않습니다. 나중에 LRCLIB에 가사가 등록되면 바로
반영되어야 하기 때문입니다.

### 곡 식별은 ID를 우선합니다

상세 페이지는 `/track/{artist}/{title}?id={트랙 ID}&src={spotify|itunes}` 형태로
접근하며, ID가 있으면 제목으로 다시 검색하지 않고 ID로 직접 조회합니다. 사용자가
직접 고른 곡은 `pinnedTrackId`로 고정하므로, 폴러가 화면의 곡 정보를 덮어쓰면 안
됩니다.

ID 없이 들어온 경우에는 `src/lib/track-match.ts`의 `pickBestMatch`로 후보를
고릅니다. 이때 **제목의 앞부분만 겹치는 후보를 채택하면 안 됩니다.** 그렇게 하면
"Love"를 요청했을 때 "Love Story"가 열리는 문제가 생기며, 이는 실제로 발생했다가
수정된 회귀입니다. 확실한 후보가 없으면 `null`을 돌려주고 URL의 값을 그대로 쓰는
것이 올바른 동작입니다.

### 화면에 보여 줄 이름과 조회에 쓸 이름은 다릅니다

스포티파이는 국내 발매곡도 로마자 표기로 돌려주므로, `src/lib/itunes-locale.ts`가
아이튠즈 한국 스토어프론트에서 발매 당시의 표기를 가져와 화면에 보여 줍니다.
이 이름은 **표시 전용**입니다. LRCLIB 가사 조회, 재생 중인 곡 판정
(`isSamePinnedTrack`), 주소 생성에는 반드시 원래 표기(`title`, `artist`)를 쓰세요.
스토어의 `localizedTitle`/`localizedArtist`와 목록의 `displayTitle`/`displayArtist`를
조회에 쓰면 가사를 찾지 못하거나 다른 곡이 열립니다.

### 애플 뮤직과 아이튠즈는 다릅니다

애플 뮤직 재생 연동은 제거되었으므로 되살리지 마세요. 반면 **iTunes Search API는
살아 있는 코드입니다.** 비로그인 방문자의 검색과 인기 차트 조회에 폴백으로
사용하므로, `src/app/actions/search.ts`의 `searchTracksItunes`나 `getItunesTrackById`,
그리고 `next.config.ts`의 `*.mzstatic.com` 이미지 호스트(아이튠즈 앨범 아트)를
잔여 코드로 오인해 지우면 안 됩니다.

### 상태는 스토어 하나로 모읍니다

재생 정보, 가사, 번역 설정은 모두 `src/store/usePlayerStore.ts` 한 곳에서
관리합니다. 컴포넌트마다 같은 상태를 따로 들고 있지 않도록 하세요.

### 임포트 경로

`@/*` 별칭이 `./src/*`를 가리킵니다. 상대 경로 대신 별칭을 사용하세요.

## 환경 변수

`.env.local`에 다음 값이 필요합니다. 자세한 발급 방법은 `docs/GUIDE.md`를 참고하세요.

| 변수 | 용도 |
| --- | --- |
| `NEXTAUTH_SECRET` | NextAuth 세션 암호화 키 |
| `NEXTAUTH_URL` | 배포 주소 (로컬은 `http://localhost:3000`) |
| `SPOTIFY_CLIENT_ID` | 로그인과 비로그인 트랙 조회에 사용 |
| `SPOTIFY_CLIENT_SECRET` | 위와 동일 |
| `NEXT_PUBLIC_URL` | 서비스 대표 주소. 메타데이터, 구조화 데이터, `robots.ts`, `sitemap.ts`가 참조합니다 (없으면 `src/lib/site.ts`의 기본값 사용) |

## 작성 언어

문서, 주석, 커밋 메시지는 한국어로 작성합니다. 코드의 식별자와 로그 문자열은
기존 관례대로 영어를 유지합니다.

커밋 메시지는 한국어 Conventional Commits 형식을 따릅니다.

```
feat: 가사 원문도 서버 캐시에 저장하고 죽은 코드 제거
fix: 제목 앞부분만 겹치는 다른 곡이 채택되던 문제 수정
refactor: 소비되지 않는 isDummyTrack prop 경로와 애플 뮤직 잔여 코드 제거
style: 전역 스타일 수정 및 레이아웃 구조 개선
```
