# AI platform integration (branch feat/ai-platform)

The website and portals connect to the EasyLink AI platform (separate service,
`easylink-ai-platform`). Without it configured, every page works as before:
AI panels hide, and the control centre shows its sample data.

## Server environment

| Variable | Value |
|---|---|
| `AI_PLATFORM_URL` | API URL from the AI platform deploy (local: `http://localhost:8787`) |
| `AI_EVENT_INGEST_KEY` | Secret `easylink/ai/ingest-key` (local: `ingest-local`) |

## What changed

| Where | Change |
|---|---|
| `src/lib/server/ai-platform.ts` | Server bridge: calls the AI platform with the signed-in person's portal token; relays events after successful changes |
| `src/app/api/admin/ai/[...path]`, `src/app/api/installers/ai/[...path]` | Proxies for the master and installer portals (allow-listed paths only) |
| `src/app/api/ai/events` | Browser event capture endpoint (interaction events only, pseudonymous visitor cookie) |
| `src/components/ai/AiEventCapture.tsx` (root layout) | Page views, clicks, form submits (field names only), front-end errors; honours Do Not Track / GPC |
| Lead, customer, appointment, document-upload and contact-form routes | Emit `lead.created`, `lead.updated/qualified/lost`, `lead.converted`, `customer.created`, `appointment.booked`, `file.uploaded`, `form.submitted` after the backend accepts the change |
| `MasterAiControl.tsx` | Live data and switches when connected (global recommend-only, agent pause, kill switches, budget); sample data otherwise |
| `/master/ai-approvals`, `/master/ai-decisions`, `/master/ai-screens` | New pages, linked from the existing sidebar items |
| `src/components/ai/AiRecordPanel.tsx` | AI summary, facts, photos grouped by AI label, "ask the customer for missing photos"; on the installer customer profile with a label chip per file |
| `src/components/ai/GeneratedScreen.tsx` | Renderer for AI-generated screens (approved components only, no model HTML) |

## Local end-to-end

```
# terminal 1
cd easylink-ai-platform && AI_MODE=local LOCAL_ADMIN_TOKEN=<admin jwt> npm run dev
# terminal 2
AI_PLATFORM_URL=http://localhost:8787 AI_EVENT_INGEST_KEY=ingest-local npm run dev
```
