# RKN compliance checklist for TraveLLM

This checklist tracks actions that are required outside the codebase before a public beta that processes personal data in Russia.

## Must be completed before launch

- Fill public operator details in production environment variables:
  - `NEXT_PUBLIC_LEGAL_OPERATOR_NAME`
  - `NEXT_PUBLIC_LEGAL_OPERATOR_INN`
  - `NEXT_PUBLIC_LEGAL_OPERATOR_OGRN`
  - `NEXT_PUBLIC_LEGAL_OPERATOR_ADDRESS`
  - `NEXT_PUBLIC_LEGAL_PRIVACY_EMAIL`
  - `NEXT_PUBLIC_LEGAL_EMAIL`
- Submit a notification to Roskomnadzor before starting personal data processing, including purposes, processing methods, security measures, categories of data, and information systems used.
- Check that the operator appears in the Roskomnadzor personal data operators registry after the notification is accepted.
- Approve the published documents:
  - `/privacy`
  - `/personal-data-consent`
  - `/terms`
  - `/cookies`
  - `/contacts`
- Store evidence of user consent:
  - current signup stores `personal_data_consent_version` and `personal_data_consent_at` in Supabase user metadata;
  - if legal/audit needs grow, add a separate `consent_events` table with `user_id`, document version, timestamp, IP, user agent, and source screen.

## Incident response

- Create an internal incident register with date/time, reporter, affected systems, affected categories of data, actions taken, and final assessment.
- Prepare an on-call path for reports to `privacy@travellm.ru`.
- If a personal data leak is detected, notify Roskomnadzor within the statutory initial notification window, then complete the investigation and send the follow-up report within the statutory follow-up window.
- Keep technical evidence: logs, affected record IDs, infrastructure events, access tokens rotated, and containment timeline.

## Technical controls

- Keep HTTPS enforced on all production domains.
- Review Supabase RLS policies before beta and after schema changes.
- Keep server-side rate limits enabled for auth, image proxy, AI generation, AI chat, profile update, and feedback endpoints.
- Keep backups enabled and test restore at least once before launch.
- Keep dependency audit in the release checklist.
- Keep service role keys server-only and rotate them after contractor access or suspected exposure.
- If targeting the Russian market, document the chosen hosting location and cross-border transfer grounds for Supabase, OpenRouter, Google, DeepSeek, TravelPayouts, and hosting/CDN providers.

## Content controls

- Do not publish news or editorial materials without review.
- Avoid claims presented as current facts unless they are sourced and dated.
- Do not knowingly publish prohibited content, extremist materials, instructions for unlawful acts, copyrighted third-party materials without permission, or personal data of third parties.
- For AI-generated itinerary content, keep visible disclaimers that prices, schedules, visas, safety conditions, and opening hours must be checked against official or provider sources before booking.
