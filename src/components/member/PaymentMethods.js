import React, { useState, useEffect } from "react";
import axios from "axios";
import { ChevronLeft, BadgeCheck, Camera, LogOut } from "lucide-react";
import axiosInstance, { transactionsApi } from "../../utility/axiosInstance";
import { API_URL, PRO_PLAN_PRICE } from "../../utility/constants";
import { countries } from "../../utility/countries";
import { isoToFlagEmoji } from "../../utility/isoToFlagEmoji";
import { getCurrentCountry } from "../../utility/getCurrentCountry";
import { getRegionProviders } from "../../utility/regionProviders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ProfileImageCapture from "./ProfileImageCapture";
import KycVerification from "./KycVerification";
import {
  isValidEmail,
  isValidPhone,
  isValidCardNumber,
  isValidExpiry,
  isSafeText,
} from "../../utility/validators";

const emptyBank = { bankName: "", accountNumber: "", accountName: "" };
const emptyCard = { cardholderName: "", cardNumber: "", expiry: "" };
const emptyMobile = { provider: "", phoneNumber: "" };
const emptyPasswordForm = { currentPassword: "", newPassword: "", confirmPassword: "" };
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,15}$/;
const WEAK_PINS = [
  "1234", "0000", "1111", "2222", "3333", "4444", "5555", "6666", "7777",
  "8888", "9999", "4321", "3456", "6789",
];

function getPinStrength(pinValue) {
  if (!pinValue) return { level: "none", label: "", color: "" };
  if (pinValue.length < 4) return { level: "weak", label: "Too Short", color: "#ef4444" };
  if (WEAK_PINS.includes(pinValue) || /^(\d)\1{3}$/.test(pinValue))
    return { level: "weak", label: "Very Weak", color: "#ef4444" };
  if (/(\d)\1{2}/.test(pinValue) || /123|234|345|456|567|678|789|987|876/.test(pinValue))
    return { level: "medium", label: "Medium", color: "#f59e0b" };
  return { level: "strong", label: "Strong", color: "#22c55e" };
}

// Same card/flow/form class strings Home.js uses (restyled to match the
// rest of the dashboard: flat bg-card, no border, rounded-2xl, translucent
// white/[0.0X] surfaces for inputs/method cards) — kept here too since this
// is a standalone page, not mounted inside Home's balance card.
const flowCardClass =
  "relative p-8 w-full max-w-[600px] mx-auto min-h-[560px] flex flex-col gap-7 bg-card rounded-2xl animate-flow-fade-in max-[640px]:p-6 max-[640px]:px-5 max-[640px]:gap-6 max-[640px]:min-h-[480px]";
const flowHeaderClass =
  "absolute left-0 w-full bottom-full mb-3 grid grid-cols-[1fr_auto_1fr] items-center text-white";
const backBtnClass =
  "col-start-1 justify-self-start h-auto gap-1 px-1 py-1 text-white text-[0.9rem] font-semibold transition-opacity duration-200 hover:bg-transparent hover:text-white hover:opacity-75 [&_svg]:size-auto";
const formLabelClass =
  "flex items-center justify-between text-[11px] font-medium text-muted-foreground uppercase tracking-wider -mb-[0.4rem]";
const formInputClass =
  "w-full h-auto bg-white/[0.03] border-white/[0.06] rounded-xl px-4 py-3.5 text-foreground text-base md:text-base placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-gold/[0.08] focus-visible:border-gold/30 focus-visible:bg-white/[0.07] shadow-none transition-colors duration-200";
const primaryBtnClass =
  "w-full h-auto rounded-sm px-5 py-2.5 text-base font-bold text-black transition-ui duration-200 hover:bg-primary active:scale-[0.97] disabled:opacity-60 disabled:active:scale-100 mt-1 shadow-lg shadow-gold/10 hover:shadow-gold/20";
const addFavouriteBtnClass =
  "self-start bg-transparent border-none text-gold text-[0.8rem] font-semibold cursor-pointer p-0 -mt-[0.6rem] transition-opacity hover:opacity-75";
const flowFormClass =
  "flex flex-col gap-[1.1rem] w-full max-w-[420px] mx-auto max-[640px]:max-w-full";
// Sections: one rhythm everywhere — a hairline + 24px above each section,
// 10px from its heading to its content. Header actions (Edit / View list)
// sit on the heading's own line, never nudged above it.
const sectionHeaderClass = "flex justify-between items-center gap-3 min-h-8";
const groupClass =
  "flex flex-col gap-2.5 pt-6 border-t border-white/[0.06]";
const groupTitleClass =
  "m-0 text-[0.95rem] font-semibold tracking-[-0.01em] text-foreground";
const headerActionClass =
  "shrink-0 bg-transparent border-none text-gold text-[0.8rem] font-semibold cursor-pointer px-2 py-1.5 -mr-2 rounded-md transition-[opacity,background-color] duration-200 hover:bg-[var(--gold-pale)]";
const methodCardClass =
  "flex justify-between items-center bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-[0.85rem] text-sm font-semibold text-foreground";
const mutedClass = "text-[var(--soft)] font-medium text-xs";
const logoutBtnClass =
  "self-start inline-flex items-center gap-2 bg-transparent border-none text-destructive text-[0.85rem] font-semibold cursor-pointer p-0 transition-opacity hover:opacity-75";

function ProfileRow({ label, value, verified }) {
  return (
    <div className="flex justify-between items-center gap-3 py-[0.65rem] border-b border-white/[0.06] text-[0.85rem] last:border-b-0">
      <span className="text-[var(--soft)] font-medium shrink-0">{label}</span>
      <span className="text-foreground font-semibold text-right flex items-center gap-[5px]">
        {value || "—"}
        {verified !== undefined && (
          <BadgeCheck
            size={14}
            className={verified ? "text-success shrink-0" : "text-[var(--soft)] shrink-0"}
          />
        )}
      </span>
    </div>
  );
}

