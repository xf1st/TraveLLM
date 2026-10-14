export const LEGAL_DOCUMENT_VERSION = "2026-05-02"

export const LEGAL = {
  serviceName: "TraveLLM",
  privacyEmail: process.env.NEXT_PUBLIC_LEGAL_PRIVACY_EMAIL?.trim() || "",
  legalEmail: process.env.NEXT_PUBLIC_LEGAL_EMAIL?.trim() || "",
  supportTelegram: "https://t.me/travellm_support_bot",
  supportTelegramHandle: "@travellm_support_bot",
}
