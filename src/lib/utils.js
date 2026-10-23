import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function phoneScreenContainer() {
  const el =
    typeof document !== "undefined" &&
    document.querySelector("[data-phone-screen]");
  return el && el.getClientRects().length ? el : undefined;
}
