/** Who a travel ask is paying. Color and icon are a scan cue; the words stay. */
export type MerchantId = "hotel" | "airline" | "rides";

export function merchantTextClass(id: MerchantId): string {
  if (id === "hotel") return "text-hotel";
  if (id === "airline") return "text-airline";
  return "text-rides";
}

export function merchantOf(recipient: string): MerchantId | null {
  const id = recipient.trim().toLowerCase();
  if (id === "hotel.near" || id === "hote1.near") return "hotel";
  if (id === "airline.near") return "airline";
  if (id === "rides.near") return "rides";
  return null;
}
