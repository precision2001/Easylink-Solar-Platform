import { NextResponse } from "next/server";
import { AssumeRoleCommand, STSClient } from "@aws-sdk/client-sts";
import { backendAuthedFetch } from "@/lib/server/backend-authed-fetch";

/**
 * Signs the Operations Portal user in to the Amazon Connect phone without a
 * Connect password. The Connect instance (easylink-sso) uses SAML identity,
 * so a federated AWS session whose role session name is the Connect username
 * is enough: this route assumes `ConnectAgentFederation` as that username,
 * swaps the credentials for an AWS sign-in token and redirects to Connect's
 * federation endpoint, which opens the CCP.
 *
 * Streams opens this URL in its login popup (`loginUrl`), so the popup flashes
 * and closes and the embedded phone is ready.
 *
 * Server env:
 *   CONNECT_FEDERATION_USERS   optional JSON map of portal email -> Connect
 *                              username, used only when the backend has no
 *                              phone login for the user (GET /phone-logins/me,
 *                              which matches the Connect user's portalEmail tag)
 *   CONNECT_FEDERATION_ROLE_ARN  (default arn:aws:iam::193801312483:role/ConnectAgentFederation)
 *   CONNECT_SSO_INSTANCE_ID      (default b2647c8a-ce1c-45d7-9c24-3f6e983c4fad)
 *   CONNECT_REGION               (default ap-southeast-2)
 *   CONNECT_FEDERATION_DESTINATION (default /connect/home: a page with no
 *                              softphone, so the popup never competes with the
 *                              dialler's embedded phone for the call audio)
 */

export const dynamic = "force-dynamic";

const REGION = process.env.CONNECT_REGION || "ap-southeast-2";
const ROLE_ARN =
  process.env.CONNECT_FEDERATION_ROLE_ARN || "arn:aws:iam::193801312483:role/ConnectAgentFederation";
const INSTANCE_ID = process.env.CONNECT_SSO_INSTANCE_ID || "b2647c8a-ce1c-45d7-9c24-3f6e983c4fad";
const SESSION_SECONDS = 12 * 60 * 60;
const DESTINATION = process.env.CONNECT_FEDERATION_DESTINATION || "/connect/home";

function connectUsernameFor(email: string): string | null {
  try {
    const map = JSON.parse(process.env.CONNECT_FEDERATION_USERS || "{}") as Record<string, string>;
    for (const [k, v] of Object.entries(map)) {
      if (k.trim().toLowerCase() === email.trim().toLowerCase() && typeof v === "string" && v.trim()) return v.trim();
    }
  } catch {
    // Bad JSON in env: treat as no mapping.
  }
  return null;
}

function page(status: number, message: string) {
  // Shown in the small login popup.
  const html = `<!doctype html><meta charset="utf-8"><title>EasyLink phone</title>
<body style="font-family:system-ui,sans-serif;padding:24px;color:#1f2937">
<h3 style="margin:0 0 8px">Phone sign-in</h3><p>${message}</p></body>`;
  return new NextResponse(html, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function GET() {
  const me = await backendAuthedFetch("admin", "/users/me");
  if (!me.ok) return page(401, "Sign in to the Operations Portal first, then try the phone again.");
  const body = (await me.json().catch(() => null)) as
    | { email?: string; data?: { email?: string; user?: { email?: string } }; user?: { email?: string } }
    | null;
  const email = body?.email ?? body?.data?.email ?? body?.data?.user?.email ?? body?.user?.email;
  if (!email) return page(401, "Your portal session has no email address.");

  // The rep's phone login, from the Connect user tagged with their portal email.
  let username: string | null = null;
  const login = await backendAuthedFetch("admin", "/phone-logins/me");
  if (login.ok) {
    const j = (await login.json().catch(() => null)) as { username?: string; data?: { username?: string } } | null;
    username = j?.data?.username ?? j?.username ?? null;
  }
  username = username ?? connectUsernameFor(email);
  if (!username) {
    return page(403, `No phone login is set up for ${email}. Ask an admin to add one.`);
  }

  try {
    const sts = new STSClient({ region: REGION });
    const { Credentials: c } = await sts.send(
      new AssumeRoleCommand({ RoleArn: ROLE_ARN, RoleSessionName: username, DurationSeconds: 3600 }),
    );
    if (!c?.AccessKeyId || !c.SecretAccessKey || !c.SessionToken) throw new Error("no credentials");

    const session = encodeURIComponent(
      JSON.stringify({ sessionId: c.AccessKeyId, sessionKey: c.SecretAccessKey, sessionToken: c.SessionToken }),
    );
    const tokenRes = await fetch(
      `https://signin.aws.amazon.com/federation?Action=getSigninToken&SessionDuration=${SESSION_SECONDS}&Session=${session}`,
      { cache: "no-store" },
    );
    let tokenJson = (await tokenRes.json().catch(() => null)) as { SigninToken?: string } | null;
    if (!tokenJson?.SigninToken) {
      // SessionDuration is refused for some role sessions; fall back to the default length.
      const retry = await fetch(`https://signin.aws.amazon.com/federation?Action=getSigninToken&Session=${session}`, {
        cache: "no-store",
      });
      tokenJson = (await retry.json().catch(() => null)) as { SigninToken?: string } | null;
    }
    if (!tokenJson?.SigninToken) throw new Error("no sign-in token");

    const destination = encodeURIComponent(
      `https://${REGION}.console.aws.amazon.com/connect/federate/${INSTANCE_ID}?destination=${encodeURIComponent(DESTINATION)}`,
    );
    const url =
      `https://signin.aws.amazon.com/federation?Action=login&Issuer=${encodeURIComponent("easylink-portal")}` +
      `&Destination=${destination}&SigninToken=${encodeURIComponent(tokenJson.SigninToken)}`;
    return NextResponse.redirect(url, 302);
  } catch (err) {
    console.error("[connect-login] federation failed", err);
    return page(502, "The phone sign-in failed. Try again in a minute.");
  }
}