// The Account page: profile info plus connected banks/cards/mobile money —
// the linked accounts here are what the Add Money popup (Home.js) offers as
// saved sources. Bank/mobile money options are geolocation-aware, reusing
// the same region lookup Add Money uses.
function PaymentMethods({ onBack, user, onLogout, onRefreshUser }) {
  const [profile, setProfile] = useState(null);
  const [myCountry, setMyCountry] = useState(null);
  const [methods, setMethods] = useState({ banks: [], cards: [], mobileMoney: [] });
  // Update Photo used to be its own separate page (reached from the avatar
  // dropdown) — now it's just a toggled view within this page, since the
  // avatar click navigates straight here.
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [showKyc, setShowKyc] = useState(false);
  const [showAddBank, setShowAddBank] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [showAddMobile, setShowAddMobile] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState(null);
  const [newBank, setNewBank] = useState(emptyBank);
  const [newCard, setNewCard] = useState(emptyCard);
  const [newMobile, setNewMobile] = useState(emptyMobile);
  const [profileError, setProfileError] = useState("");
  const [bankError, setBankError] = useState("");
  const [cardError, setCardError] = useState("");
  const [mobileError, setMobileError] = useState("");

  // Inline change-password flow — "idle" (just the button) -> "form"
  // (current/new/confirm) -> "otp" (code entry) -> "success". Kept as part
  // of this page's own sections rather than swapping to a separate screen.
  const [pwStep, setPwStep] = useState("idle");
  const [pwForm, setPwForm] = useState(emptyPasswordForm);
  const [pwOtp, setPwOtp] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  // Membership (basic/pro) — upgrade charges one of the payment methods
  // already on file below; there's no billing provider yet so this just
  // flips `user.plan` server-side once a method is confirmed to exist.
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [chargeTo, setChargeTo] = useState("");
  const [subError, setSubError] = useState("");
  const [subLoading, setSubLoading] = useState(false);

  // Username change
  const [showUsernameForm, setShowUsernameForm] = useState(false);
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [usernameSuccess, setUsernameSuccess] = useState("");

  // Residence update
  const [showResidenceForm, setShowResidenceForm] = useState(false);
  const [resCountry, setResCountry] = useState("Detecting...");
  const [resTownCity, setResTownCity] = useState("Detecting...");
  const [resPostalCode, setResPostalCode] = useState("Detecting...");
  const [resAddressLine, setResAddressLine] = useState("");
  const [residenceErrors, setResidenceErrors] = useState({});
  const [residenceLoading, setResidenceLoading] = useState(false);
  const [residenceSuccess, setResidenceSuccess] = useState(false);

  // Secondary contact
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactType, setContactType] = useState("EMAIL");
  const [contactValue, setContactValue] = useState("");
  const [contactCountryCode, setContactCountryCode] = useState("+254");
  const [contactError, setContactError] = useState("");
  const [contactLoading, setContactLoading] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [secondaryContacts, setSecondaryContacts] = useState([]);
  const [showContactsList, setShowContactsList] = useState(false);
  const [contactsListLoading, setContactsListLoading] = useState(false);

  // Secondary ID
  const [showSecondaryIdForm, setShowSecondaryIdForm] = useState(false);
  const [secIdType, setSecIdType] = useState("Government ID");
  const [secIdNumber, setSecIdNumber] = useState("");
  const [secIssuedCountry, setSecIssuedCountry] = useState("");
  const [secIdError, setSecIdError] = useState("");
  const [secIdLoading, setSecIdLoading] = useState(false);
  const [secIdSuccess, setSecIdSuccess] = useState(false);
  const [secondaryIds, setSecondaryIds] = useState([]);
  const [showIdsList, setShowIdsList] = useState(false);
  const [idsListLoading, setIdsListLoading] = useState(false);

  // Transaction PIN — required by Home.js's send-money flow
  // (requirePin dialog sends transaction_pin), so without this section
  // users would have no way to ever set the PIN that flow demands.
  const [showPinForm, setShowPinForm] = useState(false);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinLoading, setPinLoading] = useState(false);
  const [pinSuccess, setPinSuccess] = useState(false);
  const [showPinInput, setShowPinInput] = useState(false);
  const [showConfirmPinInput, setShowConfirmPinInput] = useState(false);
  const [pinStrength, setPinStrength] = useState({ level: "none", label: "", color: "" });
  const [pinsMatch, setPinsMatch] = useState(false);

  const region = getRegionProviders(myCountry);

  useEffect(() => {
    axiosInstance
      .get("/api/profile-details")
      .then((res) => setProfile(res.data))
      .catch(() => {});
    transactionsApi
      .get("/api/payment-methods/")
      .then((res) =>
        setMethods({
          banks: res.data?.banks || [],
          cards: res.data?.cards || [],
          mobileMoney: res.data?.mobileMoney || [],
        }),
      )
      .catch(() => {});
    getCurrentCountry(countries).then(setMyCountry);
  }, []);

  const addBank = async () => {
    setBankError("");
    if (!newBank.bankName || !newBank.accountNumber || !newBank.accountName) {
      setBankError("All fields are required");
      return;
    }
    if (!/^\d{6,20}$/.test(newBank.accountNumber.trim())) {
      setBankError("Enter a valid account number");
      return;
    }
    if (!isSafeText(newBank.accountName)) {
      setBankError("Account name can't contain < or > characters");
      return;
    }
    const res = await transactionsApi.post("/api/payment-methods/banks/", newBank);
    setMethods((m) => ({ ...m, banks: res.data || [] }));
    setNewBank(emptyBank);
    setShowAddBank(false);
  };

  const addCard = async () => {
    setCardError("");
    if (!newCard.cardholderName || !newCard.cardNumber || !newCard.expiry) {
      setCardError("All fields are required");
      return;
    }
    if (!isSafeText(newCard.cardholderName)) {
      setCardError("Cardholder name can't contain < or > characters");
      return;
    }
    if (!isValidCardNumber(newCard.cardNumber)) {
      setCardError("Enter a valid card number");
      return;
    }
    if (!isValidExpiry(newCard.expiry)) {
      setCardError("Enter a valid, unexpired expiry date (MM/YY)");
      return;
    }
    const res = await transactionsApi.post("/api/payment-methods/cards/", newCard);
    setMethods((m) => ({ ...m, cards: res.data || [] }));
    setNewCard(emptyCard);
    setShowAddCard(false);
  };

  const addMobile = async () => {
    setMobileError("");
    if (!newMobile.provider || !newMobile.phoneNumber) {
      setMobileError("All fields are required");
      return;
    }
    if (!isValidPhone(newMobile.phoneNumber)) {
      setMobileError("Enter a valid phone number");
      return;
    }
    const res = await transactionsApi.post(
      "/api/payment-methods/mobile-money/",
      newMobile,
    );
    setMethods((m) => ({ ...m, mobileMoney: res.data || [] }));
    setNewMobile(emptyMobile);
    setShowAddMobile(false);
  };

  const chargeOptions = [
    ...methods.cards.map((c) => ({
      value: `card:${c.id}`,
      label: `${c.brand} •••• ${c.last4}`,
    })),
    ...methods.banks.map((b) => ({
      value: `bank:${b.id}`,
      label: `${b.bankName} •••• ${String(b.accountNumber).slice(-4)}`,
    })),
    ...methods.mobileMoney.map((m) => ({
      value: `mobileMoney:${m.id}`,
      label: `${m.provider} •••• ${String(m.phoneNumber).slice(-4)}`,
    })),
  ];

  const upgradeToPro = async () => {
    setSubError("");
    if (!chargeTo) {
      setSubError("Choose a payment method to charge");
      return;
    }
    setSubLoading(true);
    try {
      await axiosInstance.post("/api/subscription/upgrade", {
        method: chargeTo,
      });
      onRefreshUser();
      setShowUpgrade(false);
      setChargeTo("");
    } catch (error) {
      setSubError(error.response?.data?.error || "Upgrade failed");
    } finally {
      setSubLoading(false);
    }
  };

  const cancelPro = async () => {
    setSubLoading(true);
    try {
      await axiosInstance.post("/api/subscription/cancel");
      onRefreshUser();
    } finally {
      setSubLoading(false);
    }
  };

  const startEditProfile = () => {
    setProfileForm({
      phone: profile?.phone || "",
      email: profile?.email || "",
      addressLine: profile?.addressLine || "",
      townCity: profile?.townCity || "",
      postalCode: profile?.postalCode || "",
    });
    setEditingProfile(true);
  };

  const saveProfile = async () => {
    setProfileError("");
    if (profileForm.phone && !isValidPhone(profileForm.phone)) {
      setProfileError("Enter a valid phone number");
      return;
    }
    if (profileForm.email && !isValidEmail(profileForm.email)) {
      setProfileError("Enter a valid email address");
      return;
    }
    if (
      !isSafeText(profileForm.addressLine) ||
      !isSafeText(profileForm.townCity) ||
      !isSafeText(profileForm.postalCode)
    ) {
      setProfileError("Fields can't contain < or > characters");
      return;
    }
    const res = await axiosInstance.post("/api/profile-details", profileForm);
    setProfile(res.data);
    setEditingProfile(false);
  };

  const resetPasswordFlow = () => {
    setPwStep("idle");
    setPwForm(emptyPasswordForm);
    setPwOtp("");
    setPwError("");
  };

  const submitPasswordInit = async () => {
    setPwError("");
    const { currentPassword, newPassword, confirmPassword } = pwForm;
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwError("All fields are required");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("New passwords do not match");
      return;
    }
    if (!PASSWORD_RULE.test(newPassword)) {
      setPwError(
        "Password must be 8–15 characters with uppercase, lowercase, a number, and a special character",
      );
      return;
    }
    setPwLoading(true);
    try {
      await axiosInstance.post("/api/change-password/init", {
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setPwStep("otp");
    } catch (error) {
      setPwError(
        error.response?.data?.error || "Failed to start the password change",
      );
    } finally {
      setPwLoading(false);
    }
  };

  const submitPasswordVerify = async () => {
    setPwError("");
    if (!/^[A-Z0-9]{6}$/.test(pwOtp)) {
      setPwError("Enter the 6-character verification code");
      return;
    }
    setPwLoading(true);
    try {
      await axiosInstance.post("/api/change-password/verify", { code: pwOtp });
      setPwStep("success");
      setTimeout(resetPasswordFlow, 2200);
    } catch (error) {
      setPwError(error.response?.data?.error || "Verification failed");
    } finally {
      setPwLoading(false);
    }
  };

  const submitUsername = async () => {
    setUsernameError("");
    const trimmed = username.trim();
    if (trimmed.length < 3 || trimmed.length > 30) {
      setUsernameError("Username must be 3–30 characters");
      return;
    }
    if (!/^[a-zA-Z0-9]+( [a-zA-Z0-9]+)?$/.test(trimmed)) {
      setUsernameError("Only letters, numbers, and one single space allowed");
      return;
    }
    try {
      const res = await transactionsApi.post("/api/update-username/", {
        username: trimmed,
      });
      if (res.data.success) {
        setUsernameSuccess(trimmed);
        setUsername("");
        setShowUsernameForm(false);
        onRefreshUser?.();
      }
    } catch (err) {
      setUsernameError(err.response?.data?.error || "Failed to update username");
    }
  };

  // Detect location for the residence form when it's opened.
  useEffect(() => {
    if (!showResidenceForm) return;
    const setDefaults = () => {
      setResCountry("Kenya");
      setResTownCity("Nairobi");
      setResPostalCode("00100");
    };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const res = await axios.get(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
            );
            const addr = res.data.address || {};
            setResCountry(addr.country || "Kenya");
            setResTownCity(addr.city || addr.town || addr.village || addr.suburb || "Nairobi");
            setResPostalCode(addr.postcode || "00100");
          } catch {
            setDefaults();
          }
        },
        () => setDefaults(),
      );
    } else {
      setDefaults();
    }
  }, [showResidenceForm]);

  const submitResidence = async () => {
    const errs = {};
    if (!resAddressLine.trim()) errs.addressLine = "Address line is required";
    else if (!isSafeText(resAddressLine)) errs.addressLine = "Address can't contain < or > characters";
    else if (resAddressLine.length < 5) errs.addressLine = "At least 5 characters";
    else if (resAddressLine.length > 200) errs.addressLine = "Max 200 characters";
    if (resCountry === "Detecting...") errs.country = "Country detection failed";
    if (resTownCity === "Detecting...") errs.townCity = "Town/City detection failed";
    if (resPostalCode === "Detecting...") errs.postalCode = "Postal code detection failed";
    setResidenceErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setResidenceLoading(true);
    try {
      await transactionsApi.post("/api/update-residence/", {
        country: resCountry.trim(),
        townCity: resTownCity.trim(),
        postalCode: resPostalCode.trim(),
        addressLine: resAddressLine.trim(),
      });
      setResidenceSuccess(true);
      onRefreshUser?.();
      axiosInstance
        .get("/api/profile-details")
        .then((res) => setProfile(res.data))
        .catch(() => {});
      setTimeout(() => {
        setResidenceSuccess(false);
        setResAddressLine("");
        setShowResidenceForm(false);
      }, 2500);
    } catch (err) {
      setResidenceErrors({ server: err.response?.data?.error || "Update failed" });
    } finally {
      setResidenceLoading(false);
    }
  };

  const fetchSecondaryContacts = async () => {
    setContactsListLoading(true);
    try {
      const res = await transactionsApi.get("/api/secondary-contacts/");
      setSecondaryContacts(res.data || []);
    } catch (err) {
      // no-op — list just stays empty
    } finally {
      setContactsListLoading(false);
    }
  };

  const fetchSecondaryIds = async () => {
    setIdsListLoading(true);
    try {
      const res = await transactionsApi.get("/api/secondary-ids/");
      setSecondaryIds(res.data || []);
    } catch (err) {
      // no-op — list just stays empty
    } finally {
      setIdsListLoading(false);
    }
  };

  const submitContact = async () => {
    setContactError("");
    let finalValue = contactValue.trim();
    if (contactType === "PHONE") {
      finalValue = finalValue.replace(/\D/g, "");
      if (finalValue.startsWith("0")) finalValue = finalValue.substring(1);
      finalValue = contactCountryCode + finalValue;
    }
    if (contactType === "EMAIL" && !isValidEmail(finalValue)) {
      setContactError("Please enter a valid email address");
      return;
    }
    if (contactType === "PHONE" && finalValue.length < 10) {
      setContactError("Phone number is too short");
      return;
    }
    setContactLoading(true);
    try {
      await transactionsApi.post("/api/secondary-contact/", {
        type: contactType,
        value: finalValue,
      });
      setContactSuccess(true);
      setContactValue("");
      setContactCountryCode("+254");
      setShowContactForm(false);
      if (showContactsList) fetchSecondaryContacts();
    } catch (err) {
      setContactError(err.response?.data?.error || "Failed to add contact");
    } finally {
      setContactLoading(false);
    }
  };

  const submitSecondaryId = async () => {
    setSecIdError("");
    if (!isSafeText(secIdNumber) || !isSafeText(secIssuedCountry)) {
      setSecIdError("Fields can't contain < or > characters");
      return;
    }
    setSecIdLoading(true);
    try {
      await transactionsApi.post("/api/secondary-id/", {
        idType: secIdType.trim(),
        idNumber: secIdNumber.trim(),
        issuedCountry: secIssuedCountry.trim(),
      });
      setSecIdSuccess(true);
      setSecIdType("Government ID");
      setSecIdNumber("");
      setSecIssuedCountry("");
      setShowSecondaryIdForm(false);
      if (showIdsList) fetchSecondaryIds();
    } catch (err) {
      setSecIdError(err.response?.data?.error || "Failed to add secondary ID");
    } finally {
      setSecIdLoading(false);
    }
  };

  const submitPin = async () => {
    setPinError("");
    if (pin.length !== 4 || confirmPin.length !== 4) {
      setPinError("PIN must be exactly 4 digits");
      return;
    }
    if (pin !== confirmPin) {
      setPinError("PINs do not match");
      return;
    }
    if (WEAK_PINS.includes(pin)) {
      setPinError("Please choose a stronger PIN. Avoid obvious sequences like 1234 or 0000.");
      return;
    }
    if (/^(\d)\1{3}$/.test(pin)) {
      setPinError("PIN cannot be all identical digits (e.g. 1111)");
      return;
    }
    setPinLoading(true);
    try {
      const response = await transactionsApi.post("/api/set-pin/", { pin });
      if (response.data.success) {
        setPinSuccess(true);
        setPin("");
        setConfirmPin("");
        setShowPinForm(false);
        onRefreshUser?.();
      } else {
        setPinError(response.data.message || "Failed to set PIN");
      }
    } catch (err) {
      setPinError(
        err.response?.data?.error ||
          err.response?.data?.message ||
          "Failed to set PIN. Please try again.",
      );
    } finally {
      setPinLoading(false);
    }
  };

  if (showPhotoCapture) {
    return (
      <ProfileImageCapture
        user={user}
        onRefreshUser={onRefreshUser}
        onBack={() => setShowPhotoCapture(false)}
      />
    );
  }

  if (showKyc) {
    return (
      <KycVerification
        onRefreshUser={onRefreshUser}
        onBack={() => {
          setShowKyc(false);
          // idVerified lives on /api/profile-details, not /api/dashboard —
          // onRefreshUser alone wouldn't update the Identification row here.
          axiosInstance
            .get("/api/profile-details")
            .then((res) => setProfile(res.data))
            .catch(() => {});
        }}
      />
    );
  }

  return (
    <section className={flowCardClass}>
      <div className={flowHeaderClass}>
        <Button variant="ghost" onClick={onBack} className={backBtnClass}>
          <ChevronLeft size={18} /> Back
        </Button>
      </div>
      <h2 className="text-[1.6rem] font-bold text-foreground mb-2">Account</h2>

      <div className="flex items-center gap-4 -mt-2 mb-2">
        <img
          src={
            user?.profileImageUrl
              ? `${API_URL}${user.profileImageUrl}`
              : "/images/default-user.png"
          }
          alt="Profile"
          className="w-16 h-16 rounded-full object-cover ring-2 ring-white/[0.06]"
          onError={(e) => {
            e.target.src = "/images/default-user.png";
          }}
        />
        <button
          type="button"
          onClick={() => setShowPhotoCapture(true)}
          className="inline-flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.08] rounded-md px-3.5 py-1 text-gold text-[0.78rem] font-semibold cursor-pointer transition-colors hover:bg-white/[0.07] hover:border-gold/30"
        >
          <Camera size={14} /> Change photo
        </button>
      </div>

      <div className={groupClass}>
        <div className={sectionHeaderClass}>
          <h3 className={groupTitleClass}>Profile</h3>
          {!editingProfile && profile && (
            <button className={headerActionClass} onClick={startEditProfile}>
              Edit
            </button>
          )}
        </div>

        {!profile ? (
          <p className={mutedClass}>Loading profile…</p>
        ) : editingProfile ? (
          <div className={flowFormClass}>
            <Label className={formLabelClass}>Phone</Label>
            <Input
              className={formInputClass}
              value={profileForm.phone}
              onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
            />
            <Label className={formLabelClass}>Email</Label>
            <Input
              className={formInputClass}
              value={profileForm.email}
              onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
            />
            <Label className={formLabelClass}>Address</Label>
            <Input
              className={formInputClass}
              value={profileForm.addressLine}
              onChange={(e) =>
                setProfileForm({ ...profileForm, addressLine: e.target.value })
              }
            />
            <Label className={formLabelClass}>City / Town</Label>
            <Input
              className={formInputClass}
              value={profileForm.townCity}
              onChange={(e) => setProfileForm({ ...profileForm, townCity: e.target.value })}
            />
            <Label className={formLabelClass}>Postal code</Label>
            <Input
              className={formInputClass}
              value={profileForm.postalCode}
              onChange={(e) =>
                setProfileForm({ ...profileForm, postalCode: e.target.value })
              }
            />
            {profileError && (
              <p className="text-xs text-red-400 -mt-[0.4rem]">{profileError}</p>
            )}
            <Button className={primaryBtnClass} onClick={saveProfile}>
              Save changes
            </Button>
            <button
              className={addFavouriteBtnClass}
              onClick={() => {
                setEditingProfile(false);
                setProfileError("");
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex flex-col">
            <ProfileRow
              label="Full name"
              value={`${profile.firstname || ""} ${profile.surname || ""}`.trim()}
            />
            <ProfileRow label="Date of birth" value={profile.dob} />
            <ProfileRow label="Gender" value={profile.gender} />
            <ProfileRow
              label="Phone"
              value={profile.phone}
              verified={profile.phoneVerified}
            />
            <ProfileRow
              label="Email"
              value={profile.email}
              verified={profile.emailVerified}
            />
            <ProfileRow
              label="Address"
              value={[profile.addressLine, profile.townCity, profile.postalCode]
                .filter(Boolean)
                .join(", ")}
            />
            <ProfileRow
              label="Residence"
              value={[profile.townCity, profile.residenceCountry]
                .filter(Boolean)
                .join(", ")}
            />
            <ProfileRow
              label="Identification"
              value={[profile.idType, profile.idNumber].filter(Boolean).join(" · ")}
              verified={profile.idVerified}
            />
            {!profile.idVerified && (
              <button
                className={addFavouriteBtnClass}
                onClick={() => setShowKyc(true)}
              >
                Verify identity
              </button>
            )}
          </div>
        )}
      </div>

      <div className={groupClass}>
        <div className={sectionHeaderClass}>
          <h3 className={groupTitleClass}>Membership</h3>
        </div>
        <div className={methodCardClass}>
          <span>{user?.plan === "pro" ? "Payzarc Pro" : "Basic (Free)"}</span>
          {user?.plan === "pro" && (
            <span className="text-success text-xs font-semibold">Active</span>
          )}
        </div>

        {user?.plan === "pro" ? (
          <button
            className={addFavouriteBtnClass}
            onClick={cancelPro}
            disabled={subLoading}
          >
            {subLoading ? "Cancelling…" : "Cancel Pro"}
          </button>
        ) : showUpgrade ? (
          <div className={flowFormClass}>
            <p className={mutedClass}>
              Unlimited Send to Many and more — ${PRO_PLAN_PRICE}/mo.
            </p>
            {chargeOptions.length === 0 ? (
              <p className={mutedClass}>
                Add a card, bank, or mobile money account below to upgrade.
              </p>
            ) : (
              <>
                <Label className={formLabelClass}>Charge to</Label>
                <select
                  className={formInputClass}
                  value={chargeTo}
                  onChange={(e) => setChargeTo(e.target.value)}
                >
                  <option value="">Select a payment method</option>
                  {chargeOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {subError && (
                  <p className="text-xs text-red-400 -mt-[0.4rem]">{subError}</p>
                )}
                <Button
                  className={primaryBtnClass}
                  onClick={upgradeToPro}
                  disabled={subLoading}
                >
                  {subLoading ? "Upgrading…" : `Pay $${PRO_PLAN_PRICE} & upgrade`}
                </Button>
              </>
            )}
            <button
              className={addFavouriteBtnClass}
              onClick={() => {
                setShowUpgrade(false);
                setSubError("");
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            className={addFavouriteBtnClass}
            onClick={() => setShowUpgrade(true)}
          >
            Upgrade to Pro
          </button>
        )}
      </div>

      <div className={groupClass}>
        <h3 className={groupTitleClass}>Security</h3>

        {pwStep === "idle" && (
          <button className={addFavouriteBtnClass} onClick={() => setPwStep("form")}>
            Change password
          </button>
        )}

        {pwStep === "form" && (
          <div className={flowFormClass}>
            <Label className={formLabelClass}>Current password</Label>
            <Input
              type="password"
              className={formInputClass}
              value={pwForm.currentPassword}
              onChange={(e) =>
                setPwForm({ ...pwForm, currentPassword: e.target.value })
              }
            />
            <Label className={formLabelClass}>New password</Label>
            <Input
              type="password"
              className={formInputClass}
              value={pwForm.newPassword}
              onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
            />
            <Label className={formLabelClass}>Confirm new password</Label>
            <Input
              type="password"
              className={formInputClass}
              value={pwForm.confirmPassword}
              onChange={(e) =>
                setPwForm({ ...pwForm, confirmPassword: e.target.value })
              }
            />
            {pwError && <p className="text-xs text-red-400 -mt-[0.4rem]">{pwError}</p>}
            <Button
              className={primaryBtnClass}
              onClick={submitPasswordInit}
              disabled={pwLoading}
            >
              {pwLoading ? "Sending code…" : "Send verification code"}
            </Button>
            <button className={addFavouriteBtnClass} onClick={resetPasswordFlow}>
              Cancel
            </button>
          </div>
        )}

        {pwStep === "otp" && (
          <div className={flowFormClass}>
            <p className={mutedClass}>
              We sent a 6-character code to{" "}
              {user?.email || profile?.email || "your email"}.
            </p>
            <Label className={formLabelClass}>Verification code</Label>
            <Input
              className={formInputClass}
              maxLength={6}
              placeholder="000000"
              value={pwOtp}
              onChange={(e) =>
                setPwOtp(e.target.value.replace(/\W/g, "").toUpperCase().slice(0, 6))
              }
            />
            {pwError && <p className="text-xs text-red-400 -mt-[0.4rem]">{pwError}</p>}
            <Button
              className={primaryBtnClass}
              onClick={submitPasswordVerify}
              disabled={pwLoading}
            >
              {pwLoading ? "Verifying…" : "Verify & update password"}
            </Button>
            <button
              className={addFavouriteBtnClass}
              onClick={() => {
                setPwStep("form");
                setPwOtp("");
                setPwError("");
              }}
            >
              Back
            </button>
          </div>
        )}

        {pwStep === "success" && (
          <p className="m-0 text-[0.85rem] font-semibold text-success">
            Password updated successfully.
          </p>
        )}
      </div>

      {/* Username */}
      <div className={groupClass}>
        <h3 className={groupTitleClass}>Username</h3>
        {usernameSuccess && (
          <p className="m-0 text-[0.85rem] font-semibold text-success">
            Username updated to "{usernameSuccess}".
          </p>
        )}
        {!showUsernameForm ? (
          <button className={addFavouriteBtnClass} onClick={() => setShowUsernameForm(true)}>
            Change username
          </button>
        ) : (
          <div className={flowFormClass}>
            <Label className={formLabelClass}>New username</Label>
            <Input
              className={formInputClass}
              placeholder="3-30 letters, numbers, one space"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            {usernameError && (
              <p className="text-xs text-red-400 -mt-[0.4rem]">{usernameError}</p>
            )}
            <Button className={primaryBtnClass} onClick={submitUsername}>
              Save username
            </Button>
            <button
              className={addFavouriteBtnClass}
              onClick={() => {
                setShowUsernameForm(false);
                setUsername("");
                setUsernameError("");
              }}
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Residence */}
      <div className={groupClass}>
        <h3 className={groupTitleClass}>Residence</h3>
        {residenceSuccess && (
          <p className="m-0 text-[0.85rem] font-semibold text-success">
            Residence updated successfully.
          </p>
        )}
        {!showResidenceForm ? (
          <button className={addFavouriteBtnClass} onClick={() => setShowResidenceForm(true)}>
            Update residence
          </button>
        ) : (
          <div className={flowFormClass}>
            <Label className={formLabelClass}>Country (detected)</Label>
            <Input className={formInputClass} value={resCountry} disabled />
            {residenceErrors.country && (
              <p className="text-xs text-red-400 -mt-[0.4rem]">{residenceErrors.country}</p>
            )}
            <Label className={formLabelClass}>Town / City (detected)</Label>
            <Input className={formInputClass} value={resTownCity} disabled />
            {residenceErrors.townCity && (
              <p className="text-xs text-red-400 -mt-[0.4rem]">{residenceErrors.townCity}</p>
            )}
            <Label className={formLabelClass}>Postal code (detected)</Label>
            <Input className={formInputClass} value={resPostalCode} disabled />
            {residenceErrors.postalCode && (
              <p className="text-xs text-red-400 -mt-[0.4rem]">{residenceErrors.postalCode}</p>
            )}
            <Label className={formLabelClass}>Address line</Label>
            <Input
              className={formInputClass}
              placeholder="e.g. 123 Langata Road, Apt 4B"
              value={resAddressLine}
              onChange={(e) => setResAddressLine(e.target.value)}
            />
            {residenceErrors.addressLine && (
              <p className="text-xs text-red-400 -mt-[0.4rem]">{residenceErrors.addressLine}</p>
            )}
            {residenceErrors.server && (
              <p className="text-xs text-red-400 -mt-[0.4rem]">{residenceErrors.server}</p>
            )}
            <Button
              className={primaryBtnClass}
              onClick={submitResidence}
              disabled={residenceLoading}
            >
              {residenceLoading ? "Saving…" : "Update residence"}
            </Button>
            <button className={addFavouriteBtnClass} onClick={() => setShowResidenceForm(false)}>
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Secondary contacts */}
      <div className={groupClass}>
        <div className={sectionHeaderClass}>
          <h3 className={groupTitleClass}>Secondary contacts</h3>
          <button
            className={headerActionClass}
            onClick={() => {
              setShowContactsList((v) => !v);
              if (!showContactsList) fetchSecondaryContacts();
            }}
          >
            {showContactsList ? "Hide list" : "View list"}
          </button>
        </div>
        {contactSuccess && (
          <p className="m-0 text-[0.85rem] font-semibold text-success">
            Secondary contact added.
          </p>
        )}
        {showContactsList && (
          <div className="flex flex-col mb-2">
            {contactsListLoading ? (
              <p className={mutedClass}>Loading contacts…</p>
            ) : secondaryContacts.length === 0 ? (
              <p className={mutedClass}>No secondary contacts added yet.</p>
            ) : (
              secondaryContacts.map((contact) => (
                <div key={contact.id} className={methodCardClass}>
                  <span>
                    {contact.type}: {contact.value}
                  </span>
                  <span className={contact.isVerified ? "text-success text-xs" : "text-[var(--soft)] text-xs"}>
                    {contact.isVerified ? "Verified" : "Not verified"}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
        {!showContactForm ? (
          <button className={addFavouriteBtnClass} onClick={() => setShowContactForm(true)}>
            + Add secondary contact
          </button>
        ) : (
          <div className={flowFormClass}>
            <Label className={formLabelClass}>Type</Label>
            <select
              className={formInputClass}
              value={contactType}
              onChange={(e) => {
                setContactType(e.target.value);
                setContactError("");
              }}
            >
              <option value="EMAIL">Email</option>
              <option value="PHONE">Phone</option>
            </select>
            {contactType === "PHONE" && (
              <>
                <Label className={formLabelClass}>Country code</Label>
                <select
                  className={formInputClass}
                  value={contactCountryCode}
                  onChange={(e) => setContactCountryCode(e.target.value)}
                >
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>
                      {isoToFlagEmoji(c.flag)} {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </>
            )}
            <Label className={formLabelClass}>
              {contactType === "EMAIL" ? "Secondary email address" : "Phone number"}
            </Label>
            <Input
              type={contactType === "EMAIL" ? "email" : "tel"}
              className={formInputClass}
              placeholder={contactType === "EMAIL" ? "you@example.com" : "e.g. 0711223334"}
              value={contactValue}
              onChange={(e) => {
                setContactValue(e.target.value);
                setContactError("");
              }}
            />
            {contactError && (
              <p className="text-xs text-red-400 -mt-[0.4rem]">{contactError}</p>
            )}
            <Button className={primaryBtnClass} onClick={submitContact} disabled={contactLoading}>
              {contactLoading ? "Adding…" : "Add contact"}
            </Button>
            <button className={addFavouriteBtnClass} onClick={() => setShowContactForm(false)}>
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Secondary IDs */}
      <div className={groupClass}>
        <div className={sectionHeaderClass}>
          <h3 className={groupTitleClass}>Secondary IDs</h3>
          <button
            className={headerActionClass}
            onClick={() => {
              setShowIdsList((v) => !v);
              if (!showIdsList) fetchSecondaryIds();
            }}
          >
            {showIdsList ? "Hide list" : "View list"}
          </button>
        </div>
        {secIdSuccess && (
          <p className="m-0 text-[0.85rem] font-semibold text-success">
            Secondary ID added.
          </p>
        )}
        {showIdsList && (
          <div className="flex flex-col mb-2">
            {idsListLoading ? (
              <p className={mutedClass}>Loading IDs…</p>
            ) : secondaryIds.length === 0 ? (
              <p className={mutedClass}>No secondary IDs added yet.</p>
            ) : (
              secondaryIds.map((id) => (
                <div key={id.id} className={methodCardClass}>
                  <span>{id.idType}</span>
                  <span className={mutedClass}>
                    {id.idNumber} · {id.issuedCountry}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
        {!showSecondaryIdForm ? (
          <button className={addFavouriteBtnClass} onClick={() => setShowSecondaryIdForm(true)}>
            + Add secondary ID
          </button>
        ) : (
          <div className={flowFormClass}>
            <Label className={formLabelClass}>ID type</Label>
            <select
              className={formInputClass}
              value={secIdType}
              onChange={(e) => setSecIdType(e.target.value)}
            >
              <option value="Government ID">Government ID</option>
              <option value="Passport">Passport</option>
              <option value="Military ID">Military ID</option>
            </select>
            <Label className={formLabelClass}>ID number</Label>
            <Input
              className={formInputClass}
              value={secIdNumber}
              onChange={(e) => setSecIdNumber(e.target.value)}
            />
            <Label className={formLabelClass}>Issued country</Label>
            <select
              className={formInputClass}
              value={secIssuedCountry}
              onChange={(e) => setSecIssuedCountry(e.target.value)}
            >
              <option value="">Select issued country</option>
              {countries.map((c) => (
                <option key={c.name} value={c.name}>
                  {isoToFlagEmoji(c.flag)} {c.name}
                </option>
              ))}
            </select>
            {secIdError && (
              <p className="text-xs text-red-400 -mt-[0.4rem]">{secIdError}</p>
            )}
            <Button className={primaryBtnClass} onClick={submitSecondaryId} disabled={secIdLoading}>
              {secIdLoading ? "Adding…" : "Add secondary ID"}
            </Button>
            <button className={addFavouriteBtnClass} onClick={() => setShowSecondaryIdForm(false)}>
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Transaction PIN */}
      <div className={groupClass}>
        <h3 className={groupTitleClass}>Transaction PIN</h3>
        {pinSuccess && (
          <p className="m-0 text-[0.85rem] font-semibold text-success">
            Transaction PIN set — you can now perform secure transactions.
          </p>
        )}
        {!showPinForm ? (
          <button className={addFavouriteBtnClass} onClick={() => setShowPinForm(true)}>
            Set transaction PIN
          </button>
        ) : (
          <div className={flowFormClass}>
            <Label className={formLabelClass}>Enter 4-digit PIN</Label>
            <Input
              type={showPinInput ? "text" : "password"}
              maxLength={4}
              className={formInputClass}
              placeholder="••••"
              value={pin}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                setPin(value);
                setPinError("");
                setPinStrength(getPinStrength(value));
                if (confirmPin) setPinsMatch(value === confirmPin);
              }}
            />
            <button
              type="button"
              className={addFavouriteBtnClass}
              onClick={() => setShowPinInput((v) => !v)}
            >
              {showPinInput ? "Hide PIN" : "Show PIN"}
            </button>
            {pinStrength.level !== "none" && (
              <p
                className="text-xs font-semibold -mt-[0.4rem]"
                style={{ color: pinStrength.color }}
              >
                Strength: {pinStrength.label}
              </p>
            )}
            <Label className={formLabelClass}>Confirm PIN</Label>
            <Input
              type={showConfirmPinInput ? "text" : "password"}
              maxLength={4}
              className={formInputClass}
              placeholder="••••"
              value={confirmPin}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                setConfirmPin(value);
                setPinError("");
                setPinsMatch(pin === value && value.length === 4);
              }}
            />
            <button
              type="button"
              className={addFavouriteBtnClass}
              onClick={() => setShowConfirmPinInput((v) => !v)}
            >
              {showConfirmPinInput ? "Hide PIN" : "Show PIN"}
            </button>
            {confirmPin.length > 0 && (
              <p
                className="text-xs font-semibold -mt-[0.4rem]"
                style={{ color: pinsMatch ? "#22c55e" : "#ef4444" }}
              >
                {pinsMatch ? "PINs match" : "PINs do not match"}
              </p>
            )}
            {pinError && <p className="text-xs text-red-400 -mt-[0.4rem]">{pinError}</p>}
            <Button
              className={primaryBtnClass}
              onClick={submitPin}
              disabled={pinLoading || pin.length !== 4 || confirmPin.length !== 4 || !pinsMatch}
            >
              {pinLoading ? "Activating…" : "Set PIN"}
            </Button>
            <button className={addFavouriteBtnClass} onClick={() => setShowPinForm(false)}>
              Cancel
            </button>
            <p className={mutedClass}>
              This PIN will be required for all transactions. Keep it secure.
            </p>
          </div>
        )}
      </div>

      <div className={groupClass}>
        <h3 className={groupTitleClass}>Bank accounts</h3>
        {methods.banks.map((b) => (
          <div key={b.id} className={methodCardClass}>
            <span>{b.bankName}</span>
            <span className={mutedClass}>
              •••• {String(b.accountNumber).slice(-4)} · {b.accountName}
            </span>
          </div>
        ))}
        {methods.banks.length === 0 && (
          <p className={mutedClass}>No bank linked yet — add one below.</p>
        )}

        {showAddBank ? (
          <div className={flowFormClass}>
            <Label className={formLabelClass}>Bank</Label>
            <select
              className={formInputClass}
              value={newBank.bankName}
              onChange={(e) => setNewBank({ ...newBank, bankName: e.target.value })}
            >
              <option value="">Select a bank</option>
              {region.partnerBanks.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
            <Label className={formLabelClass}>Account number</Label>
            <Input
              className={formInputClass}
              value={newBank.accountNumber}
              onChange={(e) => setNewBank({ ...newBank, accountNumber: e.target.value })}
            />
            <Label className={formLabelClass}>Account name</Label>
            <Input
              className={formInputClass}
              value={newBank.accountName}
              onChange={(e) => setNewBank({ ...newBank, accountName: e.target.value })}
            />
            {bankError && (
              <p className="text-xs text-red-400 -mt-[0.4rem]">{bankError}</p>
            )}
            <Button className={primaryBtnClass} onClick={addBank}>
              Save bank account
            </Button>
          </div>
        ) : (
          <button
            className={addFavouriteBtnClass}
            onClick={() => {
              setShowAddBank(true);
              setBankError("");
            }}
          >
            + Add bank
          </button>
        )}
      </div>

      {region.mobileMoney.length > 0 && (
        <div className={groupClass}>
          <h3 className={groupTitleClass}>Mobile money</h3>
          {methods.mobileMoney.map((m) => (
            <div key={m.id} className={methodCardClass}>
              <span>{m.provider}</span>
              <span className={mutedClass}>
                •••• {String(m.phoneNumber).slice(-4)}
              </span>
            </div>
          ))}
          {methods.mobileMoney.length === 0 && (
            <p className={mutedClass}>
              No mobile money account linked yet — add one below.
            </p>
          )}

          {showAddMobile ? (
            <div className={flowFormClass}>
              <Label className={formLabelClass}>Provider</Label>
              <select
                className={formInputClass}
                value={newMobile.provider}
                onChange={(e) =>
                  setNewMobile({ ...newMobile, provider: e.target.value })
                }
              >
                <option value="">Select a provider</option>
                {region.mobileMoney.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <Label className={formLabelClass}>Phone number</Label>
              <Input
                className={formInputClass}
                placeholder="e.g. 254712345678"
                value={newMobile.phoneNumber}
                onChange={(e) =>
                  setNewMobile({ ...newMobile, phoneNumber: e.target.value })
                }
              />
              {mobileError && (
                <p className="text-xs text-red-400 -mt-[0.4rem]">{mobileError}</p>
              )}
              <Button className={primaryBtnClass} onClick={addMobile}>
                Save mobile money account
              </Button>
            </div>
          ) : (
            <button
              className={addFavouriteBtnClass}
              onClick={() => {
                setShowAddMobile(true);
                setMobileError("");
              }}
            >
              + Add mobile money account
            </button>
          )}
        </div>
      )}

      <div className={groupClass}>
        <h3 className={groupTitleClass}>Cards</h3>
        {methods.cards.map((c) => (
          <div key={c.id} className={methodCardClass}>
            <span>
              {c.brand} •••• {c.last4}
            </span>
            <span className={mutedClass}>
              {c.cardholderName} · exp {c.expiry}
            </span>
          </div>
        ))}
        {methods.cards.length === 0 && (
          <p className={mutedClass}>No card linked yet — add one below.</p>
        )}

        {showAddCard ? (
          <div className={flowFormClass}>
            <Label className={formLabelClass}>Cardholder name</Label>
            <Input
              className={formInputClass}
              value={newCard.cardholderName}
              onChange={(e) => setNewCard({ ...newCard, cardholderName: e.target.value })}
            />
            <Label className={formLabelClass}>Card number</Label>
            <Input
              className={formInputClass}
              maxLength={19}
              placeholder="4111 1111 1111 1111"
              value={newCard.cardNumber}
              onChange={(e) => setNewCard({ ...newCard, cardNumber: e.target.value })}
            />
            <Label className={formLabelClass}>Expiry (MM/YY)</Label>
            <Input
              className={formInputClass}
              maxLength={5}
              placeholder="MM/YY"
              value={newCard.expiry}
              onChange={(e) => setNewCard({ ...newCard, expiry: e.target.value })}
            />
            {cardError && (
              <p className="text-xs text-red-400 -mt-[0.4rem]">{cardError}</p>
            )}
            <Button className={primaryBtnClass} onClick={addCard}>
              Save card
            </Button>
          </div>
        ) : (
          <button
            className={addFavouriteBtnClass}
            onClick={() => {
              setShowAddCard(true);
              setCardError("");
            }}
          >
            + Add card
          </button>
        )}
      </div>

      <div className="pt-2 border-t border-white/[0.06]">
        <button type="button" className={logoutBtnClass} onClick={onLogout}>
          <LogOut size={16} /> Log out
        </button>
      </div>
    </section>
  );
}

export default PaymentMethods;
