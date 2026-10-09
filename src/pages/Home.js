import { Link } from 'react-router-dom';
import PublicLayout from '../components/PublicLayout';

function Home() {
  return (
    <PublicLayout fullWidth>
      <section className="ek-hero">
        <div className="ek-container">
          <h1>e-Kitambulisho</h1>
          <h2>Digital Identity Services Prototype</h2>
          <p>
            Apply, track, and manage identity services through a secure digital prototype built
            for pilot evaluation and stakeholder demonstration.
          </p>
          <div className="ek-hero-actions">
            <Link to="/apply" className="ek-btn ek-btn-primary">
              Apply Now
            </Link>
            <Link to="/status" className="ek-btn ek-btn-secondary">
              Track Application
            </Link>
          </div>
        </div>
      </section>

      <section className="ek-section">
        <div className="ek-container">
          <h2 className="ek-section-title">Our Services</h2>
          <p className="ek-section-subtitle">Choose the service that best suits your needs.</p>

          <div className="ek-card-grid">
            <div className="ek-service-card">
              <h3>Citizen Services</h3>
              <p>
                Apply for your first National ID, replace a lost ID, or manage your
                application online.
              </p>
              <div className="ek-service-card-actions">
                <Link to="/citizen" className="ek-btn ek-btn-primary ek-btn-block">
                  Apply for National ID
                </Link>
                <Link to="/lost-id" className="ek-btn ek-btn-secondary ek-btn-block">
                  Replace Lost / Stolen / Damaged ID
                </Link>
              </div>
            </div>

            <div className="ek-service-card">
              <h3>Foreigner Services</h3>
              <p>
                Access identity and registration services for eligible foreign residents
                in Kenya.
              </p>
              <Link to="/foreigner" className="ek-btn ek-btn-primary ek-btn-block">
                Continue Application
              </Link>
            </div>

            <div className="ek-service-card">
              <h3>Track Application</h3>
              <p>
                Check your application status and receive the latest updates on your
                reference number.
              </p>
              <Link to="/status" className="ek-btn ek-btn-primary ek-btn-block">
                Track Now
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="ek-section ek-section-alt">
        <div className="ek-container">
          <h2 className="ek-section-title">Why Choose e-Kitambulisho?</h2>
          <div className="ek-feature-grid">
            <div className="ek-feature-item">
              <h3>Secure Verification</h3>
              <p>Your personal information is protected through secure digital verification.</p>
            </div>
            <div className="ek-feature-item">
              <h3>SMS Notifications</h3>
              <p>Receive SMS updates throughout every stage of your application.</p>
            </div>
            <div className="ek-feature-item">
              <h3>Faster Processing</h3>
              <p>Digital workflows reduce delays and improve service delivery.</p>
            </div>
            <div className="ek-feature-item">
              <h3>Real-Time Tracking</h3>
              <p>Track your application from submission to collection.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="ek-section">
        <div className="ek-container">
          <h2 className="ek-section-title">How It Works</h2>
          <ol className="ek-steps-list">
            <li>Submit Your Application</li>
            <li>Verification &amp; Approval</li>
            <li>Biometric Appointment</li>
            <li>Collect Your ID</li>
          </ol>
        </div>
      </section>
    </PublicLayout>
  );
}

export default Home;
