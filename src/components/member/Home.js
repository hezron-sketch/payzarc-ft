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

function Home({
  onPageChange,
  user,
  navigateRequest,
  balanceCardRef,
  section: activeSection = "dashboard",
  groupsTab = "friends",
  onNavigate,
}) {
  const [flowNonce, setFlowNonce] = useState(0);
  const flowKey = `${activeSection}:${flowNonce}`;
  // Recipient to pre-fill when opening Send (Quick Send, Friends, search).
  const [sendRecipient, setSendRecipient] = useState(null);
  const setGroupsTab = (tab) =>
    onNavigate?.({ section: "groups", tab }, { replace: true });

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
  const [groupFundsTotal, setGroupFundsTotal] = useState(0);
  const [paymentMethods, setPaymentMethods] = useState({
    banks: [],
    cards: [],
    mobileMoney: [],
  });
  const [favourites, setFavourites] = useState([]);
  const [myCountry, setMyCountry] = useState(null);
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

  const displayCurrency = balanceData?.currency || myCountry?.currency || "USD";
  const availableBalance = Number(balanceData?.balance) || 0;
  const formattedBalance = balanceData
    ? Number(balanceData.balance).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "0.00";

  const openConfirmationDialog = (request) => setReview(request);

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
  useEffect(() => {
    if (activeSection !== "send") setSendRecipient(null);
  }, [activeSection]);
  const switchSection = (section) => {
    if (activeSection !== section) openSection(section);
  };
  const goToDashboard = () => openSection("dashboard");
  const openGroupFunds = () => {
    setGroupsTab("groups");
    openSection("groups");
  };

  const phoneScrollRef = useRef(null);
  useEffect(() => {
    if (phoneScrollRef.current) phoneScrollRef.current.scrollTop = 0;
  }, [flowKey, groupsTab]);

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
      <div className="w-full max-w-[960px] mx-auto grid grid-cols-1 lg:grid-cols-[400px_420px] lg:justify-between gap-8 lg:gap-x-32 items-start">
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
                {/* Inside the phone whenever there's no side column for it. */}
                <div className="lg:hidden">
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

        <div className="w-full hidden lg:block">
          <RecentActivity
            transactions={recentTransactions}
            currency={displayCurrency}
            onViewAll={() => openSection("reports")}
          />
        </div>
      </div>

      <ReviewSheet request={review} onClose={() => setReview(null)} />

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
