import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Navbar from "../Navbar";
import "./repo.css";

function formatTimeAgo(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now - date) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? "s" : ""} ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return date.toLocaleDateString();
}

function formatFileSize(bytes) {
  if (typeof bytes !== "number" || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const RepoDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [repo, setRepo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("code"); // "code", "commits", or "issues"
  const [isStarred, setIsStarred] = useState(false);
  const [starCount, setStarCount] = useState(0);

  // File explorer states
  const [files, setFiles] = useState([]);
  const [commits, setCommits] = useState([]);
  const [latestCommit, setLatestCommit] = useState(null);
  const [currentPath, setCurrentPath] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [filesLoading, setFilesLoading] = useState(false);
  const [commitsLoading, setCommitsLoading] = useState(false);

  // Upload states
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(null);

  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const userId = localStorage.getItem("userId");

  const fetchRepoDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`16.171.154.247 :3002/repo/${id}`);
      if (!response.ok) {
        if (response.status === 404) setError("Repository not found (404)");
        else if (response.status === 400) setError("Invalid Repository ID (400)");
        else if (response.status === 500) setError("Server error (500)");
        else setError(`Failed to fetch repository details (${response.status})`);
      } else {
        const data = await response.json();
        if (!data) {
          setError("Repository not found");
        } else {
          setRepo(data);
          const starsArr = Array.isArray(data.stars) ? data.stars : [];
          setStarCount(starsArr.length);
          if (userId) {
            setIsStarred(starsArr.some((s) => (typeof s === "object" ? s._id : s).toString() === userId));
          }
        }
      }
    } catch (err) {
      console.error("Error fetching repository details: ", err);
      setError("Unable to connect to server");
    } finally {
      setLoading(false);
    }
  };

  const fetchRepoFiles = async () => {
    setFilesLoading(true);
    try {
      const res = await fetch(`http://localhost:3002/repo/${id}/files`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
        if (data.latestCommit) {
          setLatestCommit(data.latestCommit);
        }
      }
    } catch (err) {
      console.error("Error fetching repository files:", err);
    } finally {
      setFilesLoading(false);
    }
  };

  const fetchRepoCommits = async () => {
    setCommitsLoading(true);
    try {
      const res = await fetch(`http://localhost:3002/repo/${id}/commits`);
      if (res.ok) {
        const data = await res.json();
        setCommits(data.commits || []);
        if (data.commits && data.commits.length > 0) {
          setLatestCommit(data.commits[0]);
        }
      }
    } catch (err) {
      console.error("Error fetching commits:", err);
    } finally {
      setCommitsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchRepoDetails();
      fetchRepoFiles();
      fetchRepoCommits();
      setCurrentPath("");
      setSelectedFile(null);
    }
  }, [id]);

  const handleToggleStar = async () => {
    if (!userId || !repo) return;

    const newIsStarred = !isStarred;
    const newStarCount = newIsStarred ? starCount + 1 : Math.max(0, starCount - 1);

    setIsStarred(newIsStarred);
    setStarCount(newStarCount);

    try {
      const endpoint = newIsStarred
        ? `http://localhost:3002/repo/${id}/star`
        : `http://localhost:3002/repo/${id}/unstar`;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) {
        fetchRepoDetails();
      } else {
        const data = await res.json();
        if (typeof data.starCount === "number") {
          setStarCount(data.starCount);
        }
        if (typeof data.starred === "boolean") {
          setIsStarred(data.starred);
        }
      }
    } catch (err) {
      console.error("Error toggling star in RepoDetails: ", err);
      fetchRepoDetails();
    }
  };

  const handleOpenFile = async (filePath) => {
    setSelectedFile({ path: filePath, content: "", loading: true });
    try {
      const res = await fetch(`http://localhost:3002/repo/${id}/file?path=${encodeURIComponent(filePath)}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedFile({
          path: filePath,
          content: data.content,
          size: data.size,
          loading: false,
        });
      } else {
        setSelectedFile({
          path: filePath,
          content: "Failed to load file content.",
          loading: false,
          error: true,
        });
      }
    } catch (err) {
      setSelectedFile({
        path: filePath,
        content: "Error connecting to server.",
        loading: false,
        error: true,
      });
    }
  };

  const handleFileUpload = async (e) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    const formData = new FormData();
    for (let i = 0; i < selectedFiles.length; i++) {
      const f = selectedFiles[i];
      formData.append("files", f);
      const relPath = currentPath ? `${currentPath}/${f.name}` : f.name;
      formData.append("paths", relPath);
    }
    formData.append(
      "message",
      selectedFiles.length === 1 ? `Add ${selectedFiles[0].name}` : `Add ${selectedFiles.length} files`
    );

    try {
      const res = await fetch(`http://localhost:3002/repo/${id}/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setUploadError(errData.error || "Failed to upload file(s)");
      } else {
        setUploadSuccess(`Successfully added ${selectedFiles.length} file(s)`);
        fetchRepoFiles();
        fetchRepoCommits();
        fetchRepoDetails();
        setTimeout(() => setUploadSuccess(null), 4000);
      }
    } catch (err) {
      setUploadError("Network error while uploading file");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFolderUpload = async (e) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    const formData = new FormData();
    for (let i = 0; i < selectedFiles.length; i++) {
      const f = selectedFiles[i];
      formData.append("files", f);
      // Browser provides webkitRelativePath for folder upload
      const rel = f.webkitRelativePath || f.name;
      const finalRel = currentPath ? `${currentPath}/${rel}` : rel;
      formData.append("paths", finalRel);
    }
    formData.append("message", `Add folder (${selectedFiles.length} files)`);

    try {
      const res = await fetch(`http://localhost:3002/repo/${id}/upload`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setUploadError(errData.error || "Failed to upload folder");
      } else {
        setUploadSuccess(`Successfully added folder with ${selectedFiles.length} file(s)`);
        fetchRepoFiles();
        fetchRepoCommits();
        fetchRepoDetails();
        setTimeout(() => setUploadSuccess(null), 4000);
      }
    } catch (err) {
      setUploadError("Network error while uploading folder");
    } finally {
      setUploading(false);
      if (folderInputRef.current) folderInputRef.current.value = "";
    }
  };

  // Compute folder and file items inside currentPath
  const getCurrentDirItems = () => {
    const foldersMap = {};
    const currentFiles = [];

    const prefix = currentPath ? `${currentPath}/` : "";

    for (const f of files) {
      if (!f.path) continue;
      if (prefix && !f.path.startsWith(prefix)) continue;

      const remaining = prefix ? f.path.substring(prefix.length) : f.path;
      const slashIdx = remaining.indexOf("/");

      if (slashIdx === -1) {
        // Direct file
        currentFiles.push({
          ...f,
          displayName: remaining,
          isFolder: false,
        });
      } else {
        // Subfolder
        const folderName = remaining.substring(0, slashIdx);
        if (!foldersMap[folderName]) {
          foldersMap[folderName] = {
            displayName: folderName,
            path: prefix + folderName,
            isFolder: true,
            commitMessage: f.commitMessage || "Update",
          };
        }
      }
    }

    const folderItems = Object.values(foldersMap).sort((a, b) => a.displayName.localeCompare(b.displayName));
    const fileItems = currentFiles.sort((a, b) => a.displayName.localeCompare(b.displayName));

    return [...folderItems, ...fileItems];
  };

  const breadcrumbParts = currentPath ? currentPath.split("/") : [];

  return (
    <>
      <Navbar />
      <div className="gh-repo-details-wrapper">
        {loading ? (
          <div className="gh-details-loading">
            <div className="gh-skeleton-card skeleton" style={{ height: "120px" }}></div>
            <div className="gh-skeleton-card skeleton" style={{ height: "300px", marginTop: "16px" }}></div>
          </div>
        ) : error ? (
          <div className="gh-error-banner">
            <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
              <path d="M8 16A8 8 0 1 1 8 0a8 8 0 0 1 0 16ZM7.25 5v3.5a.75.75 0 0 0 1.5 0V5a.75.75 0 0 0-1.5 0Zm0 6v1.5a.75.75 0 0 0 1.5 0V11a.75.75 0 0 0-1.5 0Z"></path>
            </svg>
            <span>{error}</span>
            <button onClick={() => navigate("/")} className="gh-btn-retry">
              Back to Dashboard
            </button>
          </div>
        ) : repo ? (
          <div className="gh-repo-view">
            {/* Repo Header */}
            <div className="gh-repo-header-nav">
              <div className="gh-repo-header-top">
                <div className="gh-repo-name-badge">
                  <svg viewBox="0 0 16 16" width="18" height="18" fill="currentColor" style={{ color: "#8b949e" }}>
                    <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v.5a.25.25 0 0 1-.25.25h-3.5a.25.25 0 0 1-.25-.25z"></path>
                  </svg>
                  <span className="gh-repo-owner-prefix">
                    {typeof repo.owner === "object" ? repo.owner?.username || repo.owner?._id : repo.owner || "owner"} /
                  </span>
                  <h1 className="gh-repo-title">{repo.name}</h1>
                  <span className="gh-badge-visibility">
                    {repo.visibility === false || repo.visibility === "private" ? "Private" : "Public"}
                  </span>
                </div>

                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <button
                    className={`gh-btn-star-lg ${isStarred ? "starred" : ""}`}
                    onClick={handleToggleStar}
                  >
                    <span className="gh-star-icon">{isStarred ? "★" : "☆"}</span>
                    <span>{isStarred ? "Starred" : "Star"}</span>
                    <span className="gh-star-count-lg">{starCount}</span>
                  </button>

                  <Link to="/" className="gh-btn-sidebar">
                    Back to Dashboard
                  </Link>
                </div>
              </div>

              {/* GitHub Tab Navigation */}
              <div className="gh-tabs-bar">
                <button
                  className={`gh-tab-btn ${activeTab === "code" ? "active" : ""}`}
                  onClick={() => {
                    setActiveTab("code");
                    setSelectedFile(null);
                  }}
                >
                  <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
                    <path d="m11.28 3.22 4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734L14.44 8l-3.97-3.97a.75.75 0 1 1 1.06-1.06Zm-6.56 0a.75.75 0 0 1 1.06 1.06L1.81 8l3.97 3.97a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L.47 8.78a.75.75 0 0 1 0-1.06Z"></path>
                  </svg>
                  <span>Code</span>
                </button>

                <button
                  className={`gh-tab-btn ${activeTab === "commits" ? "active" : ""}`}
                  onClick={() => {
                    setActiveTab("commits");
                    fetchRepoCommits();
                  }}
                >
                  <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
                    <path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM8 0a8 8 0 1 0 0 16A8 8 0 0 0 8 0Z"></path>
                  </svg>
                  <span>Commits</span>
                  <span className="gh-counter-badge">{commits.length}</span>
                </button>

                <button
                  className={`gh-tab-btn ${activeTab === "issues" ? "active" : ""}`}
                  onClick={() => setActiveTab("issues")}
                >
                  <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
                    <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"></path>
                    <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"></path>
                  </svg>
                  <span>Issues</span>
                  <span className="gh-counter-badge">
                    {Array.isArray(repo.issues) ? repo.issues.length : 0}
                  </span>
                </button>
              </div>
            </div>

            {/* Hidden Inputs for File and Folder Upload */}
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              multiple
              onChange={handleFileUpload}
            />
            <input
              type="file"
              ref={folderInputRef}
              style={{ display: "none" }}
              webkitdirectory=""
              directory=""
              multiple
              onChange={handleFolderUpload}
            />

            {/* Main Content Layout */}
            <div className="gh-repo-content-layout">
              <div className="gh-repo-main-panel">
                {uploadSuccess && (
                  <div className="gh-repo-alert gh-repo-alert-success">
                    <span>✓ {uploadSuccess}</span>
                  </div>
                )}
                {uploadError && (
                  <div className="gh-repo-alert gh-repo-alert-error">
                    <span>⚠ {uploadError}</span>
                  </div>
                )}

                {activeTab === "code" ? (
                  <>
                    <div className="gh-file-header">
                      <p className="gh-repo-desc-text">
                        {repo.description || "No description provided for this repository."}
                      </p>
                      <p className="gh-text-muted" style={{ fontSize: "13px", marginTop: "4px" }}>
                        ⭐ <strong>{starCount}</strong> {starCount === 1 ? "star" : "stars"}
                      </p>
                    </div>

                    {/* Files Card Container */}
                    <div className="gh-files-card">
                      {/* Controls: Actions and Commit info */}
                      <div className="gh-files-card-header-actions">
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          {latestCommit ? (
                            <span style={{ fontSize: "13px", color: "#c9d1d9" }}>
                              Latest commit: <strong>{latestCommit.message}</strong>{" "}
                              <span className="gh-text-muted">({formatTimeAgo(latestCommit.date)})</span>
                            </span>
                          ) : (
                            <span className="gh-text-muted" style={{ fontSize: "13px" }}>
                              {files.length} items
                            </span>
                          )}
                        </div>

                        <div className="gh-file-actions-btns">
                          <button
                            className="gh-btn-file-action"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                          >
                            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                              <path d="M2 1.75C2 .784 2.784 0 3.75 0h5.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 12.25 16H3.75A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25V4.75H9.25A1.75 1.75 0 0 1 7.5 3V1.5Z"></path>
                            </svg>
                            <span>{uploading ? "Uploading..." : "Add File"}</span>
                          </button>

                          <button
                            className="gh-btn-file-action"
                            onClick={() => folderInputRef.current?.click()}
                            disabled={uploading}
                          >
                            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                              <path d="M1.75 1A1.75 1.75 0 0 0 0 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0 0 16 13.25v-8.5A1.75 1.75 0 0 0 14.25 3H7.5a.25.25 0 0 1-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75Z"></path>
                            </svg>
                            <span>{uploading ? "Uploading..." : "Add Folder"}</span>
                          </button>
                        </div>
                      </div>

                      {/* Breadcrumbs Navigation Bar */}
                      <div className="gh-files-card-header">
                        <div className="gh-breadcrumb-bar">
                          <span
                            className="gh-breadcrumb-link"
                            onClick={() => {
                              setCurrentPath("");
                              setSelectedFile(null);
                            }}
                          >
                            {repo.name}
                          </span>
                          {breadcrumbParts.map((part, index) => {
                            const subPath = breadcrumbParts.slice(0, index + 1).join("/");
                            const isLast = index === breadcrumbParts.length - 1;
                            return (
                              <React.Fragment key={subPath}>
                                <span className="gh-breadcrumb-separator">/</span>
                                {isLast ? (
                                  <span className="gh-breadcrumb-current">{part}</span>
                                ) : (
                                  <span
                                    className="gh-breadcrumb-link"
                                    onClick={() => {
                                      setCurrentPath(subPath);
                                      setSelectedFile(null);
                                    }}
                                  >
                                    {part}
                                  </span>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </div>

                        <span className="gh-text-muted">
                          {files.length} {files.length === 1 ? "file" : "files"}
                        </span>
                      </div>

                      {/* File Items List */}
                      <div className="gh-files-list">
                        {/* Parent Directory Link */}
                        {currentPath !== "" && (
                          <div
                            className="gh-file-row gh-file-row-clickable"
                            onClick={() => {
                              const parent = breadcrumbParts.slice(0, -1).join("/");
                              setCurrentPath(parent);
                              setSelectedFile(null);
                            }}
                          >
                            <div className="gh-file-name">
                              <span className="gh-folder-icon">📁</span>
                              <span>..</span>
                            </div>
                            <span className="gh-file-meta">Go to parent folder</span>
                          </div>
                        )}

                        {filesLoading ? (
                          <div className="gh-empty-files">
                            <p>Loading repository files...</p>
                          </div>
                        ) : getCurrentDirItems().length > 0 ? (
                          getCurrentDirItems().map((item, index) => (
                            <div
                              key={item.path || index}
                              className="gh-file-row gh-file-row-clickable"
                              onClick={() => {
                                if (item.isFolder) {
                                  setCurrentPath(item.path);
                                  setSelectedFile(null);
                                } else {
                                  handleOpenFile(item.path);
                                }
                              }}
                            >
                              <div className="gh-file-name">
                                {item.isFolder ? (
                                  <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" className="gh-folder-icon">
                                    <path d="M1.75 1A1.75 1.75 0 0 0 0 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0 0 16 13.25v-8.5A1.75 1.75 0 0 0 14.25 3H7.5a.25.25 0 0 1-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75Z"></path>
                                  </svg>
                                ) : (
                                  <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" className="gh-file-icon">
                                    <path d="M2 1.75C2 .784 2.784 0 3.75 0h5.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 12.25 16H3.75A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25V4.75H9.25A1.75 1.75 0 0 1 7.5 3V1.5Z"></path>
                                  </svg>
                                )}
                                <span>{item.displayName}</span>
                                {!item.isFolder && item.size > 0 && (
                                  <span className="gh-file-size">({formatFileSize(item.size)})</span>
                                )}
                              </div>
                              <span className="gh-file-meta">
                                {item.commitMessage || "Initial commit"}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="gh-empty-files">
                            <p>No files or content in this repository yet.</p>
                            <p style={{ fontSize: "12px", marginTop: "6px" }}>
                              Use the "Add File" / "Add Folder" buttons above or use the CLI to push files.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* File Content Preview Box */}
                    {selectedFile && (
                      <div className="gh-code-viewer-card">
                        <div className="gh-code-viewer-header">
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" style={{ color: "#8b949e" }}>
                              <path d="M2 1.75C2 .784 2.784 0 3.75 0h5.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 12.25 16H3.75A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h8.5a.25.25 0 0 0 .25-.25V4.75H9.25A1.75 1.75 0 0 1 7.5 3V1.5Z"></path>
                            </svg>
                            <span>{selectedFile.path}</span>
                            {selectedFile.size > 0 && (
                              <span className="gh-text-muted" style={{ fontSize: "12px", fontWeight: "normal" }}>
                                • {formatFileSize(selectedFile.size)}
                              </span>
                            )}
                          </div>
                          <button
                            className="gh-btn-sidebar"
                            style={{ padding: "3px 8px", fontSize: "12px" }}
                            onClick={() => setSelectedFile(null)}
                          >
                            Close
                          </button>
                        </div>
                        {selectedFile.loading ? (
                          <div style={{ padding: "24px", textAlign: "center", color: "#8b949e" }}>
                            Loading file content...
                          </div>
                        ) : (
                          <pre className="gh-code-viewer-content">{selectedFile.content}</pre>
                        )}
                      </div>
                    )}
                  </>
                ) : activeTab === "commits" ? (
                  /* Commits Tab View */
                  <div className="gh-commits-card">
                    <div className="gh-files-card-header">
                      <span>Commits</span>
                      <span className="gh-text-muted">{commits.length} commits</span>
                    </div>
                    {commitsLoading ? (
                      <div className="gh-empty-files">
                        <p>Loading commit history...</p>
                      </div>
                    ) : commits.length > 0 ? (
                      <div>
                        {commits.map((commit, idx) => (
                          <div key={commit.commitId || idx} className="gh-commit-row">
                            <div className="gh-commit-info">
                              <span className="gh-commit-msg">{commit.message}</span>
                              <div className="gh-commit-meta">
                                <span>{formatTimeAgo(commit.date)}</span>
                                {commit.fileCount > 0 && <span>• {commit.fileCount} files</span>}
                              </div>
                            </div>
                            <span className="gh-commit-badge">{commit.commitId?.slice(0, 7)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="gh-empty-files">
                        <p>No commits recorded for this repository yet.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Issues Tab View */
                  <div className="gh-issues-card">
                    <div className="gh-files-card-header">
                      <span>Repository Issues</span>
                    </div>
                    <div className="gh-files-list">
                      {Array.isArray(repo.issues) && repo.issues.length > 0 ? (
                        repo.issues.map((issue, index) => (
                          <div key={issue._id || index} className="gh-file-row">
                            <div className="gh-file-name">
                              <span className="gh-issue-badge">Open</span>
                              <span className="gh-issue-title-text">
                                {typeof issue === "object" ? issue.title || issue.description || `Issue #${index + 1}` : issue}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="gh-empty-files">
                          <p>No open issues for this repository.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Sidebar Panel */}
              <aside className="gh-repo-side-panel">
                <div className="gh-sidebar-card">
                  <h3>About</h3>
                  <p className="gh-repo-desc-text">
                    {repo.description || "No description provided."}
                  </p>
                  <div className="gh-sidebar-stats" style={{ border: "none", padding: 0 }}>
                    <div className="gh-stat-box" style={{ marginBottom: "8px" }}>
                      <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" style={{ color: "#e3b341" }}>
                        <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z"></path>
                      </svg>
                      <span className="gh-stat-label"><strong>{starCount}</strong> {starCount === 1 ? "star" : "stars"}</span>
                    </div>
                    <div className="gh-stat-box">
                      <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" style={{ color: "#8b949e" }}>
                        <path d="M5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 5 3.25Z"></path>
                      </svg>
                      <span className="gh-stat-label">0 forks</span>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
};

export default RepoDetails;
