import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import PublicLayout from '../components/PublicLayout';
import FormProgress from '../components/FormProgress';
import API_BASE from '../config/api';

const STEP_LABELS = ['Personal', 'Location', 'Parents', 'Contact'];

function CitizenForm() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    dateOfBirth: '',
    gender: '',
    countyId: '',
    subCountyId: '',
    wardId: '',
    village: '',
    fatherName: '',
    fatherIdNo: '',
    motherName: '',
    motherIdNo: '',
    phoneNumber: '',
    alternativeContact: '',
    alternativeName: '',
    email: '',
    birthCertNo: ''
  });

  const [counties, setCounties] = useState([]);
  const [subCounties, setSubCounties] = useState([]);
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get(`${API_BASE}/api/locations/counties`)
      .then(response => {
        setCounties(response.data.counties);
      });
  }, []);

  useEffect(() => {
    if (!formData.countyId) {
      setSubCounties([]);
      setWards([]);
      return;
    }

    axios.get(`${API_BASE}/api/locations/sub-counties/${formData.countyId}`)
      .then(response => {
        setSubCounties(response.data.subCounties);
        setWards([]);
      });
  }, [formData.countyId]);

  useEffect(() => {
    if (!formData.subCountyId) {
      setWards([]);
      return;
    }

    axios.get(`${API_BASE}/api/locations/wards/${formData.subCountyId}`)
      .then(response => {
        setWards(response.data.wards);
      });
  }, [formData.subCountyId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'countyId' ? { subCountyId: '', wardId: '' } : {}),
      ...(name === 'subCountyId' ? { wardId: '' } : {}),
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await axios.post(
        `${API_BASE}/api/citizen/apply`,
        formData
      );

      navigate(`/success/${response.data.serialNumber}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong!');
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="ek-container-narrow" style={{ margin: '0 auto' }}>
        <div className="ek-page-header">
          <h1>Apply For National ID</h1>
          <p>Complete all steps to submit your citizen application.</p>
        </div>

        <FormProgress currentStep={step} totalSteps={4} labels={STEP_LABELS} />

        {error && <div className="ek-alert ek-alert-error">{error}</div>}

        <div className="ek-form-card">
          {step === 1 && (
            <div>
              <h2 className="ek-form-section-title">Personal Details</h2>
              <div className="ek-form-group">
                <label className="ek-label ek-label-required" htmlFor="firstName">First Name</label>
                <input className="ek-input" id="firstName" type="text" name="firstName" placeholder="First Name" value={formData.firstName} onChange={handleChange} />
              </div>
              <div className="ek-form-group">
                <label className="ek-label" htmlFor="middleName">Middle Name</label>
                <input className="ek-input" id="middleName" type="text" name="middleName" placeholder="Middle Name (optional)" value={formData.middleName} onChange={handleChange} />
              </div>
              <div className="ek-form-group">
                <label className="ek-label ek-label-required" htmlFor="lastName">Last Name</label>
                <input className="ek-input" id="lastName" type="text" name="lastName" placeholder="Last Name" value={formData.lastName} onChange={handleChange} />
              </div>
              <div className="ek-form-group">
                <label className="ek-label ek-label-required" htmlFor="dateOfBirth">Date of Birth</label>
                <input className="ek-input" id="dateOfBirth" type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} />
              </div>
              <div className="ek-form-group">
                <label className="ek-label ek-label-required" htmlFor="gender">Gender</label>
                <select className="ek-select" id="gender" name="gender" value={formData.gender} onChange={handleChange}>
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div className="ek-btn-group">
                <button type="button" className="ek-btn ek-btn-primary" onClick={() => setStep(2)}>Next →</button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="ek-form-section-title">Location Details</h2>
              <div className="ek-form-group">
                <label className="ek-label ek-label-required" htmlFor="countyId">County</label>
                <select className="ek-select" id="countyId" name="countyId" value={formData.countyId} onChange={handleChange}>
                  <option value="">Select County</option>
                  {counties.map(county => (
                    <option key={county.county_id} value={county.county_id}>{county.county_name}</option>
                  ))}
                </select>
              </div>
              <div className="ek-form-group">
                <label className="ek-label" htmlFor="subCountyId">Sub County</label>
                <select className="ek-select" id="subCountyId" name="subCountyId" value={formData.subCountyId} onChange={handleChange} disabled={!formData.countyId}>
                  <option value="">Select Sub County</option>
                  {subCounties.map(sub => (
                    <option key={sub.sub_county_id} value={sub.sub_county_id}>{sub.sub_county_name}</option>
                  ))}
                </select>
              </div>
              <div className="ek-form-group">
                <label className="ek-label" htmlFor="wardId">Ward</label>
                <select className="ek-select" id="wardId" name="wardId" value={formData.wardId} onChange={handleChange} disabled={!formData.subCountyId}>
                  <option value="">Select Ward</option>
                  {wards.map(ward => (
                    <option key={ward.ward_id} value={ward.ward_id}>{ward.ward_name}</option>
                  ))}
                </select>
              </div>
              <div className="ek-form-group">
                <label className="ek-label" htmlFor="village">Village / Estate</label>
                <input className="ek-input" id="village" type="text" name="village" placeholder="Village/Estate" value={formData.village} onChange={handleChange} />
              </div>
              <div className="ek-btn-group">
                <button type="button" className="ek-btn ek-btn-secondary" onClick={() => setStep(1)}>← Back</button>
                <button type="button" className="ek-btn ek-btn-primary" onClick={() => setStep(3)}>Next →</button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="ek-form-section-title">Parent Details</h2>
              <div className="ek-form-group">
                <label className="ek-label" htmlFor="fatherName">Father&apos;s Full Name</label>
                <input className="ek-input" id="fatherName" type="text" name="fatherName" placeholder="Father's Full Name" value={formData.fatherName} onChange={handleChange} />
              </div>
              <div className="ek-form-group">
                <label className="ek-label" htmlFor="fatherIdNo">Father&apos;s ID Number</label>
                <input className="ek-input" id="fatherIdNo" type="text" name="fatherIdNo" placeholder="Father's ID Number" value={formData.fatherIdNo} onChange={handleChange} />
              </div>
              <div className="ek-form-group">
                <label className="ek-label" htmlFor="motherName">Mother&apos;s Full Name</label>
                <input className="ek-input" id="motherName" type="text" name="motherName" placeholder="Mother's Full Name" value={formData.motherName} onChange={handleChange} />
              </div>
              <div className="ek-form-group">
                <label className="ek-label" htmlFor="motherIdNo">Mother&apos;s ID Number</label>
                <input className="ek-input" id="motherIdNo" type="text" name="motherIdNo" placeholder="Mother's ID Number" value={formData.motherIdNo} onChange={handleChange} />
              </div>
              <div className="ek-btn-group">
                <button type="button" className="ek-btn ek-btn-secondary" onClick={() => setStep(2)}>← Back</button>
                <button type="button" className="ek-btn ek-btn-primary" onClick={() => setStep(4)}>Next →</button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="ek-form-section-title">Contact &amp; Documents</h2>
              <div className="ek-form-group">
                <label className="ek-label ek-label-required" htmlFor="phoneNumber">Phone Number</label>
                <input className="ek-input" id="phoneNumber" type="tel" name="phoneNumber" placeholder="e.g. 0712345678" value={formData.phoneNumber} onChange={handleChange} />
              </div>
              <div className="ek-form-group">
                <label className="ek-label" htmlFor="alternativeContact">Alternative Contact</label>
                <input className="ek-input" id="alternativeContact" type="tel" name="alternativeContact" placeholder="Alternative Contact Number" value={formData.alternativeContact} onChange={handleChange} />
              </div>
              <div className="ek-form-group">
                <label className="ek-label" htmlFor="alternativeName">Alternative Contact Name</label>
                <input className="ek-input" id="alternativeName" type="text" name="alternativeName" placeholder="Alternative Contact Name" value={formData.alternativeName} onChange={handleChange} />
              </div>
              <div className="ek-form-group">
                <label className="ek-label" htmlFor="email">Email Address</label>
                <input className="ek-input" id="email" type="email" name="email" placeholder="Email (optional)" value={formData.email} onChange={handleChange} />
              </div>
              <div className="ek-form-group">
                <label className="ek-label" htmlFor="birthCertNo">Birth Certificate Number</label>
                <input className="ek-input" id="birthCertNo" type="text" name="birthCertNo" placeholder="Birth Certificate Number" value={formData.birthCertNo} onChange={handleChange} />
              </div>
              <div className="ek-btn-group">
                <button type="button" className="ek-btn ek-btn-secondary" onClick={() => setStep(3)} disabled={loading}>← Back</button>
                <button type="button" className="ek-btn ek-btn-primary" onClick={handleSubmit} disabled={loading}>
                  {loading ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}

export default CitizenForm;
