"use client"

import { AppLayout } from "@/components/app-layout"
import { DiscoveryReelsFeed } from "@/components/travel/DiscoveryReelsFeed"

export default function ReelsPage() {
  return (
    <AppLayout variant="immersive" className="bg-black">
      <DiscoveryReelsFeed />
    </AppLayout>
  )
}
