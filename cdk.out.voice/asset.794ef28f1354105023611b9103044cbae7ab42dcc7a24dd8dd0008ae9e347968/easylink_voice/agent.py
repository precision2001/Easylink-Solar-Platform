"""The EasyLink voice agent: what it says, and the job steps it can take on a call."""

from __future__ import annotations

import json
from typing import Any, Literal

from livekit.agents import Agent, RunContext, ToolError, function_tool

from .platform import Platform, PlatformError

CUSTOMER_STEPS = ("confirm_selection", "request_code", "sign", "pick_window")
INSTALLER_STEPS = (
    "accept_offer", "decline_offer", "accept_job", "request_photos", "propose_windows",
    "submit_connection", "record_approval", "request_bills", "confirm_quote",
    "book_delivery", "mark_delivered", "send_invoice", "send_site_docs", "send_stc_pack",
    "send_handover", "resolve_issue", "request_code",
)
Step = Literal[
    "confirm_selection", "request_code", "sign", "pick_window",
    "accept_offer", "decline_offer", "accept_job", "request_photos", "propose_windows",
    "submit_connection", "record_approval", "request_bills", "confirm_quote",
    "book_delivery", "mark_delivered", "send_invoice", "send_site_docs", "send_stc_pack",
    "send_handover", "resolve_issue",
]

INSTRUCTIONS = """You are EasyLink AI, the phone assistant for {business}, an Australian solar and battery company. You are on a live phone call.

How you speak
- Australian English. Warm, plain and brief: one or two short sentences per turn, then let them talk.
- This is speech, not text: no lists, symbols, bullet points or markdown. When several things are needed, say how many, then go through them one at a time ("There are two things left. First, ... Second, ...").
- Say money as "seventeen thousand, nine hundred and ninety dollars", dates as "Monday the twenty-sixth of October", and read reference numbers digit by digit.
- Never read out a code, card number or password. Never take card details by phone: text a payment link instead.

Who you're talking to
- {caller}
- Before you say or do anything about a job, verify the caller: call send_verification_code, ask them to read back the six-digit code from the text message, then call verify_code. If they can't receive texts, offer to have the team call back and use leave_message.
- If the number isn't on an EasyLink account, help with general questions about solar, batteries and rebates, and offer leave_message so the team can call them back. Don't guess at anyone's details.

Doing things
- After verification you know their jobs. Use get_job for the latest detail. Do steps only with do_step, and only the ones listed for them. Before any step that commits them (confirming a selection, accepting or declining a job, picking dates, signing), repeat back what will happen in one sentence and get a clear yes.
- For confirm_selection, put the caller's own words of agreement in "transcript".
- To sign a document: they should have read it first. Offer text_link with what "sign" if they haven't. Then request_code for that signatureId; the signing code goes to their phone; they read it to you; then sign with that code.
- Uploads (photos, energy bills, payment screenshots) and payments happen in the portal: use text_link and tell them the link is on its way.
- If a step is refused, explain the reason in plain words and what happens instead. Don't retry the same thing.
- When they're done, thank them and call end_call.
"""


