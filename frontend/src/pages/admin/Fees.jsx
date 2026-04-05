// frontend/src/pages/admin/Fees.jsx
import { useState, useEffect } from "react";
import { CreditCard, CheckCircle, Clock, Users } from "lucide-react";
import { fetchAdminFees } from "../../api";
import "./Dashboard.css"; // Reuse dashboard UI class structures for cards & tables

function AdminFees() {
  const [data, setData] = useState({ aggregates: {}, students: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetchAdminFees();
        if (res.success) {
          setData(res.data);
        } else {
          setError(res.message || "Failed to load fee data.");
        }
      } catch {
        setError("Network error connecting to backend.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading fee management panel...</p>
      </div>
    );
  }

  if (error) {
    return <div className="dashboard-wrapper"><p className="error-message">{error}</p></div>;
  }

  const { aggregates, students } = data;

  const filteredStudents = students.filter(student => 
    student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    student.adm_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="dashboard-wrapper fade-in-slide">
      <div className="dashboard-header">
        <div>
          <h2>Fee Management</h2>
          <p className="subtitle">School-wide transport fee monitoring</p>
        </div>
      </div>

      {/* Aggregate Cards */}
      <div className="stats-grid">
        <div className="stat-card glass-card hover-lift pulse-border">
          <div className="stat-info">
            <span className="stat-label">Total Receivables</span>
            <span className="stat-value">₹{aggregates.totalReceivables?.toLocaleString() || 0}</span>
          </div>
          <div className="stat-icon" style={{ background: "rgba(37, 99, 235, 0.1)", color: "#2563eb" }}>
            <CreditCard size={28} />
          </div>
        </div>

        <div className="stat-card glass-card hover-lift">
          <div className="stat-info">
            <span className="stat-label">Total Collected</span>
            <span className="stat-value text-green">₹{aggregates.totalCollected?.toLocaleString() || 0}</span>
          </div>
          <div className="stat-icon" style={{ background: "rgba(22, 163, 74, 0.1)", color: "#16a34a" }}>
            <CheckCircle size={28} />
          </div>
        </div>

        <div className="stat-card glass-card hover-lift">
          <div className="stat-info">
            <span className="stat-label">Total Pending</span>
            <span className="stat-value text-orange">₹{aggregates.totalPending?.toLocaleString() || 0}</span>
          </div>
          <div className="stat-icon" style={{ background: "rgba(217, 119, 6, 0.1)", color: "#d97706" }}>
            <Clock size={28} />
          </div>
        </div>

        <div className="stat-card glass-card hover-lift">
          <div className="stat-info">
            <span className="stat-label">Total Students</span>
            <span className="stat-value">{aggregates.totalStudents || 0}</span>
          </div>
          <div className="stat-icon" style={{ background: "rgba(107, 114, 128, 0.1)", color: "#6b7280" }}>
            <Users size={28} />
          </div>
        </div>
      </div>

      {/* Detailed Students Fees Table */}
      <div className="registry-container glass-card" style={{ marginTop: '24px' }}>
        <div className="registry-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <h3 style={{ margin: 0 }}>Student Fee Registry</h3>
          <input 
            type="text" 
            placeholder="Search by name or admission no..." 
            className="crud-filter-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="crud-table-wrapper">
          <table className="crud-table">
            <thead>
              <tr>
                <th>Student ID/Name</th>
                <th>Admission No</th>
                <th>Semester</th>
                <th>Total Fee</th>
                <th>Paid</th>
                <th>Pending</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student.student_id}>
                  <td>
                    <div className="td-strong">{student.full_name}</div>
                  </td>
                  <td>{student.adm_number}</td>
                  <td>{student.semester}</td>
                  <td>₹{student.total_fee.toLocaleString()}</td>
                  <td className="text-green">₹{student.paid_amount.toLocaleString()}</td>
                  <td className="text-orange">₹{student.pending_amount.toLocaleString()}</td>
                  <td>
                    <span 
                      className={`status-badge ${student.status === "Paid" ? "status-active" : "status-maintenance"}`}
                    >
                      {student.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan="7" className="empty-state">No relevant students found matching your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminFees;
