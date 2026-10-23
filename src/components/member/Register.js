import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ChevronLeft,
  Check,
  Camera,
  RotateCw,
  Mail,
  ReceiptText,
  ScanLine,
} from "lucide-react";
import axios from "axios";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { countries } from "../../utility/countries";
import { getCurrentCountry } from "../../utility/getCurrentCountry";
import { API_URL } from "../../utility/constants";
import { isValidEmail, isSafeText } from "../../utility/validators";
import { useStopCameraWhenHidden } from "../../utility/useStopCameraWhenHidden";
import {
  cameraErrorMessage,
  useRetryWhenCameraAllowed,
} from "../../utility/cameraError";
import * as faceapi from "face-api.js";
import { createWorker } from "tesseract.js";

const cleanOCRText = (text) => {
  if (!text) return "";
  return text
    .replace(/\r/g, "\n")
    .replace(/[|]/g, "I")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
};
const normalizeLine = (line) => line.replace(/[|]/g, "I").replace(/\s+/g, " ").trim();
const getLines = (text) => cleanOCRText(text).split("\n").map(normalizeLine).filter(Boolean);

const ID_STATIC_LABELS = [
  /\bJAMHURI\b/i,
  /\bREPUBLIC\b/i,
  /\bKENYA\b/i,
  /\bNATIONAL(\s+IDENTITY)?(\s+CARD)?\b/i,
  /\bIDENTI(TY|FICATION)\b/i,
  /\b[DP]ATE(\s+OF\s+(BIRTH|ISSUE))?\b/i,
  /\bSEX\b/i,
  /\bGENDER\b/i,
  /\bNATIONALITY\b/i,
  /\bDISTRICT(\s+OF\s+BIRTH)?\b/i,
  /\bPLACE\s+OF\s+(BIRTH|ISSUE)\b/i,
  /\bCOUNTY\b/i,
  /\bSERIAL(\s+NUMBER)?\b/i,
  /\bID\s*NO\b/i,
  /\bID\s*NUMBER\b/i,
  /\bFULL\s*NAMES?\b/i,
  /\bHOLDER'?S?\s*SIGN(ATURE)?\b/i,
];
const isLabelLine = (line) => ID_STATIC_LABELS.some((pattern) => pattern.test(line));

const findLabelValue = (lines, labelPatterns) => {
  for (let i = 0; i < lines.length; i++) {
    for (const pattern of labelPatterns) {
      const match = lines[i].match(pattern);
      if (!match) continue;
      const rest = lines[i]
        .slice(match.index + match[0].length)
        .replace(/^[:\s.-]+/, "")
        .trim();
      if (rest && !isLabelLine(rest)) return rest;
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j] && !isLabelLine(lines[j])) return lines[j];
      }
    }
  }
  return "";
};

const ID_NUMBER_LABELS = [/\bID\s*NO\b/i, /\bID\s*NUMBER\b/i];
const digitsFromValue = (value) => {
  const cleaned = value.replace(/[oO]/g, "0").replace(/[lI]/g, "1");
  const match = cleaned.match(/\d[\d\s]{4,12}\d/);
  return match ? match[0].replace(/\s/g, "") : "";
};
const extractIDNumber = (text) => {
  const labeled = digitsFromValue(findLabelValue(getLines(text), ID_NUMBER_LABELS));
  if (labeled) return labeled;
  // Label wasn't readable — fall back to scanning the whole document.
  const patterns = [/\b\d{8}\b/, /\b\d{7,9}\b/, /\b[A-Z]{1,3}\d{6,12}\b/i];
  for (const pattern of patterns) {
    const match = cleanOCRText(text).match(pattern);
    if (match) return match[0].replace(/\s/g, "");
  }
  return "";
};

const DOB_LABELS = [/\b[DP]ATE\s*OF\s*BIRTH\b/i, /\bD\.?\s*O\.?\s*B\.?\b/i];
const dateFromValue = (value) => {
  const patterns = [
    /\b(19|20)\d{2}[-/.]\d{1,2}[-/.]\d{1,2}\b/,
    /\b\d{1,2}[-/.]\d{1,2}[-/.](19|20)\d{2}\b/,
  ];
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) {
      const raw = match[0];
      if (/^\d{4}/.test(raw)) return raw.replace(/[/.]/g, "-");
      const [day, month, year] = raw.split(/[-/.]/);
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
  }
  return "";
};
const extractDOB = (text) => {
  const labeled = dateFromValue(findLabelValue(getLines(text), DOB_LABELS));
  if (labeled) return labeled;
  return dateFromValue(cleanOCRText(text));
};

