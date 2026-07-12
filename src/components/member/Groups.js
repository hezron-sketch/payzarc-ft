import React from "react";
import { AlertTriangle, Flower2, Heart } from "lucide-react";

const fundButtonClass =
  "flex items-center justify-center gap-2 w-full px-[0.9rem] py-[0.9rem] text-base font-semibold border border-input rounded-md bg-white/[0.04] text-foreground transition-colors hover:border-gold hover:bg-[var(--gold-pale)] hover:text-gold hover:-translate-y-px active:translate-y-0 active:scale-[0.98]";

function Groups() {
  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-center text-foreground m-0 text-xl font-bold">
        Group Fund
      </h2>
      <div className="flex flex-col gap-3">
        <button className={fundButtonClass}>
          <AlertTriangle size={18} /> Emergency
        </button>
        <button className={fundButtonClass}>
          <Flower2 size={18} /> Funeral
        </button>
        <button className={fundButtonClass}>
          <Heart size={18} /> Wedding
        </button>
      </div>
      <button className="w-full px-[0.9rem] py-[0.9rem] text-base font-bold border-none rounded-md bg-gold text-black transition-all hover:bg-[var(--gold-dark)] hover:-translate-y-px active:translate-y-0 active:scale-[0.98]">
        + Create Group
      </button>
    </div>
  );
}

export default Groups;
