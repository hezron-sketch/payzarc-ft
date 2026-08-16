import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import axiosInstance, {
  contactsApi,
  transactionsApi,
} from "../../utility/axiosInstance";
import { API_URL } from "../../utility/constants";
import Home from "./Home";
import Groups from "./Groups";
import Friends from "./Friends";
import History from "./History";
import PaymentMethods from "./PaymentMethods";
import Notifications from "./Notifications";

import {
  Search,
  Bell,
  ArrowDownCircle,
  ShieldAlert,
  CheckCircle2,
  LayoutDashboard,
  UsersRound,
  History as HistoryIcon,
  UserRound,
  Send,
} from "lucide-react";

// Bottom tab bar — mobile-only nav so switching between top-level sections
// doesn't depend on the topbar's cramped icon row or on stumbling onto the
// "View all" / "Groups" links buried inside Home's content. "send" is
// rendered as a raised center FAB instead of a regular tab (see the "fab"
// flag below) — same visual idea as the reference design's floating
// transfer button.
const MOBILE_NAV_TABS = [
  { key: "home", label: "Home", icon: LayoutDashboard },
  { key: "groups", label: "Groups", icon: UsersRound },
  { key: "send", label: "Send", icon: Send, fab: true },
  { key: "history", label: "History", icon: HistoryIcon },
  { key: "account", label: "Account", icon: UserRound },
];

// Same type -> icon mapping as the full Notifications.js page, reused here
// for the topbar's notification preview dropdown so both stay in sync.
const NOTIFICATION_ICONS = {
  receive: ArrowDownCircle,
  security: ShieldAlert,
  transaction: CheckCircle2,
};

const DEV_BYPASS_AUTH = process.env.REACT_APP_BYPASS_AUTH === "true";

// Top-bar search results — static services plus whatever friends match.
const SEARCH_SERVICES = [
  { id: "send", label: "Send Money", section: "send" },
  { id: "add-money", label: "Add Money", section: "add-money" },
  { id: "withdraw", label: "Withdraw", section: "withdraw" },
  { id: "groups", label: "Groups", section: "groups" },
];

const searchResultItemClass =
  "flex items-center justify-between gap-2 w-full bg-transparent border-none text-foreground text-[0.85rem] font-medium text-left py-[0.6rem] px-[0.8rem] rounded-sm cursor-pointer transition-all duration-[250ms] ease-in-out hover:bg-[var(--gold-pale)] hover:text-gold";

/* ─── Footer — copied from App.js's landing-page Footer ─── */
function Footer() {
  return (
    <footer className="border-t-[0.5px] border-t-border">
      {/* Extra bottom padding on mobile clears the fixed bottom nav bar
      (70px + safe-area-inset), which would otherwise sit on top of and
      hide the last bit of footer content when scrolled to the end. */}
      <div className="flex items-center justify-between max-w-[1280px] mx-auto py-5 px-6 flex-wrap gap-4 max-[768px]:flex-col max-[768px]:items-center max-[768px]:text-center max-[768px]:gap-5 max-[768px]:pt-6 max-[768px]:px-5 max-[768px]:pb-24">
        <div className="flex items-center gap-2.5 max-[768px]:flex-col max-[768px]:gap-2">
          <img
            src="/images/payzarc.png"
            className="h-[2.2rem] w-auto block"
            alt="Logo"
          />
          <p className="text-xs text-[var(--muted)]">
            Your trusted cross-border financial partner.
          </p>
        </div>
        <div className="flex flex-col gap-[3px] text-center">
          <a
            href="mailto:info.e@payzarc.com"
            className="text-xs font-semibold text-gold no-underline"
          >
            info.e@payzarc.com
          </a>
          <span className="text-[11px] text-[var(--muted)]">
            +1 (713) 822-8593
          </span>
          <span className="text-[11px] text-[var(--muted)]">
            Kew Gardens Dr Houston Tx, USA
          </span>
        </div>
      </div>
    </footer>
  );
}

