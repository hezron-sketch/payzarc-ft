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
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

// The four balance-card action buttons — one config-driven list instead of
// four near-identical JSX blocks. Rendered as a single segmented tab strip
// (icon + label side by side, active one filled gold) — same visual
// language as the Friends/Groups TabsList further down this file — rather
// than four separate icon-over-label tiles.
const ACTION_TILES = [
  { key: "add-money", label: "Add Money", icon: PlusCircle },
  { key: "withdraw", label: "Withdraw", icon: ArrowDownCircle },
  { key: "send", label: "Send", icon: Send },
  { key: "groups", label: "Groups", icon: UsersRound },
];

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

// Shared class strings for the repeated form pieces across Add Money /
// Withdraw / Send / the service-picker dialogs — kept as plain Tailwind
// strings (not new components) since they're just markup, not behavior.
// Restyled to match the sketch's surface language used everywhere else on
// the dashboard now (translucent white/[0.0X] surfaces, rounded-xl/2xl,
// gold-500-style CTAs with active:scale feedback) instead of the older
// bg-secondary/rounded-md look these predate.
const formLabelClass =
  "flex items-center justify-between text-[11px] font-medium text-muted-foreground uppercase tracking-wider -mb-[0.4rem]";
const formInputClass =
  "w-full h-auto bg-white/[0.03] border-white/[0.06] rounded-xl px-4 py-3.5 text-foreground text-base md:text-base placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-gold/[0.08] focus-visible:border-gold/30 focus-visible:bg-white/[0.07] shadow-none transition-colors duration-200";
const primaryBtnClass =
  "w-full h-auto rounded-xl px-5 py-3.5 text-base font-bold text-black transition-all duration-200 hover:bg-primary active:scale-[0.97] disabled:opacity-60 disabled:active:scale-100 mt-1 shadow-lg shadow-gold/10 hover:shadow-gold/20";
const addFavouriteBtnClass =
  "self-start bg-transparent border-none text-gold text-[0.8rem] font-semibold cursor-pointer p-0 -mt-[0.6rem] transition-opacity hover:opacity-75";
// Add Money modal's own "+ Save/Add/Use a saved..." links — a real
// pill-shaped button with proper padding instead of addFavouriteBtnClass's
// bare, zero-padding text link (which reads as squished right under the
// field above it).
const modalAddLinkClass =
  "self-start inline-flex items-center gap-1 bg-white/[0.04] border border-white/[0.08] rounded-full px-3.5 py-1.5 text-gold text-[0.78rem] font-semibold cursor-pointer transition-colors hover:bg-white/[0.07] hover:border-gold/30";
const methodBtnClass = (active) =>
  cn(
    "flex-1 bg-white/[0.02] border border-white/[0.05] text-muted-foreground px-2 py-2.5 rounded-xl text-[0.8rem] font-semibold transition-all duration-200 hover:bg-white/[0.05] hover:border-gold/20 hover:text-foreground",
    active &&
      "bg-gold/10 border-gold/30 text-gold hover:border-gold/40 hover:bg-gold/10 hover:text-gold",
  );
const favouriteChipClass = (active) =>
  cn(
    "bg-white/[0.03] border border-white/[0.08] text-foreground px-3.5 py-2 rounded-full text-[0.85rem] font-medium transition-colors hover:border-gold/40 hover:text-gold",
    active && "bg-gold/10 border-gold/40 text-gold",
  );
// Recent Activity's per-row status chip — colored by keyword match on the
// real tx.status string (no fixed enum from the API), default reads as
// "completed" since that's the overwhelmingly common status. Split into a
// pill class + dot class so the call site can render dot + label like the
// sketch's status chips instead of a single flat-colored pill.
const txStatusTone = (status) => {
  const s = (status || "").toLowerCase();
  if (s.includes("fail") || s.includes("declin")) return "destructive";
  if (s.includes("pend")) return "gold";
  return "success";
};
const txStatusBadgeClass = (status) => {
  const tone = txStatusTone(status);
  return cn(
    "hidden sm:inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-semibold uppercase tracking-wide shrink-0",
    tone === "destructive" &&
      "bg-destructive/10 text-destructive border-destructive/10",
    tone === "gold" && "bg-gold/10 text-gold border-gold/10",
    tone === "success" && "bg-success/10 text-success border-success/10",
  );
};
const txStatusDotClass = (status) => {
  const tone = txStatusTone(status);
  return cn(
    "w-1 h-1 rounded-full mr-1.5",
    tone === "destructive" && "bg-destructive",
    tone === "gold" && "bg-gold",
    tone === "success" && "bg-success",
  );
};

