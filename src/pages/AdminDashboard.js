import { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import './AdminDashboard.css';
import API_BASE from '../config/api';
const TOKEN_KEY = 'ek_admin_token';
const ADMIN_KEY = 'ek_admin_profile';

const PENDING_STATUSES = ['submitted'];
const APPROVED_STATUSES = ['chief_approved', 'biometrics_done', 'id_ready'];
const REJECTED_STATUSES = ['chief_rejected'];
const COLLECTED_STATUSES = ['id_collected'];
const OVERDUE_PENDING_DAYS = 14;

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview' },
  { id: 'applications', label: 'Applications' },
  { id: 'chiefs', label: 'Chiefs' },
  { id: 'counties', label: 'County Overview' },
  { id: 'reports', label: 'Reports & Analytics' },
  { id: 'audit', label: 'Audit Logs' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function decodeJwtPayload(token) {
  try {
    const base64 = token.split('.')[1];
    if (!base64) return null;
    const json = atob(base64.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function normalizeStatus(status) {
  return (status || '').toLowerCase().trim();
}

function statusCategory(status) {
  const s = normalizeStatus(status);
  if (PENDING_STATUSES.includes(s)) return 'pending';
  if (APPROVED_STATUSES.includes(s)) return 'approved';
  if (REJECTED_STATUSES.includes(s)) return 'rejected';
  if (COLLECTED_STATUSES.includes(s)) return 'collected';
  return 'other';
}

function formatStatusLabel(status) {
  const labels = {
    submitted: 'Submitted',
    chief_approved: 'Chief Approved',
    chief_rejected: 'Rejected',
    biometrics_done: 'Biometrics Done',
    id_ready: 'ID Ready',
    id_collected: 'Collected',
  };
  return labels[normalizeStatus(status)] || status || 'Unknown';
}

function getAppDate(app) {
  const raw = app.created_at || app.submitted_at || app.application_date;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isSubmittedToday(app) {
  const d = getAppDate(app);
  if (!d) return false;
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

function isOverdueApplication(app) {
  if (app.is_overdue === true) return true;
  if (typeof app.days_overdue === 'number' && app.days_overdue > 0) return true;
  if (statusCategory(app.current_status) !== 'pending') return false;
  const d = getAppDate(app);
  if (!d) return false;
  const diffMs = Date.now() - d.getTime();
  return diffMs / (1000 * 60 * 60 * 24) > OVERDUE_PENDING_DAYS;
}

function computeProcessingDays(app) {
  const start = getAppDate(app);
  const endRaw = app.completed_at || app.updated_at || app.collected_at;
  if (!start) return null;
  const end = endRaw ? new Date(endRaw) : null;
  if (!end || Number.isNaN(end.getTime())) return null;
  if (statusCategory(app.current_status) === 'pending') return null;
  const days = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  return days >= 0 ? Math.round(days * 10) / 10 : null;
}

function resolveAdminProfile(loginResponse, token) {
  const payload = decodeJwtPayload(token);
  const fromLogin =
    loginResponse.admin ||
    loginResponse.user ||
    loginResponse.adminUser ||
    {};

  const role =
    fromLogin.role ||
    loginResponse.role ||
    payload?.role ||
    payload?.admin_role ||
    null;

  const countyName =
    fromLogin.county_name ||
    fromLogin.countyName ||
    payload?.county_name ||
    payload?.countyName ||
    null;

  const username =
    fromLogin.username ||
    loginResponse.username ||
    payload?.username ||
    payload?.sub ||
    '';

  const isCountyAdmin =
    role &&
    String(role).toLowerCase().includes('county');

  return {
    username,
    role: role || (isCountyAdmin ? 'county_admin' : 'super_admin'),
    countyName,
    isCountyAdmin,
    isSuperAdmin: !isCountyAdmin,
  };
}

function aggregateCountyStats(apps) {
  const map = {};
  apps.forEach((app) => {
    const county = app.county_name || 'Unknown';
    if (!map[county]) {
      map[county] = {
        county,
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        collected: 0,
        overdue: 0,
      };
    }
    map[county].total += 1;
    const cat = statusCategory(app.current_status);
    if (cat === 'pending') map[county].pending += 1;
    if (cat === 'approved') map[county].approved += 1;
    if (cat === 'rejected') map[county].rejected += 1;
    if (cat === 'collected') map[county].collected += 1;
    if (isOverdueApplication(app)) map[county].overdue += 1;
  });
  return Object.values(map).sort((a, b) => b.total - a.total);
}

function aggregateChiefStats(chiefs, apps) {
  return chiefs.map((chief) => {
    const ward = (chief.ward_name || '').toLowerCase();
    const chiefApps = apps.filter(
      (a) =>
        (a.ward_name && a.ward_name.toLowerCase() === ward) ||
        (chief.chief_id && a.chief_id === chief.chief_id) ||
        (chief.ward_id && a.ward_id === chief.ward_id)
    );

    const pending = chiefApps.filter((a) => statusCategory(a.current_status) === 'pending').length;
    const approved = chiefApps.filter((a) => statusCategory(a.current_status) === 'approved').length;
    const rejected = chiefApps.filter((a) => statusCategory(a.current_status) === 'rejected').length;
    const overdue = chiefApps.filter(isOverdueApplication).length;

    const processingDays = chiefApps
      .map(computeProcessingDays)
      .filter((d) => d !== null);
    const avgProcessing =
      processingDays.length > 0
        ? Math.round((processingDays.reduce((s, d) => s + d, 0) / processingDays.length) * 10) / 10
        : null;

    return {
      ...chief,
      pending,
      approved,
      rejected,
      overdue,
      totalHandled: chiefApps.length,
      avgProcessingDays: avgProcessing,
      hasWardMatch: chiefApps.length > 0 || !ward,
    };
  });
}

function aggregateStatusCounts(apps) {
  const counts = {};
  apps.forEach((app) => {
    const key = normalizeStatus(app.current_status) || 'unknown';
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.entries(counts)
    .map(([status, count]) => ({ status, count, label: formatStatusLabel(status) }))
    .sort((a, b) => b.count - a.count);
}

function aggregateTrendByMonth(apps) {
  const map = {};
  apps.forEach((app) => {
    const d = getAppDate(app);
    if (!d) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    map[key] = (map[key] || 0) + 1;
  });
  return Object.entries(map)
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12);
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status, type = 'application' }) {
  if (type === 'chief') {
    const active = status === true || status === 'active';
    return (
      <span className={`admin-status-badge ${active ? 'admin-status-active' : 'admin-status-inactive'}`}>
        {active ? 'Active' : 'Inactive'}
      </span>
    );
  }
  const key = normalizeStatus(status).replace(/\s+/g, '_');
  const known = ['submitted', 'chief_approved', 'chief_rejected', 'biometrics_done', 'id_ready', 'id_collected'];
  const statusClass = known.includes(key) ? `admin-status-${key}` : 'admin-status-default';
  return (
    <span className={`admin-status-badge ${statusClass}`}>
      {formatStatusLabel(status)}
    </span>
  );
}

function StatCard({ label, value, unavailable, note, warning }) {
  return (
    <div className={`admin-stat-card ${warning ? 'highlight-warning' : ''}`}>
      <div className="admin-stat-label">{label}</div>
      <div className={`admin-stat-value ${unavailable ? 'unavailable' : ''}`}>
        {unavailable ? '—' : value}
      </div>
      {note && <div className="admin-stat-note">{note}</div>}
    </div>
  );
}

function LoadingState({ message = 'Loading data...' }) {
  return <div className="admin-loading">{message}</div>;
}

function EmptyState({ message, children }) {
  return (
    <div className="admin-empty">
      <p>{message}</p>
      {children}
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="admin-alert admin-alert-error">
      {message}
      {onRetry && (
        <button type="button" className="admin-btn admin-btn-secondary admin-btn-sm" style={{ marginLeft: 12 }} onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

function BarChart({ data, labelKey = 'label', valueKey = 'count', maxBars = 10 }) {
  if (!data || data.length === 0) {
    return <p className="admin-chart-unavailable">No data available for this chart.</p>;
  }
  const sliced = data.slice(0, maxBars);
  const max = Math.max(...sliced.map((d) => d[valueKey]), 1);
  return (
    <div className="admin-bar-chart">
      {sliced.map((item) => (
        <div className="admin-bar-row" key={item[labelKey] || item.label}>
          <div className="admin-bar-label" title={item[labelKey] || item.label}>
            {item[labelKey] || item.label}
          </div>
          <div className="admin-bar-track">
            <div
              className="admin-bar-fill"
              style={{ width: `${(item[valueKey] / max) * 100}%` }}
            />
          </div>
          <div className="admin-bar-value">{item[valueKey]}</div>
        </div>
      ))}
    </div>
  );
}

function ConfirmDialog({ title, message, confirmLabel, danger, onConfirm, onCancel }) {
  return (
    <div className="admin-modal-overlay" role="dialog" aria-modal="true">
      <div className="admin-modal">
        <div className="admin-modal-header">
          <h3>{title}</h3>
          <button type="button" className="admin-modal-close" onClick={onCancel} aria-label="Close">
            ×
          </button>
        </div>
        <div className="admin-modal-body">
          <p>{message}</p>
        </div>
        <div className="admin-modal-footer">
          <button type="button" className="admin-btn admin-btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={`admin-btn ${danger ? 'admin-btn-danger' : 'admin-btn-primary'}`}
            style={danger ? {} : { width: 'auto' }}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function AdminDashboard() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || '');
  const [adminProfile, setAdminProfile] = useState(() => {
    try {
      const raw = sessionStorage.getItem(ADMIN_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [stats, setStats] = useState(null);
  const [applications, setApplications] = useState([]);
  const [chiefs, setChiefs] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLogsAvailable, setAuditLogsAvailable] = useState(null);

  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState('');

  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [countyFilter, setCountyFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [selectedChief, setSelectedChief] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleAuthFailure = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(ADMIN_KEY);
    setToken('');
    setAdminProfile(null);
    setStats(null);
    setApplications([]);
    setChiefs([]);
    setLoginError('Your session has expired. Please log in again.');
  }, []);

  const fetchDashboardData = useCallback(async (authToken) => {
    setDataLoading(true);
    setDataError('');
    try {
      const headers = authHeaders(authToken);
      const [statsRes, appsRes, chiefsRes] = await Promise.all([
        axios.get(`${API_BASE}/api/admin/stats`, { headers }),
        axios.get(`${API_BASE}/api/admin/applications`, { headers }),
        axios.get(`${API_BASE}/api/admin/chiefs`, { headers }),
      ]);
      setStats(statsRes.data.stats || null);
      setApplications(appsRes.data.applications || []);
      setChiefs(chiefsRes.data.chiefs || []);
    } catch (err) {
      if (err.response?.status === 401) {
        handleAuthFailure();
      } else {
        setDataError(
          err.response?.data?.message || 'Failed to load dashboard data. Please try again.'
        );
      }
    } finally {
      setDataLoading(false);
    }
  }, [handleAuthFailure]);

  const fetchAuditLogs = useCallback(async (authToken) => {
    try {
      const response = await axios.get(`${API_BASE}/api/admin/audit-logs`, {
        headers: authHeaders(authToken),
      });
      setAuditLogs(response.data.logs || response.data.auditLogs || []);
      setAuditLogsAvailable(true);
    } catch (err) {
      if (err.response?.status === 401) {
        handleAuthFailure();
      } else {
        setAuditLogs([]);
        setAuditLogsAvailable(false);
      }
    }
  }, [handleAuthFailure]);

  useEffect(() => {
    if (token) {
      fetchDashboardData(token);
    }
  }, [token, fetchDashboardData]);

  useEffect(() => {
    if (token && activeTab === 'audit') {
      fetchAuditLogs(token);
    }
  }, [token, activeTab, fetchAuditLogs]);

  const handleLogin = async (e) => {
    e?.preventDefault();
    try {
      setLoginLoading(true);
      setLoginError('');
      const response = await axios.post(`${API_BASE}/api/admin/login`, { username, password });
      const newToken = response.data.token;
      const profile = resolveAdminProfile(response.data, newToken);
      sessionStorage.setItem(TOKEN_KEY, newToken);
      sessionStorage.setItem(ADMIN_KEY, JSON.stringify(profile));
      setToken(newToken);
      setAdminProfile(profile);
      setPassword('');
    } catch {
      setLoginError('Invalid credentials. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(ADMIN_KEY);
    setToken('');
    setAdminProfile(null);
    setStats(null);
    setApplications([]);
    setChiefs([]);
    setAuditLogs([]);
    setActiveTab('overview');
    setSearchQuery('');
    setStatusFilter('');
    setCountyFilter('');
    setTypeFilter('');
    setDateFrom('');
    setDateTo('');
    setShowLogoutConfirm(false);
  };

  const scopedApplications = useMemo(() => {
    if (!adminProfile?.isCountyAdmin || !adminProfile?.countyName) {
      return applications;
    }
    return applications.filter((a) => a.county_name === adminProfile.countyName);
  }, [applications, adminProfile]);

  const scopedChiefs = useMemo(() => {
    if (!adminProfile?.isCountyAdmin || !adminProfile?.countyName) {
      return chiefs;
    }
    return chiefs.filter(
      (c) =>
        c.county_name === adminProfile.countyName ||
        scopedApplications.some(
          (a) => a.ward_name === c.ward_name && a.county_name === adminProfile.countyName
        )
    );
  }, [chiefs, adminProfile, scopedApplications]);

  const computedStats = useMemo(() => {
    const apps = scopedApplications;
    const hasDates = apps.some((a) => getAppDate(a));
    const hasProcessingData = apps.some((a) => computeProcessingDays(a) !== null);

    const rejectedFromApps = apps.filter((a) => statusCategory(a.current_status) === 'rejected').length;
    const overdueFromApps = apps.filter(isOverdueApplication).length;
    const submittedTodayFromApps = apps.filter(isSubmittedToday).length;

    const processingDays = apps.map(computeProcessingDays).filter((d) => d !== null);
    const avgProcessing =
      processingDays.length > 0
        ? Math.round((processingDays.reduce((s, d) => s + d, 0) / processingDays.length) * 10) / 10
        : null;

    return {
      total: stats?.total ?? apps.length,
      pending: stats?.pending ?? apps.filter((a) => statusCategory(a.current_status) === 'pending').length,
      approved: stats?.approved ?? apps.filter((a) => statusCategory(a.current_status) === 'approved').length,
      rejected: stats?.rejected ?? rejectedFromApps,
      collected: stats?.collected ?? apps.filter((a) => statusCategory(a.current_status) === 'collected').length,
      overdue: stats?.overdue ?? (hasDates || apps.some((a) => a.is_overdue != null) ? overdueFromApps : null),
      submittedToday: stats?.submitted_today ?? stats?.submittedToday ?? (hasDates ? submittedTodayFromApps : null),
      avgProcessingTime: stats?.avg_processing_time ?? stats?.avgProcessingTime ?? (hasProcessingData ? avgProcessing : null),
      hasDates,
      hasProcessingData,
      statusCounts: aggregateStatusCounts(apps),
      countyStats: aggregateCountyStats(apps),
    };
  }, [stats, scopedApplications]);

  const countyOptions = useMemo(() => {
    const names = scopedApplications.map((a) => a.county_name).filter(Boolean);
    return [...new Set(names)].sort();
  }, [scopedApplications]);

  const statusOptions = useMemo(() => {
    const statuses = scopedApplications.map((a) => a.current_status).filter(Boolean);
    return [...new Set(statuses)].sort();
  }, [scopedApplications]);

  const typeOptions = useMemo(() => {
    const types = scopedApplications
      .map((a) => a.application_type || a.service_type || a.type)
      .filter(Boolean);
    return [...new Set(types)].sort();
  }, [scopedApplications]);

  const hasTypeData = typeOptions.length > 0;
  const hasDateData = scopedApplications.some((a) => getAppDate(a));

  const filteredApplications = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return scopedApplications.filter((app) => {
      const fullName = `${app.first_name || ''} ${app.last_name || ''}`.trim().toLowerCase();
      const serial = (app.serial_number || '').toLowerCase();
      if (query && !fullName.includes(query) && !serial.includes(query)) return false;
      if (statusFilter && app.current_status !== statusFilter) return false;
      if (countyFilter && app.county_name !== countyFilter) return false;
      if (typeFilter) {
        const t = app.application_type || app.service_type || app.type;
        if (t !== typeFilter) return false;
      }
      if (dateFrom || dateTo) {
        const d = getAppDate(app);
        if (!d) return false;
        if (dateFrom && d < new Date(dateFrom)) return false;
        if (dateTo) {
          const to = new Date(dateTo);
          to.setHours(23, 59, 59, 999);
          if (d > to) return false;
        }
      }
      return true;
    });
  }, [scopedApplications, searchQuery, statusFilter, countyFilter, typeFilter, dateFrom, dateTo]);

  const chiefStats = useMemo(
    () => aggregateChiefStats(scopedChiefs, scopedApplications),
    [scopedChiefs, scopedApplications]
  );

  const trendData = useMemo(
    () => aggregateTrendByMonth(scopedApplications),
    [scopedApplications]
  );

  const clearAppFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setCountyFilter('');
    setTypeFilter('');
    setDateFrom('');
    setDateTo('');
  };

  const navLabel = NAV_ITEMS.find((n) => n.id === activeTab)?.label || 'Dashboard';

  const roleLabel = adminProfile?.isCountyAdmin
    ? `County Admin${adminProfile.countyName ? ` · ${adminProfile.countyName}` : ''}`
    : 'Super Admin';

  // -------------------------------------------------------------------------
  // Login screen
  // -------------------------------------------------------------------------

  if (!token) {
    return (
      <div className="admin-root">
        <div className="admin-login-page">
          <div className="admin-login-card">
            <div className="admin-login-brand">
              <h1>e-Kitambulisho</h1>
              <p>Administrative Dashboard</p>
            </div>
            <form onSubmit={handleLogin}>
              <div className="admin-form-group">
                <label htmlFor="admin-username">Username</label>
                <input
                  id="admin-username"
                  className="admin-input"
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
              </div>
              <div className="admin-form-group">
                <label htmlFor="admin-password">Password</label>
                <input
                  id="admin-password"
                  className="admin-input"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              {loginError && (
                <div className="admin-alert admin-alert-error" style={{ marginBottom: 16 }}>
                  {loginError}
                </div>
              )}
              <button type="submit" className="admin-btn admin-btn-primary" disabled={loginLoading}>
                {loginLoading ? 'Logging in...' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Dashboard layout
  // -------------------------------------------------------------------------

  return (
    <div className="admin-root">
      {sidebarOpen && (
        <div
          className="admin-sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          role="presentation"
        />
      )}

      <div className="admin-layout">
        <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
          <div className="admin-sidebar-header">
            <h2>e-Kitambulisho</h2>
            <span>Admin Portal</span>
          </div>
          <nav className="admin-nav">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`admin-nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="admin-main">
          <header className="admin-header">
            <div className="admin-header-left">
              <button
                type="button"
                className="admin-menu-toggle"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                aria-label="Toggle menu"
              >
                ☰
              </button>
              <h1>{navLabel}</h1>
            </div>
            <div className="admin-header-meta">
              <span className="admin-role-badge">{roleLabel}</span>
              {adminProfile?.username && (
                <span style={{ fontSize: 14, color: '#555' }}>{adminProfile.username}</span>
              )}
              <button type="button" className="admin-btn admin-btn-secondary admin-btn-sm" onClick={() => setShowLogoutConfirm(true)}>
                Logout
              </button>
            </div>
          </header>

          <main className="admin-content">
            {adminProfile?.isCountyAdmin && !adminProfile?.countyName && (
              <div className="admin-alert admin-alert-warning">
                County Admin role detected but no county assignment found in login/JWT data.
                Showing all available data until backend provides county scope.
              </div>
            )}

            {adminProfile?.isCountyAdmin && adminProfile?.countyName && (
              <div className="admin-alert admin-alert-info">
                Viewing data for <strong>{adminProfile.countyName}</strong> county only.
                This is a UI filter — backend authorization must enforce access separately.
              </div>
            )}

            {dataError && (
              <ErrorState message={dataError} onRetry={() => fetchDashboardData(token)} />
            )}

            {dataLoading && <LoadingState />}

            {!dataLoading && !dataError && (
              <>
                {/* OVERVIEW */}
                {activeTab === 'overview' && (
                  <section>
                    <h2 className="admin-section-title">System Overview</h2>

                    {computedStats.overdue > 0 && (
                      <div className="admin-alert admin-alert-warning">
                        ⚠ {computedStats.overdue} application(s) appear overdue
                        {computedStats.hasDates
                          ? ` (pending more than ${OVERDUE_PENDING_DAYS} days).`
                          : ' (flagged by available data).'}
                      </div>
                    )}

                    <div className="admin-stat-grid">
                      <StatCard label="Total Applications" value={computedStats.total} />
                      <StatCard label="Pending" value={computedStats.pending} />
                      <StatCard label="Approved" value={computedStats.approved} />
                      <StatCard label="Rejected" value={computedStats.rejected} />
                      <StatCard label="Collected IDs" value={computedStats.collected} />
                      <StatCard
                        label="Overdue"
                        value={computedStats.overdue}
                        unavailable={computedStats.overdue === null}
                        note={
                          computedStats.overdue === null
                            ? 'Requires created_at or is_overdue on applications'
                            : undefined
                        }
                        warning={computedStats.overdue > 0}
                      />
                      <StatCard
                        label="Submitted Today"
                        value={computedStats.submittedToday}
                        unavailable={computedStats.submittedToday === null}
                        note={
                          computedStats.submittedToday === null
                            ? 'Requires created_at on applications'
                            : undefined
                        }
                      />
                      <StatCard
                        label="Avg Processing (days)"
                        value={computedStats.avgProcessingTime}
                        unavailable={computedStats.avgProcessingTime === null}
                        note={
                          computedStats.avgProcessingTime === null
                            ? 'Requires created_at + completed/updated dates'
                            : undefined
                        }
                      />
                    </div>

                    <div className="admin-chart-card">
                      <h3>Application Status Overview</h3>
                      <BarChart
                        data={computedStats.statusCounts.map((s) => ({
                          label: s.label,
                          count: s.count,
                        }))}
                      />
                    </div>

                    {computedStats.countyStats.length > 0 && (
                      <div className="admin-chart-card">
                        <h3>County Summary</h3>
                        <div className="admin-table-wrap">
                          <table className="admin-table">
                            <thead>
                              <tr>
                                <th>County</th>
                                <th>Total</th>
                                <th>Pending</th>
                                <th>Approved</th>
                                <th>Rejected</th>
                                <th>Collected</th>
                                <th>Overdue</th>
                              </tr>
                            </thead>
                            <tbody>
                              {computedStats.countyStats.map((row) => (
                                <tr key={row.county}>
                                  <td>{row.county}</td>
                                  <td>{row.total}</td>
                                  <td>{row.pending}</td>
                                  <td>{row.approved}</td>
                                  <td>{row.rejected}</td>
                                  <td>{row.collected}</td>
                                  <td>{row.overdue}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </section>
                )}

                {/* APPLICATIONS */}
                {activeTab === 'applications' && (
                  <section>
                    <h2 className="admin-section-title">Applications</h2>

                    <div className="admin-filters">
                      <input
                        className="admin-input"
                        type="text"
                        placeholder="Search by name or serial number"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      <select
                        className="admin-select"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <option value="">All statuses</option>
                        {statusOptions.map((s) => (
                          <option key={s} value={s}>
                            {formatStatusLabel(s)}
                          </option>
                        ))}
                      </select>
                      <select
                        className="admin-select"
                        value={countyFilter}
                        onChange={(e) => setCountyFilter(e.target.value)}
                      >
                        <option value="">All counties</option>
                        {countyOptions.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      {hasTypeData && (
                        <select
                          className="admin-select"
                          value={typeFilter}
                          onChange={(e) => setTypeFilter(e.target.value)}
                        >
                          <option value="">All types</option>
                          {typeOptions.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      )}
                      {hasDateData && (
                        <>
                          <input
                            className="admin-input"
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            title="From date"
                          />
                          <input
                            className="admin-input"
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            title="To date"
                          />
                        </>
                      )}
                    </div>

                    {!hasTypeData && (
                      <p className="admin-stat-note" style={{ marginBottom: 12 }}>
                        Application type filter unavailable — no type field in current application data.
                      </p>
                    )}
                    {!hasDateData && (
                      <p className="admin-stat-note" style={{ marginBottom: 12 }}>
                        Date filter unavailable — applications do not include created_at or similar date fields.
                      </p>
                    )}

                    <p className="admin-results-count">
                      Showing {filteredApplications.length} of {scopedApplications.length} applications
                    </p>

                    {filteredApplications.length === 0 ? (
                      <EmptyState message="No applications match your search or filters.">
                        {(searchQuery || statusFilter || countyFilter || typeFilter || dateFrom || dateTo) && (
                          <button type="button" className="admin-btn admin-btn-secondary" onClick={clearAppFilters}>
                            Clear filters
                          </button>
                        )}
                      </EmptyState>
                    ) : (
                      <div className="admin-table-wrap">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Applicant</th>
                              <th>Serial Number</th>
                              <th>Status</th>
                              <th>County</th>
                              {hasDateData && <th>Submitted</th>}
                              {filteredApplications.some(isOverdueApplication) && <th>Alert</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {filteredApplications.map((app) => (
                              <tr key={app.serial_number || app.application_id}>
                                <td>
                                  {app.first_name} {app.last_name}
                                </td>
                                <td>{app.serial_number}</td>
                                <td>
                                  <StatusBadge status={app.current_status} />
                                </td>
                                <td>{app.county_name || '—'}</td>
                                {hasDateData && (
                                  <td>
                                    {getAppDate(app)
                                      ? getAppDate(app).toLocaleDateString('en-KE')
                                      : '—'}
                                  </td>
                                )}
                                {filteredApplications.some(isOverdueApplication) && (
                                  <td>
                                    {isOverdueApplication(app) ? (
                                      <span className="admin-status-badge admin-status-chief_rejected">Overdue</span>
                                    ) : (
                                      '—'
                                    )}
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
                )}

                {/* CHIEFS */}
                {activeTab === 'chiefs' && (
                  <section>
                    <h2 className="admin-section-title">Chiefs Management</h2>
                    <p className="admin-results-count">Total chiefs: {scopedChiefs.length}</p>

                    {scopedChiefs.length === 0 ? (
                      <EmptyState message="No chiefs found for the current scope." />
                    ) : (
                      <div className="admin-table-wrap">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Chief</th>
                              <th>Ward</th>
                              <th>Status</th>
                              <th>Pending</th>
                              <th>Approved</th>
                              <th>Rejected</th>
                              <th>Overdue</th>
                              <th>Avg Days</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {chiefStats.map((chief) => (
                              <tr key={chief.chief_id}>
                                <td>{chief.full_name}</td>
                                <td>{chief.ward_name || '—'}</td>
                                <td>
                                  <StatusBadge status={chief.is_active} type="chief" />
                                </td>
                                <td>{chief.pending}</td>
                                <td>{chief.approved}</td>
                                <td>{chief.rejected}</td>
                                <td>{chief.overdue}</td>
                                <td>
                                  {chief.avgProcessingDays !== null ? chief.avgProcessingDays : '—'}
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className="admin-btn admin-btn-secondary admin-btn-sm"
                                    onClick={() => setSelectedChief(chief)}
                                  >
                                    View
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className="admin-backend-note">
                      Chief metrics are estimated by matching applications to chief ward/chief_id where available.
                      Activate/deactivate and Assistant Chief assignment require backend endpoints (see summary after implementation).
                    </div>
                  </section>
                )}

                {/* COUNTIES */}
                {activeTab === 'counties' && (
                  <section>
                    <h2 className="admin-section-title">County Overview</h2>
                    {computedStats.countyStats.length === 0 ? (
                      <EmptyState message="No county data available from loaded applications." />
                    ) : (
                      <div className="admin-table-wrap">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>County</th>
                              <th>Total</th>
                              <th>Pending</th>
                              <th>Approved</th>
                              <th>Rejected</th>
                              <th>Collected</th>
                              <th>Overdue</th>
                            </tr>
                          </thead>
                          <tbody>
                            {computedStats.countyStats.map((row) => (
                              <tr key={row.county}>
                                <td>{row.county}</td>
                                <td>{row.total}</td>
                                <td>{row.pending}</td>
                                <td>{row.approved}</td>
                                <td>{row.rejected}</td>
                                <td>{row.collected}</td>
                                <td>{row.overdue}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
                )}

                {/* REPORTS */}
                {activeTab === 'reports' && (
                  <section>
                    <h2 className="admin-section-title">Reports & Analytics</h2>

                    <div className="admin-chart-card">
                      <h3>Applications by Status</h3>
                      <BarChart
                        data={computedStats.statusCounts.map((s) => ({
                          label: s.label,
                          count: s.count,
                        }))}
                      />
                    </div>

                    <div className="admin-chart-card">
                      <h3>Applications by County</h3>
                      <BarChart
                        data={computedStats.countyStats.map((c) => ({
                          label: c.county,
                          count: c.total,
                        }))}
                        labelKey="label"
                      />
                    </div>

                    <div className="admin-chart-card">
                      <h3>Application Trends (by month)</h3>
                      {trendData.length > 0 ? (
                        <BarChart
                          data={trendData.map((t) => ({ label: t.month, count: t.count }))}
                        />
                      ) : (
                        <p className="admin-chart-unavailable">
                          Trend chart unavailable — applications need created_at or submitted_at dates.
                        </p>
                      )}
                    </div>

                    <div className="admin-chart-card">
                      <h3>Chief Processing Performance</h3>
                      {chiefStats.some((c) => c.totalHandled > 0) ? (
                        <BarChart
                          data={chiefStats
                            .filter((c) => c.totalHandled > 0)
                            .map((c) => ({
                              label: c.full_name,
                              count: c.approved + c.rejected,
                            }))}
                          maxBars={15}
                        />
                      ) : (
                        <p className="admin-chart-unavailable">
                          Chief performance chart unavailable — no ward/chief linkage between chiefs and applications.
                        </p>
                      )}
                    </div>
                  </section>
                )}

                {/* AUDIT LOGS */}
                {activeTab === 'audit' && (
                  <section>
                    <h2 className="admin-section-title">Audit Logs</h2>

                    {auditLogsAvailable === null && <LoadingState message="Checking audit log availability..." />}

                    {auditLogsAvailable === false && (
                      <>
                        <div className="admin-alert admin-alert-info">
                          Audit log endpoint not available. The interface is ready; connect the backend when available.
                        </div>
                        <EmptyState message="No audit logs loaded.">
                          <p style={{ fontSize: 13, color: '#888', marginTop: 8 }}>
                            Expected endpoint: <code>GET /api/admin/audit-logs</code>
                          </p>
                        </EmptyState>
                      </>
                    )}

                    {auditLogsAvailable === true && auditLogs.length === 0 && (
                      <EmptyState message="No audit log entries found." />
                    )}

                    {auditLogsAvailable === true && auditLogs.length > 0 && (
                      <div className="admin-table-wrap">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Timestamp</th>
                              <th>User</th>
                              <th>Action</th>
                              <th>Details</th>
                            </tr>
                          </thead>
                          <tbody>
                            {auditLogs.map((log, idx) => (
                              <tr key={log.id || idx}>
                                <td>
                                  {log.timestamp || log.created_at
                                    ? new Date(log.timestamp || log.created_at).toLocaleString('en-KE')
                                    : '—'}
                                </td>
                                <td>{log.user || log.username || log.admin_username || '—'}</td>
                                <td>{log.action || log.event || '—'}</td>
                                <td>{log.details || log.description || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* Chief detail modal */}
      {selectedChief && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h3>Chief Details</h3>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setSelectedChief(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="admin-modal-body">
              <div className="admin-detail-row">
                <span>Name</span>
                <span>{selectedChief.full_name}</span>
              </div>
              <div className="admin-detail-row">
                <span>Ward</span>
                <span>{selectedChief.ward_name || '—'}</span>
              </div>
              <div className="admin-detail-row">
                <span>Status</span>
                <StatusBadge status={selectedChief.is_active} type="chief" />
              </div>
              <div className="admin-detail-row">
                <span>Pending Applications</span>
                <span>{selectedChief.pending ?? '—'}</span>
              </div>
              <div className="admin-detail-row">
                <span>Approved</span>
                <span>{selectedChief.approved ?? '—'}</span>
              </div>
              <div className="admin-detail-row">
                <span>Rejected</span>
                <span>{selectedChief.rejected ?? '—'}</span>
              </div>
              <div className="admin-detail-row">
                <span>Overdue</span>
                <span>{selectedChief.overdue ?? '—'}</span>
              </div>
              <div className="admin-detail-row">
                <span>Avg Processing (days)</span>
                <span>
                  {selectedChief.avgProcessingDays !== null && selectedChief.avgProcessingDays !== undefined
                    ? selectedChief.avgProcessingDays
                    : '—'}
                </span>
              </div>

              <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary admin-btn-sm"
                  disabled
                  title="Requires PATCH /api/admin/chiefs/:id/status"
                >
                  {selectedChief.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  type="button"
                  className="admin-btn admin-btn-secondary admin-btn-sm"
                  onClick={() => {
                    setShowAssignModal(true);
                  }}
                >
                  Assign Assistant Chief
                </button>
              </div>

              <div className="admin-backend-note">
                Activate/deactivate requires <code>PATCH /api/admin/chiefs/:id/status</code>.
                Assistant Chief assignment requires <code>POST /api/admin/chiefs/:id/assistant</code>.
              </div>
            </div>
            <div className="admin-modal-footer">
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setSelectedChief(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assistant chief assignment modal (structure only) */}
      {showAssignModal && selectedChief && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h3>Assign Assistant Chief</h3>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => setShowAssignModal(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="admin-modal-body">
              <p>
                Assign an assistant chief to <strong>{selectedChief.full_name}</strong> ({selectedChief.ward_name}).
              </p>
              <div className="admin-form-group">
                <label htmlFor="assistant-name">Assistant Chief Name</label>
                <input id="assistant-name" className="admin-input" type="text" disabled placeholder="Awaiting backend" />
              </div>
              <div className="admin-form-group">
                <label htmlFor="assistant-username">Username</label>
                <input id="assistant-username" className="admin-input" type="text" disabled placeholder="Awaiting backend" />
              </div>
              <div className="admin-backend-note">
                This form is a UI placeholder. Backend endpoint required:
                <br />
                <code>POST /api/admin/chiefs/:id/assistant</code> with assistant chief details.
              </div>
            </div>
            <div className="admin-modal-footer">
              <button type="button" className="admin-btn admin-btn-secondary" onClick={() => setShowAssignModal(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                style={{ width: 'auto' }}
                disabled
              >
                Save Assignment
              </button>
            </div>
          </div>
        </div>
      )}

      {showLogoutConfirm && (
        <ConfirmDialog
          title="Confirm Logout"
          message="Are you sure you want to sign out of the admin dashboard?"
          confirmLabel="Logout"
          danger
          onConfirm={handleLogout}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      )}

    </div>
  );
}

export default AdminDashboard;
