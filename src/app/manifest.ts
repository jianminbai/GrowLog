import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GrowLog",
    short_name: "GrowLog",
    description: "儿童日常健康成长记录",
    start_url: "/today",
    scope: "/",
    display: "standalone",
    background_color: "#f6f2e9",
    theme_color: "#1f6b56",
    lang: "zh-CN",
    categories: ["health", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
    ]
  };
}
