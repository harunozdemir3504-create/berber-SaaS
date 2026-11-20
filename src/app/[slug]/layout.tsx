import type { Metadata } from "next";
import React from "react";

function humanizeSlug(slug: string): string {
  return decodeURIComponent(slug || "")
    .replace(/[-_]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cleanSlug = decodeURIComponent(slug || "").trim();
  const displayName = humanizeSlug(cleanSlug) || "VIP Randevu";

  return {
    title: `${displayName} — Online Randevu`,
    manifest: `/api/manifest/${encodeURIComponent(cleanSlug)}`,
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: displayName,
    },
  };
}

export default function ShopSlugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
