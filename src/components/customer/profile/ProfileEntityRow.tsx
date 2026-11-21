import { CustomerAvatar } from "@/components/customer/CustomerAvatar";

type Props = {
  title: string;
  subtitle: string;
  initialsOverride?: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarVariant?: "navy" | "gradient";
};

export function ProfileEntityRow({
  title,
  subtitle,
  initialsOverride,
  firstName,
  lastName,
  avatarVariant = "navy",
}: Props) {
  return (
    <div className="flex items-center gap-2.5">
      <CustomerAvatar
        size="sm"
        variant={avatarVariant}
        firstName={firstName}
        lastName={lastName}
        initialsOverride={initialsOverride}
      />
      <div className="min-w-0">
        <p
          className="font-dm-sans text-xs font-semibold leading-[18px] text-warm-ink"
          style={{ fontVariationSettings: "'opsz' 14" }}
        >
          {title}
        </p>
        <p
          className="mt-1 font-dm-sans text-[10px] font-normal leading-[15px] text-warm-gray"
          style={{ fontVariationSettings: "'opsz' 9" }}
        >
          {subtitle}
        </p>
      </div>
    </div>
  );
}
