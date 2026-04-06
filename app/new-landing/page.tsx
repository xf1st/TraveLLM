import { getTranslations } from "next-intl/server"
import NewLandingPage from "@/components/landing/NewLandingPage"

/** Server JSON-LD: WebApplication + Organization + FAQ (rich results) for RU/EN crawlers. */
async function LandingJsonLd() {
  const tm = await getTranslations("meta")
  const faqPairs = [
    { q: tm("faq1Q"), a: tm("faq1A") },
    { q: tm("faq2Q"), a: tm("faq2A") },
    { q: tm("faq3Q"), a: tm("faq3A") },
    { q: tm("faq4Q"), a: tm("faq4A") },
  ]
  const mainEntity = faqPairs.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  }))

  const graph = [
    {
      "@type": "WebApplication",
      "@id": "https://travellm.world/#webapp",
      name: "TraveLLM",
      applicationCategory: "TravelApplication",
      operatingSystem: "Web",
      description: tm("description"),
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      url: "https://travellm.world",
      sameAs: ["https://travellm.ru", "https://travellm.world"],
    },
    {
      "@type": "Organization",
      "@id": "https://travellm.world/#org",
      name: "TraveLLM",
      url: "https://travellm.world",
      logo: "https://travellm.world/apple-icon.png",
      sameAs: ["https://travellm.ru"],
    },
    {
      "@type": "FAQPage",
      "@id": "https://travellm.world/#faq",
      mainEntity,
    },
  ]

  const payload = {
    "@context": "https://schema.org",
    "@graph": graph,
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(payload) }}
    />
  )
}

export default async function NewLandingRoute() {
  return (
    <>
      <LandingJsonLd />
      <NewLandingPage />
    </>
  )
}
