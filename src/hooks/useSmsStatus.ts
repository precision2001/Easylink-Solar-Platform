"use client";

import { useEffect, useState } from "react";
import { fetchSmsStatus, type SmsStatus } from "@/lib/sms-status";

type Portal = "admin" | "installer";

// One request per portal per minute, however many SMS controls are on screen.
const cache = new Map<Portal, { at: number; promise: Promise<SmsStatus> }>();
const TTL_MS = 60_000;

function load(portal: Portal): Promise<SmsStatus> {
  const hit = cache.get(portal);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.promise;
  const promise = fetchSmsStatus(portal);
  cache.set(portal, { at: Date.now(), promise });
  return promise;
}

/**
 * Whether texts can go out from this portal right now. null while loading;
 * falls back to "off" (email only) when the status can't be read.
 */
export function useSmsStatus(portal: Portal): SmsStatus | null {
  const [status, setStatus] = useState<SmsStatus | null>(null);
  useEffect(() => {
    let live = true;
    void load(portal).then((s) => live && setStatus(s));
    return () => {
      live = false;
    };
  }, [portal]);
  return status;
}
