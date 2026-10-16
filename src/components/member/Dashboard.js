import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { cn } from "@/lib/utils";
import axiosInstance, {
  contactsApi,
  transactionsApi,
} from "../../utility/axiosInstance";
import { API_URL } from "../../utility/constants";
import Home from "./Home";
import {
  phoneBezelColorClass,
  phoneNotchBaseClass,
  phoneModalOpenClass,
  phoneModalShadowClass,
} from "../PhoneMockup";
import Groups from "./Groups";
import Friends from "./Friends";
import PaymentMethods from "./PaymentMethods";
import Notifications from "./Notifications";

import {
  Search,
  Bell,
  CircleArrowDown,
  ShieldAlert,
  CircleCheck,
  House,
  UsersRound,
  History as HistoryIcon,
  CircleUserRound,
  Send,
} from "lucide-react";

// Bottom tab bar — mobile-only nav so switching between top-level sections
// doesn't depend on the topbar's cramped icon row or on stumbling onto the
// "View all" / "Groups" links buried inside Home's content. "send" is
// rendered as a raised center FAB instead of a regular tab (see the "fab"
// flag below) — same visual idea as the reference design's floating
// transfer button.
const MOBILE_NAV_TABS = [
  // Opens Home's resting screen, so Home also works as "close whatever
  // panel (Groups, History, a flow) is open" while already on Home.
  { key: "home", label: "Home", icon: House, section: "dashboard" },
  // Opens Home's Groups panel (friends + group funds) in the phone — the
  // same screen the balance card's group-funds chip opens.
  { key: "groups", label: "Groups", icon: UsersRound, section: "groups" },
  { key: "send", label: "Send", icon: Send, fab: true },
  // Opens Home's combined Transactions screen (list + statements) in the
  // phone, same as the topbar search result, instead of a separate page.
  { key: "history", label: "History", icon: HistoryIcon, section: "reports" },
  { key: "account", label: "Account", icon: CircleUserRound },
];

// Same type -> icon mapping as the full Notifications.js page, reused here
// for the topbar's notification preview dropdown so both stay in sync.
const NOTIFICATION_ICONS = {
  receive: CircleArrowDown,
  security: ShieldAlert,
  transaction: CircleCheck,
};

const DEV_BYPASS_AUTH = process.env.REACT_APP_BYPASS_AUTH === "true";
// Inside the Android app the OS draws a real status bar and gesture bar, so
// the shell's drawn notch and home indicator would double them up.
const IS_NATIVE_APP = Capacitor.isNativePlatform();

// Top-bar search results — static services plus whatever friends match.
const SEARCH_SERVICES = [
  { id: "send", label: "Send Money", section: "send" },
  { id: "add-money", label: "Deposit", section: "add-money" },
  { id: "withdraw", label: "Withdraw", section: "withdraw" },
  { id: "groups", label: "Groups", section: "groups" },
  { id: "reports", label: "Transactions", section: "reports" },
];

const searchResultItemClass =
  "flex items-center justify-between gap-2 w-full bg-transparent border-none text-foreground text-[0.85rem] font-medium text-left py-[0.6rem] px-[0.8rem] rounded-sm cursor-pointer transition-ui duration-[250ms] ease-in-out hover:bg-[var(--gold-pale)] hover:text-gold";

// Every place the dashboard can be is in the URL (?page / ?section / ?tab),
// so Back/Forward walk through panels, refresh keeps your place, and any
// screen can be linked to. Unknown values fall back to the home screen.
const PAGES = ["home", "groups", "account", "notifications"];
const HOME_SECTIONS = ["dashboard", "add-money", "withdraw", "send", "send-many", "groups", "reports"];
const GROUPS_TABS = ["friends", "groups"];

