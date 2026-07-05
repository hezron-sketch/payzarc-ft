import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Dashboard.module.css';
import axiosInstance from '../../utility/axiosInstance';
import { API_URL } from '../../utility/constants';

import Home from './Home';
import Profile from './Profile';
import Friends from './Friends';
import History from './History';
import Groups from './Groups';
import Menu from './Menu';
import Settings from './Settings';
import ProfileImageCapture from './ProfileImageCapture';

function Dashboard() {
  const [activePage, setActivePage] = useState('home');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const navigate = useNavigate();

  const openDetailsPopup = (transaction) => setSelectedTransaction(transaction);
  const closeDetailsPopup = () => setSelectedTransaction(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axiosInstance.get('/api/dashboard');
        const userData = response.data;
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      } catch (err) {
        console.error('Failed to load dashboard:', err);
        localStorage.removeItem('accessToken'); // ← Clear accessToken
        localStorage.removeItem('user');
        navigate('/components/member/login');
      } finally {
        setLoading(false);
      }
    };

    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    fetchUser();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await axiosInstance.post('/api/logout'); // Clears refresh cookie on backend
    } catch (err) {
      console.warn('Logout API call failed (still logging out locally):', err);
    } finally {
      localStorage.removeItem('accessToken'); // ← Clear short-lived token
      localStorage.removeItem('user');
      navigate('/components/member/login');
    }
  };

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const handleNavClick = (page) => {
    setActivePage(page);
    setIsMenuOpen(false);
    setIsUserMenuOpen(false);
  };

  const handleImageCapture = () => {
    setActivePage('profileImageCapture');
    setIsUserMenuOpen(false);
  };

  const refreshUser = () => {
    const saved = localStorage.getItem('user');
    if (saved) {
      setUser(JSON.parse(saved));
    }
    // Refetch latest from server
    axiosInstance.get('/api/dashboard')
      .then(res => {
        const updatedUser = res.data;
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      })
      .catch(() => { });
  };

  if (loading) {
    return <div className={styles.loading}>Loading...</div>;
  }

  if (!user) {
    return null;
  }

  const renderContent = () => {
    switch (activePage) {
      case 'home':
        return <Home onPageChange={handleNavClick} user={user} />;
      case 'profile':
        return <Profile user={user} onRefreshUser={refreshUser} />;
      case 'friends':
        return <Friends />;
      case 'history':
        return (
          <History
            selectedTransaction={selectedTransaction}
            openDetailsPopup={openDetailsPopup}
            closeDetailsPopup={closeDetailsPopup}
          />
        );
      case 'groups':
        return <Groups />;
      case 'settings':
        return <Settings user={user} navigate={navigate} onSuccess={() => handleNavClick('home')} />;
      case 'profileImageCapture':
        return (
          <ProfileImageCapture
            user={user}
            onRefreshUser={refreshUser}
            onBack={() => setActivePage('profile')}
          />
        );
      default:
        return <Home onPageChange={handleNavClick} user={user} />;
    }
  };

  return (
    <div className={styles.appDashboard}>
      <header className={styles.topBar}>
        <div className={styles.topBarContent}>
          <div
            className={styles.topBarLogo}
            onClick={() => handleNavClick('home')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' || e.key === ' ' ? handleNavClick('home') : null}
          >
            <img src="/images/payzarc.png" alt="Payzarc" className={styles.appLogo} />
          </div>
          <div className={styles.topBarUserImage}>
            <div className={styles.topBarUserInfo}>
              <span className={styles.topBarUserName}>
                {user?.username ? `@${user.username}` : user ? `${user.firstname} ${user.surname}` : ''}
              </span>
              <div
                className={styles.userMenuWrapper}
                onMouseEnter={() => setIsUserMenuOpen(true)}
                onMouseLeave={() => setIsUserMenuOpen(false)}
              >
                <div className={styles.imageWrapper}>
                  <img
                    src={user.profileImageUrl ? `${API_URL}${user.profileImageUrl}` : '/images/default-user.png'}
                    alt={user.firstname || 'User'}
                    className={styles.userProfileImg}
                    onError={(e) => {
                      console.log("Image failed to load:", e.target.src);
                      e.target.src = '/images/default-user.png';
                    }}
                  />
                </div>
                {isUserMenuOpen && (
                  <div className={styles.userMenuPopup}>




                    <div className={styles.menuItemWithSub}>
                      <div className={styles.menuItem}>
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className={styles.menuIcon}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className={styles.menuItemText}>Profile</span>
                      </div>
                      <div className={styles.subMenu}>
                        <div className={styles.subMenuItem} onClick={handleImageCapture}>
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className={styles.menuIcon}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className={styles.menuItemText}>Update Profile Image</span>
                        </div>
                        <div className={styles.subMenuItem} onClick={() => handleNavClick('profile')}>
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className={styles.menuIcon}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span className={styles.menuItemText}>Edit Profile</span>
                        </div>
                      </div>
                    </div>

                    <div className={styles.menuItem} onClick={() => handleNavClick('friends')}>
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className={styles.menuIcon}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className={styles.menuItemText}>Friends</span>
                    </div>

                    <div className={styles.menuItem} onClick={() => handleNavClick('history')}>
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className={styles.menuIcon}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className={styles.menuItemText}>History</span>
                    </div>

                    <div className={styles.menuItem} onClick={() => handleNavClick('groups')}>
                      <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className={styles.menuIcon}>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2v6h4v-6c0-1.1-.9-2-2-2z" />
                      </svg>
                      <span className={styles.menuItemText}>Groups</span>
                    </div>

                    <div className={styles.menuItemWithSub}>
                      <div className={styles.menuItem}>
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className={styles.menuIcon}>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className={styles.menuItemText}>Settings</span>
                      </div>
                      <div className={styles.subMenu}>
                        <div className={styles.subMenuItem} onClick={() => handleNavClick('settings')}>
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className={styles.menuIcon}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0-1.104-.896-2-2-2s-2 .896-2 2v2h2v-2zm0 0c0-1.104.896-2 2-2s2 .896 2 2v2h-2v-2zm-4 5v2h8v-2H8zm4-11c-2.761 0-5 2.239-5 5v6h10v-6c0-2.761-2.239-5-5-5z" />
                          </svg>
                          <span className={styles.menuItemText}>Change Password</span>
                        </div>
                        <div className={styles.subMenuItem} onClick={handleLogout}>
                          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className={styles.menuIcon}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z" />
                          </svg>
                          <span className={styles.menuItemText}>Logout</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className={styles.main}>{renderContent()}</main>

      <nav className={styles.bottomNav}>
        <div onClick={() => handleNavClick('home')}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7m-9 9v-6h6v6m-9 0h9"></path></svg>
          <span>Home</span>
        </div>
        <div onClick={() => handleNavClick('profile')}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
          <span>Profile</span>
        </div>
        <div onClick={() => handleNavClick('friends')}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          <span>Friends</span>
        </div>
        <div onClick={() => handleNavClick('history')}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          <span>History</span>
        </div>
        <div onClick={() => handleNavClick('groups')}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2v6h4v-6c0-1.1-.9-2-2-2z"></path></svg>
          <span>Groups</span>
        </div>
        <div>
          <Menu isMenuOpen={isMenuOpen} toggleMenu={toggleMenu} handleLogout={handleLogout} navigate={navigate} handleNavClick={handleNavClick} />
        </div>
      </nav>
    </div>
  );
}

export default Dashboard;

