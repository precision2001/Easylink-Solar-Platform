"use client";

import { useEffect, useState } from "react";
import type { AiPortal } from "@/lib/ai-platform/client";
import { jobs, type SignatureView } from "@/lib/ai-platform/jobs";
import { Btn, DocFrame, Field, inputCls, Modal, type JobCtl } from "./ui";

/**
 * Sign a document: read it as stored, get a one-time code by SMS, type your
 * name and the code. The signed copy gets a signature record page.
 */
export function SignFlow({ portal, ctl, sig, onClose }: { portal: AiPortal; ctl: JobCtl; sig: SignatureView; onClose: () => void }) {
  const [html, setHtml] = useState<string | null>(null);
  const [sent, setSent] = useState<{ sentTo: string; devCode?: string } | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState(sig.signer.name);
  const [agree, setAgree] = useState(false);

  useEffect(() => {
    jobs.signatureDoc(portal, sig.id).then((d) => setHtml(d.html), () => setHtml("<p>Couldn't load the document.</p>"));
  }, [portal, sig.id]);

  const signed = sig.status === "signed";
  return (
    <Modal title={signed ? `${sig.title} (signed)` : `Sign: ${sig.title}`} onClose={onClose} wide>
      <div className="flex flex-col gap-3">
        {html ? <DocFrame html={html} title={sig.title} /> : <p className="text-[14px] text-[#475569]">Loading the document…</p>}
        {!signed && (
          <div className="flex flex-col gap-3 rounded-[12px] border border-[#E3E8EF] bg-[#F8FAFC] p-3">
            <label className="flex items-start gap-2 text-[13.5px] text-[#0F172A]">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1" />
              I have read this document and agree to it.
            </label>
            {!sent ? (
              <div className="flex flex-wrap items-center gap-2">
                <Btn
                  disabled={!agree || ctl.busy != null}
                  onClick={async () => {
                    const r = await ctl.act<{ sentTo: string; devCode?: string }>("request_code", { signatureId: sig.id });
                    if (r) setSent(r);
                  }}
                >
                  Send my signing code
                </Btn>
                <span className="text-[12.5px] text-[#475569]">We text a 6-digit code to the mobile on file for {sig.signer.name}.</span>
              </div>
            ) : (
              <form
                className="flex flex-wrap items-end gap-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const r = await ctl.act("sign", { signatureId: sig.id, code: code.trim(), name: name.trim() }, `${sig.title} signed.`);
                  if (r) onClose();
                }}
              >
                <Field label="Your full name">
                  <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
                </Field>
                <Field label={`Code sent to ${sent.sentTo}`} hint={sent.devCode ? `Test mode: the code is ${sent.devCode}` : "It expires in 10 minutes."}>
                  <input className={`${inputCls} w-[120px] tracking-[0.3em]`} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" required />
                </Field>
                <Btn type="submit" disabled={code.length !== 6 || !name.trim() || ctl.busy != null}>
                  Sign
                </Btn>
              </form>
            )}
            {ctl.error && <p role="alert" className="m-0 text-[13px] text-[#991B1B]">{ctl.error}</p>}
          </div>
        )}
      </div>
    </Modal>
  );
}
