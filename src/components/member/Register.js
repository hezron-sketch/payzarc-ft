import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import styles from "./Register.module.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faPen,
  faCheck,
  faCamera,
  faRotateRight,
} from "@fortawesome/free-solid-svg-icons";
import axios from "axios";
import { countries } from "../../utility/countries";
import { getCurrentCountry } from "../../utility/getCurrentCountry";
import { API_URL } from "../../utility/constants";
import * as faceapi from "face-api.js";

function Register({ onBack, embedded = false, compact = false }) {
  const navigate = useNavigate();

  const namesizeMin = 3;
  const namesizeMax = 15;
  const citynamesizeMin = 3;
  const citynamesizeMax = 30;
  const phonenosize = 10;
  const emailsizeMin = 7;
  const emailsizeMax = 30;
  const confirmationcodesize = 6;

  const initialFormData = {
    firstName: "",
    middleName: "",
    surname: "",
    otherName: "",
    gender: "",
    dob: "",
    idType: "",
    idNumber: "",
    countryOfBirth: "",
    countryOfResidency: "",
    townCity: "",
    email: "",
    phone: "",
    countryCode: "",
    memberImage: "",
    emailCode: "",
    phoneCode: "",
  };

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState(initialFormData);
  const [errors, setErrors] = useState({});
  const [phoneError, setPhoneError] = useState("");
  const [resendMessage, setResendMessage] = useState("");
  const [isResendDisabled, setIsResendDisabled] = useState(false);
  const [cooldownEndTime, setCooldownEndTime] = useState(null);
  const [cameraError, setCameraError] = useState("");
  const [errorPopup, setErrorPopup] = useState("");
  const [generatedAt, setGeneratedAt] = useState(null);
  const [remainingTime, setRemainingTime] = useState(120);
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const otpRefs = useRef([]);

  // Auto-detect country
  useEffect(() => {
    const fetchCountry = async () => {
      try {
        const countryData = await getCurrentCountry(countries);
        setFormData((prev) => ({
          ...prev,
          countryOfResidency: countryData.name,
          countryCode: countryData.code,
        }));
      } catch (err) {
        console.warn("Geolocation failed");
      }
    };
    fetchCountry();
  }, []);

  const capitalizeFirstLetter = (str) => {
    if (!str || typeof str !== "string") return "";
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const validateStep = useCallback(
    (currentStep) => {
      const newErrors = {};
      const lettersOnlyRegex = /^[A-Za-z]+$/;

      switch (currentStep) {
        case 1:
          if (!formData.firstName.trim())
            newErrors.firstName = "First name is required";
          else if (
            formData.firstName.length < namesizeMin ||
            formData.firstName.length > namesizeMax
          )
            newErrors.firstName = `First name ${namesizeMin}-${namesizeMax} characters`;
          else if (!lettersOnlyRegex.test(formData.firstName))
            newErrors.firstName = "First name letters only";

          if (!formData.surname.trim())
            newErrors.surname = "Surname is required";
          else if (
            formData.surname.length < namesizeMin ||
            formData.surname.length > namesizeMax
          )
            newErrors.surname = `Surname ${namesizeMin}-${namesizeMax} characters`;
          else if (!lettersOnlyRegex.test(formData.surname))
            newErrors.surname = "Surname letters only";
          break;

        case 2:
          if (!formData.gender) newErrors.gender = "Gender required";
          if (!formData.dob) newErrors.dob = "Date of birth required";
          if (!formData.idType) newErrors.idType = "ID type required";
          if (
            !formData.idNumber ||
            formData.idNumber.length < 5 ||
            formData.idNumber.length > 11
          )
            newErrors.idNumber = "ID number must be 5–11 digits";
          break;

        case 3:
          if (!formData.countryOfBirth)
            newErrors.countryOfBirth = "Country of birth required";
          if (!formData.townCity.trim())
            newErrors.townCity = "Town/City required";
          break;

        case 4:
          if (!formData.phone || formData.phone.length !== phonenosize)
            newErrors.phone = `Phone must be ${phonenosize} digits`;
          if (
            !formData.email ||
            formData.email.length < emailsizeMin ||
            formData.email.length > emailsizeMax
          )
            newErrors.email = `Email ${emailsizeMin}-${emailsizeMax} characters`;
          break;

        case 5:
          if (!formData.memberImage) newErrors.memberImage = "Photo required";
          break;

        case 7:
          if (
            !formData.emailCode ||
            formData.emailCode.length !== confirmationcodesize
          )
            newErrors.emailCode = `Email code ${confirmationcodesize} characters`;
          if (
            !formData.phoneCode ||
            formData.phoneCode.length !== confirmationcodesize
          )
            newErrors.phoneCode = `Phone code ${confirmationcodesize} characters`;
          break;

        default:
          break;
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [formData],
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;

    if (name === "phone") {
      newValue = value.replace(/\D/g, "").slice(0, phonenosize);
    } else if (name === "idNumber") {
      newValue = value.replace(/\D/g, "").slice(0, 11);
    } else if (name === "emailCode" || name === "phoneCode") {
      newValue = value
        .replace(/[^A-Za-z0-9]/g, "")
        .slice(0, confirmationcodesize);
    }

    setFormData((prev) => ({ ...prev, [name]: newValue }));
  };

  const handleNext = async () => {
    if (validateStep(step)) {
      if (step === 6) {
        try {
          const response = await axios.post(
            `${API_URL}/api/send-verification-email`,
            {
              email: formData.email,
              fullName: formData.firstName + " " + formData.surname,
            },
          );
          setGeneratedAt(new Date(response.data.generatedAt || Date.now()));
          setRemainingTime(120);
        } catch (error) {
          setErrorPopup("Failed to send verification code. Please try again.");
          return;
        }
      }
      setStep(step + 1);
    }
  };

  const handleBack = (targetStep = step - 1) => {
    setStep(targetStep);
    setCameraError("");
    stopCamera();
  };

  const startCamera = useCallback(async () => {
    stopCamera();
    try {
      const constraints = {
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => videoRef.current?.play();
      }
      setCameraError("");
    } catch (err) {
      setCameraError("Camera access denied or unavailable.");
    }
  }, []);

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current || !isModelsLoaded) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const options = new faceapi.TinyFaceDetectorOptions({
      inputSize: 416,
      scoreThreshold: 0.5,
    });
    try {
      const detections = await faceapi.detectAllFaces(video, options);
      if (detections.length === 0) {
        setCameraError("No face detected. Please face the camera clearly.");
        return;
      }
      const imageData = canvas.toDataURL("image/png");
      setFormData((prev) => ({ ...prev, memberImage: imageData }));
      stopCamera();
    } catch (err) {
      setCameraError("Face detection failed. Please try again.");
    }
  };

  useEffect(() => {
    if (step === 5) {
      const loadModels = async () => {
        try {
          const MODEL_URL =
            "https://cdn.jsdelivr.net/gh/vladmandic/face-api/model/";
          await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
          setIsModelsLoaded(true);
        } catch (err) {
          setCameraError("Failed to load face detection model.");
        }
      };
      loadModels();
      startCamera();
    } else {
      stopCamera();
    }
  }, [step, startCamera]);

  useEffect(() => {
    if (generatedAt && step === 7) {
      const interval = setInterval(() => {
        const elapsed = Math.floor((new Date() - generatedAt) / 1000);
        const remaining = 120 - elapsed;
        setRemainingTime(remaining > 0 ? remaining : 0);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [generatedAt, step]);

  const handleSubmit = async () => {
    if (validateStep(7) && remainingTime > 0) {
      setIsSubmitting(true);
      try {
        const fullPhone = `${formData.countryCode}${formData.phone}`;
        const registrationData = { ...formData, phone: fullPhone };
        const res = await axios.post(
          `${API_URL}/api/member/register-full`,
          registrationData,
        );
        if (res.data.success) setStep(8);
        else setErrorPopup(res.data.error || "Registration failed");
      } catch (error) {
        setErrorPopup("Registration failed. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const countryOptions = countries.sort((a, b) => a.name.localeCompare(b.name));

  const StepIndicator = () => (
    <div className={styles.stepRow}>
      {[1, 2, 3, 4, 5, 6, 7].map((s) => (
        <React.Fragment key={s}>
          <div
            className={`${styles.stepDot} ${step === s ? styles.stepDotActive : step > s ? styles.stepDotCompleted : ""}`}
          >
            {step > s ? <FontAwesomeIcon icon={faCheck} /> : s}
          </div>
          {s < 7 && <div className={styles.stepLine} />}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className={`${styles.app} ${embedded ? styles.embedded : ""} ${compact ? styles.compact : ""}`}>
      <div className={`${styles.page} ${embedded ? styles.embedded : ""} ${compact ? styles.compact : ""}`}>
        {/* Left Panel */}
        <div className={styles.leftPanel}>
          <div className={styles.leftInner}>
            <h2 className={styles.leftHeadline}>
              <span className={styles.leftAccent}>PAYZARC</span>
            </h2>
            {/* <h2 className={styles.leftHeadline}>
              Join the <span className={styles.leftAccent}>Future</span> of
              Cross-Border Payments
            </h2> */}
            <p className={styles.leftSub}>
              Create an account in minutes and start sending money worldwide
              with real-time exchange rates and zero hidden fees.
            </p>
            <div className={styles.leftStats}>
              <div className={styles.stat}>
                {/* <div className={styles.statValue}>5min</div> */}
                <div className={styles.statLabel}>Setup</div>
              </div>
              <div className={styles.statDiv} />
              <div className={styles.stat}>
                <div className={styles.statValue}>100%</div>
                <div className={styles.statLabel}>Secure</div>
              </div>
              <div className={styles.statDiv} />
              <div className={styles.stat}>
                <div className={styles.statValue}>24/7</div>
                <div className={styles.statLabel}>Support</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className={styles.rightPanel}>
          <div className={styles.formCard}>
            <button
              className={`${styles.backBtn} ${embedded ? styles.hiddenWhenEmbedded : ""}`}
              onClick={onBack}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
              Home
            </button>

            <div className={styles.formHeader}>
              <h1 className={styles.formTitle} id="register-modal-title">
                Create Account
              </h1>
              <p className={styles.formSub}>
                Complete the steps to get started
              </p>
            </div>

            <StepIndicator />

            {/* Step Content */}
            <div className={styles.form}>
              {step === 1 && (
                <>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>First Name</label>
                    <input
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="Enter first name"
                      className={styles.inputField}
                    />
                    {errors.firstName && (
                      <p className={styles.inlineError}>{errors.firstName}</p>
                    )}
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Surname</label>
                    <input
                      name="surname"
                      value={formData.surname}
                      onChange={handleChange}
                      placeholder="Enter surname"
                      className={styles.inputField}
                    />
                    {errors.surname && (
                      <p className={styles.inlineError}>{errors.surname}</p>
                    )}
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>
                      Middle Name (Optional)
                    </label>
                    <input
                      name="middleName"
                      value={formData.middleName}
                      onChange={handleChange}
                      placeholder="Enter middle name"
                      className={styles.inputField}
                    />
                  </div>
                  <button onClick={handleNext} className={styles.nextButton}>
                    Next Step
                  </button>
                </>
              )}

              {step === 2 && (
                <>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Gender</label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className={styles.countrySelect}
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                    {errors.gender && (
                      <p className={styles.inlineError}>{errors.gender}</p>
                    )}
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Date of Birth</label>
                    <input
                      type="date"
                      name="dob"
                      value={formData.dob}
                      onChange={handleChange}
                      className={styles.inputField}
                    />
                    {errors.dob && (
                      <p className={styles.inlineError}>{errors.dob}</p>
                    )}
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>ID Type</label>
                    <select
                      name="idType"
                      value={formData.idType}
                      onChange={handleChange}
                      className={styles.countrySelect}
                    >
                      <option value="">Select ID Type</option>
                      <option value="Passport">Passport</option>
                      <option value="Government">Government ID</option>
                    </select>
                    {errors.idType && (
                      <p className={styles.inlineError}>{errors.idType}</p>
                    )}
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>ID Number</label>
                    <input
                      name="idNumber"
                      value={formData.idNumber}
                      onChange={handleChange}
                      placeholder="Enter ID number"
                      className={styles.inputField}
                    />
                    {errors.idNumber && (
                      <p className={styles.inlineError}>{errors.idNumber}</p>
                    )}
                  </div>
                  <div className={styles.buttonGroup}>
                    <button
                      onClick={() => handleBack(1)}
                      className={styles.backButton}
                    >
                      Back
                    </button>
                    <button onClick={handleNext} className={styles.nextButton}>
                      Next Step
                    </button>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>
                      Country of Birth
                    </label>
                    <select
                      name="countryOfBirth"
                      value={formData.countryOfBirth}
                      onChange={handleChange}
                      className={styles.countrySelect}
                    >
                      <option value="">Select Country</option>
                      {countryOptions.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.flag} {c.name}
                        </option>
                      ))}
                    </select>
                    {errors.countryOfBirth && (
                      <p className={styles.inlineError}>
                        {errors.countryOfBirth}
                      </p>
                    )}
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>
                      Town/City of Residency
                    </label>
                    <input
                      name="townCity"
                      value={formData.townCity}
                      onChange={handleChange}
                      placeholder="Enter town or city"
                      className={styles.inputField}
                    />
                    {errors.townCity && (
                      <p className={styles.inlineError}>{errors.townCity}</p>
                    )}
                  </div>
                  <div className={styles.buttonGroup}>
                    <button
                      onClick={() => handleBack(2)}
                      className={styles.backButton}
                    >
                      Back
                    </button>
                    <button onClick={handleNext} className={styles.nextButton}>
                      Next Step
                    </button>
                  </div>
                </>
              )}

              {step === 4 && (
                <>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Email Address</label>
                    <input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Enter email"
                      className={styles.inputField}
                    />
                    {errors.email && (
                      <p className={styles.inlineError}>{errors.email}</p>
                    )}
                  </div>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Phone Number</label>
                    <div className={styles.inputWrap}>
                      <span
                        style={{
                          position: "absolute",
                          left: "10px",
                          color: "#6b7280",
                          fontSize: "14px",
                        }}
                      >
                        {formData.countryCode}
                      </span>
                      <input
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="Enter phone number"
                        className={styles.inputField}
                        style={{ paddingLeft: "45px" }}
                      />
                    </div>
                    {errors.phone && (
                      <p className={styles.inlineError}>{errors.phone}</p>
                    )}
                  </div>
                  <div className={styles.buttonGroup}>
                    <button
                      onClick={() => handleBack(3)}
                      className={styles.backButton}
                    >
                      Back
                    </button>
                    <button onClick={handleNext} className={styles.nextButton}>
                      Next Step
                    </button>
                  </div>
                </>
              )}

              {step === 5 && (
                <div className={styles.captureContainer}>
                  <div className={styles.captureVideoContainer}>
                    {formData.memberImage ? (
                      <img
                        src={formData.memberImage}
                        className={styles.captureImage}
                        alt="Captured"
                      />
                    ) : (
                      <video ref={videoRef} autoPlay playsInline muted />
                    )}
                    <canvas ref={canvasRef} style={{ display: "none" }} />
                  </div>
                  {cameraError && (
                    <p className={styles.inlineError}>{cameraError}</p>
                  )}
                  <div className={styles.buttonGroup}>
                    {formData.memberImage ? (
                      <button
                        onClick={() => {
                          setFormData({ ...formData, memberImage: "" });
                          startCamera();
                        }}
                        className={styles.backButton}
                      >
                        <FontAwesomeIcon icon={faRotateRight} /> Retake
                      </button>
                    ) : (
                      <button
                        onClick={captureImage}
                        className={styles.submitBtn}
                      >
                        <FontAwesomeIcon icon={faCamera} /> Capture Face
                      </button>
                    )}
                  </div>
                  <div className={styles.buttonGroup}>
                    <button
                      onClick={() => handleBack(4)}
                      className={styles.backButton}
                    >
                      Back
                    </button>
                    <button
                      onClick={handleNext}
                      className={styles.nextButton}
                      disabled={!formData.memberImage}
                    >
                      Next Step
                    </button>
                  </div>
                </div>
              )}

              {step === 6 && (
                <div className={styles.formGroup}>
                  <h2 className={styles.formTitle} style={{ fontSize: "18px" }}>
                    Review Details
                  </h2>
                  <table className={styles.successTable}>
                    <tbody>
                      <tr>
                        <td>Name</td>
                        <td>
                          {formData.firstName} {formData.surname}
                        </td>
                      </tr>
                      <tr>
                        <td>Email</td>
                        <td>{formData.email}</td>
                      </tr>
                      <tr>
                        <td>Phone</td>
                        <td>
                          {formData.countryCode}
                          {formData.phone}
                        </td>
                      </tr>
                      <tr>
                        <td>Residency</td>
                        <td>{formData.countryOfResidency}</td>
                      </tr>
                      <tr>
                        <td>Photo</td>
                        <td>
                          <img
                            src={formData.memberImage}
                            className={styles.tableImage}
                            alt="Profile"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div className={styles.buttonGroup}>
                    <button
                      onClick={() => handleBack(5)}
                      className={styles.backButton}
                    >
                      Back
                    </button>
                    <button onClick={handleNext} className={styles.nextButton}>
                      Verify & Submit
                    </button>
                  </div>
                </div>
              )}

              {step === 7 && (
                <div style={{ textAlign: "center" }}>
                  <div
                    className={styles.otpIconWrap}
                    style={{ margin: "0 auto 1rem" }}
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#ecc94b"
                      strokeWidth="2"
                    >
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                      <polyline points="22,6 12,13 2,6" />
                    </svg>
                  </div>
                  <p className={styles.formSub}>
                    Enter the code sent to {formData.email}
                  </p>
                  <div className={styles.otpContainer}>
                    <input
                      name="emailCode"
                      value={formData.emailCode}
                      onChange={handleChange}
                      placeholder="000000"
                      className={styles.otpBox}
                      style={{ width: "100%", maxWidth: "200px" }}
                      maxLength={6}
                    />
                  </div>
                  <div className={styles.timerRow}>
                    {remainingTime > 0 ? (
                      `Code expires in ${remainingTime}s`
                    ) : (
                      <button
                        onClick={handleNext}
                        className={styles.resendButton}
                      >
                        Resend Code
                      </button>
                    )}
                  </div>
                  <div
                    className={styles.buttonGroup}
                    style={{ marginTop: "1.5rem" }}
                  >
                    <button
                      onClick={() => handleBack(6)}
                      className={styles.backButton}
                    >
                      Back
                    </button>
                    <button
                      onClick={handleSubmit}
                      className={styles.submitBtn}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <div className={styles.spinner} />
                      ) : (
                        "Complete Registration"
                      )}
                    </button>
                  </div>
                </div>
              )}

              {step === 8 && (
                <div style={{ textAlign: "center", padding: "2rem 0" }}>
                  <div
                    className={styles.otpIconWrap}
                    style={{
                      margin: "0 auto 1.5rem",
                      background: "rgba(74, 222, 128, 0.1)",
                      borderColor: "#4ade80",
                    }}
                  >
                    <FontAwesomeIcon
                      icon={faCheck}
                      style={{ color: "#4ade80", fontSize: "24px" }}
                    />
                  </div>
                  <h2 className={styles.formTitle}>Success!</h2>
                  <p className={styles.formSub}>
                    Your account has been created successfully. You can now log
                    in to your dashboard.
                  </p>
                  <button
                    onClick={() => navigate("/components/member/login")}
                    className={styles.submitBtn}
                    style={{ marginTop: "2rem" }}
                  >
                    Go to Login
                  </button>
                </div>
              )}
            </div>

            <p className={styles.loginPrompt}>
              Already have an account?{" "}
              <Link to="/components/member/login" className={styles.loginLink}>
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Error Popup */}
      {errorPopup && (
        <div className={styles.popupOverlay}>
          <div className={styles.popupContent}>
            <h2 className={styles.popupTitle} style={{ color: "#f87171" }}>
              Error
            </h2>
            <p className={styles.popupMessage}>{errorPopup}</p>
            <button
              onClick={() => setErrorPopup("")}
              className={styles.popupButton}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Register;
