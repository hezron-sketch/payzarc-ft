import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./Dashboard.module.css";
import axiosInstance from "../../utility/axiosInstance";
import { API_URL } from "../../utility/constants";

import Home from "./Home";
import Groups from "./Groups";
import Friends from "./Friends";
import History from "./History";
// import Account from "./Account";
import ProfileImageCapture from "./ProfileImageCapture";

import {
  LogOut,
  Search,
  Bell,
  ChevronDown,
  User,
  LayoutDashboard,
  Users,
  History as HistoryIcon,
  UsersRound,
} from "lucide-react";

export default function Dashboard() {
  const [activePage, setActivePage] = useState("home");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isDockSolid, setIsDockSolid] = useState(false);
  const [isDockVisible, setIsDockVisible] = useState(false);

  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const dockHideTimer = useRef(null);

  // The dock stays hidden at rest and only appears while the page is
  // actually being scrolled (up or down) — it fades back out a moment
  // after scrolling stops rather than sitting on screen permanently.
  useEffect(() => {
    const handleScroll = () => {
      setIsDockSolid(window.scrollY > 24);
      setIsDockVisible(true);
      clearTimeout(dockHideTimer.current);
      dockHideTimer.current = setTimeout(() => setIsDockVisible(false), 1200);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(dockHideTimer.current);
    };
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
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
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        navigate("/components/member/login");
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
        return <Home onPageChange={handleNavClick} user={user} />;
      case "groups":
        return <Groups />;
      case "friends":
        return <Friends />;
      case "history":
        return (
          <History
            selectedTransaction={selectedTransaction}
            openDetailsPopup={(tx) => setSelectedTransaction(tx)}
            closeDetailsPopup={() => setSelectedTransaction(null)}
          />
        );
      // case "account":
      //   return (
      //     <Account
      //       user={user}
      //       onRefreshUser={refreshUser}
      //       onBack={() => setActivePage("home")}
      //     />
      //   );
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
        return <Home onPageChange={handleNavClick} user={user} />;
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
          <header className={styles.topBar}>
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

              <div className={styles.topBarRight}>
                <div className={styles.searchContainer}>
                  <Search className={styles.searchIcon} size={18} />
                  <input
                    type="search"
                    placeholder="Search..."
                    className={styles.searchInput}
                    aria-label="Search"
                  />
                </div>

                <div className={styles.topBarActions}>
                  <div
                    className={styles.notificationWrapper}
                    aria-label="Notifications"
                    role="button"
                    tabIndex={0}
                  >
                    <Bell size={22} />
                    <span className={styles.notificationBadge}>3</span>
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
                            <span className={styles.dropdownRole}>
                              Member
                            </span>
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
                            <LogOut
                              size={16}
                              className={styles.dropdownIcon}
                            />{" "}
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
            <div className={styles.contentContainer}>{renderContent()}</div>
          </main>

          {/* Creative Floating Navigation Dock */}
          <nav
            className={`${styles.floatingDock} ${isDockSolid ? styles.dockScrolled : ""} ${isDockVisible ? styles.dockVisible : ""}`}
            onMouseEnter={() => {
              clearTimeout(dockHideTimer.current);
              setIsDockVisible(true);
            }}
            onMouseLeave={() => {
              dockHideTimer.current = setTimeout(
                () => setIsDockVisible(false),
                800,
              );
            }}
          >
            <div className={styles.dockInner}>
              <div
                className={`${styles.dockItem} ${activePage === "home" ? styles.active : ""}`}
                onClick={() => handleNavClick("home")}
                title="Overview"
              >
                <LayoutDashboard size={24} />
                <span className={styles.dockLabel}>Overview</span>
              </div>
              <div
                className={`${styles.dockItem} ${activePage === "friends" ? styles.active : ""}`}
                onClick={() => handleNavClick("friends")}
                title="Friends"
              >
                <Users size={24} />
                <span className={styles.dockLabel}>Friends</span>
              </div>
              <div
                className={`${styles.dockItem} ${activePage === "groups" ? styles.active : ""}`}
                onClick={() => handleNavClick("groups")}
                title="Groups"
              >
                <UsersRound size={24} />
                <span className={styles.dockLabel}>Groups</span>
              </div>
              <div
                className={`${styles.dockItem} ${activePage === "history" ? styles.active : ""}`}
                onClick={() => handleNavClick("history")}
                title="History"
              >
                <HistoryIcon size={24} />
                <span className={styles.dockLabel}>History</span>
              </div>
            </div>
          </nav>
        </div>
      </div>
    </div>
  );
}
