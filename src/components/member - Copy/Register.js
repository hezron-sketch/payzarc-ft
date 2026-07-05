// src/components/member/Register.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Register.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faPen } from '@fortawesome/free-solid-svg-icons';
import axios from 'axios';
import { countries } from '../../utility/countries';
import { getCurrentCountry } from '../../utility/getCurrentCountry';
import { API_URL } from '../../utility/constants';
import * as faceapi from 'face-api.js';

function Register({ onBack }) {
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

  // Auto-detect country
  useEffect(() => {
    const fetchCountry = async () => {
      try {
        const countryData = await getCurrentCountry(countries);
        setFormData(prev => ({
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

  const validateStep = useCallback((currentStep) => {
    const newErrors = {};
    const lettersOnlyRegex = /^[A-Za-z]+$/;

    switch (currentStep) {
      case 1: // Names
        if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
        else if (formData.firstName.length < namesizeMin || formData.firstName.length > namesizeMax)
          newErrors.firstName = `First name ${namesizeMin}-${namesizeMax} characters`;
        else if (!lettersOnlyRegex.test(formData.firstName))
          newErrors.firstName = "First name letters only";

        if (!formData.surname.trim()) newErrors.surname = "Surname is required";
        else if (formData.surname.length < namesizeMin || formData.surname.length > namesizeMax)
          newErrors.surname = `Surname ${namesizeMin}-${namesizeMax} characters`;
        else if (!lettersOnlyRegex.test(formData.surname))
          newErrors.surname = "Surname letters only";

        if (formData.middleName.trim() && !lettersOnlyRegex.test(formData.middleName.trim()))
          newErrors.middleName = "Middle name letters only";

        if (formData.otherName.trim() && !lettersOnlyRegex.test(formData.otherName.trim()))
          newErrors.otherName = "Other name letters only";

        break;

      case 2: // Gender, DOB, ID
        if (!formData.gender) newErrors.gender = "Gender required";
        if (!formData.dob) newErrors.dob = "Date of birth required";
        if (!formData.idType) newErrors.idType = "ID type required";
        if (!formData.idNumber || formData.idNumber.length < 5 || formData.idNumber.length > 11)
          newErrors.idNumber = "ID number must be 5–11 digits";

        break;

      case 3: // Countries & Town
        if (!formData.countryOfBirth) newErrors.countryOfBirth = "Country of birth required";
        if (!formData.townCity.trim()) newErrors.townCity = "Town/City required";
        else if (formData.townCity.trim().length < citynamesizeMin || formData.townCity.trim().length > citynamesizeMax)
          newErrors.townCity = `Town/City ${citynamesizeMin}-${citynamesizeMax} characters`;

        break;

      case 4: // Contact
        if (!formData.phone || formData.phone.length !== phonenosize)
          newErrors.phone = `Phone must be ${phonenosize} digits`;
        if (!formData.email || formData.email.length < emailsizeMin || formData.email.length > emailsizeMax)
          newErrors.email = `Email ${emailsizeMin}-${emailsizeMax} characters`;

        break;

      case 5: // Photo
        if (!formData.memberImage) newErrors.memberImage = "Photo required";
        break;

      case 7: // OTP
        if (!formData.emailCode || formData.emailCode.length !== confirmationcodesize)
          newErrors.emailCode = `Email code ${confirmationcodesize} characters`;
        if (!formData.phoneCode || formData.phoneCode.length !== confirmationcodesize)
          newErrors.phoneCode = `Phone code ${confirmationcodesize} characters`;

        break;

      default:
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  useEffect(() => {
    validateStep(step);
  }, [step, formData, validateStep]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;

    if (name === "phone") {
      newValue = value.replace(/\D/g, "").slice(0, phonenosize);
      setPhoneError(newValue.length === phonenosize ? "" : `Phone must be ${phonenosize} digits`);
    } else if (name === "idNumber") {
      newValue = value.replace(/\D/g, "").slice(0, 11);
    } else if (name === "emailCode" || name === "phoneCode") {
      newValue = value.replace(/[^A-Za-z0-9]/g, "").slice(0, confirmationcodesize);
    }

    setFormData(prev => ({ ...prev, [name]: newValue }));
  };

  const compressImage = (base64) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = (MAX_WIDTH / width) * height;
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Reduce quality to ~70%
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
    });
  };

  const handleNext = async () => {
    if (validateStep(step)) {
      if (step === 6) {
        // === SEND OTP AUTOMATICALLY WHEN GOING TO VERIFICATION STEP ===
        try {
          const response = await axios.post(`${API_URL}/api/send-verification-email`, {
            email: formData.email,
            fullName: formData.firstName + " " + formData.surname,
          });
          setGeneratedAt(new Date(response.data.generatedAt || Date.now()));
          setRemainingTime(120);
          setResendMessage("Verification code sent!");
        } catch (error) {
          setErrorPopup("Failed to send verification code. Please try again.");
          return; // Don't proceed to step 7
        }
      }
      setStep(step + 1);
    }
  };


  const handleBack = (targetStep = step - 1) => {
    setStep(targetStep);
    setPhoneError("");
    setResendMessage("");
    setIsResendDisabled(false);
    setCooldownEndTime(null);
    stopCamera();
  };

  // Camera functions
  const startCamera = useCallback(async () => {
    stopCamera();
    try {
      const constraints = {
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
        };
      }
      setCameraError("");
    } catch (err) {
      let message = "Camera access denied or unavailable.";
      if (err.name === "NotAllowedError") {
        message = "Camera permission denied. Please enable camera access and refresh.";
      } else if (err.name === "NotFoundError") {
        message = "No camera found on this device.";
      }
      setCameraError(message);
    }
  }, []);

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current || !isModelsLoaded) {
      setCameraError("Camera or face detection not ready.");
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Ensure video has valid dimensions
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setCameraError("Camera not ready yet. Please wait.");
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const options = new faceapi.TinyFaceDetectorOptions({
      inputSize: 416,
      scoreThreshold: 0.5,
    });

    try {
      const detections = await faceapi.detectAllFaces(video, options); // Use live video for better reliability

      if (detections.length === 0) {
        setCameraError("No face detected. Please face the camera clearly.");
        return;
      }

      if (detections.length > 1) {
        setCameraError("Multiple faces detected. Please ensure only one person is in frame.");
        return;
      }

      // Optional: Ensure face is large enough
      const box = detections[0].box;
      const minSize = Math.min(video.videoWidth, video.videoHeight) * 0.4;
      if (box.width < minSize || box.height < minSize) {
        setCameraError("Face too far. Please move closer.");
        return;
      }

      const imageData = canvas.toDataURL("image/png");
      setFormData(prev => ({ ...prev, memberImage: imageData }));
      setCameraError("");
      stopCamera();
    } catch (err) {
      console.error("Face detection error:", err);
      setCameraError("Face detection failed. Please try again.");
    }
  };




  useEffect(() => {
    if (step === 5) {
      setFormData(prev => ({ ...prev, memberImage: "" }));
      setCameraError("");
      setIsModelsLoaded(false);
      const loadModels = async () => {
        try {
          const MODEL_URL = "https://cdn.jsdelivr.net/gh/vladmandic/face-api/model/";
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

  // OTP timer
  useEffect(() => {
    if (generatedAt && step === 7) {
      const calculateRemaining = () => {
        const elapsed = Math.floor((new Date() - generatedAt) / 1000);
        const remaining = 120 - elapsed;
        setRemainingTime(remaining > 0 ? remaining : 0);
      };
      calculateRemaining();
      const interval = setInterval(calculateRemaining, 1000);
      return () => clearInterval(interval);
    }
  }, [generatedAt, step]);

  // Resend OTP
  const handleResend = async () => {
    setIsResendDisabled(true);
    const endTime = Date.now() + 120000;
    setCooldownEndTime(endTime);
    try {
      const response = await axios.post(`${API_URL}/api/send-verification-email`, {
        email: formData.email,
        fullName: formData.firstName + " " + formData.surname,
      });
      setGeneratedAt(new Date(response.data.generatedAt));
      setRemainingTime(120);
      setResendMessage("Verification code resent.");
    } catch (error) {
      setErrorPopup("Failed to resend code.");
    }
    setTimeout(() => setResendMessage(""), 5000);
  };

  const handleSubmit = async () => {
    if (validateStep(7) && remainingTime > 0) {
      setIsSubmitting(true);
      try {

        const payload = {
          email: formData.email.trim().toLowerCase(),
          emailCode: formData.emailCode?.trim(),
          phoneCode: formData.phoneCode?.trim()
        };

        console.log("=== OTP VERIFICATION PAYLOAD BEING SENT ===");
        console.log(JSON.stringify(payload, null, 2));
        // Step 1: Verify OTP
        const verifyResponse = await axios.post(`${API_URL}/api/verify-email-code`, {
          email: formData.email.trim().toLowerCase(),
          emailCode: formData.emailCode?.trim(),
          phoneCode: formData.phoneCode?.trim(),
        });
        console.log("Verify response:", verifyResponse.data);

        if (verifyResponse.data.result !== "valid") {
          setErrorPopup(verifyResponse.data.error || "Invalid or expired code");
          setIsSubmitting(false);
          return;
        }

        // Step 2: Compress image to prevent huge payload
        let memberImage = null;
        if (formData.memberImage) {
          try {
            const img = new Image();
            img.src = formData.memberImage;
            await new Promise((resolve) => { img.onload = resolve; });

            const canvas = document.createElement('canvas');
            const MAX_SIZE = 800;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_SIZE) {
                height = (MAX_SIZE / width) * height;
                width = MAX_SIZE;
              }
            } else {
              if (height > MAX_SIZE) {
                width = (MAX_SIZE / height) * width;
                height = MAX_SIZE;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            memberImage = canvas.toDataURL('image/jpeg', 0.8); // JPEG, 80% quality
          } catch (e) {
            console.warn("Image compression failed:", e);
            memberImage = formData.memberImage; // fallback
          }
        }

        // Step 3: Send registration data
        const fullPhone = formData.countryCode + formData.phone.replace(/^0+/, '');
        const registrationData = {
          firstName: formData.firstName,
          middleName: formData.middleName || "",
          surname: formData.surname,
          otherName: formData.otherName || "",
          gender: formData.gender,
          dob: formData.dob,
          idType: formData.idType,
          idNumber: formData.idNumber,
          countryOfBirth: formData.countryOfBirth,
          countryOfResidency: formData.countryOfResidency,
          townCity: formData.townCity,
          email: formData.email,
          phone: fullPhone,
          memberImage: memberImage,
        };

        console.log("Sending registration data:", registrationData); // ← DEBUG: remove later

        const registerResponse = await axios.post(
          `${API_URL}/api/member/register-full`,
          registrationData,
          { timeout: 30000 } // 30 second timeout
        );

        console.log("Registration response:", registerResponse.data); // ← DEBUG

        if (registerResponse.data.success) {
          setStep(8);
        } else {
          setErrorPopup(registerResponse.data.error || "Registration failed on server");
        }

      } catch (error) {
        console.error("Full registration error:", error);

        if (error.response) {
          // Server responded with error status
          setErrorPopup(error.response.data?.error || `Server error: ${error.response.status}`);
        } else if (error.request) {
          // No response received
          setErrorPopup("No response from server. Check if backend is running.");
        } else {
          // Other error
          setErrorPopup("Request failed: " + error.message);
        }
      } finally {
        setIsSubmitting(false);
      }
    } else if (remainingTime <= 0) {
      setErrorPopup("Code expired. Click resend to get a new one.");
    }
  };

  const countryOptions = countries.sort((a, b) => a.name.localeCompare(b.name));

  // Dynamic placeholders
  const getIdPlaceholder = () => {
    if (formData.idType === "Passport") return "Enter Passport Number (5-11 characters)";
    return "Enter ID Number (5-11 digits)";
  };

  const getPhonePlaceholder = () => {
    if (!formData.countryOfResidency) return "Phone Number";
    return `Phone no. for ${formData.countryOfResidency}`;
  };

  return (
    <div className={styles.appContainer}>
      <div className={styles.formStep}>
        <img src="/images/payzarc.png" alt="Payzarc" className={styles.appLogo} />

        {/* Error Popup */}
        {errorPopup && (
          <div className={styles.popupOverlay}>
            <div className={styles.popupContent}>
              <h2 className={`${styles.popupTitle} ${styles.error}`}>Error</h2>
              <p className={styles.popupMessage}>{errorPopup}</p>
              <div className={styles.popupButtonContainer}>
                <button onClick={() => setErrorPopup("")} className={`${styles.popupButton} ${styles.errorButton}`}>
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Names */}
        {step === 1 && (
          <div className={styles.formGroup}>
            <h2 className={styles.stepTitle}>Step 1: Names</h2>
            <div className={styles.inputWrapper}>
              <label className={styles.inputLabel}>First Name (Required)</label>
              <input name="firstName" value={formData.firstName} onChange={handleChange} placeholder="First Name" className={styles.inputField} required />
              {errors.firstName && <p className={styles.errorMessage}>{errors.firstName}</p>}
            </div>
            <div className={styles.inputWrapper}>
              <label className={styles.inputLabel}>Middle Name (Optional)</label>
              <input name="middleName" value={formData.middleName} onChange={handleChange} placeholder="Middle Name" className={styles.inputField} />
            </div>
            <div className={styles.inputWrapper}>
              <label className={styles.inputLabel}>Surname (Required)</label>
              <input name="surname" value={formData.surname} onChange={handleChange} placeholder="Surname" className={styles.inputField} required />
              {errors.surname && <p className={styles.errorMessage}>{errors.surname}</p>}
            </div>
            <div className={styles.inputWrapper}>
              <label className={styles.inputLabel}>Other Name (Optional)</label>
              <input name="otherName" value={formData.otherName} onChange={handleChange} placeholder="Other Name" className={styles.inputField} />
            </div>
            <div className={styles.buttonGroup}>
              <button onClick={handleNext} className={styles.nextButton} disabled={Object.keys(errors).length > 0}>
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Gender, DOB, ID */}
        {step === 2 && (
          <div className={styles.formGroup}>
            <h2 className={styles.stepTitle}>Step 2: Gender, DOB & ID</h2>
            <div className={styles.inputWrapper}>
              <label className={styles.inputLabel}>Gender (Required)</label>
              <select name="gender" value={formData.gender} onChange={handleChange} className={styles.countrySelect} required>
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
              {errors.gender && <p className={styles.errorMessage}>{errors.gender}</p>}
            </div>
            <div className={styles.inputWrapper}>
              <label className={styles.inputLabel}>Date of Birth (Required)</label>
              <input type="date" name="dob" value={formData.dob} onChange={handleChange} className={styles.inputField} required
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]} />
              {errors.dob && <p className={styles.errorMessage}>{errors.dob}</p>}
            </div>
            <div className={styles.inputWrapper}>
              <label className={styles.inputLabel}>ID Type (Required)</label>
              <select name="idType" value={formData.idType} onChange={handleChange} className={styles.countrySelect} required>
                <option value="">Select ID Type</option>
                <option value="Passport">Passport</option>
                <option value="Military">Military</option>
                <option value="Government">Government</option>
              </select>
              {errors.idType && <p className={styles.errorMessage}>{errors.idType}</p>}
            </div>
            <div className={styles.inputWrapper}>
              <label className={styles.inputLabel}>ID Number (Required, 5-11 digits)</label>
              <input name="idNumber" value={formData.idNumber} onChange={handleChange} placeholder={getIdPlaceholder()} className={styles.inputField} required />
              {errors.idNumber && <p className={styles.errorMessage}>{errors.idNumber}</p>}
            </div>
            <div className={styles.buttonGroup}>
              <button onClick={() => handleBack(1)} className={styles.backButton}>Back</button>
              <button onClick={handleNext} className={styles.nextButton} disabled={Object.keys(errors).length > 0}>Next</button>
            </div>
          </div>
        )}

        {/* Step 3: Countries & Town */}
        {step === 3 && (
          <div className={styles.formGroup}>
            <h2 className={styles.stepTitle}>Step 3: Origin and Residency</h2>
            <div className={styles.inputWrapper}>
              <label className={styles.inputLabel}>Country of Birth (Required)</label>
              <select name="countryOfBirth" value={formData.countryOfBirth} onChange={handleChange} className={styles.countrySelect} required>
                <option value="">Select Country</option>
                {countryOptions.map(c => (
                  <option key={c.name} value={c.name}>
                    {c.flag} {c.name} ({c.code})
                  </option>
                ))}
              </select>
              {errors.countryOfBirth && <p className={styles.errorMessage}>{errors.countryOfBirth}</p>}
            </div>
            <div className={styles.inputWrapper}>
              <label className={styles.inputLabel}>Country of Residency (Detected)</label>
              <select value={formData.countryOfResidency} disabled className={styles.countrySelect}>
                <option>{formData.countryOfResidency || "Detecting..."}</option>
              </select>
            </div>
            <div className={styles.inputWrapper}>
              <label className={styles.inputLabel}>Town/City of Residency (Required)</label>
              <input name="townCity" value={capitalizeFirstLetter(formData.townCity)} onChange={handleChange} placeholder="Town/City" className={styles.inputField} required />
              {errors.townCity && <p className={styles.errorMessage}>{errors.townCity}</p>}
            </div>
            <div className={styles.buttonGroup}>
              <button onClick={() => handleBack(2)} className={styles.backButton}>Back</button>
              <button onClick={handleNext} className={styles.nextButton} disabled={Object.keys(errors).length > 0}>Next</button>
            </div>
          </div>
        )}

        {/* Step 4: Contact Details */}
        {step === 4 && (
          <div className={styles.formGroup}>
            <h2 className={styles.stepTitle}>Step 4: Contact Details</h2>
            <div className={styles.inputWrapper}>
              <label className={styles.inputLabel}>Country Code (Detected)</label>
              <select value={formData.countryCode} disabled className={styles.countrySelect}>
                <option>{formData.countryCode || "Detecting..."}</option>
              </select>
            </div>
            <div className={styles.inputWrapper}>
              <label className={styles.inputLabel}>Phone Number (Required)</label>
              <input name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder={getPhonePlaceholder()} className={styles.inputField} maxLength={phonenosize} required />
              {(phoneError || errors.phone) && <p className={styles.errorMessage}>{phoneError || errors.phone}</p>}
            </div>
            <div className={styles.inputWrapper}>
              <label className={styles.inputLabel}>Email (Required)</label>
              <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="Email" className={styles.inputField} required />
              {errors.email && <p className={styles.errorMessage}>{errors.email}</p>}
            </div>
            <div className={styles.buttonGroup}>
              <button onClick={() => handleBack(3)} className={styles.backButton}>Back</button>
              <button onClick={handleNext} className={styles.nextButton} disabled={Object.keys(errors).length > 0}>Next</button>
            </div>
          </div>
        )}

        {/* Step 5: Capture Photo */}
        {step === 5 && (
          <div className={styles.captureContainer}>
            <div className={styles.captureCard}>
              <h2 className={styles.captureTitle}>Step 5: Capture Your Photo</h2>
              <div className={styles.captureWrapper}>
                {formData.memberImage ? (
                  <>
                    <img src={formData.memberImage} alt="Captured photo" className={styles.capturePreview} />
                    <div className={styles.captureActionButtons}>
                      <button
                        onClick={() => {
                          setFormData(prev => ({ ...prev, memberImage: "" }));
                          setCameraError("");
                          startCamera();
                        }}
                        className={styles.captureRetakeButton}
                      >
                        Retake Photo
                      </button>
                      <button onClick={handleNext} className={styles.captureConfirmButton}>
                        Confirm & Continue
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Loading, Error, or Live Camera */}
                    {!isModelsLoaded ? (
                      <p className={styles.captureLoadingModels}>
                        Initializing camera and face detection...
                      </p>
                    ) : cameraError ? (
                      <div className={styles.captureErrorMessage}>
                        <p>{cameraError}</p>
                        <button onClick={startCamera} className={styles.captureRetryButton}>
                          Retry Camera
                        </button>
                      </div>
                    ) : (
                      <div className={styles.captureVideoContainer}>
                        <video ref={videoRef} autoPlay playsInline muted className={styles.captureVideo} />
                        <div className={styles.captureFaceGuide}>
                          <svg viewBox="0 0 350 460" className={styles.captureGuideSvg}>
                            <ellipse cx="175" cy="230" rx="175" ry="230" fill="none" stroke="#ecc94b" strokeWidth="25" strokeOpacity="0.2" />
                            <ellipse cx="175" cy="230" rx="165" ry="215" fill="none" stroke="#ecc94b" strokeWidth="15" strokeOpacity="0.4" />
                            <ellipse cx="175" cy="230" rx="155" ry="205" fill="none" stroke="#ecc94b" strokeWidth="7" strokeDasharray="16,12" />
                          </svg>
                          <p className={styles.captureGuideText}>Position your face inside the oval</p>
                        </div>
                      </div>
                    )}

                    {/* Capture Button */}
                    <button
                      onClick={captureImage}
                      disabled={!isModelsLoaded || !!cameraError || (videoRef.current && videoRef.current.videoWidth === 0)}
                      className={styles.captureButton}
                    >
                      {isModelsLoaded && !cameraError && videoRef.current?.videoWidth > 0
                        ? "Capture Photo"
                        : "Please wait..."}
                    </button>
                  </>
                )}
              </div>

              {/* Hidden canvas for drawing frame */}
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              {/* Back Button */}
              <button onClick={() => handleBack(4)} className={styles.captureBackButton}>
                ← Back
              </button>
            </div>
          </div>
        )}

        {/* Step 6: Details Confirmation */}
        {step === 6 && (
          <div className={styles.formGroup}>
            <h2 className={styles.stepTitle}>Step 6: Details Confirmation</h2>
            <table className={styles.successTable}>
              <tbody>
                <tr>
                  <td><strong>Photo</strong></td>
                  <td>
                    {formData.memberImage ? (
                      <img src={formData.memberImage} alt="Captured photo" className={styles.tableImage} />
                    ) : (
                      "No image captured"
                    )}
                  </td>
                  <td>
                    <FontAwesomeIcon
                      icon={faPen}
                      className={styles.editIcon}
                      onClick={() => handleBack(5)}
                      title="Edit Member Image"
                    />
                  </td>
                </tr>
                <tr>
                  <td><strong>First Name</strong></td>
                  <td>{formData.firstName}</td>
                  <td>
                    <FontAwesomeIcon
                      icon={faPen}
                      className={styles.editIcon}
                      onClick={() => handleBack(1)}
                      title="Edit First Name"
                    />
                  </td>
                </tr>
                <tr>
                  <td><strong>Middle Name</strong></td>
                  <td>{formData.middleName || "Not provided"}</td>
                  <td>
                    <FontAwesomeIcon
                      icon={faPen}
                      className={styles.editIcon}
                      onClick={() => handleBack(1)}
                      title="Edit Middle Name"
                    />
                  </td>
                </tr>
                <tr>
                  <td><strong>Surname</strong></td>
                  <td>{formData.surname}</td>
                  <td>
                    <FontAwesomeIcon
                      icon={faPen}
                      className={styles.editIcon}
                      onClick={() => handleBack(1)}
                      title="Edit Surname"
                    />
                  </td>
                </tr>
                <tr>
                  <td><strong>Other Name</strong></td>
                  <td>{formData.otherName || "Not provided"}</td>
                  <td>
                    <FontAwesomeIcon
                      icon={faPen}
                      className={styles.editIcon}
                      onClick={() => handleBack(1)}
                      title="Edit Other Name"
                    />
                  </td>
                </tr>
                <tr>
                  <td><strong>Gender</strong></td>
                  <td>{formData.gender}</td>
                  <td>
                    <FontAwesomeIcon
                      icon={faPen}
                      className={styles.editIcon}
                      onClick={() => handleBack(2)}
                      title="Edit Gender"
                    />
                  </td>
                </tr>
                <tr>
                  <td><strong>Date of Birth</strong></td>
                  <td>{formData.dob}</td>
                  <td>
                    <FontAwesomeIcon
                      icon={faPen}
                      className={styles.editIcon}
                      onClick={() => handleBack(2)}
                      title="Edit Date of Birth"
                    />
                  </td>
                </tr>
                <tr>
                  <td><strong>ID Type</strong></td>
                  <td>{formData.idType}</td>
                  <td>
                    <FontAwesomeIcon
                      icon={faPen}
                      className={styles.editIcon}
                      onClick={() => handleBack(2)}
                      title="Edit ID Type"
                    />
                  </td>
                </tr>
                <tr>
                  <td><strong>ID Number</strong></td>
                  <td>{formData.idNumber}</td>
                  <td>
                    <FontAwesomeIcon
                      icon={faPen}
                      className={styles.editIcon}
                      onClick={() => handleBack(2)}
                      title="Edit ID Number"
                    />
                  </td>
                </tr>
                <tr>
                  <td><strong>Country of Birth</strong></td>
                  <td>{formData.countryOfBirth}</td>
                  <td>
                    <FontAwesomeIcon
                      icon={faPen}
                      className={styles.editIcon}
                      onClick={() => handleBack(3)}
                      title="Edit Country of Birth"
                    />
                  </td>
                </tr>
                <tr>
                  <td><strong>Country of Residency</strong></td>
                  <td>{formData.countryOfResidency}</td>
                  <td>
                    <FontAwesomeIcon
                      icon={faPen}
                      className={styles.editIcon}
                      onClick={() => handleBack(3)}
                      title="Edit Country of Residency"
                    />
                  </td>
                </tr>
                <tr>
                  <td><strong>Town/City</strong></td>
                  <td>{formData.townCity}</td>
                  <td>
                    <FontAwesomeIcon
                      icon={faPen}
                      className={styles.editIcon}
                      onClick={() => handleBack(3)}
                      title="Edit Town/City"
                    />
                  </td>
                </tr>
                <tr>
                  <td><strong>Phone</strong></td>
                  <td>{formData.countryCode + formData.phone.replace(/^0+/, '')}</td>
                  <td>
                    <FontAwesomeIcon
                      icon={faPen}
                      className={styles.editIcon}
                      onClick={() => handleBack(4)}
                      title="Edit Phone"
                    />
                  </td>
                </tr>
                <tr>
                  <td><strong>Email</strong></td>
                  <td>{formData.email}</td>
                  <td>
                    <FontAwesomeIcon
                      icon={faPen}
                      className={styles.editIcon}
                      onClick={() => handleBack(4)}
                      title="Edit Email"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
            <div className={styles.buttonGroup}>
              <button onClick={() => handleBack(5)} className={styles.backButton}>
                Back / Edit
              </button>
              <button
                onClick={handleNext}
                className={styles.nextButton}
              >
                Proceed to Verification
              </button>
            </div>
          </div>
        )}

        {/* Step 7: Verification Of Codes */}
        {step === 7 && (
          <div className={styles.formGroup}>
            <h2 className={styles.stepTitle}>Step 7: Verification Of Codes</h2>
            <p>Enter the OTP sent to your email or phone.</p>
            {remainingTime > 0 ? (
              <p className={styles.successMessage}>
                Time left: {Math.floor(remainingTime / 60)}:
                {(remainingTime % 60).toString().padStart(2, "0")} minutes
              </p>
            ) : (
              <p className={styles.errorMessage}>
                Code expired. Please resend.
              </p>
            )}
            <div className={styles.inputWrapper}>
              <label htmlFor="phoneCode" className={styles.inputLabel}>Phone Verification Code (Required)</label>
              <input
                id="phoneCode"
                type="text"
                name="phoneCode"
                value={formData.phoneCode}
                onChange={handleChange}
                placeholder="Phone Verification Code"
                className={styles.inputField}
                maxLength={confirmationcodesize}
                pattern="[A-Za-z0-9]{6}"
                required
              />
              {errors.phoneCode && (
                <p className={styles.errorMessage}>{errors.phoneCode}</p>
              )}
            </div>
            <div className={styles.inputWrapper}>
              <label htmlFor="emailCode" className={styles.inputLabel}>Email Verification Code (Required)</label>
              <input
                id="emailCode"
                type="text"
                name="emailCode"
                value={formData.emailCode}
                onChange={handleChange}
                placeholder="Email Verification Code"
                className={styles.inputField}
                maxLength={confirmationcodesize}
                pattern="[A-Za-z0-9]{6}"
                required
              />
              {errors.emailCode && (
                <p className={styles.errorMessage}>{errors.emailCode}</p>
              )}
            </div>
            {resendMessage && (
              <p className={styles.successMessage}>{resendMessage}</p>
            )}
            <button
              onClick={handleResend}
              className={styles.resendButton}
              disabled={isResendDisabled}
            >
              {isResendDisabled
                ? `Resend Code (${Math.ceil(
                  (cooldownEndTime - Date.now()) / 1000
                )}s)`
                : "Resend Verification Code"}
            </button>
            <div className={styles.buttonGroup}>
              <button
                onClick={() => handleBack(6)}
                className={styles.backButton}
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                className={styles.nextButton}
                disabled={isSubmitting || Object.keys(errors).length > 0 || remainingTime <= 0}
              >
                {isSubmitting ? (
                  <>
                    <span className={styles.spinner}></span> Creating Account...
                  </>
                ) : (
                  "Create Account"
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 8: Success! */}
        {step === 8 && (
          <div className={styles.formGroup}>
            <h2 className={styles.stepTitle}>Step 8: Success!</h2>
            <p className={styles.successMessage}>Your account has been created successfully!</p>
            <p>You can now set your password to complete setup.</p>
            <button
              onClick={() => navigate("/components/member/set-password", { state: { email: formData.email } })}
              className={styles.nextButton}
              style={{ width: '100%', maxWidth: '360px', padding: '14px', fontSize: '1.1rem' }}
            >
              Continue to Set Password
            </button>
          </div>
        )}

        <button
          className={styles.homeButton}
          onClick={onBack}
          title="Return to Home"
        >
          <FontAwesomeIcon icon={faHome} />
        </button>
      </div>
    </div>
  );
}

export default Register;