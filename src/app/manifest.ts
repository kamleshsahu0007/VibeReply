import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "VibeReply — #1 AI Reply Generator & Smart Chat Assistant",
    short_name: "VibeReply",
    description: "Generate instant, contextual AI replies and translations in 180+ languages inside WhatsApp Web, LinkedIn, and Gmail.",
    start_url: "/",
    display: "standalone",
    background_color: "#02020a",
    theme_color: "#00f2fe",
    icons: [
      {
        src: "/favicon-48x48.png",
        sizes: "48x48",
        type: "image/png",
      },
      {
        src: "/favicon-96x96.png",
        sizes: "96x96",
        type: "image/png",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
