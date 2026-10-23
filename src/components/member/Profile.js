import React, { useState, useEffect } from "react";
import styles from "./Profile.module.css";
import axiosInstance from "../../utility/axiosInstance";
import { djangoApis } from "../../utility/axiosInstance";
import axios from "axios";
import { countries } from "../../utility/countries";
import { CircleCheck } from "lucide-react";

const formatDate = (dateString) => {
  if (!dateString) return "Not set";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid date";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getPinStrength = (pinValue) => {
  if (!pinValue || pinValue.length === 0)
    return { level: "none", label: "", color: "" };
  if (pinValue.length < 4)
    return { level: "weak", label: "Too short", color: "#ef4444" };
  const weakPins = [
    "1234",
    "0000",
    "1111",
    "2222",
    "3333",
    "4444",
    "5555",
    "6666",
    "7777",
    "8888",
    "9999",
    "4321",
    "3456",
    "6789",
  ];
  if (weakPins.includes(pinValue) || /^(\d)\1{3}$/.test(pinValue))
    return { level: "weak", label: "Very weak", color: "#ef4444" };
  if (
    /(\d)\1{2}/.test(pinValue) ||
    /123|234|345|456|567|678|789|987|876/.test(pinValue)
  )
    return { level: "medium", label: "Medium", color: "#f59e0b" };
  return { level: "strong", label: "Strong", color: "#22c55e" };
};

function IdentityDetailsForm({ profileData, onRefreshUser, onClose }) {
  const [idType, setIdType] = useState("");
  const [idNumber, setIdNumber] = useState("");
  const [issuedCountry, setIssuedCountry] = useState("");
  const [verified, setVerified] = useState(false);
  const [issueDate, setIssueDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [alreadyVerified, setAlreadyVerified] = useState(false);

  useEffect(() => {
    if (profileData) {
      setIdType(profileData.idType || "Not set");
      setIdNumber(profileData.idNumber || "Not set");
      setIssuedCountry(profileData.issuedCountry || "Not set");
      setVerified(profileData.idVerified || false);
      setAlreadyVerified(profileData.idVerified || false);
      setIssueDate(profileData.issueDate || "");
      setExpiryDate(profileData.expiryDate || "");
    }
  }, [profileData]);

  const validateDates = () => {
    if (!issueDate || !expiryDate) return true;
    const issue = new Date(issueDate);
    const expiry = new Date(expiryDate);
    const birth = new Date(profileData?.dob);
    if (issue >= expiry) {
      setError("Expiry date must be after issue date");
      return false;
    }
    if (issue <= birth || expiry <= birth) {
      setError("Both dates must be after date of birth");
      return false;
    }
    setError("");
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (alreadyVerified) {
      setError("Identity is already verified — cannot update");
      return;
    }
    if (!validateDates()) return;
    setLoading(true);
    try {
      await axiosInstance.post("/api/update-identity-details", {
        issueDate,
        expiryDate,
      });
      setAlreadyVerified(true);
      onRefreshUser?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || "Update failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <input
        type="text"
        value={idType}
        disabled
        className={`${styles.input} ${styles.disabled}`}
        placeholder="ID Type"
      />
      <input
        type="text"
        value={idNumber}
        disabled
        className={`${styles.input} ${styles.disabled}`}
        placeholder="ID Number"
      />
      <select className={styles.input} value={issuedCountry} disabled>
        <option value="">{issuedCountry || "Not set"}</option>
      </select>
      <input
        type="text"
        value={verified ? "Verified ✓" : "Not Verified"}
        disabled
        className={`${styles.input} ${styles.disabled}`}
      />

      <div className={styles.fieldWrapper}>
        <label className={styles.fieldLabel}>Issue Date</label>
        <input
          type="date"
          value={issueDate}
          onChange={(e) => setIssueDate(e.target.value)}
          className={styles.input}
          disabled={alreadyVerified || loading}
          required
        />
      </div>
      <div className={styles.fieldWrapper}>
        <label className={styles.fieldLabel}>Expiry Date</label>
        <input
          type="date"
          value={expiryDate}
          onChange={(e) => setExpiryDate(e.target.value)}
          className={styles.input}
          disabled={alreadyVerified || loading}
          required
        />
      </div>

      {error && <p className={styles.errorUsername}>{error}</p>}
      <button
        type="submit"
        className={styles.submitButton}
        disabled={loading || alreadyVerified}
      >
        {loading
          ? "Saving…"
          : alreadyVerified
            ? "Already verified"
            : "Update identity"}
      </button>
    </form>
  );
}

function ResidenceForm({ onRefreshUser, onClose }) {
  const [addressLine, setAddressLine] = useState("");
  const [country, setCountry] = useState("Detecting…");
  const [townCity, setTownCity] = useState("Detecting…");
  const [postalCode, setPostalCode] = useState("Detecting…");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const setDefaults = () => {
      setCountry("Kenya");
      setTownCity("Nairobi");
      setPostalCode("00100");
    };
    if (!navigator.geolocation) {
      setDefaults();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude, longitude } }) => {
        try {
          const res = await axios.get(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
          );
          const addr = res.data.address || {};
          setCountry(addr.country || "Kenya");
          setTownCity(
            addr.city || addr.town || addr.village || addr.suburb || "Nairobi",
          );
          setPostalCode(addr.postcode || "00100");
        } catch {
          setDefaults();
        }
      },
      setDefaults,
    );
  }, []);

  const validate = () => {
    const errs = {};
    if (!addressLine.trim()) errs.addressLine = "Address line is required";
    else if (addressLine.length < 5) errs.addressLine = "At least 5 characters";
    else if (addressLine.length > 200) errs.addressLine = "Max 200 characters";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await axiosInstance.post("/api/update-residence", {
        country: country.trim(),
        townCity: townCity.trim(),
        postalCode: postalCode.trim(),
        addressLine: addressLine.trim(),
      });
      onRefreshUser?.();
      onClose();
    } catch (err) {
      setErrors({ server: err.response?.data?.error || "Update failed" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.fieldWrapper}>
        <label className={styles.fieldLabel}>Country (auto-detected)</label>
        <input
          type="text"
          value={country}
          disabled
          className={`${styles.input} ${styles.disabled}`}
        />
      </div>
      <div className={styles.fieldWrapper}>
        <label className={styles.fieldLabel}>Town / City</label>
        <input
          type="text"
          value={townCity}
          disabled
          className={`${styles.input} ${styles.disabled}`}
        />
      </div>
      <div className={styles.fieldWrapper}>
        <label className={styles.fieldLabel}>Postal Code</label>
        <input
          type="text"
          value={postalCode}
          disabled
          className={`${styles.input} ${styles.disabled}`}
        />
      </div>
      <div className={styles.fieldWrapper}>
        <label className={styles.fieldLabel}>Street Address</label>
        <input
          type="text"
          placeholder="e.g. 123 Langata Road, Apt 4B"
          value={addressLine}
          onChange={(e) => setAddressLine(e.target.value)}
          className={styles.input}
          required
        />
        {errors.addressLine && (
          <span className={styles.errorUsername}>{errors.addressLine}</span>
        )}
      </div>
      {errors.server && <p className={styles.errorUsername}>{errors.server}</p>}
      <button type="submit" className={styles.submitButton} disabled={loading}>
        {loading ? "Saving…" : "Update residence"}
      </button>
    </form>
  );
}

