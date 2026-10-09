import PublicLayout from '../components/PublicLayout';

function InfoPage({ title, children }) {
  return (
    <PublicLayout>
      <article className="ek-info-page">
        <h1>{title}</h1>
        {children}
      </article>
    </PublicLayout>
  );
}

export function HelpCentre() {
  return (
    <InfoPage title="Help Centre">
      <p>
        This prototype helps citizens apply for identity services, track applications, and access
        replacement or foreigner workflows. For pilot support, contact your county programme team.
      </p>
      <h2>Track your application</h2>
      <p>Use <strong>Track Application</strong> with the reference number you received when you submitted.</p>
      <h2>Common questions</h2>
      <ul className="ek-info-list">
        <li>Keep your phone number accurate for SMS updates during the pilot.</li>
        <li>Upload clear photos of required documents where prompted.</li>
        <li>Appointment details appear in your status once approved.</li>
      </ul>
    </InfoPage>
  );
}

export function PrivacyPolicy() {
  return (
    <InfoPage title="Privacy Policy">
      <p>
        This digital identity services prototype processes personal data only for demonstration and
        pilot evaluation. Data handling follows the project&apos;s pilot data protection guidelines.
      </p>
      <p>
        Do not submit real sensitive data unless instructed by your pilot coordinator. Access to
        staff functions requires authenticated accounts verified by the server.
      </p>
    </InfoPage>
  );
}

export function TermsOfService() {
  return (
    <InfoPage title="Terms of Service">
      <p>
        e-Kitambulisho is presented as a <strong>Digital Identity Services Prototype</strong> for
        testing and feedback. It is not an official government production service.
      </p>
      <p>
        By using this site you agree to use it only for authorised pilot purposes and to follow
        instructions from programme administrators.
      </p>
    </InfoPage>
  );
}
