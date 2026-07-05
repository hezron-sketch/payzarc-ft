import React, { useState, useEffect } from "react";
import {
  PlusCircle,
  ArrowDownCircle,
  Send,
  UsersRound,
  Eye,
  EyeOff,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  ArrowLeft,
  Plus,
  ArrowUpIcon,
  ChevronRight,
  Handshake,
  Tv,
  Briefcase,
  ShoppingCart,
  University,
  ArrowDownIcon,
} from "lucide-react";
import { transactionsApi, contactsApi } from "../../utility/axiosInstance";
import axios from "axios";
import styles from "./Home.module.css";
import YesNoPopup from "../../styles/YesNoPopup";
import { countries } from "../../utility/countries";
import { djangoApis } from "../../utility/axiosInstance";
import { API_URL } from "../../utility/constants";

function Home({ onPageChange, user }) {
  // --- States from the provided functional Home.js ---
  const [activeSection, setActiveSection] = useState("dashboard");
  const [showBalance, setShowBalance] = useState(false);
  const [balanceData, setBalanceData] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [balanceError, setBalanceError] = useState(null);

  // Transaction/Action States
  const [sendAmount, setSendAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [addAmount, setAddAmount] = useState("");
  const [agentNumber, setAgentNumber] = useState("");
  const [inputPin, setInputPin] = useState("");

  // Recipient/Search States
  const [recipientSearchTerm, setRecipientSearchTerm] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [favourites, setFavourites] = useState([]);

  // Dialog States
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState("");
  const [dialogAction, setDialogAction] = useState(null);
  const [notificationOnly, setNotificationOnly] = useState(false);

  // Recent Transactions (Real or Placeholder)
  const [recentTransactions, setRecentTransactions] = useState([]);

  // Groups (no scaffolding existed for this yet — added here)
  const [groupsList, setGroupsList] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [groupsLoaded, setGroupsLoaded] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [creatingGroup, setCreatingGroup] = useState(false);

  // --- Initialization & Data Fetching ---
  useEffect(() => {
    fetchBalance();
    fetchFavourites();
    fetchRecentTransactions();
  }, []);

  // Lazily fetch groups the first time the Groups panel is opened.
  useEffect(() => {
    if (activeSection === "groups" && !groupsLoaded) {
      fetchGroups();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

  const fetchBalance = async () => {
    setLoadingBalance(true);
    try {
      const token = localStorage.getItem("accessToken");
      const res = await transactionsApi.get("/api/balance/", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBalanceData(res.data);
    } catch (err) {
      setBalanceError("Failed to load balance");
    } finally {
      setLoadingBalance(false);
    }
  };

  const fetchFavourites = async () => {
    try {
      const res = await contactsApi.get("/api/favorites/all/");
      const raw = res.data;
      // The API can come back as a bare array or as a paginated/wrapped
      // object (e.g. { results: [...] } or { favourites: [...] }) — normalize
      // to a plain array either way so .filter/.map never blow up.
      const list = Array.isArray(raw)
        ? raw
        : raw?.results || raw?.favourites || raw?.data || [];
      setFavourites(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Failed to fetch favourites", err);
      setFavourites([]);
    }
  };

  const fetchRecentTransactions = async () => {
    try {
      const res = await transactionsApi.get(
        "/api/transactions/history/?limit=5",
      );
      // Handle different response shapes
      const txs = res.data.results || res.data.transactions || res.data || [];
      setRecentTransactions(txs.slice(0, 3));
    } catch (err) {
      // Fallback to placeholders if API fails
      setRecentTransactions([
        {
          id: 1,
          type: "receive",
          name: "John Doe",
          amount: "+$250.00",
          date: "Today, 2:30 PM",
          status: "Completed",
        },
        {
          id: 2,
          type: "send",
          name: "Netflix Subscription",
          amount: "-$15.99",
          date: "Yesterday",
          status: "Completed",
        },
        {
          id: 3,
          type: "receive",
          name: "Salary Deposit",
          amount: "+$3,200.00",
          date: "Oct 1, 2023",
          status: "Completed",
        },
      ]);
    }
  };

  const fetchGroups = async () => {
    setLoadingGroups(true);
    try {
      // NOTE: no groups endpoint existed anywhere in the scaffolded code —
      // this is a best guess following the same shape as the other calls.
      // Point this at your real endpoint if it's different.
      const res = await djangoApis.get("/api/groups/");
      const raw = res.data;
      const list = Array.isArray(raw)
        ? raw
        : raw?.results || raw?.groups || raw?.data || [];
      setGroupsList(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Failed to fetch groups", err);
      setGroupsList([]);
    } finally {
      setLoadingGroups(false);
      setGroupsLoaded(true);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      showNotification("error", "Enter a group name");
      return;
    }
    setCreatingGroup(true);
    try {
      // NOTE: same caveat as fetchGroups — adjust to match your real API.
      await djangoApis.post("/api/groups/create/", {
        name: newGroupName.trim(),
      });
      showNotification("success", "Group created!");
      setNewGroupName("");
      fetchGroups();
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        "Failed to create group";
      showNotification("error", errorMsg);
    } finally {
      setCreatingGroup(false);
    }
  };

  // --- Handlers ---
  const toggleBalance = () => setShowBalance(!showBalance);

  const formattedBalance = balanceData
    ? Number(balanceData.balance).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "0.00";

  const openConfirmationDialog = (title, message, action) => {
    setDialogTitle(title);
    setDialogMessage(message);
    setDialogAction(() => action);
    setNotificationOnly(false);
    setOpenDialog(true);
  };

  const showNotification = (type, message) => {
    setDialogTitle(type === "success" ? "Success" : "Error");
    setDialogMessage(message);
    setNotificationOnly(true);
    setOpenDialog(true);
  };

  const handleDialogConfirm = (typedValue, buttonChoice) => {
    setOpenDialog(false);
    if (dialogAction) dialogAction(typedValue, buttonChoice);
  };

  // Returns to the dashboard and clears any in-progress flow input so
  // switching between Add Money / Withdraw / Send / Groups never leaks
  // stale values into the next flow.
  const goToDashboard = () => switchSection("dashboard");

  // Central place for changing which panel is shown below the balance.
  // Clears every flow's transient input on every switch (not just when
  // going back to the dashboard) so hopping Add Money -> Send, say, never
  // carries over a half-typed amount or PIN. Clicking the already-active
  // action button toggles back to the dashboard instead of doing nothing.
  const switchSection = (section) => {
    setSendAmount("");
    setWithdrawAmount("");
    setAddAmount("");
    setAgentNumber("");
    setInputPin("");
    setRecipientSearchTerm("");
    setSelectedRecipient(null);
    setActiveSection((current) =>
      current === section ? "dashboard" : section,
    );
  };

  const filteredFavourites = (
    Array.isArray(favourites) ? favourites : []
  ).filter((f) => {
    const term = recipientSearchTerm.toLowerCase();
    if (!term) return false;
    const name = (f.name || f.full_name || "").toLowerCase();
    const phone = (f.phone || f.value || f.phone_number || "").toLowerCase();
    return name.includes(term) || phone.includes(term);
  });

  const handleSelectRecipient = (fav) => {
    setSelectedRecipient(fav);
    setRecipientSearchTerm(
      fav.name || fav.full_name || fav.phone || fav.value || "",
    );
  };

  const handleSendMoney = async () => {
    // Allow either a picked favourite OR a number typed straight into the
    // search box — previously this only worked if a favourite was selected.
    const recipientValue =
      (selectedRecipient &&
        (selectedRecipient.value ||
          selectedRecipient.phone ||
          selectedRecipient.phone_number)) ||
      recipientSearchTerm;

    if (!recipientValue || !sendAmount || inputPin.length !== 4) {
      showNotification(
        "error",
        "Please fill in recipient, amount, and 4-digit PIN",
      );
      return;
    }

    openConfirmationDialog(
      "Confirm Send Money",
      `Send ${sendAmount} to ${recipientValue}?\n\nType 1 and click Yes to confirm.`,
      async (typedValue, buttonChoice) => {
        if (typedValue !== "1" || buttonChoice !== "yes") {
          showNotification("error", "Transaction cancelled");
          return;
        }
        try {
          const token = localStorage.getItem("accessToken");
          await transactionsApi.post(
            "/api/send-money/",
            {
              recipient_number: recipientValue,
              amount: parseFloat(sendAmount),
              transaction_pin: inputPin,
            },
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          showNotification("success", "Money sent successfully!");
          fetchBalance();
          fetchRecentTransactions();
          goToDashboard();
        } catch (error) {
          const errorMsg =
            error.response?.data?.message ||
            error.response?.data?.error ||
            "Transfer failed";
          showNotification("error", errorMsg);
        }
      },
    );
  };

  const handleAddMoney = async () => {
    if (!addAmount || Number(addAmount) <= 0) {
      showNotification("error", "Enter a valid amount");
      return;
    }

    openConfirmationDialog(
      "Confirm Add Money",
      `Add ${balanceData?.currency || "$"}${addAmount} to your balance?\n\nType 1 and click Yes to confirm.`,
      async (typedValue, buttonChoice) => {
        if (typedValue !== "1" || buttonChoice !== "yes") {
          showNotification("error", "Transaction cancelled");
          return;
        }
        try {
          const token = localStorage.getItem("accessToken");
          // NOTE: guessed endpoint, following the /api/send-money/ pattern —
          // point this at your real deposit/top-up endpoint if different.
          await transactionsApi.post(
            "/api/add-money/",
            { amount: parseFloat(addAmount) },
            { headers: { Authorization: `Bearer ${token}` } },
          );
          showNotification("success", "Money added successfully!");
          fetchBalance();
          fetchRecentTransactions();
          goToDashboard();
        } catch (error) {
          const errorMsg =
            error.response?.data?.message ||
            error.response?.data?.error ||
            "Add money failed";
          showNotification("error", errorMsg);
        }
      },
    );
  };

  const handleWithdraw = async () => {
    if (
      !withdrawAmount ||
      Number(withdrawAmount) <= 0 ||
      !agentNumber ||
      inputPin.length !== 4
    ) {
      showNotification(
        "error",
        "Enter an amount, agent number, and 4-digit PIN",
      );
      return;
    }

    openConfirmationDialog(
      "Confirm Withdrawal",
      `Withdraw ${balanceData?.currency || "$"}${withdrawAmount} via agent ${agentNumber}?\n\nType 1 and click Yes to confirm.`,
      async (typedValue, buttonChoice) => {
        if (typedValue !== "1" || buttonChoice !== "yes") {
          showNotification("error", "Transaction cancelled");
          return;
        }
        try {
          const token = localStorage.getItem("accessToken");
          // NOTE: guessed endpoint — point this at your real withdrawal
          // endpoint if the route name differs.
          await transactionsApi.post(
            "/api/withdraw/",
            {
              agent_number: agentNumber,
              amount: parseFloat(withdrawAmount),
              transaction_pin: inputPin,
            },
            { headers: { Authorization: `Bearer ${token}` } },
          );
          showNotification("success", "Withdrawal successful!");
          fetchBalance();
          fetchRecentTransactions();
          goToDashboard();
        } catch (error) {
          const errorMsg =
            error.response?.data?.message ||
            error.response?.data?.error ||
            "Withdrawal failed";
          showNotification("error", errorMsg);
        }
      },
    );
  };

  // --- Render ---
  return (
    <div className={styles.homeContainer}>
      {/* Balance Section */}
      <section className={styles.balanceSection}>
        <div
          className={`${styles.heroCollapse} ${activeSection !== "dashboard" ? styles.heroCollapsed : ""}`}
        >
          <div className={styles.heroCollapseInner}>
            <h1 className={styles.heroTitle}>PAYZARC</h1>
            <h1 className={styles.heroHeadline}>
              Send money
              <br />
              at <span className={styles.accent}>Lower Rates</span>
            </h1>

            <p className={styles.heroSub}>
              Payzarc offers industry-leading exchange rates with no hidden
              fees. Save more for every transaction you make.
            </p>
          </div>
        </div>

        <div className={styles.bodyContainer}>
          <div className={styles.balanceHeader}>
            <span className={styles.balanceLabel}>Total Balance</span>
            <button className={styles.eyeButton} onClick={toggleBalance}>
              {showBalance ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          <h1 className={styles.balanceValue}>
            <span className={styles.currency}>
              {balanceData?.currency || "$"}
            </span>
            <span>{showBalance ? formattedBalance : "****"}</span>
          </h1>
          <div className={styles.actionGrid}>
            <button
              className={`${styles.actionBtn} ${activeSection === "add-money" ? styles.actionBtnActive : ""}`}
              onClick={() => switchSection("add-money")}
            >
              <div className={`${styles.actionIcon} ${styles.bgGold}`}>
                <PlusCircle size={24} />
              </div>
              <span>Add Money</span>
            </button>

            <button
              className={`${styles.actionBtn} ${activeSection === "withdraw" ? styles.actionBtnActive : ""}`}
              onClick={() => switchSection("withdraw")}
            >
              <div className={`${styles.actionIcon} ${styles.bgBlue}`}>
                <ArrowDownCircle size={24} />
              </div>
              <span>Withdraw</span>
            </button>

            <button
              className={`${styles.actionBtn} ${activeSection === "send" ? styles.actionBtnActive : ""}`}
              onClick={() => switchSection("send")}
            >
              <div className={`${styles.actionIcon} ${styles.bgGreen}`}>
                <Send size={24} />
              </div>
              <span>Send</span>
            </button>

            <button
              className={`${styles.actionBtn} ${activeSection === "groups" ? styles.actionBtnActive : ""}`}
              onClick={() => switchSection("groups")}
            >
              <div className={`${styles.actionIcon} ${styles.bgPink}`}>
                <UsersRound size={24} />
              </div>
              <span>Groups</span>
            </button>
          </div>
        </div>

        {/* Action buttons stay visible & highlighted across every section —
            only the panel below (Recent Activity vs. a flow) swaps out. */}
      </section>

      {/* Overview / Recent Activity Section — dashboard only */}
      {activeSection === "dashboard" && (
        <div className={styles.displayWindow}>
          <section className={styles.overviewSection}>
            <div className={styles.sectionHeader}>
              <h2>Recent Activity</h2>
              <button
                className={styles.viewAllBtn}
                onClick={() => onPageChange("history")}
              >
                View All <ArrowRight size={16} />
              </button>
            </div>

            <div className={styles.transactionList}>
              {recentTransactions.map((tx, idx) => (
                <div key={tx.id || idx} className={styles.transactionItem}>
                  <div className={styles.txLeft}>
                    <div
                      className={`${styles.txIcon} ${tx.transaction_type === "CREDIT" || tx.type === "receive" ? styles.bgSuccess : styles.bgDanger}`}
                    >
                      {tx.transaction_type === "CREDIT" ||
                      tx.type === "receive" ? (
                        <TrendingUp size={20} />
                      ) : (
                        <TrendingDown size={20} />
                      )}
                    </div>
                    <div className={styles.txInfo}>
                      <span className={styles.txName}>
                        {tx.name || tx.description || tx.transaction_type}
                      </span>
                      <span className={styles.txDate}>
                        {tx.date ||
                          new Date(tx.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className={styles.txRight}>
                    <span
                      className={`${styles.txAmount} ${tx.transaction_type === "CREDIT" || tx.type === "receive" ? styles.textSuccess : styles.textDanger}`}
                    >
                      {tx.amount}
                    </span>
                    <span className={styles.txStatus}>{tx.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* Add Money — inline flow */}
      {activeSection === "add-money" && (
        <section className={styles.flowSection}>
          <div className={styles.flowHeader}>
            <button className={styles.backBtn} onClick={goToDashboard}>
              <ArrowLeft size={18} /> Back
            </button>
            <h2>Add Money</h2>
          </div>

          <div className={styles.flowForm}>
            <label className={styles.formLabel}>Amount</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className={styles.formInput}
              placeholder="0.00"
              value={addAmount}
              onChange={(e) => setAddAmount(e.target.value)}
            />

            <button className={styles.primaryBtn} onClick={handleAddMoney}>
              Add {balanceData?.currency || "$"}
              {addAmount || "0.00"}
            </button>
          </div>
        </section>
      )}

      {/* Withdraw — inline flow */}
      {activeSection === "withdraw" && (
        <section className={styles.flowSection}>
          <div className={styles.flowHeader}>
            <button className={styles.backBtn} onClick={goToDashboard}>
              <ArrowLeft size={18} /> Back
            </button>
            <h2>Withdraw</h2>
          </div>

          <div className={styles.flowForm}>
            <label className={styles.formLabel}>Agent number</label>
            <input
              className={styles.formInput}
              placeholder="e.g. 254712345678"
              value={agentNumber}
              onChange={(e) => setAgentNumber(e.target.value)}
            />

            <label className={styles.formLabel}>Amount</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className={styles.formInput}
              placeholder="0.00"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
            />

            <label className={styles.formLabel}>Transaction PIN</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              className={styles.formInput}
              placeholder="****"
              value={inputPin}
              onChange={(e) =>
                setInputPin(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
            />

            <button className={styles.primaryBtn} onClick={handleWithdraw}>
              Withdraw
            </button>
          </div>
        </section>
      )}

      {/* Send Money — inline flow */}
      {activeSection === "send" && (
        <section className={styles.flowSection}>
          <div className={styles.flowHeader}>
            <button className={styles.backBtn} onClick={goToDashboard}>
              <ArrowLeft size={18} /> Back
            </button>
            <h2>Send Money</h2>
          </div>

          <div className={styles.flowForm}>
            <label className={styles.formLabel}>Recipient</label>
            <input
              className={styles.formInput}
              placeholder="Search favourites or enter a number"
              value={recipientSearchTerm}
              onChange={(e) => {
                setRecipientSearchTerm(e.target.value);
                setSelectedRecipient(null);
              }}
            />
            {recipientSearchTerm && filteredFavourites.length > 0 && (
              <div className={styles.favouriteList}>
                {filteredFavourites.map((fav, idx) => (
                  <button
                    key={fav.id || idx}
                    type="button"
                    className={styles.favouriteChip}
                    onClick={() => handleSelectRecipient(fav)}
                  >
                    {fav.name || fav.full_name || fav.phone || fav.value}
                  </button>
                ))}
              </div>
            )}

            <label className={styles.formLabel}>Amount</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className={styles.formInput}
              placeholder="0.00"
              value={sendAmount}
              onChange={(e) => setSendAmount(e.target.value)}
            />

            <label className={styles.formLabel}>Transaction PIN</label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              className={styles.formInput}
              placeholder="****"
              value={inputPin}
              onChange={(e) =>
                setInputPin(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
            />

            <button className={styles.primaryBtn} onClick={handleSendMoney}>
              Send
            </button>
          </div>
        </section>
      )}

      {/* Groups — inline flow (no scaffolding existed for this before;
          confirm/adjust the endpoints in fetchGroups/handleCreateGroup) */}
      {activeSection === "groups" && (
        <section className={styles.flowSection}>
          <div className={styles.flowHeader}>
            <button className={styles.backBtn} onClick={goToDashboard}>
              <ArrowLeft size={18} /> Back
            </button>
            <h2>Groups</h2>
          </div>

          <div className={styles.flowForm}>
            <label className={styles.formLabel}>Create a new group</label>
            <div className={styles.inlineFormRow}>
              <input
                className={styles.formInput}
                placeholder="Group name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
              <button
                className={styles.primaryBtn}
                onClick={handleCreateGroup}
                disabled={creatingGroup}
              >
                {creatingGroup ? "Creating…" : "Create"}
              </button>
            </div>
          </div>

          <div className={styles.groupsList}>
            {loadingGroups ? (
              <p className={styles.mutedText}>Loading groups…</p>
            ) : groupsList.length === 0 ? (
              <p className={styles.mutedText}>
                You haven't joined any groups yet.
              </p>
            ) : (
              groupsList.map((g, idx) => (
                <div key={g.id || idx} className={styles.transactionItem}>
                  <div className={styles.txLeft}>
                    <div className={`${styles.txIcon} ${styles.bgPink}`}>
                      <UsersRound size={20} />
                    </div>
                    <div className={styles.txInfo}>
                      <span className={styles.txName}>{g.name}</span>
                      <span className={styles.txDate}>
                        {g.members_count ? `${g.members_count} members` : ""}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={18} />
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* Confirmation Popup */}
      {openDialog && (
        <YesNoPopup
          title={dialogTitle}
          message={dialogMessage}
          onConfirm={handleDialogConfirm}
          onCancel={() => setOpenDialog(false)}
          notificationOnly={notificationOnly}
        />
      )}
    </div>
  );
}

export default Home;
