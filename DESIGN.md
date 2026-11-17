# DESIGN.md - SterilTrack Visual Direction & Design System

> **Vertical:** Hospital Central Sterile Services Department (CSSD / Central de Esterilizacion), Autoclaves & Orthopedic Loaner Surgical Trays (ANMAT Traceability)
> **Surface Mode:** Operate (Clinical / Laboratory Operations)
> **Dial:** `ENERGY 2 / RHYTHM 2 / MOTION 1`

---

## 1. Visual Direction & Competitive Benchmark

- **Operational Environment:** Basement CSSD decontamination/autoclave suites and bright orthopedic OR preparation stations. Operators work under fluorescent/LED lighting, often wearing gloves, requiring immediate visual distinction between sterile-released trays, quarantined biological cycles, and failed validations.
- **Sector Benchmarks:**
  - **Getinge T-DOC / Censis Censitrac:** High-contrast cool-neutral surfaces, unambiguous clinical status pills, monospace traceability codes (lot, GTIN, ANMAT PM, autoclave cycle).
  - **Steris SPM:** Restrained surgical teal accent reserved for primary actions and active navigation; zero decorative gradients, neon halos, or ornamental motion.

---

## 2. Color Tokens

- **Primary Ink & Header Surface:**
  - `--ink-primary`: `#0f172a` (`slate-900`)
  - `--ink-secondary`: `#334155` (`slate-700`) / `#475569` (`slate-600`, >= 7:1 on white)
  - `--header-bg`: `#0f172a` (`slate-900`) with `#e2e8f0` (`slate-200`) secondary text
- **Canvas & Surfaces:**
  - `--bg-canvas`: `#f4f7f8`
  - `--bg-surface`: `#ffffff`
  - `--border-hairline`: `#cbd5e1` (`slate-300`) / `#e2e8f0` (`slate-200`)
- **Primary Accent (Surgical Teal):**
  - `--accent-primary`: `#0d9488` (`teal-600`, white text) / `#0f766e` (`teal-700` hover)
  - `--accent-active-dark`: `#2dd4bf` (`teal-400`, `#0f172a` `slate-950` text on dark nav)
- **Clinical Semantic States (WCAG AA >= 4.5:1):**
  - **Sterile / Approved:** `#065f46` (`emerald-800`) on `#ecfdf5` (`emerald-50`), border `#a7f3d0` (`emerald-200`)
  - **Quarantine / Demo / Warning:** `#92400e` (`amber-800`) on `#fffbeb` (`amber-50`), border `#fde68a` (`amber-200`)
  - **Rejected / Missing Tool:** `#9f1239` (`rose-800`) on `#fff1f2` (`rose-50`), border `#fecdd3` (`rose-200`)
  - **ART / Insurance Claim:** `#1e40af` (`blue-800`) on `#eff6ff` (`blue-50`), border `#bfdbfe` (`blue-200`)

---

## 3. Typography & Descending Scale

- **Font Families (Offline-First System Stack, zero external CDN dependency):**
  - **UI Sans:** `'Segoe UI Variable', 'Segoe UI', system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif`
  - **Traceability Mono (Codes, Lots, Cycle #, SHA-256 Seals):** `'Cascadia Mono', 'SFMono-Regular', Consolas, 'Liberation Mono', ui-monospace, monospace`
- **Strict Descending Hierarchy (`h1 > h2 > h3 > body`):**
  - `h1` (Active View Title): `1.5rem` (`24px`, `text-2xl`), `font-bold`, `tracking-tight`, `leading-tight`
  - `h2` (Section / Statement Title): `1.125rem` (`18px`, `text-lg`), `font-semibold`, `leading-snug`
  - `h3` (Card / Sub-group Title): `1rem` (`16px`, `text-base`), `font-semibold`, `leading-snug`
  - `body`: `0.875rem` (`14px`, `text-sm`), `leading-relaxed`
  - `meta / table / badges`: `0.75rem` (`12px`, `text-xs`) minimum for all functional UI copy (never `< 12px` for functional labels).

---

## 4. Layout Rhythm & Component Rules

- **Touch Targets & Mobile:** Minimum `44px` (`min-h-[44px]`) on all interactive tabs, buttons, and dismiss controls; responsive `flex-wrap` navigation and single-column collapse (`grid-cols-1`) below `768px`.
- **Flat Card Discipline:** Cards use a `1px` hairline border (`border-slate-200`), `16px` (`p-4`) to `20px` (`p-5`) padding, and internal hairline dividers (`border-t border-slate-200 pt-3`). Nested bordered boxes inside cards are prohibited.
- **Iconography:** Monochrome inline SVG icons (`16px`/`20px`, `stroke-width="2"`, `aria-hidden="true"`). Decorative Unicode emojis are prohibited in UI chrome.
- **No Slop Guarantees:** Zero em dashes (`—`) in UI copy, zero `rounded-full` version pills inside `<h1>`, zero colored `box-shadow` halos, zero `border-l-4` side tabs, zero infinite pulse animations, zero `window.alert()`.
- **Demo / Mock Honesty:** Seeded or simulated workflows carry explicit `[DEMO]` / `[MOCK]` tags, respect the `steriltrack_demo_purged` localStorage guard, and surface a one-click purge/reload control.
- **Motion, Focus & Print:** Global `:focus-visible` `2px` teal ring, `@media (prefers-reduced-motion: reduce)` override, and high-contrast `@media print` cleanup hiding `.no-print` controls.
