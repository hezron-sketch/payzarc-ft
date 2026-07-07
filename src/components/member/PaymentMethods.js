import React, { useState, useEffect } from "react";
import { ArrowLeft, BadgeCheck } from "lucide-react";
import { transactionsApi } from "../../utility/axiosInstance";
import { countries } from "../../utility/countries";
import { getCurrentCountry } from "../../utility/getCurrentCountry";
import { getRegionProviders } from "../../utility/regionProviders";
import homeStyles from "./Home.module.css";
import styles from "./PaymentMethods.module.css";

const emptyBank = { bankName: "", accountNumber: "", accountName: "" };
const emptyCard = { cardholderName: "", cardNumber: "", expiry: "" };
const emptyMobile = { provider: "", phoneNumber: "" };
const emptyPasswordForm = { currentPassword: "", newPassword: "", confirmPassword: "" };
const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,15}$/;

function ProfileRow({ label, value, verified }) {
  return (
    <div className={styles.profileRow}>
      <span className={styles.profileLabel}>{label}</span>
      <span className={styles.profileValue}>
        {value || "—"}
        {verified !== undefined && (
          <BadgeCheck
            size={14}
            className={verified ? styles.verifiedIcon : styles.unverifiedIcon}
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
function PaymentMethods({ onBack, user }) {
  const [profile, setProfile] = useState(null);
  const [myCountry, setMyCountry] = useState(null);
  const [methods, setMethods] = useState({ banks: [], cards: [], mobileMoney: [] });
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

  return (
    <section
      className={`${homeStyles.flowCard} ${homeStyles.flowSection} ${styles.entrance}`}
    >
      <div className={homeStyles.flowHeader}>
        <button className={homeStyles.backBtn} onClick={onBack}>
          <ArrowLeft size={18} /> Back
        </button>
      </div>
      <h2 className={styles.pageTitle}>Account</h2>

      <div className={styles.group}>
        <div className={homeStyles.sectionHeader}>
          <h3 className={styles.groupTitle}>Profile</h3>
          {!editingProfile && profile && (
            <button className={homeStyles.addFavouriteBtn} onClick={startEditProfile}>
              Edit
            </button>
          )}
        </div>

        {!profile ? (
          <p className={styles.muted}>Loading profile…</p>
        ) : editingProfile ? (
          <div className={homeStyles.flowForm}>
            <label className={homeStyles.formLabel}>Phone</label>
            <input
              className={homeStyles.formInput}
              value={profileForm.phone}
              onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
            />
            <label className={homeStyles.formLabel}>Email</label>
            <input
              className={homeStyles.formInput}
              value={profileForm.email}
              onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
            />
            <label className={homeStyles.formLabel}>Address</label>
            <input
              className={homeStyles.formInput}
              value={profileForm.addressLine}
              onChange={(e) =>
                setProfileForm({ ...profileForm, addressLine: e.target.value })
              }
            />
            <label className={homeStyles.formLabel}>City / Town</label>
            <input
              className={homeStyles.formInput}
              value={profileForm.townCity}
              onChange={(e) => setProfileForm({ ...profileForm, townCity: e.target.value })}
            />
            <label className={homeStyles.formLabel}>Postal code</label>
            <input
              className={homeStyles.formInput}
              value={profileForm.postalCode}
              onChange={(e) =>
                setProfileForm({ ...profileForm, postalCode: e.target.value })
              }
            />
            <button className={homeStyles.primaryBtn} onClick={saveProfile}>
              Save changes
            </button>
            <button
              className={homeStyles.addFavouriteBtn}
              onClick={() => setEditingProfile(false)}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className={styles.profileGrid}>
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

      <div className={styles.group}>
        <h3 className={styles.groupTitle}>Security</h3>

        {pwStep === "idle" && (
          <button
            className={homeStyles.addFavouriteBtn}
            onClick={() => setPwStep("form")}
          >
            Change password
          </button>
        )}

        {pwStep === "form" && (
          <div className={homeStyles.flowForm}>
            <label className={homeStyles.formLabel}>Current password</label>
            <input
              type="password"
              className={homeStyles.formInput}
              value={pwForm.currentPassword}
              onChange={(e) =>
                setPwForm({ ...pwForm, currentPassword: e.target.value })
              }
            />
            <label className={homeStyles.formLabel}>New password</label>
            <input
              type="password"
              className={homeStyles.formInput}
              value={pwForm.newPassword}
              onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
            />
            <label className={homeStyles.formLabel}>Confirm new password</label>
            <input
              type="password"
              className={homeStyles.formInput}
              value={pwForm.confirmPassword}
              onChange={(e) =>
                setPwForm({ ...pwForm, confirmPassword: e.target.value })
              }
            />
            {pwError && <p className={styles.pwError}>{pwError}</p>}
            <button
              className={homeStyles.primaryBtn}
              onClick={submitPasswordInit}
              disabled={pwLoading}
            >
              {pwLoading ? "Sending code…" : "Send verification code"}
            </button>
            <button className={homeStyles.addFavouriteBtn} onClick={resetPasswordFlow}>
              Cancel
            </button>
          </div>
        )}

        {pwStep === "otp" && (
          <div className={homeStyles.flowForm}>
            <p className={styles.muted}>
              We sent a 6-character code to{" "}
              {user?.email || profile?.email || "your email"}.
            </p>
            <label className={homeStyles.formLabel}>Verification code</label>
            <input
              className={homeStyles.formInput}
              maxLength={6}
              placeholder="000000"
              value={pwOtp}
              onChange={(e) =>
                setPwOtp(e.target.value.replace(/\W/g, "").toUpperCase().slice(0, 6))
              }
            />
            {pwError && <p className={styles.pwError}>{pwError}</p>}
            <button
              className={homeStyles.primaryBtn}
              onClick={submitPasswordVerify}
              disabled={pwLoading}
            >
              {pwLoading ? "Verifying…" : "Verify & update password"}
            </button>
            <button
              className={homeStyles.addFavouriteBtn}
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
          <p className={styles.pwSuccess}>Password updated successfully.</p>
        )}
      </div>

      <div className={styles.group}>
        <h3 className={styles.groupTitle}>Bank accounts</h3>
        {methods.banks.map((b) => (
          <div key={b.id} className={styles.methodCard}>
            <span>{b.bankName}</span>
            <span className={styles.muted}>
              •••• {String(b.accountNumber).slice(-4)} · {b.accountName}
            </span>
          </div>
        ))}
        {methods.banks.length === 0 && (
          <p className={styles.muted}>No bank linked yet — add one below.</p>
        )}

        {showAddBank ? (
          <div className={homeStyles.flowForm}>
            <label className={homeStyles.formLabel}>Bank</label>
            <select
              className={homeStyles.formInput}
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
            <label className={homeStyles.formLabel}>Account number</label>
            <input
              className={homeStyles.formInput}
              value={newBank.accountNumber}
              onChange={(e) => setNewBank({ ...newBank, accountNumber: e.target.value })}
            />
            <label className={homeStyles.formLabel}>Account name</label>
            <input
              className={homeStyles.formInput}
              value={newBank.accountName}
              onChange={(e) => setNewBank({ ...newBank, accountName: e.target.value })}
            />
            <button className={homeStyles.primaryBtn} onClick={addBank}>
              Save bank account
            </button>
          </div>
        ) : (
          <button className={homeStyles.addFavouriteBtn} onClick={() => setShowAddBank(true)}>
            + Add bank
          </button>
        )}
      </div>

      {region.mobileMoney.length > 0 && (
        <div className={styles.group}>
          <h3 className={styles.groupTitle}>Mobile money</h3>
          {methods.mobileMoney.map((m) => (
            <div key={m.id} className={styles.methodCard}>
              <span>{m.provider}</span>
              <span className={styles.muted}>
                •••• {String(m.phoneNumber).slice(-4)}
              </span>
            </div>
          ))}
          {methods.mobileMoney.length === 0 && (
            <p className={styles.muted}>
              No mobile money account linked yet — add one below.
            </p>
          )}

          {showAddMobile ? (
            <div className={homeStyles.flowForm}>
              <label className={homeStyles.formLabel}>Provider</label>
              <select
                className={homeStyles.formInput}
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
              <label className={homeStyles.formLabel}>Phone number</label>
              <input
                className={homeStyles.formInput}
                placeholder="e.g. 254712345678"
                value={newMobile.phoneNumber}
                onChange={(e) =>
                  setNewMobile({ ...newMobile, phoneNumber: e.target.value })
                }
              />
              <button className={homeStyles.primaryBtn} onClick={addMobile}>
                Save mobile money account
              </button>
            </div>
          ) : (
            <button
              className={homeStyles.addFavouriteBtn}
              onClick={() => setShowAddMobile(true)}
            >
              + Add mobile money account
            </button>
          )}
        </div>
      )}

      <div className={styles.group}>
        <h3 className={styles.groupTitle}>Cards</h3>
        {methods.cards.map((c) => (
          <div key={c.id} className={styles.methodCard}>
            <span>
              {c.brand} •••• {c.last4}
            </span>
            <span className={styles.muted}>
              {c.cardholderName} · exp {c.expiry}
            </span>
          </div>
        ))}
        {methods.cards.length === 0 && (
          <p className={styles.muted}>No card linked yet — add one below.</p>
        )}

        {showAddCard ? (
          <div className={homeStyles.flowForm}>
            <label className={homeStyles.formLabel}>Cardholder name</label>
            <input
              className={homeStyles.formInput}
              value={newCard.cardholderName}
              onChange={(e) => setNewCard({ ...newCard, cardholderName: e.target.value })}
            />
            <label className={homeStyles.formLabel}>Card number</label>
            <input
              className={homeStyles.formInput}
              maxLength={19}
              placeholder="4111 1111 1111 1111"
              value={newCard.cardNumber}
              onChange={(e) => setNewCard({ ...newCard, cardNumber: e.target.value })}
            />
            <label className={homeStyles.formLabel}>Expiry (MM/YY)</label>
            <input
              className={homeStyles.formInput}
              maxLength={5}
              placeholder="MM/YY"
              value={newCard.expiry}
              onChange={(e) => setNewCard({ ...newCard, expiry: e.target.value })}
            />
            <button className={homeStyles.primaryBtn} onClick={addCard}>
              Save card
            </button>
          </div>
        ) : (
          <button className={homeStyles.addFavouriteBtn} onClick={() => setShowAddCard(true)}>
            + Add card
          </button>
        )}
      </div>
    </section>
  );
}

export default PaymentMethods;
