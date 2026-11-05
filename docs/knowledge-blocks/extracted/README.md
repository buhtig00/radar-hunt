# Knowledge-block extracted artifacts

Generated from `docs/knowledge-blocks/*.zip`.

## Files

- `_ALL_rag_seeds.jsonl` — every block's RAG seed source unified into one schema
  (`external_id, source_type, subspecialty, title, language, approval_status,
is_active, kind, text, references`). 274 entries: 88 substantive monographs +
  186 title-only catalogue stubs. Mirror of `src/lib/knowledge-block-seeds.ts`.
- `oph_import_all_blocks.sql` — **schema-correct** import of the block CSVs into
  the curated `oph_*` tables (198 rows: pathologies, medications, guidelines,
  classifications, case templates, devices, protocols). Generated against
  migration `20260531203853`, with enum values normalized (e.g.
  `clinical_guideline` → `guideline`), JSON arrays cast to `text[]`, and
  `references_json`/`metadata` cast to `jsonb`. All rows are `pending_review` /
  inactive and use `on conflict do nothing` (safe to re-run). Wrapped in a
  transaction. This **replaces** the broken per-block `*_supabase_import_v1.sql`.
  After running it, approve rows editorially and run `indexEvidenceCorpus` to
  vectorize them into the RAG corpus.

  Note: only the schema-aligned rows from the rich blocks (Cornea, Ocular
  Surface, plus all guideline/device tables) are included. The title-only stub
  rows from the other blocks use a different CSV layout and are intentionally
  not imported here — fill them as real monographs first.

## How to ingest

Use the admin server function **`seedKnowledgeBlocksFn`** (in
`src/lib/ai/index.functions.ts`). It loads `src/lib/knowledge-block-seeds.ts`
into `ai_knowledge_sources` (+ chunked `ai_chunks` for monographs) as
**pending review / inactive**. Editorial + KOL approval is required before the
AI layer can retrieve them. The function is idempotent — re-running it skips
already-imported `external_id`s and never overwrites editorial decisions.

## ⚠️ Do NOT run the per-block `*_supabase_import_v1.sql`

The auto-generated `<block>_supabase_import_v1.sql` files inside the ZIPs are
**incompatible with the deployed schema** and will fail:

- they use double quotes for string literals (PostgreSQL reads those as column
  identifiers);
- they reference columns that do not exist on the real tables (e.g.
  `external_id`, `icd11_code`, scalar `definition`/`red_flags` instead of the
  `*_en`/`*_es` pairs and `icd10_codes[]`).

Ingest the curated clinical tables (`oph_*`) from the block CSVs through a
schema-correct import instead, then run `indexEvidenceCorpus` to vectorize the
approved rows.

## Notes

- The Glaucoma and Retina block ZIPs shipped **empty** (0 bytes) in the source
  package and contribute no seeds. Retina/glaucoma are still covered by the
  landmark-trial evidence in `src/lib/ophthalmology-evidence*.ts`.
