import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/citizen', label: 'Apply for ID' },
  { to: '/lost-id', label: 'Lost ID' },
  { to: '/foreigner', label: 'Foreigner' },
  { to: '/status', label: 'Track Status' },
];

const PORTAL_LINKS = [
  { to: '/chief', label: 'Chief Portal' },
  { to: '/officer', label: 'Officer Portal' },
  { to: '/admin', label: 'Admin' },
];

function PublicLayout({ children, fullWidth = false }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="ek-app">
      <header className="ek-header">
        <div className="ek-header-inner">
          <Link to="/" className="ek-brand" onClick={() => setMenuOpen(false)}>
            <span className="ek-brand-title">e-Kitambulisho</span>
            <span className="ek-brand-sub">Republic of Kenya · Digital Identity Services</span>
          </Link>

          <nav className="ek-nav-desktop" aria-label="Main navigation">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`ek-nav-link ${isActive(link.to) ? 'active' : ''}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <button
            type="button"
            className="ek-menu-toggle"
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            ☰
          </button>
        </div>

        <nav className={`ek-nav-mobile ${menuOpen ? 'open' : ''}`} aria-label="Mobile navigation">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`ek-nav-link ${isActive(link.to) ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          {PORTAL_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="ek-nav-link"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="ek-main">
        {fullWidth ? children : (
          <div className="ek-container ek-section">{children}</div>
        )}
      </main>

      <footer className="ek-footer">
        <div className="ek-container">
          <div className="ek-footer-grid">
            <div>
              <h4>e-Kitambulisho</h4>
              <p style={{ fontSize: 14, margin: 0, opacity: 0.75 }}>
                Kenya&apos;s digital platform for national identity registration, replacement, and tracking.
              </p>
            </div>
            <div>
              <h4>Services</h4>
              <div className="ek-footer-links">
                <Link to="/citizen">Citizen Application</Link>
                <Link to="/lost-id">Lost / Replacement ID</Link>
                <Link to="/foreigner">Foreigner Services</Link>
                <Link to="/status">Track Application</Link>
              </div>
            </div>
            <div>
              <h4>Staff Portals</h4>
              <div className="ek-footer-links">
                <Link to="/chief">Chief Portal</Link>
                <Link to="/officer">Officer Portal</Link>
                <Link to="/admin">Admin Dashboard</Link>
              </div>
            </div>
            <div>
              <h4>Support</h4>
              <div className="ek-footer-links">
                <Link to="/status">Help Centre</Link>
                <span style={{ fontSize: 14, opacity: 0.75 }}>Privacy Policy</span>
                <span style={{ fontSize: 14, opacity: 0.75 }}>Terms of Service</span>
              </div>
            </div>
          </div>
          <div className="ek-footer-bottom">
            © {new Date().getFullYear()} e-Kitambulisho · Government of Kenya. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default PublicLayout;
