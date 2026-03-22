"use client";

import { useParams, useRouter } from "next/navigation";

export default function ClassroomPage() {
  const params = useParams<{ roomName: string }>();
  const router = useRouter();
  const roomName = params.roomName;
  const dailyDomain = process.env.NEXT_PUBLIC_DAILY_DOMAIN;

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      {/* Leave Button */}
      <button
        onClick={() => router.push("/dashboard")}
        className="absolute top-4 left-4 z-50 bg-red-600 hover:bg-red-500 text-white text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-md shadow-lg transition-colors"
      >
        Leave Classroom
      </button>

      {/* Daily.co Iframe */}
      <iframe
        src={`https://${dailyDomain}/${roomName}`}
        allow="camera; microphone; fullscreen; display-capture; autoplay"
        className="w-full h-full border-0"
      />
    </div>
  );
}
