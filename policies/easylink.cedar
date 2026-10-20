// EasyLink AI platform policies for Amazon Verified Permissions (spec 8.2).
// The local evaluator in src/policy/policy.ts mirrors these rules; keep both in step
// (test/policy.test.ts covers each rule with allow and deny cases).

// Staff can run any generic action; the existing backend still applies its RBAC.
permit (principal in EasyLink::Role::"staff", action, resource);

// Installers and customers may act on records they own.
permit (
  principal in EasyLink::Role::"installer",
  action in [EasyLink::Action::"get_record", EasyLink::Action::"list_files", EasyLink::Action::"get_file_link",
             EasyLink::Action::"update_record", EasyLink::Action::"create_task"],
  resource
) when { resource has ownerInstaller && resource.ownerInstaller == principal };

permit (
  principal in EasyLink::Role::"customer",
  action in [EasyLink::Action::"get_record", EasyLink::Action::"list_files", EasyLink::Action::"get_file_link"],
  resource
) when { resource has ownerCustomer && resource.ownerCustomer == principal };

// Agents may use every generic action, limited by the forbids below and by autonomy levels.
permit (principal in EasyLink::Role::"agent", action, resource);

// Visitors cannot act.
forbid (principal in EasyLink::Role::"visitor", action, resource)
unless { action == EasyLink::Action::"search_memory" };

// Messages and calls only to contact details already on a record.
forbid (
  principal,
  action in [EasyLink::Action::"send_message", EasyLink::Action::"place_call"],
  resource
) unless { context.recipient_resolved_from_record || principal in EasyLink::Role::"staff" };

// Respect opt-outs.
forbid (principal, action in [EasyLink::Action::"send_message", EasyLink::Action::"place_call"], resource)
when { context.recipient_opted_out };

// Marketing messages need consent (Spam Act 2003).
forbid (principal, action == EasyLink::Action::"send_message", resource)
when { context.purpose == "marketing" && !context.recipient_marketing_consent };

// Telemarketing Industry Standard 2017 hours and the Do Not Call Register.
forbid (principal, action == EasyLink::Action::"place_call", resource)
when {
  context.purpose == "marketing" &&
  (!context.within_acma_hours || (context.dncr_registered && !context.recipient_call_consent))
};

// Agent SMS quiet hours (8pm–8am recipient time).
forbid (principal in EasyLink::Role::"agent", action == EasyLink::Action::"send_message", resource)
when { context.channels.contains("sms") && !context.within_sms_hours };
