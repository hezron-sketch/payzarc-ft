import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Where Radix dialogs/sheets portal to: the dashboard's phone screen layer
// (Dashboard.js, data-phone-screen) while the framed mobile shell is
// showing, so they open inside the phone instead of over the whole window.
// undefined = Radix's default (document.body), e.g. on desktop, where the
// layer is display:none and has no client rects.
export function phoneScreenContainer() {
  const el =
    typeof document !== "undefined" &&
    document.querySelector("[data-phone-screen]");
  return el && el.getClientRects().length ? el : undefined;
}
