import Link from "next/link";
import { POPULAR_SONGS } from "@/data/dummySongs";
import { getLanguageFromHeaders } from "@/lib/server-utils";
import AdSense from "@/components/AdSense";

export const metadata = {
  title: "Top Lyrics Charts | Transfy",
  description: "Explore the most popular translated lyrics on Transfy.",
};

export default async function ChartsPage() {
  const lang = await getLanguageFromHeaders();
  const isKo = lang === "ko";

  return (
    <div className="min-h-screen bg-black text-white p-6 pb-24">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex items-center justify-between mb-8">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Transfy" className="w-10 h-10 rounded-full" />
            <span className="font-bold text-xl">Transfy</span>
          </Link>
        </header>

        <h1 className="text-3xl font-bold mb-6">
          {isKo ? "인기 차트" : "Top Charts"}
        </h1>

        <div className="grid gap-4">
          {POPULAR_SONGS.map((song, index) => (
            <Link
              key={song.id}
              href={`/lyric/${song.id}`}
              className="flex items-center gap-4 bg-white/5 p-4 rounded-xl hover:bg-white/10 transition-colors group"
            >
              <span className="text-2xl font-bold text-white/30 w-8 text-center">
                {index + 1}
              </span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={song.albumArt}
                alt={song.title}
                className="w-16 h-16 rounded-md shadow-lg group-hover:scale-105 transition-transform"
              />
              <div>
                <h3 className="text-lg font-bold">{song.title}</h3>
                <p className="text-white/60">{song.artist}</p>
              </div>
              <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-green-500">
                Play ▶
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12">
           <AdSense style={{ minHeight: "90px" }} />
        </div>
      </div>
    </div>
  );
}
