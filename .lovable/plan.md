# Ophthalmology Radar Intelligence Layer — MVP Plan

A frontend-first MVP simulating the full vertical ophthalmology AI platform. Backend (Supabase + edge functions + OpenAI + pgvector) is **not** wired in this iteration — all AI responses use realistic local mock data, but the code is structured so a future pass can swap mocks for real API calls without touching UI components.

## Scope of this iteration

- All 9 pages with navigation, mock role switching, and responsive layout
- Reusable component library
- Mock data (12 knowledge sources, sample interactions, KOL reviews, analytics)
- Safety detection logic (emergency terms, disclaimers, anonymisation gating)
- Type definitions matching the future Supabase schema
- Service-layer abstraction (mock now, swappable later)

**Out of scope (next iterations):** Lovable Cloud activation, real auth, real AI calls, embeddings/pgvector, file ingestion, KOL email workflows, i18n runtime switching (UI is English with selectors that display Spanish sample data).

## Design system

Tokens added to `src/styles.css` (oklch equivalents of):

- bg `#F7F8FA`, surface `#FFFFFF`, primary-dark `#07111F`, navy `#0B1F3A`
- accent-blue `#2563EB`, gold `#C9A86A`
- text `#111827`, muted `#6B7280`, border `#E5E7EB`
- success `#16A34A`, warning `#F59E0B`, danger `#DC2626`

Typography: Inter (body) + a refined serif for hero/section titles. Rounded-xl cards, soft shadows, generous whitespace. No emojis. Lucide icons.

## Routes (TanStack Start, flat dot-files)

```
src/routes/
  __root.tsx                  AppShell: Sidebar + TopBar + Outlet
  index.tsx                   Dashboard
  clinical-ai.tsx             OR Clinical AI
  academy-tutor.tsx           OR Academy AI Tutor
  case-analysis.tsx           Clinical Case Analysis
  knowledge-base.tsx          Knowledge sources admin
  editorial-review.tsx        Editor queue
  kol-verification.tsx        KOL review
  analytics.tsx               Analytics
  settings.tsx                Settings (tabs)
```

Each route gets its own `head()` with unique title + description.

## Components (`src/components/`)

Layout: `AppShell`, `Sidebar`, `TopBar`, `RoleSwitcher` (mock role state via Zustand-free React context).

Cards/blocks: `MetricCard`, `SourceCard`, `AIAnswerCard`, `ReviewQueueCard`, `KOLVerificationCard`, `AnalyticsChartCard`, `DisclaimerBox`, `EmptyState`, `LoadingState`.

Badges: `StatusBadge` (Draft / Pending / Approved / Rejected / Archived), `ValidationBadge` (AI Generated · Educational / OR Reviewed / KOL Verified), `SafetyBadge` (Missing data, Red flag, Specialist review, Evidence limited, KOL recommended).

Interaction: `FeedbackButtons`, `KnowledgeSourceTable`, `UploadSourceModal`, `SubspecialtySelector`, `LanguageSelector`, `ModeSelector`, `AnonymisationConfirm`.

shadcn primitives reused: button, card, input, textarea, select, tabs, table, dialog, badge, checkbox, switch, tooltip, separator, scroll-area, dropdown-menu, progress, alert.

Charts: Recharts (already common with shadcn/chart.tsx) for analytics bars/lines/donuts.

## Data + types (`src/lib/`)

- `types/` — TypeScript types mirroring the Supabase schema (ai_knowledge_sources, ai_chunks, ai_interactions, ai_feedback, ai_safety_events, ai_validated_answers, plus User, Role).
- `mock/` — seed data: 12 knowledge sources, ~8 sample interactions (ES + EN), ~6 KOL queue items, ~6 editorial queue items, analytics aggregates, courses for tutor.
- `services/ai.ts` — `askClinicalAI`, `askAcademyTutor`, `analyseCase` returning structured mock responses with built-in delay. Single seam to replace with real calls.
- `services/knowledge.ts` — CRUD on mock sources.
- `safety/detect.ts` — keyword matcher for ES/EN emergency terms; returns flags consumed by AI cards and the case form.
- `safety/disclaimers.ts` — single source of truth for the educational disclaimer string.
- `role/RoleContext.tsx` — current role + switcher; sidebar items filtered by role.

## Page specifics

**Dashboard** — Hero header, 6 KPI cards, 4 main feature cards linking to sub-pages, safety banner footer.

**OR Clinical AI** — Two-column: input (subspecialty, language, mode, textarea, Ask) | answer (`AIAnswerCard` with summary / considerations / missing info / differential / evidence / red flags / sources / related OR content / disclaimer / validation badge / feedback). Pre-seeded DMEK example response. Safety detector runs on submit and prepends warning banner when triggered.

**Academy Tutor** — Course + module + tutor mode selectors; output card plus generated learning cards (flashcards, MCQ with 4 options + correct + explanation, key concepts, exam-readiness progress).

**Case Analysis** — Anonymisation checkbox gates the form (Analyse button disabled until checked). Full structured form, then AI output card with case summary, hypotheses, tests, red flags, discussion questions, bibliography, related OR content, safety tags.

**Knowledge Base** — Filterable table (subspecialty, status, type, language search). Row actions dropdown (View, Edit, Approve, Reject, Archive, Send to KOL, Generate embeddings, Deactivate). `UploadSourceModal` with all fields → adds row with status `Pending Review`.

**Editorial Review** — Tabs: Pending Sources / AI Answers / Safety Flags / FAQs / Suggested KOL Reviews. Each item is a review card with the specified action buttons.

**KOL Verification** — Table + detail drawer with original question, AI answer, sources, editor notes, KOL comment textarea, decision radio (Approve / Request changes / Reject / Needs update). Approved items render the `KOL Verified` badge with KOL name, subspecialty, validation + next-review dates.

**Analytics** — 7 KPI cards, Recharts: queries by subspecialty (bar), by language (donut), trend (line), top educational gaps (horizontal bar), most requested course topics (bar), safety flags frequency (bar). Locked "OR Intelligence Dashboard — Coming Soon" card with disclosure note.

**Settings** — Tabs: AI Provider / Safety / Usage Limits / Roles / Disclaimer / Data Retention. Fields prefilled with the specified mock values. All inputs functional in local state only.

## Safety logic

`detectSafety(query, language)` returns `{ emergency: boolean, categories: string[], terms: string[] }`. UI consumes this to:

1. Show the orange safety banner above the answer.
2. Append `SafetyBadge`s to the answer card.
3. Always include the mandatory educational disclaimer in every AI output, regardless.

## Technical notes

- TanStack Start + TanStack Router file routes (flat dot convention)
- TanStack Query already in template — used for mock service calls so loading/feedback states are real
- Sidebar uses shadcn `Sidebar` with `collapsible="icon"` and `SidebarTrigger` in `TopBar`
- All colors via semantic tokens — no inline hex in components
- Role switcher lives in `TopBar`; persists in `localStorage`
- No new packages needed beyond what the template already ships (shadcn, recharts, lucide-react, tanstack-\*)

## Deliverable check

A clickable, premium-feeling MVP where every page in the spec renders with realistic content, mock AI flows feel responsive, safety + validation language is consistent, and the codebase is cleanly partitioned so the next pass (Lovable Cloud + real AI) is purely additive.
