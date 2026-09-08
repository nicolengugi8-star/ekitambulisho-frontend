import { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import './OfficerPortal.css';
import API_BASE from '../config/api';
const TOKEN_KEY = 'ek_officer_token';
const PROFILE_KEY = 'ek_officer_profile';

const WORKFLOW_STEPS = [
  { key: 'scheduled', label: 'Scheduled' },
  { key: 'awaiting_biometrics', label: 'Awaiting Biometrics' },
  { key: 'biometrics_verified', label: 'Biometrics Verified' },
  { key: 'id_ready', label: 'ID Ready' },
  { key: 'id_given', label: 'ID Given' },
  { key: 'id_collected', label: 'ID Collected' },
];

const STEP_LABELS = Object.fromEntries(WORKFLOW_STEPS.map((s) => [s.key, s.label]));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

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

function resolveOfficeId(loginResponse, token) {
  const fromLogin =
    loginResponse?.officer?.officeId ??
    loginResponse?.officer?.office_id ??
    loginResponse?.officeId ??
    loginResponse?.office_id;

  if (fromLogin != null && fromLogin !== '') {
    return fromLogin;
  }

  const payload = decodeJwtPayload(token);
  return payload?.officeId ?? payload?.office_id ?? null;
}

function getOfficeId(profile, token) {
  if (profile?.officeId != null && profile.officeId !== '') {
    return profile.officeId;
  }
  const payload = decodeJwtPayload(token);
  return payload?.officeId ?? payload?.office_id ?? null;
}

function resolveWorkflowStep(appointment) {
  const explicit =
    appointment.officer_workflow_status ||
    appointment.workflow_status ||
    appointment.officer_status;

  if (explicit && STEP_LABELS[explicit]) {
    return explicit;
  }

  if (appointment.biometrics_verified === true) {
    return 'biometrics_verified';
  }

  const status = (appointment.current_status || appointment.status || '').toLowerCase();

  if (status === 'id_collected') return 'id_collected';
  if (status === 'id_given') return 'id_given';
  if (status === 'id_ready') return 'id_ready';
  if (status === 'biometrics_done' || status === 'biometrics_verified') return 'biometrics_verified';
  if (status === 'awaiting_biometrics') return 'awaiting_biometrics';
  if (status === 'chief_approved' || status === 'scheduled') return 'scheduled';

  return 'scheduled';
}

function stepIndex(stepKey) {
  return WORKFLOW_STEPS.findIndex((s) => s.key === stepKey);
}

function formatAppointmentDateTime(appointment) {
  const raw =
    appointment.appointment_datetime ||
    appointment.appointment_date_time ||
    (appointment.appointment_date && appointment.appointment_time
      ? `${appointment.appointment_date}T${appointment.appointment_time}`
      : appointment.appointment_date);

  if (!raw) return '—';

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    return String(raw);
  }

  return d.toLocaleString('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function formatLocation(appointment) {
  const parts = [
    appointment.station_name,
    appointment.location,
    appointment.ward_name,
    appointment.sub_county_name,
    appointment.county_name,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(', ') : '—';
}

function getAppointmentId(appointment) {
  return appointment.appointment_id || appointment.application_id || appointment.id;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ step }) {
  const label = STEP_LABELS[step] || step || 'Unknown';
  const cls = STEP_LABELS[step]
    ? `officer-status-${step}`
    : 'officer-status-default';
  return <span className={`officer-status-badge ${cls}`}>{label}</span>;
}

function WorkflowStepper({ currentStep }) {
  const currentIdx = stepIndex(currentStep);

  return (
    <div className="officer-stepper">
      {WORKFLOW_STEPS.map((step, idx) => {
        let className = 'officer-step';
        if (idx < currentIdx) className += ' done';
        else if (idx === currentIdx) className += ' current';
        else className += ' upcoming';

        return (
          <div key={step.key} className={className}>
            {step.label}
          </div>
        );
      })}
    </div>
  );
}

function ConfirmDialog({ title, message, confirmLabel, onConfirm, onCancel, loading }) {
  return (
    <div className="officer-modal-overlay" role="dialog" aria-modal="true">
      <div className="officer-modal">
        <div className="officer-modal-header">
          <h3>{title}</h3>
          <button type="button" className="officer-modal-close" onClick={onCancel} aria-label="Close">
            ×
          </button>
        </div>
        <div className="officer-modal-body">{message}</div>
        <div className="officer-modal-footer">
          <button type="button" className="officer-btn officer-btn-secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button
            type="button"
            className="officer-btn officer-btn-primary"
            style={{ width: 'auto' }}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function AppointmentWorkflow({ appointment, token, onRefresh }) {
  const [biometricMessageOpen, setBiometricMessageOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [confirmHandover, setConfirmHandover] = useState(false);

  const step = resolveWorkflowStep(appointment);
  const appointmentId = getAppointmentId(appointment);

  const runAction = async (endpoint, successMessage) => {
    if (!appointmentId) {
      setActionError('Appointment ID missing — backend must provide appointment_id or application_id.');
      return false;
    }

    setActionLoading(true);
    setActionError('');

    try {
      await axios.post(`${API_BASE}${endpoint}`, {}, { headers: authHeaders(token) });
      await onRefresh();
      return true;
    } catch (err) {
      if (err.response?.status === 404) {
        setActionError(
          `Endpoint not available: POST ${endpoint}. Backend integration required before this action can complete.`
        );
      } else {
        setActionError(
          err.response?.data?.message ||
            `Action failed. Backend endpoint POST ${endpoint} may not be implemented yet.`
        );
      }
      return false;
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkIdReady = () => runAction(`/api/officer/appointments/${appointmentId}/id-ready`);

  const handleConfirmIdGiven = async () => {
    const ok = await runAction(`/api/officer/appointments/${appointmentId}/id-given`);
    if (ok) setConfirmHandover(false);
  };

  const handleMarkIdCollected = () =>
    runAction(`/api/officer/appointments/${appointmentId}/id-collected`);

  const canStartBiometrics =
    step === 'scheduled' || step === 'awaiting_biometrics';

  const showAwaitingVerification =
    step === 'awaiting_biometrics' ||
    (step === 'scheduled' && appointment.awaiting_biometric_verification === true);

  const canMarkIdReady = step === 'biometrics_verified';
  const canConfirmHandover = step === 'id_ready';
  const canMarkCollected = step === 'id_given';
  const isComplete = step === 'id_collected';

  return (
    <div className="officer-workflow">
      <p className="officer-workflow-title">Collection Workflow</p>
      <WorkflowStepper currentStep={step} />

      <div className="officer-workflow-actions">
        {canStartBiometrics && (
          <button
            type="button"
            className="officer-btn officer-btn-secondary officer-btn-sm"
            onClick={() => setBiometricMessageOpen(true)}
          >
            Start Biometric Capture
          </button>
        )}

        {(showAwaitingVerification || step === 'awaiting_biometrics') && (
          <span className="officer-workflow-message">
            Awaiting biometric verification — completion must be confirmed by the authorized biometric device/system.
          </span>
        )}

        {step === 'biometrics_verified' && (
          <button
            type="button"
            className="officer-btn officer-btn-primary officer-btn-sm"
            style={{ width: 'auto' }}
            disabled={!canMarkIdReady || actionLoading}
            onClick={handleMarkIdReady}
          >
            Mark ID Ready
          </button>
        )}

        {canConfirmHandover && (
          <button
            type="button"
            className="officer-btn officer-btn-secondary officer-btn-sm"
            disabled={actionLoading}
            onClick={() => setConfirmHandover(true)}
          >
            Confirm ID Given
          </button>
        )}

        {canMarkCollected && (
          <button
            type="button"
            className="officer-btn officer-btn-primary officer-btn-sm"
            style={{ width: 'auto' }}
            disabled={actionLoading}
            onClick={handleMarkIdCollected}
          >
            Mark ID Collected
          </button>
        )}

        {isComplete && (
          <span className="officer-workflow-message" style={{ fontStyle: 'normal', color: '#006600', fontWeight: 600 }}>
            ID Collected — workflow complete.
          </span>
        )}
      </div>

      {actionError && <p className="officer-action-error">{actionError}</p>}

      {biometricMessageOpen && (
        <div className="officer-modal-overlay" role="dialog" aria-modal="true">
          <div className="officer-modal">
            <div className="officer-modal-header">
              <h3>Biometric Capture</h3>
              <button
                type="button"
                className="officer-modal-close"
                onClick={() => setBiometricMessageOpen(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="officer-modal-body">
              <p>
                The authorized biometric capture device/system is <strong>not connected</strong> to this portal yet.
              </p>
              <p>
                Biometric capture and verification must be performed through the official hardware integration.
                This browser cannot capture or verify biometrics.
              </p>
              <p style={{ marginBottom: 0 }}>
                Once integrated, the device will report verification status to the Kenya ID System backend,
                and this workflow will advance automatically when verification is confirmed.
              </p>
            </div>
            <div className="officer-modal-footer">
              <button
                type="button"
                className="officer-btn officer-btn-primary"
                style={{ width: 'auto' }}
                onClick={() => setBiometricMessageOpen(false)}
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmHandover && (
        <ConfirmDialog
          title="Confirm ID Handover"
          message={`Confirm that the National ID has been physically handed to ${appointment.first_name || ''} ${appointment.last_name || ''} (Ref: ${appointment.serial_number || '—'})? This action requires backend confirmation and cannot be undone from the portal alone.`}
          confirmLabel="Confirm ID Given"
          onConfirm={handleConfirmIdGiven}
          onCancel={() => setConfirmHandover(false)}
          loading={actionLoading}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function OfficerPortal() {
  const [token, setToken] = useState(() => sessionStorage.getItem(TOKEN_KEY) || '');
  const [officerProfile, setOfficerProfile] = useState(() => {
    try {
      const raw = sessionStorage.getItem(PROFILE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const [appointments, setAppointments] = useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState('');
  const [appointmentsEndpointAvailable, setAppointmentsEndpointAvailable] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleAuthFailure = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(PROFILE_KEY);
    setToken('');
    setOfficerProfile(null);
    setAppointments([]);
    setLoginError('Your session has expired. Please log in again.');
  }, []);

  const fetchAppointments = useCallback(async (authToken, officeId) => {
    if (officeId == null || officeId === '') {
      setAppointments([]);
      setAppointmentsError('Office ID not found. Please log in again.');
      setAppointmentsLoading(false);
      return;
    }

    setAppointmentsLoading(true);
    setAppointmentsError('');

    try {
      const response = await axios.get(`${API_BASE}/api/officer/appointments/${officeId}`, {
        headers: authHeaders(authToken),
      });
      setAppointments(response.data.appointments || response.data.data || []);
      setAppointmentsEndpointAvailable(true);
    } catch (err) {
      if (err.response?.status === 401) {
        handleAuthFailure();
      } else if (err.response?.status === 404) {
        setAppointments([]);
        setAppointmentsEndpointAvailable(false);
        setAppointmentsError('');
      } else {
        setAppointmentsEndpointAvailable(false);
        setAppointmentsError(
          err.response?.data?.message ||
            'Unable to load today\'s appointments. Please try again.'
        );
      }
    } finally {
      setAppointmentsLoading(false);
    }
  }, [handleAuthFailure]);

  useEffect(() => {
    if (token && officerProfile && officerProfile.officeId == null) {
      const officeId = resolveOfficeId(null, token);
      if (officeId != null) {
        const updated = { ...officerProfile, officeId };
        setOfficerProfile(updated);
        sessionStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
      }
    }
  }, [token, officerProfile]);

  const officeId = useMemo(() => getOfficeId(officerProfile, token), [officerProfile, token]);

  useEffect(() => {
    if (token) {
      if (officeId != null) {
        fetchAppointments(token, officeId);
      } else {
        setAppointmentsError('Office ID not available. Please log in again.');
      }
    }
  }, [token, officeId, fetchAppointments]);

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoginLoading(true);
      setLoginError('');

      const response = await axios.post(`${API_BASE}/api/officer/login`, { username, password });
      const newToken = response.data.token;
      const officeId = resolveOfficeId(response.data, newToken);
      const profile = {
        username:
          response.data.officer?.username ||
          response.data.username ||
          username,
        station: response.data.officer?.station_name || response.data.station_name || null,
        officeId,
      };

      sessionStorage.setItem(TOKEN_KEY, newToken);
      sessionStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      setToken(newToken);
      setOfficerProfile(profile);
      setPassword('');
    } catch {
      setLoginError('Invalid credentials or officer login endpoint not available.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(PROFILE_KEY);
    setToken('');
    setOfficerProfile(null);
    setAppointments([]);
    setSearchQuery('');
    setShowLogoutConfirm(false);
  };

  const filteredAppointments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return appointments;

    return appointments.filter((a) => {
      const serial = (a.serial_number || a.reference_number || a.application_ref || '').toLowerCase();
      const name = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase();
      return serial.includes(q) || name.includes(q);
    });
  }, [appointments, searchQuery]);

  const summary = useMemo(() => {
    const counts = {
      today: appointments.length,
      biometricsPending: 0,
      biometricsCompleted: 0,
      idsReady: 0,
      idsCollected: 0,
    };

    appointments.forEach((a) => {
      const step = resolveWorkflowStep(a);
      if (step === 'scheduled' || step === 'awaiting_biometrics') {
        counts.biometricsPending += 1;
      }
      if (stepIndex(step) >= stepIndex('biometrics_verified')) {
        counts.biometricsCompleted += 1;
      }
      if (step === 'id_ready') {
        counts.idsReady += 1;
      }
      if (step === 'id_collected') {
        counts.idsCollected += 1;
      }
    });

    return counts;
  }, [appointments]);

  // -------------------------------------------------------------------------
  // Login view
  // -------------------------------------------------------------------------

  if (!token) {
    return (
      <div className="officer-root">
        <div className="officer-login-page">
          <div className="officer-login-card">
            <div className="officer-login-brand">
              <h1>e-Kitambulisho</h1>
              <p>Officer Portal</p>
            </div>
            <form onSubmit={handleLogin}>
              <div className="officer-form-group">
                <label htmlFor="officer-username">Username</label>
                <input
                  id="officer-username"
                  className="officer-input"
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                />
              </div>
              <div className="officer-form-group">
                <label htmlFor="officer-password">Password</label>
                <input
                  id="officer-password"
                  className="officer-input"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              {loginError && (
                <div className="officer-alert officer-alert-error" style={{ marginBottom: 16 }}>
                  {loginError}
                </div>
              )}
              <button type="submit" className="officer-btn officer-btn-primary" disabled={loginLoading}>
                {loginLoading ? 'Logging in...' : 'Sign In'}
              </button>
            </form>
            <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13 }}>
              <Link to="/" style={{ color: '#006600' }}>
                ← Back to Home
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Dashboard view
  // -------------------------------------------------------------------------

  return (
    <div className="officer-root">
      <div className="officer-layout">
        <header className="officer-header">
          <div>
            <h1>Officer Portal</h1>
            {officerProfile?.station && (
              <span style={{ fontSize: 13, opacity: 0.9 }}>{officerProfile.station}</span>
            )}
          </div>
          <div className="officer-header-meta">
            {officerProfile?.username && (
              <span style={{ fontSize: 14 }}>{officerProfile.username}</span>
            )}
            <button
              type="button"
              className="officer-btn officer-btn-secondary officer-btn-sm"
              onClick={() => setShowLogoutConfirm(true)}
            >
              Logout
            </button>
          </div>
        </header>

        <main className="officer-content">
          <h2 style={{ marginTop: 0, color: '#333' }}>Today&apos;s Appointments</h2>

          <div className="officer-stat-grid">
            <div className="officer-stat-card">
              <div className="officer-stat-label">Today&apos;s Appointments</div>
              <div className="officer-stat-value">{summary.today}</div>
            </div>
            <div className="officer-stat-card">
              <div className="officer-stat-label">Biometrics Pending</div>
              <div className="officer-stat-value">{summary.biometricsPending}</div>
            </div>
            <div className="officer-stat-card">
              <div className="officer-stat-label">Biometrics Completed</div>
              <div className="officer-stat-value">{summary.biometricsCompleted}</div>
            </div>
            <div className="officer-stat-card">
              <div className="officer-stat-label">IDs Ready</div>
              <div className="officer-stat-value">{summary.idsReady}</div>
            </div>
            <div className="officer-stat-card">
              <div className="officer-stat-label">IDs Collected</div>
              <div className="officer-stat-value">{summary.idsCollected}</div>
            </div>
          </div>

          {appointmentsEndpointAvailable === false && (
            <div className="officer-alert officer-alert-info">
              Appointments endpoint returned no data. Expected:{' '}
              <code>GET /api/officer/appointments/:officeId</code>
            </div>
          )}

          {appointmentsError && (
            <div className="officer-alert officer-alert-error">
              {appointmentsError}
              <button
                type="button"
                className="officer-btn officer-btn-secondary officer-btn-sm"
                style={{ marginLeft: 12 }}
                onClick={() => {
                  const officeId = getOfficeId(officerProfile, token);
                  if (officeId != null) fetchAppointments(token, officeId);
                }}
              >
                Retry
              </button>
            </div>
          )}

          <div className="officer-search-row">
            <input
              className="officer-input"
              type="text"
              placeholder="Search by application/reference number or applicant name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <p className="officer-results-count">
            Showing {filteredAppointments.length} of {appointments.length} appointments
          </p>

          {appointmentsLoading && (
            <div className="officer-loading">Loading today&apos;s appointments...</div>
          )}

          {!appointmentsLoading && filteredAppointments.length === 0 && (
            <div className="officer-empty">
              {appointments.length === 0 ? (
                <p>No appointments scheduled for today.</p>
              ) : (
                <>
                  <p>No appointments match your search.</p>
                  <button
                    type="button"
                    className="officer-btn officer-btn-secondary officer-btn-sm"
                    style={{ marginTop: 12 }}
                    onClick={() => setSearchQuery('')}
                  >
                    Clear search
                  </button>
                </>
              )}
            </div>
          )}

          {!appointmentsLoading && filteredAppointments.length > 0 && (
            <div className="officer-appointment-list">
              {filteredAppointments.map((appointment) => {
                const id = getAppointmentId(appointment) || appointment.serial_number;
                const step = resolveWorkflowStep(appointment);

                return (
                  <article key={id} className="officer-appointment-card">
                    <div className="officer-appointment-header">
                      <div>
                        <h3>
                          {appointment.first_name} {appointment.last_name}
                        </h3>
                        <div className="officer-appointment-ref">
                          Ref: {appointment.serial_number || appointment.reference_number || '—'}
                        </div>
                      </div>
                      <StatusBadge step={step} />
                    </div>

                    <div className="officer-appointment-body">
                      <div>
                        <span className="officer-detail-label">Appointment</span>
                        {formatAppointmentDateTime(appointment)}
                      </div>
                      <div>
                        <span className="officer-detail-label">Application Status</span>
                        {appointment.current_status || appointment.status || '—'}
                      </div>
                      <div>
                        <span className="officer-detail-label">Location</span>
                        {formatLocation(appointment)}
                      </div>
                    </div>

                    <AppointmentWorkflow
                      appointment={appointment}
                      token={token}
                      onRefresh={() => {
                        const officeId = getOfficeId(officerProfile, token);
                        if (officeId != null) fetchAppointments(token, officeId);
                      }}
                    />
                  </article>
                );
              })}
            </div>
          )}

          <div className="officer-backend-note">
            <strong>Backend integrations required:</strong>
            <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
              <li><code>POST /api/officer/login</code> — officer authentication (JWT)</li>
              <li><code>GET /api/officer/appointments/:officeId</code> — today&apos;s appointments for the officer&apos;s office</li>
              <li>Biometric device integration — reports verification to backend (no browser capture)</li>
              <li><code>POST /api/officer/appointments/:id/id-ready</code> — mark ID ready after biometrics verified</li>
              <li><code>POST /api/officer/appointments/:id/id-given</code> — confirm physical ID handover</li>
              <li><code>POST /api/officer/appointments/:id/id-collected</code> — finalize collection status</li>
            </ul>
            Appointment records should include <code>officer_workflow_status</code> or mappable{' '}
            <code>current_status</code>, plus <code>biometrics_verified</code> when device confirms capture.
          </div>
        </main>
      </div>

      {showLogoutConfirm && (
        <ConfirmDialog
          title="Confirm Logout"
          message="Are you sure you want to sign out of the Officer Portal?"
          confirmLabel="Logout"
          onConfirm={handleLogout}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      )}
    </div>
  );
}

export default OfficerPortal;
