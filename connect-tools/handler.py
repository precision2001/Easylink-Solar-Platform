"""EasyLink tools for the Amazon Connect AI agent.

Amazon Connect -> Bedrock AgentCore Gateway (MCP) -> this Lambda -> EasyLink backend.

The gateway passes the tool name in context.client_context.custom
["bedrockAgentCoreToolName"] as "<target>___<tool>" and the tool's arguments as
the event. Each tool returns a small, plain dict the AI can read aloud: no
internal IDs beyond what the next tool needs, no costs or margins, no other
customers' details.

The backend is called as the AI service account (secret easylink/ai/service-token,
{"email","password"}), the same account the AI platform already uses.
"""
import json
import os
import re
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

import boto3

BASE = os.environ["BACKEND_API_BASE_URL"].rstrip("/")
SECRET_ID = os.environ.get("SERVICE_SECRET_ID", "easylink/ai/service-token")
STAFF_ID = os.environ.get("SITE_VISIT_STAFF_ID", "")  # who site visits and callbacks are booked for
SYD = ZoneInfo("Australia/Sydney")
SOURCE = "Phone - EasyLink AI"

_token = {"value": None, "exp": 0.0, "user": None}


# --------------------------------------------------------------------------- backend

def _login():
    raw = boto3.client("secretsmanager").get_secret_value(SecretId=SECRET_ID)["SecretString"]
    creds = json.loads(raw)
    status, body = _http("POST", "/auth/login", {"email": creds["email"], "password": creds["password"]}, token=None)
    data = (body or {}).get("data") or body or {}
    tok = data.get("accessToken") or (data.get("tokens") or {}).get("accessToken")
    if status != 200 or not tok:
        raise RuntimeError(f"EasyLink sign-in failed ({status})")
    _token.update(value=tok, exp=time.time() + 600, user=(data.get("user") or {}).get("id"))


def _http(method, path, body=None, token="auto"):
    if token == "auto":
        if not _token["value"] or _token["exp"] < time.time() + 30:
            _login()
        token = _token["value"]
    req = urllib.request.Request(BASE + path, method=method, data=json.dumps(body).encode() if body is not None else None)
    req.add_header("Accept", "application/json")
    req.add_header("Content-Type", "application/json")
    req.add_header("User-Agent", "easylink-connect-tools")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read() or b"{}")
        except Exception:
            return e.code, {}


def api(method, path, body=None):
    status, out = _http(method, path, body)
    if status == 401:  # token expired early: sign in once more
        _token["value"] = None
        status, out = _http(method, path, body)
    if status >= 400:
        raise ToolError((out or {}).get("message") or f"EasyLink returned {status}")
    return (out or {}).get("data", out)


class ToolError(Exception):
    pass


def qs(**params):
    """Query string with every value encoded ('+' in a time zone offset would otherwise read as a space)."""
    return urllib.parse.urlencode({k: v for k, v in params.items() if v is not None})


# --------------------------------------------------------------------------- helpers

def digits(phone):
    d = re.sub(r"\D", "", phone or "")
    if d.startswith("61"):
        d = "0" + d[2:]
    return d


def national(phone):
    """'+61 400 111 222' -> '0400111222'; anything else is kept as given."""
    d = digits(phone)
    return d if len(d) == 10 and d.startswith("0") else phone


def next_business_time(dt):
    """The first whole hour from dt that falls Mon-Fri 9am-5pm Sydney time."""
    dt = dt.astimezone(SYD)
    if dt.minute or dt.second or dt.microsecond:
        dt = dt.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
    while dt.weekday() >= 5 or dt.hour < 9 or dt.hour >= 17:
        dt = (dt + timedelta(days=1)).replace(hour=9) if dt.hour >= 17 or dt.weekday() >= 5 else dt.replace(hour=9)
    return dt


def suburb(address):
    if not address:
        return None
    parts = [p.strip() for p in address.split(",") if p.strip()]
    return ", ".join(parts[1:]) if len(parts) > 1 else None


