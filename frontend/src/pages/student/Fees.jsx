// frontend/src/pages/student/Fees.jsx
import { useState, useEffect } from "react";
import { CreditCard, CheckCircle, Clock, Printer } from "lucide-react";
import { fetchStudentFees, payStudentFee } from "../../api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "./StudentDashboard.css"; // Reuse existing layout css if possible

function Fees() {
  const [feeData, setFeeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  const username = JSON.parse(localStorage.getItem("thinkbus_user"))?.username || "";

  useEffect(() => {
    loadFees();
  }, [username]);

  async function loadFees() {
    try {
      const res = await fetchStudentFees(username);
      if (res.success) {
        setFeeData(res.data);
      } else {
        setError(res.message || "Failed to load fee details");
      }
    } catch {
      setError("Could not connect to server");
    } finally {
      setLoading(false);
    }
  }

  async function handlePayFee() {
    setProcessing(true);
    try {
      const res = await payStudentFee({ username, amount: feeData.pending_amount });
      if (res.success) {
        await loadFees(); // Reload to reflect changes
      } else {
        alert("Payment failed: " + res.message);
      }
    } catch (e) {
      alert("Error processing payment.");
    } finally {
      setProcessing(false);
    }
  }

  function downloadReceipt() {
    if (!feeData || feeData.status !== "Paid") return;

    const doc = new jsPDF();
    doc.setFont("helvetica");

    // Header
    doc.setFontSize(22);
    doc.setTextColor(37, 99, 235); // Primary Blue
    doc.text("Think-Bus", 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text("Transport Fee Receipt", 14, 26);
    
    // Receipt Details
    doc.setFontSize(11);
    doc.setTextColor(50);
    doc.text(`Student Name: ${feeData.student_name}`, 14, 40);
    doc.text(`Semester: ${feeData.semester}`, 14, 46);
    doc.text(`Date Issued: ${new Date().toLocaleDateString()}`, 14, 52);
    doc.text(`Status: PAID`, 14, 58);

    // Table
    autoTable(doc, {
      startY: 70,
      head: [["Description", "Amount"]],
      body: [
        ["Transport Fee (Full Academic Year)", `INR ${feeData.paid_amount.toLocaleString()}`],
        ["Late Fees", "INR 0"],
        ["Total Paid", `INR ${feeData.paid_amount.toLocaleString()}`],
      ],
      headStyles: { fillColor: [37, 99, 235] },
      margin: { top: 10 },
    });

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text("Thank you for your payment.", 14, doc.lastAutoTable.finalY + 20);

    doc.save(`thinkbus_receipt_${feeData.student_name.replace(/\s+/g, '_')}.pdf`);
  }

  if (loading) {
    return (
      <div className="student-dashboard" style={{display: 'flex', justifyContent: 'center', height: '60vh', alignItems: 'center'}}>
        <div className="loading-spinner" style={{width: 40, height: 40, borderRadius: '50%', border: '3px solid #ccc', borderTopColor: '#3b82f6', animation: 'spin 1s linear infinite'}}></div>
      </div>
    );
  }
  
  if (error) return <div className="student-dashboard"><p style={{color: 'red', padding: 20}}>{error}</p></div>;
  if (!feeData) return null;

  return (
    <div className="student-dashboard fade-in-slide">
      <div className="sd-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div className="sd-greeting">
          <span className="sd-date">Transport Fees</span>
          <h2 className="sd-title">Manage your semester fee</h2>
        </div>
        
        {feeData.status === "Paid" && (
          <button 
            className="btn btn-primary" 
            onClick={downloadReceipt}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', boxShadow: 'var(--neu-shadow)' }}
          >
            <Printer size={16} />
            Print Receipt
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: 28, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        <div className="glass-card stat-card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="stat-icon" style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#3b82f6', padding: 16, borderRadius: 12 }}>
            <CreditCard size={28} />
          </div>
          <div className="stat-info">
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Fee</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>₹{feeData.total_fee.toLocaleString()}</div>
          </div>
        </div>

        <div className="glass-card stat-card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="stat-icon" style={{ background: 'rgba(22, 163, 74, 0.1)', color: '#16a34a', padding: 16, borderRadius: 12 }}>
            <CheckCircle size={28} />
          </div>
          <div className="stat-info">
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Paid Amount</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>₹{feeData.paid_amount.toLocaleString()}</div>
          </div>
        </div>

        <div className="glass-card stat-card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="stat-icon" style={{ background: 'rgba(217, 119, 6, 0.1)', color: '#d97706', padding: 16, borderRadius: 12 }}>
            <Clock size={28} />
          </div>
          <div className="stat-info">
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Pending Dues</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>₹{feeData.pending_amount.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Payment Section */}
      <h3 className="section-title" style={{ marginBottom: 16, fontSize: '1.1rem', fontWeight: 700 }}>Payment Action</h3>
      <div className="glass-card" style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        
        {feeData.status === "Pending" ? (
          <>
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 400 }}>
              Your transport fee for the <strong>{feeData.semester}</strong> semester is pending. 
              Please clear the dues to ensure uninterrupted bus access.
            </p>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              ₹{feeData.pending_amount.toLocaleString()}
            </div>
            <button 
              className="btn btn-primary" 
              onClick={handlePayFee} 
              disabled={processing}
              style={{ width: '100%', maxWidth: 300, padding: 16, fontSize: '1.05rem', marginTop: 10 }}
            >
              {processing ? "Processing..." : "Pay Fees Securely"}
            </button>
          </>
        ) : (
          <>
            <div style={{ background: 'rgba(22, 163, 74, 0.1)', color: '#16a34a', padding: 24, borderRadius: '50%', marginBottom: 10 }}>
              <CheckCircle size={48} />
            </div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>✓ Payment Done</h3>
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 400 }}>
              Your transport fee for the <strong>{feeData.semester}</strong> semester has been successfully processed. 
              You can now download your receipt.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default Fees;
