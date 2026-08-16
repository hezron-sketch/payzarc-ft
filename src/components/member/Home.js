import axios from "axios";
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
  ChevronLeft,
  X,
} from "lucide-react";
import axiosInstance, { transactionsApi, contactsApi } from "../../utility/axiosInstance";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

// ponytail: flat 1.5% with a $1 minimum — placeholder pricing shared by
// single Send and Send to Many until a real fees/pricing API replaces it.
const calcTransferFee = (amount) =>
  amount > 0 ? Math.max(1, amount * 0.015) : 0;

// Left-to-right order the action buttons appear in (Add Money, Withdraw,
// Send, Groups) — used to pick which side a flow panel slides in from.
const SECTION_ORDER = { "add-money": 0, withdraw: 1, send: 2, groups: 3 };

// The four balance-card action buttons — one config-driven list instead of
// four near-identical JSX blocks. Send/Withdraw render as gold pill buttons
// inside the balance card itself (the two most common wallet actions);
// Add Money/Groups render as a pill row just below it. Same underlying
// switchSection/activeSection wiring either way — only where each button is
// drawn changed.
const ACTION_TILES = [
  { key: "add-money", label: "Add Money", icon: PlusCircle },
  { key: "withdraw", label: "Withdraw", icon: ArrowDownCircle },
  { key: "send", label: "Send", icon: Send },
  { key: "groups", label: "Groups", icon: UsersRound },
];
const BALANCE_CARD_ACTIONS = ["send", "withdraw"].map((key) =>
  ACTION_TILES.find((t) => t.key === key),
);
const ICON_ROW_ACTIONS = ACTION_TILES.filter(
  (t) => t.key === "add-money" || t.key === "groups",
);

// Send to Many is capped for free-tier accounts; Payzarc Pro (see the
// Membership section on the Account page) removes the cap by flipping
// `user.plan`.
const FREE_SEND_MANY_LIMIT = 5;

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
// Modal "phone screen" 3D look — same recipe as balanceCardClass (gradient
// surface, gold border, deep shadow + inset highlight) plus a
// perspective/rotateX pop-in (animate-modal-3d-in, defined in
// tailwind.config.js) instead of the flat popup-in slide, so opening a modal
// reads as the card tipping up into place rather than just fading/sliding.
const modal3dClass =
  "bg-[radial-gradient(circle_at_30%_0%,var(--card),var(--card2)_65%)] shadow-[0_35px_80px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.04)_inset] animate-modal-3d-in";
// The balance card's "phone modal" 3D look — same recipe App.js's
// PhoneMockup/PhoneAuthStage use for their raised panel: a radial gradient
// surface (--card -> --card2), translucent gold border, and a deep drop
// shadow plus a 1px inset highlight so it reads as an embossed screen
// instead of a flat bg-card block.
const balanceCardClass =
  "relative bg-[radial-gradient(circle_at_30%_0%,var(--card),var(--card2)_65%)] rounded-[22px] overflow-hidden";
// Phone bezel wrapping the real balance card above — same dark-trim/notch
// recipe as components/PhoneMockup's PhoneFrame, just sized for the actual
// dashboard content instead of a small preview. This is what makes the
// dashboard's main balance section read as an actual phone rather than a
// plain rounded card; balanceCardClass above is now just its "screen".
const phoneBezelClass =
  "relative bg-[#1c2333] rounded-[34px] border-[1.5px] border-[rgba(var(--gold-rgb),0.18)] p-[10px] shadow-[0_45px_90px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.04)_inset]";
const phoneNotchClass =
  "w-[56px] h-[7px] bg-[#0d1117] rounded-full mx-auto mb-[10px]";
// Embossed gold pill — a top inner highlight + bottom inner shadow (the
// bevel) under a neutral drop shadow (not a colored gold glow) that lifts
// on hover and flattens on press, so the button reads as floating above the
// card rather than glowing against it.
const goldPillBtnClass =
  "flex-1 flex items-center justify-center gap-2 rounded-full py-3 px-4 text-[0.85rem] font-semibold cursor-pointer text-black bg-gradient-to-b from-gold to-gold-dark transition-all duration-200 shadow-[0_8px_18px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.5)_inset,0_-2px_3px_rgba(0,0,0,0.15)_inset] hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(0,0,0,0.35),0_1px_0_rgba(255,255,255,0.5)_inset,0_-2px_3px_rgba(0,0,0,0.15)_inset] active:translate-y-0 active:shadow-[0_2px_6px_rgba(0,0,0,0.2),0_-1px_2px_rgba(0,0,0,0.2)_inset]";
// Same bevel treatment for the inactive/flat pill state (Add Money/Groups
// row below the balance card) so both rows share one raised-button language.
const flatPillBtnClass =
  "flex-1 flex items-center justify-center gap-2 rounded-full py-3 px-4 text-[0.85rem] font-semibold cursor-pointer text-foreground bg-white/[0.06] border border-white/[0.1] transition-all duration-200 shadow-[0_4px_10px_rgba(0,0,0,0.25),0_1px_0_rgba(255,255,255,0.06)_inset] hover:-translate-y-0.5 hover:bg-white/[0.1] active:translate-y-0";
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
// Withdrawal receipt dialog's rows — same label/value layout TransactionDetails.js
// uses for its details rows.
const receiptRowClass =
  "flex justify-between items-center gap-3 py-2.5 border-b border-white/[0.06] last:border-b-0";
