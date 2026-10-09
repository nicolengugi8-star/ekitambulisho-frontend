import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

export const BRAND_TITLE = 'e-Kitambulisho';
export const BRAND_TAGLINE = 'Digital Identity Services Prototype';

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/citizen', label: 'Apply for ID' },
  { to: '/lost-id', label: 'Lost / Replacement ID' },
  { to: '/foreigner', label: 'Foreigner Services' },
  { to: '/status', label: 'Track Application' },
  { to: '/help', label: 'Help Centre' },
  { to: '/privacy', label: 'Privacy Policy' },
  { to: '/terms', label: 'Terms of Service' },
];

function PublicLayout({ children, fullWidth = false }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="ek-app">
      <header className="ek-header">
        <div className="ek-header-inner">
          <Link to="/" className="ek-brand" onClick={closeMenu}>
            <span className="ek-brand-title">{BRAND_TITLE}</span>
            <span className="ek-brand-sub">{BRAND_TAGLINE}</span>
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
            <Link
              to="/staff/login"
              className={`ek-nav-link ek-nav-link-staff ${isActive('/staff/login') ? 'active' : ''}`}
            >
              Staff Login
            </Link>
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
              onClick={closeMenu}
            >
              {link.label}
            </Link>
          ))}
          <Link
            to="/staff/login"
            className={`ek-nav-link ek-nav-link-staff ${isActive('/staff/login') ? 'active' : ''}`}
            onClick={closeMenu}
          >
            Staff Login
          </Link>
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
              <h4>{BRAND_TITLE}</h4>
              <p className="ek-footer-blurb">
                A prototype platform for digital identity registration, replacement, and application
                tracking.
              </p>
            </div>
            <div>
              <h4>Services</h4>
              <div className="ek-footer-links">
                <Link to="/citizen">Apply for ID</Link>
                <Link to="/lost-id">Lost / Replacement ID</Link>
                <Link to="/foreigner">Foreigner Services</Link>
                <Link to="/status">Track Application</Link>
              </div>
            </div>
            <div>
              <h4>Information</h4>
              <div className="ek-footer-links">
                <Link to="/help">Help Centre</Link>
                <Link to="/privacy">Privacy Policy</Link>
                <Link to="/terms">Terms of Service</Link>
              </div>
            </div>
            <div>
              <h4>Staff</h4>
              <div className="ek-footer-links">
                <Link to="/staff/login" className="ek-footer-staff-link">
                  Staff Login
                </Link>
              </div>
            </div>
          </div>
          <div className="ek-footer-bottom">
            © {new Date().getFullYear()} {BRAND_TITLE} · {BRAND_TAGLINE}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default PublicLayout;
