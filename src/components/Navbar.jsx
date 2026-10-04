import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./navbar.css";
import logo from "../assets/github-mark-white.svg";
import { useAuth } from "../authContext";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const { userProfileImage, setUserProfileImage, setCurrentUser } = useAuth();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    setCurrentUser(null);
    setUserProfileImage("");
    window.location.href = "/auth";
  };

  return (
    <header className="gh-header">
      <div className="gh-header-container">
        <div className="gh-header-left">
          {/* Mobile Hamburger Toggle */}
          <button
            className="gh-mobile-menu-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation"
          >
            <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor">
              <path d="M1 2.75A.75.75 0 0 1 1.75 2h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 2.75Zm0 5A.75.75 0 0 1 1.75 7h12.5a.75.75 0 0 1 0 1.5H1.75A.75.75 0 0 1 1 7.75Zm0 5a.75.75 0 0 1 .75-.75h12.5a.75.75 0 0 1 0 1.5H1.75a.75.75 0 0 1-.75-.75Z"></path>
            </svg>
          </button>

          {/* Logo */}
          <Link to="/" className="gh-header-logo">
            <img src={logo} alt="GitHub Logo" />
          </Link>

          {/* Search Bar */}
          <div className="gh-header-search">
            <div className="gh-search-input-wrapper">
              <svg className="gh-search-icon" viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                <path d="M10.68 11.74a6 6 0 1 1 1.06-1.06l3.04 3.04a.75.75 0 1 1-1.06 1.06l-3.04-3.04ZM11.5 7a4.5 4.5 0 1 0-9 0 4.5 4.5 0 0 0 9 0Z"></path>
              </svg>
              <input
                type="text"
                placeholder="Type '/' to search..."
                className="gh-search-input"
                onFocus={() => {
                  if (location.pathname !== "/") navigate("/");
                }}
              />
              <span className="gh-search-shortcut">/</span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="gh-header-nav">
            <Link to="/" className={`gh-nav-link ${location.pathname === "/" ? "active" : ""}`}>
              Dashboard
            </Link>
            <Link to="/profile" className={`gh-nav-link ${location.pathname === "/profile" ? "active" : ""}`}>
              Profile
            </Link>
          </nav>
        </div>

        <div className="gh-header-right">
          {/* New Repo Button */}
          <Link to="/repo/create" className="gh-btn-new">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
              <path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z"></path>
            </svg>
            <span>New</span>
          </Link>

          {/* Notification Icon */}
          <div className="gh-icon-btn" title="Notifications">
            <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
              <path d="M8 16a2 2 0 0 0 1.985-1.75c.017-.137-.097-.25-.235-.25h-3.5c-.138 0-.252.113-.235.25A2 2 0 0 0 8 16ZM3 5a5 5 0 0 1 10 0v2.947c0 .05.015.098.042.139l1.458 2.187A.75.75 0 0 1 13.88 11.5H2.12a.75.75 0 0 1-.62-1.227l1.458-2.187A.25.25 0 0 0 3 7.947V5Z"></path>
            </svg>
            <span className="gh-notification-badge"></span>
          </div>

          {/* Profile Dropdown */}
          <div className="gh-profile-menu-container">
            <button
              className="gh-avatar-btn"
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              aria-label="User menu"
            >
              {userProfileImage ? (
                <img
                  src={userProfileImage}
                  alt="User Avatar"
                  className="gh-avatar-img-sm"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="gh-avatar-placeholder">
                  <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
                    <path d="M10.561 8.073a6.005 6.005 0 0 1 3.432 5.142.75.75 0 1 1-1.498.07 4.5 4.5 0 0 0-8.99 0 .75.75 0 0 1-1.498-.07 6.004 6.004 0 0 1 3.431-5.142 3.999 3.999 0 1 1 5.123 0ZM10.5 5a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z"></path>
                  </svg>
                </div>
              )}
            </button>

            {profileDropdownOpen && (
              <div className="gh-dropdown-menu">
                <div className="gh-dropdown-header">
                  <p className="gh-dropdown-user-title">Signed in</p>
                </div>
                <div className="gh-dropdown-divider"></div>
                <Link
                  to="/profile"
                  className="gh-dropdown-item"
                  onClick={() => setProfileDropdownOpen(false)}
                >
                  Your Profile
                </Link>
                <Link
                  to="/repo/create"
                  className="gh-dropdown-item"
                  onClick={() => setProfileDropdownOpen(false)}
                >
                  New repository
                </Link>
                <div className="gh-dropdown-divider"></div>
                <button className="gh-dropdown-item gh-logout-btn" onClick={handleLogout}>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="gh-mobile-drawer">
          <Link
            to="/"
            className="gh-mobile-nav-item"
            onClick={() => setMobileMenuOpen(false)}
          >
            Dashboard
          </Link>
          <Link
            to="/profile"
            className="gh-mobile-nav-item"
            onClick={() => setMobileMenuOpen(false)}
          >
            Profile
          </Link>
          <Link
            to="/repo/create"
            className="gh-mobile-nav-item"
            onClick={() => setMobileMenuOpen(false)}
          >
            + New repository
          </Link>
          <button className="gh-mobile-nav-item gh-logout-btn" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      )}
    </header>
  );
};

export default Navbar;