export default function Dashboard() {
  const [activePage, setActivePage] = useState("home");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [friends, setFriends] = useState([]);
  // A one-off "go here" instruction for Home.js, set when a top-bar search
  // result is picked. Timestamped so picking the same result twice in a row
  // still re-triggers Home's effect.
  const [navigateRequest, setNavigateRequest] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [hideTopBar, setHideTopBar] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);

  const navigate = useNavigate();
  const searchRef = useRef(null);
  const notifRef = useRef(null);
  const lastScrollY = useRef(0);
  const balanceCardElRef = useRef(null);
  const snapInFlightRef = useRef(false);

  // Only the search results and the notification preview need manual
  // outside-click handling — the user dropdown is a Radix DropdownMenu,
  // which already closes itself on outside clicks. A manual listener here
  // would see clicks inside it as "outside" (DropdownMenuContent portals to
  // document.body, outside dropdownRef) and close the menu on mousedown
  // before the clicked item's onClick could fire.
  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchTerm("");
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Hides the topbar while scrolling down (past its own height, so it
  // doesn't flicker right at the top) and brings it back the moment the
  // user scrolls up at all — the standard "proper" hide-on-scroll pattern.
  //
  // Also owns the "snap the hero away" behavior: the first (non-trivial)
  // scroll on the home page jumps straight to the balance card's resting
  // position instead of stopping mid-hero, landing its top right under the
  // still-visible sticky header. Both live in one listener (rather than a
  // second one inside Home) so they can't race — while a snap is in
  // flight the hide-on-scroll check is skipped entirely, otherwise it'd
  // hide the header the instant scrollY crosses 96 mid-animation, which
  // is exactly where we're trying to land it looking untouched.
  useEffect(() => {
    // ponytail: matches the header's own h-[68px] below — not pulled into
    // a shared constant for one number used in two files.
    const HEADER_HEIGHT = 68;
    const SLIGHT_SCROLL_PX = 12;

    const handleScroll = () => {
      const currentY = window.scrollY;

      if (snapInFlightRef.current) {
        lastScrollY.current = currentY;
        return;
      }

      const card = balanceCardElRef.current;
      if (card) {
        const target = Math.round(
          card.getBoundingClientRect().top + currentY - HEADER_HEIGHT,
        );
        if (currentY > SLIGHT_SCROLL_PX && currentY < target) {
          snapInFlightRef.current = true;
          setHideTopBar(false);
          window.scrollTo({ top: target, behavior: "smooth" });
          const finishSnap = () => {
            snapInFlightRef.current = false;
            window.removeEventListener("scroll", checkArrived);
          };
          const checkArrived = () => {
            if (Math.abs(window.scrollY - target) < 2) finishSnap();
          };
          window.addEventListener("scroll", checkArrived, { passive: true });
          // Safety net in case the smooth scroll gets interrupted (e.g. the
          // user grabs the scrollbar mid-animation) and never fires close
          // enough to `target` for checkArrived to release the guard.
          setTimeout(finishSnap, 700);
          lastScrollY.current = currentY;
          return;
        }
      }

      const scrolledPastBar = currentY > 96;
      const scrollingDown = currentY > lastScrollY.current;
      setHideTopBar(scrolledPastBar && scrollingDown);
      lastScrollY.current = currentY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    contactsApi
      .get("/api/favorites/")
      .then((res) => {
        const raw = res.data;
        const list = Array.isArray(raw)
          ? raw
          : raw?.favourites || raw?.results || raw?.data || [];
        setFriends(Array.isArray(list) ? list : []);
      })
      .catch(() => setFriends([]));
  }, []);

  useEffect(() => {
    transactionsApi
      .get("/api/notifications/")
      .then((res) => setNotifications(Array.isArray(res.data) ? res.data : []))
      .catch(() => setNotifications([]));
  }, []);

  const markNotificationRead = (n) => {
    if (n.read) return;
    setNotifications((prev) =>
      prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)),
    );
    transactionsApi
      .post("/api/notifications/read", { id: n.id })
      .catch(() => {});
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axiosInstance.get("/api/dashboard");
        const userData = response.data;
        setUser(userData);
        localStorage.setItem("user", JSON.stringify(userData));
      } catch (err) {
        console.error("Failed to load dashboard:", err);
        if (DEV_BYPASS_AUTH) {
          setUser((u) => u || {});
        } else {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("user");
          navigate("/components/member/login");
        }
      } finally {
        setLoading(false);
      }
    };

    const saved = localStorage.getItem("user");
    if (saved) setUser(JSON.parse(saved));
    fetchUser();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await axiosInstance.post("/api/logout");
    } catch (err) {
      console.warn("Logout API failed:", err);
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("user");
      navigate("/components/member/login");
    }
  };

  const handleNavClick = (page) => {
    setActivePage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const unreadNotificationCount = notifications.filter((n) => !n.read).length;

  const searchTermLower = searchTerm.trim().toLowerCase();
  const matchedServices = searchTermLower
    ? SEARCH_SERVICES.filter((s) =>
        s.label.toLowerCase().includes(searchTermLower),
      )
    : [];
  const matchedFriends = searchTermLower
    ? friends
        .filter((f) => {
          const name = (f.display_name || f.name || "").toLowerCase();
          const phone = (f.phone || "").toLowerCase();
          const email = (f.email || "").toLowerCase();
          return (
            name.includes(searchTermLower) ||
            phone.includes(searchTermLower) ||
            email.includes(searchTermLower)
          );
        })
        .slice(0, 5)
    : [];

  const goToSection = (section) => {
    handleNavClick("home");
    setNavigateRequest({ id: Date.now(), section });
    setSearchTerm("");
  };

  const goToFriend = (fav) => {
    handleNavClick("home");
    setNavigateRequest({ id: Date.now(), section: "send", recipient: fav });
    setSearchTerm("");
  };

  const refreshUser = () => {
    const saved = localStorage.getItem("user");
    if (saved) setUser(JSON.parse(saved));
    axiosInstance
      .get("/api/dashboard")
      .then((res) => {
        setUser(res.data);
        localStorage.setItem("user", JSON.stringify(res.data));
      })
      .catch(() => {});
  };

  const displayName =
    `${user?.firstname || ""} ${user?.surname || ""}`.trim() ||
    user?.username ||
    "User";

  const renderContent = () => {
    switch (activePage) {
      case "home":
        return (
          <Home
            onPageChange={handleNavClick}
            user={user}
            navigateRequest={navigateRequest}
            balanceCardRef={balanceCardElRef}
          />
        );
      case "groups":
        return (
          <div className="flex flex-col gap-8">
            <Friends onSelectFriend={goToFriend} />
            <Groups />
          </div>
        );
      case "history":
        return (
          <History
            selectedTransaction={selectedTransaction}
            openDetailsPopup={(tx) => setSelectedTransaction(tx)}
            closeDetailsPopup={() => setSelectedTransaction(null)}
          />
        );
      case "account":
        return (
          <PaymentMethods
            user={user}
            onBack={() => setActivePage("home")}
            onLogout={handleLogout}
            onRefreshUser={refreshUser}
          />
        );
      case "notifications":
        return <Notifications onBack={() => setActivePage("home")} />;
      case "add-money":
      case "withdraw":
      case "send":
        return (
          <div className="text-center py-24 px-4 bg-card rounded-lg border border-border max-w-[800px] mx-auto">
            <h2 className="text-gold mb-4">
              {activePage.replace("-", " ").toUpperCase()}
            </h2>
            <p className="text-[var(--muted)] mb-8">
              This feature is coming soon.
            </p>
            <button
              onClick={() => setActivePage("home")}
              className="py-[0.8rem] px-8 bg-gold border-none rounded-[3rem] font-bold cursor-pointer transition-all duration-[250ms] ease-in-out hover:bg-gold-dark hover:-translate-y-0.5"
            >
              Back to Overview
            </button>
          </div>
        );
      default:
        return (
          <Home
            onPageChange={handleNavClick}
            user={user}
            navigateRequest={navigateRequest}
            balanceCardRef={balanceCardElRef}
          />
        );
    }
  };

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background text-[var(--muted)]">
        <div className="w-12 h-12 border-4 border-secondary border-t-gold rounded-full animate-spin"></div>
        <p>Loading Dashboard...</p>
      </div>
    );
  if (!user) return null;

  return (
    <div className="bg-[#0602145f] bg-fixed min-[900px]:[zoom:clamp(0.72,calc(100vw/1920),1.2)]">
      <div className="relative flex w-full min-h-screen text-foreground overflow-x-hidden bg-[radial-gradient(ellipse_120%_60%_at_50%_-10%,rgba(38,50,82,0.6),var(--bg)_60%)] bg-fixed">
        <div className="flex-1 flex flex-col min-w-0 min-h-screen">
          {/* Simplified Top Bar */}
          <header
            className={cn(
              "h-[68px] bg-card/85 [backdrop-filter:blur(20px)_saturate(1.2)] [-webkit-backdrop-filter:blur(20px)_saturate(1.2)] border-b border-white/[0.04] flex items-center justify-center sticky top-0 z-[100] w-full transition-transform duration-300 ease-in-out",
              hideTopBar && "-translate-y-full",
            )}
          >
            <div className="relative flex items-center justify-between gap-4 w-full max-w-[1280px] px-6 max-[768px]:px-4">
              <div className="flex items-center">
                <div
                  className="cursor-pointer shrink-0"
                  onClick={() => handleNavClick("home")}
                  role="button"
                >
                  <img
                    src="/images/payzarc.png"
                    alt="Logo"
                    className="h-[2.2rem] w-auto block"
                  />
                </div>
              </div>

              {/* Absolutely positioned instead of a flex/grid sibling, so it
              never competes with the logo/icons for space — on desktop it
              sits centered over the bar; on mobile it's just hidden, and the
              logo and icon cluster land at the two ends via justify-between
              with no middle track that has to collapse just right. */}
              <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center w-[280px] max-[768px]:hidden"
                ref={searchRef}
              >
                <Search
                  className="absolute left-3.5 text-[var(--muted)] pointer-events-none"
                  size={16}
                />
                <input
                  type="search"
                  placeholder="Search transactions, contacts..."
                  className="w-full h-10 bg-white/[0.03] border border-white/[0.06] rounded-xl py-[0.55rem] pr-4 pl-[2.8rem] text-foreground text-[0.85rem] outline-none transition-all duration-200 focus:bg-white/[0.07] focus:border-gold/30 focus:ring-1 focus:ring-gold/[0.08] focus:w-[320px]"
                  aria-label="Search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />

                {searchTermLower && (
                  <div
                    className="absolute top-[calc(100%+8px)] left-0 w-full min-w-[260px] bg-[var(--card2)] border border-white/[0.08] rounded-xl p-[0.6rem] z-[200] flex flex-col gap-[0.4rem] animate-popup-in"
                    role="listbox"
                  >
                    {matchedServices.length === 0 &&
                    matchedFriends.length === 0 ? (
                      <span className="py-[0.6rem] px-[0.8rem] text-[0.85rem] text-[var(--muted)]">
                        No matches for "{searchTerm}"
                      </span>
                    ) : (
                      <>
                        {matchedServices.length > 0 && (
                          <div className="flex flex-col">
                            <span className="px-[0.8rem] pt-[0.4rem] pb-[0.2rem] text-[0.7rem] font-bold text-[var(--muted)] uppercase tracking-[0.06em]">
                              Services
                            </span>
                            {matchedServices.map((s) => (
                              <button
                                key={s.id}
                                type="button"
                                className={searchResultItemClass}
                                onClick={() => goToSection(s.section)}
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        )}
                        {matchedFriends.length > 0 && (
                          <div className="flex flex-col">
                            <span className="px-[0.8rem] pt-[0.4rem] pb-[0.2rem] text-[0.7rem] font-bold text-[var(--muted)] uppercase tracking-[0.06em]">
                              Friends
                            </span>
                            {matchedFriends.map((f) => (
                              <button
                                key={f.id}
                                type="button"
                                className={searchResultItemClass}
                                onClick={() => goToFriend(f)}
                              >
                                {f.display_name || f.name}
                                <span className="text-[var(--muted)] text-[0.78rem] font-normal">
                                  {f.phone || f.email}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center">
                <div className="flex items-center gap-5 max-[768px]:gap-2">
                  <div className="relative" ref={notifRef}>
                    <div
                      className="relative cursor-pointer text-[var(--muted)] w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-200 hover:bg-white/[0.05] hover:text-foreground"
                      aria-label="Notifications"
                      role="button"
                      tabIndex={0}
                      onClick={() => setIsNotifOpen((o) => !o)}
                    >
                      <Bell size={18} />
                      {unreadNotificationCount > 0 && (
                        <>
                          <span className="absolute top-2 right-2.5 w-[7px] h-[7px] rounded-full bg-gold border-[1.5px] border-[var(--bg)]" />
                          <span className="absolute top-2 right-2.5 w-[7px] h-[7px] rounded-full bg-gold animate-ping opacity-60" />
                        </>
                      )}
                    </div>

                    {isNotifOpen && (
                      <div className="absolute top-[calc(100%+8px)] right-0 w-72 bg-[var(--card2)] border border-white/[0.08] rounded-xl p-2 z-[200] animate-popup-in">
                        <p className="text-xs font-semibold text-[var(--muted)] px-3 pt-2 pb-1 uppercase tracking-wide">
                          Notifications
                        </p>
                        {notifications.length === 0 ? (
                          <p className="text-sm text-[var(--muted)] px-3 py-4 text-center">
                            You're all caught up.
                          </p>
                        ) : (
                          <div className="flex flex-col max-h-[320px] overflow-y-auto">
                            {notifications.slice(0, 5).map((n) => {
                              const Icon = NOTIFICATION_ICONS[n.type] || Bell;
                              return (
                                <button
                                  key={n.id}
                                  type="button"
                                  className="flex gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 text-left transition-colors"
                                  onClick={() => {
                                    markNotificationRead(n);
                                    setIsNotifOpen(false);
                                    handleNavClick("notifications");
                                  }}
                                >
                                  <div
                                    className={cn(
                                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors duration-300",
                                      n.read
                                        ? "bg-white/5 text-[var(--muted)]"
                                        : "bg-[var(--gold-pale)] text-gold",
                                    )}
                                  >
                                    <Icon size={16} />
                                  </div>
                                  <div className="text-sm min-w-0">
                                    <p className="text-foreground truncate">
                                      {n.title}
                                    </p>
                                    <p className="text-xs text-[var(--muted)] mt-0.5">
                                      {new Date(n.created_at).toLocaleString()}
                                    </p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                        <button
                          type="button"
                          className="w-full mt-1 py-2 text-xs font-semibold text-gold hover:opacity-80 transition-opacity"
                          onClick={() => {
                            setIsNotifOpen(false);
                            handleNavClick("notifications");
                          }}
                        >
                          View all
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleNavClick("account")}
                    className="group flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-xl cursor-pointer transition-colors duration-200 hover:bg-white/[0.04]"
                  >
                    <img
                      src={
                        user.profileImageUrl
                          ? `${API_URL}${user.profileImageUrl}`
                          : "/images/default-user.png"
                      }
                      alt={`${displayName} avatar`}
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-transparent transition-all duration-300 group-hover:ring-gold/30"
                      onError={(e) => {
                        e.target.src = "/images/default-user.png";
                      }}
                    />
                    <span className="hidden md:block text-[0.85rem] font-medium text-foreground">
                      {displayName}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* Content Area */}
          <main className="flex-1 pt-12 pb-8 max-[768px]:pt-4 max-[768px]:pb-24">
            <div className="max-w-[1400px] mx-auto px-[4%]">
              <div key={activePage} className="animate-flow-fade-in">
                {renderContent()}
              </div>
            </div>
          </main>

          <Footer />
        </div>
      </div>

      {/* Mobile bottom tab bar — the only way to reach Groups/History/Account
          on a phone was previously buried inside Home's own content (its
          money-flow tabs, or the Recent Activity "View all" link). Desktop
          keeps relying on the topbar + in-page links, so this only shows
          under 768px. Floats as a rounded "dock" inset from the screen
          edges, flat bg + border (no elevation shadow) instead of a flat
          full-width bar, with a gold pill behind the active tab instead of
          just a color change. */}
      <div className="hidden max-[768px]:block fixed bottom-0 inset-x-0 z-[100] px-4 [padding-bottom:calc(0.85rem+env(safe-area-inset-bottom))]">
        <nav className="flex items-center justify-around gap-1 h-[64px] px-2 rounded-[24px] bg-card/80 border border-white/[0.06] [backdrop-filter:blur(24px)_saturate(1.2)] [-webkit-backdrop-filter:blur(24px)_saturate(1.2)]">
          {MOBILE_NAV_TABS.map(({ key, label, icon: Icon, fab }) => {
            // "Send" doesn't have its own activePage — it opens Home's
            // internal send flow via the same goToSection helper the topbar
            // search's "Send Money" result uses, so it has no "active" state
            // of its own; it's drawn as a raised circle instead of a tab.
            if (fab) {
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => goToSection("send")}
                  aria-label={label}
                  className="flex-1 h-full flex items-center justify-center"
                >
                  <span className="w-12 h-12 rounded-full bg-gradient-to-b from-gold to-gold-dark text-black flex items-center justify-center transition-transform duration-200 active:scale-90">
                    <Icon size={22} />
                  </span>
                </button>
              );
            }
            const active = activePage === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleNavClick(key)}
                className="flex-1 h-full flex items-center justify-center"
              >
                <span
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 w-16 py-1.5 rounded-2xl text-[11px] font-medium transition-all duration-200 active:scale-95",
                    active
                      ? "text-gold bg-gold/10"
                      : "text-[var(--muted)]",
                  )}
                >
                  <Icon size={20} />
                  {label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