def rows(data):
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        for k in ("leads", "items", "data", "appointments", "rows"):
            if isinstance(data.get(k), list):
                return data[k]
    return []


def find_lead(phone=None, email=None, lead_id=None):
    if lead_id:
        return api("GET", f"/leads/{lead_id}")
    for term in [digits(phone)[-9:] if phone else None, (email or "").strip().lower() or None]:
        if not term:
            continue
        found = rows(api("GET", "/leads?" + qs(limit=10, search=term)))
        if phone and term and found:
            found = [l for l in found if digits(l.get("customerPhone")).endswith(term)] or found
        if found:
            found.sort(key=lambda l: l.get("updatedAt") or l.get("createdAt") or "", reverse=True)
            return found[0]
    return None


def append_note(lead, text):
    stamp = datetime.now(SYD).strftime("%d %b %Y %H:%M")
    old = (lead.get("notes") or "").strip()
    note = f"[{stamp} EasyLink AI] {text.strip()}"
    api("PATCH", f"/leads/{lead['id']}", {"notes": (old + "\n\n" + note).strip()[:20000]})


def staff_id():
    return STAFF_ID or _token["user"]


def book(kind, lead_id, start, end, notes=None):
    """Book through /ai-bookings so the person chosen in the Operations Portal gets it."""
    try:
        body = {"kind": kind, "leadId": lead_id, "startAt": start.isoformat(), "endAt": end.isoformat()}
        if notes:
            body["notes"] = notes[:2000]
        return api("POST", "/ai-bookings", body)
    except ToolError as e:
        if "taken" in str(e).lower():
            raise ToolError("That time was just taken; offer another time.")
        raise


def sydney(dt_text):
    dt = datetime.fromisoformat(dt_text.replace("Z", "+00:00"))
    return dt.replace(tzinfo=SYD) if dt.tzinfo is None else dt.astimezone(SYD)


def say_time(dt):
    return dt.strftime("%A %d %B at %I:%M %p").replace(" 0", " ")


# --------------------------------------------------------------------------- tools

def find_customer(a):
    lead = find_lead(a.get("phone"), a.get("email"))
    if not lead:
        return {"found": False, "message": "No EasyLink record for this caller yet."}
    return {
        "found": True,
        "leadId": lead["id"],
        "firstName": None if lead.get("customerName") in (None, "", "Phone enquiry") else lead["customerName"].split(" ")[0],
        "area": suburb(lead.get("address")),
        "stage": lead.get("status"),
        "projectPhase": lead.get("projectPhase"),
        "hasDesign": bool(lead.get("designId")),
    }


def save_enquiry(a):
    name = " ".join(x for x in [a.get("firstName"), a.get("lastName")] if x).strip() or "Phone enquiry"
    details = [
        f"Interest: {', '.join(a['interests'])}" if a.get("interests") else None,
        f"Quarterly bill: ${a['quarterlyBill']}" if a.get("quarterlyBill") else None,
        f"Roof: {a['roof']}" if a.get("roof") else None,
        f"Timing: {a['timing']}" if a.get("timing") else None,
        f"Budget: {a['budget']}" if a.get("budget") else None,
        a.get("notes"),
    ]
    text = "; ".join(d for d in details if d)
    lead = find_lead(a.get("phone"), a.get("email"))
    if lead:
        # Fill gaps only; never overwrite details staff already hold.
        patch = {k: v for k, v in {"customerEmail": a.get("email"), "address": a.get("address")}.items() if v and not lead.get(k)}
        if patch:
            api("PATCH", f"/leads/{lead['id']}", patch)
        if text:
            append_note(lead, "Phone enquiry: " + text)
        return {"leadId": lead["id"], "created": False, "message": "Updated the existing record."}
    body = {
        "customerName": name,
        "customerPhone": national(a.get("phone")),
        "customerEmail": a.get("email"),
        "address": a.get("address"),
        "source": SOURCE,
        "notes": f"[{datetime.now(SYD).strftime('%d %b %Y %H:%M')} EasyLink AI] Phone enquiry: {text}" if text else None,
        # They called us and gave these details for this enquiry; no marketing consent is assumed.
        "consentCalls": True,
        "consentSms": bool(a.get("okToText", True)),
        "consentEmail": False,
    }
    created = api("POST", "/leads", {k: v for k, v in body.items() if v is not None})
    return {"leadId": created["id"], "created": True, "message": "Saved as a new enquiry."}


