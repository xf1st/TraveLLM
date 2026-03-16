"use client"

/**
 * ClientModals — lazy wrapper for non-critical layout overlays.
 *
 * Keeps framer-motion and other heavy deps OUT of the initial
 * compilation graph. These components are cosmetic / deferred,
 * so ssr:false and lazy loading are perfectly fine here.
 */

import dynamic from "next/dynamic"

const NotificationPrompt = dynamic(
  () => import("@/components/NotificationPrompt").then(m => ({ default: m.NotificationPrompt })),
  { ssr: false }
)

const OnboardingPrompt = dynamic(
  () => import("@/components/OnboardingPrompt").then(m => ({ default: m.OnboardingPrompt })),
  { ssr: false }
)

const CookieConsent = dynamic(
  () => import("@/components/CookieConsent").then(m => ({ default: m.CookieConsent })),
  { ssr: false }
)

const WelcomeModal = dynamic(
  () => import("@/components/WelcomeModal").then(m => ({ default: m.WelcomeModal })),
  { ssr: false }
)

export function ClientModals() {
  return (
    <>
      <NotificationPrompt />
      <OnboardingPrompt />
      <CookieConsent />
      <WelcomeModal />
    </>
  )
}
