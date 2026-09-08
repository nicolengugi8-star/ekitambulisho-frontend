import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import PublicLayout from '../components/PublicLayout';
import FormProgress from '../components/FormProgress';
import API_BASE from '../config/api';

const STEP_LABELS = ['Document', 'Personal', 'Passport', 'Details', 'Contact', 'Review'];

const DOCUMENT_TYPES = [
  { value: 'alien_card', label: 'Alien Card' },
  { value: 'work_permit', label: 'Work Permit' },
  { value: 'class_g', label: 'Class G Pass' },
  { value: 'refugee_id', label: 'Refugee ID' },
];

const DOCUMENT_TYPE_LABELS = Object.fromEntries(
  DOCUMENT_TYPES.map((d) => [d.value, d.label])
);

const INITIAL_FORM = {
  documentType: '',
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  gender: '',
  nationality: '',
  countryOfBirth: '',
  passportNumber: '',
  passportExpiry: '',
  visaNumber: '',
  dateEnteredKenya: '',
  countyId: '',
  physicalAddress: '',
  yearsInKenya: '',
  reasonForStaying: '',
  employerName: '',
  jobTitle: '',
  employmentStartDate: '',
  organizationName: '',
  officialPosition: '',
  postingDuration: '',
  unhcrNumber: '',
  refugeeCamp: '',
  phoneNumber: '',
  alternativeContact: '',
  email: '',
};

