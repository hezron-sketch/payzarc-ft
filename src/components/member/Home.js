import React, { useState, useEffect, useRef } from "react";
import axiosInstance, {
  transactionsApi,
  contactsApi,
} from "../../utility/axiosInstance";
import YesNoPopup from "../../styles/YesNoPopup";
import { countries } from "../../utility/countries";
import { getCurrentCountry } from "../../utility/getCurrentCountry";
import { getLiveExchangeRates } from "../../utility/getLiveExchangeRates";
import BalanceCard from "./BalanceCard";
import QuickSend from "./QuickSend";
import AddMoney from "./AddMoney";
import { SendMoney, SendToMany, Withdraw } from "./Transfers";
import GroupsPanel from "./GroupsPanel";
import Reports from "./Reports";
import RecentActivity from "./RecentActivity";
import MarketTicker from "./MarketTicker";

// Dashboard home: owns the data every panel shares (balance, favourites,
// linked payment methods, FX rates, the confirm/notify popup) and which
// panel is showing. Each flow lives in its own file alongside this one and owns its own form state.
function Home({ onPageChange, user, navigateRequest, balanceCardRef }) {
  const [activeSection, setActiveSection] = useState("dashboard");
  // Bumped on every section change; the phone screen's content is keyed by
  // it, so the outgoing flow unmounts and the next one starts with fresh
  // state — a half-typed amount or PIN never leaks between flows.
  const [flowKey, setFlowKey] = useState(0);
  // Recipient to pre-fill when opening Send (Quick Send, Friends, search).
  const [sendRecipient, setSendRecipient] = useState(null);
  const [groupsTab, setGroupsTab] = useState("friends");

  const [balanceData, setBalanceData] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [balanceError, setBalanceError] = useState(null);
  // Group funds are their own pool, separate from the wallet balance — summed
  // here just to show a distinguishing total on the balance card.
  const [groupFundsTotal, setGroupFundsTotal] = useState(0);
  // Banks/cards/mobile money linked from the Profile "Payment Methods" panel
  // — Add Money sources, and the ONLY valid Withdraw destinations.
  const [paymentMethods, setPaymentMethods] = useState({
    banks: [],
    cards: [],
    mobileMoney: [],
  });
  const [favourites, setFavourites] = useState([]);
  // Sender's own location (for the "sending from" flag in Send Money)
  const [myCountry, setMyCountry] = useState(null);
  // Live FX rates for the sender's currency; falls back to the mocked
  // EXCHANGE_RATES table (see getRate) if the live fetch fails.
  const [liveRates, setLiveRates] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);

  const [openDialog, setOpenDialog] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState("");
  const [dialogAction, setDialogAction] = useState(null);
  const [notificationOnly, setNotificationOnly] = useState(false);
  const [dialogRequirePin, setDialogRequirePin] = useState(false);

  useEffect(() => {
    fetchBalance();
    fetchFavourites();
    fetchRecentTransactions();
    fetchPaymentMethods();
    getCurrentCountry(countries).then(setMyCountry);
    axiosInstance
      .get("/api/groups")
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setGroupFundsTotal(list.reduce((sum, g) => sum + g.balance, 0));
      })
      .catch(() => {});
    // Initial load only — these all get re-triggered individually after
    // whatever mutation needs a fresh balance/history/etc.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live FX rates, refetched whenever the sender's account currency changes.
  useEffect(() => {
    getLiveExchangeRates(balanceData?.currency || "USD").then(setLiveRates);
  }, [balanceData?.currency]);

  const fetchBalance = async () => {
    if (!user?.email) {
      setLoadingBalance(false);
      return;
    }
    try {
      const response = await transactionsApi.get("/api/balance/");
      const data = response.data;
      if (data.success !== undefined) {
        setBalanceData(data);
        setBalanceError(null);
      } else {
        setBalanceError(data.error || "Failed to load balance");
      }
    } catch (err) {
      console.error("Balance fetch failed:", err);
      setBalanceError(
        err.response?.status === 404
          ? "No wallet found for this account."
          : "Could not load wallet balance",
      );
    } finally {
      setLoadingBalance(false);
    }
  };

  const fetchFavourites = async () => {
    try {
      const res = await contactsApi.get("/api/favorites/");
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
      const txs = res.data.results || res.data.transactions || res.data || [];
      setRecentTransactions(txs.slice(0, 3));
    } catch (err) {
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

  const fetchPaymentMethods = async () => {
    try {
      const res = await transactionsApi.get("/api/payment-methods/");
      setPaymentMethods({
        banks: res.data?.banks || [],
        cards: res.data?.cards || [],
        mobileMoney: res.data?.mobileMoney || [],
      });
    } catch (err) {
      console.error("Failed to fetch payment methods", err);
    }
  };

  const refreshWallet = () => {
    fetchBalance();
    fetchRecentTransactions();
  };

  // Currency shown for the account: trust the backend's currency for this
  // account first, fall back to the currency of the user's detected country
  // (myCountry) rather than hardcoding USD/"$".
  const displayCurrency = balanceData?.currency || myCountry?.currency || "USD";
  const availableBalance = Number(balanceData?.balance) || 0;
  const formattedBalance = balanceData
    ? Number(balanceData.balance).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "0.00";

  const openConfirmationDialog = (title, message, action, options = {}) => {
    setDialogTitle(title);
    setDialogMessage(message);
    setDialogAction(() => action);
    setNotificationOnly(false);
    setDialogRequirePin(!!options.requirePin);
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

  // Shows `section` in the phone screen with fresh flow state (see flowKey).
  const openSection = (section, recipient = null) => {
    setSendRecipient(recipient);
    setFlowKey((k) => k + 1);
    setActiveSection(section);
  };
  // Action-button clicks: clicking the already-active one toggles back to
  // the dashboard instead of doing nothing.
  const switchSection = (section) =>
    openSection(activeSection === section ? "dashboard" : section);
  const goToDashboard = () => openSection("dashboard");

  // The scrollable area's scrollTop otherwise persists across content swaps
  // (same DOM node, only its child remounts) — snap back to the top whenever
  // the flow (or Groups' Friends/Groups sub-tab) changes.
  const phoneScrollRef = useRef(null);
  useEffect(() => {
    if (phoneScrollRef.current) phoneScrollRef.current.scrollTop = 0;
  }, [flowKey, groupsTab]);

  // Lets the dashboard's top-bar search jump straight into a section (and,
  // for a friend result, pre-fill them as the Send Money recipient) without
  // switchSection's same-section "toggle back to dashboard" behavior.
  useEffect(() => {
    if (!navigateRequest?.section) return;
    if (navigateRequest.section === "groups" && navigateRequest.groupsTab) {
      setGroupsTab(navigateRequest.groupsTab);
    }
    openSection(navigateRequest.section, navigateRequest.recipient || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigateRequest]);

  // Everything a flow panel may need; each one destructures what it uses.
  const flowProps = {
    user,
    onPageChange,
    myCountry,
    displayCurrency,
    liveRates,
    favourites,
    fetchFavourites,
    availableBalance,
    formattedBalance,
    paymentMethods,
    setPaymentMethods,
    showNotification,
    openConfirmationDialog,
    refreshWallet,
    goToDashboard,
    openSection,
  };

  return (
    <>
      <section className="w-full max-w-[960px] mx-auto flex flex-col items-start gap-3 pb-8">
        <button
          type="button"
          onClick={() => onPageChange("home")}
          className="text-[0.8rem] font-bold tracking-[3px] text-gold uppercase bg-transparent border-none p-0 cursor-pointer hover:opacity-75 transition-opacity"
        >
          Payzarc
        </button>
        <h1 className="text-[clamp(1.65rem,3vw,2.5rem)] font-bold leading-[1.15] tracking-[-1px] text-foreground m-0">
          Send money at <span className="text-gold">Lower Rates</span>
        </h1>
        <p className="text-[0.95rem] text-muted-foreground max-w-[480px] leading-[1.6] m-0">
          We offer industry-leading exchange rates with no hidden fees. Save
          more for every transaction you make.
        </p>
      </section>

      {/* Phone mockup (fixed-width) beside Recent Activity (takes whatever's
        left) — Quick Send/the flow forms all live inside the phone's own
        screen, so this is just those two top-level pieces side by side. */}
      <div className="w-full max-w-[960px] mx-auto grid grid-cols-1 lg:grid-cols-[400px_420px] gap-8 lg:gap-x-32 items-start">
        <div className="flex flex-col gap-6">
          <BalanceCard
            balanceCardRef={balanceCardRef}
            scrollRef={phoneScrollRef}
            activeSection={activeSection}
            contentKey={flowKey}
            switchSection={switchSection}
            goToDashboard={goToDashboard}
            onPageChange={onPageChange}
            displayCurrency={displayCurrency}
            formattedBalance={formattedBalance}
            loadingBalance={loadingBalance}
            balanceError={balanceError}
            groupFundsTotal={groupFundsTotal}
          >
            {activeSection === "dashboard" && (
              <QuickSend
                favourites={favourites}
                onSeeAll={() => switchSection("groups")}
                onSelect={(fav) => openSection("send", fav)}
              />
            )}
            {activeSection === "add-money" && <AddMoney {...flowProps} />}
            {activeSection === "withdraw" && <Withdraw {...flowProps} />}
            {activeSection === "send" && (
              <SendMoney {...flowProps} initialRecipient={sendRecipient} />
            )}
            {activeSection === "send-many" && <SendToMany {...flowProps} />}
            {activeSection === "groups" && (
              <GroupsPanel
                tab={groupsTab}
                onTabChange={setGroupsTab}
                onSelectFriend={(fav) => openSection("send", fav)}
                onTotalChange={setGroupFundsTotal}
                onWalletChange={fetchBalance}
              />
            )}
            {activeSection === "reports" && (
              <Reports showNotification={showNotification} />
            )}
          </BalanceCard>
        </div>

        <RecentActivity transactions={recentTransactions} />
      </div>

      {activeSection === "dashboard" && (
        <MarketTicker
          myCountry={myCountry}
          senderCurrency={displayCurrency}
          liveRates={liveRates}
        />
      )}

      {/* Confirmation Popup */}
      <YesNoPopup
        isOpen={openDialog}
        title={dialogTitle}
        message={dialogMessage}
        onSubmit={handleDialogConfirm}
        onClose={() => setOpenDialog(false)}
        isNotification={notificationOnly}
        requirePin={dialogRequirePin}
      />
    </>
  );
}

export default Home;
