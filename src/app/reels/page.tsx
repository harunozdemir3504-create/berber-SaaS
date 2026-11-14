"use client";

import { useRouter } from "next/navigation";
import ReelsAdStudio from "@/components/ReelsAdStudio";

/** /reels → şifresiz, doğrudan tam ekran Reels Reklam Stüdyosu */
export default function ReelsPage() {
  const router = useRouter();
  return <ReelsAdStudio onClose={() => router.push("/")} />;
}
