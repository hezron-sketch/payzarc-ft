import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  Flower2,
  Heart,
  Plus,
  UserPlus,
  Wallet,
  ArrowRightLeft,
  X,
  Check,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import axiosInstance, { contactsApi } from "../../utility/axiosInstance";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const FUND_TYPES = [
  {
    key: "emergency",
    label: "Emergency",
    icon: AlertTriangle,
    iconBg: "bg-destructive/15",
    iconColor: "text-destructive",
  },
  {
    key: "funeral",
    label: "Funeral",
    icon: Flower2,
    iconBg: "bg-info/15",
    iconColor: "text-info",
  },
  {
    key: "wedding",
    label: "Wedding",
    icon: Heart,
    iconBg: "bg-pink/15",
    iconColor: "text-pink",
  },
];
const fundTypeFor = (key) => FUND_TYPES.find((t) => t.key === key) || FUND_TYPES[0];

// Same embossed-row/gold-CTA recipe this file already used for the static
// fund-type buttons, reused now for the real group cards.
const cardClass =
  "w-full flex flex-col gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] shadow-[0_4px_10px_rgba(0,0,0,0.25),0_1px_0_rgba(255,255,255,0.05)_inset]";
const createGroupBtnClass =
  "w-full flex items-center justify-center gap-2 rounded-full py-3 px-4 text-[0.9rem] font-bold cursor-pointer text-black bg-gradient-to-b from-gold to-gold-dark transition-all duration-200 shadow-[0_8px_18px_rgba(0,0,0,0.3),0_1px_0_rgba(255,255,255,0.5)_inset,0_-2px_3px_rgba(0,0,0,0.15)_inset] hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(0,0,0,0.35),0_1px_0_rgba(255,255,255,0.5)_inset,0_-2px_3px_rgba(0,0,0,0.15)_inset] active:translate-y-0 active:shadow-[0_2px_6px_rgba(0,0,0,0.2),0_-1px_2px_rgba(0,0,0,0.2)_inset]";
const smallPillBtnClass =
  "flex-1 flex items-center justify-center gap-1.5 rounded-full py-2 px-3 text-[0.78rem] font-semibold cursor-pointer transition-all duration-200 active:scale-[0.97]";
const contributeBtnClass = cn(
  smallPillBtnClass,
  "text-black bg-gradient-to-b from-gold to-gold-dark shadow-[0_4px_10px_rgba(0,0,0,0.25),0_1px_0_rgba(255,255,255,0.4)_inset]",
);
const addFriendBtnClass = cn(
  smallPillBtnClass,
  "text-foreground bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] hover:border-gold/20",
);
const withdrawBtnClass = cn(
  smallPillBtnClass,
  "text-foreground bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.07] hover:border-gold/20",
);
const formLabelClass =
  "flex items-center justify-between text-[11px] font-medium text-muted-foreground uppercase tracking-wider -mb-[0.4rem]";
const formInputClass =
  "w-full h-auto bg-white/[0.03] border-white/[0.06] rounded-xl px-4 py-3.5 text-foreground text-base placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-gold/[0.08] focus-visible:border-gold/30 focus-visible:bg-white/[0.07] shadow-none transition-colors duration-200";
const primaryBtnClass =
  "w-full h-auto rounded-xl px-5 py-3.5 text-base font-bold text-black transition-all duration-200 hover:bg-primary active:scale-[0.97] disabled:opacity-60 disabled:active:scale-100 mt-1 shadow-lg shadow-gold/10 hover:shadow-gold/20";
const ghostLinkBtnClass =
  "self-start bg-transparent border-none text-gold text-[0.8rem] font-semibold cursor-pointer p-0 transition-opacity hover:opacity-75";

