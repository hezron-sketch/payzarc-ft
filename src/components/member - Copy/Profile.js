import React, { useState, useEffect } from 'react';
import styles from './Profile.module.css';
import axiosInstance from '../../utility/axiosInstance';
import { djangoApis } from '../../utility/axiosInstance';
import axios from 'axios';
import { countries } from '../../utility/countries'; // Adjust path if needed

function Profile({ user, onRefreshUser }) {
  const STAFF_API_URL = process.env.REACT_APP_STAFF_API_URL || 'http://localhost:8081';
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [username, setUsername] = useState('');
  const [errorUsername, setErrorUsername] = useState('');
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successfulUsername, setSuccessfulUsername] = useState('');
  const [showIdentitySuccess, setShowIdentitySuccess] = useState(false);
  const [showResidenceSuccess, setShowResidenceSuccess] = useState(false);
  const [showContactSuccess, setShowContactSuccess] = useState(false);
  const [showSecondaryIdSuccess, setShowSecondaryIdSuccess] = useState(false);

  const [activePanel, setActivePanel] = useState(null);

  const [activeCountries, setActiveCountries] = useState([]);
  const [activeBanks, setActiveBanks] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedBank, setSelectedBank] = useState('');
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [errorFetch, setErrorFetch] = useState('');

  // Secondary contact form
  const [contactType, setContactType] = useState('EMAIL');
  const [contactValue, setContactValue] = useState('');
  const [contactCountryCode, setContactCountryCode] = useState('+254');
  const [contactError, setContactError] = useState('');
  const [contactLoading, setContactLoading] = useState(false);

  // Secondary ID form
  const [secIdType, setSecIdType] = useState('Government ID');
  const [secIdNumber, setSecIdNumber] = useState('');
  const [secIssuedCountry, setSecIssuedCountry] = useState('');
  const [secIdError, setSecIdError] = useState('');
  const [secIdLoading, setSecIdLoading] = useState(false);

  // Modal states for viewing lists
  const [showContactsModal, setShowContactsModal] = useState(false);
  const [showIdsModal, setShowIdsModal] = useState(false);
  const [secondaryContacts, setSecondaryContacts] = useState([]);
  const [secondaryIds, setSecondaryIds] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

  // Set Transaction PIN (Secondary PIN)
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [showPinSuccess, setShowPinSuccess] = useState(false);

  // Eye toggle & strength
  const [showPinInput, setShowPinInput] = useState(false);
  const [showConfirmPinInput, setShowConfirmPinInput] = useState(false);
  const [pinStrength, setPinStrength] = useState({ level: 'none', label: '', color: '' });
  const [pinsMatch, setPinsMatch] = useState(false);   // New: live match status

  // Set Pins
  const bankAccounts = [
    { id: '1', name: 'Account 1234', hasPin: true },
    { id: '2', name: 'Account 5678', hasPin: false },
  ];
  const [selectedAccount, setSelectedAccount] = useState('');
  const selectedPin = bankAccounts.find((a) => a.id === selectedAccount);

  const togglePanel = (panel) => {
    setActivePanel(activePanel === panel ? null : panel);
  };

  // Fetch main profile data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get('/api/profile-details');
        setProfileData(res.data);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to load profile details');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // Fetch secondary contacts & IDs when modal opens
  useEffect(() => {
    if (showContactsModal) {
      fetchSecondaryContacts();
    }
  }, [showContactsModal]);

  useEffect(() => {
    if (showIdsModal) {
      fetchSecondaryIds();
    }
  }, [showIdsModal]);

  const fetchSecondaryContacts = async () => {
    setModalLoading(true);
    try {
      const res = await axiosInstance.get('/api/secondary-contacts');
      setSecondaryContacts(res.data || []);
    } catch (err) {
      console.error('Failed to fetch secondary contacts:', err);
    } finally {
      setModalLoading(false);
    }
  };

  const fetchSecondaryIds = async () => {
    setModalLoading(true);
    try {
      const res = await axiosInstance.get('/api/secondary-ids');
      setSecondaryIds(res.data || []);
    } catch (err) {
      console.error('Failed to fetch secondary IDs:', err);
    } finally {
      setModalLoading(false);
    }
  };

  // Username handlers (unchanged)
  const handleChangeUsername = (e) => {
    const value = e.target.value;
    setUsername(value);
    const trimmed = value.trim();
    if (!value) {
      setErrorUsername('');
      return;
    }
    if (!/^[a-zA-Z0-9 ]*$/.test(value)) {
      setErrorUsername('Only letters, numbers and single space allowed');
      return;
    }
    if (trimmed.length < 3 && trimmed.length > 0) {
      setErrorUsername('Minimum 3 characters');
      return;
    }
    if (trimmed.length > 30) {
      setErrorUsername('Maximum 30 characters');
      return;
    }
    setErrorUsername('');
  };

  const handleSubmitUsername = async (e) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (trimmed.length < 3 || trimmed.length > 30) {
      setErrorUsername('Username must be 3–30 characters');
      return;
    }
    if (!/^[a-zA-Z0-9]+( [a-zA-Z0-9]+)?$/.test(trimmed)) {
      setErrorUsername('Only letters, numbers, and one single space allowed');
      return;
    }
    try {
      setErrorUsername('Updating...');
      const response = await axiosInstance.post('/api/update-username', { username: trimmed });
      if (response.data.success) {
        setSuccessfulUsername(trimmed);
        setUsername('');
        setErrorUsername('');
        setShowSuccessPopup(true);
        if (onRefreshUser) onRefreshUser();
      }
    } catch (err) {
      setErrorUsername(err.response?.data?.error || 'Failed to update username');
    }
  };

  // Fetch countries
  useEffect(() => {
    const fetchActiveCountries = async () => {
      setLoadingCountries(true);
      setErrorFetch('');
      try {
        const response = await axiosInstance.get('/api/reference/countries');
        setActiveCountries(response.data || []);
      } catch (err) {
        setErrorFetch('Unable to load countries. Please try again.');
      } finally {
        setLoadingCountries(false);
      }
    };
    fetchActiveCountries();
  }, []);

  // Fetch banks
  useEffect(() => {
    if (!selectedCountry) {
      setActiveBanks([]);
      setSelectedBank('');
      return;
    }
    const fetchBanksForCountry = async () => {
      setLoadingBanks(true);
      setErrorFetch('');
      try {
        const response = await axiosInstance.get('/api/reference/banks', {
          params: { country: selectedCountry }
        });
        setActiveBanks(response.data || []);
        setSelectedBank('');
      } catch (err) {
        setErrorFetch('Unable to load banks for this country.');
      } finally {
        setLoadingBanks(false);
      }
    };
    fetchBanksForCountry();
  }, [selectedCountry]);



  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Add Secondary Contact
  const handleAddContact = async (e) => {
    e.preventDefault();
    setContactError('');
    setContactLoading(true);

    let finalValue = contactValue.trim();

    if (contactType === 'PHONE') {
      finalValue = finalValue.replace(/\D/g, '');
      if (finalValue.startsWith('0')) {
        finalValue = finalValue.substring(1);
      }
      finalValue = contactCountryCode + finalValue;
    }

    if (contactType === 'EMAIL' && !/\S+@\S+\.\S+/.test(finalValue)) {
      setContactError('Please enter a valid email address');
      setContactLoading(false);
      return;
    }
    if (contactType === 'PHONE' && finalValue.length < 10) {
      setContactError('Phone number is too short');
      setContactLoading(false);
      return;
    }

    try {
      await axiosInstance.post('/api/secondary-contact', {
        type: contactType,
        value: finalValue
      });
      setShowContactSuccess(true);
      setContactValue('');
      setContactCountryCode('+254');
    } catch (err) {
      setContactError(err.response?.data?.error || 'Failed to add contact');
    } finally {
      setContactLoading(false);
    }
  };

  // Add Secondary ID
  const handleAddSecondaryId = async (e) => {
    e.preventDefault();
    setSecIdError('');
    setSecIdLoading(true);

    try {
      await axiosInstance.post('/api/secondary-id', {
        idType: secIdType.trim(),
        idNumber: secIdNumber.trim(),
        issuedCountry: secIssuedCountry.trim()
      });
      setShowSecondaryIdSuccess(true);
      setSecIdType('Government ID');
      setSecIdNumber('');
      setSecIssuedCountry('');
    } catch (err) {
      setSecIdError(err.response?.data?.error || 'Failed to add secondary ID');
    } finally {
      setSecIdLoading(false);
    }
  };

  // Real-time PIN strength checker
  const getPinStrength = (pinValue) => {
    if (!pinValue || pinValue.length === 0) {
      return { level: 'none', label: '', color: '' };
    }
    if (pinValue.length < 4) {
      return { level: 'weak', label: 'Too Short', color: '#ef4444' };
    }

    const weakPins = ['1234', '0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '4321', '3456', '6789'];
    if (weakPins.includes(pinValue) || /^(\d)\1{3}$/.test(pinValue)) {
      return { level: 'weak', label: 'Very Weak', color: '#ef4444' };
    }

    // Medium: has some repetition or sequential
    if (/(\d)\1{2}/.test(pinValue) || /123|234|345|456|567|678|789|987|876/.test(pinValue)) {
      return { level: 'medium', label: 'Medium', color: '#f59e0b' };
    }

    // Strong: random enough
    return { level: 'strong', label: 'Strong', color: '#22c55e' };
  };

  const handleSetPin = async () => {
    setPinError('');
    setPinLoading(true);

    // Basic validation
    if (pin.length !== 4 || confirmPin.length !== 4) {
      setPinError('PIN must be exactly 4 digits');
      setPinLoading(false);
      return;
    }

    if (pin !== confirmPin) {
      setPinError('PINs do not match');
      setPinLoading(false);
      return;
    }

    // Fintech best practices - reject obvious/weak PINs
    const weakPins = ['1234', '0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '4321', '3456', '6789'];
    if (weakPins.includes(pin)) {
      setPinError('Please choose a stronger PIN. Avoid obvious sequences like 1234 or 0000.');
      setPinLoading(false);
      return;
    }

    // Optional: Check if all digits are the same
    if (/^(\d)\1{3}$/.test(pin)) {
      setPinError('PIN cannot be all identical digits (e.g. 1111)');
      setPinLoading(false);
      return;
    }

    try {
      const response = await djangoApis.system1.post('/api/set-pin/', {
        pin: pin
      });

      if (response.data.success) {
        setShowPinSuccess(true);
        setPin('');
        setConfirmPin('');

        // Optional: refresh user data if needed
        if (onRefreshUser) onRefreshUser();
      } else {
        setPinError(response.data.message || 'Failed to set PIN');
      }
    } catch (err) {
      console.error('Set PIN Error:', err);
      setPinError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Failed to activate account. Please try again.'
      );
    } finally {
      setPinLoading(false);
    }
  };

  // Identity Details Form (unchanged)
  function IdentityDetailsForm({ onRefreshUser, onClose }) {
    const [idType, setIdType] = useState('');
    const [idNumber, setIdNumber] = useState('');
    const [issuedCountry, setIssuedCountry] = useState('');
    const [verified, setVerified] = useState(false);
    const [issueDate, setIssueDate] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [alreadyVerified, setAlreadyVerified] = useState(false);

    useEffect(() => {
      if (profileData) {
        setIdType(profileData.idType || 'Not set');
        setIdNumber(profileData.idNumber || 'Not set');
        setIssuedCountry(profileData.issuedCountry || 'Not set');
        setVerified(profileData.idVerified || false);
        setAlreadyVerified(profileData.idVerified || false);
        setIssueDate(profileData.issueDate || '');
        setExpiryDate(profileData.expiryDate || '');
      }
    }, [profileData]);

    const validateDates = () => {
      if (!issueDate || !expiryDate) return true;
      const issue = new Date(issueDate);
      const expiry = new Date(expiryDate);
      const birth = new Date(profileData?.dob);
      if (issue >= expiry) {
        setError('Expiry date must be after issue date');
        return false;
      }
      if (issue <= birth || expiry <= birth) {
        setError('Both dates must be after date of birth');
        return false;
      }
      setError('');
      return true;
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (alreadyVerified) {
        setError('Identity is already verified — cannot update');
        return;
      }
      if (!validateDates()) return;

      setLoading(true);
      try {
        await axiosInstance.post('/api/update-identity-details', { issueDate, expiryDate });
        setAlreadyVerified(true);
        setShowIdentitySuccess(true);
        onRefreshUser?.();
        onClose();
      } catch (err) {
        setError(err.response?.data?.error || 'Update failed');
      } finally {
        setLoading(false);
      }
    };

    return (
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.fieldWrapper}>
          <input type="text" value={idType} disabled className={`${styles.input} ${styles.disabled}`} placeholder="ID Type" />
        </div>
        <div className={styles.fieldWrapper}>
          <input type="text" value={idNumber} disabled className={`${styles.input} ${styles.disabled}`} placeholder="ID Number" />
        </div>
        <div className={styles.fieldWrapper}>
          <select className={styles.input} value={issuedCountry} disabled>
            <option value="">{issuedCountry || 'Not set'}</option>
          </select>
        </div>
        <div className={styles.fieldWrapper}>
          <input
            type="text"
            value={verified ? 'Verified' : 'Not Verified'}
            disabled
            className={`${styles.input} ${styles.disabled}`}
            placeholder="Verification Status"
          />
        </div>
        <div className={styles.fieldWrapper}>
          <label style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Issue Date</label>
          <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className={styles.input} disabled={alreadyVerified || loading} required />
        </div>
        <div className={styles.fieldWrapper}>
          <label style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Expiry Date</label>
          <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className={styles.input} disabled={alreadyVerified || loading} required />
        </div>
        {error && <p className={styles.errorUsername}>{error}</p>}
        <button type="submit" className={styles['submit-button']} disabled={loading || alreadyVerified}>
          {loading ? 'Saving...' : alreadyVerified ? 'Already Verified' : 'Update Identity'}
        </button>
      </form>
    );
  }

  // Residence Form (unchanged)
  function ResidenceForm({ onRefreshUser, onClose }) {
    const [addressLine, setAddressLine] = useState('');
    const [country, setCountry] = useState('Detecting...');
    const [townCity, setTownCity] = useState('Detecting...');
    const [postalCode, setPostalCode] = useState('Detecting...');
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
      const detectLocation = async () => {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords;
              try {
                const res = await axios.get(
                  `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
                );
                const addr = res.data.address || {};
                setCountry(addr.country || 'Kenya');
                setTownCity(addr.city || addr.town || addr.village || addr.suburb || 'Nairobi');
                setPostalCode(addr.postcode || '00100');
              } catch {
                setDefaults();
              }
            },
            () => setDefaults()
          );
        } else {
          setDefaults();
        }
      };

      const setDefaults = () => {
        setCountry('Kenya');
        setTownCity('Nairobi');
        setPostalCode('00100');
      };

      detectLocation();
    }, []);

    const validate = () => {
      const errs = {};
      if (!addressLine.trim()) errs.addressLine = 'Address line is required';
      else if (addressLine.length < 5) errs.addressLine = 'At least 5 characters';
      else if (addressLine.length > 200) errs.addressLine = 'Max 200 characters';
      if (country === 'Detecting...') errs.country = 'Country detection failed';
      if (townCity === 'Detecting...') errs.townCity = 'Town/City detection failed';
      if (postalCode === 'Detecting...') errs.postalCode = 'Postal code detection failed';
      setErrors(errs);
      return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!validate()) return;

      setLoading(true);
      try {
        await axiosInstance.post('/api/update-residence', {
          country: country.trim(),
          townCity: townCity.trim(),
          postalCode: postalCode.trim(),
          addressLine: addressLine.trim()
        });
        setSuccess(true);
        setShowResidenceSuccess(true);
        onRefreshUser?.();
        setTimeout(() => {
          setSuccess(false);
          setAddressLine('');
          onClose();
        }, 2500);
      } catch (err) {
        setErrors({ server: err.response?.data?.error || 'Update failed' });
      } finally {
        setLoading(false);
      }
    };

    return (
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.fieldWrapper}>
          <input type="text" value={country} disabled className={`${styles.input} ${styles.disabled}`} placeholder="Country" />
          {errors.country && <span className={styles.fieldError}>{errors.country}</span>}
        </div>
        <div className={styles.fieldWrapper}>
          <input type="text" value={townCity} disabled className={`${styles.input} ${styles.disabled}`} placeholder="Town / City" />
          {errors.townCity && <span className={styles.fieldError}>{errors.townCity}</span>}
        </div>
        <div className={styles.fieldWrapper}>
          <input type="text" value={postalCode} disabled className={`${styles.input} ${styles.disabled}`} placeholder="Postal Code" />
          {errors.postalCode && <span className={styles.fieldError}>{errors.postalCode}</span>}
        </div>
        <div className={styles.fieldWrapper}>
          <input
            type="text"
            placeholder="Address Line (e.g. 123 Langata Road, Apt 4B)"
            value={addressLine}
            onChange={(e) => setAddressLine(e.target.value)}
            className={styles.input}
            required
          />
          {errors.addressLine && <span className={styles.fieldError}>{errors.addressLine}</span>}
        </div>
        {errors.server && <p className={styles.errorUsername}>{errors.server}</p>}
        {success && <p style={{ color: '#ecc94b', fontWeight: 'bold', textAlign: 'center' }}>Residence updated successfully!</p>}
        <button type="submit" className={styles['submit-button']} disabled={loading}>
          {loading ? 'Saving...' : 'Update Residence'}
        </button>
      </form>
    );
  }

  if (loading) return <div className={styles.loading}>Loading profile...</div>;
  if (error) return <div className={styles.error}>Error: {error}</div>;

  return (
    <div className={`${styles.section} ${styles.active}`}>
      <h2>User Profile</h2>

      {/* 4-column layout */}
      <div className={styles.profileGrid}>
        {/* Bio Data */}
        <div className={styles.profileColumn}>
          <h3 className={styles.columnHeader}>Bio Data</h3>
          <div className={styles.profileItem}>
            <span className={styles.label}>Full Name</span>
            <span className={styles.value}>
              {profileData?.firstname} {profileData?.middlename || ''} {profileData?.surname} {profileData?.othernames || ''}
            </span>
          </div>
          <div className={styles.profileItem}>
            <span className={styles.label}>Username</span>
            <span className={styles.value}>{profileData?.username || 'Not set'}</span>
          </div>
          <div className={styles.profileItem}>
            <span className={styles.label}>Gender</span>
            <span className={styles.value}>{profileData?.gender || 'Not set'}</span>
          </div>
          <div className={styles.profileItem}>
            <span className={styles.label}>Date of Birth</span>
            <span className={styles.value}>{formatDate(profileData?.dob)}</span>
          </div>
          <div className={styles.profileItem}>
            <span className={styles.label}>Country of Birth</span>
            <span className={styles.value}>{profileData?.countryOfBirth || 'Not set'}</span>
          </div>
        </div>

        {/* Identity */}
        <div className={styles.profileColumn}>
          <h3 className={styles.columnHeader}>Identity</h3>
          <div className={styles.profileItem}>
            <span className={styles.label}>ID Type</span>
            <span className={styles.value}>
              {profileData?.idType || 'Not set'}
              <span style={{ marginLeft: '10px', fontWeight: 'bold', color: profileData?.idVerified ? '#22c55e' : '#ef4444' }}>
                {profileData?.idVerified ? '✔ Verified' : '✘ Not Verified'}
              </span>
            </span>
          </div>
          <div className={styles.profileItem}>
            <span className={styles.label}>ID Number</span>
            <span className={styles.value}>{profileData?.idNumber || 'Not set'}</span>
          </div>
          <div className={styles.profileItem}>
            <span className={styles.label}>Issued Country</span>
            <span className={styles.value}>{profileData?.issuedCountry || 'Not set'}</span>
          </div>
          <div className={styles.profileItem}>
            <span className={styles.label}>Issue Date</span>
            <span className={styles.value}>{formatDate(profileData?.issueDate)}</span>
          </div>
          <div className={styles.profileItem}>
            <span className={styles.label}>Expiry Date</span>
            <span className={styles.value}>{formatDate(profileData?.expiryDate)}</span>
          </div>
        </div>

        {/* Residence */}
        <div className={styles.profileColumn}>
          <h3 className={styles.columnHeader}>Residence</h3>
          <div className={styles.profileItem}>
            <span className={styles.label}>Country</span>
            <span className={styles.value}>{profileData?.residenceCountry || 'Not set'}</span>
          </div>
          <div className={styles.profileItem}>
            <span className={styles.label}>Town/City</span>
            <span className={styles.value}>{profileData?.townCity || 'Not set'}</span>
          </div>
          <div className={styles.profileItem}>
            <span className={styles.label}>Postal Code</span>
            <span className={styles.value}>{profileData?.postalCode || 'Not set'}</span>
          </div>
          <div className={styles.profileItem}>
            <span className={styles.label}>Address Line</span>
            <span className={styles.value}>{profileData?.addressLine || 'Not set'}</span>
          </div>
        </div>

        {/* Contact */}
        <div className={styles.profileColumn}>
          <h3 className={styles.columnHeader}>Contact</h3>
          <div className={styles.profileItem}>
            <span className={styles.label}>Phone</span>
            <span className={styles.value}>
              {profileData?.phone || 'Not set'}
              <span style={{ marginLeft: '10px', fontWeight: 'bold', color: profileData?.phoneVerified ? '#22c55e' : '#ef4444' }}>
                {profileData?.phoneVerified ? '✔ Verified' : '✘ Not Verified'}
              </span>
            </span>
          </div>
          <div className={styles.profileItem}>
            <span className={styles.label}>Email</span>
            <span className={styles.value}>
              {profileData?.email}
              <span style={{ marginLeft: '10px', fontWeight: 'bold', color: profileData?.emailVerified ? '#22c55e' : '#ef4444' }}>
                {profileData?.emailVerified ? '✔ Verified' : '✘ Not Verified'}
              </span>
            </span>
          </div>

          {/* New links */}
          <div style={{ marginTop: '16px', fontSize: '0.95rem' }}>
            <span
              className={styles.label}
              style={{ cursor: 'pointer', color: '#ecc94b', textDecoration: 'underline' }}
              onClick={() => setShowContactsModal(true)}
            >
              More Contacts
            </span>
            <br />
            <span
              className={styles.label}
              style={{ cursor: 'pointer', color: '#ecc94b', textDecoration: 'underline' }}
              onClick={() => setShowIdsModal(true)}
            >
              More Identity Tools
            </span>
          </div>
        </div>
      </div>

      {/* Accordion Panels */}
      <div className={styles['accordion-container']}>
        {/* Update Identity Details */}
        <div className={styles['accordion-item']}>
          <span className={styles.label}>Update Identity details</span>
          <button className={styles['toggle-button']} onClick={() => togglePanel(1)}>
            {activePanel === 1 ? '-' : '+'}
          </button>
        </div>
        {activePanel === 1 && <IdentityDetailsForm onRefreshUser={onRefreshUser} onClose={() => setActivePanel(null)} />}

        {/* Update Residence */}
        <div className={styles['accordion-item']}>
          <span className={styles.label}>Update Residence</span>
          <button className={styles['toggle-button']} onClick={() => togglePanel(2)}>
            {activePanel === 2 ? '-' : '+'}
          </button>
        </div>
        {activePanel === 2 && <ResidenceForm onRefreshUser={onRefreshUser} onClose={() => setActivePanel(null)} />}

        {/* Update Username */}
        <div className={styles['accordion-item']}>
          <span className={styles.label}>Update Username</span>
          <button className={styles['toggle-button']} onClick={() => togglePanel(3)}>
            {activePanel === 3 ? '-' : '+'}
          </button>
        </div>
        {activePanel === 3 && (
          <div className={styles.form}>
            <input
              type="text"
              className={styles.input}
              placeholder="New Username"
              value={username}
              onChange={handleChangeUsername}
              onKeyPress={(e) => { if (!/[a-zA-Z0-9 ]/.test(e.key)) e.preventDefault(); }}
            />
            {errorUsername && <p className={styles.errorUsername}>{errorUsername}</p>}
            <button className={styles['submit-button']} onClick={handleSubmitUsername}>
              Submit
            </button>
          </div>
        )}

        {/* Bind Credit Card */}
        <div className={styles['accordion-item']}>
          <span className={styles.label}>Bind Bank Account</span>
          <button className={styles['toggle-button']} onClick={() => togglePanel(4)}>
            {activePanel === 4 ? '-' : '+'}
          </button>
        </div>

        {activePanel === 4 && (
          <div className={styles.form}>
            {/* Country */}
            <div className={styles.fieldWrapper}>
              <label className={styles.fieldLabel}>Country</label>
              <select
                className={styles.input}
                value={selectedCountry}
                onChange={(e) => {
                  setSelectedCountry(e.target.value);
                  setSelectedBank('');
                }}
                disabled={loadingCountries}
              >
                <option value="">Select Country</option>
                {activeCountries.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              {loadingCountries && <div className={styles.loadingSpinner}>Loading countries...</div>}

              {errorFetch && !loadingCountries && (
                <p className={styles.errorMessage}>{errorFetch}</p>
              )}

              {!loadingCountries && !errorFetch && activeCountries.length === 0 && (
                <p className={styles.errorMessage}>No countries available yet</p>
              )}
            </div>

            {/* Bank */}
            <div className={styles.fieldWrapper}>
              <label className={styles.fieldLabel}>Bank</label>
              <select
                className={styles.input}
                value={selectedBank}
                onChange={(e) => setSelectedBank(e.target.value)}
                disabled={!selectedCountry || loadingBanks || activeBanks.length === 0}
              >
                <option value="">Select Bank</option>
                {activeBanks.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>

              {loadingBanks && selectedCountry && (
                <div className={styles.loadingSpinner}>Loading banks...</div>
              )}

              {!loadingBanks && selectedCountry && activeBanks.length === 0 && !errorFetch && (
                <p className={styles.errorMessage}>No banks found for selected country</p>
              )}

              {errorFetch && !loadingBanks && (
                <p className={styles.errorMessage}>{errorFetch}</p>
              )}
            </div>

            {/* Account number + name – unchanged */}
            <div className={styles.fieldWrapper}>
              <label className={styles.fieldLabel}>Account Number</label>
              <input type="text" className={styles.input} placeholder="e.g. 1234567890" />
            </div>

            <div className={styles.fieldWrapper}>
              <label className={styles.fieldLabel}>Account Name (as in bank)</label>
              <input type="text" className={styles.input} placeholder="e.g. Appolly Ogar" />
            </div>

            <button
              type="button"
              className={styles['submit-button']}
              disabled={!selectedCountry || !selectedBank}
            // onClick={handleBindBankAccount} ← implement when ready
            >
              Bind Bank Account
            </button>
          </div>
        )}



        {/* Set Pins */}
        <div className={styles['accordion-item']}>
          <span className={styles.label}>Set Pins</span>
          <button className={styles['toggle-button']} onClick={() => togglePanel(5)}>
            {activePanel === 5 ? '-' : '+'}
          </button>
        </div>
        {activePanel === 5 && (
          <div className={styles.form}>
            <select className={styles.input} value={selectedAccount} onChange={(e) => setSelectedAccount(e.target.value)}>
              <option>Select Bank Account</option>
              {bankAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            {selectedAccount && selectedPin && (
              <div className={styles.pinForm}>
                {selectedPin.hasPin && <input type="password" className={styles.input} placeholder="Current PIN" />}
                <input type="password" className={styles.input} placeholder="New PIN" />
                <input type="password" className={styles.input} placeholder="Confirm PIN" />
                <button className={styles['submit-button']}>
                  {selectedPin.hasPin ? 'Update PIN' : 'Set PIN'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Add Secondary Contact */}
        <div className={styles['accordion-item']}>
          <span className={styles.label}>Add Secondary Contact</span>
          <button className={styles['toggle-button']} onClick={() => togglePanel(6)}>
            {activePanel === 6 ? '-' : '+'}
          </button>
        </div>
        {activePanel === 6 && (
          <div className={styles.form}>
            <select className={styles.input} value={contactType} onChange={(e) => { setContactType(e.target.value); setContactError(''); }}>
              <option value="EMAIL">Email</option>
              <option value="PHONE">Phone</option>
            </select>

            {contactType === 'PHONE' && (
              <select
                className={styles.input}
                value={contactCountryCode}
                onChange={(e) => setContactCountryCode(e.target.value)}
              >
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name} ({c.code})
                  </option>
                ))}
              </select>
            )}

            <input
              type={contactType === 'EMAIL' ? 'email' : 'tel'}
              className={styles.input}
              placeholder={contactType === 'EMAIL' ? 'Secondary email address' : 'Enter phone number (e.g. 0711223334)'}
              value={contactValue}
              onChange={(e) => { setContactValue(e.target.value); setContactError(''); }}
            />

            {contactError && <p className={styles.errorUsername}>{contactError}</p>}

            <button className={styles['submit-button']} onClick={handleAddContact} disabled={contactLoading}>
              {contactLoading ? 'Adding...' : 'Add Contact'}
            </button>
          </div>
        )}

        {/* Add Secondary ID */}
        <div className={styles['accordion-item']}>
          <span className={styles.label}>Add Secondary ID</span>
          <button className={styles['toggle-button']} onClick={() => togglePanel(7)}>
            {activePanel === 7 ? '-' : '+'}
          </button>
        </div>
        {activePanel === 7 && (
          <div className={styles.form}>
            <select className={styles.input} value={secIdType} onChange={(e) => setSecIdType(e.target.value)}>
              <option value="Government ID">Government ID</option>
              <option value="Passport">Passport</option>
              <option value="Military ID">Military ID</option>
            </select>

            <input
              type="text"
              className={styles.input}
              placeholder="ID Number"
              value={secIdNumber}
              onChange={(e) => setSecIdNumber(e.target.value)}
            />

            <select className={styles.input} value={secIssuedCountry} onChange={(e) => setSecIssuedCountry(e.target.value)}>
              <option value="">Select Issued Country</option>
              {countries.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.flag} {c.name}
                </option>
              ))}
            </select>

            {secIdError && <p className={styles.errorUsername}>{secIdError}</p>}

            <button className={styles['submit-button']} onClick={handleAddSecondaryId} disabled={secIdLoading}>
              {secIdLoading ? 'Adding...' : 'Add Secondary ID'}
            </button>
          </div>
        )}

        {/* Activate Account - Set Transaction PIN
        <div className={styles['accordion-item']}>
          <span className={styles.label}>Activate Account (Set Transaction PIN)</span>
          <button className={styles['toggle-button']} onClick={() => togglePanel(8)}>
            {activePanel === 8 ? '-' : '+'}
          </button>
        </div>

        {activePanel === 8 && (
          <div className={styles.form}>
            <div className={styles.fieldWrapper}>
              <label className={styles.fieldLabel}>Enter 4-Digit Transaction PIN</label>
              <input
                type="password"
                maxLength="4"
                className={styles.input}
                placeholder="1063"
                value={pin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, ''); // only digits
                  setPin(value);
                  setPinError('');
                }}
              />
            </div>

            <div className={styles.fieldWrapper}>
              <label className={styles.fieldLabel}>Confirm Transaction PIN</label>
              <input
                type="password"
                maxLength="4"
                className={styles.input}
                placeholder="1063"
                value={confirmPin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setConfirmPin(value);
                  setPinError('');
                }}
              />
            </div>

            {pinError && <p className={styles.errorUsername}>{pinError}</p>}

            <button
              className={styles['submit-button']}
              onClick={handleSetPin}
              disabled={pinLoading || pin.length !== 4 || confirmPin.length !== 4}
            >
              {pinLoading ? 'Activating...' : 'Activate Account & Set PIN'}
            </button>

            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '8px', textAlign: 'center' }}>
              This PIN will be used for all transactions (send, withdraw, etc.)
            </p>
          </div>
        )} */}




        {/* Activate Account - Set Transaction PIN (Enhanced) */}
        {/*   <div className={styles['accordion-item']}>
          <span className={styles.label}>Activate Account (Set Transaction PIN)</span>
          <button className={styles['toggle-button']} onClick={() => togglePanel(8)}>
            {activePanel === 8 ? '-' : '+'}
          </button>
        </div>

        {activePanel === 8 && (
          <div className={styles.form}>
            <div className={styles.fieldWrapper}>
              <label className={styles.fieldLabel}>Enter 4-Digit Transaction PIN</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPinInput ? "text" : "password"}
                  maxLength="4"
                  className={styles.input}
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setPin(value);
                    setPinError('');
                    setPinStrength(getPinStrength(value));
                  }}
                  style={{
                    letterSpacing: '12px',
                    fontSize: '1.8rem',
                    textAlign: 'center',
                    transition: 'all 0.2s ease'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPinInput(!showPinInput)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '1.1rem'
                  }}
                >
                  {showPinInput ? '🙈' : '👁️'}
                </button>
              </div>
              {pinStrength.level !== 'none' && (
                <div style={{
                  marginTop: '6px',
                  fontSize: '0.85rem',
                  color: pinStrength.color,
                  fontWeight: '500',
                  textAlign: 'center'
                }}>
                  PIN Strength: {pinStrength.label}
                </div>
              )}
            </div>

            <div className={styles.fieldWrapper}>
              <label className={styles.fieldLabel}>Confirm Transaction PIN</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPinInput ? "text" : "password"}
                  maxLength="4"
                  className={styles.input}
                  placeholder="••••"
                  value={confirmPin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setConfirmPin(value);
                    setPinError('');
                  }}
                  style={{
                    letterSpacing: '12px',
                    fontSize: '1.8rem',
                    textAlign: 'center',
                    transition: 'all 0.2s ease'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPinInput(!showConfirmPinInput)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '1.1rem'
                  }}
                >
                  {showConfirmPinInput ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {pinError && <p className={styles.errorUsername}>{pinError}</p>}

            <button
              className={styles['submit-button']}
              onClick={handleSetPin}
              disabled={pinLoading || pin.length !== 4 || confirmPin.length !== 4}
            >
              {pinLoading ? 'Activating Account...' : 'Activate Account & Set PIN'}
            </button>

            <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '10px', textAlign: 'center' }}>
              This PIN will be required for all transactions. Keep it secure.
            </p>
          </div>
        )} */}

        {/* Activate Account - Set Transaction PIN (Premium with Live Match) */}
        <div className={styles['accordion-item']}>
          <span className={styles.label}>Activate Account (Set Transaction PIN)</span>
          <button className={styles['toggle-button']} onClick={() => togglePanel(8)}>
            {activePanel === 8 ? '-' : '+'}
          </button>
        </div>

        {activePanel === 8 && (
          <div className={styles.form}>
            {/* PIN Field */}
            <div className={styles.fieldWrapper}>
              <label className={styles.fieldLabel}>Enter 4-Digit Transaction PIN</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPinInput ? "text" : "password"}
                  maxLength="4"
                  className={styles.input}
                  placeholder="••••"
                  value={pin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setPin(value);
                    setPinError('');
                    setPinStrength(getPinStrength(value));           // ← Fixed here
                    if (confirmPin) {
                      setPinsMatch(value === confirmPin);
                    }
                  }}
                  style={{
                    letterSpacing: pin.length > 0 ? '18px' : '12px',
                    fontSize: '1.85rem',
                    textAlign: 'center',
                    fontFamily: 'monospace',
                    transition: 'all 0.25s ease'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPinInput(!showPinInput)}
                  style={{
                    position: 'absolute',
                    right: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    fontSize: '1.3rem',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    padding: '4px'
                  }}
                >
                  {showPinInput ? '🙈' : '👁️'}
                </button>
              </div>

              {pinStrength.level && (
                <div style={{
                  marginTop: '8px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: pinStrength.color,
                  textAlign: 'center'
                }}>
                  Strength: {pinStrength.label}
                </div>
              )}
            </div>

            {/* Confirm PIN Field */}
            <div className={styles.fieldWrapper}>
              <label className={styles.fieldLabel}>Confirm Transaction PIN</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPinInput ? "text" : "password"}
                  maxLength="4"
                  className={styles.input}
                  placeholder="••••"
                  value={confirmPin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setConfirmPin(value);
                    setPinError('');
                    setPinsMatch(pin === value && value.length === 4);
                  }}
                  style={{
                    letterSpacing: confirmPin.length > 0 ? '18px' : '12px',
                    fontSize: '1.85rem',
                    textAlign: 'center',
                    fontFamily: 'monospace',
                    transition: 'all 0.25s ease'
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPinInput(!showConfirmPinInput)}
                  style={{
                    position: 'absolute',
                    right: '14px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    fontSize: '1.3rem',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    padding: '4px'
                  }}
                >
                  {showConfirmPinInput ? '🙈' : '👁️'}
                </button>
              </div>

              {confirmPin.length > 0 && (
                <div style={{
                  marginTop: '8px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  textAlign: 'center',
                  color: pinsMatch ? '#22c55e' : '#ef4444'
                }}>
                  {pinsMatch ? '✅ PINs match' : '❌ PINs do not match'}
                </div>
              )}
            </div>

            {pinError && <p className={styles.errorUsername}>{pinError}</p>}

            <button
              className={styles['submit-button']}
              onClick={handleSetPin}
              disabled={pinLoading || pin.length !== 4 || confirmPin.length !== 4 || !pinsMatch}
            >
              {pinLoading ? 'Activating Account...' : 'Activate Account & Set PIN'}
            </button>

            <p style={{
              fontSize: '0.82rem',
              color: '#94a3b8',
              marginTop: '12px',
              textAlign: 'center',
              lineHeight: '1.4'
            }}>
              This PIN will be required for all transactions.<br />
              Keep it secure and do not share it.
            </p>
          </div>
        )}


      </div>

      {/* Contacts Modal */}
      {showContactsModal && (
        <div className={styles.popupOverlay}>
          <div className={styles.popupContent} style={{ maxWidth: '500px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 className={`${styles.popupTitle} ${styles.success}`}>Secondary Contacts</h2>
              <button
                onClick={() => setShowContactsModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  color: '#ecc94b',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            {modalLoading ? (
              <p>Loading contacts...</p>
            ) : secondaryContacts.length === 0 ? (
              <p style={{ color: '#94a3b8' }}>No secondary contacts added yet.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {secondaryContacts.map((contact) => (
                  <li
                    key={contact.id}
                    style={{
                      padding: '12px 0',
                      borderBottom: '1px solid #4a5568',
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <strong>{contact.type}:</strong> {contact.value}
                    </div>
                    <span style={{ color: contact.isVerified ? '#22c55e' : '#ef4444' }}>
                      {contact.isVerified ? 'Verified' : 'Not Verified'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Secondary IDs Modal */}
      {showIdsModal && (
        <div className={styles.popupOverlay}>
          <div className={styles.popupContent} style={{ maxWidth: '500px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 className={`${styles.popupTitle} ${styles.success}`}>Secondary IDs</h2>
              <button
                onClick={() => setShowIdsModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  color: '#ecc94b',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            {modalLoading ? (
              <p>Loading IDs...</p>
            ) : secondaryIds.length === 0 ? (
              <p style={{ color: '#94a3b8' }}>No secondary IDs added yet.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {secondaryIds.map((id) => (
                  <li
                    key={id.id}
                    style={{
                      padding: '12px 0',
                      borderBottom: '1px solid #4a5568'
                    }}
                  >
                    <strong>{id.idType}</strong><br />
                    Number: {id.idNumber}<br />
                    Issued: {id.issuedCountry}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Existing success popups */}
      {showSuccessPopup && (
        <div className={styles.popupOverlay}>
          <div className={styles.popupContent}>
            <h2 className={`${styles.popupTitle} ${styles.success}`}>Username Updated Successfully!</h2>
            <p>Your new username is now: <strong>{successfulUsername}</strong></p>
            <div className={styles.popupButtonContainer}>
              <button onClick={() => setShowSuccessPopup(false)} className={`${styles.popupButton} ${styles.successButton}`}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {showIdentitySuccess && (
        <div className={styles.popupOverlay}>
          <div className={styles.popupContent}>
            <h2 className={`${styles.popupTitle} ${styles.success}`}>Identity Details Updated Successfully!</h2>
            <p>Your identity information has been saved securely.</p>
            <div className={styles.popupButtonContainer}>
              <button onClick={() => setShowIdentitySuccess(false)} className={`${styles.popupButton} ${styles.successButton}`}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {showResidenceSuccess && (
        <div className={styles.popupOverlay}>
          <div className={styles.popupContent}>
            <h2 className={`${styles.popupTitle} ${styles.success}`}>Residence Updated Successfully!</h2>
            <p>Your residence details have been saved.</p>
            <div className={styles.popupButtonContainer}>
              <button onClick={() => setShowResidenceSuccess(false)} className={`${styles.popupButton} ${styles.successButton}`}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {showContactSuccess && (
        <div className={styles.popupOverlay}>
          <div className={styles.popupContent}>
            <h2 className={`${styles.popupTitle} ${styles.success}`}>Secondary Contact Added!</h2>
            <p>The new contact has been successfully added.</p>
            <div className={styles.popupButtonContainer}>
              <button onClick={() => setShowContactSuccess(false)} className={`${styles.popupButton} ${styles.successButton}`}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {showSecondaryIdSuccess && (
        <div className={styles.popupOverlay}>
          <div className={styles.popupContent}>
            <h2 className={`${styles.popupTitle} ${styles.success}`}>Secondary ID Added!</h2>
            <p>The new identity document has been successfully added.</p>
            <div className={styles.popupButtonContainer}>
              <button onClick={() => setShowSecondaryIdSuccess(false)} className={`${styles.popupButton} ${styles.successButton}`}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {showPinSuccess && (
        <div className={styles.popupOverlay}>
          <div className={styles.popupContent}>
            <h2 className={`${styles.popupTitle} ${styles.success}`}>Account Activated Successfully!</h2>
            <p>Your transaction PIN has been set. You can now perform secure transactions.</p>
            <div className={styles.popupButtonContainer}>
              <button
                onClick={() => setShowPinSuccess(false)}
                className={`${styles.popupButton} ${styles.successButton}`}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Profile;