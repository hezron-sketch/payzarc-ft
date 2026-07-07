import React, { useState, useEffect, useMemo, useRef } from "react";
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
  Handshake,
  Tv,
  Briefcase,
  ShoppingCart,
  University,
  ArrowDownIcon,
  Check,
  RefreshCw,
} from "lucide-react";
import { transactionsApi, contactsApi } from "../../utility/axiosInstance";
import axios from "axios";
import styles from "./Home.module.css";
import History from "./History";
import Friends from "./Friends";
import Groups from "./Groups";
import YesNoPopup from "../../styles/YesNoPopup";
import { countries } from "../../utility/countries";
import { getCurrentCountry } from "../../utility/getCurrentCountry";
import { EXCHANGE_RATES } from "../../utility/exchangeRates";
import { getLiveExchangeRates } from "../../utility/getLiveExchangeRates";
import { getRegionProviders } from "../../utility/regionProviders";
import { API_URL } from "../../utility/constants";

// countries.js stores each entry's ISO alpha-2 code under `flag` (e.g. "KE");
// this turns that into an actual flag emoji. Already-emoji values (the
// getCurrentCountry error-fallback returns one directly) pass through as-is.
const isoToFlagEmoji = (iso) =>
  /^[A-Z]{2}$/.test(iso)
    ? String.fromCodePoint(...[...iso].map((c) => 127397 + c.charCodeAt(0)))
    : iso;

// Left-to-right order the action buttons appear in (Add Money, Withdraw,
// Send, Groups) — used to pick which side a flow panel slides in from.
const SECTION_ORDER = { "add-money": 0, withdraw: 1, send: 2, groups: 3 };

// Send Money's in-transit stepper — each leg of the journey, top to bottom.
const SEND_STEPS = [
  { label: "Sent", sub: "Payment initiated from your wallet", icon: Send },
  {
    label: "Processing",
    sub: "Verifying and routing your transfer",
    icon: RefreshCw,
    spin: true,
  },
  {
    label: "Delivered",
    sub: "Funds have arrived with the recipient",
    icon: Check,
  },
];

