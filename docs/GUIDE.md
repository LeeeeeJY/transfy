# Lyricfy 실행 가이드 (User Guide)

## 1. 필수 요구 사항 (Prerequisites)
- **Node.js:** v18 이상 (LTS 권장)
- **Spotify Premium:** Spotify API의 재생 상태 제어 및 조회 기능은 프리미엄 계정에서 가장 원활하게 동작합니다. (무료 계정은 제한적일 수 있음)
- **Google Cloud Console 계정:** (선택 사항) Google 로그인을 사용할 경우 필요.

## 2. 환경 변수 설정 (Environment Setup)

프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 채워주세요. (`.env.example` 참고)

```bash
# NextAuth Secret (임의의 문자열 생성: openssl rand -base64 32)
NEXTAUTH_SECRET=your_super_secret_key
NEXTAUTH_URL=http://localhost:3000

# Spotify Client (https://developer.spotify.com/dashboard)
# 1. App 생성 -> Edit Settings -> Redirect URIs 추가: http://localhost:3000/api/auth/callback/spotify
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret

# Google Client (선택 사항)
# 1. API & Services -> Credentials -> Create Credentials -> OAuth Client ID
# 2. Redirect URI: http://localhost:3000/api/auth/callback/google
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

## 3. 설치 및 실행 (Installation & Run)

```bash
# 1. 의존성 설치
npm install

# 2. 개발 서버 실행
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)으로 접속하세요.

## 4. 사용 방법 (Usage)

1. **로그인:** 메인 화면에서 "Spotify로 로그인" 버튼을 클릭합니다.
2. **음악 재생:** 별도의 기기(PC 앱, 모바일 앱)에서 Spotify로 음악을 재생합니다.
3. **가사 확인:** Lyricfy 웹앱이 자동으로 재생 중인 곡을 감지하고 가사를 보여줍니다.
4. **번역 설정:** 하단 컨트롤 바에서 지구본 아이콘 옆의 언어를 변경하거나, 번역 아이콘을 눌러 번역을 끄고 켤 수 있습니다.

## 5. 배포 가이드 (Deployment)

### Vercel 배포 (권장)

1. GitHub에 코드를 푸시합니다.
2. Vercel 대시보드에서 `New Project`를 클릭하고 리포지토리를 연결합니다.
3. **Environment Variables** 설정 단계에서 `.env.local`에 있던 모든 변수를 입력합니다.
   - 주의: `NEXTAUTH_URL`은 배포된 도메인 주소(예: `https://lyricfy.vercel.app`)로 변경해야 합니다.
4. **Deploy** 버튼을 누릅니다.
5. 배포 완료 후, Spotify 대시보드와 Google Console에서 Redirect URI를 배포된 도메인(`https://lyricfy.vercel.app/api/auth/callback/spotify`)으로 업데이트해야 로그인이 정상 작동합니다.

## 6. 트러블슈팅 (Troubleshooting)

- **가사가 안 나와요:** 
  - LRCLIB 데이터베이스에 해당 곡의 싱크 가사가 없을 수 있습니다.
  - 곡 제목이나 아티스트 정보가 정확한지 확인하세요.
- **로그인이 안 돼요:**
  - 환경 변수(`CLIENT_ID`, `SECRET`)가 정확한지 확인하세요.
  - Redirect URI가 플랫폼 설정과 일치하는지 확인하세요.
