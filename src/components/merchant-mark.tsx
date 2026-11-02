import { BedDouble, Car, Plane } from "lucide-react";

import { merchantTextClass, type MerchantId } from "@/lib/merchants";

const marks: Record<MerchantId, { Icon: typeof BedDouble; label: string }> = {
  hotel: { Icon: BedDouble, label: "Hotel" },
  airline: { Icon: Plane, label: "Airline" },
  rides: { Icon: Car, label: "Rides" },
};

/** Icon plus the merchant hue. Pass decorative when the visible label already names the merchant. */
export function MerchantMark({ id, decorative = false }: { id: MerchantId; decorative?: boolean }) {
  const { Icon, label } = marks[id];
  return (
    <Icon
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : label}
      className={`size-4 shrink-0 ${merchantTextClass(id)}`}
      strokeWidth={1.75}
    />
  );
}