function Profile({ user, onRefreshUser }) {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [username, setUsername] = useState("");
  const [errorUsername, setErrorUsername] = useState("");
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successfulUsername, setSuccessfulUsername] = useState("");

  const [activePanel, setActivePanel] = useState(null);

  const [activeCountries, setActiveCountries] = useState([]);
  const [activeBanks, setActiveBanks] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedBank, setSelectedBank] = useState("");
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [errorFetch, setErrorFetch] = useState("");

  const [contactType, setContactType] = useState("EMAIL");
  const [contactValue, setContactValue] = useState("");
  const [contactCountryCode, setContactCountryCode] = useState("+254");
  const [contactError, setContactError] = useState("");
  const [contactLoading, setContactLoading] = useState(false);
  const [showContactSuccess, setShowContactSuccess] = useState(false);

  const [secIdType, setSecIdType] = useState("Government ID");
  const [secIdNumber, setSecIdNumber] = useState("");
  const [secIssuedCountry, setSecIssuedCountry] = useState("");
  const [secIdError, setSecIdError] = useState("");
  const [secIdLoading, setSecIdLoading] = useState(false);
  const [showSecondaryIdSuccess, setShowSecondaryIdSuccess] = useState(false);

  const [showContactsModal, setShowContactsModal] = useState(false);
  const [showIdsModal, setShowIdsModal] = useState(false);
  const [secondaryContacts, setSecondaryContacts] = useState([]);
  const [secondaryIds, setSecondaryIds] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

  const [showIdentitySuccess, setShowIdentitySuccess] = useState(false);
  const [showResidenceSuccess, setShowResidenceSuccess] = useState(false);

  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const [showPinSuccess, setShowPinSuccess] = useState(false);
  const [showPinInput, setShowPinInput] = useState(false);
  const [showConfirmPinInput, setShowConfirmPinInput] = useState(false);
  const [pinStrength, setPinStrength] = useState({
    level: "none",
    label: "",
    color: "",
  });
  const [pinsMatch, setPinsMatch] = useState(false);

  const bankAccounts = [
    { id: "1", name: "Account 1234", hasPin: true },
    { id: "2", name: "Account 5678", hasPin: false },
  ];
  const [selectedAccount, setSelectedAccount] = useState("");
  const selectedPin = bankAccounts.find((a) => a.id === selectedAccount);

  const togglePanel = (panel) =>
    setActivePanel(activePanel === panel ? null : panel);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await axiosInstance.get("/api/profile-details");
        setProfileData(res.data);
      } catch (err) {
        setError("Failed to load profile details");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    if (showContactsModal) {
      setModalLoading(true);
      axiosInstance
        .get("/api/secondary-contacts")
        .then((r) => setSecondaryContacts(r.data || []))
        .catch(() => {})
        .finally(() => setModalLoading(false));
    }
  }, [showContactsModal]);

  useEffect(() => {
    if (showIdsModal) {
      setModalLoading(true);
      axiosInstance
        .get("/api/secondary-ids")
        .then((r) => setSecondaryIds(r.data || []))
        .catch(() => {})
        .finally(() => setModalLoading(false));
    }
  }, [showIdsModal]);

  useEffect(() => {
    setLoadingCountries(true);
    axiosInstance
      .get("/api/reference/countries")
      .then((r) => setActiveCountries(r.data || []))
      .catch(() => setErrorFetch("Unable to load countries. Please try again."))
      .finally(() => setLoadingCountries(false));
  }, []);

  useEffect(() => {
    if (!selectedCountry) {
      setActiveBanks([]);
      setSelectedBank("");
      return;
    }
    setLoadingBanks(true);
    axiosInstance
      .get("/api/reference/banks", { params: { country: selectedCountry } })
      .then((r) => {
        setActiveBanks(r.data || []);
        setSelectedBank("");
      })
      .catch(() => setErrorFetch("Unable to load banks for this country."))
      .finally(() => setLoadingBanks(false));
  }, [selectedCountry]);

  const handleChangeUsername = (e) => {
    const value = e.target.value;
    setUsername(value);
    const trimmed = value.trim();
    if (!value) {
      setErrorUsername("");
      return;
    }
    if (!/^[a-zA-Z0-9 ]*$/.test(value)) {
      setErrorUsername("Letters, numbers and single spaces only");
      return;
    }
    if (trimmed.length < 3) {
      setErrorUsername("Minimum 3 characters");
      return;
    }
    if (trimmed.length > 30) {
      setErrorUsername("Maximum 30 characters");
      return;
    }
    setErrorUsername("");
  };

  const handleSubmitUsername = async () => {
    const trimmed = username.trim();
    if (trimmed.length < 3 || trimmed.length > 30) {
      setErrorUsername("Username must be 3–30 characters");
      return;
    }
    if (!/^[a-zA-Z0-9]+( [a-zA-Z0-9]+)?$/.test(trimmed)) {
      setErrorUsername("Letters, numbers, and one space only");
      return;
    }
    try {
      setErrorUsername("Updating…");
      const response = await axiosInstance.post("/api/update-username", {
        username: trimmed,
      });
      if (response.data.success) {
        setSuccessfulUsername(trimmed);
        setUsername("");
        setErrorUsername("");
        setShowSuccessPopup(true);
        onRefreshUser?.();
      }
    } catch (err) {
      setErrorUsername(
        err.response?.data?.error || "Failed to update username",
      );
    }
  };

  const handleAddContact = async () => {
    setContactError("");
    setContactLoading(true);
    let finalValue = contactValue.trim();
    if (contactType === "PHONE") {
      finalValue = finalValue.replace(/\D/g, "");
      if (finalValue.startsWith("0")) finalValue = finalValue.substring(1);
      finalValue = contactCountryCode + finalValue;
    }
    if (contactType === "EMAIL" && !/\S+@\S+\.\S+/.test(finalValue)) {
      setContactError("Please enter a valid email address");
      setContactLoading(false);
      return;
    }
    if (contactType === "PHONE" && finalValue.length < 10) {
      setContactError("Phone number is too short");
      setContactLoading(false);
      return;
    }
    try {
      await axiosInstance.post("/api/secondary-contact", {
        type: contactType,
        value: finalValue,
      });
      setShowContactSuccess(true);
      setContactValue("");
      setContactCountryCode("+254");
    } catch (err) {
      setContactError(err.response?.data?.error || "Failed to add contact");
    } finally {
      setContactLoading(false);
    }
  };

  const handleAddSecondaryId = async () => {
    setSecIdError("");
    setSecIdLoading(true);
    try {
      await axiosInstance.post("/api/secondary-id", {
        idType: secIdType.trim(),
        idNumber: secIdNumber.trim(),
        issuedCountry: secIssuedCountry.trim(),
      });
      setShowSecondaryIdSuccess(true);
      setSecIdType("Government ID");
      setSecIdNumber("");
      setSecIssuedCountry("");
    } catch (err) {
      setSecIdError(err.response?.data?.error || "Failed to add secondary ID");
    } finally {
      setSecIdLoading(false);
    }
  };

  const handleSetPin = async () => {
    setPinError("");
    setPinLoading(true);
    if (pin.length !== 4 || confirmPin.length !== 4) {
      setPinError("PIN must be exactly 4 digits");
      setPinLoading(false);
      return;
    }
    if (pin !== confirmPin) {
      setPinError("PINs do not match");
      setPinLoading(false);
      return;
    }
    const weakPins = [
      "1234",
      "0000",
      "1111",
      "2222",
      "3333",
      "4444",
      "5555",
      "6666",
      "7777",
      "8888",
      "9999",
      "4321",
      "3456",
      "6789",
    ];
    if (weakPins.includes(pin)) {
      setPinError(
        "Choose a stronger PIN — avoid obvious sequences like 1234 or 0000.",
      );
      setPinLoading(false);
      return;
    }
    if (/^(\d)\1{3}$/.test(pin)) {
      setPinError("PIN cannot be all identical digits (e.g. 1111)");
      setPinLoading(false);
      return;
    }
    try {
      const response = await djangoApis.system1.post("/api/set-pin/", { pin });
      if (response.data.success) {
        setShowPinSuccess(true);
        setPin("");
        setConfirmPin("");
        onRefreshUser?.();
      } else {
        setPinError(response.data.message || "Failed to set PIN");
      }
    } catch (err) {
      setPinError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to activate account. Please try again.",
      );
    } finally {
      setPinLoading(false);
    }
  };

  if (loading) return <div className={styles.loading}>Loading profile…</div>;
  if (error) return <div className={styles.error}>{error}</div>;

  const fullName = [
    profileData?.firstname,
    profileData?.middlename,
    profileData?.surname,
    profileData?.othernames,
  ]
    .filter(Boolean)
    .join(" ");

  const panels = [
    { id: 1, label: "Update identity details" },
    { id: 2, label: "Update residence" },
    { id: 3, label: "Update username" },
    { id: 4, label: "Bind bank account" },
    { id: 5, label: "Set account PIN" },
    { id: 6, label: "Add secondary contact" },
    { id: 7, label: "Add secondary ID" },
    { id: 8, label: "Activate account (set transaction PIN)" },
  ];

  return (
    <div className={`${styles.section} ${styles.active}`}>
      <h1 className={styles.pageTitle}>Personal Details</h1>

      <div className={styles.profileGrid}>
        <div className={styles.leftColumn}>
          {/* Bio */}
          <div className={styles.bioCard}>
            <div className={styles.avatarWrap}>
              <img
                src={profileData?.profilePicture || "/images/default-user.png"}
                className={styles.profileImage}
                alt="Profile picture"
              />
            </div>
            <div className={styles.bioDetails}>
              <p className={styles.bioName}>{fullName}</p>
              <div className={styles.fieldGrid}>
                <div className={styles.profileItem}>
                  <span className={styles.label}>Username</span>
                  <span className={styles.value}>
                    {profileData?.username || "Not set"}
                  </span>
                </div>
                <div className={styles.profileItem}>
                  <span className={styles.label}>Gender</span>
                  <span className={styles.value}>
                    {profileData?.gender || "Not set"}
                  </span>
                </div>
                <div className={styles.profileItem}>
                  <span className={styles.label}>Date of birth</span>
                  <span className={styles.value}>
                    {formatDate(profileData?.dob)}
                  </span>
                </div>
                <div className={styles.profileItem}>
                  <span className={styles.label}>Country of birth</span>
                  <span className={styles.value}>
                    {profileData?.countryOfBirth || "Not set"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Identity */}
          <div className={styles.card}>
            <p className={styles.cardTitle}>Identity</p>
            <div className={styles.fieldGrid}>
              <div className={styles.profileItem}>
                <span className={styles.label}>ID Type</span>
                <span className={styles.value}>
                  {profileData?.idType || "Not set"}
                  {profileData?.idVerified ? (
                    <span className={styles.verified}>
                      <CircleCheck size={15} />
                    </span>
                  ) : (
                    <span className={styles.notVerified}>✘ Not verified</span>
                  )}
                </span>
              </div>
              <div className={styles.profileItem}>
                <span className={styles.label}>ID Number</span>
                <span className={styles.value}>
                  {profileData?.idNumber || "Not set"}
                </span>
              </div>
              <div className={styles.profileItem}>
                <span className={styles.label}>Issued country</span>
                <span className={styles.value}>
                  {profileData?.issuedCountry || "Not set"}
                </span>
              </div>
              <div className={styles.profileItem}>
                <span className={styles.label}>Issue date</span>
                <span className={styles.value}>
                  {formatDate(profileData?.issueDate)}
                </span>
              </div>
              <div className={styles.profileItem}>
                <span className={styles.label}>Expiry date</span>
                <span className={styles.value}>
                  {formatDate(profileData?.expiryDate)}
                </span>
              </div>
            </div>
          </div>

          {/* Residence */}
          <div className={styles.card}>
            <p className={styles.cardTitle}>Residence</p>
            <div className={styles.fieldGrid}>
              <div className={styles.profileItem}>
                <span className={styles.label}>Country</span>
                <span className={styles.value}>
                  {profileData?.residenceCountry || "Not set"}
                </span>
              </div>
              <div className={styles.profileItem}>
                <span className={styles.label}>Town / City</span>
                <span className={styles.value}>
                  {profileData?.townCity || "Not set"}
                </span>
              </div>
              <div className={styles.profileItem}>
                <span className={styles.label}>Postal code</span>
                <span className={styles.value}>
                  {profileData?.postalCode || "Not set"}
                </span>
              </div>
              <div className={styles.profileItem}>
                <span className={styles.label}>Address line</span>
                <span className={styles.value}>
                  {profileData?.addressLine || "Not set"}
                </span>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className={styles.card}>
            <p className={styles.cardTitle}>Contact</p>
            <div className={styles.fieldGrid}>
              <div className={styles.profileItem}>
                <span className={styles.label}>Phone</span>
                <span className={styles.value}>
                  {profileData?.phone || "Not set"}
                  {profileData?.phoneVerified ? (
                    <span className={styles.verified}>
                      <CircleCheck size={15} />
                    </span>
                  ) : (
                    <span className={styles.notVerified}>✘</span>
                  )}
                </span>
              </div>
              <div className={styles.profileItem}>
                <span className={styles.label}>Email</span>
                <span className={styles.value}>
                  {profileData?.email || "Not set"}
                  {profileData?.emailVerified ? (
                    <span className={styles.verified}>
                      <CircleCheck size={15} />
                    </span>
                  ) : (
                    <span className={styles.notVerified}>✘</span>
                  )}
                </span>
              </div>
            </div>
            <div className={styles.moreLinkRow}>
              <button
                className={styles.moreLink}
                onClick={() => setShowContactsModal(true)}
              >
                View all contacts
              </button>
              <button
                className={styles.moreLink}
                onClick={() => setShowIdsModal(true)}
              >
                View all identity docs
              </button>
            </div>
          </div>
        </div>

        <div className={styles.rightColumn}>
          <div className={styles.accordionContainer}>
            {panels.map(({ id, label }) => (
              <React.Fragment key={id}>
                <div className={styles.accordionItem}>
                  <span className={styles.accordionLabel}>{label}</span>
                  <button
                    className={styles.toggleButton}
                    onClick={() => togglePanel(id)}
                    aria-expanded={activePanel === id}
                    aria-label={`${activePanel === id ? "Close" : "Open"} ${label}`}
                  >
                    {activePanel === id ? "−" : "+"}
                  </button>
                </div>

                {/* Panel 1: Identity details */}
                {activePanel === 1 && id === 1 && (
                  <IdentityDetailsForm
                    profileData={profileData}
                    onRefreshUser={onRefreshUser}
                    onClose={() => {
                      setActivePanel(null);
                      setShowIdentitySuccess(true);
                    }}
                  />
                )}

                {/* Panel 2: Residence */}
                {activePanel === 2 && id === 2 && (
                  <ResidenceForm
                    onRefreshUser={onRefreshUser}
                    onClose={() => {
                      setActivePanel(null);
                      setShowResidenceSuccess(true);
                    }}
                  />
                )}

                {/* Panel 3: Username */}
                {activePanel === 3 && id === 3 && (
                  <div className={styles.form}>
                    <div className={styles.fieldWrapper}>
                      <label className={styles.fieldLabel}>New username</label>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="e.g. john_doe"
                        value={username}
                        onChange={handleChangeUsername}
                        onKeyPress={(e) => {
                          if (!/[a-zA-Z0-9 ]/.test(e.key)) e.preventDefault();
                        }}
                      />
                    </div>
                    {errorUsername && (
                      <p className={styles.errorUsername}>{errorUsername}</p>
                    )}
                    <button
                      className={styles.submitButton}
                      onClick={handleSubmitUsername}
                    >
                      Save username
                    </button>
                  </div>
                )}

                {/* Panel 4: Bank account */}
                {activePanel === 4 && id === 4 && (
                  <div className={styles.form}>
                    <div className={styles.fieldWrapper}>
                      <label className={styles.fieldLabel}>Country</label>
                      <select
                        className={styles.input}
                        value={selectedCountry}
                        onChange={(e) => {
                          setSelectedCountry(e.target.value);
                          setSelectedBank("");
                        }}
                        disabled={loadingCountries}
                      >
                        <option value="">Select country</option>
                        {activeCountries.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      {loadingCountries && (
                        <p className={styles.loadingSpinner}>
                          Loading countries…
                        </p>
                      )}
                      {!loadingCountries && errorFetch && (
                        <p className={styles.errorMessage}>{errorFetch}</p>
                      )}
                      {!loadingCountries &&
                        !errorFetch &&
                        activeCountries.length === 0 && (
                          <p className={styles.errorMessage}>
                            No countries available
                          </p>
                        )}
                    </div>
                    <div className={styles.fieldWrapper}>
                      <label className={styles.fieldLabel}>Bank</label>
                      <select
                        className={styles.input}
                        value={selectedBank}
                        onChange={(e) => setSelectedBank(e.target.value)}
                        disabled={
                          !selectedCountry ||
                          loadingBanks ||
                          activeBanks.length === 0
                        }
                      >
                        <option value="">Select bank</option>
                        {activeBanks.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                      {loadingBanks && selectedCountry && (
                        <p className={styles.loadingSpinner}>Loading banks…</p>
                      )}
                      {!loadingBanks &&
                        selectedCountry &&
                        activeBanks.length === 0 &&
                        !errorFetch && (
                          <p className={styles.errorMessage}>
                            No banks found for selected country
                          </p>
                        )}
                    </div>
                    <div className={styles.fieldWrapper}>
                      <label className={styles.fieldLabel}>
                        Account number
                      </label>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="e.g. 1234567890"
                      />
                    </div>
                    <div className={styles.fieldWrapper}>
                      <label className={styles.fieldLabel}>
                        Account name (as in bank)
                      </label>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="e.g. Jane Kamau"
                      />
                    </div>
                    <button
                      type="button"
                      className={styles.submitButton}
                      disabled={!selectedCountry || !selectedBank}
                    >
                      Bind bank account
                    </button>
                  </div>
                )}

                {/* Panel 5: Set account PIN */}
                {activePanel === 5 && id === 5 && (
                  <div className={styles.form}>
                    <div className={styles.fieldWrapper}>
                      <label className={styles.fieldLabel}>
                        Select bank account
                      </label>
                      <select
                        className={styles.input}
                        value={selectedAccount}
                        onChange={(e) => setSelectedAccount(e.target.value)}
                      >
                        <option value="">Choose account</option>
                        {bankAccounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {selectedAccount && selectedPin && (
                      <>
                        {selectedPin.hasPin && (
                          <div className={styles.fieldWrapper}>
                            <label className={styles.fieldLabel}>
                              Current PIN
                            </label>
                            <input
                              type="password"
                              className={styles.input}
                              placeholder="••••"
                              maxLength={4}
                            />
                          </div>
                        )}
                        <div className={styles.fieldWrapper}>
                          <label className={styles.fieldLabel}>New PIN</label>
                          <input
                            type="password"
                            className={styles.input}
                            placeholder="••••"
                            maxLength={4}
                          />
                        </div>
                        <div className={styles.fieldWrapper}>
                          <label className={styles.fieldLabel}>
                            Confirm new PIN
                          </label>
                          <input
                            type="password"
                            className={styles.input}
                            placeholder="••••"
                            maxLength={4}
                          />
                        </div>
                        <button className={styles.submitButton}>
                          {selectedPin.hasPin ? "Update PIN" : "Set PIN"}
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Panel 6: Secondary contact */}
                {activePanel === 6 && id === 6 && (
                  <div className={styles.form}>
                    <div className={styles.fieldWrapper}>
                      <label className={styles.fieldLabel}>Contact type</label>
                      <select
                        className={styles.input}
                        value={contactType}
                        onChange={(e) => {
                          setContactType(e.target.value);
                          setContactError("");
                        }}
                      >
                        <option value="EMAIL">Email</option>
                        <option value="PHONE">Phone</option>
                      </select>
                    </div>
                    {contactType === "PHONE" && (
                      <div className={styles.fieldWrapper}>
                        <label className={styles.fieldLabel}>
                          Country code
                        </label>
                        <select
                          className={styles.input}
                          value={contactCountryCode}
                          onChange={(e) =>
                            setContactCountryCode(e.target.value)
                          }
                        >
                          {countries.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.flag} {c.name} ({c.code})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <div className={styles.fieldWrapper}>
                      <label className={styles.fieldLabel}>
                        {contactType === "EMAIL"
                          ? "Email address"
                          : "Phone number"}
                      </label>
                      <input
                        type={contactType === "EMAIL" ? "email" : "tel"}
                        className={styles.input}
                        placeholder={
                          contactType === "EMAIL"
                            ? "name@example.com"
                            : "0711 223 334"
                        }
                        value={contactValue}
                        onChange={(e) => {
                          setContactValue(e.target.value);
                          setContactError("");
                        }}
                      />
                    </div>
                    {contactError && (
                      <p className={styles.errorUsername}>{contactError}</p>
                    )}
                    <button
                      className={styles.submitButton}
                      onClick={handleAddContact}
                      disabled={contactLoading}
                    >
                      {contactLoading ? "Adding…" : "Add contact"}
                    </button>
                  </div>
                )}

                {/* Panel 7: Secondary ID */}
                {activePanel === 7 && id === 7 && (
                  <div className={styles.form}>
                    <div className={styles.fieldWrapper}>
                      <label className={styles.fieldLabel}>ID type</label>
                      <select
                        className={styles.input}
                        value={secIdType}
                        onChange={(e) => setSecIdType(e.target.value)}
                      >
                        <option value="Government ID">Government ID</option>
                        <option value="Passport">Passport</option>
                        <option value="Military ID">Military ID</option>
                      </select>
                    </div>
                    <div className={styles.fieldWrapper}>
                      <label className={styles.fieldLabel}>ID number</label>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="Enter ID number"
                        value={secIdNumber}
                        onChange={(e) => setSecIdNumber(e.target.value)}
                      />
                    </div>
                    <div className={styles.fieldWrapper}>
                      <label className={styles.fieldLabel}>
                        Issued country
                      </label>
                      <select
                        className={styles.input}
                        value={secIssuedCountry}
                        onChange={(e) => setSecIssuedCountry(e.target.value)}
                      >
                        <option value="">Select country</option>
                        {countries.map((c) => (
                          <option key={c.name} value={c.name}>
                            {c.flag} {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    {secIdError && (
                      <p className={styles.errorUsername}>{secIdError}</p>
                    )}
                    <button
                      className={styles.submitButton}
                      onClick={handleAddSecondaryId}
                      disabled={secIdLoading}
                    >
                      {secIdLoading ? "Adding…" : "Add secondary ID"}
                    </button>
                  </div>
                )}

                {/* Panel 8: Transaction PIN */}
                {activePanel === 8 && id === 8 && (
                  <div className={styles.form}>
                    <div className={styles.fieldWrapper}>
                      <label className={styles.fieldLabel}>
                        Enter 4-digit transaction PIN
                      </label>
                      <div className={styles.pinInputWrap}>
                        <input
                          type={showPinInput ? "text" : "password"}
                          maxLength={4}
                          className={styles.input}
                          placeholder="••••"
                          value={pin}
                          onChange={(e) => {
                            const val = e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 4);
                            setPin(val);
                            setPinError("");
                            setPinStrength(getPinStrength(val));
                            if (confirmPin)
                              setPinsMatch(
                                val === confirmPin && val.length === 4,
                              );
                          }}
                          style={{
                            letterSpacing: pin.length > 0 ? "16px" : "6px",
                            fontSize: "1.6rem",
                            textAlign: "center",
                            fontFamily: "monospace",
                          }}
                        />
                        <button
                          type="button"
                          className={styles.eyeToggle}
                          onClick={() => setShowPinInput(!showPinInput)}
                        >
                          {showPinInput ? "🙈" : "👁️"}
                        </button>
                      </div>
                      {pinStrength.level !== "none" && (
                        <p
                          className={styles.pinMeta}
                          style={{ color: pinStrength.color }}
                        >
                          Strength: {pinStrength.label}
                        </p>
                      )}
                    </div>
                    <div className={styles.fieldWrapper}>
                      <label className={styles.fieldLabel}>Confirm PIN</label>
                      <div className={styles.pinInputWrap}>
                        <input
                          type={showConfirmPinInput ? "text" : "password"}
                          maxLength={4}
                          className={styles.input}
                          placeholder="••••"
                          value={confirmPin}
                          onChange={(e) => {
                            const val = e.target.value
                              .replace(/\D/g, "")
                              .slice(0, 4);
                            setConfirmPin(val);
                            setPinError("");
                            setPinsMatch(pin === val && val.length === 4);
                          }}
                          style={{
                            letterSpacing:
                              confirmPin.length > 0 ? "16px" : "6px",
                            fontSize: "1.6rem",
                            textAlign: "center",
                            fontFamily: "monospace",
                          }}
                        />
                        <button
                          type="button"
                          className={styles.eyeToggle}
                          onClick={() =>
                            setShowConfirmPinInput(!showConfirmPinInput)
                          }
                        >
                          {showConfirmPinInput ? "🙈" : "👁️"}
                        </button>
                      </div>
                      {confirmPin.length > 0 && (
                        <p
                          className={styles.pinMeta}
                          style={{ color: pinsMatch ? "#22c55e" : "#ef4444" }}
                        >
                          {pinsMatch ? "✅ PINs match" : "❌ PINs do not match"}
                        </p>
                      )}
                    </div>
                    {pinError && (
                      <p className={styles.errorUsername}>{pinError}</p>
                    )}
                    <button
                      className={styles.submitButton}
                      onClick={handleSetPin}
                      disabled={
                        pinLoading ||
                        pin.length !== 4 ||
                        confirmPin.length !== 4 ||
                        !pinsMatch
                      }
                    >
                      {pinLoading
                        ? "Activating…"
                        : "Activate account & set PIN"}
                    </button>
                    <p className={styles.pinNote}>
                      This PIN is required for all transactions. Keep it secure.
                    </p>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      {showContactsModal && (
        <div
          className={styles.popupOverlay}
          onClick={(e) =>
            e.target === e.currentTarget && setShowContactsModal(false)
          }
        >
          <div className={styles.popupContent}>
            <div className={styles.popupHeader}>
              <h2 className={`${styles.popupTitle} ${styles.success}`}>
                Secondary contacts
              </h2>
              <button
                className={styles.popupClose}
                onClick={() => setShowContactsModal(false)}
              >
                ✕
              </button>
            </div>
            {modalLoading ? (
              <p className={styles.loadingSpinner}>Loading…</p>
            ) : secondaryContacts.length === 0 ? (
              <p style={{ color: "var(--text-muted)", textAlign: "center" }}>
                No secondary contacts added yet.
              </p>
            ) : (
              <ul className={styles.modalList}>
                {secondaryContacts.map((c) => (
                  <li key={c.id} className={styles.modalListItem}>
                    <span>
                      <strong>{c.type}:</strong> {c.value}
                    </span>
                    <span
                      style={{
                        color: c.isVerified ? "#22c55e" : "#ef4444",
                        fontWeight: 600,
                        fontSize: "0.8rem",
                      }}
                    >
                      {c.isVerified ? "Verified" : "Not verified"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {showIdsModal && (
        <div
          className={styles.popupOverlay}
          onClick={(e) =>
            e.target === e.currentTarget && setShowIdsModal(false)
          }
        >
          <div className={styles.popupContent}>
            <div className={styles.popupHeader}>
              <h2 className={`${styles.popupTitle} ${styles.success}`}>
                Secondary IDs
              </h2>
              <button
                className={styles.popupClose}
                onClick={() => setShowIdsModal(false)}
              >
                ✕
              </button>
            </div>
            {modalLoading ? (
              <p className={styles.loadingSpinner}>Loading…</p>
            ) : secondaryIds.length === 0 ? (
              <p style={{ color: "var(--text-muted)", textAlign: "center" }}>
                No secondary IDs added yet.
              </p>
            ) : (
              <ul className={styles.modalList}>
                {secondaryIds.map((id) => (
                  <li
                    key={id.id}
                    className={styles.modalListItem}
                    style={{
                      flexDirection: "column",
                      alignItems: "flex-start",
                    }}
                  >
                    <strong>{id.idType}</strong>
                    <span>Number: {id.idNumber}</span>
                    <span>Issued: {id.issuedCountry}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {[
        {
          show: showSuccessPopup,
          onClose: () => setShowSuccessPopup(false),
          title: "Username updated!",
          message: (
            <>
              Your new username is <strong>{successfulUsername}</strong>.
            </>
          ),
        },
        {
          show: showIdentitySuccess,
          onClose: () => setShowIdentitySuccess(false),
          title: "Identity updated!",
          message: "Your identity details have been saved securely.",
        },
        {
          show: showResidenceSuccess,
          onClose: () => setShowResidenceSuccess(false),
          title: "Residence updated!",
          message: "Your residence details have been saved.",
        },
        {
          show: showContactSuccess,
          onClose: () => setShowContactSuccess(false),
          title: "Contact added!",
          message: "The new contact has been successfully added.",
        },
        {
          show: showSecondaryIdSuccess,
          onClose: () => setShowSecondaryIdSuccess(false),
          title: "ID added!",
          message: "The identity document has been successfully added.",
        },
        {
          show: showPinSuccess,
          onClose: () => setShowPinSuccess(false),
          title: "Account activated!",
          message:
            "Your transaction PIN is set. You can now perform secure transactions.",
        },
      ].map(({ show, onClose, title, message }, i) =>
        show ? (
          <div key={i} className={styles.popupOverlay}>
            <div className={styles.popupContent}>
              <h2 className={`${styles.popupTitle} ${styles.success}`}>
                {title}
              </h2>
              <p className={styles.popupMessage}>{message}</p>
              <div className={styles.popupButtonContainer}>
                <button
                  onClick={onClose}
                  className={`${styles.popupButton} ${styles.successButton}`}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        ) : null,
      )}
    </div>
  );
}

export default Profile;
