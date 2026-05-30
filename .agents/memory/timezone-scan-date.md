---
name: Timezone — scan_date
description: Server vs frontend date mismatch when using UTC vs Brazil local time for scan_date
---

# Timezone — scan_date consistency rule

Server must use Brazil timezone (America/Sao_Paulo) for `scan_date`, not UTC.

**Rule:** Use `new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })` everywhere a YYYY-MM-DD date string is needed on the server. The `en-CA` locale forces ISO format.

**Why:** After 21:00 in Brazil (UTC midnight), `new Date().toISOString().slice(0, 10)` returns tomorrow's date. Frontend `getTodayDateString()` uses local browser time — they diverge for 3 hours every day. Result: scan gets stored with tomorrow's date, pre-sorter queries today's date, scan vanishes, package stays in "Faltantes", retry → 409.

**How to apply:** Any route that writes `scan_date` or similar date-only fields must use the Brazil-tz variant. Frontend `getTodayDateString()` (date-utils.ts) was also updated to use the same Intl API for consistency.
