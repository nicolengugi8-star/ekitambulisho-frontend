import { Link, useParams } from 'react-router-dom';
import PublicLayout from '../components/PublicLayout';

function Success() {
  const { serialNumber } = useParams();

  return (
    <PublicLayout>
      <div className="ek-form-card ek-success-page">
        <div className="ek-success-icon" aria-hidden="true">✓</div>
        <h1 style={{ margin: '0 0 8px', color: 'var(--ek-green-dark)' }}>Application Submitted</h1>
        <p style={{ color: 'var(--ek-text-muted)', margin: '0 0 8px' }}>
          Your application has been received successfully.
        </p>
        <p style={{ margin: '0 0 4px', fontSize: 14, color: 'var(--ek-text-muted)' }}>
          Your reference number is:
        </p>
        <div className="ek-ref-number">{serialNumber}</div>
        <div className="ek-alert ek-alert-success" style={{ textAlign: 'left', marginTop: 24 }}>
          You will receive an SMS confirmation shortly. Please save your reference number.
        </div>
        <div className="ek-btn-group" style={{ justifyContent: 'center' }}>
          <Link to="/status" className="ek-btn ek-btn-primary">
            Track Your Application
          </Link>
          <Link to="/" className="ek-btn ek-btn-secondary">
            Back to Home
          </Link>
        </div>
      </div>
    </PublicLayout>
  );
}

export default Success;
