import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import PublicLayout from '../components/PublicLayout';
import API_BASE from '../config/api';

const REASON_OPTIONS = [
  { value: 'lost', label: 'Lost' },
  { value: 'stolen', label: 'Stolen' },
  { value: 'damaged', label: 'Damaged' },
];

const REASON_LABELS = Object.fromEntries(REASON_OPTIONS.map((r) => [r.value, r.label]));

function LostIdForm() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    oldIdNumber: '',
    dateOfBirth: '',
    reason: '',
    policeAbstract: '',
    phoneNumber: '',
    alternativeContact: '',
    countyId: '',
    subCountyId: '',
    wardId: '',
  });
  const [policeAbstractFile, setPoliceAbstractFile] = useState(null);
  const [counties, setCounties] = useState([]);
  const [subCounties, setSubCounties] = useState([]);
  const [wards, setWards] = useState([]);
  const [countiesLoading, setCountiesLoading] = useState(true);
  const [countiesError, setCountiesError] = useState('');
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    setCountiesLoading(true);
    setCountiesError('');
    axios
      .get(`${API_BASE}/api/locations/counties`)
      .then((response) => {
        setCounties(response.data.counties || []);
      })
      .catch(() => {
        setCountiesError(
          'Could not load counties. Make sure the Kenya ID System backend is running on port 5000, then refresh this page.'
        );
      })
      .finally(() => {
        setCountiesLoading(false);
      });
  }, []);

  const loadCounties = () => {
    setCountiesLoading(true);
    setCountiesError('');
    axios
      .get(`${API_BASE}/api/locations/counties`)
      .then((response) => {
        setCounties(response.data.counties || []);
      })
      .catch(() => {
        setCountiesError(
          'Could not load counties. Make sure the Kenya ID System backend is running on port 5000, then refresh this page.'
        );
      })
      .finally(() => {
        setCountiesLoading(false);
      });
  };

  useEffect(() => {
    if (!formData.countyId) {
      setSubCounties([]);
      setWards([]);
      return;
    }
    setLocationsLoading(true);
    axios
      .get(`${API_BASE}/api/locations/sub-counties/${formData.countyId}`)
      .then((response) => {
        setSubCounties(response.data.subCounties || []);
        setWards([]);
      })
      .catch(() => {
        setError('Could not load sub-counties for the selected county.');
      })
      .finally(() => {
        setLocationsLoading(false);
      });
  }, [formData.countyId]);

  useEffect(() => {
    if (!formData.subCountyId) {
      setWards([]);
      return;
    }
    setLocationsLoading(true);
    axios
      .get(`${API_BASE}/api/locations/wards/${formData.subCountyId}`)
      .then((response) => {
        setWards(response.data.wards || []);
      })
      .catch(() => {
        setError('Could not load wards for the selected sub-county.');
      })
      .finally(() => {
        setLocationsLoading(false);
      });
  }, [formData.subCountyId]);

  const requiresPoliceAbstract = formData.reason === 'lost' || formData.reason === 'stolen';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'countyId' ? { subCountyId: '', wardId: '' } : {}),
      ...(name === 'subCountyId' ? { wardId: '' } : {}),
    }));
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    if (name === 'reason') {
      setPoliceAbstractFile(null);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setPoliceAbstractFile(file);
    setFieldErrors((prev) => ({ ...prev, policeAbstractFile: '' }));
  };

  const validate = () => {
    const errors = {};

    if (!formData.fullName.trim()) errors.fullName = 'Full name is required';
    if (!formData.dateOfBirth) errors.dateOfBirth = 'Date of birth is required';
    if (!formData.reason) errors.reason = 'Reason is required';
    if (!formData.phoneNumber.trim()) errors.phoneNumber = 'Phone number is required';
    if (!formData.countyId) errors.countyId = 'County is required';
    if (!formData.wardId) errors.wardId = 'Ward is required';

    if (requiresPoliceAbstract && !formData.policeAbstract.trim()) {
      errors.policeAbstract = 'Police abstract number is required for lost or stolen IDs';
    }

    if (requiresPoliceAbstract && policeAbstractFile) {
      const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!allowed.includes(policeAbstractFile.type)) {
        errors.policeAbstractFile = 'Only JPG, PNG, or PDF files are allowed';
      }
      if (policeAbstractFile.size > 5 * 1024 * 1024) {
        errors.policeAbstractFile = 'File must be 5MB or less';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleReview = () => {
    setError('');
    if (validate()) {
      setShowReview(true);
    } else {
      setShowReview(false);
    }
  };

  const uploadPoliceAbstractFile = async (replacementId) => {
    if (!policeAbstractFile || !replacementId) return false;

    const data = new FormData();
    data.append('policeAbstract', policeAbstractFile);

    await axios.post(`${API_BASE}/api/replacement/upload-abstract/${replacementId}`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      setShowReview(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const payload = {
        fullName: formData.fullName.trim(),
        oldIdNumber: formData.oldIdNumber.trim() || undefined,
        dateOfBirth: formData.dateOfBirth,
        phoneNumber: formData.phoneNumber.trim(),
        alternativeContact: formData.alternativeContact.trim() || undefined,
        wardId: formData.wardId,
        countyId: formData.countyId,
        reason: formData.reason,
        policeAbstract: requiresPoliceAbstract ? formData.policeAbstract.trim() : undefined,
      };

      const response = await axios.post(`${API_BASE}/api/replacement/apply`, payload);
      const replacementId = response.data.replacementId;

      if (policeAbstractFile && replacementId) {
        try {
          await uploadPoliceAbstractFile(replacementId);
        } catch {
          setError(
            'Application submitted, but the police abstract file could not be uploaded. Please bring the document to the office.'
          );
          setLoading(false);
          return;
        }
      }

      navigate(`/success/${response.data.serialNumber}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const renderFieldError = (name) =>
    fieldErrors[name] ? <p className="ek-field-error">{fieldErrors[name]}</p> : null;

  const countyName = counties.find((c) => String(c.county_id) === String(formData.countyId))?.county_name;
  const wardName = wards.find((w) => String(w.ward_id) === String(formData.wardId))?.ward_name;

  return (
    <PublicLayout>
      <div className="ek-container-narrow" style={{ margin: '0 auto' }}>
        <div className="ek-page-header">
          <h1>Lost / Replacement ID Application</h1>
          <p>Report a lost, stolen, or damaged ID and apply for a replacement.</p>
        </div>

        {error && <div className="ek-alert ek-alert-error">{error}</div>}
        {countiesError && (
          <div className="ek-alert ek-alert-error">
            {countiesError}{' '}
            <button type="button" className="ek-btn ek-btn-secondary ek-btn-sm" onClick={loadCounties}>Retry</button>
          </div>
        )}
        {countiesLoading && <div className="ek-loading">Loading counties...</div>}

        <div className="ek-form-card">
          <h2 className="ek-form-section-title">Application Details</h2>

          <div className="ek-form-group">
            <label className="ek-label ek-label-required" htmlFor="fullName">Full Name</label>
            <input className="ek-input" id="fullName" type="text" name="fullName" placeholder="Full name" value={formData.fullName} onChange={handleChange} />
            {renderFieldError('fullName')}
          </div>

          <div className="ek-form-group">
            <label className="ek-label" htmlFor="oldIdNumber">Old ID Number</label>
            <input className="ek-input" id="oldIdNumber" type="text" name="oldIdNumber" placeholder="Optional if forgotten" value={formData.oldIdNumber} onChange={handleChange} />
          </div>

          <div className="ek-form-group">
            <label className="ek-label ek-label-required" htmlFor="dateOfBirth">Date of Birth</label>
            <input className="ek-input" id="dateOfBirth" type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} />
            {renderFieldError('dateOfBirth')}
          </div>

          <div className="ek-form-group">
            <label className="ek-label ek-label-required" htmlFor="reason">Reason</label>
            <select className="ek-select" id="reason" name="reason" value={formData.reason} onChange={handleChange}>
              <option value="">Select reason</option>
              {REASON_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            {renderFieldError('reason')}
          </div>

          {requiresPoliceAbstract && (
            <>
              <div className="ek-form-group">
                <label className="ek-label ek-label-required" htmlFor="policeAbstract">Police Abstract / OB Number</label>
                <input className="ek-input" id="policeAbstract" type="text" name="policeAbstract" placeholder="Police abstract / OB number" value={formData.policeAbstract} onChange={handleChange} />
                {renderFieldError('policeAbstract')}
              </div>
              <div className="ek-form-group">
                <label className="ek-label" htmlFor="policeAbstractFile">Police Abstract Document (optional)</label>
                <input className="ek-input" id="policeAbstractFile" type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" onChange={handleFileChange} />
                {renderFieldError('policeAbstractFile')}
                <p style={{ fontSize: 12, color: 'var(--ek-text-light)', marginTop: 6 }}>JPG, PNG, or PDF — max 5MB</p>
              </div>
            </>
          )}

          <div className="ek-form-group">
            <label className="ek-label ek-label-required" htmlFor="phoneNumber">Phone Number</label>
            <input className="ek-input" id="phoneNumber" type="tel" name="phoneNumber" placeholder="e.g. 0712345678" value={formData.phoneNumber} onChange={handleChange} />
            {renderFieldError('phoneNumber')}
          </div>

          <div className="ek-form-group">
            <label className="ek-label" htmlFor="alternativeContact">Alternative Contact</label>
            <input className="ek-input" id="alternativeContact" type="tel" name="alternativeContact" placeholder="Optional" value={formData.alternativeContact} onChange={handleChange} />
          </div>

          <div className="ek-form-group">
            <label className="ek-label ek-label-required" htmlFor="countyId">County</label>
            <select className="ek-select" id="countyId" name="countyId" value={formData.countyId} onChange={handleChange} disabled={countiesLoading}>
              <option value="">Select county</option>
              {counties.map((county) => (
                <option key={county.county_id} value={county.county_id}>{county.county_name}</option>
              ))}
            </select>
            {renderFieldError('countyId')}
          </div>

          <div className="ek-form-group">
            <label className="ek-label" htmlFor="subCountyId">Sub County</label>
            <select className="ek-select" id="subCountyId" name="subCountyId" value={formData.subCountyId} onChange={handleChange} disabled={!formData.countyId || locationsLoading}>
              <option value="">Select sub-county</option>
              {subCounties.map((sub) => (
                <option key={sub.sub_county_id} value={sub.sub_county_id}>{sub.sub_county_name}</option>
              ))}
            </select>
          </div>

          <div className="ek-form-group">
            <label className="ek-label ek-label-required" htmlFor="wardId">Ward</label>
            <select className="ek-select" id="wardId" name="wardId" value={formData.wardId} onChange={handleChange} disabled={!formData.subCountyId || locationsLoading}>
              <option value="">Select ward</option>
              {wards.map((ward) => (
                <option key={ward.ward_id} value={ward.ward_id}>{ward.ward_name}</option>
              ))}
            </select>
            {renderFieldError('wardId')}
          </div>

          <div className="ek-btn-group">
            <button type="button" className="ek-btn ek-btn-primary" onClick={handleReview}>Review Application</button>
          </div>
        </div>

        {showReview && (
          <div className="ek-form-card" style={{ marginTop: 24 }}>
            <h2 className="ek-form-section-title">Review &amp; Confirm</h2>
            <div className="ek-review-panel">
              {[
                ['Full Name', formData.fullName],
                ['Old ID Number', formData.oldIdNumber || '—'],
                ['Date of Birth', formData.dateOfBirth],
                ['Reason', REASON_LABELS[formData.reason]],
                ['Police Abstract Number', requiresPoliceAbstract ? formData.policeAbstract : 'Not required'],
                ['Police Abstract File', policeAbstractFile ? policeAbstractFile.name : 'None'],
                ['Phone Number', formData.phoneNumber],
                ['Alternative Contact', formData.alternativeContact || '—'],
                ['County', countyName || '—'],
                ['Ward', wardName || '—'],
              ].map(([label, value]) => (
                <div key={label} className="ek-review-row">
                  <span className="ek-review-label">{label}</span>
                  <span>{value}</span>
                </div>
              ))}
            </div>
            <div className="ek-btn-group">
              <button type="button" className="ek-btn ek-btn-secondary" onClick={() => setShowReview(false)} disabled={loading}>← Back to Edit</button>
              <button type="button" className="ek-btn ek-btn-primary" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Submitting...' : 'Confirm & Submit'}
              </button>
            </div>
          </div>
        )}
      </div>
    </PublicLayout>
  );
}

export default LostIdForm;
