const http = require("http");
const fs = require("fs");
const url = require("url");

const dbPath = "dummy_db.json";

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
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

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

    // Auth & Dashboard Endpoints
    if (
      req.method === "POST" &&
      (normalizedPath === "/api/resolve-username" ||
        normalizedPath === "/resolve-username")
    ) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ email: db.profile[0].email }));
      return;
    }

    if (
      req.method === "POST" &&
      (normalizedPath === "/api/login" || normalizedPath === "/login")
    ) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          fullName: `${db.profile[0].firstname} ${db.profile[0].surname}`,
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
          user: db.dashboard[0],
        }),
      );
      return;
    }

    if (
      req.method === "GET" &&
      (normalizedPath === "/api/dashboard" || normalizedPath === "/dashboard")
    ) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(db.dashboard[0]));
      return;
    }

    // Profile Endpoints
    if (
      req.method === "GET" &&
      (normalizedPath === "/api/profile-details" ||
        normalizedPath === "/profile-details")
    ) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(db.profile[0]));
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
      res.end(JSON.stringify(db.balance[0]));
      return;
    }

    if (
      req.method === "GET" &&
      (normalizedPath === "/api/my-contact" || normalizedPath === "/my-contact")
    ) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(db.my_contact[0]));
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

    // Settings Endpoints
    if (
      req.method === "POST" &&
      (normalizedPath === "/api/change-password/init" ||
        normalizedPath === "/change-password/init")
    ) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true }));
      return;
    }

    if (
      req.method === "POST" &&
      (normalizedPath === "/api/change-password/verify" ||
        normalizedPath === "/change-password/verify")
    ) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true }));
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
