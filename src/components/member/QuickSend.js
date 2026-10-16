import React from "react";
import { Send } from "lucide-react";

// Resting content of the phone screen: the first three favourites, each a
// one-tap shortcut into Send with that recipient pre-filled.
function QuickSend({ favourites, onSeeAll, onSelect }) {
  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold m-0">Quick Send</h2>
        <button
          type="button"
          className="-mr-2 h-9 px-2 rounded-full text-gold font-medium text-[0.8rem] transition-colors hover:bg-white/[0.05]"
          onClick={onSeeAll}
        >
          See all
        </button>
      </div>

      {favourites.length === 0 ? (
        <p className="text-[0.85rem] text-muted-foreground">
          No saved recipients yet — add one from Send Money.
        </p>
      ) : (
        <div className="pt-4 border-t border-white/[0.04] flex flex-col gap-1 stagger">
          {favourites.slice(0, 3).map((fav, idx) => {
            const name =
              fav.name || fav.full_name || fav.phone || fav.value || "?";
            const sub = fav.phone || fav.email || "";
            return (
              <button
                key={fav.id || idx}
                type="button"
                onClick={() => onSelect(fav)}
                className="w-full flex items-center gap-3 p-3 rounded-sm bg-white/[0.03] border border-white/[0.06] transition-colors duration-200 hover:border-gold/30 hover:bg-white/[0.05] group"
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gold/35 to-gold/15 text-gold font-bold flex items-center justify-center border border-[rgba(var(--gold-rgb),0.3)] text-xs shrink-0">
                  {name.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-[0.9rem] font-semibold text-foreground truncate m-0">
                    {name}
                  </p>
                  {sub && (
                    <p className="text-[0.8rem] text-muted-foreground truncate m-0">
                      {sub}
                    </p>
                  )}
                </div>
                <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center transition-colors group-hover:bg-gold/10 shrink-0">
                  <Send
                    size={14}
                    aria-hidden="true"
                    className="text-muted-foreground transition-colors group-hover:text-gold"
                  />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

export default QuickSend;