function Home({ onPageChange, user, navigateRequest }) {
  // --- States from the provided functional Home.js ---
  const [activeSection, setActiveSection] = useState("dashboard");
  // Which way the incoming flow panel slides in from, based on the action
  // buttons' left-to-right order (Add Money, Withdraw, Send, Groups).
  const [sectionDirection, setSectionDirection] = useState("right");
  const [showBalance, setShowBalance] = useState(false);
  const [balanceData, setBalanceData] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [balanceError, setBalanceError] = useState(null);

  // Transaction/Action States
  const [sendAmount, setSendAmount] = useState("");
  // Step-by-step "money in transit" visual shown while a send is in
  // flight — 0 hides it, 1-3 tracks which leg of the journey is reached.
  const [sendProgressStep, setSendProgressStep] = useState(0);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [addAmount, setAddAmount] = useState("");
  const [agentNumber, setAgentNumber] = useState("");
  const [mpesaNumber, setMpesaNumber] = useState("");
  const [addMoneyCategory, setAddMoneyCategory] = useState("bank"); // "mobile" | "bank" | "card"
  const [mobileProvider, setMobileProvider] = useState("");
  const [withdrawDestination, setWithdrawDestination] = useState("mpesa"); // "mpesa" | "agent"
  const [inputPin, setInputPin] = useState("");
  const [showAddMoneyPopup, setShowAddMoneyPopup] = useState(false);

  // Banks/cards linked from the Profile "Payment Methods" panel — offered
  // as Add Money sources alongside region-specific mobile money providers.
  const [paymentMethods, setPaymentMethods] = useState({
    banks: [],
    cards: [],
  });
  const [selectedBankId, setSelectedBankId] = useState(null);
  const [selectedCardId, setSelectedCardId] = useState(null);
  const [showAddBankForm, setShowAddBankForm] = useState(false);
  const [showAddCardForm, setShowAddCardForm] = useState(false);
  const [newBank, setNewBank] = useState({
    bankName: "",
    accountNumber: "",
    accountName: "",
  });
  const [newCard, setNewCard] = useState({
    cardholderName: "",
    cardNumber: "",
    expiry: "",
  });
  const [showWithdrawPopup, setShowWithdrawPopup] = useState(false);

  // Recipient/Search States
  const [recipientSearchTerm, setRecipientSearchTerm] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [favourites, setFavourites] = useState([]);

  // Sender's own location (for the "sending from" flag in Send Money)
  const [myCountry, setMyCountry] = useState(null);

  // Live FX rates for the sender's currency, covering every currency the
  // API tracks (not just the handful in the mocked EXCHANGE_RATES table).
  // Falls back to that mocked table if the live fetch fails.
  const [liveRates, setLiveRates] = useState(null);

  // Manual override for the recipient currency dropdown — takes priority
  // over auto-detection once the user touches it, so the converted-amount
  // field always has a currency to show even when nothing is detected.
  const [recipientCurrencyChoice, setRecipientCurrencyChoice] = useState("");

  // Full transaction history modal (opened from "View All")
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  // Dialog States
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogMessage, setDialogMessage] = useState("");
  const [dialogAction, setDialogAction] = useState(null);
  const [notificationOnly, setNotificationOnly] = useState(false);

  // Recent Transactions (Real or Placeholder)
  const [recentTransactions, setRecentTransactions] = useState([]);

  // Groups action button shows Friends/Groups as tabs, not its own flow.
  const [groupsTab, setGroupsTab] = useState("friends");
  // Which way the incoming pane should slide in from — "right" when moving
  // Friends -> Groups (tab order left to right), "left" for the reverse.
  const [groupsTabDirection, setGroupsTabDirection] = useState("right");

  const selectGroupsTab = (tab) => {
    if (tab === groupsTab) return;
    setGroupsTabDirection(tab === "groups" ? "right" : "left");
    setGroupsTab(tab);
  };

  // Floating market ticker (beside Recent Activity): cycles its message and
  // tracks how close the footer is so it can stop before overlapping it.
  const [tickerIndex, setTickerIndex] = useState(0);
  const [tickerBottom, setTickerBottom] = useState(24);

  // --- Initialization & Data Fetching ---
  useEffect(() => {
    fetchBalance();
    fetchFavourites();
    fetchRecentTransactions();
    fetchPaymentMethods();
    getCurrentCountry(countries).then(setMyCountry);
  }, []);

  // Live FX rates, refetched whenever the sender's account currency changes.
  useEffect(() => {
    getLiveExchangeRates(balanceData?.currency || "USD").then(setLiveRates);
  }, [balanceData?.currency]);

  // Rotate the ticker message every few seconds.
  useEffect(() => {
    const id = setInterval(() => setTickerIndex((i) => i + 1), 4000);
    return () => clearInterval(id);
  }, []);

  // Keep the ticker "fixed" to the viewport while scrolling, but push it up
  // by however much the footer has crept into view so it stops right at the
  // footer's top edge instead of covering it.
  useEffect(() => {
    const REST_GAP = 24;
    const handleScroll = () => {
      const footer = document.querySelector("footer");
      if (!footer) {
        setTickerBottom(REST_GAP);
        return;
      }
      const overlap = window.innerHeight - footer.getBoundingClientRect().top;
      setTickerBottom(overlap > 0 ? REST_GAP + overlap : REST_GAP);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);
    handleScroll();
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

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

  const fetchPaymentMethods = async () => {
    try {
      const res = await transactionsApi.get("/api/payment-methods/");
      setPaymentMethods({
        banks: res.data?.banks || [],
        cards: res.data?.cards || [],
      });
    } catch (err) {
      console.error("Failed to fetch payment methods", err);
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
    setMpesaNumber("");
    setAddMoneyCategory("bank");
    setMobileProvider("");
    setSelectedBankId(null);
    setSelectedCardId(null);
    setShowAddBankForm(false);
    setShowAddCardForm(false);
    setNewBank({ bankName: "", accountNumber: "", accountName: "" });
    setNewCard({ cardholderName: "", cardNumber: "", expiry: "" });
    setWithdrawDestination("mpesa");
    setInputPin("");
    setRecipientSearchTerm("");
    setSelectedRecipient(null);
    setRecipientCurrencyChoice("");
    setSendProgressStep(0);
    const nextSection = activeSection === section ? "dashboard" : section;
    const fromOrder = SECTION_ORDER[activeSection];
    const toOrder = SECTION_ORDER[nextSection];
    if (fromOrder !== undefined && toOrder !== undefined) {
      setSectionDirection(toOrder > fromOrder ? "right" : "left");
    }
    setActiveSection(nextSection);
  };

  const flowSectionClass = `${styles.flowSection} ${styles.nestedCard} ${sectionDirection === "left" ? styles.slideFromLeft : styles.slideFromRight}`;

  // Lets each flow's card keep its own natural, content-driven height while
  // still animating smoothly between heights when switching — the newly
  // mounted card starts pinned at the previous card's height (so there's no
  // instant jump), then a ResizeObserver eases it to its real content
  // height (and keeps tracking it if content inside changes size later,
  // e.g. Send Money's favourites list or the Friends/Groups tab swap).
  const lastFlowHeightRef = useRef(null);
  const flowResizeObserverRef = useRef(null);
  const flowResizeRafRef = useRef(null);

  // scrollHeight isn't reliable while an explicit (possibly shorter) height
  // is already pinned on the node — on an overflow:visible box that can
  // read back close to the pinned value instead of the true content size,
  // which compounded into a progressive shrink on every switch. Lifting the
  // height constraint just long enough to measure sidesteps that.
  const measureNaturalHeight = (node) => {
    const prevHeight = node.style.height;
    node.style.height = "auto";
    const height = node.offsetHeight;
    node.style.height = prevHeight;
    return height;
  };

  const flowSectionRef = (node) => {
    if (flowResizeObserverRef.current) {
      flowResizeObserverRef.current.disconnect();
      flowResizeObserverRef.current = null;
    }
    if (flowResizeRafRef.current) {
      cancelAnimationFrame(flowResizeRafRef.current);
      flowResizeRafRef.current = null;
    }
    if (!node) return;

    const naturalHeight = measureNaturalHeight(node);
    if (lastFlowHeightRef.current != null) {
      node.style.height = `${lastFlowHeightRef.current}px`;
      flowResizeRafRef.current = requestAnimationFrame(() => {
        node.style.height = `${naturalHeight}px`;
        lastFlowHeightRef.current = naturalHeight;
      });
    } else {
      lastFlowHeightRef.current = naturalHeight;
    }

    // Writing node.style.height directly inside the observer callback
    // resizes the very node it's observing, which trips the browser's
    // "ResizeObserver loop completed with undelivered notifications"
    // warning. Deferring the write to the next frame breaks that loop.
    const observer = new ResizeObserver(() => {
      if (flowResizeRafRef.current)
        cancelAnimationFrame(flowResizeRafRef.current);
      flowResizeRafRef.current = requestAnimationFrame(() => {
        const height = measureNaturalHeight(node);
        if (lastFlowHeightRef.current !== height) {
          node.style.height = `${height}px`;
          lastFlowHeightRef.current = height;
        }
      });
    });
    observer.observe(node);
    flowResizeObserverRef.current = observer;
  };

  // Lets the dashboard's top-bar search jump straight into a section (and,
  // for a friend result, pre-fill them as the Send Money recipient) without
  // going through switchSection's same-section "toggle back to dashboard"
  // behavior, since this is an external request rather than a button click.
  useEffect(() => {
    if (!navigateRequest) return;
    if (navigateRequest.section === "groups") {
      setActiveSection("groups");
      if (navigateRequest.groupsTab) setGroupsTab(navigateRequest.groupsTab);
    } else if (navigateRequest.section === "send") {
      setActiveSection("send");
      if (navigateRequest.recipient) {
        setSelectedRecipient(navigateRequest.recipient);
        setRecipientSearchTerm(
          navigateRequest.recipient.display_name ||
            navigateRequest.recipient.name ||
            navigateRequest.recipient.phone ||
            "",
        );
      }
    } else if (navigateRequest.section) {
      setActiveSection(navigateRequest.section);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigateRequest]);

  const filteredFavourites = (
    Array.isArray(favourites) ? favourites : []
  ).filter((f) => {
    const term = recipientSearchTerm.toLowerCase();
    if (!term) return false;
    const name = (f.name || f.full_name || "").toLowerCase();
    const phone = (f.phone || f.value || f.phone_number || "").toLowerCase();
    return name.includes(term) || phone.includes(term);
  });

  // Recipient's country, detected from whatever was typed/picked so we can
  // show their flag. A phone number's dial code gives this away instantly;
  // an email only reveals it if that address already belongs to one of our
  // favourites/contacts (i.e. an existing user) — otherwise we know nothing
  // about them yet.
  const findCountryByName = (name) =>
    name
      ? countries.find((c) => c.name.toLowerCase() === name.toLowerCase())
      : null;

  const recipientCountry = (() => {
    if (selectedRecipient) {
      return findCountryByName(
        selectedRecipient.country || selectedRecipient.country_name,
      );
    }

    const term = recipientSearchTerm.trim();
    if (!term) return null;

    if (term.includes("@")) {
      const match = (Array.isArray(favourites) ? favourites : []).find(
        (f) => (f.email || "").toLowerCase() === term.toLowerCase(),
      );
      return match
        ? findCountryByName(match.country || match.country_name)
        : null;
    }

    const digits = term.replace(/[^\d+]/g, "");
    if (!digits) return null;
    const matches = countries
      .filter((c) => digits.startsWith(c.code))
      .sort((a, b) => b.code.length - a.code.length);
    return matches[0] || null;
  })();

  // Converted value of the amount being sent, in the recipient's currency.
  // Detection from the recipient's number always wins once it succeeds —
  // the manual dropdown only fills in when nothing could be detected yet,
  // so this field never has nothing to show. Live rates (covering every
  // currency the API tracks) take priority over the small mocked table,
  // which only kicks in if the live fetch failed.
  const senderCurrency = balanceData?.currency || "USD";
  const availableCurrencies = Object.keys(
    liveRates || EXCHANGE_RATES[senderCurrency] || {},
  );
  const recipientCurrency =
    recipientCountry?.currency ||
    recipientCurrencyChoice ||
    availableCurrencies[0] ||
    "";
  const conversionRate =
    recipientCurrency === senderCurrency
      ? 1
      : (liveRates?.[recipientCurrency] ??
        EXCHANGE_RATES[senderCurrency]?.[recipientCurrency] ??
        null);
  const convertedSendAmount = conversionRate
    ? (parseFloat(sendAmount || 0) * conversionRate).toFixed(2)
    : null;

  // ponytail: flat 1.5% with a $1 minimum — placeholder pricing until a real
  // fees/pricing API exists to replace it.
  const sendAmountNum = parseFloat(sendAmount || 0);
  const sendFee = sendAmountNum > 0 ? Math.max(1, sendAmountNum * 0.015) : 0;
  const sendTotal = sendAmountNum + sendFee;

  // A fresh random country (never mine) picked on every ticker rotation —
  // re-rolled whenever tickerIndex changes, so each turn quotes a different
  // country's rate rather than sticking to one for the whole session.
  const tickerCountry = useMemo(() => {
    const pool = countries.filter((c) => c.name !== myCountry?.name);
    return pool[Math.floor(Math.random() * pool.length)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickerIndex, myCountry?.name]);

  const tickerCountryRate =
    tickerCountry?.currency === senderCurrency
      ? 1
      : (liveRates?.[tickerCountry?.currency] ??
        EXCHANGE_RATES[senderCurrency]?.[tickerCountry?.currency] ??
        null);

  // Strictly alternates between a random country's rate and Terms & Conditions.
  const tickerMessages = [
    tickerCountry && tickerCountryRate
      ? `1 ${senderCurrency} = ${tickerCountryRate} ${tickerCountry.currency} (${tickerCountry.name})`
      : null,
    "Read Our Terms & Conditions",
  ].filter(Boolean);

  const handleSelectRecipient = (fav) => {
    setSelectedRecipient(fav);
    setRecipientSearchTerm(
      fav.name || fav.full_name || fav.phone || fav.value || "",
    );
  };

  const handleAddRecipientToFavourites = async () => {
    const value = recipientSearchTerm.trim();
    if (!value) return;
    try {
      await contactsApi.post("/api/favorite/add/", {
        favourite_type: value.includes("@") ? "email" : "phone",
        favourite_detail: value,
        label: value,
      });
      showNotification("success", "Recipient added to favourites!");
      fetchFavourites();
    } catch (error) {
      const errorMsg =
        error.response?.data?.detail ||
        error.response?.data?.error ||
        "Failed to add recipient to favourites";
      showNotification("error", errorMsg);
    }
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
      `Send ${sendAmount} to ${recipientValue}?\nFee: ${senderCurrency} ${sendFee.toFixed(2)} · Total: ${senderCurrency} ${sendTotal.toFixed(2)}\n\nType 1 and click Yes to confirm.`,
      async (typedValue, buttonChoice) => {
        if (typedValue !== "1" || buttonChoice !== "yes") {
          showNotification("error", "Transaction cancelled");
          return;
        }
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        try {
          const token = localStorage.getItem("accessToken");
          setSendProgressStep(1);
          const requestPromise = transactionsApi.post(
            "/api/send-money/",
            {
              recipient_number: recipientValue,
              amount: parseFloat(sendAmount),
              fee: sendFee,
              transaction_pin: inputPin,
            },
            {
              headers: { Authorization: `Bearer ${token}` },
            },
          );
          await wait(700);
          setSendProgressStep(2);
          await wait(700);
          setSendProgressStep(3);
          await requestPromise;
          await wait(600);
          setSendProgressStep(0);
          showNotification("success", "Money sent successfully!");
          fetchBalance();
          fetchRecentTransactions();
          goToDashboard();
        } catch (error) {
          setSendProgressStep(0);
          const errorMsg =
            error.response?.data?.message ||
            error.response?.data?.error ||
            "Transfer failed";
          showNotification("error", errorMsg);
        }
      },
    );
  };

  // Region-specific mobile money providers + partner banks for the sender's
  // detected country (Kenya/EU/US get their own set, everything else falls
  // back to generic bank transfer).
  const region = getRegionProviders(myCountry);

  const handleAddMoneyClick = () => {
    if (!addAmount || Number(addAmount) <= 0) {
      showNotification("error", "Enter a valid amount");
      return;
    }
    setAddMoneyCategory(region.mobileMoney.length > 0 ? "mobile" : "bank");
    setMobileProvider(region.mobileMoney[0] || "");
    setShowAddBankForm(paymentMethods.banks.length === 0);
    setShowAddCardForm(paymentMethods.cards.length === 0);
    setShowAddMoneyPopup(true);
  };

  const handleAddBank = async () => {
    if (!newBank.bankName || !newBank.accountNumber || !newBank.accountName) {
      showNotification(
        "error",
        "Fill in bank, account number, and account name",
      );
      return;
    }
    try {
      const res = await transactionsApi.post(
        "/api/payment-methods/banks/",
        newBank,
      );
      const banks = res.data || [];
      setPaymentMethods((pm) => ({ ...pm, banks }));
      setSelectedBankId(banks[banks.length - 1]?.id ?? null);
      setShowAddBankForm(false);
      setNewBank({ bankName: "", accountNumber: "", accountName: "" });
    } catch (error) {
      showNotification("error", "Failed to save bank account");
    }
  };

  const handleAddCard = async () => {
    if (!newCard.cardholderName || !newCard.cardNumber || !newCard.expiry) {
      showNotification(
        "error",
        "Fill in cardholder name, card number, and expiry",
      );
      return;
    }
    try {
      const res = await transactionsApi.post(
        "/api/payment-methods/cards/",
        newCard,
      );
      const cards = res.data || [];
      setPaymentMethods((pm) => ({ ...pm, cards }));
      setSelectedCardId(cards[cards.length - 1]?.id ?? null);
      setShowAddCardForm(false);
      setNewCard({ cardholderName: "", cardNumber: "", expiry: "" });
    } catch (error) {
      showNotification("error", "Failed to save card");
    }
  };

  const handleAddMoney = async () => {
    if (!addAmount || Number(addAmount) <= 0) {
      showNotification("error", "Enter a valid amount");
      return;
    }
    if (addMoneyCategory === "mobile" && !mpesaNumber) {
      showNotification(
        "error",
        `Enter the ${mobileProvider} number to add from`,
      );
      return;
    }
    if (addMoneyCategory === "bank" && !selectedBankId) {
      showNotification("error", "Select or add a bank account");
      return;
    }
    if (addMoneyCategory === "card" && !selectedCardId) {
      showNotification("error", "Select or add a card");
      return;
    }

    const selectedBank = paymentMethods.banks.find(
      (b) => b.id === selectedBankId,
    );
    const selectedCard = paymentMethods.cards.find(
      (c) => c.id === selectedCardId,
    );
    const sourceLabel =
      addMoneyCategory === "mobile"
        ? mobileProvider
        : addMoneyCategory === "bank"
          ? `${selectedBank?.bankName} •••• ${String(selectedBank?.accountNumber).slice(-4)}`
          : `Visa •••• ${selectedCard?.last4}`;

    openConfirmationDialog(
      "Confirm Add Money",
      `Add ${balanceData?.currency || "$"}${addAmount} from ${sourceLabel}?\n\nType 1 and click Yes to confirm.`,
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
            {
              amount: parseFloat(addAmount),
              source: addMoneyCategory,
              ...(addMoneyCategory === "mobile" && {
                provider: mobileProvider,
                mobile_number: mpesaNumber,
              }),
              ...(addMoneyCategory === "bank" && { bank_id: selectedBankId }),
              ...(addMoneyCategory === "card" && { card_id: selectedCardId }),
            },
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

  const withdrawDestinationValue =
    withdrawDestination === "mpesa" ? mpesaNumber : agentNumber;

  const handleWithdrawClick = () => {
    if (
      !withdrawAmount ||
      Number(withdrawAmount) <= 0 ||
      inputPin.length !== 4
    ) {
      showNotification("error", "Enter an amount and 4-digit PIN");
      return;
    }
    // Mpesa is only a real withdrawal rail in Kenya — default elsewhere to
    // the option that's actually shown.
    if (region.mobileMoney.length === 0) setWithdrawDestination("agent");
    setShowWithdrawPopup(true);
  };

  const handleWithdraw = async () => {
    if (
      !withdrawAmount ||
      Number(withdrawAmount) <= 0 ||
      !withdrawDestinationValue ||
      inputPin.length !== 4
    ) {
      showNotification(
        "error",
        `Enter an amount, ${withdrawDestination === "mpesa" ? "Mpesa number" : "agent number"}, and 4-digit PIN`,
      );
      return;
    }

    openConfirmationDialog(
      "Confirm Withdrawal",
      `Withdraw ${balanceData?.currency || "$"}${withdrawAmount} to ${withdrawDestination === "mpesa" ? "Mpesa" : "Payzarc agent"} ${withdrawDestinationValue}?\n\nType 1 and click Yes to confirm.`,
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
              destination: withdrawDestination,
              ...(withdrawDestination === "mpesa"
                ? { mpesa_number: withdrawDestinationValue }
                : { agent_number: withdrawDestinationValue }),
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
      </section>

      {/* Balance card + whichever flow is active share one card (background
          + blur) instead of stacking as two separate cards. bodyContainer
          always renders; a flow section joins it once one is open. */}
      <div className={styles.balanceFlowWrap}>
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
            <span className={showBalance ? undefined : styles.balanceMasked}>
              {formattedBalance}
            </span>
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

          {/* Action buttons stay visible & highlighted across every section —
              only the panel below (Recent Activity vs. a flow) swaps out. */}
        </div>

        {activeSection === "add-money" && (
          <section ref={flowSectionRef} className={flowSectionClass}>
            <div className={styles.flowHeader}>
              <button className={styles.backBtn} onClick={goToDashboard}>
                <ArrowLeft size={18} /> Back
              </button>
              <h2 className={styles.flowTitle}>Add Money</h2>
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

              <button
                className={styles.primaryBtn}
                onClick={handleAddMoneyClick}
              >
                Add {balanceData?.currency || "$"}
                {addAmount || "0.00"}
              </button>
            </div>
          </section>
        )}

        {activeSection === "withdraw" && (
          <section ref={flowSectionRef} className={flowSectionClass}>
            <div className={styles.flowHeader}>
              <button className={styles.backBtn} onClick={goToDashboard}>
                <ArrowLeft size={18} /> Back
              </button>
              <h2 className={styles.flowTitle}>Withdraw</h2>
            </div>

            <div className={styles.flowForm}>
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

              <button
                className={styles.primaryBtn}
                onClick={handleWithdrawClick}
              >
                Withdraw
              </button>
            </div>
          </section>
        )}

        {activeSection === "send" && (
          <section ref={flowSectionRef} className={flowSectionClass}>
            <div className={styles.flowHeader}>
              <button className={styles.backBtn} onClick={goToDashboard}>
                <ArrowLeft size={18} /> Back
              </button>
              <h2 className={styles.flowTitle}>Send Money</h2>
            </div>

            <div className={styles.flowForm}>
              {myCountry && (
                <span className={styles.sendingFrom}>
                  Sending From {isoToFlagEmoji(myCountry.flag)}
                </span>
              )}
              <label className={styles.formLabel}>
                Recipient
                {recipientCountry && (
                  <span className={styles.recipientFlag}>
                    {isoToFlagEmoji(recipientCountry.flag)}{" "}
                    {recipientCountry.name}
                  </span>
                )}
              </label>
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
              {recipientSearchTerm && !selectedRecipient && (
                <button
                  type="button"
                  className={styles.addFavouriteBtn}
                  onClick={handleAddRecipientToFavourites}
                >
                  + Add recipient to favourites
                </button>
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
              <div className={styles.convertedBox}>
                {availableCurrencies.length > 0 ? (
                  <>
                    <div className={styles.convertedRow}>
                      <span className={styles.convertedAmount}>
                        ≈ {Number(convertedSendAmount || 0).toLocaleString()}
                      </span>
                      <select
                        className={styles.currencySelect}
                        value={recipientCurrency}
                        disabled={!!recipientCountry}
                        title={
                          recipientCountry
                            ? "Detected from recipient's number"
                            : undefined
                        }
                        onChange={(e) =>
                          setRecipientCurrencyChoice(e.target.value)
                        }
                      >
                        {availableCurrencies.map((ccy) => (
                          <option key={ccy} value={ccy}>
                            {ccy}
                          </option>
                        ))}
                      </select>
                    </div>
                    <span className={styles.convertedMeta}>
                      1 {senderCurrency} = {conversionRate} {recipientCurrency}{" "}
                      · {liveRates ? "live rate" : "indicative rate"}
                    </span>
                  </>
                ) : (
                  <span className={styles.convertedMeta}>
                    Conversion unavailable for {senderCurrency}
                  </span>
                )}
              </div>

              {sendAmountNum > 0 && (
                <div className={styles.feeBox}>
                  <div className={styles.feeRow}>
                    <span>Transaction Fee</span>
                    <span>
                      {senderCurrency} {sendFee.toFixed(2)}
                    </span>
                  </div>
                  <div className={styles.feeRow}>
                    <span>Total to pay</span>
                    <span className={styles.feeTotal}>
                      {senderCurrency} {sendTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

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

        {/* Groups — shows Friends.js and Groups.js as tabs inside the same
            card. Back button floats above the card via .flowHeader (same as
            the other flows), outside the card's own padding; the tab row is
            the top element inside the card, and Friends/Groups no longer
            bring their own chrome, so the listing sits flush against this
            card's padding. */}
        {activeSection === "groups" && (
          <div ref={flowSectionRef} className={flowSectionClass}>
            <div className={styles.flowHeader}>
              <button className={styles.backBtn} onClick={goToDashboard}>
                <ArrowLeft size={18} /> Back
              </button>
            </div>

            <div className={styles.groupsTabs}>
              <button
                className={`${styles.groupsTab} ${groupsTab === "friends" ? styles.groupsTabActive : ""}`}
                onClick={() => selectGroupsTab("friends")}
              >
                Friends
              </button>
              <span className={styles.groupsTabDivider} />
              <button
                className={`${styles.groupsTab} ${groupsTab === "groups" ? styles.groupsTabActive : ""}`}
                onClick={() => selectGroupsTab("groups")}
              >
                Groups
              </button>
            </div>

            {groupsTab === "friends" ? (
              <div
                key="friends"
                className={`${styles.groupsListing} ${groupsTabDirection === "left" ? styles.slideFromLeft : styles.slideFromRight}`}
              >
                <Friends />
              </div>
            ) : (
              <div
                key="groups"
                className={
                  groupsTabDirection === "left"
                    ? styles.slideFromLeft
                    : styles.slideFromRight
                }
              >
                <Groups />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Overview / Recent Activity Section — dashboard only */}
      {activeSection === "dashboard" && (
        <div className={styles.displayWindow}>
          {showHistoryModal ? (
            <div className={styles.historyModal}>
              <div className={styles.flowHeader}>
                <button
                  className={styles.backBtn}
                  onClick={() => setShowHistoryModal(false)}
                >
                  <ArrowLeft size={18} /> Back
                </button>
                <h2>All Transactions</h2>
              </div>
              <History
                selectedTransaction={selectedTransaction}
                openDetailsPopup={setSelectedTransaction}
                closeDetailsPopup={() => setSelectedTransaction(null)}
              />
            </div>
          ) : (
            <section className={styles.overviewSection}>
              <div className={styles.sectionHeader}>
                <h2>Recent Activity</h2>
                <button
                  className={styles.viewAllBtn}
                  onClick={() => setShowHistoryModal(true)}
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
          )}
        </div>
      )}

      {/* Floating market ticker — sits to the right, follows scroll, and
          stops just above the footer instead of covering it. */}
      {activeSection === "dashboard" && tickerMessages.length > 0 && (
        <button
          type="button"
          className={styles.marketTicker}
          style={{ bottom: tickerBottom }}
          onClick={() => setTickerIndex((i) => i + 1)}
        >
          <span key={tickerIndex} className={styles.marketTickerText}>
            {tickerMessages[tickerIndex % tickerMessages.length]}
          </span>
        </button>
      )}

      {/* Add Money — service picker popup, shown once a valid amount is entered */}
      {showAddMoneyPopup && (
        <div
          className={styles.popupOverlay}
          onClick={() => setShowAddMoneyPopup(false)}
        >
          <div
            className={styles.popupPanel}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={styles.popupTitle}>Add money from</h3>

            <div className={styles.methodRow}>
              {region.mobileMoney.length > 0 && (
                <button
                  type="button"
                  className={`${styles.methodBtn} ${addMoneyCategory === "mobile" ? styles.methodBtnActive : ""}`}
                  onClick={() => setAddMoneyCategory("mobile")}
                >
                  Mobile Money
                </button>
              )}
              <button
                type="button"
                className={`${styles.methodBtn} ${addMoneyCategory === "bank" ? styles.methodBtnActive : ""}`}
                onClick={() => setAddMoneyCategory("bank")}
              >
                Bank Transfer
              </button>
              <button
                type="button"
                className={`${styles.methodBtn} ${addMoneyCategory === "card" ? styles.methodBtnActive : ""}`}
                onClick={() => setAddMoneyCategory("card")}
              >
                Card
              </button>
            </div>

            {addMoneyCategory === "mobile" && (
              <>
                <div className={styles.methodRow}>
                  {region.mobileMoney.map((provider) => (
                    <button
                      key={provider}
                      type="button"
                      className={`${styles.methodBtn} ${mobileProvider === provider ? styles.methodBtnActive : ""}`}
                      onClick={() => setMobileProvider(provider)}
                    >
                      {provider}
                    </button>
                  ))}
                </div>
                <label className={styles.formLabel}>
                  {mobileProvider} number
                </label>
                <input
                  className={styles.formInput}
                  placeholder="e.g. 254712345678"
                  value={mpesaNumber}
                  onChange={(e) => setMpesaNumber(e.target.value)}
                />
              </>
            )}

            {addMoneyCategory === "bank" &&
              (showAddBankForm ? (
                <>
                  <label className={styles.formLabel}>Bank</label>
                  <select
                    className={styles.formInput}
                    value={newBank.bankName}
                    onChange={(e) =>
                      setNewBank({ ...newBank, bankName: e.target.value })
                    }
                  >
                    <option value="">Select a bank</option>
                    {region.partnerBanks.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                  <label className={styles.formLabel}>Account number</label>
                  <input
                    className={styles.formInput}
                    value={newBank.accountNumber}
                    onChange={(e) =>
                      setNewBank({ ...newBank, accountNumber: e.target.value })
                    }
                  />
                  <label className={styles.formLabel}>Account name</label>
                  <input
                    className={styles.formInput}
                    value={newBank.accountName}
                    onChange={(e) =>
                      setNewBank({ ...newBank, accountName: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    className={styles.addFavouriteBtn}
                    onClick={handleAddBank}
                  >
                    + Save bank account
                  </button>
                  {paymentMethods.banks.length > 0 && (
                    <button
                      type="button"
                      className={styles.addFavouriteBtn}
                      onClick={() => setShowAddBankForm(false)}
                    >
                      Use a saved bank instead
                    </button>
                  )}
                </>
              ) : (
                <>
                  <label className={styles.formLabel}>Bank account</label>
                  <div className={styles.favouriteList}>
                    {paymentMethods.banks.map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        className={`${styles.favouriteChip} ${selectedBankId === b.id ? styles.favouriteChipActive : ""}`}
                        onClick={() => setSelectedBankId(b.id)}
                      >
                        {b.bankName} •••• {String(b.accountNumber).slice(-4)}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className={styles.addFavouriteBtn}
                    onClick={() => setShowAddBankForm(true)}
                  >
                    + Add another bank
                  </button>
                </>
              ))}

            {addMoneyCategory === "card" &&
              (showAddCardForm ? (
                <>
                  <label className={styles.formLabel}>Cardholder name</label>
                  <input
                    className={styles.formInput}
                    value={newCard.cardholderName}
                    onChange={(e) =>
                      setNewCard({ ...newCard, cardholderName: e.target.value })
                    }
                  />
                  <label className={styles.formLabel}>Card number</label>
                  <input
                    className={styles.formInput}
                    maxLength={19}
                    placeholder="4111 1111 1111 1111"
                    value={newCard.cardNumber}
                    onChange={(e) =>
                      setNewCard({ ...newCard, cardNumber: e.target.value })
                    }
                  />
                  <label className={styles.formLabel}>Expiry (MM/YY)</label>
                  <input
                    className={styles.formInput}
                    maxLength={5}
                    placeholder="MM/YY"
                    value={newCard.expiry}
                    onChange={(e) =>
                      setNewCard({ ...newCard, expiry: e.target.value })
                    }
                  />
                  <button
                    type="button"
                    className={styles.addFavouriteBtn}
                    onClick={handleAddCard}
                  >
                    + Save card
                  </button>
                  {paymentMethods.cards.length > 0 && (
                    <button
                      type="button"
                      className={styles.addFavouriteBtn}
                      onClick={() => setShowAddCardForm(false)}
                    >
                      Use a saved card instead
                    </button>
                  )}
                </>
              ) : (
                <>
                  <label className={styles.formLabel}>Card</label>
                  <div className={styles.favouriteList}>
                    {paymentMethods.cards.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className={`${styles.favouriteChip} ${selectedCardId === c.id ? styles.favouriteChipActive : ""}`}
                        onClick={() => setSelectedCardId(c.id)}
                      >
                        {c.brand} •••• {c.last4}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    className={styles.addFavouriteBtn}
                    onClick={() => setShowAddCardForm(true)}
                  >
                    + Add another card
                  </button>
                </>
              ))}

            <button
              className={styles.primaryBtn}
              onClick={() => {
                setShowAddMoneyPopup(false);
                handleAddMoney();
              }}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Withdraw — service picker popup, shown once amount + PIN are entered */}
      {showWithdrawPopup && (
        <div
          className={styles.popupOverlay}
          onClick={() => setShowWithdrawPopup(false)}
        >
          <div
            className={styles.popupPanel}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={styles.popupTitle}>Withdraw via</h3>
            <div className={styles.methodRow}>
              {(region.mobileMoney.length > 0
                ? ["mpesa", "agent"]
                : ["agent"]
              ).map((dest) => (
                <button
                  key={dest}
                  type="button"
                  className={`${styles.methodBtn} ${withdrawDestination === dest ? styles.methodBtnActive : ""}`}
                  onClick={() => setWithdrawDestination(dest)}
                >
                  {dest === "mpesa" ? "Mpesa" : "Payzarc Agent"}
                </button>
              ))}
            </div>

            <label className={styles.formLabel}>
              {withdrawDestination === "mpesa"
                ? "Mpesa number"
                : "Agent number"}
            </label>
            <input
              className={styles.formInput}
              placeholder={
                withdrawDestination === "mpesa"
                  ? "e.g. 254712345678"
                  : "e.g. AG-10293"
              }
              value={
                withdrawDestination === "mpesa" ? mpesaNumber : agentNumber
              }
              onChange={(e) =>
                withdrawDestination === "mpesa"
                  ? setMpesaNumber(e.target.value)
                  : setAgentNumber(e.target.value)
              }
            />

            <button
              className={styles.primaryBtn}
              onClick={() => {
                setShowWithdrawPopup(false);
                handleWithdraw();
              }}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Send Money — step-by-step "money in transit" visual, shown while
          the transfer is in flight after confirming. */}
      {sendProgressStep > 0 && (
        <div className={styles.popupOverlay}>
          <div className={styles.popupPanel}>
            <h3 className={styles.popupTitle}>Sending money…</h3>

            <div className={styles.progressTrackVertical}>
              {SEND_STEPS.map((step, idx) => {
                const stepNum = idx + 1;
                const isLast = idx === SEND_STEPS.length - 1;
                const isPast = sendProgressStep > stepNum;
                const isCurrent = sendProgressStep === stepNum;
                const reached = sendProgressStep >= stepNum;
                const StepIcon = isPast ? Check : step.icon;
                return (
                  <div key={step.label} className={styles.progressNodeVertical}>
                    <div className={styles.progressDotColumn}>
                      <div
                        className={`${styles.progressDotVertical} ${reached ? styles.progressDotActive : ""} ${isCurrent && !isLast ? styles.progressDotPulse : ""}`}
                      >
                        <StepIcon
                          size={15}
                          className={
                            isCurrent && step.spin ? styles.spinIcon : undefined
                          }
                        />
                      </div>
                      {!isLast && (
                        <div
                          className={`${styles.progressConnector} ${sendProgressStep > stepNum ? styles.progressConnectorActive : ""}`}
                        />
                      )}
                    </div>
                    <div className={styles.progressNodeContent}>
                      <span
                        className={`${styles.progressNodeTitle} ${reached ? "" : styles.progressNodeTitleMuted}`}
                      >
                        {step.label}
                      </span>
                      <p className={styles.progressNodeSub}>{step.sub}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className={styles.progressSub}>
              {balanceData?.currency || "$"}
              {sendAmount} to{" "}
              {selectedRecipient?.display_name ||
                selectedRecipient?.name ||
                recipientSearchTerm}
            </p>
          </div>
        </div>
      )}

      {/* Confirmation Popup */}
      <YesNoPopup
        isOpen={openDialog}
        title={dialogTitle}
        message={dialogMessage}
        onSubmit={handleDialogConfirm}
        onClose={() => setOpenDialog(false)}
        isNotification={notificationOnly}
      />
    </div>
  );
}

export default Home;