function ForeignerForm() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [counties, setCounties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    axios.get(`${API_BASE}/api/locations/counties`).then((response) => {
      setCounties(response.data.counties || []);
    });
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const validateStep = (currentStep) => {
    const errors = {};

    if (currentStep === 1) {
      if (!formData.documentType) errors.documentType = 'Document type is required';
    }

    if (currentStep === 2) {
      if (!formData.firstName.trim()) errors.firstName = 'First name is required';
      if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
      if (!formData.dateOfBirth) errors.dateOfBirth = 'Date of birth is required';
      if (!formData.gender) errors.gender = 'Gender is required';
      if (!formData.nationality.trim()) errors.nationality = 'Nationality is required';
      if (!formData.countryOfBirth.trim()) errors.countryOfBirth = 'Country of birth is required';
    }

    if (currentStep === 3) {
      if (!formData.passportNumber.trim()) errors.passportNumber = 'Passport number is required';
      if (!formData.passportExpiry) errors.passportExpiry = 'Passport expiry is required';
      if (!formData.dateEnteredKenya) errors.dateEnteredKenya = 'Date entered Kenya is required';
    }

    if (currentStep === 4) {
      if (formData.documentType === 'alien_card') {
        if (!formData.physicalAddress.trim()) errors.physicalAddress = 'Physical address is required';
        if (!formData.yearsInKenya) errors.yearsInKenya = 'Years in Kenya is required';
        if (!formData.reasonForStaying.trim()) errors.reasonForStaying = 'Reason for staying is required';
        if (!formData.countyId) errors.countyId = 'County is required';
      }
      if (formData.documentType === 'work_permit') {
        if (!formData.employerName.trim()) errors.employerName = 'Employer name is required';
        if (!formData.jobTitle.trim()) errors.jobTitle = 'Job title is required';
        if (!formData.employmentStartDate) errors.employmentStartDate = 'Employment start date is required';
      }
      if (formData.documentType === 'class_g') {
        if (!formData.organizationName.trim()) errors.organizationName = 'Organization name is required';
        if (!formData.officialPosition.trim()) errors.officialPosition = 'Official position is required';
        if (!formData.postingDuration.trim()) errors.postingDuration = 'Posting duration is required';
      }
      if (formData.documentType === 'refugee_id') {
        if (!formData.unhcrNumber.trim()) errors.unhcrNumber = 'UNHCR number is required';
        if (!formData.refugeeCamp.trim()) errors.refugeeCamp = 'Refugee camp is required';
      }
    }

    if (currentStep === 5) {
      if (!formData.phoneNumber.trim()) errors.phoneNumber = 'Phone number is required';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const goNext = () => {
    if (validateStep(step)) {
      setError('');
      setStep((s) => Math.min(s + 1, 6));
    }
  };

  const goBack = () => {
    setError('');
    setStep((s) => Math.max(s - 1, 1));
  };

  const buildPayload = () => {
    const payload = {
      documentType: formData.documentType,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      dateOfBirth: formData.dateOfBirth,
      gender: formData.gender,
      nationality: formData.nationality.trim(),
      countryOfBirth: formData.countryOfBirth.trim(),
      passportNumber: formData.passportNumber.trim(),
      passportExpiry: formData.passportExpiry,
      visaNumber: formData.visaNumber.trim() || undefined,
      dateEnteredKenya: formData.dateEnteredKenya,
      phoneNumber: formData.phoneNumber.trim(),
      alternativeContact: formData.alternativeContact.trim() || undefined,
      email: formData.email.trim() || undefined,
    };

    if (formData.documentType === 'alien_card') {
      payload.countyId = formData.countyId;
      payload.physicalAddress = formData.physicalAddress.trim();
      payload.yearsInKenya = formData.yearsInKenya;
      payload.reasonForStaying = formData.reasonForStaying.trim();
    }

    if (formData.documentType === 'work_permit') {
      payload.employerName = formData.employerName.trim();
      payload.jobTitle = formData.jobTitle.trim();
      payload.employmentStartDate = formData.employmentStartDate;
    }

    if (formData.documentType === 'class_g') {
      payload.organizationName = formData.organizationName.trim();
      payload.officialPosition = formData.officialPosition.trim();
      payload.postingDuration = formData.postingDuration.trim();
    }

    if (formData.documentType === 'refugee_id') {
      payload.unhcrNumber = formData.unhcrNumber.trim();
      payload.refugeeCamp = formData.refugeeCamp.trim();
    }

    return payload;
  };

  const handleSubmit = async () => {
    if (!validateStep(5)) {
      setStep(5);
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await axios.post(`${API_BASE}/api/foreigner/apply`, buildPayload());
      navigate(`/success/${response.data.serialNumber}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const renderFieldError = (name) =>
    fieldErrors[name] ? <p className="ek-field-error">{fieldErrors[name]}</p> : null;

  const renderAdditionalFields = () => {
    switch (formData.documentType) {
      case 'alien_card':
        return (
          <>
            <select className="ek-select" name="countyId" value={formData.countyId} onChange={handleChange}>
              <option value="">Select County</option>
              {counties.map((county) => (
                <option key={county.county_id} value={county.county_id}>
                  {county.county_name}
                </option>
              ))}
            </select>
            {renderFieldError('countyId')}
            <input className="ek-input" type="text" name="physicalAddress"
              placeholder="Physical address in Kenya"
              value={formData.physicalAddress}
              onChange={handleChange}
            />
            {renderFieldError('physicalAddress')}
            <input className="ek-input"
              type="number"
              name="yearsInKenya"
              placeholder="Years in Kenya"
              min="0"
              value={formData.yearsInKenya}
              onChange={handleChange}
            />
            {renderFieldError('yearsInKenya')}
            <input className="ek-input"
              type="text"
              name="reasonForStaying"
              placeholder="Reason for staying"
              value={formData.reasonForStaying}
              onChange={handleChange}
            />
            {renderFieldError('reasonForStaying')}
          </>
        );
      case 'work_permit':
        return (
          <>
            <input className="ek-input"
              type="text"
              name="employerName"
              placeholder="Employer name"
              value={formData.employerName}
              onChange={handleChange}
            />
            {renderFieldError('employerName')}
            <input className="ek-input"
              type="text"
              name="jobTitle"
              placeholder="Job title"
              value={formData.jobTitle}
              onChange={handleChange}
            />
            {renderFieldError('jobTitle')}
            <input className="ek-input"
              type="date"
              name="employmentStartDate"
              value={formData.employmentStartDate}
              onChange={handleChange}
            />
            {renderFieldError('employmentStartDate')}
          </>
        );
      case 'class_g':
        return (
          <>
            <input className="ek-input"
              type="text"
              name="organizationName"
              placeholder="Organization / diplomatic mission name"
              value={formData.organizationName}
              onChange={handleChange}
            />
            {renderFieldError('organizationName')}
            <input className="ek-input"
              type="text"
              name="officialPosition"
              placeholder="Official position"
              value={formData.officialPosition}
              onChange={handleChange}
            />
            {renderFieldError('officialPosition')}
            <input className="ek-input"
              type="text"
              name="postingDuration"
              placeholder="Posting duration (e.g. 2 years)"
              value={formData.postingDuration}
              onChange={handleChange}
            />
            {renderFieldError('postingDuration')}
          </>
        );
      case 'refugee_id':
        return (
          <>
            <input className="ek-input"
              type="text"
              name="unhcrNumber"
              placeholder="UNHCR number"
              value={formData.unhcrNumber}
              onChange={handleChange}
            />
            {renderFieldError('unhcrNumber')}
            <input className="ek-input"
              type="text"
              name="refugeeCamp"
              placeholder="Refugee camp"
              value={formData.refugeeCamp}
              onChange={handleChange}
            />
            {renderFieldError('refugeeCamp')}
          </>
        );
      default:
        return <p>Please select a document type in Step 1.</p>;
    }
  };

  const reviewItems = [
    ['Document Type', DOCUMENT_TYPE_LABELS[formData.documentType]],
    ['First Name', formData.firstName],
    ['Last Name', formData.lastName],
    ['Date of Birth', formData.dateOfBirth],
    ['Gender', formData.gender],
    ['Nationality', formData.nationality],
    ['Country of Birth', formData.countryOfBirth],
    ['Passport Number', formData.passportNumber],
    ['Passport Expiry', formData.passportExpiry],
    ['Visa Number', formData.visaNumber || '—'],
    ['Date Entered Kenya', formData.dateEnteredKenya],
    ['Phone Number', formData.phoneNumber],
    ['Alternative Contact', formData.alternativeContact || '—'],
    ['Email', formData.email || '—'],
  ];

  if (formData.documentType === 'alien_card') {
    reviewItems.push(
      ['County', counties.find((c) => String(c.county_id) === String(formData.countyId))?.county_name || formData.countyId],
      ['Physical Address', formData.physicalAddress],
      ['Years in Kenya', formData.yearsInKenya],
      ['Reason for Staying', formData.reasonForStaying]
    );
  }
  if (formData.documentType === 'work_permit') {
    reviewItems.push(
      ['Employer Name', formData.employerName],
      ['Job Title', formData.jobTitle],
      ['Employment Start Date', formData.employmentStartDate]
    );
  }
  if (formData.documentType === 'class_g') {
    reviewItems.push(
      ['Organization', formData.organizationName],
      ['Official Position', formData.officialPosition],
      ['Posting Duration', formData.postingDuration]
    );
  }
  if (formData.documentType === 'refugee_id') {
    reviewItems.push(
      ['UNHCR Number', formData.unhcrNumber],
      ['Refugee Camp', formData.refugeeCamp]
    );
  }

  return (
    <PublicLayout>
      <div className="ek-container-narrow" style={{ margin: '0 auto' }}>
        <div className="ek-page-header">
          <h1>Foreigner Application</h1>
          <p>Register for alien card, work permit, class G pass, or refugee ID.</p>
        </div>

        <FormProgress currentStep={step} totalSteps={6} labels={STEP_LABELS} />
        {error && <div className="ek-alert ek-alert-error">{error}</div>}

        <div className="ek-form-card">
      {step === 1 && (
        <div>
          <h2 className="ek-form-section-title">Document Type</h2>
          <div className="ek-form-group">
            <label className="ek-label ek-label-required" htmlFor="documentType">Document Type</label>
          <select className="ek-select" id="documentType" name="documentType" value={formData.documentType} onChange={handleChange}>
            <option value="">Select document type</option>
            {DOCUMENT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          {renderFieldError('documentType')}
          </div>
          <div className="ek-btn-group">
            <button type="button" className="ek-btn ek-btn-primary" onClick={goNext}>Next →</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2 className="ek-form-section-title">Personal Details</h2>
          <div className="ek-form-group"><input className="ek-input" type="text" name="firstName" placeholder="First name" value={formData.firstName} onChange={handleChange} />
          {renderFieldError('firstName')}</div>
          <div className="ek-form-group"><input className="ek-input" type="text" name="lastName" placeholder="Last name" value={formData.lastName} onChange={handleChange} />
          {renderFieldError('lastName')}</div>
          <div className="ek-form-group"><input className="ek-input" type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} />
          {renderFieldError('dateOfBirth')}</div>
          <div className="ek-form-group"><select className="ek-select" name="gender" value={formData.gender} onChange={handleChange}>
            <option value="">Select gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
          {renderFieldError('gender')}</div>
          <div className="ek-form-group"><input className="ek-input" type="text" name="nationality" placeholder="Nationality" value={formData.nationality} onChange={handleChange} />
          {renderFieldError('nationality')}</div>
          <div className="ek-form-group"><input className="ek-input" type="text" name="countryOfBirth" placeholder="Country of birth" value={formData.countryOfBirth} onChange={handleChange} />
          {renderFieldError('countryOfBirth')}</div>
          <div className="ek-btn-group">
            <button type="button" className="ek-btn ek-btn-secondary" onClick={goBack}>← Back</button>
            <button type="button" className="ek-btn ek-btn-primary" onClick={goNext}>Next →</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <h2 className="ek-form-section-title">Document Details</h2>
          <div className="ek-form-group"><input className="ek-input" type="text" name="passportNumber" placeholder="Passport number" value={formData.passportNumber} onChange={handleChange} />
          {renderFieldError('passportNumber')}</div>
          <div className="ek-form-group"><input className="ek-input" type="date" name="passportExpiry" value={formData.passportExpiry} onChange={handleChange} />
          {renderFieldError('passportExpiry')}</div>
          <div className="ek-form-group"><input className="ek-input" type="text" name="visaNumber" placeholder="Visa number (optional)" value={formData.visaNumber} onChange={handleChange} /></div>
          <div className="ek-form-group"><input className="ek-input" type="date" name="dateEnteredKenya" value={formData.dateEnteredKenya} onChange={handleChange} />
          {renderFieldError('dateEnteredKenya')}</div>
          <div className="ek-btn-group">
            <button type="button" className="ek-btn ek-btn-secondary" onClick={goBack}>← Back</button>
            <button type="button" className="ek-btn ek-btn-primary" onClick={goNext}>Next →</button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div>
          <h2 className="ek-form-section-title">Additional Details</h2>
          <p style={{ marginBottom: 16, color: 'var(--ek-text-muted)' }}>Document type: <strong>{DOCUMENT_TYPE_LABELS[formData.documentType]}</strong></p>
          {renderAdditionalFields()}
          <div className="ek-btn-group">
            <button type="button" className="ek-btn ek-btn-secondary" onClick={goBack}>← Back</button>
            <button type="button" className="ek-btn ek-btn-primary" onClick={goNext}>Next →</button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div>
          <h2 className="ek-form-section-title">Contact Details</h2>
          <div className="ek-form-group"><input className="ek-input" type="tel" name="phoneNumber" placeholder="Phone number e.g. 0712345678" value={formData.phoneNumber} onChange={handleChange} />
          {renderFieldError('phoneNumber')}</div>
          <div className="ek-form-group"><input className="ek-input" type="tel" name="alternativeContact" placeholder="Alternative contact (optional)" value={formData.alternativeContact} onChange={handleChange} /></div>
          <div className="ek-form-group"><input className="ek-input" type="email" name="email" placeholder="Email (optional)" value={formData.email} onChange={handleChange} /></div>
          <div className="ek-btn-group">
            <button type="button" className="ek-btn ek-btn-secondary" onClick={goBack}>← Back</button>
            <button type="button" className="ek-btn ek-btn-primary" onClick={goNext}>Next →</button>
          </div>
        </div>
      )}

      {step === 6 && (
        <div>
          <h2 className="ek-form-section-title">Review &amp; Submit</h2>
          <div className="ek-review-panel">
            {reviewItems.map(([label, value]) => (
              <div key={label} className="ek-review-row">
                <span className="ek-review-label">{label}</span>
                <span>{value || '—'}</span>
              </div>
            ))}
          </div>
          <div className="ek-btn-group">
            <button type="button" className="ek-btn ek-btn-secondary" onClick={goBack} disabled={loading}>← Back to Edit</button>
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

export default ForeignerForm;