def site_visit_times(a):
    start = datetime.now(SYD).date() + timedelta(days=1)
    if a.get("fromDate"):
        start = max(start, datetime.fromisoformat(a["fromDate"]).date())
    days = min(int(a.get("days") or 5), 10)
    end = start + timedelta(days=days + 4)
    day0 = datetime(start.year, start.month, start.day, tzinfo=SYD)  # Sydney midnight, not UTC midnight
    # Busy times of whoever would get the visit (chosen in the Operations Portal > AI bookings).
    taken = rows(api("GET", "/ai-bookings/busy?" + qs(kind="SITE_VISIT", leadId=a.get("leadId"), **{"from": day0.isoformat()}, to=(day0 + timedelta(days=(end - start).days + 1)).isoformat())))
    busy = [(sydney(x["startAt"]), sydney(x["endAt"])) for x in taken]
    slots, d = [], start
    while len(slots) < 6 and d <= end:
        if d.weekday() < 5:  # Mon-Fri
            for hour in (9, 11, 13, 15):
                s = datetime(d.year, d.month, d.day, hour, tzinfo=SYD)
                e = s + timedelta(hours=1)
                if not any(s < be and e > bs for bs, be in busy):
                    slots.append({"start": s.isoformat(), "say": say_time(s)})
                    break  # one per day keeps the choice short
        d += timedelta(days=1)
    return {"times": slots, "message": "Offer two or three of these." if slots else "No free times found; offer a callback instead."}


def book_site_visit(a):
    lead = find_lead(lead_id=a["leadId"])
    s = sydney(a["start"])
    if s < datetime.now(SYD) + timedelta(hours=2):
        raise ToolError("That time has passed or is too soon; pick another time.")
    # The backend picks the person, re-checks the slot, assigns the lead and notifies them.
    out = book("SITE_VISIT", lead["id"], s, s + timedelta(hours=1), a.get("notes"))
    append_note(lead, f"Site visit booked for {say_time(s)}.")
    return {"booked": True, "say": say_time(s), "with": out.get("assignedTo"), "message": "Confirm the time and that they'll get a text."}


def indicative_price(a):
    panels = int(a.get("panelCount") or round(float(a.get("systemKw") or 6.6) / 0.44))
    body = {"panelCount": panels, "batteryKwh": float(a["batteryKwh"]) if a.get("batteryKwh") else None, "phase": a.get("phase")}
    if a.get("batteryKwh"):
        body["batteryOptionsKwh"] = [float(a["batteryKwh"])]
    out = api("POST", "/pricing/proposal", {k: v for k, v in body.items() if v is not None})
    totals = [v for v in (out.get("tierTotals") or {}).values() if isinstance(v, (int, float)) and v > 0]
    if not totals:
        raise ToolError("No price available for that size; offer a site visit for a quote.")
    lo, hi = min(totals), max(totals)
    return {
        "from": round(lo, -2),
        "to": round(hi, -2),
        "panels": panels,
        "includes": "supply and installation, after the federal STC discount" + (" and the federal battery rebate" if a.get("batteryKwh") else ""),
        "message": "Indicative only. The final price comes from a site visit and a written quote.",
    }


