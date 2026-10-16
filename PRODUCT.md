# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

(Ships as a React web app and as an Android app via a Capacitor wrapper around the same build, `com.payzarc.app`. The design language is web, not native Android.)

## Users

Broad global consumers sending money internationally, with no single region as the focus. Typical jobs: send money to a person, pay several people at once, top up a wallet, cash out to mobile money, a bank or an agent, and keep track of what moved.

## Product Purpose

Payzarc is a multi-currency wallet for moving money across borders. Users deposit, hold balances, send to one or many recipients, and withdraw to mobile money or banks at live exchange rates. Success means money arrives quickly, costs little, and the user trusts that it went to the right person.

## Positioning

The things a neighbouring product (Wise, Remitly, WorldRemit, M-Pesa Global) could not claim together:

- **Mobile-money native:** delivery and withdrawal are built around mobile-money rails (Safaricom M-Pesa, Airtel Money) alongside banks, not bank-first with mobile money added on.
- **Social and group money:** group funds, friends, favourites and Send to Many are first-class features, not add-ons.
- **Low fees and speed.**
- **Trust and verification:** identity is verified up front (ID scan plus a face check), and every money-out transaction is authorized by a transaction PIN, or by face verification when the PIN is left blank. The recipient's registered name is looked up and shown before money moves.

## Operating Context

- **Getting started:** register with ID-document OCR and face capture, complete identity verification, set a password and a transaction PIN.
- **Money flows:**
  - Deposit (Add Money), via region-specific mobile-money or partner-bank options.
  - Send Money to one recipient, by phone or email, with country detected from the dial code.
  - Send to Many, with a shared amount or a different amount per recipient.
  - Withdraw to a linked mobile-money account or bank, or as an agent cash-out code.
- **Wallet:** balances in multiple currencies, with live exchange rates and a fallback rate table.
- **Social:** friends, favourites and group funds.
- **Records:** transaction history, transaction details, PDF receipts and statements, and CSV export.
- **Account:** profile, settings, linked payment methods and notifications.
- **Plans:** a free tier and Payzarc Pro. Free accounts are capped at 5 recipients per Send to Many; Pro removes the cap.
- **Email:** transactional emails (verification, password reset, transaction) are sent by the Django backend from the HTML and plain-text templates in `email-templates/`.

## Capabilities and Constraints

- **Stack:** the frontend is React (Create React App via CRACO), Tailwind with shadcn/Radix primitives, and lucide icons. The backend is a separate Django API. `server.js` with `dummy_db.json` is a local mock backend for development.
- **Regional providers:** these come from `src/utility/regionProviders.js`:
  - Kenya: M-Pesa, Airtel Money, KCB, DTB, Equity and Co-op.
  - EU: Wise, Revolut and SEPA.
  - US: Chase, Wells Fargo and ACH.
  - Everywhere else: generic bank transfer.

  The code still marks these partner names as placeholders, pending confirmation from business development.
- **Fees:** the transfer fee is currently a flat 1.5% with a $1 minimum. The code marks this as placeholder pricing until a fees API exists, so treat fee amounts as undecided.
- **Terminology:** "Deposit" is the user-facing word for Add Money. Other terms in use: "Send Money", "Send to Many", "Withdraw", "Transaction PIN", "Face ID / face verification", "Payzarc Pro" and "Group funds".
- **Unconfirmed endpoint:** some endpoints are guessed from existing patterns and are marked in code. Don't design around behaviour that isn't confirmed.

## Brand Commitments

- **Name:** Payzarc.
- **Colours:** the existing colour palette is binding and must be kept through redesigns. The tokens are in `src/styles/Global.css`.
- **Design direction:** the user chose an Apple-style design direction for the current redesign, with clarity, restraint, materials and fluid motion. This is recorded as their stated preference, not expanded here.

## Evidence on Hand

- **Confirmed claims:** the user confirmed these landing-page claims as true, so they may be used as proof:
  - "50+ countries"
  - "most transfers arrive in under 60 seconds"
  - "256-bit encryption and full regulatory compliance in all regions"
- **Contact details:** the office address shown on the landing page is Kew Gardens Dr, Houston TX, USA.
- **Assets:**
  - logos: `public/images/logo.png`, `payzarc.png` and their variants;
  - landing imagery: `public/images/gallery1-3.jpg`, `money_transfer-…jpg` and `send_money_globally_sm…png`;
  - favicons: `public/favicon/`;
  - email icons: `email-templates/icons/`.
- **Requirements doc:** `public/images/Requirements.docx` exists but hasn't been reviewed.
- **Absent, do not fabricate:** testimonials, customer counts, transfer-volume figures, press mentions, ratings, named partners beyond the placeholder list above, and final pricing.

## Product Principles

1. **Trust before speed.** Show who will receive the money and what it will cost before it moves. Authorization (PIN or face) is never skipped or hidden.
2. **Mobile money is a first-class destination**, equal to banks in every flow, never an afterthought.
3. **Money is social.** Paying several people, groups and favourites should feel as natural as paying one person.
4. **No surprises on cost.** Fees, the exchange rate and the total to pay are visible at the moment of decision.
5. **One flow, one decision.** Each step asks for the minimum needed, and failures (insufficient balance, recipient not found, declined) say what happened and what to do next.
