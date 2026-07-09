import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Dashboard.module.css";
import axiosInstance, { contactsApi, transactionsApi } from "../../utility/axiosInstance";
import { API_URL } from "../../utility/constants";

import Home from "./Home";
import Groups from "./Groups";
import Friends from "./Friends";
import History from "./History";
import PaymentMethods from "./PaymentMethods";
import Notifications from "./Notifications";
import ProfileImageCapture from "./ProfileImageCapture";

import {
  LogOut,
  Search,
  Bell,
  ChevronDown,
  User,
  LayoutDashboard,
  History as HistoryIcon,
  UsersRound,
} from "lucide-react";

const DEV_BYPASS_AUTH = process.env.REACT_APP_BYPASS_AUTH === "true";

// Top-bar search results — static services plus whatever friends match.
const SEARCH_SERVICES = [
  { id: "send", label: "Send Money", section: "send" },
  { id: "add-money", label: "Add Money", section: "add-money" },
  { id: "withdraw", label: "Withdraw", section: "withdraw" },
  { id: "groups", label: "Groups", section: "groups" },
];

/* ─── Footer — copied from App.js's landing-page Footer ─── */
function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerLeft}>
          <img
            src="/images/payzarc.png"
            className={styles.appLogo}
            alt="Payzarc-logo"
          />
          <p className={styles.footerTagline}>
            Your trusted cross-border financial partner.
          </p>
        </div>
        <div className={styles.footerMid}>
          <a href="mailto:info.e@payzarc.com" className={styles.footerEmail}>
            info.e@payzarc.com
          </a>
          <span className={styles.footerPhone}>+1 (713) 822-8593</span>
          <span className={styles.footerAddr}>
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
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [friends, setFriends] = useState([]);
  // A one-off "go here" instruction for Home.js, set when a top-bar search
  // result is picked. Timestamped so picking the same result twice in a row
  // still re-triggers Home's effect.
  const [navigateRequest, setNavigateRequest] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [hideTopBar, setHideTopBar] = useState(false);

  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Hides the topbar while scrolling down (past its own height, so it
  // doesn't flicker right at the top) and brings it back the moment the
  // user scrolls up at all — the standard "proper" hide-on-scroll pattern.
  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
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
      .get("/api/favorites/all/")
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
    setIsUserMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const unreadNotificationCount = notifications.filter((n) => !n.read).length;

  const searchTermLower = searchTerm.trim().toLowerCase();
  const matchedServices = searchTermLower
    ? SEARCH_SERVICES.filter((s) => s.label.toLowerCase().includes(searchTermLower))
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

  const handleImageCapture = () => {
    setActivePage("profileImageCapture");
    setIsUserMenuOpen(false);
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
          />
        );
      case "groups":
        return (
          <>
            <Friends />
            <Groups />
          </>
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
          <PaymentMethods user={user} onBack={() => setActivePage("home")} />
        );
      case "notifications":
        return <Notifications onBack={() => setActivePage("home")} />;
      case "profileImageCapture":
        return (
          <ProfileImageCapture
            user={user}
            onRefreshUser={refreshUser}
            onBack={() => setActivePage("account")}
          />
        );
      case "add-money":
      case "withdraw":
      case "send":
        return (
          <div className={styles.placeholderPage}>
            <h2 className={styles.accentText}>
              {activePage.replace("-", " ").toUpperCase()}
            </h2>
            <p className={styles.mutedText}>This feature is coming soon.</p>
            <button
              onClick={() => setActivePage("home")}
              className={styles.backBtn}
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
          />
        );
    }
  };

  if (loading)
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loader}></div>
        <p>Loading Payzarc Dashboard...</p>
      </div>
    );
  if (!user) return null;

  return (
    <div className={styles.pageWrap}>
      <div className={styles.appDashboard}>
        <div className={`${styles.bgRing} ${styles.ringLg}`} />
        <div className={`${styles.bgRing} ${styles.ringSm}`} />
        <div className={styles.mainWrapper}>
          {/* Simplified Top Bar */}
          <header
            className={`${styles.topBar} ${hideTopBar ? styles.topBarHidden : ""}`}
          >
            <div className={styles.topBarInner}>
              <div className={styles.topBarLeft}>
                <div
                  className={styles.logoSection}
                  onClick={() => handleNavClick("home")}
                  role="button"
                >
                  <img
                    src="/images/payzarc.png"
                    alt="Payzarc"
                    className={styles.appLogo}
                  />
                </div>
              </div>

              <div className={styles.searchContainer} ref={searchRef}>
                <Search className={styles.searchIcon} size={18} />
                <input
                  type="search"
                  placeholder="Search services or friends..."
                  className={styles.searchInput}
                  aria-label="Search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />

                {searchTermLower && (
                  <div className={styles.searchResults} role="listbox">
                    {matchedServices.length === 0 &&
                    matchedFriends.length === 0 ? (
                      <span className={styles.searchEmpty}>
                        No matches for "{searchTerm}"
                      </span>
                    ) : (
                      <>
                        {matchedServices.length > 0 && (
                          <div className={styles.searchGroup}>
                            <span className={styles.searchGroupLabel}>
                              Services
                            </span>
                            {matchedServices.map((s) => (
                              <button
                                key={s.id}
                                type="button"
                                className={styles.searchResultItem}
                                onClick={() => goToSection(s.section)}
                              >
                                {s.label}
                              </button>
                            ))}
                          </div>
                        )}
                        {matchedFriends.length > 0 && (
                          <div className={styles.searchGroup}>
                            <span className={styles.searchGroupLabel}>
                              Friends
                            </span>
                            {matchedFriends.map((f) => (
                              <button
                                key={f.id}
                                type="button"
                                className={styles.searchResultItem}
                                onClick={() => goToFriend(f)}
                              >
                                {f.display_name || f.name}
                                <span className={styles.searchResultMeta}>
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

              <div className={styles.topBarRight}>
                <div className={styles.topBarActions}>
                  <div
                    className={styles.notificationWrapper}
                    aria-label="Notifications"
                    role="button"
                    tabIndex={0}
                    onClick={() => handleNavClick("notifications")}
                  >
                    <Bell size={22} />
                    {unreadNotificationCount > 0 && (
                      <span className={styles.notificationBadge}>
                        {unreadNotificationCount}
                      </span>
                    )}
                  </div>

                  <div
                    className={styles.userInfo}
                    onClick={() => setIsUserMenuOpen((o) => !o)}
                    ref={dropdownRef}
                  >
                    <div className={styles.userAvatarWrapper}>
                      <img
                        src={
                          user.profileImageUrl
                            ? `${API_URL}${user.profileImageUrl}`
                            : "/images/default-user.png"
                        }
                        alt={`${displayName} avatar`}
                        className={styles.userAvatar}
                        onError={(e) => {
                          e.target.src = "/images/default-user.png";
                        }}
                      />
                      {isUserMenuOpen && (
                        <div className={styles.userDropdown} role="menu">
                          <div className={styles.dropdownHeader}>
                            <span className={styles.dropdownName}>
                              {displayName}
                            </span>
                            <span className={styles.dropdownRole}>Member</span>
                          </div>
                          <div
                            className={styles.dropdownItem}
                            onClick={() => handleNavClick("account")}
                            role="menuitem"
                          >
                            <User size={16} className={styles.dropdownIcon} />{" "}
                            Account
                          </div>
                          <div
                            className={styles.dropdownItem}
                            onClick={handleImageCapture}
                            role="menuitem"
                          >
                            Update Photo
                          </div>
                          <div
                            className={`${styles.dropdownItem} ${styles.logout}`}
                            onClick={handleLogout}
                            role="menuitem"
                          >
                            <LogOut size={16} className={styles.dropdownIcon} />{" "}
                            Log out
                          </div>
                        </div>
                      )}
                    </div>
                    <ChevronDown className={styles.chevronIcon} size={16} />
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Content Area */}
          <main className={styles.mainContent}>
            <div className={styles.contentContainer}>
              {/* In-dashboard nav — replaces the old floating dock. Friends
                  and Groups are combined under one "Groups" tab. */}
              {/* <nav className={styles.dashboardNav}>
                <button
                  className={`${styles.navTab} ${activePage === "home" ? styles.navTabActive : ""}`}
                  onClick={() => handleNavClick("home")}
                >
                  <LayoutDashboard size={18} />
                  Overview
                </button>
                <button
                  className={`${styles.navTab} ${activePage === "groups" ? styles.navTabActive : ""}`}
                  onClick={() => handleNavClick("groups")}
                >
                  <UsersRound size={18} />
                  Groups
                </button>
                <button
                  className={`${styles.navTab} ${activePage === "history" ? styles.navTabActive : ""}`}
                  onClick={() => handleNavClick("history")}
                >
                  <HistoryIcon size={18} />
                  History
                </button>
              </nav> */}
              <div key={activePage} className={styles.pageTransition}>
                {renderContent()}
              </div>
            </div>
          </main>

          <Footer />
        </div>
      </div>
    </div>
  );
}