def job_status(a):
    lead = find_lead(a.get("phone"), a.get("email"), a.get("leadId"))
    if not lead:
        return {"found": False}
    phase = {
        "DESIGN_AND_PERMISSIONS": "design and network approval",
        "INSTALLATION": "installation",
        "COMMISSIONING": "commissioning and switch-on",
        "MAINTENANCE_AND_MONITORING": "installed and being monitored",
    }.get(lead.get("projectPhase"))
    upcoming = rows(api("GET", "/appointments?" + qs(limit=5, leadId=lead["id"], status="SCHEDULED", startFrom=datetime.now(SYD).isoformat())))
    nxt = min((sydney(x["startAt"]) for x in upcoming), default=None)
    return {
        "found": True,
        "leadId": lead["id"],
        "stage": lead.get("status"),
        "phase": phase,
        "nextBooking": say_time(nxt) if nxt else None,
    }


def request_callback(a):
    lead = find_lead(a.get("phone"), a.get("email"), a.get("leadId"))
    if not lead:
        lead = {"id": save_enquiry({"phone": a.get("phone"), "firstName": a.get("name"), "notes": a.get("reason")})["leadId"]}
        lead = find_lead(lead_id=lead["id"])
    asked = sydney(a["preferredTime"]) if a.get("preferredTime") else None
    when = next_business_time(max(asked or datetime.now(SYD), datetime.now(SYD) + timedelta(minutes=30)))
    book("CALLBACK", lead["id"], when, when + timedelta(minutes=15), f"Reason: {a.get('reason') or 'not given'}")
    append_note(lead, f"Callback requested for {say_time(when)}. Reason: {a.get('reason') or 'not given'}")
    return {"booked": True, "say": say_time(when)}


def report_service_issue(a):
    lead = find_lead(a.get("phone"), a.get("email"), a.get("leadId"))
    safety = bool(a.get("safetyIssue"))
    text = "; ".join(x for x in [
        "SAFETY ISSUE" if safety else None,
        f"Product: {a['product']}" if a.get("product") else None,
        f"Serial: {a['serial']}" if a.get("serial") else None,
        f"Fault: {a.get('fault')}",
    ] if x)
    if not lead:
        lead = find_lead(lead_id=save_enquiry({"phone": a.get("phone"), "firstName": a.get("name"), "notes": "Service: " + text})["leadId"])
    else:
        append_note(lead, "Service request: " + text)
    # Safety issues are flagged for the next 15 minutes, whatever the hour; others go to the next business hour.
    when = datetime.now(SYD) + timedelta(minutes=15) if safety else next_business_time(datetime.now(SYD) + timedelta(hours=1))
    book("SERVICE", lead["id"], when, when + timedelta(minutes=15), ("URGENT SAFETY. " if safety else "") + text)
    return {"logged": True, "urgent": safety, "callBack": say_time(when), "message": "A team member will call back." + (" Tell them to isolate the system if safe and call 000 if there is fire." if safety else "")}


def add_call_note(a):
    lead = find_lead(a.get("phone"), a.get("email"), a.get("leadId"))
    if not lead:
        return {"saved": False, "message": "No record to add the note to."}
    append_note(lead, a["note"][:2000])
    return {"saved": True}


TOOLS = {
    "find_customer": find_customer,
    "save_enquiry": save_enquiry,
    "site_visit_times": site_visit_times,
    "book_site_visit": book_site_visit,
    "indicative_price": indicative_price,
    "job_status": job_status,
    "request_callback": request_callback,
    "report_service_issue": report_service_issue,
    "add_call_note": add_call_note,
}


def handler(event, context):
    name = ""
    try:
        name = (context.client_context.custom or {}).get("bedrockAgentCoreToolName", "")
    except Exception:
        pass
    name = name.split("___")[-1] or (event or {}).pop("tool", "")
    fn = TOOLS.get(name)
    if not fn:
        return {"error": f"Unknown tool {name!r}"}
    try:
        return fn(event or {})
    except ToolError as e:
        return {"error": str(e)}
    except Exception as e:  # never leak a stack trace to the caller
        print(f"tool {name} failed: {e!r}")
        return {"error": "That didn't work just now. Offer to have a team member call back."}