const SEX_LABELS = [/\bSEX\b/i, /\bGENDER\b/i];
const genderFromValue = (value) => {
  const upper = value.toUpperCase();
  if (/\bF(EMALE)?\b/.test(upper)) return "Female";
  if (/\bM(ALE)?\b/.test(upper)) return "Male";
  return "";
};
const extractGender = (text) => {
  const labeled = genderFromValue(findLabelValue(getLines(text), SEX_LABELS));
  if (labeled) return labeled;
  return genderFromValue(cleanOCRText(text));
};

const NAME_LABELS = [/\bFULL\s*NAMES?\b/i];
const nameFromLine = (line) => {
  if (!line) return null;
  const words = line.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 5 || !/^[A-Za-z .'-]+$/.test(line)) return null;
  return {
    firstName: words[0] || "",
    middleName: words.length > 2 ? words.slice(1, -1).join(" ") : "",
    surname: words[words.length - 1] || "",
  };
};
const extractName = (text) => {
  const lines = getLines(text);
  const labeled = nameFromLine(findLabelValue(lines, NAME_LABELS));
  if (labeled) return labeled;
  // Label wasn't readable — fall back to scanning for a plausible name line.
  const candidate = lines.find((line) => {
    if (isLabelLine(line)) return false;
    if (/\d/.test(line)) return false;
    return nameFromLine(line) !== null;
  });
  return candidate ? nameFromLine(candidate) : null;
};

const captureVideoFrame = (video, canvas, mimeType, quality) => {
  const boxRatio = 4 / 3;
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const videoRatio = vw / vh;
  let sx = 0, sy = 0, sw = vw, sh = vh;
  if (videoRatio > boxRatio) {
    sw = vh * boxRatio;
    sx = (vw - sw) / 2;
  } else {
    sh = vw / boxRatio;
    sy = (vh - sh) / 2;
  }
  canvas.width = sw;
  canvas.height = sh;
  canvas.getContext("2d").drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);
  return canvas.toDataURL(mimeType, quality);
};

const formHeaderClass = (compact) => cn("flex flex-col gap-1.5", compact && "gap-1");
const formTitleClass = (compact) =>
  cn(
    "font-extrabold text-[#f9fafb] tracking-[-0.5px]",
    compact ? "text-[20px]" : "text-[26px] max-[480px]:text-[22px]",
  );
const formSubClass = (compact) =>
  cn("text-[var(--muted)] leading-[1.55]", compact ? "text-xs" : "text-[13px]");
const formGapClass = (compact) =>
  cn("flex flex-col", compact ? "gap-[0.85rem]" : "gap-4");
const stepRowClass = (compact) =>
  cn("flex items-center mb-1", compact ? "gap-[5px]" : "gap-2");
const stepDotClass = (state, compact) =>
  cn(
    "rounded-full flex items-center justify-center font-bold border-[0.5px]",
    compact ? "w-6 h-6 text-[10px]" : "w-7 h-7 text-[11px]",
    state === "active" &&
      "bg-[rgba(var(--gold-rgb),0.12)] border-[rgba(var(--gold-rgb),0.35)] text-gold",
    state === "completed" &&
      "bg-[rgba(74,222,128,0.1)] border-[rgba(74,222,128,0.3)] text-[#4ade80]",
    state === "default" && "bg-white/5 border-white/10 text-[var(--muted)]",
  );
const fieldLabelClass = "text-xs font-semibold text-[#9ca3af] tracking-[0.2px]";
const inputFieldClass = (compact) =>
  cn(
    "h-auto w-full bg-white/5 text-[#f9fafb] border-[0.5px] border-white/10 rounded-[10px] outline-none transition-colors focus-visible:ring-0 focus-visible:border-gold focus-visible:bg-white/[0.07] placeholder:text-[#4b5563] shadow-none",
    compact
      ? "py-[0.65rem] pr-[0.85rem] pl-9 text-[13px] h-10"
      : "py-3 pr-4 pl-10 text-sm h-11",
  );
const selectFieldClass = (compact) =>
  cn(
    inputFieldClass(compact),
    "appearance-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed",
  );
const optionClass = "bg-[#1f2937] text-[#f9fafb]";
const inlineErrorClass =
  "flex items-center gap-1.5 bg-red-400/[0.08] border-[0.5px] border-red-400/25 rounded-sm px-3 py-2 text-xs text-red-400 mt-1";
const primaryBtnClass = (compact) =>
  cn(
    "w-full h-auto bg-gold text-[#111] border-none rounded-[6px] font-bold cursor-pointer transition-ui flex items-center justify-center gap-1.5 hover:bg-gold-dark hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed shadow-none",
    compact ? "py-2 text-sm" : "py-[0.6rem] text-[15px]",
  );
