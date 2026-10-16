# Payzarc email templates

Branded HTML/plain-text templates for every transactional email Payzarc
sends: email verification, password reset, and transaction notifications.
Handed off from the frontend repo for the backend (Django) to wire up —
this folder isn't part of the React build.

## Why these look the way they do

Colors, radii, and fonts are pulled straight from the app's own design
tokens (`src/styles/Global.css` `:root` and `tailwind.config.js`), so the
emails read as the same product as the dashboard: dark navy background,
gold accents, same 18/12/8px radius scale, same font stack. See the
comment at the top of `base_email.html` for the exact token→hex mapping.

Both OTP templates (verification, password reset) show a 6-character code,
not a magic link — that matches the actual flow in `Register.js` and
`ResetPassword.js` (`confirmationcodesize = 6`, `POST /api/verify-email-code`).
The transaction template's fields (`transaction_code`, `name`, `country`,
`amount`, `currency`, `transaction_type`, `status`, `fee`, `recipient`,
`created_at`) match the transaction objects in `dummy_db.json` / used by
`History.js` exactly, so it should drop onto a serialized Transaction model
with no field renaming.

## Files

| File | Purpose |
|---|---|
| `base_email.html` | Shared layout (wordmark, card, footer). Extend it, don't copy it. |
| `verification_email.html` / `.txt` | Signup / email-confirmation OTP |
| `password_reset_email.html` / `.txt` | Password reset OTP |
| `transaction_email.html` / `.txt` | Money sent / received notification |
| `icons/` | Header icons the templates reference (see below) |

Every `.html` has a matching `.txt` — always send both as a multipart
email (spam filters score HTML-only mail worse, and it's the accessible
fallback for text-only clients).

## Icons

No emoji — email clients render them inconsistently (Outlook desktop often
shows a box, and glyphs differ by OS/platform). Instead each template
references a small hosted PNG via an `<img>`, the same pattern as
`logo_url`, matching the exact icons the app itself uses from `lucide-react`:

| Template | Icon | Source | Color |
|---|---|---|---|
| `verification_email.html` | `icon_check_url` | `icons/check-circle.png` (lucide `CircleCheckBig`) | gold `#ecc94b` |
| `password_reset_email.html` | `icon_lock_url` | `icons/lock.png` (lucide `Lock`) | danger `#ef4444` |
| `transaction_email.html` (CREDIT) | `icon_trending_up_url` | `icons/trending-up.png` (lucide `TrendingUp`) | success `#4ade80` |
| `transaction_email.html` (DEBIT) | `icon_trending_down_url` | `icons/trending-down.png` (lucide `TrendingDown`) | danger `#ef4444` |

The `.svg` sources are in `icons/` too, in case you want to re-export at a
different size — PNGs are exported at 64×64 (2x for retina) and displayed
at 24–26px. Host the PNGs the same way as the logo (see below) and pass
their URLs in context, or leave them unset to fall back to the
`payzarc.com/static/email/icons/...` defaults baked into each template.

## Django integration

Drop the `.html` files into `templates/emails/` (matching the
`{% extends "emails/base_email.html" %}` path already used in each
child template) and the `.txt` files next to your other text templates.

```python
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils import timezone

def send_verification_email(user, code):
    context = {
        "first_name": user.first_name,
        "email": user.email,
        "code": code,
        "expires_in": "10 minutes",
        "year": timezone.now().year,
        "support_email": "support@payzarc.com",
        "logo_url": "https://payzarc.com/static/email/logo.png",
        "icon_check_url": "https://payzarc.com/static/email/icons/check-circle.png",
    }
    text_body = render_to_string("emails/verification_email.txt", context)
    html_body = render_to_string("emails/verification_email.html", context)

    msg = EmailMultiAlternatives(
        subject="Verify your email — Payzarc",
        body=text_body,
        from_email="Payzarc <no-reply@payzarc.com>",
        to=[user.email],
    )
    msg.attach_alternative(html_body, "text/html")
    msg.send()
```

Same pattern for `password_reset_email.*` (context: `first_name`, `email`,
`code`, `expires_in`, optionally `requested_ip` / `requested_device`) and
`transaction_email.*` (context: the transaction fields listed above, plus
`app_url` for the "View Transaction" button).

## Things the backend dev should not skip

- **Host the logo (and icons) publicly.** Email clients don't load
  relative/local paths — `logo_url` and every `icon_*_url` must be an
  absolute URL (e.g. served from `payzarc.com/static/...` or a CDN), not
  `/images/logo.png`. Upload the PNGs in `icons/` alongside the logo.
- **Always pass `year`** (e.g. `timezone.now().year`) — templates don't
  compute it themselves since Django templates have no date math built in
  beyond `{% now %}`, and hardcoding it would go stale.
- **Test in real clients before shipping**, not just a browser preview —
  Outlook desktop, Gmail app, and Apple Mail all render CSS differently.
  Litmus or Email on Acid cover this cheaply; at minimum send yourself a
  test in Gmail + Outlook.
- **Subject lines aren't in these templates** — set them in the send
  call (see example above), matching the `{% block title %}` text for
  consistency.
- **Extending to new email types** (login alerts, KYC status updates,
  statements ready, etc.): create a new `{% extends "emails/base_email.html" %}`
  template following the same structure — icon chip, heading, body copy,
  optional detail panel (`#314566` background, `12px` radius), optional
  gold CTA button (`#ecc94b` bg, `#1a202c` text) — so new message types
  stay visually consistent with these three.
