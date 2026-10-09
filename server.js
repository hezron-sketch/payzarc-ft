const http = require("http");
const fs = require("fs");
const url = require("url");

const dbPath = "dummy_db.json";

const saveDb = (db) => fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

// Multiple mock accounts (Kenya/South Africa/Nigeria/Spain/...) live side by
// side in each array, keyed by matching `id`. There's no real session, so
// login just remembers which one is "active" in the db file itself.
const active = (db, arr) =>
  arr.find((x) => x.id === db.active_profile_id) || arr[0];

const server = http.createServer((req, res) => {
  // Re-read DB on every request to ensure it's fresh
  let db;
  try {
    db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
  } catch (e) {
    res.writeHead(500);
    res.end("Error reading database");
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;
  const normalizedPath = path.endsWith("/") ? path.slice(0, -1) : path;

  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, Bypass-Tunnel-Reminder",
  );

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });

  req.on("end", () => {
    console.log(`${req.method} ${path}`);

    let parsedBody = {};
    try {
      parsedBody = body ? JSON.parse(body) : {};
    } catch (e) {
      parsedBody = {};
    }

    // Auth & Dashboard Endpoints
    if (
      req.method === "POST" &&
      (normalizedPath === "/api/resolve-username" ||
        normalizedPath === "/resolve-username")
    ) {
      const match = db.profile.find(
        (p) =>
          p.username.toLowerCase() ===
          (parsedBody.username || "").toLowerCase(),
      );
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(match ? { email: match.email } : {}));
      return;
    }

    if (
      req.method === "POST" &&
      (normalizedPath === "/api/login" || normalizedPath === "/login")
    ) {
      // Resend-OTP calls this same endpoint with password: "resend" — let
      // those through without re-checking credentials.
      const isResend = parsedBody.password === "resend";
      const matched = db.profile.find(
        (p) =>
          p.email.toLowerCase() === (parsedBody.email || "").toLowerCase() &&
          p.password === parsedBody.password,
      );

      if (!isResend && !matched) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Incorrect username or password" }));
        return;
      }

      if (matched) {
        db.active_profile_id = matched.id;
        saveDb(db);
      }
      const account = matched || active(db, db.profile);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          fullName: `${account.firstname} ${account.surname}`,
          success: true,
        }),
      );
      return;
    }

    if (
      req.method === "POST" &&
      (normalizedPath === "/api/login/verify-otp" ||
        normalizedPath === "/login/verify-otp")
    ) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          accessToken: "dummy-access-token-12345",
          user: active(db, db.dashboard),
        }),
      );
      return;
    }

    if (
      req.method === "GET" &&
      (normalizedPath === "/api/dashboard" || normalizedPath === "/dashboard")
    ) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(active(db, db.dashboard)));
      return;
    }

    // Profile Endpoints
    if (
      req.method === "GET" &&
      (normalizedPath === "/api/profile-details" ||
        normalizedPath === "/profile-details")
    ) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(active(db, db.profile)));
      return;
    }

    // Only contact/address fields are editable here — identity fields
    // (name, DOB, ID, etc.) are KYC data and aren't meant to be freely
    // self-edited in a real fintech app, so this endpoint ignores them even
    // if sent.
    if (
      req.method === "POST" &&
      (normalizedPath === "/api/profile-details" ||
        normalizedPath === "/profile-details")
    ) {
      const editableFields = [
        "phone",
        "email",
        "addressLine",
        "townCity",
        "postalCode",
      ];
      const activeProfile = active(db, db.profile);
      editableFields.forEach((field) => {
        if (parsedBody[field] !== undefined) {
          activeProfile[field] = parsedBody[field];
        }
      });
      saveDb(db);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(activeProfile));
      return;
    }

    if (
      req.method === "GET" &&
      (normalizedPath === "/api/secondary-contacts" ||
        normalizedPath === "/secondary-contacts")
    ) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(db.secondary_contacts));
      return;
    }

    if (
      req.method === "GET" &&
      (normalizedPath === "/api/secondary-ids" ||
        normalizedPath === "/secondary-ids")
    ) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(db.secondary_ids));
      return;
    }

    // Wallet & Contact Endpoints
    if (
      req.method === "GET" &&
      (normalizedPath === "/api/balance" || normalizedPath === "/balance")
    ) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(active(db, db.balance)));
      return;
    }

    if (
      req.method === "GET" &&
      (normalizedPath === "/api/my-contact" || normalizedPath === "/my-contact")
    ) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(active(db, db.my_contact)));
      return;
    }

    if (
      req.method === "GET" &&
      (normalizedPath === "/api/notifications" ||
        normalizedPath === "/notifications")
    ) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(db.notifications || []));
      return;
    }

    if (
      req.method === "POST" &&
      (normalizedPath === "/api/notifications/read" ||
        normalizedPath === "/notifications/read")
    ) {
      const note = (db.notifications || []).find((n) => n.id === parsedBody.id);
      if (note) note.read = true;
      saveDb(db);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true }));
      return;
    }

    // ponytail: any recipient resolves; mirrors Django's response shape only.
    if (req.method === "POST" && normalizedPath === "/api/recipient-lookup") {
      const value = parsedBody.recipient_phone || "";
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: true,
          recipient_found: true,
          recipient: { name: `Mock User ${value.slice(-4)}`, phone: value },
        }),
      );
      return;
    }

    // Money Movement (Mock Success)
    if (
      req.method === "POST" &&
      (normalizedPath === "/api/send-money" ||
        normalizedPath === "/api/send-money")
    ) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({ success: true, message: "Money sent successfully!" }),
      );
      return;
    }

    if (
      req.method === "POST" &&
      (normalizedPath === "/api/withdraw" || normalizedPath === "/api/withdraw")
    ) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: true,
          message: "Withdrawal request submitted successfully!",
        }),
      );
      return;
    }

    // Favorites/Recipients Endpoints
    if (
      req.method === "GET" &&
      (normalizedPath === "/api/favorites/all" ||
        normalizedPath === "/favorites/all")
    ) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, favourites: db.favorites }));
      return;
    }

    if (
      req.method === "GET" &&
      (normalizedPath === "/api/favorites" || normalizedPath === "/favorites")
    ) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, favourites: db.favorites }));
      return;
    }

    // Groups Endpoints — a group has its own fund balance, separate from
    // the owner's wallet balance (db.balance). Friends "contribute" the
    // same way anyone sends money in this mock: no real cross-account
    // transfer, just an amount posted against the group, same "Mock
    // Success" pattern as the rest of Money Movement below. `members` is
    // populated with full favorite records on the way out so the frontend
    // never has to cross-reference ids itself.
    const populateGroup = (g) => ({
      ...g,
      members: (g.members || [])
        .map((id) => db.favorites.find((f) => f.id === id))
        .filter(Boolean)
        .map((f) => ({
          ...f,
          contributed: (g.contributions || {})[f.id] || 0,
        })),
    });

    if (
      req.method === "GET" &&
      (normalizedPath === "/api/groups" || normalizedPath === "/groups")
    ) {
      const mine = (db.groups || []).filter(
        (g) => g.owner_id === db.active_profile_id,
      );
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(mine.map(populateGroup)));
      return;
    }

    if (
      req.method === "POST" &&
      (normalizedPath === "/api/groups" || normalizedPath === "/groups")
    ) {
      const group = {
        id: Date.now(),
        owner_id: db.active_profile_id,
        name: parsedBody.name,
        type: parsedBody.type,
        balance: 0,
        currency: active(db, db.dashboard).currency,
        members: Array.isArray(parsedBody.members) ? parsedBody.members : [],
      };
      db.groups = db.groups || [];
      db.groups.push(group);
      saveDb(db);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(populateGroup(group)));
      return;
    }

    if (
      req.method === "POST" &&
      (normalizedPath === "/api/groups/add-member" ||
        normalizedPath === "/groups/add-member")
    ) {
      const group = (db.groups || []).find((g) => g.id === parsedBody.groupId);
      if (!group) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Group not found" }));
        return;
      }
      group.members = group.members || [];
      if (!group.members.includes(parsedBody.memberId)) {
        group.members.push(parsedBody.memberId);
      }
      saveDb(db);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(populateGroup(group)));
      return;
    }

    if (
      req.method === "POST" &&
      (normalizedPath === "/api/groups/contribute" ||
        normalizedPath === "/groups/contribute")
    ) {
      const group = (db.groups || []).find((g) => g.id === parsedBody.groupId);
      const amount = Number(parsedBody.amount);
      const memberId = parsedBody.memberId;
      const isMember = group && (group.members || []).includes(memberId);
      if (!group || !(amount > 0) || !isMember) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid group, amount, or member" }));
        return;
      }
      group.balance = Math.round((group.balance + amount) * 100) / 100;
      group.contributions = group.contributions || {};
      group.contributions[memberId] =
        Math.round(((group.contributions[memberId] || 0) + amount) * 100) / 100;
      saveDb(db);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(populateGroup(group)));
      return;
    }

    // Move money out of a group fund and into the owner's personal wallet
    // balance — a real transfer between the two pools (unlike the fully
    // fake Send/Withdraw below), so it can actually be spent afterward.
    if (
      req.method === "POST" &&
      (normalizedPath === "/api/groups/withdraw" ||
        normalizedPath === "/groups/withdraw")
    ) {
      const group = (db.groups || []).find(
        (g) =>
          g.id === parsedBody.groupId && g.owner_id === db.active_profile_id,
      );
      const amount = Number(parsedBody.amount);
      if (!group || !(amount > 0) || amount > group.balance) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid group or amount" }));
        return;
      }
      group.balance = Math.round((group.balance - amount) * 100) / 100;
      const wallet = active(db, db.balance);
      wallet.balance = Math.round((wallet.balance + amount) * 100) / 100;
      saveDb(db);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ group: populateGroup(group), balance: wallet }));
      return;
    }

    // Transactions Endpoints
    if (
      req.method === "GET" &&
      (normalizedPath === "/api/transactions/history" ||
        normalizedPath === "/transactions/history")
    ) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(db.transactions));
      return;
    }

    // Statement: plain jsPDF table of the active range. ponytail: the real
    // backend password-protects it; the mock doesn't.
    if (
      req.method === "GET" &&
      normalizedPath === "/api/reports/statement/pdf"
    ) {
      const { start = "", end = "" } = parsedUrl.query;
      const day = (tx) => String(tx.created_at).slice(0, 10);
      const txs = db.transactions.filter(
        (tx) => (!start || day(tx) >= start) && (!end || day(tx) <= end),
      );
      const { jsPDF } = require("jspdf");
      const doc = new jsPDF();
      doc.setFontSize(16).text("PayZarc Statement", 14, 18);
      doc.setFontSize(9).text(`${start || "Start"} to ${end || "today"}`, 14, 25);
      let y = 36;
      txs.forEach((tx) => {
        if (y > 280) (doc.addPage(), (y = 20));
        const sign = tx.transaction_type === "CREDIT" ? "+" : "-";
        doc.text(day(tx), 14, y);
        doc.text(String(tx.name || "").slice(0, 30), 40, y);
        doc.text(String(tx.status || ""), 120, y);
        doc.text(`${sign}${tx.currency} ${Number(tx.amount).toFixed(2)}`, 196, y, { align: "right" });
        y += 7;
      });
      res.writeHead(200, { "Content-Type": "application/pdf" });
      res.end(Buffer.from(doc.output("arraybuffer")));
      return;
    }

    if (
      req.method === "POST" &&
      normalizedPath === "/api/reports/statement/email"
    ) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Statement emailed (mock)." }));
      return;
    }

    // ponytail: ignores start/end; Reports.js re-filters by date client-side.
    if (
      req.method === "GET" &&
      normalizedPath === "/api/reports/transactions"
    ) {
      const me = active(db, db.profile) || {};
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          role: "member",
          user: {
            name: [me.firstname, me.surname].filter(Boolean).join(" "),
            username: me.username,
            email: me.email,
          },
          profile: { phone_number: me.phone, country: me.residenceCountry },
          transactions: db.transactions,
        }),
      );
      return;
    }

    // Settings Endpoints — a real two-step flow: /init checks the current
    // password and stashes the requested new one; /verify (any 6-char code,
    // since there's no real email/SMS provider here) applies it.
    if (
      req.method === "POST" &&
      (normalizedPath === "/api/change-password/init" ||
        normalizedPath === "/change-password/init")
    ) {
      if (parsedBody.currentPassword !== active(db, db.profile).password) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Current password is incorrect" }));
        return;
      }
      db.pending_password_change = parsedBody.newPassword;
      saveDb(db);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true }));
      return;
    }

    if (
      req.method === "POST" &&
      (normalizedPath === "/api/change-password/verify" ||
        normalizedPath === "/change-password/verify")
    ) {
      if (!db.pending_password_change) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "No password change in progress" }));
        return;
      }
      active(db, db.profile).password = db.pending_password_change;
      delete db.pending_password_change;
      saveDb(db);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true }));
      return;
    }

    // Payment Methods Endpoints (banks/cards linked from Profile, offered
    // as funding sources by Add Money)
    if (
      req.method === "GET" &&
      (normalizedPath === "/api/payment-methods" ||
        normalizedPath === "/payment-methods")
    ) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(db.payment_methods));
      return;
    }

    if (
      req.method === "POST" &&
      (normalizedPath === "/api/payment-methods/banks" ||
        normalizedPath === "/payment-methods/banks")
    ) {
      const bank = {
        id: Date.now(),
        bankName: parsedBody.bankName,
        accountNumber: parsedBody.accountNumber,
        accountName: parsedBody.accountName,
      };
      db.payment_methods.banks.push(bank);
      saveDb(db);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(db.payment_methods.banks));
      return;
    }

    if (
      req.method === "POST" &&
      (normalizedPath === "/api/payment-methods/cards" ||
        normalizedPath === "/payment-methods/cards")
    ) {
      // Only the last 4 digits are ever persisted — never store a full PAN,
      // even in a mock DB.
      const digits = String(parsedBody.cardNumber || "").replace(/\D/g, "");
      const card = {
        id: Date.now(),
        brand: "Visa",
        last4: digits.slice(-4),
        cardholderName: parsedBody.cardholderName,
        expiry: parsedBody.expiry,
      };
      db.payment_methods.cards.push(card);
      saveDb(db);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(db.payment_methods.cards));
      return;
    }

    if (
      req.method === "POST" &&
      (normalizedPath === "/api/payment-methods/mobile-money" ||
        normalizedPath === "/payment-methods/mobile-money")
    ) {
      const mobileMoneyAccount = {
        id: Date.now(),
        provider: parsedBody.provider,
        phoneNumber: parsedBody.phoneNumber,
      };
      db.payment_methods.mobileMoney = db.payment_methods.mobileMoney || [];
      db.payment_methods.mobileMoney.push(mobileMoneyAccount);
      saveDb(db);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(db.payment_methods.mobileMoney));
      return;
    }

    // Profile image upload — the body arrives as multipart/form-data, which
    // this server doesn't parse (no real storage backend to save it to
    // anyway), so this just acks receipt and keeps the existing avatar path.
    if (
      req.method === "POST" &&
      (normalizedPath === "/api/upload-profile-image" ||
        normalizedPath === "/upload-profile-image")
    ) {
      const account = active(db, db.dashboard);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          success: true,
          profileImageUrl: account.profileImageUrl,
        }),
      );
      return;
    }

    // KYC — like the profile-photo upload, the document/selfie body isn't
    // parsed (no real verification provider here), so submitting just
    // approves instantly and flips `idVerified`, same "Mock Success"
    // pattern as withdraw/send-money.
    if (
      req.method === "POST" &&
      (normalizedPath === "/api/kyc/verify" || normalizedPath === "/kyc/verify")
    ) {
      const profile = active(db, db.profile);
      profile.idVerified = true;
      saveDb(db);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(profile));
      return;
    }

    // Subscription Endpoints — no real billing provider here, so this just
    // flips `plan` on the active dashboard record once a linked payment
    // method is confirmed to exist (upgrade) or unconditionally (cancel).
    if (
      req.method === "POST" &&
      (normalizedPath === "/api/subscription/upgrade" ||
        normalizedPath === "/subscription/upgrade")
    ) {
      const hasMethod =
        (db.payment_methods.banks || []).length > 0 ||
        (db.payment_methods.cards || []).length > 0 ||
        (db.payment_methods.mobileMoney || []).length > 0;
      if (!hasMethod) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Add a payment method first" }));
        return;
      }
      const account = active(db, db.dashboard);
      account.plan = "pro";
      saveDb(db);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(account));
      return;
    }

    if (
      req.method === "POST" &&
      (normalizedPath === "/api/subscription/cancel" ||
        normalizedPath === "/subscription/cancel")
    ) {
      const account = active(db, db.dashboard);
      account.plan = "basic";
      saveDb(db);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(account));
      return;
    }

    // Reference Data Endpoints
    if (
      req.method === "GET" &&
      (normalizedPath === "/api/reference/countries" ||
        normalizedPath === "/reference/countries")
    ) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(db.reference_countries));
      return;
    }

    if (
      req.method === "GET" &&
      (normalizedPath === "/api/reference/banks" ||
        normalizedPath === "/reference/banks")
    ) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(db.reference_banks));
      return;
    }

    // Fallback
    console.log(`404 Not Found: ${normalizedPath}`);
    res.writeHead(404);
    res.end();
  });
});

server.listen(8080, () => {
  console.log("Mock server running on port 8080");
});
