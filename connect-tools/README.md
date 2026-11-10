# EasyLink tools for the Amazon Connect AI agent

Amazon Connect AI agent → Bedrock AgentCore Gateway (MCP, JWT from the Connect instance) → Lambda `easylink-connect-tools` → EasyLink backend.

| Tool | Does |
|---|---|
| find_customer | Finds the caller by phone (any format) or email: first name, area, stage, phase |
| save_enquiry | Creates or updates the enquiry (fills gaps, never overwrites staff details; notes are appended) |
| site_visit_times | Free one-hour weekday slots, Sydney time |
| book_site_visit | Books a slot (re-checks for clashes) and notes it on the lead |
| indicative_price | Range from the public proposal pricing (after STCs and the battery rebate) |
| job_status | Stage, project phase and next booking |
| request_callback | Callback in the next business hour (Mon–Fri 9–5) |
| report_service_issue | Service note + callback; safety issues flagged within 15 minutes |
| add_call_note | Appends a note to the lead |

## AWS (ap-southeast-2, account 193801312483, tag project=easylink-voice-ai)
- CloudFormation stack `EasyLinkConnectTools` (Lambda, inline code from `handler.py`; template copy in s3://easylink-test-deploy-193801312483/connect-tools/template.json)
- IAM roles `easylink-connect-tools-fn` (logs + read the login secret) and `easylink-connect-tools-gateway` (invoke the Lambda)
- Gateway `easylink-connect-tools-a9qymsyddk` (MCP 2025-06-18, JWT discovery `https://easylink.my.connect.aws/.well-known/openid-configuration`, audience `easylink-tools`), target `easylink` with `tools.json`
- Connect integration: AppIntegrations application "EasyLink tools" (namespace `easylink-tools`) associated with instance `easylink`

## Settings
- `BACKEND_API_BASE_URL`: now the TEST backend (`https://test-api.easylinksolar.com.au/api/v1`) with secret `easylink/test/connect-tools-login`. Switch to `https://api.easylinksolar.com.au/api/v1` and `easylink/ai/service-token` for live.
- `SITE_VISIT_STAFF_ID`: the user site visits and callbacks are booked for; empty means the signed-in service account.
- Needs backend lead search by phone (solar_panel_backend `feat/lead-search-by-phone`).
