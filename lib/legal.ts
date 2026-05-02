export const LEGAL_DOCUMENT_VERSION = "2026-05-02"

export const LEGAL = {
  serviceName: "TraveLLM",
  operatorName:
    process.env.NEXT_PUBLIC_LEGAL_OPERATOR_NAME || "Укажите полное наименование оператора",
  operatorInn: process.env.NEXT_PUBLIC_LEGAL_OPERATOR_INN || "Укажите ИНН",
  operatorOgrn: process.env.NEXT_PUBLIC_LEGAL_OPERATOR_OGRN || "Укажите ОГРН/ОГРНИП",
  operatorAddress:
    process.env.NEXT_PUBLIC_LEGAL_OPERATOR_ADDRESS || "Укажите почтовый адрес для корреспонденции",
  privacyEmail: process.env.NEXT_PUBLIC_LEGAL_PRIVACY_EMAIL || "privacy@travellm.ru",
  legalEmail: process.env.NEXT_PUBLIC_LEGAL_EMAIL || "legal@travellm.ru",
  supportTelegram: "https://t.me/travellm_support_bot",
  supportTelegramHandle: "@travellm_support_bot",
}

export const hasPublicOperatorDetails = ![
  LEGAL.operatorName,
  LEGAL.operatorInn,
  LEGAL.operatorOgrn,
  LEGAL.operatorAddress,
].some((value) => value.startsWith("Укажите"))
