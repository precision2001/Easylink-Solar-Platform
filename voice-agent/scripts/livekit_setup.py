"""Point EasyLink's phone calls at this agent in LiveKit.

Shows the SIP inbound trunks and dispatch rules in your LiveKit project, then
(with --apply) sets the dispatch rule for your Crazytel trunk to send every call to
the "easylink-voice" agent. Anything else on the rule (room prefix, recording to S3,
numbers) is kept.

    LIVEKIT_URL=wss://<project>.livekit.cloud LIVEKIT_API_KEY=... LIVEKIT_API_SECRET=... \\
        python scripts/livekit_setup.py            # look only
        python scripts/livekit_setup.py --apply    # route calls to the agent

Undo: run again with --agent "" to remove the agent from the rule.
"""

from __future__ import annotations

import argparse
import asyncio

from livekit import api


def describe_rule(r: api.SIPDispatchRuleInfo) -> str:
    kind = r.rule.WhichOneof("rule") or "?"
    detail = getattr(r.rule, kind, None)
    prefix = getattr(detail, "room_prefix", "") if detail else ""
    agents = [a.agent_name for a in r.room_config.agents] if r.HasField("room_config") else []
    egress = r.HasField("room_config") and r.room_config.HasField("egress")
    return (f"  rule {r.sip_dispatch_rule_id} '{r.name}': {kind}"
            f"{f' (rooms {prefix}…)' if prefix else ''}, trunks {list(r.trunk_ids) or 'all'}, "
            f"agents {agents or 'none'}, records to S3: {'yes' if egress else 'no'}")


async def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="change the rule (default: look only)")
    ap.add_argument("--agent", default="easylink-voice", help="agent name to dispatch ('' removes it)")
    ap.add_argument("--rule", help="dispatch rule id, if there's more than one")
    a = ap.parse_args()

    lk = api.LiveKitAPI()
    try:
        trunks = (await lk.sip.list_inbound_trunk(api.ListSIPInboundTrunkRequest())).items
        rules = (await lk.sip.list_dispatch_rule(api.ListSIPDispatchRuleRequest())).items
        print("Inbound trunks:")
        for t in trunks:
            print(f"  trunk {t.sip_trunk_id} '{t.name}': numbers {list(t.numbers)}, allowed addresses {list(t.allowed_addresses) or 'any'}")
        print("Dispatch rules:")
        for r in rules:
            print(describe_rule(r))
        if not rules:
            print("  none — create one in the LiveKit dashboard (Telephony → Dispatch rules) first.")
            return

        rule = next((r for r in rules if r.sip_dispatch_rule_id == a.rule), None) if a.rule else (rules[0] if len(rules) == 1 else None)
        if rule is None:
            print("\nMore than one rule: pass --rule <id>.")
            return
        if any(x.agent_name == a.agent for x in rule.room_config.agents) and a.agent:
            print(f"\nRule {rule.sip_dispatch_rule_id} already sends calls to '{a.agent}'.")
        elif not a.apply:
            print(f"\nWould set rule {rule.sip_dispatch_rule_id} to send calls to '{a.agent or '(no agent)'}'. Run with --apply.")
        else:
            new = api.SIPDispatchRuleInfo()
            new.CopyFrom(rule)
            del new.room_config.agents[:]
            if a.agent:
                new.room_config.agents.append(api.RoomAgentDispatch(agent_name=a.agent))
            updated = await lk.sip.update_dispatch_rule(rule.sip_dispatch_rule_id, new)
            print("\nUpdated:")
            print(describe_rule(updated))
        if rule.HasField("room_config") and rule.room_config.HasField("egress"):
            print("\nThis rule already records calls to S3, so the agent won't start a second recording.")
    finally:
        await lk.aclose()


if __name__ == "__main__":
    asyncio.run(main())
