# Transfy 🎵

> Real-time Lyrics with Translation
> 
> 실시간 싱크 가사 및 번역 웹 애플리케이션 (Spotify 지원)

![Next.js](https://img.shields.io/badge/Next.js-16-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue) ![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.0-38b2ac)

## ✨ 주요 기능 (Features)

- **실시간 싱크 (Real-time Sync):** 듣고 있는 노래 위치에 맞춰 가사가 자동으로 스크롤됩니다.
- **자동 번역 (Auto Translation):** 한국어, 영어, 일본어 등 원하는 언어로 가사를 실시간 번역해줍니다.
- **멀티 플랫폼 (Multi-platform):** 웹, 모바일 어디서든 반응형으로 동작합니다.

## 🚀 시작하기 (Getting Started)

자세한 설치 및 실행 방법은 [실행 가이드 (GUIDE.md)](docs/GUIDE.md)를 참고하세요.

### 빠른 실행
```bash
npm install
npm run dev
```

## 📚 문서 (Documentation)

- [**기술 설계서 (Architecture Design)**](docs/DESIGN.md): 시스템 구조 및 기술 스택 상세
- [**실행 가이드 (User Guide)**](docs/GUIDE.md): 환경 변수 설정 및 배포 방법

## 🛠️ 기술 스택 (Tech Stack)

- **Frontend:** Next.js 16, React 19, Zustand, Tailwind CSS
- **Auth:** NextAuth.js v4 (Spotify)
- **API:** Spotify Web API, LRCLIB (Lyrics), Google Translate (Unofficial)
- **Analytics:** Vercel Web Analytics
- **Cache:** Next.js 데이터 캐시 (번역 결과 캐싱, 별도 DB 불필요)

## 📝 라이선스 (License)

This project is MIT licensed.