const secondaryBtnClass = (compact) =>
  cn(
    "w-full bg-white/5 text-[#9ca3af] border-[0.5px] border-white/10 rounded-[6px] font-bold cursor-pointer transition-ui flex items-center justify-center gap-1.5 hover:bg-white/[0.08] hover:text-[#f9fafb] font-sans",
    compact ? "py-2 text-sm" : "py-[0.6rem] text-[15px]",
  );
const buttonGroupClass = "flex gap-3 mt-2 [&>*]:flex-1";
const otpIconWrapClass = "w-[52px] h-[52px] rounded-[14px] flex items-center justify-center";
const otpBoxClass = (compact) =>
  cn(
    "w-full max-w-[200px] px-0 bg-white/5 text-[#f9fafb] border-[0.5px] border-white/[0.12] rounded-[10px] font-bold text-center outline-none transition-colors caret-gold focus-visible:ring-0 focus-visible:border-gold focus-visible:bg-[rgba(var(--gold-rgb),0.06)] shadow-none",
    compact ? "h-12 text-[17px]" : "h-[54px] text-xl",
  );
const timerRowClass = "text-center text-xs text-[var(--muted)]";
const resendButtonClass =
  "bg-[rgba(var(--gold-rgb),0.1)] text-gold border-[0.5px] border-[rgba(var(--gold-rgb),0.3)] rounded-sm py-1.5 px-4 text-[13px] font-semibold cursor-pointer transition-colors hover:bg-[rgba(var(--gold-rgb),0.18)]";
const successTableClass = (compact) =>
  cn(
    "w-full border-collapse bg-white/[0.03] border-[0.5px] border-white/[0.07] rounded-[14px] overflow-hidden mb-4",
    "[&_td]:border-b-[0.5px] [&_td]:border-white/[0.06] [&_tr:last-child_td]:border-b-0",
    "[&_td:nth-child(1)]:text-[var(--muted)] [&_td:nth-child(1)]:w-[40%]",
    "[&_td:nth-child(2)]:text-[#f9fafb] [&_td:nth-child(2)]:font-medium",
    compact
      ? "[&_td]:py-[10px] [&_td]:px-3 [&_td]:text-xs"
      : "[&_td]:py-3 [&_td]:px-4 [&_td]:text-[13px]",
  );

