# M9 Mobile Dashboard Implementation Plan

**Goal:** Replace the Today placeholder with a mobile summary and quick-entry hub for every child in the authenticated household.

**Architecture:** A pure dashboard aggregator receives active domain records and the household time zone, then derives today’s completion state, latest growth, most recent sleep, daily nutrition/activity/mood values, and cautious 7-day data summaries. The protected server page fetches only household-scoped records through existing repositories and renders direct links to each short domain form.

## Tasks

1. Add failing aggregation tests for household-local day boundaries, completed/missing state, latest records, and cautious trend copy.
2. Implement the pure dashboard snapshot builder.
3. Replace the protected Today page with household-scoped data loading and mobile child cards.
4. Add responsive dashboard styles and empty-household guidance.
5. Run lint, typecheck, focused/full tests, production build, and HTTP smoke.
6. Update durable state files and commit M9.
