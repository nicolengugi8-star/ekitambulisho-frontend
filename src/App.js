import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import StatusTracker from './pages/StatusTracker';
import CitizenForm from './pages/CitizenForm';
import ForeignerForm from './pages/ForeignerForm';
import LostIdForm from './pages/LostIdForm';
import ChiefPortal from './pages/ChiefPortal';
import OfficerPortal from './pages/OfficerPortal';
import AdminDashboard from './pages/AdminDashboard';
import Success from './pages/Success';
import StaffLogin from './pages/StaffLogin';
import { HelpCentre, PrivacyPolicy, TermsOfService } from './pages/PublicInfoPages';


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/citizen" element={<CitizenForm />} />
        <Route path="/status" element={<StatusTracker />} />
        <Route path="/apply" element={<CitizenForm />} />
        <Route path="/chief" element={<ChiefPortal />} />
        <Route path="/officer" element={<OfficerPortal />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/staff/login" element={<StaffLogin />} />
        <Route path="/help" element={<HelpCentre />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/foreigner" element={<ForeignerForm />} />
        <Route path="/lost-id" element={<LostIdForm />} />
        <Route path="/lostid" element={<Navigate to="/lost-id" replace />} />
        <Route path="/lost_id" element={<Navigate to="/lost-id" replace />} />
        <Route path="/success/:serialNumber" element={<Success />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;