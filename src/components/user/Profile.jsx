import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "./profile.css";
import "./UserPublicProfile.css";
import Navbar from "../Navbar";
import { UnderlineNav } from "@primer/react";
import { BookIcon, RepoIcon, StarIcon } from "@primer/octicons-react";
import HeatMapProfile from "./HeatMap";
import { useAuth } from "../../authContext";

const Profile = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [userDetails, setUserDetails] = useState({ username: "", email: "", profileImage: "" });
  const [repositories, setRepositories] = useState([]);
  const [starredRepositories, setStarredRepositories] = useState([]);
  const [activeTab, setActiveTab] = useState("overview"); // "overview", "repositories", "starred"
  const [loading, setLoading] = useState(true);
  const [starredLoading, setStarredLoading] = useState(false);
  const [starredError, setStarredError] = useState(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [activeModal, setActiveModal] = useState(null); // "followers" | "following" | null
  const [modalUsers, setModalUsers] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

  // Profile Image Upload States
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(null);

  const { setCurrentUser, setUserProfileImage } = useAuth();
  const userId = localStorage.getItem("userId");

  const fetchStarredRepositories = async () => {
    if (!userId) {
      setStarredLoading(false);
      return;
    }
    setStarredLoading(true);
    setStarredError(null);
    try {
      const starredRes = await axios.get(`16.171.154.247:3002/user/starred?userId=${userId}`);
      if (starredRes.data && Array.isArray(starredRes.data.repositories)) {
        setStarredRepositories(starredRes.data.repositories);
      } else {
        setStarredRepositories([]);
      }
    } catch (err) {
      console.error("Cannot fetch starred repositories: ", err);
      setStarredError("Unable to load starred repositories.");
    } finally {
      setStarredLoading(false);
    }
  };

  const fetchUserDetails = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await axios.get(`http://localhost:3002/userProfile/${userId}`);
      setUserDetails(response.data);
      if (response.data.profileImage) {
        setUserProfileImage(response.data.profileImage);
      }
    } catch (err) {
      console.error("Cannot fetch user details: ", err);
    }

    try {
      const repoRes = await axios.get(`http://localhost:3002/repo/user/${userId}`);
      if (repoRes.data && Array.isArray(repoRes.data.repositories)) {
        setRepositories(repoRes.data.repositories);
      }
    } catch (err) {
      console.error("Cannot fetch user repositories: ", err);
    }

    try {
      const followRes = await axios.get(`http://localhost:3002/user/${userId}/follow-status`);
      setFollowersCount(followRes.data.followersCount || 0);
      setFollowingCount(followRes.data.followingCount || 0);
    } catch (err) {
      console.error("Cannot fetch follow status: ", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDetails();
    fetchStarredRepositories();
  }, []);

  useEffect(() => {
    if (activeTab === "starred") {
      fetchStarredRepositories();
    }
  }, [activeTab]);

  const openFollowersModal = async () => {
    setActiveModal("followers");
    setModalLoading(true);
    setModalUsers([]);
    try {
      const res = await axios.get(`http://localhost:3002/user/${userId}/followers`);
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
      const res = await axios.get(`http://localhost:3002/user/${userId}/following`);
      setModalUsers(res.data.following || []);
    } catch (err) {
      console.error("Error fetching following:", err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleModalUnfollow = async (targetId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(`http://localhost:3002/user/${targetId}/unfollow`, { userId }, {
        headers: {
          "x-user-id": userId,
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
      });
      setModalUsers((prev) => prev.filter((u) => u._id.toString() !== targetId.toString()));
      setFollowingCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Error unfollowing user:", err);
    }
  };

  const handleUnstarRepo = async (repoId) => {
    if (!userId || !repoId) return;
    try {
      await axios.post(`http://localhost:3002/repo/${repoId}/unstar`, { userId });
      setStarredRepositories((prev) => prev.filter((r) => r._id !== repoId));
    } catch (err) {
      console.error("Error unstarring repository: ", err);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    setUploadError(null);
    setUploadSuccess(null);

    if (!file) return;

    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setUploadError("Please select a valid image (JPG, JPEG, PNG, WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("Image must be smaller than 5 MB.");
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleCancelPreview = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSaveProfilePicture = async () => {
    if (!selectedFile || !userId) return;

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    const formData = new FormData();
    formData.append("profileImage", selectedFile);
    formData.append("userId", userId);

    try {
      const res = await axios.patch("http://localhost:3002/user/profile-image", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const newImageUrl = res.data.profileImage;
      setUserDetails((prev) => ({ ...prev, profileImage: newImageUrl }));
      setUserProfileImage(newImageUrl);
      setUploadSuccess("Profile picture updated successfully");
      handleCancelPreview();
    } catch (err) {
      console.error("Error uploading profile image: ", err);
      const msg = err.response?.data?.message || "Unable to update profile picture";
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Navbar />

      <div className="gh-profile-wrapper">
        {/* Navigation Tabs */}
        <div className="gh-profile-tabs-nav">
          <div className="gh-profile-tabs-container">
            <nav className="gh-profile-nav-list" aria-label="User Profile Navigation">
              <button
                type="button"
                className={`gh-profile-tab-item ${activeTab === "overview" ? "active" : ""}`}
                onClick={() => setActiveTab("overview")}
              >
                <BookIcon className="gh-tab-icon" />
                <span>Overview</span>
              </button>

              <button
                type="button"
                className={`gh-profile-tab-item ${activeTab === "repositories" ? "active" : ""}`}
                onClick={() => setActiveTab("repositories")}
              >
                <RepoIcon className="gh-tab-icon" />
                <span>Repositories</span>
                <span className="gh-profile-tab-count">{repositories.length}</span>
              </button>

              <button
                type="button"
                className={`gh-profile-tab-item ${activeTab === "starred" ? "active" : ""}`}
                onClick={() => setActiveTab("starred")}
              >
                <StarIcon className="gh-tab-icon" />
                <span>Starred Repositories</span>
                <span className="gh-profile-tab-count">{starredRepositories.length}</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Two-Column Profile Container */}
        <div className="gh-profile-container">
          {/* Left Column: User Profile Sidebar */}
          <aside className="gh-profile-sidebar">

            {/* Avatar Section with Hover Camera Overlay */}
            <div
              className="gh-avatar-xl-container"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              title="Click to change profile picture"
            >
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="gh-avatar-img-xl" />
              ) : userDetails.profileImage ? (
                <img
                  src={userDetails.profileImage}
                  alt={userDetails.username}
                  className="gh-avatar-img-xl"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="gh-avatar-xl-fallback">
                  <svg viewBox="0 0 16 16" width="64" height="64" fill="currentColor">
                    <path d="M10.561 8.073a6.005 6.005 0 0 1 3.432 5.142.75.75 0 1 1-1.498.07 4.5 4.5 0 0 0-8.99 0 .75.75 0 0 1-1.498-.07 6.004 6.004 0 0 1 3.431-5.142 3.999 3.999 0 1 1 5.123 0ZM10.5 5a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z"></path>
                  </svg>
                </div>
              )}

              {/* Hover Camera Icon Overlay */}
              <div className="gh-avatar-edit-overlay">
                <svg viewBox="0 0 16 16" width="22" height="22" fill="currentColor">
                  <path d="M10.5 8.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0Z"></path>
                  <path d="M2 4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-1.172a2 2 0 0 1-1.414-.586l-.828-.828A2 2 0 0 0 7.172 2H4.828a2 2 0 0 0-1.414.586l-.828.828A2 2 0 0 1 1.172 4H2Zm.5 2h1.172a3.5 3.5 0 0 0 2.475-1.025l.828-.828A.5.5 0 0 1 7.172 3.5h1.656a.5.5 0 0 1 .354.147l.828.828A3.5 3.5 0 0 0 12.828 6H14v6a.5.5 0 0 1-.5.5H2a.5.5 0 0 1-.5-.5V6a.5.5 0 0 1 .5-.5Z"></path>
                </svg>
              </div>
            </div>

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/jpeg,image/jpg,image/png,image/webp"
              style={{ display: "none" }}
            />

            {/* Change Profile Picture Button */}
            {!previewUrl && (
              <button
                className="gh-btn-change-avatar"
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
              >
                Change profile picture
              </button>
            )}

            {/* Image Preview & Save Actions */}
            {previewUrl && (
              <div className="gh-preview-actions-card">
                <p className="gh-preview-title">Preview profile picture</p>
                <div className="gh-preview-buttons">
                  <button
                    className="gh-btn-primary"
                    onClick={handleSaveProfilePicture}
                    disabled={uploading}
                  >
                    {uploading ? "Uploading..." : "Save profile picture"}
                  </button>
                  <button
                    className="gh-btn-cancel"
                    onClick={handleCancelPreview}
                    disabled={uploading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Alerts */}
            {uploadError && <div className="gh-alert-error" style={{ marginTop: "12px" }}>{uploadError}</div>}
            {uploadSuccess && <div className="gh-alert-success" style={{ marginTop: "12px" }}>{uploadSuccess}</div>}

            <div className="gh-profile-names" style={{ marginTop: "16px" }}>
              <h2 className="gh-profile-fullname">{userDetails.username || "User"}</h2>
              {userDetails.email && (
                <p className="gh-profile-email">{userDetails.email}</p>
              )}
            </div>

            <div className="gh-profile-followers">
              <button className="gh-follow-count-btn" onClick={openFollowersModal}>
                <strong>{followersCount}</strong> followers
              </button>
              <span>•</span>
              <button className="gh-follow-count-btn" onClick={openFollowingModal}>
                <strong>{followingCount}</strong> following
              </button>
            </div>

            <div className="gh-profile-divider"></div>

            <button
              onClick={() => {
                localStorage.removeItem("token");
                localStorage.removeItem("userId");
                setCurrentUser(null);
                setUserProfileImage("");
                window.location.href = "/auth";
              }}
              className="gh-btn-logout-sidebar"
            >
              Sign out
            </button>
          </aside>

          {/* Right Column: Main Content */}
          <main className="gh-profile-main">
            {activeTab === "overview" && (
              <>
                <div className="gh-heatmap-card">
                  <HeatMapProfile />
                </div>

                <div className="gh-profile-repos-section">
                  <div className="gh-repos-header">
                    <h3>Repositories</h3>
                    <Link to="/repo/create" className="gh-btn-sm-green">
                      New repository
                    </Link>
                  </div>

                  {loading ? (
                    <div className="gh-skeleton-list">
                      <div className="gh-skeleton-card skeleton"></div>
                      <div className="gh-skeleton-card skeleton"></div>
                    </div>
                  ) : repositories.length === 0 ? (
                    <div className="gh-empty-state">
                      <p>No repositories created yet.</p>
                      <Link to="/repo/create" className="gh-btn-primary">
                        Create repository
                      </Link>
                    </div>
                  ) : (
                    <div className="gh-repo-cards-grid">
                      {repositories.map((repo) => (
                        <div key={repo._id} className="gh-repo-card">
                          <div className="gh-repo-card-header">
                            <div className="gh-repo-title-wrapper">
                              <Link to={`/repo/${repo._id}`} className="gh-repo-name-link">
                                {repo.name}
                              </Link>
                              <span className="gh-badge-visibility">
                                {repo.visibility === false || repo.visibility === "private" ? "Private" : "Public"}
                              </span>
                            </div>
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
                <div className="gh-repos-header">
                  <h3>All Repositories</h3>
                  <Link to="/repo/create" className="gh-btn-sm-green">
                    New repository
                  </Link>
                </div>

                {repositories.length === 0 ? (
                  <div className="gh-empty-state">
                    <p>No repositories created yet.</p>
                    <Link to="/repo/create" className="gh-btn-primary">
                      Create repository
                    </Link>
                  </div>
                ) : (
                  <div className="gh-repo-cards-grid">
                    {repositories.map((repo) => (
                      <div key={repo._id} className="gh-repo-card">
                        <div className="gh-repo-card-header">
                          <div className="gh-repo-title-wrapper">
                            <Link to={`/repo/${repo._id}`} className="gh-repo-name-link">
                              {repo.name}
                            </Link>
                            <span className="gh-badge-visibility">
                              {repo.visibility === false || repo.visibility === "private" ? "Private" : "Public"}
                            </span>
                          </div>
                        </div>
                        {repo.description && <p className="gh-repo-desc-text">{repo.description}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "starred" && (
              <div className="gh-profile-repos-section">
                <div className="gh-repos-header">
                  <h3>Starred Repositories</h3>
                </div>

                {starredLoading ? (
                  <div className="gh-skeleton-list" style={{ padding: "16px 0" }}>
                    <p className="gh-text-muted">Loading starred repositories...</p>
                  </div>
                ) : starredError ? (
                  <div className="gh-alert-error" style={{ margin: "16px 0" }}>
                    {starredError}
                  </div>
                ) : starredRepositories.length === 0 ? (
                  <div className="gh-empty-state">
                    <p>No starred repositories yet.</p>
                    <Link to="/" className="gh-btn-primary" style={{ marginTop: "12px" }}>
                      Explore Dashboard
                    </Link>
                  </div>
                ) : (
                  <div className="gh-repo-cards-grid">
                    {starredRepositories.map((repo) => (
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

                          <button
                            className="gh-btn-star starred"
                            onClick={() => handleUnstarRepo(repo._id)}
                            title="Click to unstar"
                          >
                            <span className="gh-star-icon">★</span>
                            <span>Starred</span>
                          </button>
                        </div>

                        {repo.description && <p className="gh-repo-desc-text">{repo.description}</p>}

                        <div className="gh-repo-footer-meta">
                          <span className="gh-meta-item">
                            Owner: {typeof repo.owner === "object" ? repo.owner?.username || repo.owner?.userName || repo.owner?._id : repo.owner || "User"}
                          </span>
                          <span className="gh-meta-item">
                            ⭐ {Array.isArray(repo.stars) ? repo.stars.length : 0}
                          </span>
                        </div>
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
          <div className="gh-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="gh-modal-header">
              <h3>{activeModal === "followers" ? "Followers" : "Following"}</h3>
              <button className="gh-modal-close" onClick={() => setActiveModal(null)}>✕</button>
            </div>
            <div className="gh-modal-body">
              {modalLoading ? (
                <p className="gh-text-muted" style={{ padding: "16px" }}>Loading...</p>
              ) : modalUsers.length === 0 ? (
                <p className="gh-text-muted" style={{ padding: "16px" }}>
                  {activeModal === "followers" ? "No followers yet." : "You're not following anyone yet."}
                </p>
              ) : (
                modalUsers.map((u) => (
                  <div key={u._id} className="gh-follow-user-card">
                    <div className="gh-follow-user-info">
                      <Link to={`/user/${u._id}`} className="gh-follow-avatar-link">
                        {u.profileImage ? (
                          <img
                            src={u.profileImage}
                            alt={u.username}
                            className="gh-follow-avatar-sm"
                            onError={(e) => (e.target.style.display = "none")}
                          />
                        ) : (
                          <div className="gh-follow-avatar-sm-fallback">
                            <svg viewBox="0 0 16 16" width="22" height="22" fill="currentColor">
                              <path d="M10.561 8.073a6.005 6.005 0 0 1 3.432 5.142.75.75 0 1 1-1.498.07 4.5 4.5 0 0 0-8.99 0 .75.75 0 0 1-1.498-.07 6.004 6.004 0 0 1 3.431-5.142 3.999 3.999 0 1 1 5.123 0ZM10.5 5a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z"></path>
                            </svg>
                          </div>
                        )}
                      </Link>
                      <div>
                        <Link to={`/user/${u._id}`} className="gh-follow-user-name">
                          {u.username}
                        </Link>
                        {u.email && <p className="gh-follow-user-email">{u.email}</p>}
                      </div>
                    </div>
                    {activeModal === "following" && (
                      <button
                        className="gh-follow-btn-sm following"
                        onClick={() => handleModalUnfollow(u._id)}
                        title="Click to unfollow"
                      >
                        Unfollow
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Profile;