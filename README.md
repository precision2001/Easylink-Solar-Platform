# EasyLink AI platform

The AI layer for the EasyLink Solar website and portals. It sits beside the
existing Express backend, which stays the source of truth for every business
record. Everything the system experiences becomes an event. Agents act only
through 15 generic actions, and every action passes through policy (AU
compliance and ownership) and autonomy (Shadow / Recommends / Decides). The
master portal's AI control centre and approvals screens drive it.

```
website + portals (Next.js)  ──/api/ai/events, /api/*/ai/*──▶  API (Hono on Lambda)
existing routes (after success) ── relay events ──────────────▶     │
Amazon Connect / SMS / email ── contact-events Lambda ────────▶  EventBridge easylink-core
                                                                     │  (archive 7 yrs)
                                                              SQS ──▶ AI consumer Lambda
                                                                     │  triage → agents (Bedrock Converse)
                                                                     ▼
                                       ActionService ── policy ── autonomy ──▶ existing backend REST
                                                                     │          SES / SMS / S3 links
                                                                     ▼
                                                              DynamoDB easylink-ai (inbox, decisions,
                                                              action log, rules, memory, labels, screens)
```

## Layout

| Path | What it is |
|---|---|
| `src/core` | Event envelope, event catalogue, record registry (maps to backend endpoints), the 15 actions |
| `src/policy` | Policy rules (ownership, contact-on-file, opt-out, Spam Act, SMS quiet hours, ACMA hours, DNCR, bulk, always-human) and autonomy resolution |
| `src/compliance/au.ts` | State from postcode/address, time zones, national public holidays, calling and SMS hours |
| `src/actions` | `ActionService` (validate → policy → autonomy → execute → log → events), approve/reject, workflows, messaging and file-link ports |
| `src/ai` | Model client (Bedrock Converse + fake), the 10 agents (ids match the control centre), runtime |
| `src/files/classify.ts` | Reads every upload (photos and PDFs): labels it (meter, Proof of Completion, site report, safety certificate…), reads key details, checks it against the job, links it to the customer, lead and installer, and suggests who it goes to |
| `src/files/safety.ts` | Content checks before anything is sent: allowed file types, real type vs name, size, scripts in PDFs, macros, malware scan result, links in messages, sending limits |
| `src/contacts/finder.ts` | Finds a contact that isn't on file (e.g. a retailer) on the organisation's own website, under the contact rules; saves it unverified |
| `src/backend/overlay.ts` | Serves partner records from the AI store until the backend has a partners table |
| `src/screens/spec.ts` | Generated screens: approved components only, bindings are read actions, validated per viewer |
| `src/http` | HTTP API, local dev server, demo seed |
| `src/handlers` | Lambda entry points: API, AI consumer (SQS), contact-centre events |
| `infra/app.ts` | CDK stack (ap-southeast-2) |
| `policies/easylink.cedar` | The same rules in Cedar for Amazon Verified Permissions |

## Run locally

```
npm install
AI_MODE=local npm run dev          # http://localhost:8787, seeded demo data, tokens admin-local / installer-local
npm test                           # 35 tests
npm run typecheck
npm run synth                      # CDK template into cdk.out/ (no AWS calls)
```

Point the website at it with `AI_PLATFORM_URL=http://localhost:8787` and `AI_EVENT_INGEST_KEY=ingest-local`.

## Deploy (after review)

1. Create a deploy IAM role (not root) and an `ai-platform` ADMIN user in the backend; put its token in Secrets Manager `easylink/ai/service-token`.
2. Enable the Bedrock models in ap-southeast-2 and set `modelFastId` / `modelSmartId` (Australian inference profiles) in `cdk.json`, plus `backendApiBaseUrl`, `filesBucket`, `publicSiteUrl`.
3. Verify the SES sending domain and register the SMS sender ID / number.
4. `npx cdk deploy`. Copy the `ApiUrl` output to the web server as `AI_PLATFORM_URL`, and the `easylink/ai/ingest-key` secret as `AI_EVENT_INGEST_KEY`.
5. Put a Brave Search API key in `easylink/ai/search-api-key` so the AI can find contacts that aren't on file.
6. Point Amazon Connect's post-call (Contact Lens / Transcribe) and inbound SMS/email flows at the `ContactEventsFunction`.

## Backend changes needed (Express)

| Change | Why |
|---|---|
| Consent fields on customer and lead: `smsConsent`, `emailConsent`, `callConsent`, `marketingConsent`, `optedOut`, `dncrRegistered` | Spam Act and DNCR checks; STOP replies set `optedOut` |
| Columns on installer customer documents: `aiLabels` (json), `extracted` (json), `reviewState`, optional `s3Key` | Store AI labels on the record (until then they are kept in the AI store and merged in) |
| `GET /users/:id` and `GET /users?role=INSTALLER&search=<phone>` for admin tokens | Match installers who call in and message them on their own contact details |
| Move customer documents from `public/uploads` to a private S3 bucket, with GuardDuty Malware Protection for S3 on it | Today they are served publicly by URL and are lost if the instance is replaced; the scan result tag is what lets files be marked "clean" rather than "basic checks only" |
| A `partners` table (retailers, DNSPs, suppliers) and `retailer` / `retailerPartnerId` on customers | Partners live in the AI store until then; flip `storedIn` in the record registry |
| Emit events (or call `/v1/events`) from the backend itself | Changes made outside the website (imports, scripts) are then seen too |

Until these land, the platform works with what exists: consent defaults to "not given" (so marketing is refused), labels live in the AI store, and installers are matched only once the user search exists.
