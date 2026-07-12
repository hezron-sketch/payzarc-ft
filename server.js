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
