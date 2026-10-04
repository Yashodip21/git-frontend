import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "../Navbar";
import "./repo.css";

const CreateRepository = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState(true); // true = Public, false = Private
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name.trim()) {
      setError("Repository name is required.");
      return;
    }

    const owner = localStorage.getItem("userId");
    if (!owner) {
      setError("Authentication error: User ID not found. Please log in again.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:3002/repo/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          visibility: Boolean(visibility),
          owner: owner,
        }),
      });

      if (!response.ok) {
        if (response.status === 400) {
          const data = await response.json().catch(() => ({}));
          setError(data.error || "Validation error (400): Invalid repository name or user ID.");
        } else if (response.status === 401) {
          setError("Authentication error (401). Please log in again.");
        } else if (response.status === 403) {
          setError("Permission denied (403).");
        } else if (response.status === 500) {
          setError("Server error (500). Failed to create repository.");
        } else {
          setError(`Error creating repository (${response.status}).`);
        }
      } else {
        const data = await response.json();
        setSuccess("Repository created successfully! Redirecting to dashboard...");
        setTimeout(() => {
          navigate("/");
        }, 1000);
      }
    } catch (err) {
      console.error("Error creating repository: ", err);
      setError("Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="gh-create-repo-wrapper">
        <div className="gh-create-repo-container">
          <div className="gh-create-header">
            <h2>Create a new repository</h2>
            <p className="gh-text-muted">
              A repository contains all project files, including the revision history.
            </p>
          </div>

          {error && <div className="gh-alert-error">{error}</div>}
          {success && <div className="gh-alert-success">{success}</div>}

          <form onSubmit={handleSubmit} className="gh-create-form">
            <div className="gh-form-group">
              <label htmlFor="repo-name" className="gh-form-label">
                Repository name <span className="gh-required">*</span>
              </label>
              <input
                id="repo-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. my-awesome-project"
                className="gh-form-input"
                required
                disabled={loading}
              />
              <p className="gh-input-hint">
                Great repository names are short and memorable.
              </p>
            </div>

            <div className="gh-form-group">
              <label htmlFor="repo-desc" className="gh-form-label">
                Description <span className="gh-optional">(optional)</span>
              </label>
              <input
                id="repo-desc"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description of your repository..."
                className="gh-form-input"
                disabled={loading}
              />
            </div>

            <div className="gh-form-group gh-visibility-group">
              <label className="gh-form-label">Visibility</label>
              <div className="gh-radio-options">
                <label className={`gh-radio-card ${visibility === true ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name="visibility"
                    checked={visibility === true}
                    onChange={() => setVisibility(true)}
                    disabled={loading}
                  />
                  <div className="gh-radio-content">
                    <div className="gh-radio-title">
                      <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
                        <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z"></path>
                      </svg>
                      <strong>Public</strong>
                    </div>
                    <p>Anyone on the internet can see this repository.</p>
                  </div>
                </label>

                <label className={`gh-radio-card ${visibility === false ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name="visibility"
                    checked={visibility === false}
                    onChange={() => setVisibility(false)}
                    disabled={loading}
                  />
                  <div className="gh-radio-content">
                    <div className="gh-radio-title">
                      <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
                        <path d="M4 4a4 4 0 0 1 8 0v2h.25c.966 0 1.75.784 1.75 1.75v5.5A1.75 1.75 0 0 1 12.25 15h-8.5A1.75 1.75 0 0 1 2 13.25v-5.5C2 6.784 2.784 6 3.75 6H4Zm1.5 2h5V4a2.5 2.5 0 0 0-5 0Z"></path>
                      </svg>
                      <strong>Private</strong>
                    </div>
                    <p>You choose who can see and commit to this repository.</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="gh-form-actions">
              <button
                type="submit"
                className="gh-btn-primary"
                disabled={loading}
              >
                {loading ? "Creating repository..." : "Create repository"}
              </button>
              <Link to="/" className="gh-btn-cancel">
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default CreateRepository;
