import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PublicLayout from '../components/PublicLayout';
import { authenticateStaff } from '../utils/staffAuth';

function StaffLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { route } = await authenticateStaff(username, password);
      setPassword('');
      navigate(route, { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout fullWidth>
      <div className="ek-portal-login-page">
        <div className="ek-portal-login-card">
          <div className="ek-portal-brand">
            <h1>e-Kitambulisho</h1>
            <p>Staff Login</p>
          </div>
          <p className="ek-staff-login-note">
            Sign in with your assigned staff credentials. Your portal is determined automatically
            from your account role — you cannot choose a role here.
          </p>
          <form onSubmit={handleSubmit}>
            <div className="ek-form-group">
              <label className="ek-label" htmlFor="staff-username">
                Username
              </label>
              <input
                className="ek-input"
                id="staff-username"
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
              />
            </div>
            <div className="ek-form-group">
              <label className="ek-label" htmlFor="staff-password">
                Password
              </label>
              <input
                className="ek-input"
                id="staff-password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            {error && <div className="ek-alert ek-alert-error">{error}</div>}
            <button type="submit" className="ek-btn ek-btn-primary ek-btn-block" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
          <p className="ek-staff-login-back">
            <Link to="/">← Back to public site</Link>
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}

export default StaffLogin;
