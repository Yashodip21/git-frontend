import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "./dashboard.css";
import Navbar from "../Navbar";
import { useAuth } from "../../authContext";

const Dashboard = () => {
  const [repositories, setRepositories] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestedRepositories, setSuggestedRepositories] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [followedUsers, setFollowedUsers] = useState([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  const { userProfileImage, setUserProfileImage } = useAuth();
  const userId = localStorage.getItem("userId");

  const fetchDashboardData = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Fetch user profile info for sidebar
    try {
      const userRes = await fetch(`http://localhost:3002/userProfile/${userId}`);
      if (userRes.ok) {
        const userData = await userRes.json();
        setUserProfile(userData);
        if (userData.profileImage) {
          setUserProfileImage(userData.profileImage);
        }
      }
    } catch (err) {
      console.error("Error fetching user profile: ", err);
    }

    // Fetch follow stats
    try {
      const followRes = await fetch(`http://localhost:3002/user/${userId}/follow-status`);
      if (followRes.ok) {
        const fData = await followRes.json();
        setFollowersCount(fData.followersCount || 0);
        setFollowingCount(fData.followingCount || 0);
      }
    } catch (err) {
      console.error("Error fetching follow status: ", err);
    }

    // Fetch followed users
    try {
      const followingRes = await fetch(`http://localhost:3002/user/${userId}/following`);
      if (followingRes.ok) {
        const fData = await followingRes.json();
        setFollowedUsers(fData.following || []);
      }
    } catch (err) {
      console.error("Error fetching followed users: ", err);
    }

    // Fetch User Repositories
    try {
      const response = await fetch(`http://localhost:3002/repo/user/${userId}`);
      if (!response.ok) {
        if (response.status === 400) setError("Bad Request (400)");
        else if (response.status === 401) setError("Authentication required (401)");
        else if (response.status === 403) setError("Access forbidden (403)");
        else if (response.status === 404) setError("Repositories not found (404)");
        else if (response.status === 500) setError("Server error (500)");
        else setError(`Error loading repositories (${response.status})`);
      } else {
        const data = await response.json();
        setRepositories(Array.isArray(data.repositories) ? data.repositories : []);
      }
    } catch (err) {
      console.error("Error while fetching repositories: ", err);
      setError("Unable to connect to server");
    }

    // Fetch Suggested Repositories
    try {
      const response = await fetch(`16.171.154.247:3002/repo/all`);
      if (response.ok) {
        const data = await response.json();
        setSuggestedRepositories(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error while fetching suggested repositories: ", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setSearchResults(repositories);
    } else {
      const filteredRepo = repositories.filter((repo) =>
        repo.name ? repo.name.toLowerCase().includes(searchQuery.toLowerCase()) : false
      );
      setSearchResults(filteredRepo);
    }
  }, [searchQuery, repositories]);

  const handleToggleStar = async (e, repoId, currentIsStarred, currentStarCount) => {
    e.preventDefault();
    e.stopPropagation();

    if (!userId) return;

    const newIsStarred = !currentIsStarred;

    // Optimistic UI Update for user repositories and search results
    const updateRepoList = (list) =>
      list.map((r) => {
        if (r._id === repoId) {
          const starsArr = Array.isArray(r.stars) ? r.stars : [];
          const updatedStars = newIsStarred
            ? [...starsArr, userId]
            : starsArr.filter((s) => (typeof s === "object" ? s._id : s).toString() !== userId);
          return { ...r, stars: updatedStars };
        }
        return r;
      });

    setRepositories((prev) => updateRepoList(prev));
    setSuggestedRepositories((prev) => updateRepoList(prev));

    try {
      const endpoint = newIsStarred
        ? `http://localhost:3002/repo/${repoId}/star`
        : `http://localhost:3002/repo/${repoId}/unstar`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) {
        fetchDashboardData();
      }
    } catch (err) {
      console.error("Error toggling star: ", err);
      fetchDashboardData();
    }
  };

  const handleUserSearch = async (query) => {
    setUserSearchQuery(query);
    if (!query.trim()) {
      setUserSearchResults([]);
      return;
    }
    setSearchingUsers(true);
    try {
      const res = await fetch(`http://localhost:3002/users/search?q=${encodeURIComponent(query)}&viewerId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setUserSearchResults(data.users || []);
      }
    } catch (err) {
      console.error("Error searching users:", err);
    } finally {
      setSearchingUsers(false);
    }
  };

  const handleToggleFollowUser = async (targetId, currentlyFollowing) => {
    const endpoint = currentlyFollowing
      ? `http://localhost:3002/user/${targetId}/unfollow`
      : `http://localhost:3002/user/${targetId}/follow`;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        const followingRes = await fetch(`http://localhost:3002/user/${userId}/following`);
        if (followingRes.ok) {
          const fData = await followingRes.json();
          setFollowedUsers(fData.following || []);
          setFollowingCount(fData.count || 0);
        }
        setUserSearchResults((prev) =>
          prev.map((u) => (u._id === targetId ? { ...u, following: !currentlyFollowing } : u))
        );
      }
    } catch (err) {
      console.error("Error toggling follow:", err);
    }
  };

  return (
    <>
      <Navbar />
      <div className="gh-dashboard-wrapper">
        <div className="gh-dashboard-layout">

          {/* Left / Main Workspace Section */}
          <main className="gh-dashboard-main">
            {/* Welcome Banner */}
            <div className="gh-welcome-card">
              <div className="gh-welcome-text">
                <h2>Welcome back, {userProfile?.username || "Developer"}</h2>
                <p>Manage your projects, repositories, and development workflow.</p>
              </div>
              <Link to="/repo/create" className="gh-btn-primary">
                + New repository
              </Link>
            </div>

            {/* Repositories Section */}
            <div className="gh-repos-container">
              <div className="gh-repos-header">
                <div className="gh-repos-title-group">
                  <h3>Top Repositories</h3>
                  <span className="gh-counter-badge">{repositories.length}</span>
                </div>
                <div className="gh-repos-actions">
                  <div className="gh-search-box">
                    <input
                      type="text"
                      value={searchQuery}
                      placeholder="Find a repository..."
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="gh-input-sm"
                    />
                  </div>
                  <Link to="/repo/create" className="gh-btn-sm-green">
                    New
                  </Link>
                </div>
              </div>

              {loading ? (
                /* Skeleton Loader */
                <div className="gh-skeleton-list">
                  <div className="gh-skeleton-card skeleton"></div>
                  <div className="gh-skeleton-card skeleton"></div>
                  <div className="gh-skeleton-card skeleton"></div>
                </div>
              ) : error ? (
                <div className="gh-error-banner">
                  <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
                    <path d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16ZM7.25 5v3.5a.75.75 0 0 0 1.5 0V5a.75.75 0 0 0-1.5 0Zm0 6v1.5a.75.75 0 0 0 1.5 0V11a.75.75 0 0 0-1.5 0Z"></path>
                  </svg>
                  <span>{error}</span>
                  <button onClick={fetchDashboardData} className="gh-btn-retry">
                    Retry
                  </button>
                </div>
              ) : repositories.length === 0 ? (
                /* Polished Empty State */
                <div className="gh-empty-state">
                  <div className="gh-empty-icon-wrapper">
                    <svg viewBox="0 0 16 16" width="36" height="36" fill="currentColor">
                      <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-3.5a.25.25 0 0 1-.25-.25z"></path>
                    </svg>
                  </div>
                  <h3>No repositories yet</h3>
                  <p>Create your first repository to store your code and start collaborating.</p>
                  <Link to="/repo/create" className="gh-btn-primary">
                    Create repository
                  </Link>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="gh-empty-state-sm">
                  <p>No repositories matching <strong>"{searchQuery}"</strong></p>
                </div>
              ) : (
                /* Repository Cards List */
                <div className="gh-repo-cards-grid">
                  {searchResults.map((repo) => {
                    const isStarred = Array.isArray(repo.stars) && repo.stars.some((s) => (typeof s === "object" ? s._id : s).toString() === userId);
                    const starCount = Array.isArray(repo.stars) ? repo.stars.length : 0;

                    return (
                      <div key={repo._id} className="gh-repo-card">
                        <div className="gh-repo-card-header">
                          <div className="gh-repo-title-wrapper">
                            <svg className="gh-repo-svg" viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
                              <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-3.5a.25.25 0 0 1-.25-.25z"></path>
                            </svg>
                            <Link to={`/repo/${repo._id}`} className="gh-repo-name-link">
                              {repo.name}
                            </Link>
                            <span className="gh-badge-visibility">
                              {repo.visibility === false || repo.visibility === "private" ? "Private" : "Public"}
                            </span>
                          </div>

                          {/* Star Button */}
                          <button
                            className={`gh-btn-star ${isStarred ? "starred" : ""}`}
                            onClick={(e) => handleToggleStar(e, repo._id, isStarred, starCount)}
                            title={isStarred ? "Unstar repository" : "Star repository"}
                          >
                            <span className="gh-star-icon">{isStarred ? "★" : "☆"}</span>
                            <span>{isStarred ? "Starred" : "Star"}</span>
                            <span className="gh-star-count">{starCount}</span>
                          </button>
                        </div>

                        <p className="gh-repo-desc-text">
                          {repo.description || "No description provided."}
                        </p>

                        <div className="gh-repo-footer-meta">
                          <span className="gh-lang-indicator">
                            <span className="gh-lang-dot"></span> JavaScript
                          </span>
                          <span className="gh-meta-item">
                            Owner: {typeof repo.owner === "object" ? repo.owner?.username || repo.owner?._id : repo.owner || "You"}
                          </span>
                          {Array.isArray(repo.issues) && (
                            <span className="gh-meta-item">• {repo.issues.length} issues</span>
                          )}
                          {Array.isArray(repo.content) && (
                            <span className="gh-meta-item">• {repo.content.length} items</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Suggested Community Repositories */}
            {suggestedRepositories.length > 0 && (
              <div className="gh-suggested-section">
                <h3>Explore Community Repositories</h3>
                <div className="gh-suggested-grid">
                  {suggestedRepositories.slice(0, 4).map((repo) => {
                    const isStarred = Array.isArray(repo.stars) && repo.stars.some((s) => (typeof s === "object" ? s._id : s).toString() === userId);
                    const starCount = Array.isArray(repo.stars) ? repo.stars.length : 0;

                    return (
                      <div key={repo._id} className="gh-suggested-card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <Link to={`/repo/${repo._id}`} className="gh-suggested-name">
                            {repo.name}
                          </Link>
                          <button
                            className={`gh-btn-star ${isStarred ? "starred" : ""}`}
                            onClick={(e) => handleToggleStar(e, repo._id, isStarred, starCount)}
                            style={{ padding: "2px 6px", fontSize: "11px" }}
                          >
                            <span className="gh-star-icon">{isStarred ? "★" : "☆"}</span>
                            <span>{starCount}</span>
                          </button>
                        </div>
                        <p className="gh-suggested-desc">{repo.description || "Community repository"}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </main>

          {/* Right Sidebar Section */}
          <aside className="gh-dashboard-sidebar">
            {/* User Profile Card */}
            <div className="gh-sidebar-card">
              <div className="gh-profile-summary">
                <div className="gh-profile-avatar-lg">
                  {userProfileImage || userProfile?.profileImage ? (
                    <img
                      src={userProfileImage || userProfile?.profileImage}
                      alt="Profile Avatar"
                      className="gh-avatar-img-lg"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <svg viewBox="0 0 16 16" width="28" height="28" fill="currentColor">
                      <path d="M10.561 8.073a6.005 6.005 0 0 1 3.432 5.142.75.75 0 1 1-1.498.07 4.5 4.5 0 0 0-8.99 0 .75.75 0 0 1-1.498-.07 6.004 6.004 0 0 1 3.431-5.142 3.999 3.999 0 1 1 5.123 0ZM10.5 5a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z"></path>
                    </svg>
                  )}
                </div>
                <div className="gh-profile-info">
                  <h4>{userProfile?.username || "Developer"}</h4>
                  <p className="gh-text-muted">{userProfile?.email || "GitHub User"}</p>
                </div>
              </div>
              <div className="gh-sidebar-stats">
                <div className="gh-stat-box">
                  <span className="gh-stat-number">{repositories.length}</span>
                  <span className="gh-stat-label">Repositories</span>
                </div>
                <div className="gh-stat-box">
                  <span className="gh-stat-number">{followersCount}</span>
                  <span className="gh-stat-label">Followers</span>
                </div>
                <div className="gh-stat-box">
                  <span className="gh-stat-number">{followingCount}</span>
                  <span className="gh-stat-label">Following</span>
                </div>
              </div>
              <Link to="/profile" className="gh-btn-sidebar">
                View Profile
              </Link>
            </div>

            {/* People you follow Card */}
            <div className="gh-sidebar-card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>People you follow</h3>
                <span className="gh-counter-badge">{followedUsers.length}</span>
              </div>

              {/* Inline User Search for Easy Discovery */}
              <input
                type="text"
                className="gh-user-search-input"
                placeholder="Search users to follow..."
                value={userSearchQuery}
                onChange={(e) => handleUserSearch(e.target.value)}
              />

              {userSearchQuery.trim() && (
                <div className="gh-user-search-results">
                  {searchingUsers ? (
                    <p className="gh-text-muted" style={{ fontSize: "12px", padding: "4px" }}>Searching...</p>
                  ) : userSearchResults.length === 0 ? (
                    <p className="gh-text-muted" style={{ fontSize: "12px", padding: "4px" }}>No users found</p>
                  ) : (
                    userSearchResults.map((u) => (
                      <div key={u._id} className="gh-following-item">
                        <div className="gh-following-user-meta">
                          <Link to={`/user/${u._id}`}>
                            {u.profileImage ? (
                              <img src={u.profileImage} alt={u.username} className="gh-following-avatar-sm" onError={(e) => e.target.style.display = 'none'} />
                            ) : (
                              <div className="gh-following-avatar-fallback">
                                <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                                  <path d="M10.561 8.073a6.005 6.005 0 0 1 3.432 5.142.75.75 0 1 1-1.498.07 4.5 4.5 0 0 0-8.99 0 .75.75 0 0 1-1.498-.07 6.004 6.004 0 0 1 3.431-5.142 3.999 3.999 0 1 1 5.123 0ZM10.5 5a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z"></path>
                                </svg>
                              </div>
                            )}
                          </Link>
                          <div>
                            <Link to={`/user/${u._id}`} className="gh-following-name">{u.username}</Link>
                            <p className="gh-following-email">{u.email}</p>
                          </div>
                        </div>
                        <button
                          className={`gh-follow-btn-sm ${u.following ? "following" : ""}`}
                          onClick={() => handleToggleFollowUser(u._id, u.following)}
                        >
                          {u.following ? "Following" : "Follow"}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Followed Users List */}
              <div className="gh-following-list">
                {followedUsers.length === 0 ? (
                  <p className="gh-text-muted" style={{ fontSize: "13px", margin: "8px 0 0 0" }}>
                    You're not following anyone yet. Search users above to connect!
                  </p>
                ) : (
                  followedUsers.slice(0, 5).map((fUser) => (
                    <div key={fUser._id} className="gh-following-item">
                      <div className="gh-following-user-meta">
                        <Link to={`/user/${fUser._id}`}>
                          {fUser.profileImage ? (
                            <img
                              src={fUser.profileImage}
                              alt={fUser.username}
                              className="gh-following-avatar-sm"
                              onError={(e) => e.target.style.display = 'none'}
                            />
                          ) : (
                            <div className="gh-following-avatar-fallback">
                              <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                                <path d="M10.561 8.073a6.005 6.005 0 0 1 3.432 5.142.75.75 0 1 1-1.498.07 4.5 4.5 0 0 0-8.99 0 .75.75 0 0 1-1.498-.07 6.004 6.004 0 0 1 3.431-5.142 3.999 3.999 0 1 1 5.123 0ZM10.5 5a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z"></path>
                              </svg>
                            </div>
                          )}
                        </Link>
                        <div>
                          <Link to={`/user/${fUser._id}`} className="gh-following-name">
                            {fUser.username}
                          </Link>
                          <p className="gh-following-email">{fUser.email}</p>
                        </div>
                      </div>
                      <Link to={`/user/${fUser._id}`} className="gh-btn-sidebar" style={{ padding: "3px 8px", fontSize: "11px" }}>
                        View
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="gh-sidebar-card">
              <h3>Quick Actions</h3>
              <ul className="gh-quick-actions-list">
                <li>
                  <Link to="/repo/create" className="gh-quick-action-link">
                    <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                      <path d="M7.75 2a.75.75 0 0 1 .75.75V7h4.25a.75.75 0 0 1 0 1.5H8.5v4.25a.75.75 0 0 1-1.5 0V8.5H2.75a.75.75 0 0 1 0-1.5H7V2.75A.75.75 0 0 1 7.75 2Z"></path>
                    </svg>
                    <span>Create repository</span>
                  </Link>
                </li>
                <li>
                  <Link to="/profile" className="gh-quick-action-link">
                    <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                      <path d="M10.561 8.073a6.005 6.005 0 0 1 3.432 5.142.75.75 0 1 1-1.498.07 4.5 4.5 0 0 0-8.99 0 .75.75 0 0 1-1.498-.07 6.004 6.004 0 0 1 3.431-5.142 3.999 3.999 0 1 1 5.123 0ZM10.5 5a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z"></path>
                    </svg>
                    <span>Edit profile settings</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Upcoming Events Card */}
            <div className="gh-sidebar-card">
              <h3>Latest Community Events</h3>
              <ul className="gh-events-list">
                <li>
                  <p className="gh-event-name">GitHub Universe 2026</p>
                  <p className="gh-event-meta">Dec 15 • Virtual Event</p>
                </li>
                <li>
                  <p className="gh-event-name">React Open Source Meetup</p>
                  <p className="gh-event-meta">Dec 25 • Online</p>
                </li>
                <li>
                  <p className="gh-event-name">Web Development Summit</p>
                  <p className="gh-event-meta">Jan 5 • Developer Livestream</p>
                </li>
              </ul>
            </div>
          </aside>

        </div>
      </div>
    </>
  );
};

export default Dashboard;