import React, { useState, useEffect } from "react";
import { ArrowLeft, BadgeCheck, Camera, LogOut } from "lucide-react";
import { transactionsApi } from "../../utility/axiosInstance";
import { API_URL } from "../../utility/constants";
import { countries } from "../../utility/countries";
import { getCurrentCountry } from "../../utility/getCurrentCountry";
import { getRegionProviders } from "../../utility/regionProviders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ProfileImageCapture from "./ProfileImageCapture";

const emptyBank = { bankName: "", accountNumber: "", accountName: "" };
const emptyCard = { cardholderName: "", cardNumber: "", expiry: "" };
const emptyMobile = { provider: "", phoneNumber: "" };
const emptyPasswordForm = { currentPassword: "", newPassword: "", confirmPassword: "" };
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,15}$/;

// Same card/flow/form class strings Home.js uses (restyled to match the
// rest of the dashboard: flat bg-card, no border, rounded-2xl, translucent
// white/[0.0X] surfaces for inputs/method cards) — kept here too since this
// is a standalone page, not mounted inside Home's balance card.
const flowCardClass =
  "relative p-8 w-full max-w-[600px] mx-auto min-h-[560px] flex flex-col gap-7 bg-card rounded-2xl animate-flow-fade-in max-[640px]:p-6 max-[640px]:px-5 max-[640px]:gap-6 max-[640px]:min-h-[480px]";
const flowHeaderClass =
  "absolute left-0 w-full bottom-full mb-3 grid grid-cols-[1fr_auto_1fr] items-center text-white";
const backBtnClass =
  "col-start-1 justify-self-start h-auto gap-1 px-1 py-1.5 text-white text-[0.9rem] font-semibold transition-opacity duration-200 hover:bg-transparent hover:text-white hover:opacity-75 [&_svg]:size-auto";
const formLabelClass =
  "flex items-center justify-between text-[11px] font-medium text-muted-foreground uppercase tracking-wider -mb-[0.4rem]";
const formInputClass =
  "w-full h-auto bg-white/[0.03] border-white/[0.06] rounded-xl px-4 py-3.5 text-foreground text-base md:text-base placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-gold/[0.08] focus-visible:border-gold/30 focus-visible:bg-white/[0.07] shadow-none transition-colors duration-200";
const primaryBtnClass =
  "w-full h-auto rounded-xl px-5 py-3.5 text-base font-bold text-black transition-all duration-200 hover:bg-primary active:scale-[0.97] disabled:opacity-60 disabled:active:scale-100 mt-1 shadow-lg shadow-gold/10 hover:shadow-gold/20";
const addFavouriteBtnClass =
  "self-start bg-transparent border-none text-gold text-[0.8rem] font-semibold cursor-pointer p-0 -mt-[0.6rem] transition-opacity hover:opacity-75";
const flowFormClass =
  "flex flex-col gap-[1.1rem] w-full max-w-[420px] mx-auto max-[640px]:max-w-full";
const sectionHeaderClass = "flex justify-between items-center mb-8";
const groupClass = "flex flex-col gap-[0.6rem] mb-6";
const groupTitleClass = "m-0 text-[0.95rem] text-foreground";
const methodCardClass =
  "flex justify-between items-center bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-[0.85rem] text-sm font-semibold text-foreground";
const mutedClass = "text-[var(--muted)] font-medium text-xs";
const logoutBtnClass =
  "self-start inline-flex items-center gap-2 bg-transparent border-none text-destructive text-[0.85rem] font-semibold cursor-pointer p-0 transition-opacity hover:opacity-75";

