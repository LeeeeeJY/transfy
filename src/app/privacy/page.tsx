import React from 'react';
import PolicyDocument, { type PolicyCopy } from '@/components/PolicyDocument';
import { getLanguageFromHeaders, type UiLanguage } from '@/lib/server-utils';

const PRIVACY_TEXT: Record<UiLanguage, PolicyCopy> = {
  ko: {
    title: "개인정보처리방침",
    updated: "최종 수정일: 2026년 9월 13일",
    intro:
      "Transfy는 이용자를 식별할 수 있는 정보를 서버에 쌓아 두지 않습니다. 회원 정보나 접속 기록을 담는 데이터베이스를 아예 운영하지 않기 때문입니다. 아래에서 어떤 정보를 무엇에 쓰고, 어디로 보내며, 얼마나 보관하는지 설명합니다.",
    sections: [
      {
        title: "1. 스포티파이 계정 연동",
        body: "스포티파이 계정으로 로그인하시면 다음 정보를 읽어 화면에 보여 줍니다. 읽어 온 정보는 화면을 그리는 데에만 쓰고 서버에 저장하지 않습니다.",
        list: [
          "지금 재생 중인 곡과 재생 위치 (가사를 맞추어 보여 주기 위해 필요합니다)",
          "최근에 들은 곡, 자주 듣는 곡과 아티스트, 내 플레이리스트 목록 (홈 화면의 목록에 씁니다)",
        ],
        note:
          "로그인할 때 발급받은 접근 토큰과 스포티파이가 알려 주는 기본 프로필(표시 이름, 이메일 주소, 프로필 사진 주소)은 암호화된 세션 쿠키에 담겨 이용자의 브라우저에만 보관됩니다. 프로필 정보는 화면에 보여 주거나 따로 활용하지 않습니다. 로그아웃하시면 이 쿠키가 지워지며, 스포티파이 계정 설정의 앱 관리 화면에서 Transfy의 접근 권한을 언제든지 회수하실 수 있습니다.",
      },
      {
        title: "2. 외부 서비스로 전달되는 정보",
        body: "가사와 번역을 가져오려면 아래와 같이 외부 서비스에 요청을 보내야 합니다. 요청은 모두 Transfy 서버에서 보내며, 이용자를 식별할 수 있는 정보는 함께 보내지 않습니다.",
        list: [
          "LRCLIB: 가사를 찾기 위해 곡 제목, 아티스트, 앨범, 재생 시간을 보냅니다.",
          "구글 번역: 번역을 위해 가사 원문과 번역할 언어를 보냅니다.",
          "스포티파이, 아이튠즈: 곡을 검색하고 발매 당시의 표기를 확인하기 위해 검색어와 곡 정보를 보냅니다.",
        ],
        note:
          "전달된 정보를 각 서비스가 어떻게 처리하는지는 해당 서비스의 방침을 따릅니다.",
      },
      {
        title: "3. 서버에 잠시 보관하는 정보",
        body: "같은 곡을 반복해서 조회하고 번역하지 않도록, 가사 원문은 7일, 번역 결과는 30일 동안 서버 캐시에 보관합니다. 캐시에는 곡 정보와 가사, 번역문만 들어가고 누가 조회했는지는 남지 않으며, 정해진 기간이 지나면 자동으로 지워집니다.",
      },
      {
        title: "4. 방문 통계",
        body: "서비스가 어떻게 쓰이는지 파악하기 위해 Vercel Web Analytics로 방문 통계를 집계합니다. 쿠키를 사용하지 않고 IP 주소도 저장하지 않으며, 화면 이동 외에 다음과 같은 익명 통계를 함께 봅니다.",
        list: [
          "가사 화면을 어디에서 열었는지(검색, 인기 차트, 하단 바 등)와 화면 언어",
          "가사를 찾았는지 여부, 번역 언어, 번역을 캐시에서 바로 가져왔는지 여부",
          "검색 결과가 있었는지 여부",
        ],
        note: "어느 항목에도 개인을 알아볼 수 있는 값은 들어가지 않습니다.",
      },
      {
        title: "5. 방침의 변경",
        body: "처리 방침이 바뀌면 바뀐 내용과 최종 수정일을 이 화면에 함께 반영합니다.",
      },
    ],
    contactTitle: "6. 문의와 오류 제보",
    contactDesc:
      "개인정보 처리에 관해 궁금한 점이 있으시거나, 서비스를 이용하시다가 이상한 점을 발견하셨다면 아래 주소로 알려 주세요. 보내 주신 내용은 확인 후 처리하며, 문의에 답변하는 목적 외에는 사용하지 않습니다.",
    back: "← 홈으로 돌아가기",
  },
  en: {
    title: "Privacy Policy",
    updated: "Last updated: September 13, 2026",
    intro:
      "Transfy keeps no information on its servers that could identify you, because it runs no database of accounts or access logs at all. The sections below explain what each piece of information is used for, where it is sent, and how long it is kept.",
    sections: [
      {
        title: "1. Signing In with Spotify",
        body: "When you sign in with your Spotify account, Transfy reads the following and shows it on screen. What it reads is used only to render the page and is never stored on a server.",
        list: [
          "The track you are playing and its playback position, which is what lyrics are synced against.",
          "Your recently played tracks, top tracks and artists, and your playlists, which fill the lists on the home screen.",
        ],
        note:
          "The access token issued at sign-in, together with the basic profile Spotify returns (display name, email address, profile image URL), is held in an encrypted session cookie in your browser only. The profile details are neither displayed nor used for anything else. Signing out clears the cookie, and you can revoke Transfy's access at any time from the apps section of your Spotify account settings.",
      },
      {
        title: "2. What Is Sent to Other Services",
        body: "Fetching lyrics and translations requires requests to the services below. Every request is made from the Transfy server and carries nothing that identifies you.",
        list: [
          "LRCLIB: the track title, artist, album, and duration, so the matching lyrics can be found.",
          "Google Translate: the original lyrics and the target language, so they can be translated.",
          "Spotify and iTunes: your search terms and track details, to look up songs and their original release titles.",
        ],
        note: "How each service handles what it receives is governed by that service's own policy.",
      },
      {
        title: "3. What Is Cached on the Server",
        body: "So the same song is not fetched and translated over and over, original lyrics are cached for 7 days and translations for 30 days. A cache entry holds only track details, lyrics, and translated text, never who requested it, and it is discarded automatically once that period passes.",
      },
      {
        title: "4. Visit Statistics",
        body: "To understand how the service is used, Transfy collects visit statistics through Vercel Web Analytics. It sets no cookies and stores no IP addresses. Alongside page views, the following anonymous events are recorded:",
        list: [
          "Where a lyrics page was opened from (search, charts, the bottom bar) and the interface language.",
          "Whether lyrics were found, the translation language, and whether a translation came straight from the cache.",
          "Whether a search returned any results.",
        ],
        note: "None of these events carry any value that could identify an individual.",
      },
      {
        title: "5. Changes to This Policy",
        body: "When this policy changes, the new text and the date above are updated on this page.",
      },
    ],
    contactTitle: "6. Contact and Bug Reports",
    contactDesc:
      "If you have any question about how your data is handled, or if you notice anything odd while using Transfy, please let us know at the address below. We use what you send only to answer your message.",
    back: "← Back to Home",
  },
  ja: {
    title: "プライバシーポリシー",
    updated: "最終更新日: 2026年9月13日",
    intro:
      "Transfyは、利用者を識別できる情報をサーバーに蓄積しません。会員情報やアクセス記録を保存するデータベースをそもそも運用していないためです。以下では、どの情報を何に使い、どこへ送り、どれだけ保管するのかを説明します。",
    sections: [
      {
        title: "1. Spotifyアカウントとの連携",
        body: "Spotifyアカウントでログインすると、次の情報を読み取って画面に表示します。読み取った情報は画面の表示にのみ使用し、サーバーに保存することはありません。",
        list: [
          "再生中の曲と再生位置（歌詞を合わせて表示するために必要です）",
          "最近聴いた曲、よく聴く曲とアーティスト、プレイリストの一覧（ホーム画面の一覧に使用します）",
        ],
        note:
          "ログイン時に発行されるアクセストークンと、Spotifyから提供される基本プロフィール（表示名、メールアドレス、プロフィール画像のURL）は、暗号化されたセッションクッキーとして利用者のブラウザにのみ保管されます。プロフィール情報を画面に表示したり、ほかの用途に使ったりすることはありません。ログアウトするとこのクッキーは削除され、Spotifyアカウント設定のアプリ管理画面からTransfyのアクセス権限をいつでも取り消せます。",
      },
      {
        title: "2. 外部サービスへ送信される情報",
        body: "歌詞と翻訳を取得するには、次のように外部サービスへリクエストを送る必要があります。リクエストはすべてTransfyのサーバーから送信され、利用者を識別できる情報は含みません。",
        list: [
          "LRCLIB: 歌詞を探すために、曲名、アーティスト、アルバム、再生時間を送信します。",
          "Google翻訳: 翻訳のために、歌詞の原文と翻訳先の言語を送信します。",
          "Spotify、iTunes: 曲を検索し、リリース当時の表記を確認するために、検索語と曲の情報を送信します。",
        ],
        note: "送信された情報を各サービスがどのように扱うかは、それぞれのサービスの方針に従います。",
      },
      {
        title: "3. サーバーに一時的に保管する情報",
        body: "同じ曲を繰り返し取得して翻訳しないよう、歌詞の原文は7日間、翻訳結果は30日間サーバーのキャッシュに保管します。キャッシュに入るのは曲の情報と歌詞、翻訳文だけで、誰が取得したかは残りません。所定の期間を過ぎると自動的に削除されます。",
      },
      {
        title: "4. アクセス統計",
        body: "サービスがどのように使われているかを把握するため、Vercel Web Analyticsでアクセス統計を集計します。クッキーは使用せず、IPアドレスも保存しません。ページの閲覧数に加えて、次のような匿名の統計を確認しています。",
        list: [
          "歌詞画面をどこから開いたか（検索、人気チャート、下部バーなど）と画面の言語",
          "歌詞が見つかったかどうか、翻訳先の言語、翻訳がキャッシュから返されたかどうか",
          "検索結果があったかどうか",
        ],
        note: "いずれの項目にも、個人を特定できる値は含まれません。",
      },
      {
        title: "5. ポリシーの変更",
        body: "本ポリシーを変更した場合は、変更後の内容と最終更新日をこの画面に反映します。",
      },
    ],
    contactTitle: "6. お問い合わせと不具合のご報告",
    contactDesc:
      "個人情報の取り扱いについてご不明な点がある場合や、ご利用中に気になる点を見つけた場合は、下記の宛先までお知らせください。いただいた内容は確認のうえ対応し、お問い合わせへの回答以外の目的には使用しません。",
    back: "← ホームに戻る",
  },
  zh: {
    title: "隐私政策",
    updated: "最后更新日期：2026年9月13日",
    intro:
      "Transfy 不会在服务器上积累可以识别您身份的信息，因为我们根本没有运营存放会员信息或访问记录的数据库。下面说明哪些信息用于什么用途、发送到哪里，以及保存多久。",
    sections: [
      {
        title: "1. 与 Spotify 账户的连接",
        body: "使用 Spotify 账户登录后，我们会读取以下信息并显示在页面上。读取到的信息仅用于呈现页面，不会保存到服务器。",
        list: [
          "正在播放的歌曲与播放进度（用于让歌词同步显示）",
          "最近播放的歌曲、常听的歌曲与艺人、您的播放列表（用于首页的列表）",
        ],
        note:
          "登录时获得的访问令牌，以及 Spotify 提供的基本资料（显示名称、电子邮件地址、头像地址），以加密的会话 Cookie 形式仅保存在您的浏览器中。这些资料不会显示在页面上，也不会用于其他用途。退出登录后该 Cookie 会被清除，您也可以随时在 Spotify 账户设置的应用管理页面收回 Transfy 的访问权限。",
      },
      {
        title: "2. 发送到外部服务的信息",
        body: "获取歌词和翻译需要向以下服务发送请求。所有请求都从 Transfy 的服务器发出，不会附带任何可以识别您身份的信息。",
        list: [
          "LRCLIB：为查找歌词，发送歌曲名称、艺人、专辑和时长。",
          "Google 翻译：为进行翻译，发送歌词原文和目标语言。",
          "Spotify、iTunes：为搜索歌曲并确认发行时的名称，发送搜索关键词和歌曲信息。",
        ],
        note: "各服务如何处理收到的信息，以其自身的政策为准。",
      },
      {
        title: "3. 服务器上的临时缓存",
        body: "为避免反复获取和翻译同一首歌，歌词原文会缓存 7 天，翻译结果会缓存 30 天。缓存中只包含歌曲信息、歌词和译文，不会记录是谁发起的请求，超过上述期限后会自动清除。",
      },
      {
        title: "4. 访问统计",
        body: "为了解服务的使用情况，我们通过 Vercel Web Analytics 统计访问数据。它不使用 Cookie，也不存储 IP 地址。除页面浏览量外，我们还会查看以下匿名统计：",
        list: [
          "歌词页面是从哪里打开的（搜索、热门榜单、底部栏等）以及界面语言",
          "是否找到了歌词、翻译语言，以及译文是否直接来自缓存",
          "搜索是否有结果",
        ],
        note: "以上项目都不包含可以识别个人的数值。",
      },
      {
        title: "5. 政策的变更",
        body: "本政策变更时，我们会将变更后的内容和最后更新日期一并反映在本页面。",
      },
    ],
    contactTitle: "6. 联系与问题反馈",
    contactDesc:
      "如果您对个人信息的处理有疑问，或在使用过程中发现异常，请通过下面的邮箱告诉我们。我们仅将您发送的内容用于回复咨询，不作其他用途。",
    back: "← 返回首页",
  },
};

export default async function PrivacyPage() {
  const lang = await getLanguageFromHeaders();

  return <PolicyDocument copy={PRIVACY_TEXT[lang]} />;
}
