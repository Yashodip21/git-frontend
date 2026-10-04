import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "./profile.css";
import "./UserPublicProfile.css";
import Navbar from "../Navbar";
import HeatMapProfile from "./HeatMap";
import { useAuth } from "../../authContext";

const UserPublicProfile = () => {
  const { userId: targetUserId } = useParams();
  const navigate = useNavigate();
  const currentUserId = localStorage.getItem("userId");

  const [profile, setProfile] = useState(null);
  const [repositories, setRepositories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [activeModal, setActiveModal] = useState(null); // "followers" | "following" | null
  const [modalUsers, setModalUsers] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [hovered, setHovered] = useState(false);

  const isOwnProfile = currentUserId && targetUserId && currentUserId.toString() === targetUserId.toString();

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await axios.get(
        `http://localhost:3002/user/${targetUserId}/public-profile?viewerId=${currentUserId || ""}`
      );
      const data = res.data;
      setProfile(data);
      setIsFollowing(data.isFollowing || false);
      setFollowersCount(data.followersCount || 0);
      setFollowingCount(data.followingCount || 0);
    } catch (err) {
      console.error("Error fetching public profile:", err);
    }

    try {
      const repoRes = await axios.get(`http://localhost:3002/repo/user/${targetUserId}`);
      if (repoRes.data && Array.isArray(repoRes.data.repositories)) {
        setRepositories(repoRes.data.repositories);
      }
    } catch (err) {
      console.error("Error fetching user repos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!targetUserId) return;
    if (isOwnProfile) {
      navigate("/profile");
      return;
    }
    fetchProfile();
  }, [targetUserId]);

  const handleFollowToggle = async () => {
    if (!currentUserId || followLoading) return;
    setFollowLoading(true);
    try {
      const endpoint = isFollowing
        ? `http://localhost:3002/user/${targetUserId}/unfollow`
        : `http://localhost:3002/user/${targetUserId}/follow`;

      const token = localStorage.getItem("token");
      const res = await axios.post(endpoint, { userId: currentUserId }, {
        headers: {
          "x-user-id": currentUserId,
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
          "Content-Type": "application/json",
        },
      });

      setIsFollowing(res.data.following);
      setFollowersCount(res.data.followersCount ?? followersCount);
    } catch (err) {
      console.error("Error toggling follow:", err);
    } finally {
      setFollowLoading(false);
    }
  };

  const openFollowersModal = async () => {
    setActiveModal("followers");
    setModalLoading(true);
    setModalUsers([]);
    try {
      const res = await axios.get(`http://localhost:3002/user/${targetUserId}/followers`);
      setModalUsers(res.data.followers || []);
    } catch (err) {
      console.error("Error fetching followers:", err);
    } finally {
      setModalLoading(false);
    }
  };

  const openFollowingModal = async () => {
    setActiveModal("following");
    setModalLoading(true);
    setModalUsers([]);
    try {
      const res = await axios.get(`http://localhost:3002/user/${targetUserId}/following`);
      setModalUsers(res.data.following || []);
    } catch (err) {
      console.error("Error fetching following:", err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleModalUserFollow = async (modalUserId, currentlyFollowing) => {
    if (!currentUserId) return;
    const endpoint = currentlyFollowing
      ? `http://localhost:3002/user/${modalUserId}/unfollow`
      : `http://localhost:3002/user/${modalUserId}/follow`;
    try {
      const token = localStorage.getItem("token");
      await axios.post(endpoint, { userId: currentUserId }, {
        headers: {
          "x-user-id": currentUserId,
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
      });
      setModalUsers(prev =>
        prev.map(u => u._id.toString() === modalUserId.toString()
          ? { ...u, _currentlyFollowing: !currentlyFollowing }
          : u
        )
      );
    } catch (err) {
      console.error("Error toggling follow in modal:", err);
    }
  };

  const AvatarFallback = () => (
    <div className="gh-avatar-xl-fallback">
      <svg viewBox="0 0 16 16" width="64" height="64" fill="currentColor">
        <path d="M10.561 8.073a6.005 6.005 0 0 1 3.432 5.142.75.75 0 1 1-1.498.07 4.5 4.5 0 0 0-8.99 0 .75.75 0 0 1-1.498-.07 6.004 6.004 0 0 1 3.431-5.142 3.999 3.999 0 1 1 5.123 0ZM10.5 5a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z"></path>
      </svg>
    </div>
  );

  const FollowButton = () => {
    if (isOwnProfile || !currentUserId) return null;

    let label = followLoading
      ? (isFollowing ? "Unfollowing..." : "Following...")
      : isFollowing
        ? (hovered ? "Unfollow" : "Following")
        : "Follow";

    return (
      <button
        className={`gh-follow-btn${isFollowing ? " following" : ""}${hovered && isFollowing ? " unfollow-hover" : ""}`}
        onClick={handleFollowToggle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        disabled={followLoading}
      >
        {label}
      </button>
    );
  };

  const UserCard = ({ user }) => {
    const isMe = currentUserId && user._id.toString() === currentUserId.toString();
    const alreadyFollowing = user._currentlyFollowing != null
      ? user._currentlyFollowing
      : false;

    return (
      <div className="gh-follow-user-card">
        <div className="gh-follow-user-info">
          <Link to={`/user/${user._id}`} className="gh-follow-avatar-link">
            {user.profileImage ? (
              <img src={user.profileImage} alt={user.username} className="gh-follow-avatar-sm" onError={e => e.target.style.display = "none"} />
            ) : (
              <div className="gh-follow-avatar-sm-fallback">
                <svg viewBox="0 0 16 16" width="22" height="22" fill="currentColor">
                  <path d="M10.561 8.073a6.005 6.005 0 0 1 3.432 5.142.75.75 0 1 1-1.498.07 4.5 4.5 0 0 0-8.99 0 .75.75 0 0 1-1.498-.07 6.004 6.004 0 0 1 3.431-5.142 3.999 3.999 0 1 1 5.123 0ZM10.5 5a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z"></path>
                </svg>
              </div>
            )}
          </Link>
          <div>
            <Link to={`/user/${user._id}`} className="gh-follow-user-name">{user.username}</Link>
            <p className="gh-follow-user-email">{user.email}</p>
          </div>
        </div>
        {!isMe && currentUserId && (
          <button
            className={`gh-follow-btn-sm${alreadyFollowing ? " following" : ""}`}
            onClick={() => handleModalUserFollow(user._id, alreadyFollowing)}
          >
            {alreadyFollowing ? "Following" : "Follow"}
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      <Navbar />
      <div className="gh-profile-wrapper">
        {/* Tab Nav */}
        <div className="gh-profile-tabs-nav">
          <div className="gh-profile-tabs-container">
            <nav className="gh-profile-nav-list" aria-label="Public Profile Navigation">
              <button
                type="button"
                className={`gh-profile-tab-item${activeTab === "overview" ? " active" : ""}`}
                onClick={() => setActiveTab("overview")}
              >
                <span>Overview</span>
              </button>
              <button
                type="button"
                className={`gh-profile-tab-item${activeTab === "repositories" ? " active" : ""}`}
                onClick={() => setActiveTab("repositories")}
              >
                <span>Repositories</span>
                <span className="gh-profile-tab-count">{repositories.length}</span>
              </button>
            </nav>
          </div>
        </div>

        <div className="gh-profile-container">
          {/* Sidebar */}
          <aside className="gh-profile-sidebar">
            <div className="gh-avatar-xl-container" style={{ cursor: "default" }}>
              {profile?.profileImage ? (
                <img src={profile.profileImage} alt={profile?.username} className="gh-avatar-img-xl" onError={e => e.target.style.display = "none"} />
              ) : (
                <AvatarFallback />
              )}
            </div>

            {loading ? (
              <div className="gh-skeleton-card skeleton" style={{ height: "80px", borderRadius: "6px" }} />
            ) : profile ? (
              <>
                <div className="gh-profile-names" style={{ marginTop: "16px" }}>
                  <h2 className="gh-profile-fullname">{profile.username || "User"}</h2>
                  {profile.email && <p className="gh-profile-email">{profile.email}</p>}
                </div>

                <FollowButton />

                <div className="gh-profile-followers">
                  <button className="gh-follow-count-btn" onClick={openFollowersModal}>
                    <strong>{followersCount}</strong> followers
                  </button>
                  <span>•</span>
                  <button className="gh-follow-count-btn" onClick={openFollowingModal}>
                    <strong>{followingCount}</strong> following
                  </button>
                </div>

                <div className="gh-profile-followers" style={{ marginTop: "4px" }}>
                  <span>{repositories.length} repositories</span>
                </div>
              </>
            ) : (
              <p className="gh-text-muted">User not found.</p>
            )}
          </aside>

          {/* Main */}
          <main className="gh-profile-main">
            {activeTab === "overview" && (
              <>
                <div className="gh-heatmap-card">
                  <HeatMapProfile />
                </div>

                <div className="gh-profile-repos-section">
                  <div className="gh-repos-header">
                    <h3>Repositories</h3>
                  </div>
                  {loading ? (
                    <div className="gh-skeleton-list">
                      <div className="gh-skeleton-card skeleton" />
                      <div className="gh-skeleton-card skeleton" />
                    </div>
                  ) : repositories.length === 0 ? (
                    <div className="gh-empty-state"><p>No public repositories.</p></div>
                  ) : (
                    <div className="gh-repo-cards-grid">
                      {repositories.map(repo => (
                        <div key={repo._id} className="gh-repo-card">
                          <div className="gh-repo-card-header">
                            <div className="gh-repo-title-wrapper">
                              <Link to={`/repo/${repo._id}`} className="gh-repo-name-link">{repo.name}</Link>
                              <span className="gh-badge-visibility">
                                {repo.visibility === false || repo.visibility === "private" ? "Private" : "Public"}
                              </span>
                            </div>
                            <span className="gh-meta-item">⭐ {Array.isArray(repo.stars) ? repo.stars.length : 0}</span>
                          </div>
                          {repo.description && <p className="gh-repo-desc-text">{repo.description}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {activeTab === "repositories" && (
              <div className="gh-profile-repos-section">
                <div className="gh-repos-header"><h3>All Repositories</h3></div>
                {repositories.length === 0 ? (
                  <div className="gh-empty-state"><p>No public repositories.</p></div>
                ) : (
                  <div className="gh-repo-cards-grid">
                    {repositories.map(repo => (
                      <div key={repo._id} className="gh-repo-card">
                        <div className="gh-repo-card-header">
                          <div className="gh-repo-title-wrapper">
                            <Link to={`/repo/${repo._id}`} className="gh-repo-name-link">{repo.name}</Link>
                            <span className="gh-badge-visibility">
                              {repo.visibility === false || repo.visibility === "private" ? "Private" : "Public"}
                            </span>
                          </div>
                          <span className="gh-meta-item">⭐ {Array.isArray(repo.stars) ? repo.stars.length : 0}</span>
                        </div>
                        {repo.description && <p className="gh-repo-desc-text">{repo.description}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Followers / Following Modal */}
      {activeModal && (
        <div className="gh-modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="gh-modal-box" onClick={e => e.stopPropagation()}>
            <div className="gh-modal-header">
              <h3>{activeModal === "followers" ? "Followers" : "Following"}</h3>
              <button className="gh-modal-close" onClick={() => setActiveModal(null)}>✕</button>
            </div>
            <div className="gh-modal-body">
              {modalLoading ? (
                <p className="gh-text-muted" style={{ padding: "16px" }}>Loading...</p>
              ) : modalUsers.length === 0 ? (
                <p className="gh-text-muted" style={{ padding: "16px" }}>
                  {activeModal === "followers" ? "No followers yet." : "Not following anyone yet."}
                </p>
              ) : (
                modalUsers.map(u => <UserCard key={u._id} user={u} />)
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserPublicProfile;