const receiptLabelClass =
  "text-[11px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0";
const receiptValueClass =
  "text-sm font-medium text-foreground text-right break-words min-w-0";
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

function Home({ onPageChange, user, navigateRequest, balanceCardRef }) {
  const [activeSection, setActiveSection] = useState("dashboard");
  // Which way the incoming flow panel slides in from, based on the action
  // buttons' left-to-right order (Add Money, Withdraw, Send, Groups).
  const [sectionDirection, setSectionDirection] = useState("right");
  const [showBalance, setShowBalance] = useState(false);
  const [balanceData, setBalanceData] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [balanceError, setBalanceError] = useState(null);
  // Group funds are their own pool, separate from the wallet balance above
  // — summed here just to show a distinguishing total on the balance card;
  // the Groups tab (onPageChange("groups")) is the source of truth.
  const [groupFundsTotal, setGroupFundsTotal] = useState(0);

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
  // Populated from the withdrawal endpoint's response on success; drives the
  // receipt dialog below (mirrors TransactionDetails.js's row layout).
  const [withdrawalReceipt, setWithdrawalReceipt] = useState(null);

  const [recipientSearchTerm, setRecipientSearchTerm] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [favourites, setFavourites] = useState([]);
  // Own phone number, used to block adding yourself as a favourite.
  const [myPhone, setMyPhone] = useState("");

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

  // "Send to Many" — a second flow layered under the Send panel: step
  // "pick" (multi-select up to 5 recipients) then "amount" (one shared
  // amount, or per-recipient overrides). Recipients reuse the favourite
  // object shape Send already uses; numbers typed in get wrapped the same
  // way an ad-hoc Send recipient is.
  const [sendManyStep, setSendManyStep] = useState("pick"); // "pick" | "amount"
  const [sendManyPhoneInput, setSendManyPhoneInput] = useState("");
  const [sendManyRecipients, setSendManyRecipients] = useState([]);
  const [sendManySameAmount, setSendManySameAmount] = useState("");
  const [sendManyAmounts, setSendManyAmounts] = useState({}); // key -> amount string
  const [sendManySending, setSendManySending] = useState(false);

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
    axiosInstance
      .get("/api/groups")
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setGroupFundsTotal(list.reduce((sum, g) => sum + g.balance, 0));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    contactsApi
      .get("/api/my-contact/")
      .then((res) => {
        if (res.data.success) setMyPhone(res.data.phone);
      })
      .catch(() => {});
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

  // const fetchBalance = async () => {
  //   setLoadingBalance(true);
  //   try {
  //     const token = localStorage.getItem("accessToken");
  //     const res = await transactionsApi.get("/api/balance/", {
  //       headers: { Authorization: `Bearer ${token}` },
  //     });
  //     setBalanceData(res.data);
  //   } catch (err) {
  //     setBalanceError("Failed to load balance");
  //   } finally {
  //     setLoadingBalance(false);
  //   }
  // };

  // Old fetchBalance
  const fetchBalance = async () => {
    if (!user?.email) {
      setLoadingBalance(false);
      return;
    }
    try {
      console.log("Sending request to /api/balance/");
      console.log(
        "Token from localStorage:",
        localStorage.getItem("accessToken"),
      );
      console.log("Full headers:", transactionsApi.defaults.headers);
      const response = await transactionsApi.get("/api/balance/");
      const data = response.data;
      if (data.success !== undefined) {
        setBalanceData(data);
      } else {
        setBalanceError(data.error || "Failed to load balance");
      }
    } catch (err) {
      console.error("Balance fetch failed:", err);
      if (err.response?.status === 404) {
        setBalanceError("No wallet found for this account.");
      } else {
        setBalanceError("Could not load wallet balance");
      }
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
    setSendManyStep("pick");
    setSendManyPhoneInput("");
    setSendManyRecipients([]);
    setSendManySameAmount("");
    setSendManyAmounts({});
    const nextSection = activeSection === section ? "dashboard" : section;
    const fromOrder = SECTION_ORDER[activeSection];
    const toOrder = SECTION_ORDER[nextSection];
    if (fromOrder !== undefined && toOrder !== undefined) {
      setSectionDirection(toOrder > fromOrder ? "right" : "left");
    }
    setActiveSection(nextSection);
  };

  // Jumps from the single-recipient Send panel into "Send to Many" without
  // going through switchSection's same-section toggle (this isn't a nav
  // button click, and Send's own in-progress input isn't relevant here).
  const goToSendMany = () => {
    setSendManyStep("pick");
    setSendManyPhoneInput("");
    setSendManyRecipients([]);
    setSendManySameAmount("");
    setSendManyAmounts({});
    setInputPin("");
    setSectionDirection("right");
    setActiveSection("send-many");
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

  // Country from a phone number's dial code alone (longest/most specific
  // code wins, e.g. +1 US vs +1 area-coded territories).
  const detectCountryFromPhone = (value) => {
    const digits = (value || "").replace(/[^\d+]/g, "");
    if (!digits) return null;
    const matches = countries
      .filter((c) => digits.startsWith(c.code))
      .sort((a, b) => b.code.length - a.code.length);
    return matches[0] || null;
  };

  // Same detection Send to Many uses per-recipient: a stored country name
  // wins if present (favourites), otherwise fall back to their phone's dial
  // code.
  const detectRecipientCountry = (r) =>
    findCountryByName(r?.country || r?.country_name) ||
    detectCountryFromPhone(r?.phone || r?.value || r?.phone_number);

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

    return detectCountryFromPhone(term);
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

  const sendAmountNum = parseFloat(sendAmount || 0);
  const sendFee = calcTransferFee(sendAmountNum);
  const sendTotal = sendAmountNum + sendFee;
  const availableBalance = Number(balanceData?.balance) || 0;
  const insufficientBalance = sendAmountNum > 0 && sendTotal > availableBalance;

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
    const favouriteType = value.includes("@") ? "email" : "phone";
    if (favouriteType === "phone" && myPhone && value === myPhone) {
      showNotification(
        "error",
        "You cannot add your own phone number as a favorite.",
      );
      return;
    }
    try {
      // Step 1: Check — server-side validation the original flow ran before
      // ever saving a favourite (blocks e.g. numbers that don't resolve to
      // a real account).
      await contactsApi.post("/api/check/", {
        type: favouriteType,
        value,
      });

      // Step 2: Save
      await contactsApi.post("/api/favorite/add/", {
        favourite_type: favouriteType,
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

  // Stable identity for a Send-to-Many recipient — favourites have an id,
  // ad-hoc typed numbers don't, so fall back to whatever value identifies
  // them (same fallback chain used to display their name/number elsewhere).
  const sendManyKey = (r) => r.id ?? r.phone ?? r.value ?? r.name;

  const isProUser = user?.plan === "pro";
  const sendManyLimit = isProUser ? Infinity : FREE_SEND_MANY_LIMIT;
  const sendManyLimitMsg = `Free plan is limited to ${FREE_SEND_MANY_LIMIT} recipients per send. Upgrade to Payzarc Pro to send to more friends at once.`;

  const toggleSendManyRecipient = (fav) => {
    const key = sendManyKey(fav);
    setSendManyRecipients((prev) => {
      if (prev.some((r) => sendManyKey(r) === key)) {
        return prev.filter((r) => sendManyKey(r) !== key);
      }
      if (prev.length >= sendManyLimit) {
        showNotification("error", sendManyLimitMsg);
        return prev;
      }
      return [...prev, fav];
    });
  };

  const addSendManyPhone = () => {
    const value = sendManyPhoneInput.trim();
    if (!value) return;
    if (sendManyRecipients.length >= sendManyLimit) {
      showNotification("error", sendManyLimitMsg);
      return;
    }
    toggleSendManyRecipient({ name: value, phone: value, value });
    setSendManyPhoneInput("");
  };

  // Same amount fills every recipient's field, but only overwrites entries
  // that still match the previous same-amount value — anyone the sender has
  // since edited by hand keeps their custom amount.
  const applySendManySameAmount = (value) => {
    setSendManyAmounts((prev) => {
      const next = { ...prev };
      sendManyRecipients.forEach((r) => {
        const key = sendManyKey(r);
        if (next[key] === undefined || next[key] === sendManySameAmount) {
          next[key] = value;
        }
      });
      return next;
    });
    setSendManySameAmount(value);
  };

  // Per-recipient conversion, shown next to their amount field — same
  // currency-detection + live/mocked-rate fallback chain the single Send
  // screen uses, applied per row instead of once.
  const getSendManyConversion = (r) => {
    const amt = parseFloat(sendManyAmounts[sendManyKey(r)]) || 0;
    const currency = detectRecipientCountry(r)?.currency;
    if (!currency || amt <= 0) return null;
    const rate =
      currency === senderCurrency
        ? 1
        : (liveRates?.[currency] ??
          EXCHANGE_RATES[senderCurrency]?.[currency] ??
          null);
    if (!rate) return null;
    return { currency, amount: (amt * rate).toFixed(2) };
  };

  const sendManyAmountTotal = sendManyRecipients.reduce(
    (sum, r) => sum + (parseFloat(sendManyAmounts[sendManyKey(r)]) || 0),
    0,
  );
  const sendManyFeeTotal = sendManyRecipients.reduce(
    (sum, r) =>
      sum + calcTransferFee(parseFloat(sendManyAmounts[sendManyKey(r)]) || 0),
    0,
  );
  const sendManyTotal = sendManyAmountTotal + sendManyFeeTotal;
  const insufficientSendManyBalance =
    sendManyAmountTotal > 0 && sendManyTotal > availableBalance;

  const handleSendToMany = async () => {
    const amounts = sendManyRecipients.map((r) =>
      parseFloat(sendManyAmounts[sendManyKey(r)]),
    );
    if (
      sendManyRecipients.length === 0 ||
      amounts.some((a) => !a || a <= 0) ||
      inputPin.length !== 4 ||
      insufficientSendManyBalance
    ) {
      showNotification(
        "error",
        "Enter an amount for every recipient and your 4-digit PIN",
      );
      return;
    }

    openConfirmationDialog(
      "Confirm Send to Many",
      `Send ${senderCurrency} ${sendManyAmountTotal.toFixed(2)} to ${sendManyRecipients.length} people?\nFee: ${senderCurrency} ${sendManyFeeTotal.toFixed(2)} · Total: ${senderCurrency} ${sendManyTotal.toFixed(2)}\n\nType 1 and click Yes to confirm.`,
      async (typedValue, buttonChoice) => {
        if (typedValue !== "1" || buttonChoice !== "yes") {
          showNotification("error", "Transaction cancelled");
          return;
        }
        setSendManySending(true);
        try {
          const token = localStorage.getItem("accessToken");
          // No batch endpoint exists yet — loop the same single-transfer
          // endpoint Send uses. ponytail: sequential, not Promise.all, so a
          // failure partway through stops cleanly instead of firing every
          // remaining transfer at once; swap for a real batch endpoint if
          // this list ever needs to be large or atomic.
          for (const r of sendManyRecipients) {
            const recipientValue = r.value || r.phone || r.phone_number;
            const amount = parseFloat(sendManyAmounts[sendManyKey(r)]);
            await transactionsApi.post(
              "/api/send-money/",
              {
                recipient_number: recipientValue,
                amount,
                fee: calcTransferFee(amount),
                transaction_pin: inputPin,
              },
              { headers: { Authorization: `Bearer ${token}` } },
            );
          }
          showNotification(
            "success",
            `Sent to ${sendManyRecipients.length} people successfully!`,
          );
          fetchBalance();
          fetchRecentTransactions();
          goToDashboard();
        } catch (error) {
          const errorMsg =
            error.response?.data?.message ||
            error.response?.data?.error ||
            "Some transfers failed";
          showNotification("error", errorMsg);
        } finally {
          setSendManySending(false);
        }
      },
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
          // Agent path confirmed against MerchantWithdrawalService: it reads
          // `merchant_code`, not `agent_number`. Mpesa path is still
          // unconfirmed — ponytail: guessed field name, fix if the backend
          // uses something else once that rail is implemented.
          const { data } = await transactionsApi.post(
            "/api/withdraw/",
            {
              destination: withdrawDestination,
              ...(withdrawDestination === "mpesa"
                ? { mpesa_number: withdrawDestinationValue }
                : { merchant_code: withdrawDestinationValue }),
              amount: parseFloat(withdrawAmount),
              transaction_pin: inputPin,
            },
            { headers: { Authorization: `Bearer ${token}` } },
          );
          showNotification("success", "Withdrawal successful!");
          setWithdrawalReceipt(data);
          fetchBalance();
          fetchRecentTransactions();
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
      <section className="w-full max-w-[1320px] mx-auto flex flex-col items-start gap-3 pb-8">
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

      {/* Used to be a two-column grid (balance card + a right sidebar
        holding Quick Send). Quick Send now lives inside the phone mockup's
        own screen alongside the balance, so there's no sidebar content left
        — single centered column instead of a grid with an empty column. */}
      <div className="w-full max-w-[900px] mx-auto flex flex-col gap-8">
        <div className="flex flex-col gap-6">
            {/* Balance section, phone-bezeled — the dashboard's main
            component. Same real content as before (live balance, group
            funds, Send/Withdraw), just wrapped in an actual phone frame
            (phoneBezelClass/phoneNotchClass, matching components/
            PhoneMockup's PhoneFrame recipe) instead of a plain card, with
            Send/Withdraw promoted to floating buttons flanking it — the
            same "floating card either side of the phone" composition as
            the landing hero's FloatCards, but wired to the real flows
            instead of showing demo numbers. */}
            <div className="relative">
              {/* Same FloatCard shape/positioning as the landing hero's
              floating "You send"/"They receive" cards in App.js (icon
              square + a small text stack, absolute + staggered top offset
              either side of the phone) — real and clickable here instead
              of the hero's static demo numbers. */}
              {BALANCE_CARD_ACTIONS.map(({ key, label, icon: Icon }) => {
                const active = activeSection === key;
                const isSend = key === "send";
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => switchSection(key)}
                    aria-label={label}
                    className={cn(
                      "absolute z-10 flex items-center gap-2.5 rounded-2xl py-[10px] px-[14px] whitespace-nowrap cursor-pointer transition-all duration-200 hover:-translate-y-0.5 max-[768px]:px-[10px] max-[768px]:py-2",
                      isSend
                        ? "right-0 top-[95px] max-[768px]:-right-[10px] max-[768px]:top-20"
                        : "left-0 top-[55px] max-[768px]:-left-[10px] max-[768px]:top-10",
                      active
                        ? "bg-gradient-to-b from-gold to-gold-dark border-[0.5px] border-transparent"
                        : "bg-secondary border-[0.5px] border-input hover:border-gold/30",
                    )}
                  >
                    <div
                      className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center flex-shrink-0"
                      style={{
                        background: active
                          ? "rgba(0,0,0,0.12)"
                          : isSend
                            ? "rgba(var(--gold-rgb),0.15)"
                            : "rgba(96,165,250,0.15)",
                      }}
                    >
                      <Icon
                        size={18}
                        className={cn(
                          active
                            ? "text-black"
                            : isSend
                              ? "text-gold"
                              : "text-[#60a5fa]",
                        )}
                      />
                    </div>
                    <div>
                      <div
                        className={cn(
                          "text-[10px]",
                          active ? "text-black/70" : "text-[var(--muted)]",
                        )}
                      >
                        Wallet action
                      </div>
                      <div
                        className={cn(
                          "text-[15px] font-bold max-[768px]:text-[13px]",
                          active ? "text-black" : "text-foreground",
                        )}
                      >
                        {label}
                      </div>
                    </div>
                  </button>
                );
              })}

              <div ref={balanceCardRef} className={phoneBezelClass}>
                <div className={phoneNotchClass} />
                <div className={balanceCardClass}>
                  <div className="w-full flex flex-col items-center px-8 pt-9 pb-8 max-[640px]:px-6">
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
                            {showBalance ? (
                              <EyeOff size={16} />
                            ) : (
                              <Eye size={16} />
                            )}
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
                        {groupFundsTotal > 0 && (
                          <button
                            type="button"
                            onClick={() => onPageChange("groups")}
                            className="mt-2 inline-flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.08] rounded-full px-3 py-1 text-[0.75rem] font-semibold text-muted-foreground cursor-pointer transition-colors hover:bg-white/[0.07] hover:border-gold/20 hover:text-foreground"
                          >
                            <UsersRound size={12} className="text-gold" />
                            <span
                              className={cn(
                                "relative overflow-hidden rounded-md before:content-[''] before:absolute before:inset-0 before:[backdrop-filter:blur(0.6rem)] before:rounded-[inherit] before:pointer-events-none before:opacity-0 before:transition-opacity before:duration-[250ms]",
                                !showBalance && "select-none before:opacity-100",
                              )}
                            >
                              {displayCurrency}{" "}
                              {groupFundsTotal.toLocaleString()}
                            </span>{" "}
                            in Group Funds
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Quick Send — moved into the phone's own screen
                    (used to be its own card in the right sidebar) so the
                    phone mockup carries this dashboard component the same
                    way it does the balance above. Content/logic untouched,
                    just re-homed with a divider instead of its own Card
                    chrome since it's already inside the screen's padding. */}
                    <div className="w-full mt-8 pt-6 border-t border-white/[0.06] flex flex-col gap-5">
                      <div className="flex items-center justify-between">
                        <h2 className="text-base font-bold m-0">
                          Quick Send
                        </h2>
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
                          <div className="grid grid-cols-4 gap-3 max-[480px]:grid-cols-3">
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
                                  className="flex flex-col items-center gap-2 p-2.5 rounded-xl text-center bg-white/[0.03] border border-white/[0.06] shadow-[0_4px_10px_rgba(0,0,0,0.25),0_1px_0_rgba(255,255,255,0.05)_inset] transition-all duration-200 hover:-translate-y-0.5 hover:border-gold/30 hover:shadow-[0_8px_18px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.05)_inset] active:translate-y-0 active:shadow-[0_2px_6px_rgba(0,0,0,0.2)_inset]"
                                >
                                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gold/35 to-gold/15 text-gold font-bold flex items-center justify-center border border-[rgba(var(--gold-rgb),0.3)] text-sm shadow-[0_1px_0_rgba(255,255,255,0.15)_inset]">
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
                              className="flex flex-col items-center gap-2 p-2.5 rounded-xl text-center bg-white/[0.03] border border-white/[0.06] shadow-[0_4px_10px_rgba(0,0,0,0.25),0_1px_0_rgba(255,255,255,0.05)_inset] transition-all duration-200 hover:-translate-y-0.5 hover:border-gold/30 hover:shadow-[0_8px_18px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.05)_inset] active:translate-y-0 active:shadow-[0_2px_6px_rgba(0,0,0,0.2)_inset]"
                            >
                              <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shadow-[0_1px_0_rgba(255,255,255,0.1)_inset] transition-colors hover:bg-white/[0.07]">
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
                                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] shadow-[0_4px_10px_rgba(0,0,0,0.25),0_1px_0_rgba(255,255,255,0.05)_inset] transition-all duration-200 hover:-translate-y-0.5 hover:border-gold/30 hover:shadow-[0_8px_18px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.05)_inset] active:translate-y-0 active:shadow-[0_2px_6px_rgba(0,0,0,0.2)_inset] group"
                                  >
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gold/35 to-gold/15 text-gold font-bold flex items-center justify-center border border-[rgba(var(--gold-rgb),0.3)] text-xs shrink-0 shadow-[0_1px_0_rgba(255,255,255,0.15)_inset]">
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
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Add Money / Groups — secondary actions, as pill buttons below
            the balance card. Same switchSection wiring as the balance-card
            pills above. */}
            <div className="flex items-center gap-3">
              {ICON_ROW_ACTIONS.map(({ key, label, icon: Icon }) => {
                const active = activeSection === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => switchSection(key)}
                    className={active ? goldPillBtnClass : flatPillBtnClass}
                  >
                    <Icon size={16} className="shrink-0" />
                    <span className="truncate">{label}</span>
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
                    Add {displayCurrency} {addAmount || "0.00"}
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
                  <div className="flex items-center justify-between">
                    {myCountry && (
                      <span className="flex items-center gap-1.5 text-[0.85rem] font-semibold text-[var(--muted)]">
                        Sending From {isoToFlagEmoji(myCountry.flag)}
                      </span>
                    )}
                    <button
                      type="button"
                      className="ml-auto text-gold text-[0.8rem] font-semibold hover:opacity-75 transition-opacity"
                      onClick={goToSendMany}
                    >
                      Send to many →
                    </button>
                  </div>
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

                  {insufficientBalance ? (
                    <div className="flex flex-col gap-2 bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3.5">
                      <span className="text-sm font-semibold text-destructive">
                        Insufficient balance for this transfer.
                      </span>
                      <span className="text-xs text-muted-foreground">
                        You need {senderCurrency} {sendTotal.toFixed(2)} but
                        your balance is {senderCurrency} {formattedBalance}.
                      </span>
                      <Button
                        type="button"
                        className={primaryBtnClass}
                        onClick={() => switchSection("add-money")}
                      >
                        Add Money
                      </Button>
                    </div>
                  ) : (
                    <Button
                      className={primaryBtnClass}
                      onClick={handleSendMoney}
                    >
                      Send
                    </Button>
                  )}
                </div>
              </section>
            )}

            {activeSection === "send-many" && (
              <section ref={flowSectionRef} className={flowSectionClass}>
                <div className="flex flex-col gap-[1.1rem] w-full max-w-[420px] mx-auto max-[640px]:max-w-full">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => switchSection("send")}
                      className="w-9 h-9 shrink-0 rounded-full bg-white/[0.06] flex items-center justify-center text-foreground hover:bg-white/[0.1] transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="flex-1 text-center text-base font-bold pr-9">
                      Send to Many
                    </span>
                  </div>

                  {sendManyStep === "pick" && (
                    <>
                      <Label className={formLabelClass}>Recipient</Label>
                      <Input
                        className={formInputClass}
                        placeholder="Enter phone number"
                        value={sendManyPhoneInput}
                        onChange={(e) => setSendManyPhoneInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addSendManyPhone();
                          }
                        }}
                      />
                      {sendManyPhoneInput.trim() && (
                        <button
                          type="button"
                          className={addFavouriteBtnClass}
                          onClick={addSendManyPhone}
                        >
                          + Add {sendManyPhoneInput.trim()}
                        </button>
                      )}

                      <Label className={formLabelClass}>
                        Send to {sendManyRecipients.length}
                        {isProUser ? "" : `/${FREE_SEND_MANY_LIMIT}`}
                      </Label>
                      {!isProUser &&
                        sendManyRecipients.length >= FREE_SEND_MANY_LIMIT && (
                          <button
                            type="button"
                            onClick={() => onPageChange("account")}
                            className="text-xs text-gold -mt-[0.6rem] text-left bg-transparent border-none p-0 cursor-pointer hover:opacity-75 transition-opacity"
                          >
                            Free plan limit reached — upgrade to Payzarc Pro
                            to send to more friends at once.
                          </button>
                        )}
                      {sendManyRecipients.length > 0 && (
                        <div className="flex flex-wrap gap-3 -mt-[0.4rem]">
                          {sendManyRecipients.map((r) => (
                            <div
                              key={sendManyKey(r)}
                              className="relative flex flex-col items-center gap-1 w-16"
                            >
                              <button
                                type="button"
                                onClick={() => toggleSendManyRecipient(r)}
                                className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white/80 text-black flex items-center justify-center z-10"
                              >
                                <X className="w-3 h-3" />
                              </button>
                              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gold/35 to-gold/15 text-gold font-bold flex items-center justify-center border border-[rgba(var(--gold-rgb),0.3)] text-sm shadow-[0_1px_0_rgba(255,255,255,0.15)_inset]">
                                {(
                                  r.name ||
                                  r.full_name ||
                                  r.phone ||
                                  r.value ||
                                  "?"
                                )
                                  .slice(0, 1)
                                  .toUpperCase()}
                              </div>
                              <span className="text-[0.7rem] text-center text-muted-foreground truncate w-full">
                                {r.name || r.full_name || r.phone || r.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      <Label className={formLabelClass}>Favourites</Label>
                      <div className="flex flex-wrap gap-2 -mt-[0.6rem]">
                        {(Array.isArray(favourites) ? favourites : []).map(
                          (fav, idx) => {
                            const active = sendManyRecipients.some(
                              (r) => sendManyKey(r) === sendManyKey(fav),
                            );
                            return (
                              <button
                                key={fav.id || idx}
                                type="button"
                                className={favouriteChipClass(active)}
                                onClick={() => toggleSendManyRecipient(fav)}
                              >
                                {fav.name ||
                                  fav.full_name ||
                                  fav.phone ||
                                  fav.value}
                              </button>
                            );
                          },
                        )}
                      </div>

                      <Button
                        className={primaryBtnClass}
                        disabled={sendManyRecipients.length === 0}
                        onClick={() => setSendManyStep("amount")}
                      >
                        Continue
                      </Button>
                    </>
                  )}

                  {sendManyStep === "amount" && (
                    <>
                      <div className="flex items-center gap-3 bg-[var(--gold-pale)] border border-dashed border-[var(--gold-border)] rounded-xl px-4 py-4">
                        <UsersRound className="w-8 h-8 text-gold shrink-0" />
                        <div>
                          <div className="text-lg font-bold text-gold">
                            {senderCurrency} {sendManyAmountTotal.toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Total amount to be sent
                          </div>
                        </div>
                      </div>

                      <Label className={formLabelClass}>Same amount</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className={formInputClass}
                        placeholder="0.00"
                        value={sendManySameAmount}
                        onChange={(e) =>
                          applySendManySameAmount(e.target.value)
                        }
                      />
                      <span className="text-xs text-muted-foreground -mt-[0.6rem]">
                        Balance: {senderCurrency} {formattedBalance}
                      </span>

                      <div className="flex flex-col gap-3">
                        {sendManyRecipients.map((r) => {
                          const conversion = getSendManyConversion(r);
                          const country = detectRecipientCountry(r);
                          return (
                            <div
                              key={sendManyKey(r)}
                              className="flex items-center gap-3"
                            >
                              <div className="w-11 h-11 shrink-0 rounded-full bg-gradient-to-br from-gold/35 to-gold/15 text-gold font-bold flex items-center justify-center border border-[rgba(var(--gold-rgb),0.3)] text-sm shadow-[0_1px_0_rgba(255,255,255,0.15)_inset]">
                                {(
                                  r.name ||
                                  r.full_name ||
                                  r.phone ||
                                  r.value ||
                                  "?"
                                )
                                  .slice(0, 1)
                                  .toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold truncate">
                                  {r.name || r.full_name || r.value}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                  {country ? isoToFlagEmoji(country.flag) : ""}{" "}
                                  {r.phone || r.value}
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  className={cn(
                                    formInputClass,
                                    "w-24 px-3 py-2 text-right",
                                  )}
                                  value={sendManyAmounts[sendManyKey(r)] ?? ""}
                                  onChange={(e) =>
                                    setSendManyAmounts((prev) => ({
                                      ...prev,
                                      [sendManyKey(r)]: e.target.value,
                                    }))
                                  }
                                />
                                {conversion && (
                                  <span className="text-[0.7rem] text-gold/80 whitespace-nowrap">
                                    ≈{" "}
                                    {Number(
                                      conversion.amount,
                                    ).toLocaleString()}{" "}
                                    {conversion.currency}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {sendManyAmountTotal > 0 && (
                        <div className="flex flex-col gap-1.5 bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-[0.85rem]">
                          <div className="flex items-center justify-between text-[0.85rem] text-muted-foreground">
                            <span>Transaction Fee</span>
                            <span>
                              {senderCurrency} {sendManyFeeTotal.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[0.85rem] text-muted-foreground">
                            <span>Total to pay</span>
                            <span className="text-gold font-bold">
                              {senderCurrency} {sendManyTotal.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}

                      <Label className={formLabelClass}>
                        Transaction PIN
                      </Label>
                      <Input
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        className={formInputClass}
                        placeholder="****"
                        value={inputPin}
                        onChange={(e) =>
                          setInputPin(
                            e.target.value.replace(/\D/g, "").slice(0, 4),
                          )
                        }
                      />

                      {insufficientSendManyBalance ? (
                        <div className="flex flex-col gap-2 bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3.5">
                          <span className="text-sm font-semibold text-destructive">
                            Insufficient balance for this transfer.
                          </span>
                          <span className="text-xs text-muted-foreground">
                            You need {senderCurrency}{" "}
                            {sendManyTotal.toFixed(2)} but your balance is{" "}
                            {senderCurrency} {formattedBalance}.
                          </span>
                          <Button
                            type="button"
                            className={primaryBtnClass}
                            onClick={() => switchSection("add-money")}
                          >
                            Add Money
                          </Button>
                        </div>
                      ) : (
                        <Button
                          className={primaryBtnClass}
                          disabled={sendManySending}
                          onClick={handleSendToMany}
                        >
                          {sendManySending ? "Sending..." : "Send"}
                        </Button>
                      )}
                    </>
                  )}
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
                    className={cn(
                      "mt-3",
                      groupsTabDirection === "left"
                        ? "animate-slide-in-left"
                        : "animate-slide-in-right",
                    )}
                  >
                    <Friends
                      onSelectFriend={(fav) => {
                        switchSection("send");
                        handleSelectRecipient(fav);
                      }}
                    />
                  </div>
                ) : (
                  <div
                    key="groups"
                    className={cn(
                      "mt-3",
                      groupsTabDirection === "left"
                        ? "animate-slide-in-left"
                        : "animate-slide-in-right",
                    )}
                  >
                    <Groups
                      onTotalChange={setGroupFundsTotal}
                      onWalletChange={fetchBalance}
                    />
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

      {/* Floating market ticker — sits to the right, follows scroll, and
          stops just above the footer instead of covering it. On mobile it
          also has to clear the fixed bottom nav bar (70px + safe-area),
          added as a CSS var so the JS scroll-tracking below only has to
          know about the footer, not the nav. */}
      {activeSection === "dashboard" && tickerMessages.length > 0 && (
        <button
          type="button"
          className="fixed right-8 z-50 max-w-[260px] bg-card/90 [backdrop-filter:blur(14px)_saturate(1.3)] [-webkit-backdrop-filter:blur(14px)_saturate(1.3)] border border-[var(--gold-border)] text-gold text-[0.8rem] font-semibold leading-[1.4] text-left px-[1.1rem] py-[0.7rem] rounded-2xl shadow-lg shadow-black/20 cursor-pointer transition-[transform,bottom] duration-150 hover:-translate-y-0.5 max-[768px]:right-4 max-[768px]:max-w-[190px] max-[768px]:text-[0.72rem] max-[768px]:px-[0.9rem] max-[768px]:py-[0.6rem] max-[768px]:bg-card/75 max-[768px]:[backdrop-filter:blur(28px)_saturate(1.6)] max-[768px]:[-webkit-backdrop-filter:blur(28px)_saturate(1.6)] max-[768px]:[--mobile-nav-clearance:calc(70px+env(safe-area-inset-bottom)+12px)]"
          style={{
            bottom: `calc(${tickerBottom}px + var(--mobile-nav-clearance, 0px))`,
          }}
          onClick={() => setTickerIndex((i) => i + 1)}
        >
          <span key={tickerIndex} className="block animate-ticker-fade">
            {tickerMessages[tickerIndex % tickerMessages.length]}
          </span>
        </button>
      )}

      {/* Add Money — service picker popup, shown once a valid amount is entered */}
      <Dialog open={showAddMoneyPopup} onOpenChange={setShowAddMoneyPopup}>
        <DialogContent
          className={cn(
            "w-[min(400px,100%)] max-w-[400px] rounded-2xl p-7 flex flex-col gap-4",
            modal3dClass,
          )}
        >
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
        <DialogContent
          className={cn(
            "w-[min(400px,100%)] max-w-[400px] rounded-2xl p-7 flex flex-col gap-4",
            modal3dClass,
          )}
        >
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

      {/* Withdrawal receipt — shown after a successful withdrawal using
          whatever fields the backend's response included. Field names are
          guessed with fallbacks (camelCase/snake_case) since the exact
          response shape wasn't available; adjust the accessors below if
          your API uses different keys. */}
      <Dialog
        open={!!withdrawalReceipt}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setWithdrawalReceipt(null);
            goToDashboard();
          }
        }}
      >
        <DialogContent
          className={cn(
            "w-[min(420px,100%)] max-w-[420px] rounded-2xl p-7 flex flex-col gap-1",
            modal3dClass,
          )}
        >
          <DialogTitle className="text-center text-[1.1rem] font-bold text-foreground m-0 mb-2">
            Withdrawal Successful
          </DialogTitle>
          <div className="flex flex-col">
            <div className={receiptRowClass}>
              <span className={receiptLabelClass}>Merchant Code</span>
              <span className={receiptValueClass}>
                {withdrawalReceipt?.merchantCode ??
                  withdrawalReceipt?.merchant_code ??
                  "N/A"}
              </span>
            </div>
            <div className={receiptRowClass}>
              <span className={receiptLabelClass}>Customer Phone</span>
              <span className={receiptValueClass}>
                {withdrawalReceipt?.customerPhone ??
                  withdrawalReceipt?.customer_phone ??
                  "N/A"}
              </span>
            </div>
            <div className={receiptRowClass}>
              <span className={receiptLabelClass}>Amount</span>
              <span className={cn(receiptValueClass, "text-gold font-bold")}>
                {displayCurrency}
                {withdrawalReceipt?.amount ?? "N/A"}
              </span>
            </div>
            <div className={receiptRowClass}>
              <span className={receiptLabelClass}>Transaction Code</span>
              <span className={receiptValueClass}>
                {withdrawalReceipt?.transactionCode ??
                  withdrawalReceipt?.transaction_code ??
                  withdrawalReceipt?.reference ??
                  "N/A"}
              </span>
            </div>
            <div className={receiptRowClass}>
              <span className={receiptLabelClass}>New Balance</span>
              <span className={receiptValueClass}>
                {withdrawalReceipt?.newBalance ??
                  withdrawalReceipt?.new_balance ??
                  withdrawalReceipt?.balance ??
                  "N/A"}
              </span>
            </div>
            <div className={receiptRowClass}>
              <span className={receiptLabelClass}>Status</span>
              <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold capitalize bg-success/15 text-success border border-success/30">
                {withdrawalReceipt?.status ?? "Completed"}
              </span>
            </div>
          </div>
          <Button
            className={cn(primaryBtnClass, "mt-4")}
            onClick={() => {
              setWithdrawalReceipt(null);
              goToDashboard();
            }}
          >
            Done
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
            className={cn(
              "w-[min(400px,100%)] max-w-[400px] rounded-2xl p-7 flex flex-col gap-4 [&>button:last-child]:hidden",
              modal3dClass,
            )}
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
                            "bg-gold border-gold text-black shadow-[0_4px_14px_rgba(var(--gold-rgb),0.35)]",
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
