export interface SongData {
  id: string;
  title: string;
  artist: string;
  albumArt: string;
  lyrics: string; // Simple text lyrics for SEO/Display
}

export const POPULAR_SONGS: SongData[] = [
  {
    id: "dummy-eminem",
    title: "Lose Yourself",
    artist: "Eminem",
    albumArt: "https://i.scdn.co/image/ab67616d0000b2736ca5c90113b30c3c43ffb8f4",
    lyrics: "[Verse 1]\nLook, if you had one shot or one opportunity\nTo seize everything you ever wanted in one moment\nWould you capture it or just let it slip?\nYo\n\n[Verse 2]\nHis palms are sweaty, knees weak, arms are heavy\nThere's vomit on his sweater already, mom's spaghetti"
  },
  {
    id: "dummy-yoasobi",
    title: "アイドル (Idol)",
    artist: "YOASOBI",
    albumArt: "https://i.scdn.co/image/ab67616d0000b27371d62ea7ea8a5be92d3c1f62",
    lyrics: "[Verse 1]\nMuteki no egao de arasu media\nShiritai sono himitsu misuteriasu\nNuketeru toko sae kanojo no eria\nKanpeki de usotsuki na kimi wa\n\n[Chorus]\nTensai teki na aidoru sama"
  },
  {
    id: "dummy-bts",
    title: "Dynamite",
    artist: "BTS",
    albumArt: "https://i.scdn.co/image/ab67616d0000b27302488d07328905387472093d",
    lyrics: "[Intro]\nCos ah ah I’m in the stars tonight\nSo watch me bring the fire and set the night alight\n\n[Verse 1]\nShoes on get up in the morn\nCup of milk let’s rock and roll\nKing Kong kick the drum rolling on like a rolling stone"
  },
  {
    id: "dummy-newjeans",
    title: "Super Shy",
    artist: "NewJeans",
    albumArt: "https://i.scdn.co/image/ab67616d0000b2733d98a0ae7c78a3a9babaf8af",
    lyrics: "[Chorus]\nI'm super shy, super shy\nBut wait a minute while I make you mine, make you mine\nTrembling now, trembling now\nYou're on my mind all the time\nI wanna tell you but I'm super shy, super shy"
  },
  {
    id: "dummy-taylor",
    title: "Cruel Summer",
    artist: "Taylor Swift",
    albumArt: "https://i.scdn.co/image/ab67616d0000b273e787cffec20aa2a396a61647",
    lyrics: "[Verse 1]\nFever dream high in the quiet of the night\nYou know that I caught it\nBad, bad boy, shiny toy with a price\nYou know that I bought it\n\n[Chorus]\nIt's new, the shape of your body\nIt's blue, the feeling I've got"
  },
  {
    id: "dummy-charlie",
    title: "Attention",
    artist: "Charlie Puth",
    albumArt: "https://i.scdn.co/image/ab67616d0000b27382057a62174c5d6e1564998c",
    lyrics: "[Verse 1]\nYou've been runnin' round, runnin' round, runnin' round throwin' that dirt all on my name\n'Cause you knew that I, knew that I, knew that I'd call you up\nYou've been going round, going round, going round every party in L.A.\n'Cause you knew that I, knew that I, knew that I'd be at one"
  },
  {
    id: "dummy-justin",
    title: "Stay",
    artist: "The Kid LAROI, Justin Bieber",
    albumArt: "https://i.scdn.co/image/ab67616d0000b27341e31d6ea1d493dd77933ee5",
    lyrics: "[Chorus]\nI do the same thing I told you that I never would\nI told you I'd change, even when I knew I never could\nI know that I can’t find nobody else as good as you\nI need you to stay, need you to stay, hey"
  }
];
