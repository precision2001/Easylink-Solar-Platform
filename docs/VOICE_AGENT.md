# EasyLink phone agent

Callers ring the EasyLink number on Crazytel. Crazytel already sends calls to LiveKit
(SIP), which opens a room per call (`pstn-…`) and records it to
`s3://easylink-call-recordings/calls/<date>/`. This agent joins those rooms and runs the
call:

```
Crazytel ─SIP─▶ LiveKit Cloud ─room─▶ voice agent (Fargate, Sydney)
                                         ├─ Deepgram nova-3 en-AU   (hearing)
                                         ├─ Claude on Bedrock, au.*  (thinking, stays in Australia)
                                         ├─ Deepgram Aura 2 "Theia"  (speaking)
                                         └─ AI platform /voice/*     (who's calling, job steps, texts)
```

## What a call can do

| Caller | By phone | Sent as a link instead |
|---|---|---|
| Customer | confirm their system (their words are kept), pick install dates, sign documents with a texted code, hear where their job is | payments, photos, energy bills |
| Installer | accept or decline offers, accept the job, request photos or bills, record the network application and approval, confirm the quote, book and confirm delivery, send invoices, site documents, the STC pack and handover, close monitoring issues | on-site checklist, serial scans, test results |
| Unknown number | general questions; leave a message, emailed to the team (`STAFF_EMAIL`) | — |

**Verification:** caller ID can be faked, so the agent says nothing about a job until
the caller reads back a 6-digit code texted to the number on file. Limits: 3 codes and
5 tries per call; codes expire after 10 minutes. Staff numbers get no phone access.

**Records:** each call gets a transcript, saved next to its recording
(`<room>.transcript.json`), with every code masked. A note goes into the job's history
(what was done, and links to the recording and transcript).

## Code

- `src/http/voice.ts` (platform): the voice API.
- `test/voice.test.ts`: 7 tests.
- `voice-agent/easylink_voice/` (Python, LiveKit Agents 1.8):
  - `main.py`: entry point and call lifecycle
  - `agent.py`: what the agent says, and its tools
  - `platform.py`: client for the voice API
  - `records.py`: transcripts
- `voice-agent/tests/`: simulated calls. The real agent, session and platform run, with a scripted model standing in for Claude.

  Run them with `cd voice-agent && pip install . pytest pytest-asyncio && pytest`. That starts the platform locally with demo jobs.
- `voice-agent/scripts/livekit_setup.py`: points the LiveKit dispatch rule at this agent.
- `infra/voice.ts`: the `EasyLinkVoice` stack:
  - VPC with no NAT, and a Fargate service on ARM with 1 vCPU and 2 GB
  - 3 secrets to fill in
  - a log group kept for 3 months
- `.github/workflows/deploy.yml`: tests, then CDK deploy. It only runs when started by hand.

## Going live, in order

1. **Deploy access.** In IAM:
   - Create an OIDC identity provider for `token.actions.githubusercontent.com`.
   - Create a role `easylink-github-deploy` that trusts `repo:precision2001/easylink-solar-platform:*`. Give it AdministratorAccess to start with; narrow it after the first deploy.
   - Run `npx cdk bootstrap aws://193801312483/ap-southeast-2` once.
   - In the GitHub repo, add the secret `AWS_DEPLOY_ROLE_ARN`, plus the repo variables `BACKEND_API_BASE_URL` and `FILES_BUCKET`.
2. **Bedrock.** Submit Anthropic's use-case form once, in the Bedrock console in Sydney (Model catalog → any Anthropic model).
3. **Deploy with 0 agent tasks.** In Actions, run Deploy with `voice_tasks` = 0. This creates the empty secrets and the platform's voice key.
4. **Fill in the secrets** in Secrets Manager, choosing Plaintext and pasting JSON:
   - `easylink/voice/livekit`: `{"LIVEKIT_URL":"wss://…livekit.cloud","LIVEKIT_API_KEY":"…","LIVEKIT_API_SECRET":"…"}`
   - `easylink/voice/deepgram`: `{"DEEPGRAM_API_KEY":"…"}`
   - `easylink/voice/egress`: `{"EGRESS_AWS_ACCESS_KEY_ID":"…","EGRESS_AWS_SECRET_ACCESS_KEY":"…"}`. This is the `easylink-call-recording` user's key. It's only needed if the dispatch rule doesn't already record calls.
5. **Run Deploy again** with `voice_tasks` = 1. The agent registers with LiveKit as `easylink-voice`.
6. **Route the calls.** Run `python voice-agent/scripts/livekit_setup.py` to look, then add `--apply`. The script keeps the rule's recording and number settings.
7. **Test.** Call from the test customer's mobile and from the test installer's mobile, and check:
   - the code arrives
   - the steps work
   - the transcript appears in S3
   - the call note appears on the job
8. **Keep recordings long enough.** The bucket's rule deletes `calls/` after 90 days. Change it to 12 months, and keep contract calls for 7 years. Do this before going live.

**Undo:** run `livekit_setup.py --apply --agent ""` to take the agent off the rule, or run Deploy with `voice_tasks` = 0.

## Cost (approximate)

- **Fargate:** ARM, 1 vCPU and 2 GB, always on: about A$45 a month.
- **Public IP:** about A$5 a month.
- **Deepgram and Bedrock:** cents per call minute.
- **LiveKit and Crazytel:** per their plans.
- **Saving:** scale to 0 tasks outside business hours if wanted.
