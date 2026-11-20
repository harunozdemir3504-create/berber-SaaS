import { NextRequest, NextResponse } from "next/server";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { TenantShop } from "@/data/mockData";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function humanizeSlug(slug: string): string {
  return decodeURIComponent(slug || "")
    .replace(/[-_]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

async function resolveShopNameBySlug(slug: string): Promise<string> {
  const normalizedTarget = decodeURIComponent(slug || "")
    .trim()
    .toLowerCase();

  if (isSupabaseConfigured && supabase && normalizedTarget) {
    try {
      const { data: row } = await supabase
        .from("app_state")
        .select("data")
        .eq("key", "global_state")
        .maybeSingle();

      const globalData = (row?.data || {}) as { shops?: TenantShop[] };
      const shops = Array.isArray(globalData.shops) ? globalData.shops : [];
      const matched = shops.find(
        (s) =>
          s &&
          typeof s.slug === "string" &&
          s.slug.trim().toLowerCase() === normalizedTarget
      );

      if (matched?.name && matched.name.trim()) {
        return matched.name.trim();
      }
    } catch (err) {
      console.warn("[Dynamic Manifest] Shop name lookup fallback:", err);
    }
  }

  return humanizeSlug(slug) || "VIP Randevu";
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug: rawSlug } = await context.params;
  const cleanSlug = decodeURIComponent(rawSlug || "").trim();
  const encodedSlug = encodeURIComponent(cleanSlug);
  const mode = (request.nextUrl.searchParams.get("mode") || "")
    .trim()
    .toLowerCase();

  const shopName = await resolveShopNameBySlug(cleanSlug);
  const isAdminMode = mode === "admin";

  const startUrl = isAdminMode
    ? `/admin?shop=${encodedSlug}`
    : `/s/${encodedSlug}`;
  const scope = isAdminMode ? "/admin" : `/s/${encodedSlug}`;
  const displayName = isAdminMode ? `${shopName} Panel` : shopName;

  const manifest = {
    id: startUrl,
    name: displayName,
    short_name: displayName,
    description: `${shopName} — Online Randevu ve Yönetim Uygulaması`,
    start_url: startUrl,
    scope,
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: "#0d0a08",
    theme_color: "#c88a53",
    prefer_related_applications: false,
    icons: [
      {
        src: "/icon-192.png?v=2",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-192.png?v=2",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png?v=2",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png?v=2",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-touch-icon.png?v=2",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };

  return new NextResponse(JSON.stringify(manifest, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "no-store, must-revalidate",
    },
  });
}