function Home({ onPageChange, user, navigateRequest }) {
  const [activeSection, setActiveSection] = useState("dashboard");
  // Which way the incoming flow panel slides in from, based on the action
  // buttons' left-to-right order (Add Money, Withdraw, Send, Groups).
  const [sectionDirection, setSectionDirection] = useState("right");
  const [showBalance, setShowBalance] = useState(false);
  const [balanceData, setBalanceData] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [balanceError, setBalanceError] = useState(null);

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
      });
    } catch (err) {
      console.error("Failed to fetch payment methods", err);
    }
  };

  const toggleBalance = () => setShowBalance(!showBalance);

  // Currency shown for the account: trust the backend's currency for this
  // account first, fall back to the currency of the user's detected country
  // (myCountry) rather than hardcoding USD/"$".
  const displayCurrency = balanceData?.currency || myCountry?.currency || "USD";

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

  // Shared layout for whichever flow (Add Money/Withdraw/Send/Groups) is
  // currently mounted — its own card now (balance card, tab strip and this
  // are three separate cards, matching the redesign), not flush inside the
  // balance card — just spacing + the directional slide-in, recomputed on
  // every render since sectionDirection can change.
  const flowSectionClass = cn(
    "relative p-8 w-full min-h-[560px] flex flex-col gap-7 bg-card rounded-2xl transition-[height] duration-300 ease-in-out",
    "max-[640px]:p-6 max-[640px]:px-5 max-[640px]:gap-6 max-[640px]:min-h-[480px]",
    sectionDirection === "left"
      ? "animate-slide-in-left"
      : "animate-slide-in-right",
  );

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
  const senderCurrency = displayCurrency;
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
      `Add ${displayCurrency}${addAmount} from ${sourceLabel}?\n\nType 1 and click Yes to confirm.`,
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
      `Withdraw ${displayCurrency}${withdrawAmount} to ${withdrawDestination === "mpesa" ? "Mpesa" : "agent"} ${withdrawDestinationValue}?\n\nType 1 and click Yes to confirm.`,
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
    <>
      <section className="w-full max-w-[1320px] mx-auto flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10 pb-8">
        <h1 className="text-[clamp(2.25rem,5vw,3.5rem)] font-bold tracking-[2px] text-gold leading-[1.05] m-0 shrink-0">
          PAYZARC
        </h1>
        <div className="flex flex-col items-start text-left">
          <h2 className="text-[clamp(1.4rem,2.6vw,1.85rem)] font-bold leading-[1.15] tracking-[-1px] text-foreground m-0 mb-2">
            Send money
            <br />
            at <span className="text-gold">Lower Rates</span>
          </h2>
          <p className="text-[0.95rem] text-muted-foreground max-w-[420px] leading-[1.6] m-0">
            We offer industry-leading exchange rates with no hidden fees.
            Save more for every transaction you make.
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 w-full max-w-[1320px] mx-auto">
        {/* LEFT COLUMN — balance card, tab strip, whichever flow is active,
          and Recent Activity, all sharing the same column width (matches
          the sketch's lg:col-span-8 left column instead of the balance
          card being its own narrower centered block). */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          <div className="flex flex-col gap-6">
            <div className="bg-card rounded-lg overflow-hidden">
              <div className="w-full flex flex-col items-center px-8 pt-9 pb-11">
                <div className="w-full flex items-start justify-between mb-7">
                  <div className="flex flex-col items-start">
                    <div className="flex items-center gap-2.5 mb-2">
                      <span className="text-muted-foreground text-[0.8rem] font-medium tracking-wide">
                        Total Balance
                      </span>
                      <button
                        className="bg-transparent border-none text-[var(--muted)] flex items-center transition-colors duration-200 hover:text-foreground"
                        onClick={toggleBalance}
                      >
                        {showBalance ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    <h1 className="text-[clamp(1.85rem,4vw,2.75rem)] font-extrabold text-gold tracking-[-1px] m-0 flex items-baseline gap-2 max-[640px]:text-[2.25rem]">
                      <span className="opacity-75">{displayCurrency}</span>
                      <span
                        className={cn(
                          "relative overflow-hidden rounded-2xl before:content-[''] before:absolute before:inset-0 before:[backdrop-filter:blur(2rem)] before:rounded-[inherit] before:pointer-events-none before:opacity-0 before:transition-opacity before:duration-[250ms]",
                          !showBalance && "select-none before:opacity-100",
                        )}
                      >
                        {formattedBalance}
                      </span>
                    </h1>
                  </div>
                </div>
              </div>
              <div className="h-[2px] w-full bg-[linear-gradient(90deg,transparent_0%,rgba(236,201,75,0.15)_30%,rgba(236,201,75,0.3)_50%,rgba(236,201,75,0.15)_70%,transparent_100%)]" />
            </div>

            {/* Tab strip — action buttons stay visible & highlighted across
            every section; only the content card below swaps out. */}
            <div className="flex items-center gap-1 bg-card rounded-2xl p-1.5">
              {ACTION_TILES.map(({ key, label, icon: Icon }) => {
                const active = activeSection === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => switchSection(key)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-[0.82rem] font-semibold cursor-pointer transition-all duration-200 max-[640px]:flex-none max-[640px]:px-4",
                      active
                        ? "bg-gold text-black shadow-lg shadow-gold/[0.15]"
                        : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground",
                    )}
                  >
                    <Icon size={16} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            {activeSection === "add-money" && (
              <section ref={flowSectionRef} className={flowSectionClass}>
                <div className="flex flex-col gap-[1.1rem] w-full max-w-[420px] mx-auto max-[640px]:max-w-full">
                  <Label className={formLabelClass}>Amount</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    className={formInputClass}
                    placeholder="0.00"
                    value={addAmount}
                    onChange={(e) => setAddAmount(e.target.value)}
                  />

                  <Button
                    className={primaryBtnClass}
                    onClick={handleAddMoneyClick}
                  >
                    Add {displayCurrency}
                    {addAmount || "0.00"}
                  </Button>
                </div>
              </section>
            )}

            {activeSection === "withdraw" && (
              <section ref={flowSectionRef} className={flowSectionClass}>
                <div className="flex flex-col gap-[1.1rem] w-full max-w-[420px] mx-auto max-[640px]:max-w-full">
                  <Label className={formLabelClass}>Amount</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    className={formInputClass}
                    placeholder="0.00"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                  />

                  <Label className={formLabelClass}>Transaction PIN</Label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    className={formInputClass}
                    placeholder="****"
                    value={inputPin}
                    onChange={(e) =>
                      setInputPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                    }
                  />

                  <Button
                    className={primaryBtnClass}
                    onClick={handleWithdrawClick}
                  >
                    Withdraw
                  </Button>
                </div>
              </section>
            )}

            {activeSection === "send" && (
              <section ref={flowSectionRef} className={flowSectionClass}>
                <div className="flex flex-col gap-[1.1rem] w-full max-w-[420px] mx-auto max-[640px]:max-w-full">
                  {myCountry && (
                    <span className="flex items-center gap-1.5 text-[0.85rem] font-semibold text-[var(--muted)]">
                      Sending From {isoToFlagEmoji(myCountry.flag)}
                    </span>
                  )}
                  <Label className={formLabelClass}>
                    Recipient
                    {recipientCountry && (
                      <span className="font-medium text-muted-foreground">
                        {isoToFlagEmoji(recipientCountry.flag)}{" "}
                        {recipientCountry.name}
                      </span>
                    )}
                  </Label>
                  <Input
                    className={formInputClass}
                    placeholder="Search favourites or enter a number"
                    value={recipientSearchTerm}
                    onChange={(e) => {
                      setRecipientSearchTerm(e.target.value);
                      setSelectedRecipient(null);
                    }}
                  />
                  {recipientSearchTerm && filteredFavourites.length > 0 && (
                    <div className="flex flex-wrap gap-2 -mt-[0.6rem]">
                      {filteredFavourites.map((fav, idx) => (
                        <button
                          key={fav.id || idx}
                          type="button"
                          className={favouriteChipClass(false)}
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
                      className={addFavouriteBtnClass}
                      onClick={handleAddRecipientToFavourites}
                    >
                      + Add recipient to favourites
                    </button>
                  )}

                  <Label className={formLabelClass}>Amount</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    className={formInputClass}
                    placeholder="0.00"
                    value={sendAmount}
                    onChange={(e) => setSendAmount(e.target.value)}
                  />
                  <div className="bg-[var(--gold-pale)] border border-dashed border-[var(--gold-border)] rounded-xl px-4 py-[0.85rem] text-center -mt-[0.6rem]">
                    {availableCurrencies.length > 0 ? (
                      <>
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-[1.2rem] font-bold text-gold tracking-[-0.3px]">
                            ≈{" "}
                            {Number(convertedSendAmount || 0).toLocaleString()}
                          </span>
                          <select
                            className="bg-white/[0.06] text-gold border border-[var(--gold-border)] rounded-sm px-2 py-1 text-[0.95rem] font-bold cursor-pointer outline-none disabled:opacity-85 disabled:cursor-default"
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
                        <span className="block text-xs text-gold/60 mt-1">
                          1 {senderCurrency} = {conversionRate}{" "}
                          {recipientCurrency} ·{" "}
                          {liveRates ? "live rate" : "indicative rate"}
                        </span>
                      </>
                    ) : (
                      <span className="block text-xs text-gold/60 mt-1">
                        Conversion unavailable for {senderCurrency}
                      </span>
                    )}
                  </div>

                  {sendAmountNum > 0 && (
                    <div className="flex flex-col gap-1.5 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-[0.85rem] -mt-[0.6rem]">
                      <div className="flex items-center justify-between text-[0.85rem] text-muted-foreground">
                        <span>Transaction Fee</span>
                        <span>
                          {senderCurrency} {sendFee.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[0.85rem] text-muted-foreground">
                        <span>Total to pay</span>
                        <span className="text-gold font-bold">
                          {senderCurrency} {sendTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}

                  <Label className={formLabelClass}>Transaction PIN</Label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    className={formInputClass}
                    placeholder="****"
                    value={inputPin}
                    onChange={(e) =>
                      setInputPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                    }
                  />

                  <Button className={primaryBtnClass} onClick={handleSendMoney}>
                    Send
                  </Button>
                </div>
              </section>
            )}

            {/* Groups — shows Friends.js and Groups.js as tabs inside the same
            flowSectionClass card the other flows use (Add Money/Withdraw/
            Send), for a consistent look across all four tabs. */}
            {activeSection === "groups" && (
              <div ref={flowSectionRef} className={flowSectionClass}>
                <Tabs value={groupsTab} onValueChange={selectGroupsTab}>
                  <TabsList className="grid grid-cols-2 w-full h-auto p-1 rounded-full bg-white/[0.04] gap-1">
                    <TabsTrigger
                      value="friends"
                      className="rounded-full py-2 text-[0.85rem] font-semibold text-muted-foreground data-[state=active]:bg-gold data-[state=active]:text-black data-[state=active]:shadow-none hover:text-foreground"
                    >
                      Friends
                    </TabsTrigger>
                    <TabsTrigger
                      value="groups"
                      className="rounded-full py-2 text-[0.85rem] font-semibold text-muted-foreground data-[state=active]:bg-gold data-[state=active]:text-black data-[state=active]:shadow-none hover:text-foreground"
                    >
                      Groups
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                {groupsTab === "friends" ? (
                  <div
                    key="friends"
                    className={
                      groupsTabDirection === "left"
                        ? "animate-slide-in-left"
                        : "animate-slide-in-right"
                    }
                  >
                    <Friends />
                  </div>
                ) : (
                  <div
                    key="groups"
                    className={
                      groupsTabDirection === "left"
                        ? "animate-slide-in-left"
                        : "animate-slide-in-right"
                    }
                  >
                    <Groups />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Recent Activity — always visible now (matches the sketch, where
          the activity list sits below the tab content regardless of which
          tab is selected), not just on a neutral "dashboard" state. */}
          <div className="flex flex-col items-center">
            {showHistoryModal ? (
              <div className="relative w-full flex flex-col gap-4 animate-flow-fade-in">
                <History
                  selectedTransaction={selectedTransaction}
                  openDetailsPopup={setSelectedTransaction}
                  closeDetailsPopup={() => setSelectedTransaction(null)}
                />
              </div>
            ) : (
              <div className="w-full">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[1.05rem] font-bold text-foreground tracking-tight m-0">
                    Recent Activity
                  </h2>
                  <button
                    className="bg-transparent border-none text-gold text-xs font-medium cursor-pointer flex items-center gap-1 transition-colors hover:text-gold-dark"
                    onClick={() => setShowHistoryModal(true)}
                  >
                    View all <ArrowRight size={14} />
                  </button>
                </div>

                <div className="bg-card rounded-2xl overflow-hidden">
                  {recentTransactions.length === 0 ? (
                    <p className="text-center text-[0.9rem] text-muted-foreground py-8">
                      No recent activity yet.
                    </p>
                  ) : (
                    recentTransactions.map((tx, idx) => {
                      const credit =
                        tx.transaction_type === "CREDIT" ||
                        tx.type === "receive";
                      return (
                        <div
                          key={tx.id || idx}
                          className="flex items-center gap-4 p-4 md:p-5 border-b border-white/[0.03] last:border-b-0 transition-all duration-200 hover:bg-white/[0.025] cursor-default"
                        >
                          <div
                            className={cn(
                              "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
                              credit
                                ? "bg-success/[0.08] text-success"
                                : "bg-destructive/[0.08] text-destructive",
                            )}
                          >
                            {credit ? (
                              <TrendingUp size={18} />
                            ) : (
                              <TrendingDown size={18} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-[0.85rem] font-semibold text-foreground truncate m-0">
                                {tx.name ||
                                  tx.description ||
                                  tx.transaction_type}
                              </p>
                              {tx.status && (
                                <span className={txStatusBadgeClass(tx.status)}>
                                  <span
                                    className={txStatusDotClass(tx.status)}
                                  />
                                  {tx.status}
                                </span>
                              )}
                            </div>
                            <p className="text-[0.72rem] text-muted-foreground mt-0.5 m-0">
                              {tx.date ||
                                new Date(tx.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <p
                            className={cn(
                              "text-[0.9rem] font-bold font-mono shrink-0 m-0",
                              credit ? "text-success" : "text-destructive",
                            )}
                          >
                            {tx.amount}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDEBAR — Quick Send + Weekly Spending, always visible
          alongside the left column regardless of which tab is active
          (matches the sketch; Payzarc Plus banner excluded). */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <Card className="rounded-2xl bg-card border-none shadow-none animate-flow-fade-in">
            <CardContent className="p-6 flex flex-col gap-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold m-0">Quick Send</h2>
                <button
                  className="bg-transparent border-none text-gold font-medium text-[11px] cursor-pointer transition-colors hover:text-gold-dark"
                  onClick={() => switchSection("groups")}
                >
                  See all
                </button>
              </div>

              {favourites.length === 0 ? (
                <p className="text-[0.85rem] text-muted-foreground">
                  No saved recipients yet — add one from Send Money.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-4 gap-3">
                    {favourites.slice(0, 3).map((fav, idx) => {
                      const name =
                        fav.name ||
                        fav.full_name ||
                        fav.phone ||
                        fav.value ||
                        "?";
                      return (
                        <button
                          key={fav.id || idx}
                          type="button"
                          onClick={() => {
                            switchSection("send");
                            handleSelectRecipient(fav);
                          }}
                          className="flex flex-col items-center gap-2 p-2.5 rounded-xl text-center bg-white/[0.02] transition-all duration-200 hover:bg-white/[0.05] hover:-translate-y-0.5"
                        >
                          <div className="w-12 h-12 rounded-full bg-gold/15 text-gold font-bold flex items-center justify-center text-sm ring-2 ring-transparent transition-all duration-200 hover:ring-gold/40">
                            {name.slice(0, 1).toUpperCase()}
                          </div>
                          <span className="text-[11px] text-muted-foreground font-medium truncate w-full">
                            {name.split(" ")[0]}
                          </span>
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => switchSection("send")}
                      className="flex flex-col items-center gap-2 p-2.5 rounded-xl text-center bg-white/[0.02] transition-all duration-200 hover:bg-white/[0.05] hover:-translate-y-0.5"
                    >
                      <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center transition-colors hover:bg-white/[0.07]">
                        <PlusCircle
                          size={18}
                          className="text-muted-foreground"
                        />
                      </div>
                      <span className="text-[11px] text-muted-foreground font-medium truncate w-full">
                        Add
                      </span>
                    </button>
                  </div>

                  {favourites.length > 0 && (
                    <div className="pt-4 border-t border-white/[0.04] flex flex-col gap-1">
                      {favourites.slice(0, 3).map((fav, idx) => {
                        const name =
                          fav.name ||
                          fav.full_name ||
                          fav.phone ||
                          fav.value ||
                          "?";
                        const sub = fav.phone || fav.email || "";
                        return (
                          <button
                            key={fav.id || idx}
                            type="button"
                            onClick={() => {
                              switchSection("send");
                              handleSelectRecipient(fav);
                            }}
                            className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] transition-colors hover:bg-white/[0.05] group"
                          >
                            <div className="w-9 h-9 rounded-full bg-gold/15 text-gold font-bold flex items-center justify-center text-xs shrink-0">
                              {name.slice(0, 1).toUpperCase()}
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate m-0">
                                {name}
                              </p>
                              {sub && (
                                <p className="text-[11px] text-muted-foreground truncate m-0">
                                  {sub}
                                </p>
                              )}
                            </div>
                            <div className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center transition-colors group-hover:bg-gold/10 shrink-0">
                              <Send
                                size={14}
                                className="text-muted-foreground transition-colors group-hover:text-gold"
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Floating market ticker — sits to the right, follows scroll, and
          stops just above the footer instead of covering it. */}
      {activeSection === "dashboard" && tickerMessages.length > 0 && (
        <button
          type="button"
          className="fixed right-8 z-50 max-w-[260px] bg-card border border-[var(--gold-border)] text-gold text-[0.8rem] font-semibold leading-[1.4] text-left px-[1.1rem] py-[0.7rem] rounded-md cursor-pointer transition-[transform,bottom] duration-150 hover:-translate-y-0.5 max-[768px]:right-4 max-[768px]:max-w-[190px] max-[768px]:text-[0.72rem] max-[768px]:px-[0.9rem] max-[768px]:py-[0.6rem]"
          style={{ bottom: tickerBottom }}
          onClick={() => setTickerIndex((i) => i + 1)}
        >
          <span key={tickerIndex} className="block animate-ticker-fade">
            {tickerMessages[tickerIndex % tickerMessages.length]}
          </span>
        </button>
      )}

      {/* Add Money — service picker popup, shown once a valid amount is entered */}
      <Dialog open={showAddMoneyPopup} onOpenChange={setShowAddMoneyPopup}>
        <DialogContent className="w-[min(400px,100%)] max-w-[400px] bg-[var(--card2)] border-white/[0.08] rounded-2xl p-7 flex flex-col gap-4 animate-popup-in shadow-2xl shadow-black/40">
          <DialogTitle className="text-center text-[1.1rem] font-bold text-foreground m-0">
            Add money from
          </DialogTitle>

          <div className="flex gap-2 -mt-[0.6rem]">
            {region.mobileMoney.length > 0 && (
              <button
                type="button"
                className={methodBtnClass(addMoneyCategory === "mobile")}
                onClick={() => setAddMoneyCategory("mobile")}
              >
                Mobile Money
              </button>
            )}
            <button
              type="button"
              className={methodBtnClass(addMoneyCategory === "bank")}
              onClick={() => setAddMoneyCategory("bank")}
            >
              Bank Transfer
            </button>
            <button
              type="button"
              className={methodBtnClass(addMoneyCategory === "card")}
              onClick={() => setAddMoneyCategory("card")}
            >
              Card
            </button>
          </div>

          {addMoneyCategory === "mobile" && (
            <>
              <div className="flex gap-2 -mt-[0.6rem]">
                {region.mobileMoney.map((provider) => (
                  <button
                    key={provider}
                    type="button"
                    className={methodBtnClass(mobileProvider === provider)}
                    onClick={() => setMobileProvider(provider)}
                  >
                    {provider}
                  </button>
                ))}
              </div>
              <Label className={formLabelClass}>{mobileProvider} number</Label>
              <Input
                className={formInputClass}
                placeholder="e.g. 254712345678"
                value={mpesaNumber}
                onChange={(e) => setMpesaNumber(e.target.value)}
              />
            </>
          )}

          {addMoneyCategory === "bank" &&
            (showAddBankForm ? (
              <>
                <Label className={formLabelClass}>Bank</Label>
                <select
                  className={formInputClass}
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
                <Label className={formLabelClass}>Account number</Label>
                <Input
                  className={formInputClass}
                  value={newBank.accountNumber}
                  onChange={(e) =>
                    setNewBank({ ...newBank, accountNumber: e.target.value })
                  }
                />
                <Label className={formLabelClass}>Account name</Label>
                <Input
                  className={formInputClass}
                  value={newBank.accountName}
                  onChange={(e) =>
                    setNewBank({ ...newBank, accountName: e.target.value })
                  }
                />
                <button
                  type="button"
                  className={modalAddLinkClass}
                  onClick={handleAddBank}
                >
                  + Save bank account
                </button>
                {paymentMethods.banks.length > 0 && (
                  <button
                    type="button"
                    className={modalAddLinkClass}
                    onClick={() => setShowAddBankForm(false)}
                  >
                    Use a saved bank instead
                  </button>
                )}
              </>
            ) : (
              <>
                <Label className={formLabelClass}>Bank account</Label>
                <div className="flex flex-wrap gap-2 -mt-[0.6rem]">
                  {paymentMethods.banks.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      className={favouriteChipClass(selectedBankId === b.id)}
                      onClick={() => setSelectedBankId(b.id)}
                    >
                      {b.bankName} •••• {String(b.accountNumber).slice(-4)}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className={modalAddLinkClass}
                  onClick={() => setShowAddBankForm(true)}
                >
                  + Add another bank
                </button>
              </>
            ))}

          {addMoneyCategory === "card" &&
            (showAddCardForm ? (
              <>
                <Label className={formLabelClass}>Cardholder name</Label>
                <Input
                  className={formInputClass}
                  value={newCard.cardholderName}
                  onChange={(e) =>
                    setNewCard({ ...newCard, cardholderName: e.target.value })
                  }
                />
                <Label className={formLabelClass}>Card number</Label>
                <Input
                  className={formInputClass}
                  maxLength={19}
                  placeholder="4111 1111 1111 1111"
                  value={newCard.cardNumber}
                  onChange={(e) =>
                    setNewCard({ ...newCard, cardNumber: e.target.value })
                  }
                />
                <Label className={formLabelClass}>Expiry (MM/YY)</Label>
                <Input
                  className={formInputClass}
                  maxLength={5}
                  placeholder="MM/YY"
                  value={newCard.expiry}
                  onChange={(e) =>
                    setNewCard({ ...newCard, expiry: e.target.value })
                  }
                />
                <button
                  type="button"
                  className={modalAddLinkClass}
                  onClick={handleAddCard}
                >
                  + Save card
                </button>
                {paymentMethods.cards.length > 0 && (
                  <button
                    type="button"
                    className={modalAddLinkClass}
                    onClick={() => setShowAddCardForm(false)}
                  >
                    Use a saved card instead
                  </button>
                )}
              </>
            ) : (
              <>
                <Label className={formLabelClass}>Card</Label>
                <div className="flex flex-wrap gap-2 -mt-[0.6rem]">
                  {paymentMethods.cards.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={favouriteChipClass(selectedCardId === c.id)}
                      onClick={() => setSelectedCardId(c.id)}
                    >
                      {c.brand} •••• {c.last4}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className={modalAddLinkClass}
                  onClick={() => setShowAddCardForm(true)}
                >
                  + Add another card
                </button>
              </>
            ))}

          <Button
            className={primaryBtnClass}
            onClick={() => {
              setShowAddMoneyPopup(false);
              handleAddMoney();
            }}
          >
            Continue
          </Button>
        </DialogContent>
      </Dialog>

      {/* Withdraw — service picker popup, shown once amount + PIN are entered */}
      <Dialog open={showWithdrawPopup} onOpenChange={setShowWithdrawPopup}>
        <DialogContent className="w-[min(400px,100%)] max-w-[400px] bg-[var(--card2)] border-white/[0.08] rounded-2xl p-7 flex flex-col gap-4 animate-popup-in shadow-2xl shadow-black/40">
          <DialogTitle className="text-center text-[1.1rem] font-bold text-foreground m-0">
            Withdraw via
          </DialogTitle>
          <div className="flex gap-2 -mt-[0.6rem]">
            {(region.mobileMoney.length > 0
              ? ["mpesa", "agent"]
              : ["agent"]
            ).map((dest) => (
              <button
                key={dest}
                type="button"
                className={methodBtnClass(withdrawDestination === dest)}
                onClick={() => setWithdrawDestination(dest)}
              >
                {dest === "mpesa" ? "Mpesa" : "Agent"}
              </button>
            ))}
          </div>

          <Label className={formLabelClass}>
            {withdrawDestination === "mpesa" ? "Mpesa number" : "Agent number"}
          </Label>
          <Input
            className={formInputClass}
            placeholder={
              withdrawDestination === "mpesa"
                ? "e.g. 254712345678"
                : "e.g. AG-10293"
            }
            value={withdrawDestination === "mpesa" ? mpesaNumber : agentNumber}
            onChange={(e) =>
              withdrawDestination === "mpesa"
                ? setMpesaNumber(e.target.value)
                : setAgentNumber(e.target.value)
            }
          />

          <Button
            className={primaryBtnClass}
            onClick={() => {
              setShowWithdrawPopup(false);
              handleWithdraw();
            }}
          >
            Continue
          </Button>
        </DialogContent>
      </Dialog>

      {/* Send Money — step-by-step "money in transit" visual, shown while
          the transfer is in flight after confirming. Non-dismissible (no
          close button, no click-outside/Escape) — same as the original
          custom overlay, which had no close handler either. */}
      {sendProgressStep > 0 && (
        <Dialog open onOpenChange={() => {}}>
          <DialogContent
            className="w-[min(400px,100%)] max-w-[400px] bg-[var(--card2)] border-white/[0.08] rounded-2xl p-7 flex flex-col gap-4 animate-popup-in shadow-2xl shadow-black/40 [&>button:last-child]:hidden"
            onEscapeKeyDown={(e) => e.preventDefault()}
            onPointerDownOutside={(e) => e.preventDefault()}
          >
            <DialogTitle className="text-center text-[1.1rem] font-bold text-foreground m-0">
              Sending money…
            </DialogTitle>

            <div className="flex flex-col py-2 px-1">
              {SEND_STEPS.map((step, idx) => {
                const stepNum = idx + 1;
                const isLast = idx === SEND_STEPS.length - 1;
                const isPast = sendProgressStep > stepNum;
                const isCurrent = sendProgressStep === stepNum;
                const reached = sendProgressStep >= stepNum;
                const StepIcon = isPast ? Check : step.icon;
                return (
                  <div key={step.label} className="flex gap-3.5">
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div
                        className={cn(
                          "w-[34px] h-[34px] rounded-full bg-white/[0.03] border border-white/[0.06] text-[var(--muted)] flex items-center justify-center flex-shrink-0 transition-all duration-300",
                          reached &&
                            "bg-gold border-gold text-black shadow-[0_4px_14px_rgba(236,201,75,0.35)]",
                          isCurrent && !isLast && "animate-progress-pulse",
                        )}
                      >
                        <StepIcon
                          size={15}
                          className={
                            isCurrent && step.spin ? "animate-spin" : undefined
                          }
                        />
                      </div>
                      {!isLast && (
                        <div
                          className={cn(
                            "w-0.5 flex-1 min-h-[26px] bg-white/[0.08] my-[3px] transition-colors duration-[400ms]",
                            sendProgressStep > stepNum && "bg-gold",
                          )}
                        />
                      )}
                    </div>
                    <div className="pb-5 pt-1">
                      <span
                        className={cn(
                          "text-[0.9rem] font-bold text-foreground transition-colors duration-300",
                          !reached && "text-[var(--muted)]",
                        )}
                      >
                        {step.label}
                      </span>
                      <p className="mt-0.5 text-[0.78rem] text-[var(--muted)]">
                        {step.sub}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-center text-[var(--muted)] text-[0.85rem] mt-1 pt-3 border-t border-dashed border-white/[0.08]">
              {displayCurrency}
              {sendAmount} to{" "}
              {selectedRecipient?.display_name ||
                selectedRecipient?.name ||
                recipientSearchTerm}
            </p>
          </DialogContent>
        </Dialog>
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
    </>
  );
}

export default Home;
