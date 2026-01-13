import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-[#1DB954]" />
        <p className="text-lg text-white/50 animate-pulse">가사를 불러오는 중...</p>
      </div>
    </div>
  );
}
