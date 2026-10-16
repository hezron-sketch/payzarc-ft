import React, { useState, useEffect } from "react";
import { ChevronRight, UsersRound } from "lucide-react";
import { djangoApis } from "../../utility/axiosInstance";

function Friends({ onSelectFriend }) {
  const [favourites, setFavourites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAllFavourites();
  }, []);

  const fetchAllFavourites = async () => {
    try {
      // No local token pre-check: the API client attaches the token and its
      // 401 handling owns "session expired" — a second gate here only broke
      // dev bypass mode and duplicated the logic.
      const response = await djangoApis.system2.get("/api/favorites/all/");
      const result = response.data;

      if (result.success) {
        setFavourites(result.favourites || []);
      } else {
        setError(result.message || "Failed to load recipients");
      }
    } catch (err) {
      console.error("Full error:", err);
      if (err.response) {
        setError(
          `Server error: ${err.response.data.message || "Unknown error"}`,
        );
      } else if (err.request) {
        setError("Cannot connect to server. Is Django running?");
      } else {
        setError("Request error: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="flex flex-col gap-4 text-muted-foreground text-sm py-6 text-center">
        Loading your recipients...
      </div>
    );
  if (error)
    return (
      <div className="flex flex-col gap-4 text-muted-foreground text-sm py-6 text-center">
        Error: {error}
      </div>
    );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[0.7rem] font-bold text-muted-foreground uppercase tracking-[0.06em]">
          Friends
        </span>
        <span className="text-[0.7rem] font-bold text-gold bg-gold/10 rounded-full px-2 py-0.5 min-w-[1.4rem] text-center">
          {favourites.length}
        </span>
      </div>

      {favourites.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <div className="w-11 h-11 rounded-full bg-white/[0.04] text-muted-foreground flex items-center justify-center">
            <UsersRound size={20} />
          </div>
          <p className="m-0 text-muted-foreground text-sm">
            You have no saved recipients yet.
          </p>
        </div>
      ) : (
        // iOS-style contact rows — name is the only thing every recipient is
        // guaranteed to have, so it's the sole primary line; the subtitle
        // picks whichever single contact detail (phone, then email) is most
        // useful for sending money, instead of cramming both into a table
        // that has to squeeze three columns into a phone-width card.
        // Tapping a row jumps straight to the send-money flow with that
        // recipient preselected, same as the Quick Send tiles on Home.
        <div className="flex flex-col gap-1 stagger">
          {favourites.map((fav) => {
            const name = fav.display_name || "—";
            const subtitle = fav.phone || fav.email || "";
            return (
              <button
                key={fav.id}
                type="button"
                onClick={() => onSelectFriend?.(fav)}
                className="w-full flex items-center gap-3 p-3 rounded-sm bg-white/[0.03] border border-white/[0.06] text-left transition-colors duration-200 hover:border-gold/30 hover:bg-white/[0.05]"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold/35 to-gold/15 text-gold font-bold flex items-center justify-center border border-[rgba(var(--gold-rgb),0.3)] text-sm shrink-0">
                  {name.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate m-0">
                    {name}
                  </p>
                  {subtitle && (
                    <p className="text-xs text-muted-foreground truncate m-0 mt-0.5">
                      {subtitle}
                    </p>
                  )}
                </div>
                <ChevronRight
                  size={16}
                  className="text-muted-foreground shrink-0"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default Friends;
