# Transfy Design Document

## 1. 프로젝트 개요 (Overview)
**Transfy**는 음악 서비스(Spotify)에서 현재 재생 중인 음악의 가사를 실시간으로 가져와, 사용자가 선택한 언어로 번역하여 싱크(Sync)에 맞춰 보여주는 웹 애플리케이션입니다.

- **목표**: 언어 장벽 없이 음악을 즐길 수 있는 경험 제공
- **주요 기능**:
    - 실시간 재생 정보 연동 (Polling)
    - 실시간 싱크 가사 (Synced Lyrics) 표시 및 자동 스크롤
    - 구글 번역 API를 이용한 다국어 가사 번역
    - 반응형 웹 디자인 (Mobile/Desktop)

## 2. 기술 스택 (Tech Stack)
- **Frontend Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand (Global Player State)
- **Auth**: NextAuth.js (Spotify Provider)
- **External APIs**:
    - Spotify Web API (Playback State)
    - LRCLIB (Open Source Lyrics API)
    - Google Translate API (google-translate-api-x)

## 3. 시스템 아키텍처 (Architecture)

### 3.1 데이터 흐름 (Data Flow)
1. **인증 (Auth)**: 사용자가 `NextAuth`를 통해 Spotify 계정으로 로그인합니다.
2. **상태 동기화 (Sync)**:
    - **Spotify**: 클라이언트(`useSpotifyPoller`)가 주기적으로 API를 호출하여 재생 정보를 가져옵니다.
3. **가사 검색 (Lyrics Fetching)**:
    - 트랙이 변경되면 `LRCLIB` API에 `track_name`, `artist_name`, `duration`을 보내 싱크 가사를 요청합니다.
    - 가사가 없으면 에러 메시지를 표시합니다.
4. **번역 (Translation)**:
    - 가져온 가사는 서버 액션(`translateText`)을 통해 구글 번역 API로 전송됩니다.
    - 번역된 텍스트는 원문 가사 객체에 병합되어 상태 관리 스토어(`usePlayerStore`)에 저장됩니다.
5. **렌더링 (Rendering)**:
    - `LyricsView` 컴포넌트는 `progress_ms`와 가사 타임스탬프를 비교하여 현재 활성 라인을 강조하고 자동으로 스크롤합니다.

### 3.2 상태 관리 (Zustand Store)
`usePlayerStore`는 애플리케이션의 전역 상태를 관리합니다.
- **Playback**: `isPlaying`, `trackId`, `title`, `artist`, `progressMs`
- **Lyrics**: `lyrics` (Array of time, text, translation), `isLoadingLyrics`
- **Settings**: `showTranslation`, `targetLanguage`

## 4. 디렉토리 구조 (Directory Structure)
```
src/
├── app/
│   ├── api/auth/       # NextAuth 핸들러
│   ├── actions/        # Server Actions (번역 로직)
│   ├── layout.tsx      # 전역 레이아웃 (Providers)
│   └── page.tsx        # 메인 페이지 (로그인/플레이어)
├── components/
│   ├── LyricsView.tsx  # 가사 뷰어 (자동 스크롤)
│   ├── PlayerControls.tsx # 하단 컨트롤바 (언어 설정 등)
├── hooks/
│   ├── useLyricsFetcher.ts # 가사 검색 및 번역 로직
│   └── useSpotifyPoller.ts # 스포티파이 폴링 훅
├── lib/
│   ├── auth.ts         # NextAuth 설정
│   ├── lrclib.ts       # 가사 API 헬퍼
│   └── spotify.ts      # 스포티파이 API 헬퍼
└── store/
    └── usePlayerStore.ts # Zustand 스토어
```

## 5. 트러블슈팅 및 제약사항 (Known Issues)

### 5.1 스포티파이 신규 앱 생성 제한
- **현상**: 2024년 5월 기준(추정), 스포티파이 개발자 대시보드에서 신규 앱 생성이 "시스템 점검" 사유로 일시 중단됨.
- **영향**: 신규 `Client ID` 발급이 불가능하여, 로컬 개발 환경에서 스포티파이 로그인 기능을 테스트하기 어려울 수 있음.
- **대응 방안**:
    1. 제한이 풀릴 때까지 대기
    2. 기존에 발급받은 키가 있다면 재사용
    3. 스포티파이 연동 없이 '수동 검색 모드' 추가 개발 고려

### 5.2 번역 API 제한
- `google-translate-api-x`는 비공식 무료 라이브러리로, 과도한 요청 시 차단될 수 있습니다. 상용화 단계에서는 Google Cloud Translation API(유료)로 교체하는 것을 권장합니다.

## 6. 향후 계획 (Roadmap)
- [ ] 수동 검색 기능 추가 (스포티파이 계정 없는 사용자용)
- [ ] Musixmatch API 연동 검토 (가사 정확도 향상 시)
- [ ] PWA (Progressive Web App) 적용으로 모바일 앱 경험 제공
