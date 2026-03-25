import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "TraveLLM — AI travel assistant",
    short_name: "TraveLLM",
    description: "Plan trips with AI: routes, itineraries, and travel ideas.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui", "browser"],
    orientation: "portrait-primary",
    background_color: "#0b0e14",
    theme_color: "#0b0e14",
    categories: ["travel", "lifestyle", "productivity"],
    lang: "en",
    dir: "ltr",
    icons: [
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Plan a trip",
        short_name: "Plan",
        description: "Open the trip planner",
        url: "/plan",
      },
      {
        name: "My trips",
        short_name: "Trips",
        description: "Your saved routes",
        url: "/trips",
      },
      {
        name: "Profile",
        short_name: "Profile",
        description: "Account and settings",
        url: "/profile",
      },
    ],
  }
}
