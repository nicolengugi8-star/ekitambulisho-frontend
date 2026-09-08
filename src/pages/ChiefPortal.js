import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import PublicLayout from '../components/PublicLayout';
import API_BASE from '../config/api';

function ChiefPortal() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [appsLoading, setAppsLoading] = useState(false);
  const [error, setError] = useState('');
  const [wardId, setWardId] = useState('');

  const handleLogin = async (e) => {
    e?.preventDefault();
    try {
      setLoading(true);
      setError('');

      const response = await axios.post(
        `${API_BASE}/api/chief/login`,
        { username, password }
      );

      setToken(response.data.token);
      setWardId(response.data.chief.wardId);
    } catch {
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && wardId) {
      setAppsLoading(true);
      axios.get(
        `${API_BASE}/api/chief/pending/${wardId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
        .then(response => {
          setApplications(response.data.applications);
        })
        .catch(() => {
          setError('Failed to load pending applications');
        })
        .finally(() => {
          setAppsLoading(false);
        });
    }
  }, [token, wardId]);

  const handleApprove = async (applicationId) => {
    try {
      await axios.post(
        `${API_BASE}/api/chief/approve/${applicationId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setApplications(applications.filter(
        app => app.application_id !== applicationId
      ));
    } catch {
      setError('Failed to approve application');
    }
  };

  const handleReject = async (applicationId, reason) => {
    try {
      await axios.post(
        `${API_BASE}/api/chief/reject/${applicationId}`,
        { reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setApplications(applications.filter(
        app => app.application_id !== applicationId
      ));
    } catch {
      setError('Failed to reject application');
    }
  };

  const handleLogout = () => {
    setToken('');
    setWardId('');
    setApplications([]);
    setUsername('');
    setPassword('');
    setError('');
  };

  if (!token) {
    return (
      <PublicLayout fullWidth>
        <div className="ek-portal-login-page">
          <div className="ek-portal-login-card">
            <div className="ek-portal-brand">
              <h1>e-Kitambulisho</h1>
              <p>Chief Portal — Ward Application Review</p>
            </div>
            <form onSubmit={handleLogin}>
              <div className="ek-form-group">
                <label className="ek-label" htmlFor="chief-username">Username</label>
                <input className="ek-input" id="chief-username" type="text" placeholder="Enter username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
              </div>
              <div className="ek-form-group">
                <label className="ek-label" htmlFor="chief-password">Password</label>
                <input className="ek-input" id="chief-password" type="password" placeholder="Enter password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
              </div>
              {error && <div className="ek-alert ek-alert-error">{error}</div>}
              <button type="submit" className="ek-btn ek-btn-primary ek-btn-block" disabled={loading}>
                {loading ? 'Logging in...' : 'Sign In'}
              </button>
            </form>
            <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13 }}>
              <Link to="/">← Back to Home</Link>
            </p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <div className="ek-app">
      <div className="ek-portal-bar">
        <div>
          <h1>Chief Portal</h1>
          <span style={{ fontSize: 13, opacity: 0.85 }}>Pending ward applications</span>
        </div>
        <div className="ek-btn-group" style={{ margin: 0 }}>
          <Link to="/" className="ek-btn ek-btn-secondary ek-btn-sm">Home</Link>
          <button type="button" className="ek-btn ek-btn-secondary ek-btn-sm" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div className="ek-portal-content">
        {error && <div className="ek-alert ek-alert-error">{error}</div>}

        <div className="ek-stat-grid" style={{ maxWidth: 240 }}>
          <div className="ek-stat-card">
            <div className="ek-stat-label">Pending Applications</div>
            <div className="ek-stat-value">{applications.length}</div>
          </div>
        </div>

        {appsLoading && <div className="ek-loading">Loading applications...</div>}

        {!appsLoading && applications.length === 0 && (
          <div className="ek-empty">
            <div className="ek-empty-icon">📋</div>
            <p>No pending applications in your ward.</p>
          </div>
        )}

        {!appsLoading && applications.map(app => (
          <div key={app.application_id} className="ek-app-card">
            <div className="ek-app-card-header">
              <div>
                <h3>{app.first_name} {app.last_name}</h3>
                <div className="ek-app-card-meta">Ref: {app.serial_number}</div>
              </div>
              <span className="ek-badge ek-badge-orange">Pending Review</span>
            </div>
            <div className="ek-detail-grid">
              <div className="ek-detail-item"><span>Phone</span>{app.phone_number || '—'}</div>
              <div className="ek-detail-item"><span>Birth Cert</span>{app.birth_cert_no || '—'}</div>
            </div>
            <div className="ek-btn-group">
              <button type="button" className="ek-btn ek-btn-success ek-btn-sm" onClick={() => handleApprove(app.application_id)}>
                Approve
              </button>
              <button type="button" className="ek-btn ek-btn-danger ek-btn-sm" onClick={() => handleReject(app.application_id, 'Does not meet requirements')}>
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ChiefPortal;
