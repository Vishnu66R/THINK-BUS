// frontend/src/pages/student/Profile.jsx
// -------------------------------------------
// Student Profile page — shows personal details
// and contact information.
// -------------------------------------------

import { useState, useEffect } from "react";
import { 
  User, 
  GraduationCap, 
  Bus, 
  Phone 
} from "lucide-react";
import { fetchStudentProfile } from "../../api";
import "./Profile.css";

function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const username = JSON.parse(localStorage.getItem("thinkbus_user"))?.username || "";

  useEffect(() => {
    async function loadProfile() {
      if (!username) return;
      try {
        const res = await fetchStudentProfile(username);
        if (res.success) {
          setProfile(res.data);
        } else {
          setError(res.message || "Failed to load profile details");
        }
      } catch (err) {
        setError("Error connecting to server");
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [username]);

  if (loading) {
    return (
      <div className="student-loading">
        <div className="student-spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="student-loading">
        <p style={{ color: "#ef4444", fontWeight: "bold" }}>{error || "Profile data not found"}</p>
      </div>
    );
  }


  return (
    <div className="profile-page" id="profile-page">
      <div className="profile-header">
        <h2 className="profile-page-title">My Profile</h2>
        <p className="profile-page-desc">Your personal and transport details.</p>
      </div>

      <div className="profile-content">
        {/* Profile Card */}
        <div className="profile-card-main">
          <div className="profile-avatar-section">
            <div className="profile-avatar">
              <User size={40} />
            </div>
            <h3 className="profile-name">{profile.fullName}</h3>
            <span className="profile-adm">{profile.admNumber}</span>
            <span className={`profile-status ${profile.isActive ? "active" : ""}`}>
              {profile.isActive ? "Active Student" : "Inactive"}
            </span>
          </div>
        </div>

        {/* Details Sections */}
        <div className="profile-details-col">
          {/* Academic Info */}
          <div className="profile-section">
            <h3 className="profile-section-title">
              <GraduationCap size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              Academic Information
            </h3>
            <div className="profile-grid">
              <div className="profile-field">
                <span className="field-label">Full Name</span>
                <span className="field-value">{profile.fullName}</span>
              </div>
              <div className="profile-field">
                <span className="field-label">Admission No.</span>
                <span className="field-value">{profile.admNumber}</span>
              </div>
              <div className="profile-field">
                <span className="field-label">Department</span>
                <span className="field-value">{profile.department}</span>
              </div>
              <div className="profile-field">
                <span className="field-label">Semester</span>
                <span className="field-value">{profile.semester}</span>
              </div>
            </div>
          </div>

          {/* Transport Info */}
          <div className="profile-section">
            <h3 className="profile-section-title">
              <Bus size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              Transport Information
            </h3>
            <div className="profile-grid">
              <div className="profile-field">
                <span className="field-label">Bus Number</span>
                <span className="field-value">{profile.busNumber}</span>
              </div>
              <div className="profile-field">
                <span className="field-label">Route</span>
                <span className="field-value">{profile.routeName}</span>
              </div>
              <div className="profile-field">
                <span className="field-label">Boarding Stop</span>
                <span className="field-value">{profile.stopName}</span>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="profile-section">
            <h3 className="profile-section-title">
              <Phone size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
              Contact Information
            </h3>
            <div className="profile-grid">
              <div className="profile-field">
                <span className="field-label">Email</span>
                <span className="field-value">{profile.email}</span>
              </div>
              <div className="profile-field">
                <span className="field-label">Phone</span>
                <span className="field-value">{profile.phone}</span>
              </div>
              <div className="profile-field">
                <span className="field-label">Parent / Guardian</span>
                <span className="field-value">{profile.parentName}</span>
              </div>
              <div className="profile-field">
                <span className="field-label">Parent Phone</span>
                <span className="field-value">{profile.parentPhone}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
