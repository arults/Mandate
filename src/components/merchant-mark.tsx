import { BedDouble, Car, Plane } from "lucide-react";

import { merchantTextClass, type MerchantId } from "@/lib/merchants";

const marks: Record<MerchantId, { Icon: typeof BedDouble; label: string; frame: string }> = {
  hotel: { Icon: BedDouble, label: "Hotel", frame: "bg-hotel/10 text-hotel" },
  airline: { Icon: Plane, label: "Airline", frame: "bg-airline/10 text-airline" },
  rides: { Icon: Car, label: "Rides", frame: "bg-rides/10 text-rides" },
};

/** Icon plus the merchant hue. Pass decorative when the visible label already names the merchant. */
export function MerchantMark({
  id,
  decorative = false,
  framed = false,
  suspect = false,
}: {
  id: MerchantId;
  decorative?: boolean;
  /** Tinted square so the merchant reads before the words. */
  framed?: boolean;
  /** Dashed edge for a payee that only looks like this merchant. */
  suspect?: boolean;
}) {
  const { Icon, label, frame } = marks[id];
  const icon = (
    <Icon
      aria-hidden={decorative || framed ? true : undefined}
      aria-label={decorative || framed ? undefined : label}
      className={framed ? "size-4 shrink-0" : `size-4 shrink-0 ${merchantTextClass(id)}`}
      strokeWidth={1.75}
    />
  );
  if (!framed) return icon;
  return (
    <span
      className={`inline-flex size-8 shrink-0 items-center justify-center rounded-control border border-dashed ${frame} ${
        suspect ? "border-deny" : "border-transparent"
      }`}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : label}
    >
      {icon}
    </span>
  );
}