function Register({ onBack, embedded = false, compact = false }) {
  const navigate = useNavigate();

  const namesizeMin = 3;
  const namesizeMax = 15;
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
  const [cameraError, setCameraError] = useState("");
  const [errorPopup, setErrorPopup] = useState("");
  const [generatedAt, setGeneratedAt] = useState(null);
  const [remainingTime, setRemainingTime] = useState(120);
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [idImage, setIdImage] = useState("");
  const [idCameraError, setIdCameraError] = useState("");
  const [isOCRProcessing, setIsOCRProcessing] = useState(false);
  const [ocrProgress, setOCRProgress] = useState(0);
  const [idCaptured, setIdCaptured] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const idVideoRef = useRef(null);
  const idCanvasRef = useRef(null);

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
          else if (!isSafeText(formData.townCity))
            newErrors.townCity = "Town/City contains invalid characters";
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
          else if (!isValidEmail(formData.email))
            newErrors.email = "Enter a valid email address";
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
      if (step === 4) {
        try {
          const { data } = await axios.post(
            `${API_URL}/api/member/check-availability`,
            {
              phone: `${formData.countryCode}${formData.phone}`,
              email: formData.email,
            },
          );
          if (data?.phone_taken || data?.email_taken) {
            const field = data.phone_taken ? "phone" : "email";
            setErrors({ [field]: "Already registered" });
            showRegisterError(`${field} already registered`);
            return;
          }
        } catch {
          // Check unavailable: carry on.
        }
      }
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
    setIdCameraError("");
    stopCamera();
    stopIDCamera();
  };

  const stopIDCamera = useCallback(() => {
    if (idVideoRef.current && idVideoRef.current.srcObject) {
      idVideoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      idVideoRef.current.srcObject = null;
    }
  }, []);

  useStopCameraWhenHidden(stopIDCamera);

  const startIDCamera = useCallback(async () => {
    stopIDCamera();
    setIdCameraError("");
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setIdCameraError(cameraErrorMessage());
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      if (idVideoRef.current) {
        idVideoRef.current.srcObject = stream;
        idVideoRef.current.onloadedmetadata = () => {
          idVideoRef.current?.play().catch(() => {});
        };
      }
    } catch (err) {
      setIdCameraError(
        cameraErrorMessage(err),
      );
    }
  }, [stopIDCamera]);
  useRetryWhenCameraAllowed(step === 1 && !!idCameraError, startIDCamera);

  const processIDWithOCR = async (imageData) => {
    setIsOCRProcessing(true);
    setOCRProgress(0);
    setIdCameraError("");
    try {
      const worker = await createWorker("eng", 1, {
        logger: (message) => {
          if (message.status === "recognizing text") {
            setOCRProgress(Math.round((message.progress || 0) * 100));
          }
        },
      });
      const result = await worker.recognize(imageData);
      const text = result?.data?.text || "";
      await worker.terminate();

      const cleaned = cleanOCRText(text);
      const extractedID = extractIDNumber(cleaned);
      const extractedDOB = extractDOB(cleaned);
      const extractedName = extractName(cleaned);
      const extractedGender = extractGender(cleaned);
      const upper = cleaned.toUpperCase();
      let extractedIDType = "";
      if (upper.includes("PASSPORT")) extractedIDType = "Passport";
      else if (
        upper.includes("NATIONAL ID") ||
        upper.includes("IDENTITY CARD") ||
        upper.includes("KENYA")
      )
        extractedIDType = "Government";

      setFormData((prev) => ({
        ...prev,
        ...(extractedName
          ? {
              firstName: extractedName.firstName || prev.firstName,
              middleName: extractedName.middleName || prev.middleName,
              surname: extractedName.surname || prev.surname,
            }
          : {}),
        ...(extractedID ? { idNumber: extractedID } : {}),
        ...(extractedDOB ? { dob: extractedDOB } : {}),
        ...(extractedIDType ? { idType: extractedIDType } : {}),
        ...(extractedGender ? { gender: extractedGender } : {}),
      }));

      setOCRProgress(100);
      if (!extractedID && !extractedDOB && !extractedName && !extractedGender) {
        setIdCameraError(
          "Couldn't read the ID. Make sure the whole card — including the top with your photo, names and ID number — fits inside the frame, then retake, or enter the details manually.",
        );
      }
    } catch (error) {
      setIdCameraError("Unable to read the ID automatically. You can enter the details manually.");
    } finally {
      setIsOCRProcessing(false);
    }
  };

  const captureIDDocument = async () => {
    if (!idVideoRef.current || !idCanvasRef.current) {
      setIdCameraError("Camera is not ready. Please wait and try again.");
      return;
    }
    const video = idVideoRef.current;
    const canvas = idCanvasRef.current;
    if (!video.videoWidth || !video.videoHeight) {
      setIdCameraError("Camera is still loading. Please try again.");
      return;
    }
    const imageData = captureVideoFrame(video, canvas, "image/jpeg", 0.9);

    setIdImage(imageData);
    setIdCaptured(true);
    stopIDCamera();
    await processIDWithOCR(imageData);
  };

  const retakeID = () => {
    setIdImage("");
    setIdCaptured(false);
    setOCRProgress(0);
    setIdCameraError("");
    startIDCamera();
  };

  useEffect(() => {
    if (step === 1 && !idCaptured) {
      startIDCamera();
    } else {
      stopIDCamera();
    }
    return () => stopIDCamera();
  }, [step, idCaptured, startIDCamera, stopIDCamera]);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  useStopCameraWhenHidden(stopCamera);

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
      setCameraError(cameraErrorMessage(err));
    }
  }, [stopCamera]);
  useRetryWhenCameraAllowed(step === 5 && !!cameraError, startCamera);

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current || !isModelsLoaded) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

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
      const imageData = captureVideoFrame(video, canvas, "image/png");
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
  }, [step, startCamera, stopCamera]);

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

  const showRegisterError = (msg = "") => {
    const m = msg.toLowerCase();
    if (!/already|exists|registered|taken|in use/.test(m)) {
      setErrorPopup(msg || "Registration failed. Please try again.");
      return;
    }
    const what = m.includes("phone")
      ? "phone number"
      : m.includes("email")
        ? "email address"
        : null;
    setErrorPopup({
      title: what ? `This ${what} is already registered` : "You already have an account",
      message: `An account already uses ${what ? `this ${what}` : "these details"}. Log in, or reset your password if you've forgotten it.`,
      actions: [
        { label: "Log in", to: "/login" },
        { label: "Reset password", to: "/reset-password" },
      ],
    });
  };

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
        else showRegisterError(res.data.error);
      } catch (error) {
        const data = error.response?.data;
        showRegisterError(
          data?.error ||
            data?.message ||
            (error.response?.status === 409 ? "already registered" : ""),
        );
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const countryOptions = countries.sort((a, b) => a.name.localeCompare(b.name));

  const StepIndicator = () => (
    <div className={stepRowClass(compact)}>
      {[1, 2, 3, 4, 5, 6, 7].map((s) => (
        <React.Fragment key={s}>
          <div
            className={stepDotClass(
              step === s ? "active" : step > s ? "completed" : "default",
              compact,
            )}
          >
            {step > s ? <Check size={12} /> : s}
          </div>
          {s < 7 && <div className="flex-1 h-[0.5px] bg-white/[0.08]" />}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className={cn("text-foreground", embedded ? "bg-transparent min-h-0" : "bg-background min-h-screen")}>
      <div className={cn("min-h-screen grid grid-cols-1 md:grid-cols-2", embedded && "block min-h-0")}>
        {/* Left Panel */}
        <div
          className={cn(
            "relative overflow-hidden items-center justify-center p-12 px-10 border-r-[0.5px] border-white/[0.07] bg-[#111827]",
            "before:content-[''] before:absolute before:rounded-full before:border-[0.5px] before:border-[rgba(var(--gold-rgb),0.07)] before:pointer-events-none before:w-[480px] before:h-[480px] before:-top-[100px] before:-left-[100px]",
            "after:content-[''] after:absolute after:rounded-full after:border-[0.5px] after:border-[rgba(var(--gold-rgb),0.07)] after:pointer-events-none after:w-[320px] after:h-[320px] after:-bottom-20 after:-right-20",
            embedded ? "hidden" : "hidden md:flex",
          )}
        >
          <div className="flex flex-col gap-6 max-w-[360px] w-full relative z-[1]">
            <h2 className="text-[32px] font-extrabold leading-[1.15] tracking-[-0.8px] text-[#f9fafb]">
              <span className="text-gold tracking-[1.2rem] font-black">PAYZARC</span>
            </h2>
            <p className="text-[13px] text-[var(--muted)] leading-[1.65] -mt-2">
              Create an account in minutes and start sending money worldwide
              with real-time exchange rates and zero hidden fees.
            </p>
            <div className="flex items-center gap-4 px-5 py-4 bg-white/[0.03] border-[0.5px] border-white/[0.07] rounded-[14px]">
              <div className="flex-1 text-center">
                <div className="text-[10px] text-[var(--muted)] mt-0.5">Setup</div>
              </div>
              <div className="w-[0.5px] h-7 bg-white/[0.08]" />
              <div className="flex-1 text-center">
                <div className="text-base font-extrabold text-gold tracking-[-0.5px]">100%</div>
                <div className="text-[10px] text-[var(--muted)] mt-0.5">Secure</div>
              </div>
              <div className="w-[0.5px] h-7 bg-white/[0.08]" />
              <div className="flex-1 text-center">
                <div className="text-base font-extrabold text-gold tracking-[-0.5px]">24/7</div>
                <div className="text-[10px] text-[var(--muted)] mt-0.5">Support</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div
          className={cn(
            "flex items-center justify-center bg-background",
            embedded
              ? "p-0 bg-transparent items-stretch justify-stretch"
              : "p-10 px-8 max-[768px]:p-8 max-[768px]:px-5 max-[768px]:items-start max-[768px]:pt-12",
          )}
        >
          <div
            className={cn(
              "w-full flex flex-col gap-5",
              embedded ? "max-w-full" : "max-w-[440px] max-[768px]:max-w-full",
            )}
          >
            <button
              className={cn(
                "inline-flex items-center gap-1.5 bg-transparent border-[0.5px] border-white/10 rounded-md text-[#9ca3af] text-xs font-medium px-3 py-1 cursor-pointer w-fit transition-colors hover:text-[#f9fafb] hover:border-white/20",
                embedded && "hidden",
              )}
              onClick={onBack}
            >
              <ChevronLeft size={16} />
              Home
            </button>

            <div className={formHeaderClass(compact)}>
              <h1 className={formTitleClass(compact)} id="register-modal-title">
                Create Account
              </h1>
              <p className={formSubClass(compact)}>
                Complete the steps to get started
              </p>
            </div>

            <StepIndicator />

            {/* Step Content */}
            <div className={formGapClass(compact)}>
              {step === 1 && (
                <>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-[10px] bg-[rgba(var(--gold-rgb),0.1)] border border-[rgba(var(--gold-rgb),0.25)] flex items-center justify-center">
                      <ReceiptText size={20} className="text-gold" />
                    </div>
                    <div>
                      <h2 className="text-[17px] font-extrabold text-[#f9fafb]">
                        Scan your ID (optional)
                      </h2>
                      <p className="text-xs text-[var(--muted)]">
                        Auto-fills the fields below — or skip and type them in.
                      </p>
                    </div>
                  </div>

                  <div className="relative w-full aspect-[4/3] bg-black rounded-2xl overflow-hidden border border-white/10">
                    {idImage ? (
                      <img
                        src={idImage}
                        className="w-full h-full object-contain"
                        alt="Captured ID"
                      />
                    ) : (
                      <video
                        ref={idVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                    )}
                    <canvas ref={idCanvasRef} className="hidden" />
                    {!idImage && (
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="w-[85%] h-[58%] border-2 border-gold/60 rounded-xl" />
                      </div>
                    )}
                  </div>

                  {idCameraError && (
                    <p className={inlineErrorClass}>
                      {idCameraError}{" "}
                      <button
                        type="button"
                        onClick={startIDCamera}
                        className="underline font-semibold"
                      >
                        Try again
                      </button>
                    </p>
                  )}

                  {isOCRProcessing && (
                    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <ScanLine size={16} className="text-gold" />
                        <span className="text-xs text-[#f9fafb] font-semibold">
                          Reading ID...
                        </span>
                        <span className="ml-auto text-xs text-gold">{ocrProgress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gold transition-[width] duration-200 ease-apple"
                          style={{ width: `${ocrProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {!idImage ? (
                    <Button
                      onClick={captureIDDocument}
                      disabled={isOCRProcessing}
                      className={primaryBtnClass(compact)}
                    >
                      <Camera size={16} /> Capture ID
                    </Button>
                  ) : (
                    <Button
                      onClick={retakeID}
                      disabled={isOCRProcessing}
                      className={secondaryBtnClass(compact)}
                    >
                      <RotateCw size={16} /> Retake ID
                    </Button>
                  )}

                  {idImage && (
                    <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3">
                      <p className="text-xs text-[var(--muted)]">
                        The information below was extracted from your ID.
                        Please review and correct anything that is wrong.
                      </p>
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className={fieldLabelClass}>First Name</label>
                    <Input
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="Enter first name"
                      className={inputFieldClass(compact)}
                    />
                    {errors.firstName && (
                      <p className={inlineErrorClass}>{errors.firstName}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={fieldLabelClass}>Surname</label>
                    <Input
                      name="surname"
                      value={formData.surname}
                      onChange={handleChange}
                      placeholder="Enter surname"
                      className={inputFieldClass(compact)}
                    />
                    {errors.surname && (
                      <p className={inlineErrorClass}>{errors.surname}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={fieldLabelClass}>
                      Middle Name (Optional)
                    </label>
                    <Input
                      name="middleName"
                      value={formData.middleName}
                      onChange={handleChange}
                      placeholder="Enter middle name"
                      className={inputFieldClass(compact)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={fieldLabelClass}>
                      Other Name (Optional)
                    </label>
                    <Input
                      name="otherName"
                      value={formData.otherName}
                      onChange={handleChange}
                      placeholder="Enter other name"
                      className={inputFieldClass(compact)}
                    />
                  </div>
                  <Button
                    onClick={handleNext}
                    disabled={isOCRProcessing}
                    className={primaryBtnClass(compact)}
                  >
                    Next Step
                  </Button>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className={fieldLabelClass}>Gender</label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className={selectFieldClass(compact)}
                    >
                      <option value="" className={optionClass}>Select Gender</option>
                      <option value="Male" className={optionClass}>Male</option>
                      <option value="Female" className={optionClass}>Female</option>
                    </select>
                    {errors.gender && (
                      <p className={inlineErrorClass}>{errors.gender}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={fieldLabelClass}>Date of Birth</label>
                    <Input
                      type="date"
                      name="dob"
                      value={formData.dob}
                      onChange={handleChange}
                      className={inputFieldClass(compact)}
                    />
                    {errors.dob && (
                      <p className={inlineErrorClass}>{errors.dob}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={fieldLabelClass}>ID Type</label>
                    <select
                      name="idType"
                      value={formData.idType}
                      onChange={handleChange}
                      className={selectFieldClass(compact)}
                    >
                      <option value="" className={optionClass}>Select ID Type</option>
                      <option value="Passport" className={optionClass}>Passport</option>
                      <option value="Government" className={optionClass}>Government ID</option>
                    </select>
                    {errors.idType && (
                      <p className={inlineErrorClass}>{errors.idType}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={fieldLabelClass}>ID Number</label>
                    <Input
                      name="idNumber"
                      value={formData.idNumber}
                      onChange={handleChange}
                      placeholder="Enter ID number"
                      className={inputFieldClass(compact)}
                    />
                    {errors.idNumber && (
                      <p className={inlineErrorClass}>{errors.idNumber}</p>
                    )}
                  </div>
                  <div className={buttonGroupClass}>
                    <button
                      onClick={() => handleBack(1)}
                      className={secondaryBtnClass(compact)}
                    >
                      Back
                    </button>
                    <Button onClick={handleNext} className={primaryBtnClass(compact)}>
                      Next Step
                    </Button>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className={fieldLabelClass}>
                      Country of Birth
                    </label>
                    <select
                      name="countryOfBirth"
                      value={formData.countryOfBirth}
                      onChange={handleChange}
                      className={selectFieldClass(compact)}
                    >
                      <option value="" className={optionClass}>Select Country</option>
                      {countryOptions.map((c) => (
                        <option key={c.name} value={c.name} className={optionClass}>
                          {c.flag} {c.name}
                        </option>
                      ))}
                    </select>
                    {errors.countryOfBirth && (
                      <p className={inlineErrorClass}>
                        {errors.countryOfBirth}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={fieldLabelClass}>
                      Town/City of Residency
                    </label>
                    <Input
                      name="townCity"
                      value={formData.townCity}
                      onChange={handleChange}
                      placeholder="Enter town or city"
                      className={inputFieldClass(compact)}
                    />
                    {errors.townCity && (
                      <p className={inlineErrorClass}>{errors.townCity}</p>
                    )}
                  </div>
                  <div className={buttonGroupClass}>
                    <button
                      onClick={() => handleBack(2)}
                      className={secondaryBtnClass(compact)}
                    >
                      Back
                    </button>
                    <Button onClick={handleNext} className={primaryBtnClass(compact)}>
                      Next Step
                    </Button>
                  </div>
                </>
              )}

              {step === 4 && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className={fieldLabelClass}>Email Address</label>
                    <Input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Enter email"
                      className={inputFieldClass(compact)}
                    />
                    {errors.email && (
                      <p className={inlineErrorClass}>{errors.email}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className={fieldLabelClass}>Phone Number</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-[10px] text-[#6b7280] text-sm pointer-events-none">
                        {formData.countryCode}
                      </span>
                      <Input
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="Enter phone number"
                        className={cn(inputFieldClass(compact), "pl-[45px]")}
                      />
                    </div>
                    {errors.phone && (
                      <p className={inlineErrorClass}>{errors.phone}</p>
                    )}
                  </div>
                  <div className={buttonGroupClass}>
                    <button
                      onClick={() => handleBack(3)}
                      className={secondaryBtnClass(compact)}
                    >
                      Back
                    </button>
                    <Button onClick={handleNext} className={primaryBtnClass(compact)}>
                      Next Step
                    </Button>
                  </div>
                </>
              )}

              {step === 5 && (
                <div className="flex flex-col gap-4">
                  <div className="relative w-full aspect-[4/3] bg-black rounded-2xl overflow-hidden border border-white/10">
                    {formData.memberImage ? (
                      <img
                        src={formData.memberImage}
                        className="w-full h-full object-cover"
                        alt="Captured"
                      />
                    ) : (
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                    )}
                    <canvas ref={canvasRef} className="hidden" />
                  </div>
                  {cameraError && (
                    <p className={inlineErrorClass}>
                      {cameraError}{" "}
                      <button
                        type="button"
                        onClick={startCamera}
                        className="underline font-semibold"
                      >
                        Try again
                      </button>
                    </p>
                  )}
                  <div className={buttonGroupClass}>
                    {formData.memberImage ? (
                      <button
                        onClick={() => {
                          setFormData({ ...formData, memberImage: "" });
                          startCamera();
                        }}
                        className={secondaryBtnClass(compact)}
                      >
                        <RotateCw size={16} /> Retake
                      </button>
                    ) : (
                      <Button onClick={captureImage} className={primaryBtnClass(compact)}>
                        <Camera size={16} /> Capture Face
                      </Button>
                    )}
                  </div>
                  <div className={buttonGroupClass}>
                    <button
                      onClick={() => handleBack(4)}
                      className={secondaryBtnClass(compact)}
                    >
                      Back
                    </button>
                    <Button
                      onClick={handleNext}
                      className={primaryBtnClass(compact)}
                      disabled={!formData.memberImage}
                    >
                      Next Step
                    </Button>
                  </div>
                </div>
              )}

              {step === 6 && (
                <div>
                  <h2 className="text-[18px] font-extrabold text-[#f9fafb] tracking-[-0.5px] mb-3">
                    Review Details
                  </h2>
                  <table className={successTableClass(compact)}>
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
                            className="w-12 h-12 object-cover rounded-sm border-[1.5px] border-gold"
                            alt="Profile"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                  <div className={buttonGroupClass}>
                    <button
                      onClick={() => handleBack(5)}
                      className={secondaryBtnClass(compact)}
                    >
                      Back
                    </button>
                    <Button onClick={handleNext} className={primaryBtnClass(compact)}>
                      Verify & Submit
                    </Button>
                  </div>
                </div>
              )}

              {step === 7 && (
                <div className="text-center">
                  <div
                    className={cn(
                      otpIconWrapClass,
                      "mx-auto mb-4 bg-[rgba(var(--gold-rgb),0.1)] border-[0.5px] border-[rgba(var(--gold-rgb),0.25)]",
                    )}
                  >
                    <Mail size={24} color="var(--gold)" strokeWidth={2} />
                  </div>
                  <p className={formSubClass(compact)}>
                    Enter the code sent to {formData.email}
                  </p>
                  <div className="flex justify-center my-4">
                    <Input
                      name="emailCode"
                      value={formData.emailCode}
                      onChange={handleChange}
                      placeholder="000000"
                      className={otpBoxClass(compact)}
                      maxLength={6}
                    />
                  </div>
                  <div className={timerRowClass}>
                    {remainingTime > 0 ? (
                      `Code expires in ${remainingTime}s`
                    ) : (
                      <button
                        onClick={handleNext}
                        className={resendButtonClass}
                      >
                        Resend Code
                      </button>
                    )}
                  </div>
                  <div className={cn(buttonGroupClass, "mt-6")}>
                    <button
                      onClick={() => handleBack(6)}
                      className={secondaryBtnClass(compact)}
                    >
                      Back
                    </button>
                    <Button
                      onClick={handleSubmit}
                      className={primaryBtnClass(compact)}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <span className="inline-block w-[18px] h-[18px] rounded-full border-2 border-black/20 border-t-[#111] animate-spin" />
                      ) : (
                        "Complete Registration"
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {step === 8 && (
                <div className="text-center py-8">
                  <div
                    className={cn(
                      otpIconWrapClass,
                      "mx-auto mb-6 bg-[rgba(74,222,128,0.1)] border-[0.5px] border-[#4ade80]",
                    )}
                  >
                    <Check size={24} color="#4ade80" strokeWidth={2.5} />
                  </div>
                  <h2 className={formTitleClass(compact)}>Success!</h2>
                  <p className={formSubClass(compact)}>
                    Your account has been created successfully. You can now log
                    in to your dashboard.
                  </p>
                  <Button
                    onClick={() => navigate("/login")}
                    className={cn(primaryBtnClass(compact), "mt-8")}
                  >
                    Go to Login
                  </Button>
                </div>
              )}
            </div>

            <p className="text-[13px] text-[var(--muted)] text-center">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-gold font-semibold no-underline transition-opacity hover:opacity-80"
              >
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Error Popup */}
      {errorPopup && (
        <Dialog open onOpenChange={(open) => !open && setErrorPopup("")}>
          <DialogContent
            className={cn(
              "max-w-[360px] bg-[#1f2937] rounded-[20px] flex flex-col items-center gap-4 text-center animate-popup-in",
              compact ? "p-6" : "p-8",
            )}
          >
            <DialogTitle className="text-[17px] font-bold text-red-400">
              {errorPopup.title || "Error"}
            </DialogTitle>
            <p className="text-[13px] text-[#9ca3af] leading-[1.55]">
              {errorPopup.message || errorPopup}
            </p>
            {errorPopup.actions?.map((a, i) => (
              <Button
                key={a.to}
                onClick={() => navigate(a.to)}
                className={cn(
                  "w-full h-auto py-2 rounded-[6px] text-sm font-semibold shadow-none",
                  i === 0
                    ? "bg-gold text-black hover:bg-gold/90"
                    : "bg-transparent text-gold border border-gold/40 hover:bg-gold/10",
                )}
              >
                {a.label}
              </Button>
            ))}
            <Button
              onClick={() => setErrorPopup("")}
              className="w-full h-auto py-2 rounded-[6px] bg-red-400/[0.12] text-red-400 border border-red-400/30 text-sm font-semibold hover:bg-red-400/20 shadow-none"
            >
              {errorPopup.actions ? "Cancel" : "OK"}
            </Button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default Register;
