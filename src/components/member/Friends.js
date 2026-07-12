import React, { useState, useEffect } from "react";
import { djangoApis } from "../../utility/axiosInstance";

function Friends() {
  const [favourites, setFavourites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAllFavourites();
  }, []);

  const fetchAllFavourites = async () => {
    try {
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
      <div className="flex flex-col gap-4 text-muted-foreground">
        Loading your recipients...
      </div>
    );
  if (error)
    return (
      <div className="flex flex-col gap-4 text-muted-foreground">
        Error: {error}
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-center text-foreground m-0 text-xl font-bold">
        My Recipients ({favourites.length})
      </h2>

      {favourites.length === 0 ? (
        <p className="m-0 text-muted-foreground">
          You have no saved recipients yet.
        </p>
      ) : (
        <table className="w-full border-collapse table-fixed">
          <thead>
            <tr>
              <th className="px-3.5 py-3 text-left border-b border-border font-bold text-muted-foreground uppercase text-xs tracking-[0.04em]">
                Name
              </th>
              <th className="px-3.5 py-3 text-left border-b border-border font-bold text-muted-foreground uppercase text-xs tracking-[0.04em]">
                Email
              </th>
              <th className="w-[140px] px-3.5 py-3 text-left border-b border-border font-bold text-muted-foreground uppercase text-xs tracking-[0.04em]">
                Phone
              </th>
            </tr>
          </thead>
          <tbody>
            {favourites.map((fav, index) => (
              <tr
                key={fav.id}
                className={
                  index % 2 === 0
                    ? "bg-transparent transition-colors hover:bg-white/[0.05]"
                    : "bg-white/[0.02] transition-colors hover:bg-white/[0.05]"
                }
              >
                <td className="px-3.5 py-3 text-left border-b border-border text-foreground text-sm">
                  {fav.display_name || "—"}
                </td>
                <td className="px-3.5 py-3 text-left border-b border-border text-[var(--blue)] text-sm">
                  {fav.email || "—"}
                </td>
                <td className="w-[140px] px-3.5 py-3 text-left border-b border-border text-[var(--soft)] text-sm">
                  {fav.phone || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Friends;