class EasyLinkAgent(Agent):
    def __init__(self, platform: Platform, known: bool, kind: str | None, business: str = "EasyLink Solar") -> None:
        caller = (
            f"This number is on an EasyLink {kind} account (not verified yet)."
            if known
            else "This number isn't on an EasyLink account."
        )
        super().__init__(instructions=INSTRUCTIONS.format(business=business, caller=caller))
        self.platform = platform
        self.known = known
        self.kind = kind
        self.verified = False
        self.first_name = ""
        self.job_ids: list[str] = []
        self.current_job: str | None = None
        self.messages_left: list[str] = []
        # Codes read out on this call, masked in the stored transcript.
        self.secrets: set[str] = set()
        self.ended = False

    # ---------- helpers ----------
    def _job(self, job_id: str | None) -> str:
        if not self.verified:
            raise ToolError("Verify the caller first (send_verification_code, then verify_code).")
        jid = job_id or self.current_job or (self.job_ids[0] if self.job_ids else None)
        if not jid:
            raise ToolError("This caller has no jobs with EasyLink.")
        if jid not in self.job_ids:
            raise ToolError("That isn't one of this caller's jobs.")
        self.current_job = jid
        return jid

    @staticmethod
    def _say(data: Any) -> str:
        return json.dumps(data, ensure_ascii=False, default=str)

    # ---------- tools ----------
    @function_tool
    async def send_verification_code(self, context: RunContext) -> str:
        """Text a six-digit code to the caller's number so they can prove it's them. Use this before anything about a job."""
        if not self.known:
            raise ToolError("This number isn't on an EasyLink account, so there's nothing to verify.")
        try:
            r = await self.platform.send_code()
        except PlatformError as e:
            raise ToolError(e.message) from e
        return f"Code sent by text to the {r.get('sentTo', 'number on file')}. Ask them to read it out."

    @function_tool
    async def verify_code(self, context: RunContext, code: str) -> str:
        """Check the six-digit code the caller read out.

        Args:
            code: The digits the caller said, e.g. "4 8 1 2 0 9".
        """
        self.secrets.add(code)
        try:
            r = await self.platform.verify(code)
        except PlatformError as e:
            raise ToolError(e.message) from e
        self.verified = True
        self.first_name = r.get("firstName") or ""
        self.kind = r.get("kind") or self.kind
        jobs = r.get("jobs") or []
        self.job_ids = [j["id"] for j in jobs]
        self.current_job = self.job_ids[0] if len(self.job_ids) == 1 else None
        return self._say({"verified": True, "firstName": self.first_name, "role": self.kind, "jobs": jobs,
                          "stepsTheyCanDoByPhone": list(CUSTOMER_STEPS if self.kind == "customer" else INSTALLER_STEPS)})

    @function_tool
    async def get_job(self, context: RunContext, job_id: str | None = None) -> str:
        """The latest on one of the caller's jobs: stage, their next steps, what's waiting on others, dates, invoices and documents.

        Args:
            job_id: Which job. Leave empty if they have only one.
        """
        jid = self._job(job_id)
        try:
            return self._say(await self.platform.job(jid))
        except PlatformError as e:
            raise ToolError(e.message) from e

    @function_tool
    async def do_step(
        self,
        context: RunContext,
        step: Step,
        job_id: str | None = None,
        transcript: str | None = None,
        signature_id: str | None = None,
        code: str | None = None,
        window_id: str | None = None,
        reason: str | None = None,
        label: str | None = None,
        reference: str | None = None,
        approval_number: str | None = None,
        export_limit_kw: float | None = None,
        conditions: str | None = None,
        carrier: str | None = None,
        delivery_window: str | None = None,
        note: str | None = None,
        invoice_id: str | None = None,
        issue_number: int | None = None,
        changes: list[str] | None = None,
        new_price: float | None = None,
    ) -> str:
        """Do a job step for the verified caller. Only after they've said yes to it.

        Args:
            step: The step. Customers: confirm_selection, request_code, sign, pick_window. Installers: the others.
            job_id: Which job. Leave empty if they have only one.
            transcript: confirm_selection: the caller's own words agreeing to their system.
            signature_id: request_code and sign: the document's signatureId from get_job.
            code: sign: the six-digit signing code the caller read out.
            window_id: pick_window: the windowId of the dates they chose.
            reason: accept_offer or decline_offer: why, in their words.
            label: request_photos: which photo is needed, e.g. "Meter box with the door open".
            reference: submit_connection: the network's application reference.
            approval_number: record_approval: the approval number.
            export_limit_kw: record_approval: the approved export limit in kW.
            conditions: record_approval: any conditions on the approval.
            carrier: book_delivery: who is delivering.
            delivery_window: book_delivery: when, e.g. "Friday morning".
            note: book_delivery or mark_delivered: anything to note.
            invoice_id: send_invoice: the invoiceId from get_job.
            issue_number: resolve_issue: which open monitoring issue, counting from 0.
            changes: confirm_quote: what changed after the bills, one item each.
            new_price: confirm_quote: the new total price in dollars, if it changed.
        """
        jid = self._job(job_id)
        allowed = CUSTOMER_STEPS if self.kind == "customer" else INSTALLER_STEPS
        if step not in allowed:
            raise ToolError(f"{step} isn't something this caller can do. Offer text_link instead.")
        fields = {
            "transcript": transcript, "signatureId": signature_id, "code": code, "windowId": window_id,
            "reason": reason, "label": label, "reference": reference, "number": approval_number,
            "exportLimitKw": export_limit_kw, "conditions": conditions, "carrier": carrier,
            "window": delivery_window, "note": note, "invoiceId": invoice_id, "index": issue_number,
            "changes": changes, "newPrice": new_price,
        }
        if code:
            self.secrets.add(code)
        payload = {k: v for k, v in fields.items() if v is not None and v != ""}
        try:
            r = await self.platform.step(jid, step, payload)
        except PlatformError as e:
            raise ToolError(e.message) from e
        result = r.get("result")
        if isinstance(result, dict):
            # A test setup returns the code it texted; the model must never see or say it.
            if result.get("devCode"):
                self.secrets.add(str(result["devCode"]))
            result = {k: v for k, v in result.items() if k not in ("devCode", "code")}
        return self._say({"done": step, "result": result, "job": r.get("job")})

    @function_tool
    async def text_link(self, context: RunContext, what: Literal["pay", "photos", "bill", "documents", "sign", "job"], job_id: str | None = None) -> str:
        """Text the caller a link to do something in the portal (pay, upload photos or a bill, read or sign documents).

        Args:
            what: What the link is for.
            job_id: Which job. Leave empty if they have only one.
        """
        jid = self._job(job_id)
        try:
            await self.platform.link(jid, what)
        except PlatformError as e:
            raise ToolError(e.message) from e
        return "Link sent by text."

    @function_tool
    async def leave_message(self, context: RunContext, message: str) -> str:
        """Leave a message for the EasyLink team to call the person back (questions you can't answer, or unverified callers).

        Args:
            message: What they need, and the best time to call back.
        """
        self.messages_left.append(message[:600])
        return "Message noted. The team will call back on this number."

    @function_tool
    async def end_call(self, context: RunContext) -> str:
        """Hang up, after you've said goodbye."""
        self.ended = True
        await context.wait_for_playout()
        from livekit.agents import get_job_context

        try:
            get_job_context().shutdown(reason="agent ended the call")
        except RuntimeError:
            pass  # not in a LiveKit job (tests)
        return "Call ended."
