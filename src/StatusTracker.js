import { useState } from 'react';
import axios from 'axios';
import API_BASE from './config/api';

function StatusTracker() {
  const [serialNumber, setSerialNumber] = useState('');
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const checkStatus = async () => {
    if (!serialNumber) {
      setError('Please enter your reference number');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setApplication(null);

      const response = await axios.get(
        `${API_BASE}/api/citizen/status/${serialNumber}`
      );

      setApplication(response.data.application);
      setLoading(false);

    } catch (err) {
      setLoading(false);
      setError('Application not found. Check your reference number.');
    }
  };

  return (
    <div style={styles.container}>

      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>e-Kitambulisho</h1>
        <p style={styles.tagline}>
          Kenya Digital ID Pre-Registration System
        </p>
      </div>

      {/* Search Section */}
      <div style={styles.searchBox}>
        <h2 style={styles.subtitle}>
          Track Your Application
        </h2>

        <div style={styles.inputRow}>
          <input
            style={styles.input}
            type="text"
            placeholder="Enter reference e.g. KE-2026-00001"
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && checkStatus()}
          />
          <button
            style={styles.button}
            onClick={checkStatus}
          >
            {loading ? 'Checking...' : 'Check Status'}
          </button>
        </div>

        {error && (
          <p style={styles.error}>⚠️ {error}</p>
        )}
      </div>

      {/* Results Section */}
      {application && (
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>
            Application Details
          </h3>

          <div style={styles.row}>
            <span style={styles.label}>Full Name:</span>
            <span>
              {application.first_name} {application.last_name}
            </span>
          </div>

          <div style={styles.row}>
            <span style={styles.label}>Reference No:</span>
            <span style={styles.refNumber}>
              {application.serial_number}
            </span>
          </div>

          <div style={styles.row}>
            <span style={styles.label}>County:</span>
            <span>{application.county_name}</span>
          </div>

          <div style={styles.row}>
            <span style={styles.label}>Ward:</span>
            <span>{application.ward_name}</span>
          </div>

          <div style={styles.row}>
            <span style={styles.label}>Status:</span>
            <StatusBadge status={application.current_status} />
          </div>

          <div style={styles.row}>
            <span style={styles.label}>Applied On:</span>
            <span>
              {new Date(application.created_at)
                .toLocaleDateString('en-KE')}
            </span>
          </div>

          {application.national_id_no && (
            <div style={styles.row}>
              <span style={styles.label}>ID Number:</span>
              <span style={styles.idNumber}>
                {application.national_id_no}
              </span>
            </div>
          )}

          {/* Journey Progress */}
          <div style={styles.journeySection}>
            <h4 style={styles.journeyTitle}>
              Application Journey
            </h4>
            <Journey status={application.current_status} />
          </div>
        </div>
      )}
    </div>
  );
}

// Status Badge Component
function StatusBadge({ status }) {
  const getStatusInfo = (status) => {
    switch(status) {
      case 'submitted':
        return { text: '🟡 Submitted', color: '#FFA500' };
      case 'chief_approved':
        return { text: '🟢 Chief Approved', color: '#008000' };
      case 'chief_rejected':
        return { text: '🔴 Rejected', color: '#FF0000' };
      case 'biometrics_done':
        return { text: '🔵 Biometrics Done', color: '#0000FF' };
      case 'id_ready':
        return { text: '✅ ID Ready!', color: '#006600' };
      case 'id_collected':
        return { text: '⭐ ID Collected', color: '#808080' };
      default:
        return { text: status, color: '#000' };
    }
  };

  const { text, color } = getStatusInfo(status);

  return (
    <span style={{
      color: 'white',
      backgroundColor: color,
      padding: '6px 14px',
      borderRadius: '20px',
      fontWeight: 'bold',
      fontSize: '14px'
    }}>
      {text}
    </span>
  );
}

// Journey Progress Component
function Journey({ status }) {
  const steps = [
    { key: 'submitted', label: 'Submitted' },
    { key: 'chief_approved', label: 'Chief Approved' },
    { key: 'biometrics_done', label: 'Biometrics' },
    { key: 'id_ready', label: 'ID Ready' },
    { key: 'id_collected', label: 'Collected' }
  ];

  const statusOrder = [
    'submitted',
    'chief_approved',
    'biometrics_done',
    'id_ready',
    'id_collected'
  ];

  const currentIndex = statusOrder.indexOf(status);

  return (
    <div style={styles.journey}>
      {steps.map((step, index) => (
        <div key={step.key} style={styles.journeyStep}>
          <div style={{
            ...styles.circle,
            backgroundColor: index <= currentIndex 
              ? '#006600' : '#ddd',
            color: index <= currentIndex 
              ? 'white' : '#999'
          }}>
            {index < currentIndex ? '✓' : index + 1}
          </div>
          <p style={{
            ...styles.stepLabel,
            color: index <= currentIndex 
              ? '#006600' : '#999',
            fontWeight: index === currentIndex 
              ? 'bold' : 'normal'
          }}>
            {step.label}
          </p>
        </div>
      ))}
    </div>
  );
}

// Styles
const styles = {
  container: {
    maxWidth: '650px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'Arial, sans-serif'
  },
  header: {
    backgroundColor: '#006600',
    color: 'white',
    padding: '30px',
    borderRadius: '12px',
    textAlign: 'center',
    marginBottom: '20px'
  },
  title: {
    margin: 0,
    fontSize: '2.5rem'
  },
  tagline: {
    margin: '8px 0 0',
    opacity: 0.9,
    fontSize: '14px'
  },
  searchBox: {
    border: '1px solid #ddd',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  subtitle: {
    color: '#333',
    marginTop: 0,
    marginBottom: '16px'
  },
  inputRow: {
    display: 'flex',
    gap: '10px'
  },
  input: {
    flex: 1,
    padding: '12px',
    fontSize: '15px',
    border: '2px solid #006600',
    borderRadius: '8px',
    outline: 'none'
  },
  button: {
    padding: '12px 24px',
    backgroundColor: '#006600',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  error: {
    color: '#CC0000',
    marginTop: '10px',
    fontSize: '14px'
  },
  card: {
    border: '1px solid #ddd',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  cardTitle: {
    color: '#006600',
    marginTop: 0,
    marginBottom: '20px',
    borderBottom: '2px solid #006600',
    paddingBottom: '10px'
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid #f0f0f0'
  },
  label: {
    fontWeight: 'bold',
    color: '#555',
    fontSize: '14px'
  },
  refNumber: {
    fontFamily: 'monospace',
    backgroundColor: '#f5f5f5',
    padding: '4px 8px',
    borderRadius: '4px',
    fontWeight: 'bold'
  },
  idNumber: {
    fontFamily: 'monospace',
    backgroundColor: '#e8f5e9',
    padding: '4px 8px',
    borderRadius: '4px',
    fontWeight: 'bold',
    color: '#006600'
  },
  journeySection: {
    marginTop: '20px'
  },
  journeyTitle: {
    color: '#333',
    marginBottom: '16px'
  },
  journey: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  journeyStep: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1
  },
  circle: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '14px',
    marginBottom: '8px'
  },
  stepLabel: {
    fontSize: '11px',
    textAlign: 'center',
    margin: 0
  }
};

export default StatusTracker;