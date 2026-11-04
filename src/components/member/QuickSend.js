import React from "react";
import { Send, UserRound } from "lucide-react";
import {
  listClass,
  listRowClass,
  listAvatarClass,
  listTitleClass,
  listMetaClass,
} from "./shared";

const nameOf = (fav) =>
  fav.name || fav.full_name || fav.phone || fav.value || "?";
// Phone-only favourites start with "+" or a digit: show a person, not that.
const Initial = ({ name }) =>
  /^\p{L}/u.test(name) ? (
    name.slice(0, 1).toUpperCase()
  ) : (
    <UserRound size={16} aria-hidden="true" />
  );

// Docked at the bottom of the phone: the top two; "See all" has the rest.
function QuickSend({ favourites, onSeeAll, onSelect }) {
  return (
    <div className="flex flex-col gap-3 shrink-0">
      <div className="flex items-center justify-between h-6">
        <h2 className="text-[0.95rem] font-bold m-0">Quick Send</h2>
        <button
          type="button"
          className="-mr-2 h-8 px-2 rounded-full text-gold font-medium text-[0.8rem] transition-colors hover:bg-white/[0.05]"
          onClick={onSeeAll}
        >
          See all
        </button>
      </div>

      {favourites.length === 0 ? (
        <p className="text-[0.8rem] text-muted-foreground m-0">
          The people you send to most will live here. Save one from Send.
        </p>
      ) : (
        <div className={`${listClass} -mt-1 stagger`}>
          {favourites.slice(0, 2).map((fav, idx) => {
            const name = nameOf(fav);
            const sub = fav.phone && fav.phone !== name ? fav.phone : fav.email;
            return (
              <button
                key={fav.id || idx}
                type="button"
                onClick={() => onSelect(fav)}
                className={`${listRowClass} group`}
              >
                <span className={listAvatarClass}>
                  <Initial name={name} />
                </span>
                <span className="flex-1 min-w-0">
                  <span className={`block ${listTitleClass}`}>{name}</span>
                  {sub && (
                    <span className={`block ${listMetaClass} mt-0.5`}>
                      {sub}
                    </span>
                  )}
                </span>
                <Send
                  size={15}
                  aria-hidden="true"
                  className="shrink-0 text-[var(--soft)] transition-colors group-hover:text-gold"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default QuickSend;
