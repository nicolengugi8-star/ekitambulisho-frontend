import { useState } from 'react';
import axios from 'axios';
import PublicLayout from '../components/PublicLayout';
import API_BASE from '../config/api';

function StatusTracker() {
  const [serialNumber, setSerialNumber] = useState('');
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const checkStatus = async () => {
    const cleanSerial = serialNumber.trim();

    if (!cleanSerial) {
      setError('Please enter your reference number');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setApplication(null);

      const response = await axios.get(
        `${API_BASE}/api/citizen/status/${cleanSerial}`
      );

      setApplication(response.data.application);
    } catch {
      setError('Application not found. Please check your reference number and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') checkStatus();
  };

  const formatAppointmentDate = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString('en-KE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatAppointmentTime = (value) => {
    if (!value) return '—';
    return String(value).slice(0, 5);
  };

  const formatOfficeLocation = (appointment) => {
    if (!appointment) return '—';
    const parts = [
      appointment.office_name,
      appointment.office_ward_name,
      appointment.office_county_name,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : '—';
  };

  return (
    <PublicLayout>
      <div className="ek-container-narrow" style={{ margin: '0 auto' }}>
        <div className="ek-page-header">
          <h1>Track Your Application</h1>
          <p>Enter your reference number to view the current status of your application.</p>
        </div>

        <div className="ek-form-card">
          <div className="ek-form-group">
            <label htmlFor="serialNumber" className="ek-label ek-label-required">
              Reference Number
            </label>
            <input
              id="serialNumber"
              className="ek-input"
              type="text"
              placeholder="e.g. KE-2026-00001"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          </div>

          <button
            type="button"
            className="ek-btn ek-btn-primary"
            onClick={checkStatus}
            disabled={loading}
          >
            {loading ? 'Checking...' : 'Check Status'}
          </button>

          {error && <div className="ek-alert ek-alert-error" style={{ marginTop: 20 }}>{error}</div>}

          {loading && <div className="ek-loading" style={{ marginTop: 20 }}>Searching...</div>}

          {application && !loading && (
            <div className="ek-card" style={{ marginTop: 24 }}>
              <h2 className="ek-form-section-title">Application Details</h2>
              <div className="ek-review-panel">
                {[
                  ['Full Name', `${application.first_name} ${application.last_name}`],
                  ['Reference', application.serial_number],
                  ['Status', application.current_status],
                  ['County', application.county_name],
                  ['Ward', application.ward_name],
                ].map(([label, value]) => (
                  <div key={label} className="ek-review-row">
                    <span className="ek-review-label">{label}</span>
                    <span>{value || '—'}</span>
                  </div>
                ))}
              </div>
              <span className="ek-badge ek-badge-green">{application.current_status}</span>

              {application.appointment && (
                <div style={{ marginTop: 24 }}>
                  <h2 className="ek-form-section-title">Appointment Details</h2>
                  <div className="ek-review-panel">
                    {[
                      ['Date', formatAppointmentDate(application.appointment.appointment_date)],
                      ['Time', formatAppointmentTime(application.appointment.appointment_time)],
                      ['Queue Number', application.appointment.queue_number],
                      ['Registration Office', formatOfficeLocation(application.appointment)],
                    ].map(([label, value]) => (
                      <div key={label} className="ek-review-row">
                        <span className="ek-review-label">{label}</span>
                        <span>{value ?? '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {application.waiting_card && (
                <div style={{ marginTop: 24 }}>
                  <h2 className="ek-form-section-title">Waiting Card</h2>
                  <div className="ek-review-panel">
                    {[
                      ['Reference', application.waiting_card.card_token],
                      ['Status', application.waiting_card.current_status],
                      ['Valid Until', application.waiting_card.expires_at
                        ? new Date(application.waiting_card.expires_at).toLocaleDateString('en-KE')
                        : '—'],
                    ].map(([label, value]) => (
                      <div key={label} className="ek-review-row">
                        <span className="ek-review-label">{label}</span>
                        <span style={label === 'Reference' ? { fontFamily: 'monospace', wordBreak: 'break-all' } : undefined}>
                          {value ?? '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p style={{ marginTop: 12, fontSize: 14, color: '#555' }}>
                    Present this waiting card reference at your registration office on your appointment date.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}

export default StatusTracker;