export default function Dashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const pageParam = searchParams.get("page");
  const activePage = PAGES.includes(pageParam) ? pageParam : "home";
  const sectionParam = searchParams.get("section");
  const homeSection =
    activePage === "home" && HOME_SECTIONS.includes(sectionParam)
      ? sectionParam
      : "dashboard";
  const tabParam = searchParams.get("tab");
  const groupsTab = GROUPS_TABS.includes(tabParam) ? tabParam : "friends";
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
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
  const bellRef = useRef(null);
  const lastScrollY = useRef(0);
  // Home.js's phone/balance card — scrolled into view when a search result
  // opens one of its flows, so the flow isn't left off-screen.
  const balanceCardRef = useRef(null);

  // Runs after Home has committed (child effects/refs land first), so the
  // ref is already attached even when the search jumped here from another
  // page.
  useEffect(() => {
    if (navigateRequest) {
      balanceCardRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [navigateRequest]);

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

  // Escape closes the notifications panel and hands focus back to the bell.
  useEffect(() => {
    if (!isNotifOpen) return;
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      setIsNotifOpen(false);
      bellRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isNotifOpen]);

  // Hides the topbar while scrolling down (past its own height, so it
  // doesn't flicker right at the top) and brings it back the moment the
  // user scrolls up at all — the standard "proper" hide-on-scroll pattern.
  // Desktop only (fed from the window scroll). Below 768px only <main>
  // scrolls, and it deliberately isn't wired in: the phone's topbar (logo,
  // bell, avatar) stays put like a real app's nav bar.
  const handleScroll = (currentY) => {
    const scrolledPastBar = currentY > 96;
    const scrollingDown = currentY > lastScrollY.current;
    setHideTopBar(scrolledPastBar && scrollingDown);
    lastScrollY.current = currentY;
  };
  useEffect(() => {
    const onWindowScroll = () => handleScroll(window.scrollY);
    window.addEventListener("scroll", onWindowScroll, { passive: true });
    return () => window.removeEventListener("scroll", onWindowScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          navigate("/login", { replace: true });
        }
      } finally {
        setLoading(false);
      }
    };

    const saved = localStorage.getItem("user");
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (err) {
        console.warn("Invalid saved user data:", err);
        localStorage.removeItem("user");
      }
    }
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
      navigate("/login", { replace: true });
    }
  };

  // The single writer for dashboard location. Pushes a history entry per
  // destination (so Back undoes it); `replace` is for in-place changes like
  // a segmented tab. Re-navigating to where you already are is a no-op, so
  // the same destination is never stacked twice.
  const goTo = ({ page = "home", section = "dashboard", tab } = {}, { replace = false } = {}) => {
    const next = new URLSearchParams();
    if (page !== "home") next.set("page", page);
    else {
      if (section !== "dashboard") next.set("section", section);
      if (section === "groups" && tab && tab !== "friends") next.set("tab", tab);
    }
    if (next.toString() === searchParams.toString()) return;
    setSearchParams(next, { replace });
  };

  const handleNavClick = (page) => {
    goTo({ page });
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
    goTo({ section });
    setNavigateRequest({ id: Date.now(), section });
    setSearchTerm("");
  };

  const goToFriend = (fav) => {
    goTo({ section: "send" });
    setNavigateRequest({ id: Date.now(), section: "send", recipient: fav });
    setSearchTerm("");
  };

  const refreshUser = () => {
    const saved = localStorage.getItem("user");
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (err) {
        console.warn("Invalid saved user data:", err);
        localStorage.removeItem("user");
      }
    }
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
            balanceCardRef={balanceCardRef}
            section={homeSection}
            groupsTab={groupsTab}
            onNavigate={goTo}
          />
        );
      case "groups":
        return (
          <div className="flex flex-col gap-8">
            <Friends onSelectFriend={goToFriend} />
            <Groups />
          </div>
        );
      case "account":
        return (
          <PaymentMethods
            user={user}
            onBack={() => handleNavClick("home")}
            onLogout={handleLogout}
            onRefreshUser={refreshUser}
          />
        );
      case "notifications":
        return <Notifications onBack={() => handleNavClick("home")} />;
      default:
        return (
          <Home
            onPageChange={handleNavClick}
            user={user}
            navigateRequest={navigateRequest}
            balanceCardRef={balanceCardRef}
            section={homeSection}
            groupsTab={groupsTab}
            onNavigate={goTo}
          />
        );
    }
  };

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background text-[var(--soft)]">
        <div className="w-12 h-12 border-4 border-secondary border-t-gold rounded-full animate-spin"></div>
        <p>Loading Dashboard...</p>
      </div>
    );
  if (!user) return null;

  return (
    <div className="bg-[#0602145f] bg-fixed">
      <div className="relative flex w-full min-h-screen text-foreground overflow-x-hidden bg-[radial-gradient(ellipse_120%_60%_at_50%_-10%,rgba(38,50,82,0.6),var(--bg)_60%)] bg-fixed">
        {/* Below 768px this becomes the persistent mobile "app shell": fixed
        full-viewport, header/main/nav stacked as flex children instead of
        flowing in the document. <main> is the only thing that scrolls
        inside it, so the topbar and bottom nav both stay pinned in place —
        the nav lives inside this shell (a real flex child) instead of a
        separately fixed overlay. Desktop is untouched (relative, normal
        page scroll, no bottom nav). */}
        {/* Phone bezel — on the web, the mobile shell sits inside the same
        phone modal the landing page's Login/Register open in (shared
        phoneModal* classes). `contents` on desktop means none of the
        bezel's box styles apply there, so only `max-[768px]:block` needs a
        breakpoint. Its transform also makes it the containing block for
        fixed children (e.g. Home's toast), keeping them inside the phone,
        and lets BalanceCard's Send/Withdraw pills (position: fixed) escape
        the scroll area's clipping to straddle the screen edge.
        Native app skips it — the device is already the phone. */}
        <div
          data-phone-bezel={IS_NATIVE_APP ? undefined : ""}
          className={cn(
            "contents",
            !IS_NATIVE_APP &&
              cn(
                "max-[768px]:block fixed z-[60] p-[8px] rounded-[var(--r)]",
                phoneBezelColorClass,
                phoneModalOpenClass,
                // 2D only: the landing modal's translateZ lift (no perspective
                // here anyway) makes Chrome place native popups — <select>
                // lists, date pickers — at the wrong spot, off the phone.
                "[transform:translate(-50%,-50%)]",
                phoneModalShadowClass,
              ),
          )}
        >
        <div
          className={cn(
            "flex-1 flex flex-col min-w-0 min-h-screen max-[768px]:min-h-0 max-[768px]:bg-[var(--bg)]",
            IS_NATIVE_APP
              ? "max-[768px]:fixed max-[768px]:inset-0 max-[768px]:z-[60] max-[768px]:h-[100dvh]"
              : // overflow-clip, not -hidden: a hidden box is still a scroll
              // container, so Home's balanceCard scrollIntoView() on screen
              // switches scrolled the whole shell up, leaving a gap under the
              // tab bar. clip can't be scrolled at all.
              "max-[768px]:relative max-[768px]:isolate max-[768px]:h-full max-[768px]:overflow-clip max-[768px]:rounded-[calc(var(--r)-8px)]",
          )}
        >
          {/* Status-bar strip — the space the bezel's notch (below the
          shell) hangs into. Clears an actual notch/Dynamic Island via
          env(safe-area-inset-top) in the native app. Navy (--bg), not
          the desktop topbar's near-black, so the bezel-colored notch and
          bezel stand out against it. */}
          <div
            className="hidden max-[768px]:flex shrink-0 justify-center items-end pb-1 min-h-[22px] bg-[rgba(15,26,46,0.85)] [backdrop-filter:blur(20px)_saturate(1.2)] [-webkit-backdrop-filter:blur(20px)_saturate(1.2)]"
            style={{ paddingTop: "env(safe-area-inset-top)" }}
          >
          </div>
          {/* Simplified Top Bar */}
          <header
            className={cn(
              "h-[68px] bg-[rgba(13,17,23,0.85)] max-[768px]:bg-[rgba(15,26,46,0.85)] [backdrop-filter:blur(20px)_saturate(1.2)] [-webkit-backdrop-filter:blur(20px)_saturate(1.2)] border-b border-white/[0.04] flex items-center justify-center sticky top-0 z-[100] w-full shrink-0 transition-transform duration-300 ease-in-out",
              hideTopBar && "-translate-y-full",
            )}
          >
            <div className="relative flex items-center justify-between gap-4 w-full max-w-[1280px] px-6 max-[768px]:px-4">
              <div className="flex items-center">
                <button
                  type="button"
                  className="shrink-0 rounded-md"
                  onClick={() => handleNavClick("home")}
                  aria-label="Payzarc home"
                >
                  <img
                    src="/images/payzarc.png"
                    alt=""
                    className="h-[2.2rem] w-auto block"
                  />
                </button>
              </div>

              {/* In-flow middle track (flex-1, capped) rather than absolutely
              centered — absolute centering ran under the Groups/bell/avatar
              cluster at medium widths (~800px). Shrinks instead of
              overlapping; hidden on mobile. */}
              <div
                className="relative flex-1 min-w-0 max-w-[320px] flex items-center max-[768px]:hidden"
                ref={searchRef}
              >
                <Search
                  aria-hidden="true"
                  className="absolute left-3.5 text-[var(--soft)] pointer-events-none"
                  size={16}
                />
                <input
                  type="search"
                  placeholder="Search people and actions"
                  className="w-full h-10 bg-white/[0.03] border border-white/[0.06] rounded-xl py-[0.55rem] pr-4 pl-[2.8rem] text-foreground text-[0.85rem] outline-none transition-[width,background-color,border-color,box-shadow] duration-200 ease-apple focus:bg-white/[0.07] focus:border-gold/30 focus:ring-2 focus:ring-gold/40"
                  aria-label="Search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />

                {searchTermLower && (
                  <div
                    className="absolute top-[calc(100%+8px)] left-0 w-full min-w-[260px] material-thin border border-white/[0.08] rounded-xl p-[0.6rem] z-[200] flex flex-col gap-[0.4rem] origin-top animate-popover-in"
                  >
                    {matchedServices.length === 0 &&
                    matchedFriends.length === 0 ? (
                      <span className="py-[0.6rem] px-[0.8rem] text-[0.85rem] text-[var(--soft)]">
                        No matches for "{searchTerm}"
                      </span>
                    ) : (
                      <>
                        {matchedServices.length > 0 && (
                          <div className="flex flex-col">
                            <span className="px-[0.8rem] pt-[0.4rem] pb-[0.2rem] text-[0.7rem] font-bold text-[var(--soft)] uppercase tracking-[0.06em]">
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
                            <span className="px-[0.8rem] pt-[0.4rem] pb-[0.2rem] text-[0.7rem] font-bold text-[var(--soft)] uppercase tracking-[0.06em]">
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
                                <span className="text-[var(--soft)] text-[0.78rem] font-normal">
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
                  {/* Desktop has no bottom nav, so Groups gets a header entry
                      (the mobile dock's Groups tab covers phones). */}
                  <button
                    type="button"
                    onClick={() => goToSection("groups")}
                    aria-label="Groups"
                    aria-current={
                      activePage === "home" && homeSection === "groups"
                        ? "page"
                        : undefined
                    }
                    className="max-[768px]:hidden h-11 px-3 rounded-full flex items-center gap-2 text-[0.85rem] font-medium text-[var(--soft)] transition-colors hover:bg-white/[0.05] hover:text-foreground aria-[current=page]:text-gold"
                  >
                    <UsersRound size={18} aria-hidden="true" />
                    <span className="hidden lg:inline">Groups</span>
                  </button>
                  <div className="relative" ref={notifRef}>
                    <button
                      ref={bellRef}
                      type="button"
                      className="relative text-[var(--soft)] w-11 h-11 rounded-full flex items-center justify-center transition-colors duration-200 hover:bg-white/[0.05] hover:text-foreground"
                      aria-label={
                        unreadNotificationCount > 0
                          ? `Notifications, ${unreadNotificationCount} unread`
                          : "Notifications"
                      }
                      aria-expanded={isNotifOpen}
                      onClick={() => setIsNotifOpen((o) => !o)}
                    >
                      <Bell size={18} aria-hidden="true" />
                      {unreadNotificationCount > 0 && (
                        <>
                          <span className="absolute top-2 right-2.5 w-[7px] h-[7px] rounded-full bg-gold border-[1.5px] border-[var(--bg)]" />
                        </>
                      )}
                    </button>

                    {isNotifOpen && (
                      <div className="absolute top-[calc(100%+8px)] right-0 w-72 material-thin border border-white/[0.08] rounded-xl p-2 z-[200] origin-top-right animate-popover-in">
                        <p className="text-xs font-semibold text-[var(--soft)] px-3 pt-2 pb-1 uppercase tracking-wide">
                          Notifications
                        </p>
                        {notifications.length === 0 ? (
                          <p className="text-sm text-[var(--soft)] px-3 py-4 text-center">
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
                                  className="flex gap-3 px-3 py-2 rounded-md hover:bg-white/5 text-left transition-colors"
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
                                        ? "bg-white/5 text-[var(--soft)]"
                                        : "bg-[var(--gold-pale)] text-gold",
                                    )}
                                  >
                                    <Icon size={16} />
                                  </div>
                                  <div className="text-sm min-w-0">
                                    <p className="text-foreground truncate">
                                      {n.title}
                                    </p>
                                    <p className="text-xs text-[var(--soft)] mt-0.5">
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
                          className="w-full mt-1 py-1.5 text-xs font-semibold text-gold hover:opacity-80 transition-opacity"
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
                    className="group flex items-center gap-2.5 pl-1 pr-2 py-0.5 rounded-sm cursor-pointer transition-colors duration-200 hover:bg-white/[0.04]"
                  >
                    <img
                      src={
                        user.profileImageUrl
                          ? `${API_URL}${user.profileImageUrl}`
                          : "/images/default-user.png"
                      }
                      alt={`${displayName} avatar`}
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-transparent transition-ui duration-300 group-hover:ring-gold/30"
                      onError={(e) => {
                        e.target.src = "/images/default-user.png";
                      }}
                    />
                    <span className="hidden lg:block text-[0.85rem] font-medium text-foreground">
                      {displayName}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* Content Area — rounded top corners + a faint glass surface (same
          bg-white/[0.0X] + border-white/[0.06] language as the app's other
          panels) so it reads as a distinct rounded sheet sitting under the
          flat topbar, instead of content floating directly on the page bg.
          Desktop only: inside the phone frame it doubled up with the balance
          card's own rounded panel (a sheet inside a sheet), so on mobile the
          card is the only surface. */}
          <main
            className="flex-1 flex flex-col pt-12 max-[768px]:pt-4 max-[768px]:pb-6 max-[768px]:min-h-0 max-[768px]:overflow-y-auto max-[768px]:overflow-x-hidden bg-white/[0.015] border-t border-white/[0.06] rounded-t-[28px] max-[768px]:bg-transparent max-[768px]:border-t-0 max-[768px]:rounded-none"
          >
            <div className="flex-1 w-full max-w-[1400px] mx-auto px-[4%] pb-12 max-[768px]:pb-4">
              <div key={activePage} className="animate-flow-fade-in">
                {renderContent()}
              </div>
            </div>
          </main>

          {/* Mobile bottom tab bar — the only way to reach Groups/History/
          Account on a phone was previously buried inside Home's own content
          (its money-flow tabs, or the Recent Activity "View all" link).
          Desktop keeps relying on the topbar + in-page links, so this only
          shows under 768px. A shrink-0 flex child of the app shell above
          (not a fixed overlay), so it's always the last thing in the shell
          instead of floating over whatever's scrolled to the bottom. An
          iOS-style tab bar: edge to edge, translucent material, a hairline
          top edge, and the active tab marked by tint alone. */}
          <div className="hidden max-[768px]:block shrink-0 material-thin border-t border-white/[0.08] pt-2 [padding-bottom:calc(0.35rem+env(safe-area-inset-bottom))]">
            <nav
              aria-label="Main"
              className="flex items-center justify-around h-[58px] px-1">
              {MOBILE_NAV_TABS.map(({ key, label, icon: Icon, fab, section }) => {
                // "Send" doesn't have its own activePage — it opens Home's
                // internal send flow via the same goToSection helper the
                // topbar search's "Send Money" result uses, so it has no
                // "active" state of its own; it's drawn as a raised circle
                // instead of a tab.
                if (fab) {
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => goToSection("send")}
                      aria-label={label}
                      className="flex-1 h-full flex items-center justify-center"
                    >
                      <span className="w-11 h-11 rounded-full bg-gradient-to-b from-gold to-gold-dark text-black flex items-center justify-center transition-transform duration-200 active:scale-90">
                        <Icon size={20} aria-hidden="true" />
                      </span>
                    </button>
                  );
                }
                // Groups and History open panels inside Home, so they're
                // current when Home is showing their section; Home itself is
                // current for everything else Home shows.
                const homeTab =
                  MOBILE_NAV_TABS.find((t) => t.section === homeSection)?.key ||
                  "home";
                const active =
                  activePage === "home" ? key === homeTab : activePage === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      section ? goToSection(section) : handleNavClick(key)
                    }
                    aria-current={active ? "page" : undefined}
                    className="flex-1 h-full flex items-center justify-center"
                  >
                    <span
                      className={cn(
                        "flex flex-col items-center justify-center gap-1 w-16 py-1 text-[11px] font-medium transition-[color,transform] duration-200 active:scale-95",
                        active ? "text-gold" : "text-[var(--soft)]",
                      )}
                    >
                      <Icon size={22} aria-hidden="true" />
                      {label}
                    </span>
                  </button>
                );
              })}
            </nav>
            {/* Home indicator — the other half of the realistic-phone cue
            (paired with the notch above), sitting in the tab bar's own
            safe-area padding instead of adding its own space. */}
            {!IS_NATIVE_APP && (
              <div className="w-[120px] h-[5px] bg-white/30 rounded-full mx-auto mt-1.5" />
            )}
          </div>
        </div>
        {/* Phone screen layer for dialogs/sheets (see phoneScreenContainer
        in lib/utils). Sits exactly over the screen (inset = bezel padding,
        same rounded corners) and clips to it. Its own 2D transform makes it
        the containing block for Radix's `fixed inset-0` overlays, so they
        cover the screen, not the window. Empty it's click-through; portaled
        children re-enable pointer events. Above the edge pills (z-10). */}
        {!IS_NATIVE_APP && (
          <div
            data-phone-screen=""
            className="hidden max-[768px]:block absolute inset-[8px] z-20 overflow-clip rounded-[calc(var(--r)-8px)] [transform:translate(0)] pointer-events-none [&>*]:pointer-events-auto"
          />
        )}
        {/* Notch hanging from the screen's top edge, same shape as the
        landing modal's. After the shell (which is `isolate`) so it paints on
        top. Bezel-colored like the landing modal's; it reads because the
        status strip and topbar behind it are navy on mobile, not the
        bezel's near-black. */}
        {!IS_NATIVE_APP && (
          <div
            className={cn(
              phoneNotchBaseClass,
              "hidden max-[768px]:block top-[8px] w-[40%] h-[22px] rounded-b-[14px] z-30",
            )}
          />
        )}
        </div>
      </div>
    </div>
  );
}