function ProfileRow({ label, value, verified }) {
  return (
    <div className="flex justify-between items-center gap-3 py-[0.65rem] border-b border-white/[0.06] text-[0.85rem] last:border-b-0">
      <span className="text-[var(--muted)] font-medium shrink-0">{label}</span>
      <span className="text-foreground font-semibold text-right flex items-center gap-[5px]">
        {value || "—"}
        {verified !== undefined && (
          <BadgeCheck
            size={14}
            className={verified ? "text-success shrink-0" : "text-[var(--muted)] shrink-0"}
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
  const [showAddBank, setShowAddBank] = useState(false);
  const [showAddCard, setShowAddCard] = useState(false);
  const [showAddMobile, setShowAddMobile] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState(null);
  const [newBank, setNewBank] = useState(emptyBank);
  const [newCard, setNewCard] = useState(emptyCard);
  const [newMobile, setNewMobile] = useState(emptyMobile);

  // Inline change-password flow — "idle" (just the button) -> "form"
  // (current/new/confirm) -> "otp" (code entry) -> "success". Kept as part
  // of this page's own sections rather than swapping to a separate screen.
  const [pwStep, setPwStep] = useState("idle");
  const [pwForm, setPwForm] = useState(emptyPasswordForm);
  const [pwOtp, setPwOtp] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const region = getRegionProviders(myCountry);

  useEffect(() => {
    transactionsApi
      .get("/api/profile-details/")
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
    if (!newBank.bankName || !newBank.accountNumber || !newBank.accountName) return;
    const res = await transactionsApi.post("/api/payment-methods/banks/", newBank);
    setMethods((m) => ({ ...m, banks: res.data || [] }));
    setNewBank(emptyBank);
    setShowAddBank(false);
  };

  const addCard = async () => {
    if (!newCard.cardholderName || !newCard.cardNumber || !newCard.expiry) return;
    const res = await transactionsApi.post("/api/payment-methods/cards/", newCard);
    setMethods((m) => ({ ...m, cards: res.data || [] }));
    setNewCard(emptyCard);
    setShowAddCard(false);
  };

  const addMobile = async () => {
    if (!newMobile.provider || !newMobile.phoneNumber) return;
    const res = await transactionsApi.post(
      "/api/payment-methods/mobile-money/",
      newMobile,
    );
    setMethods((m) => ({ ...m, mobileMoney: res.data || [] }));
    setNewMobile(emptyMobile);
    setShowAddMobile(false);
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
    const res = await transactionsApi.post("/api/profile-details/", profileForm);
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
      await transactionsApi.post("/api/change-password/init/", {
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
      await transactionsApi.post("/api/change-password/verify/", { code: pwOtp });
      setPwStep("success");
      setTimeout(resetPasswordFlow, 2200);
    } catch (error) {
      setPwError(error.response?.data?.error || "Verification failed");
    } finally {
      setPwLoading(false);
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

  return (
    <section className={flowCardClass}>
      <div className={flowHeaderClass}>
        <Button variant="ghost" onClick={onBack} className={backBtnClass}>
          <ArrowLeft size={18} /> Back
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
          className="inline-flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.08] rounded-full px-3.5 py-1.5 text-gold text-[0.78rem] font-semibold cursor-pointer transition-colors hover:bg-white/[0.07] hover:border-gold/30"
        >
          <Camera size={14} /> Change photo
        </button>
      </div>

      <div className={groupClass}>
        <div className={sectionHeaderClass}>
          <h3 className={groupTitleClass}>Profile</h3>
          {!editingProfile && profile && (
            <button className={addFavouriteBtnClass} onClick={startEditProfile}>
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
            <Button className={primaryBtnClass} onClick={saveProfile}>
              Save changes
            </Button>
            <button className={addFavouriteBtnClass} onClick={() => setEditingProfile(false)}>
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
          </div>
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
            <Button className={primaryBtnClass} onClick={addBank}>
              Save bank account
            </Button>
          </div>
        ) : (
          <button className={addFavouriteBtnClass} onClick={() => setShowAddBank(true)}>
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
              <Button className={primaryBtnClass} onClick={addMobile}>
                Save mobile money account
              </Button>
            </div>
          ) : (
            <button
              className={addFavouriteBtnClass}
              onClick={() => setShowAddMobile(true)}
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
            <Button className={primaryBtnClass} onClick={addCard}>
              Save card
            </Button>
          </div>
        ) : (
          <button className={addFavouriteBtnClass} onClick={() => setShowAddCard(true)}>
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
