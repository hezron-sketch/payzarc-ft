import React, { useState, useEffect, useRef } from "react";
import { CircleCheck, CircleAlert, X } from "lucide-react";
import axiosInstance, {
  transactionsApi,
  contactsApi,
} from "../../utility/axiosInstance";
import { countries } from "../../utility/countries";
import { getCurrentCountry } from "../../utility/getCurrentCountry";
import { getLiveExchangeRates } from "../../utility/getLiveExchangeRates";
import BalanceCard from "./BalanceCard";
import QuickSend from "./QuickSend";
import AddMoney from "./AddMoney";
import { SendMoney } from "./SendMoney";
import { SendToMany } from "./SendToMany";
import { Withdraw } from "./Withdraw";
import GroupsPanel from "./GroupsPanel";
import Reports from "./Reports";
import RecentActivity from "./RecentActivity";
import ReviewSheet from "./ReviewSheet";

// Dashboard home: owns the data every panel shares (balance, favourites,
// linked payment methods, FX rates, the review sheet and toast) and which
// panel is showing. Each flow lives in its own file alongside this one and owns its own form state.
function Home({
  onPageChange,
  user,
  navigateRequest,
  balanceCardRef,
  // Which panel is showing comes from the URL (Dashboard owns it), so
  // Back/Forward and refresh land on the same panel.
  section: activeSection = "dashboard",
  groupsTab = "friends",
  onNavigate,
}) {
  // The phone screen's content is keyed by section + this nonce, so the
  // outgoing flow unmounts and the next starts with fresh state — a
  // half-typed amount or PIN never leaks between flows. The nonce only
  // bumps when the *same* section is reopened (e.g. a new Quick Send
  // recipient while Send is already open); a section change re-keys on its own.
  const [flowNonce, setFlowNonce] = useState(0);
  const flowKey = `${activeSection}:${flowNonce}`;
  // Recipient to pre-fill when opening Send (Quick Send, Friends, search).
  const [sendRecipient, setSendRecipient] = useState(null);
  const setGroupsTab = (tab) =>
    onNavigate?.({ section: "groups", tab }, { replace: true });

  // Spatial direction for the phone screen's content swap: flows sit one
  // level "in" from the dashboard, so opening one slides in from the right
  // and returning slides back from the left (the same path in reverse);
  // flow-to-flow is a sideways peer swap, so it crossfades instead.
  const prevSectionRef = useRef(activeSection);
  const contentAnimationRef = useRef("animate-flow-fade-in");
  if (prevSectionRef.current !== activeSection) {
    const from = prevSectionRef.current;
    contentAnimationRef.current =
      from === "dashboard"
        ? "animate-slide-in-right"
        : activeSection === "dashboard"
          ? "animate-slide-in-left"
          : "animate-flow-fade-in";
    prevSectionRef.current = activeSection;
  }

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

  // The pending money-flow review (see ReviewSheet.js), or null.
  const [review, setReview] = useState(null);
  // Non-blocking status message: { id, type, message } or null.
  const [toast, setToast] = useState(null);

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
      // Newest first: backend (and the mock) don't guarantee order.
      const time = (tx) => new Date(tx.created_at || tx.date).getTime() || 0;
      setRecentTransactions([...txs].sort((a, b) => time(b) - time(a)).slice(0, 5));
    } catch (err) {
      console.error("Failed to fetch recent transactions", err);
      setRecentTransactions([]);
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

  const openConfirmationDialog = (request) => setReview(request);

  // A toast, not a modal: feedback shouldn't cost the user another tap or
  // wipe their place in the flow.
  const showNotification = (type, message) =>
    setToast({ id: Date.now(), type, message });
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(
      () => setToast(null),
      toast.type === "error" ? 7000 : 4500,
    );
    return () => clearTimeout(id);
  }, [toast]);

  // Shows `section` in the phone screen with fresh flow state (see flowKey).
  const openSection = (section, recipient = null) => {
    setSendRecipient(recipient);
    if (section === activeSection) setFlowNonce((n) => n + 1);
    onNavigate?.({ section, tab: section === "groups" ? groupsTab : undefined });
  };
  // A recipient only applies to the Send flow it was picked for — don't let
  // it pre-fill a later Send reached through Back/Forward or the tab bar.
  useEffect(() => {
    if (activeSection !== "send") setSendRecipient(null);
  }, [activeSection]);
  // Action-button clicks. Tapping the action that's already open does
  // nothing (it used to close the flow and throw away what was typed); the
  // flow's own Close button is the way out.
  const switchSection = (section) => {
    if (activeSection !== section) openSection(section);
  };
  const goToDashboard = () => openSection("dashboard");
  // Group funds live in the Groups panel's "groups" tab — the one place the
  // balance card's group-funds chip and the Groups action both lead.
  const openGroupFunds = () => {
    setGroupsTab("groups");
    openSection("groups");
  };

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
            contentAnimation={contentAnimationRef.current}
            switchSection={switchSection}
            goToDashboard={goToDashboard}
            displayCurrency={displayCurrency}
            formattedBalance={formattedBalance}
            loadingBalance={loadingBalance}
            balanceError={balanceError}
            groupFundsTotal={groupFundsTotal}
            onOpenGroupFunds={openGroupFunds}
          >
            {activeSection === "dashboard" && (
              <>
                <QuickSend
                  favourites={favourites}
                  onSeeAll={() => switchSection("groups")}
                  onSelect={(fav) => openSection("send", fav)}
                />
                {/* Small screens: Recent Activity lives inside the phone,
                    under Quick Send; the copy beside the phone is hidden. */}
                <div className="hidden max-[768px]:block">
                  <RecentActivity
                    embedded
                    transactions={recentTransactions}
                    currency={displayCurrency}
                    onViewAll={() => openSection("reports")}
                  />
                </div>
              </>
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

        {/* Medium widths stack this under the phone — kept phone-width
            instead of stretching across the whole 960px row. */}
        <div className="w-full max-lg:max-w-[400px] max-lg:mx-auto max-[768px]:hidden">
          <RecentActivity
            transactions={recentTransactions}
            currency={displayCurrency}
            onViewAll={() => openSection("reports")}
          />
        </div>
      </div>

      <ReviewSheet request={review} onClose={() => setReview(null)} />

      {/* Always-mounted live regions: a region that mounts together with
          its text isn't reliably announced, so the message is swapped into
          regions that already exist. */}
      <div aria-live="polite" className="sr-only">
        {toast?.type !== "error" ? toast?.message : ""}
      </div>
      <div aria-live="assertive" className="sr-only">
        {toast?.type === "error" ? toast?.message : ""}
      </div>
      {toast && (
        <div
          key={toast.id}
          className="fixed left-1/2 -translate-x-1/2 bottom-[calc(96px+env(safe-area-inset-bottom))] lg:bottom-8 z-[60] w-[min(440px,calc(100%-32px))] flex items-start gap-3 rounded-[18px] material-thin border border-white/[0.08] shadow-[0_16px_40px_-12px_rgba(0,0,0,0.6)] px-4 py-3.5 toast-rise"
        >
          {toast.type === "error" ? (
            <CircleAlert
              size={18}
              className="text-destructive shrink-0 mt-0.5"
              aria-hidden="true"
            />
          ) : (
            <CircleCheck
              size={18}
              className="text-success shrink-0 mt-0.5"
              aria-hidden="true"
            />
          )}
          <p className="flex-1 text-[0.9rem] leading-snug text-foreground m-0">
            {toast.message}
          </p>
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setToast(null)}
            className="-m-2 p-2 rounded-full text-[var(--soft)] hover:text-foreground"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}
    </>
  );
}

export default Home;