function MemberAvatars({ members, expanded, onToggle }) {
  if (!members.length) return null;
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-1.5 cursor-pointer group"
    >
      <div className="flex items-center -space-x-2">
        {members.slice(0, 4).map((m) => (
          <div
            key={m.id}
            title={m.display_name}
            className="w-6 h-6 rounded-full bg-gradient-to-br from-gold/35 to-gold/15 text-gold font-bold flex items-center justify-center border-2 border-[var(--card2)] text-[0.65rem]"
          >
            {(m.display_name || "?").slice(0, 1).toUpperCase()}
          </div>
        ))}
        {members.length > 4 && (
          <div className="w-6 h-6 rounded-full bg-white/[0.08] text-muted-foreground font-bold flex items-center justify-center border-2 border-[var(--card2)] text-[0.6rem]">
            +{members.length - 4}
          </div>
        )}
      </div>
      <ChevronDown
        size={14}
        className={cn(
          "text-muted-foreground transition-transform duration-200 group-hover:text-foreground",
          expanded && "rotate-180",
        )}
      />
    </button>
  );
}

function GroupCard({ group, friends, onContribute, onAddMember, onWithdraw }) {
  const fundType = fundTypeFor(group.type);
  const Icon = fundType.icon;
  const [mode, setMode] = useState(null); // null | "contribute" | "add-member" | "withdraw"
  const [expanded, setExpanded] = useState(false);
  const [amount, setAmount] = useState("");
  const [contributorId, setContributorId] = useState(group.members[0]?.id || "");
  const [busy, setBusy] = useState(false);
  const [withdrawError, setWithdrawError] = useState("");

  const memberIds = new Set(group.members.map((m) => m.id));
  const addable = friends.filter((f) => !memberIds.has(f.id));

  const reset = () => {
    setMode(null);
    setAmount("");
    setWithdrawError("");
  };

  const submitContribute = async () => {
    const value = Number(amount);
    if (!(value > 0) || !contributorId) return;
    setBusy(true);
    try {
      await onContribute(group.id, value, contributorId);
      reset();
    } finally {
      setBusy(false);
    }
  };

  const submitWithdraw = async () => {
    const value = Number(amount);
    if (!(value > 0)) return;
    if (value > group.balance) {
      setWithdrawError("Can't move more than the group's fund balance");
      return;
    }
    setBusy(true);
    try {
      await onWithdraw(group.id, value);
      reset();
    } catch (err) {
      setWithdrawError("Couldn't move funds. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const submitAddMember = async (memberId) => {
    setBusy(true);
    try {
      await onAddMember(group.id, memberId);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={cardClass}>
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
            fundType.iconBg,
            fundType.iconColor,
          )}
        >
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate m-0">
            {group.name}
          </p>
          <p className="text-xs text-muted-foreground m-0">{fundType.label}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-base font-bold text-gold m-0">
            {group.currency} {group.balance.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <MemberAvatars
          members={group.members}
          expanded={expanded}
          onToggle={() => setExpanded((v) => !v)}
        />
        <span className="text-[0.7rem] text-muted-foreground">
          {group.members.length} member{group.members.length === 1 ? "" : "s"}
        </span>
      </div>

      {expanded && (
        <div className="flex flex-col gap-1.5 animate-flow-fade-in">
          {group.members.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] px-3 py-2 transition-colors hover:bg-white/[0.05] hover:border-gold/20"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gold/35 to-gold/15 text-gold font-bold flex items-center justify-center text-[0.65rem] shrink-0">
                {(m.display_name || "?").slice(0, 1).toUpperCase()}
              </div>
              <span className="flex-1 min-w-0 text-sm text-foreground truncate">
                {m.display_name}
              </span>
              <span className="text-sm font-semibold text-gold shrink-0">
                {group.currency} {(m.contributed || 0).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {mode === "contribute" ? (
        <div className="flex flex-col gap-2 animate-flow-fade-in">
          <select
            value={contributorId}
            onChange={(e) => setContributorId(Number(e.target.value))}
            className={formInputClass}
          >
            {group.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.display_name}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              step="0.01"
              autoFocus
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={formInputClass}
            />
            <Button
              type="button"
              onClick={submitContribute}
              disabled={busy || !(Number(amount) > 0) || !contributorId}
              className="h-auto px-4 py-3.5 rounded-xl bg-gold text-black font-bold hover:bg-gold-dark disabled:opacity-60"
            >
              <Check size={16} />
            </Button>
            <button type="button" onClick={reset} className="text-muted-foreground p-2">
              <X size={16} />
            </button>
          </div>
        </div>
      ) : mode === "add-member" ? (
        <div className="flex flex-col gap-1.5 animate-flow-fade-in">
          {addable.length === 0 ? (
            <p className="text-xs text-muted-foreground py-1">
              All your friends are already in this group.
            </p>
          ) : (
            addable.map((f) => (
              <button
                key={f.id}
                type="button"
                disabled={busy}
                onClick={() => submitAddMember(f.id)}
                className="flex items-center justify-between gap-2 text-left text-sm text-foreground bg-white/[0.03] hover:bg-white/[0.06] rounded-lg px-3 py-2 transition-colors disabled:opacity-60"
              >
                {f.display_name}
                <UserPlus size={14} className="text-gold shrink-0" />
              </button>
            ))
          )}
          <button type="button" onClick={reset} className={ghostLinkBtnClass}>
            Done
          </button>
        </div>
      ) : mode === "withdraw" ? (
        <div className="flex flex-col gap-2 animate-flow-fade-in">
          <p className="text-xs text-muted-foreground -mb-0.5">
            Move funds from this group into your personal balance — do this
            before spending it, since transactions only draw from your
            wallet.
          </p>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min="0"
              max={group.balance}
              step="0.01"
              autoFocus
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={formInputClass}
            />
            <Button
              type="button"
              onClick={submitWithdraw}
              disabled={busy || !(Number(amount) > 0)}
              className="h-auto px-4 py-3.5 rounded-xl bg-gold text-black font-bold hover:bg-gold-dark disabled:opacity-60"
            >
              <Check size={16} />
            </Button>
            <button type="button" onClick={reset} className="text-muted-foreground p-2">
              <X size={16} />
            </button>
          </div>
          {withdrawError && (
            <p className="text-xs text-red-400 -mt-1">{withdrawError}</p>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {group.members.length > 0 && (
            <button
              type="button"
              className={contributeBtnClass}
              onClick={() => {
                setContributorId(group.members[0].id);
                setMode("contribute");
              }}
            >
              <Wallet size={14} /> Contribute
            </button>
          )}
          <button
            type="button"
            className={addFriendBtnClass}
            onClick={() => setMode("add-member")}
          >
            <UserPlus size={14} /> Add friend
          </button>
          {group.balance > 0 && (
            <button
              type="button"
              className={withdrawBtnClass}
              onClick={() => setMode("withdraw")}
            >
              <ArrowRightLeft size={14} /> Move to wallet
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Groups({ onTotalChange, onWalletChange }) {
  const [groups, setGroups] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState(FUND_TYPES[0].key);
  const [newMembers, setNewMembers] = useState([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const loadGroups = () =>
    axiosInstance
      .get("/api/groups")
      .then((res) => setGroups(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});

  useEffect(() => {
    Promise.all([
      loadGroups(),
      contactsApi
        .get("/api/favorites/all/")
        .then((res) => setFriends(res.data?.favourites || []))
        .catch(() => setFriends([])),
    ]).finally(() => setLoading(false));
  }, []);

  const totalFund = groups.reduce((sum, g) => sum + g.balance, 0);

  // The balance card's "Group Funds" pill (Home.js) fetches this same total
  // once on its own mount — this keeps it in sync whenever a contribution,
  // new group, etc. changes the real total here, instead of it going stale
  // the moment this panel is opened without a full Home remount.
  useEffect(() => {
    onTotalChange?.(totalFund);
  }, [totalFund, onTotalChange]);

  const toggleNewMember = (id) => {
    setNewMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id],
    );
  };

  const createGroup = async () => {
    if (!newName.trim()) {
      setCreateError("Give the group a name");
      return;
    }
    setCreateError("");
    setCreating(true);
    try {
      await axiosInstance.post("/api/groups", {
        name: newName.trim(),
        type: newType,
        members: newMembers,
      });
      await loadGroups();
      setShowCreate(false);
      setNewName("");
      setNewType(FUND_TYPES[0].key);
      setNewMembers([]);
    } catch (err) {
      setCreateError("Couldn't create the group. Try again.");
    } finally {
      setCreating(false);
    }
  };

  const contribute = async (groupId, amount, memberId) => {
    const res = await axiosInstance.post("/api/groups/contribute", {
      groupId,
      amount,
      memberId,
    });
    setGroups((prev) => prev.map((g) => (g.id === groupId ? res.data : g)));
  };

  const addMember = async (groupId, memberId) => {
    const res = await axiosInstance.post("/api/groups/add-member", {
      groupId,
      memberId,
    });
    setGroups((prev) => prev.map((g) => (g.id === groupId ? res.data : g)));
  };

  const withdrawToWallet = async (groupId, amount) => {
    const res = await axiosInstance.post("/api/groups/withdraw", {
      groupId,
      amount,
    });
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? res.data.group : g)),
    );
    // Personal balance lives in Home.js's own state, fetched separately
    // from /api/balance — this tells it to refetch now that some of it
    // just moved in, instead of it going stale until the next remount.
    onWalletChange?.();
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <span className="text-[0.7rem] font-bold text-muted-foreground uppercase tracking-[0.06em]">
          Group Fund
        </span>
        {groups.length > 0 && (
          <span className="text-[0.7rem] font-bold text-gold bg-gold/10 rounded-full px-2 py-0.5">
            {groups[0].currency} {totalFund.toLocaleString()} total
          </span>
        )}
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground text-sm py-6">Loading groups…</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {groups.map((g) => (
            <GroupCard
              key={g.id}
              group={g}
              friends={friends}
              onContribute={contribute}
              onAddMember={addMember}
              onWithdraw={withdrawToWallet}
            />
          ))}
          {groups.length === 0 && !showCreate && (
            <p className="text-center text-muted-foreground text-sm py-4">
              No groups yet — start one below.
            </p>
          )}
        </div>
      )}

      {showCreate ? (
        <div className="flex flex-col gap-[1.1rem] animate-flow-fade-in">
          <Label className={formLabelClass}>Group name</Label>
          <Input
            className={formInputClass}
            placeholder="e.g. Mom's Surgery Fund"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />

          <Label className={formLabelClass}>Reason</Label>
          <div className="flex gap-2">
            {FUND_TYPES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setNewType(t.key)}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-semibold transition-all duration-200",
                  newType === t.key
                    ? "bg-gold/10 border-gold/40 text-gold"
                    : "bg-white/[0.03] border-white/[0.06] text-muted-foreground hover:border-gold/20",
                )}
              >
                <t.icon size={16} />
                {t.label}
              </button>
            ))}
          </div>

          {friends.length > 0 && (
            <>
              <Label className={formLabelClass}>Add friends (optional)</Label>
              <div className="flex flex-col gap-1.5 max-h-[180px] overflow-y-auto">
                {friends.map((f) => {
                  const selected = newMembers.includes(f.id);
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => toggleNewMember(f.id)}
                      className={cn(
                        "flex items-center justify-between gap-2 text-left text-sm rounded-lg px-3 py-2 transition-colors",
                        selected
                          ? "bg-gold/10 text-gold"
                          : "bg-white/[0.03] text-foreground hover:bg-white/[0.06]",
                      )}
                    >
                      {f.display_name}
                      {selected && <Check size={14} className="shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {createError && <p className="text-xs text-red-400 -mt-1">{createError}</p>}

          <Button
            type="button"
            onClick={createGroup}
            disabled={creating}
            className={primaryBtnClass}
          >
            {creating ? "Creating…" : "Create group"}
          </Button>
          <button
            type="button"
            className={ghostLinkBtnClass}
            onClick={() => {
              setShowCreate(false);
              setCreateError("");
            }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={createGroupBtnClass}
          onClick={() => setShowCreate(true)}
        >
          <Plus size={16} /> Create Group
        </button>
      )}
    </div>
  );
}

export default Groups;
