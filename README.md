# GitPilot — Git Push Command Generator

Struggling with Git errors? GitPilot generates safe, automated Git commands for Windows (PowerShell), macOS (zsh), and Linux (bash). Push your code to GitHub easily in seconds. 100% Free and runs entirely in your browser.

## Files

| File | Purpose |
|---|---|
| `index.html` | Markup with SEO meta tags, OG/Twitter cards + preview image, JSON-LD structured data, PWA manifest link, SVG favicon, skip-link, keyboard shortcut hints, mobile-optimized inputs |
| `style.css` | Glassmorphism dark UI — design tokens preserved, plus focus indicators for history list, dark autofill, print styles, reduced-motion support |
| `script.js` | IIFE architecture. Robust validation, shell-safe quoting, POSIX permission guards, PowerShell error handling, conditional remote add/set-url, commit-if-staged guard, push HEAD (branch-agnostic), download-as-script, keyboard shortcuts, localStorage persistence, command history, focus trap, backdrop click close, offline detection |
| `favicon.svg` | Git-branch SVG icon (Windows green, Linux red, Mac blue dots) |
| `manifest.webmanifest` | PWA manifest — installable, standalone display, dark theme |
| `og-image.png` | Open Graph & Twitter Card preview image (1200×630) for rich social media sharing |
| `vercel.json` | Hardened security headers (CSP, HSTS, COOP, CORP, X-Frame-Options, Referrer-Policy, Permissions-Policy) + revalidation cache |

## Power Features

### Security (hardened)
- **CSP** with `script-src 'self'` (no inline scripts), `style-src 'self'` + Google Fonts, `frame-ancestors 'none'`
- **HSTS** with preload + subdomains (2 years)
- **COOP/CORP** same-origin (isolate context)
- **X-Frame-Options: DENY** (clickjacking protection)
- **Permissions-Policy** disables camera, mic, geo, payment, USB, interest-cohort
- **Input sanitization** — control characters (`\u0000-\u001f`) rejected, length caps (email ≤254 RFC, username ≤100, commit ≤200)
- **URL validation via `new URL()` constructor** — rejects non-github.com hosts, custom ports, embedded credentials (`user:pass@`), query strings, hashes
- **Shell-safe quoting** — PowerShell `'` doubling (`''`), POSIX `'\''` escape (verified with `O'Connor`, `Alex O'Brien`)
- **POSIX write-permission guards** — `[ -f ]` + `[ -w ]` checks before `.gitignore` writes (fail-fast on read-only files)
- **PowerShell error handling** — `$ErrorActionPreference = 'Stop'` in downloaded scripts + `-ErrorAction Stop` on all 6 `Add-Content` calls
- **Fail-safe secret untracking** — `git rm --cached` exit code checked in both PowerShell and POSIX, aborts on failure
- **Storage schema validation** — `Number.isFinite()` on timestamps, mode/OS enum checks, corrupt entries filtered out

### Robust Git Commands
- **Conditional remote add/set-url** — `if git remote get-url origin` auto-detects existing origin, only runs the correct command
- **Commit-if-staged guard** — `git diff --cached --quiet` checks staged changes before committing (no "nothing to commit" errors)
- **`git push -u origin HEAD`** — works on any branch name (main/master/feature), auto-sets upstream
- **`.gitignore` generator** — idempotent, deduped rules (PowerShell `foreach` + `Select-String`, bash `while read` + `grep -qxF`)
- **CRLF-safe** — `tr -d '\r'` normalizes line endings before dedup checks
- **`.env.example` always last** — trailing rule ensures `!.env.example` overrides any `.env.*` before it
- **Secrets untracking** — `git rm --cached --ignore-unmatch` with `.env.example` force-re-add via `git add -f`
- **Fix mode** — recovery options commented out (`#`), user must consciously uncomment (no accidental `--force`)

### UX Power Features
- **Download as script** — `.ps1` for Windows, `.sh` for macOS/Linux (with proper shebang + `set -e` + `$ErrorActionPreference = 'Stop'`)
- **Keyboard shortcuts** — `Ctrl/Cmd+Enter` generate, `Ctrl/Cmd+Shift+C` copy, `Ctrl/Cmd+Shift+D` download
- **localStorage persistence** — remembers OS + mode across sessions
- **Command history** — last 10 generations, click to restore (mode + OS + commands), keyboard-navigable (Arrow keys, Enter/Space to restore, Delete/Backspace to remove, Escape to close)
- **Real-time validation hints** — on blur, shows invalid state with red border
- **Output fade animation** — smooth opacity transition (CSP-safe via classList)
- **Command counter badge** — session generation count
- **Offline indicator** — shows banner when network drops (tool still works offline)
- **URL preview** — live preview of generated URL as you type username/repo
- **Backdrop click closes modal** — standard UX pattern for clipboard fallback modal
- **Focus trap** — dynamic `document.activeElement` tracking in copy modal (no hardcoded index)
- **Mobile-optimized** — `inputmode="email"` / `inputmode="url"` + `enterkeyhint` for correct mobile keyboards

### Accessibility
- Skip-to-content link
- ARIA live regions for toast (dynamic: `assertive` for errors, `polite` for success)
- `aria-invalid` on invalid inputs
- `aria-pressed` on OS toggle buttons
- `aria-expanded`/`aria-haspopup` on history button
- **Focus-visible outlines** on all interactive elements, including:
  - History list items (`li[role="listitem"]`)
  - Individual delete buttons (`hist-del-btn`)
  - Clear All button (`hist-clear-btn`)
- `prefers-reduced-motion` respected (disables orbs, custom cursor, transitions)
- `@media (hover: none)` disables custom cursor on touch devices
- Visually-hidden legend for radio fieldset
- Keyboard-navigable history list (Enter/Space to restore, Arrow keys to navigate, Escape to close)
- Focus restoration after history delete (next item or history button, not body)
- **No `aria-live` on output** — prevents screen reader from announcing 30+ lines of shell code; toast confirms success, user reads at own pace

### SEO & Social
- **Open Graph tags** — type, title, description, url, site_name, locale, **image (1200×630)**, image:width, image:height, image:alt
- **Twitter Card (summary_large_image)** — title, description, **image**, image:alt
- **JSON-LD structured data** — WebApplication schema
- Google site verification meta
- Descriptive meta description + keywords
- SVG favicon (scalable, crisp on all DPIs)
- PWA manifest (installable, app-like)

### Performance
- `preconnect` to font origins (reduces TLS handshake)
- `font-display: swap` (text visible during font load)
- `must-revalidate` cache for static assets via `vercel.json` (ensures new deployments picked up immediately)
- `will-change: transform` on custom cursor (GPU-accelerated)
- `requestAnimationFrame` for cursor ring animation (pauses when tab hidden)
- Minimal JS — single file, no dependencies, deferred loading
- **Empty `<pre>` tag** — prevents flash of wrong OS prompt on initial load (JS renders correct prompt immediately)

### Print Support
- Clean black-on-white output
- Hides custom cursor, orbs, buttons, footer
- Cards get page-break-inside avoidance
- Terminal text readable in print

## Deployment (Vercel)

1. Upload all files to your repo (including `og-image.png`)
2. Connect to Vercel
3. Deploy — `vercel.json` auto-applies all security headers + cache rules

No build step required. Static site, instant deploy.

## Browser Support

- Modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- `URL` constructor, `Object.freeze`, `replaceChildren`, `Number.isFinite`, `requestAnimationFrame`, CSS `backdrop-filter`, CSS `translate` property, `:focus-visible`
- Graceful degradation: clipboard fallback to `execCommand`, storage fallback to in-memory

## Tested Scenarios

### Git Command Generation
- All 5 modes (full, new, update, fix, ignore) generate correct commands
- All 3 OS (Windows, Mac, Linux) produce shell-correct output
- Apostrophe quoting verified: `O'Connor`, `Alex O'Brien`
- Default + custom commit messages work
- Multi-word commit messages (with spaces, quotes, special chars) safely quoted
- Empty commit message falls back to sensible default

### Security
- Non-github.com URLs rejected (gitlab, bitbucket)
- Credentialed URLs rejected (`user:pass@github.com`)
- URLs with ports rejected (`github.com:8080`)
- URLs with query strings / hashes rejected
- URLs with non-`/owner/repo` paths rejected
- Control characters in inputs rejected
- Length caps enforced (email ≤254, username ≤100, commit ≤200)
- Shell injection attempts neutralized (via `shellQuote` + control char rejection)

### `.gitignore` Handling
- Fresh repo (no `.gitignore`) — created with all rules
- Existing `.gitignore` with rules — deduplicated, no duplicates added
- Existing `.gitignore` with `!.env.example` not last — force-appended to end
- Read-only `.gitignore` (`chmod 444`) — POSIX script exits with clear error
- `.gitignore` with CRLF line endings — normalized before dedup
- `.gitignore` ending with multiple blank lines — trailing newline handled correctly

### Cross-Platform
- PowerShell `-ErrorAction Stop` on all 6 `Add-Content` calls
- POSIX `[ -f ]` + `[ -w ]` guards before writes
- `git rm --cached` exit code checked in both shells
- Downloaded `.ps1` / `.sh` scripts include proper headers (`$ErrorActionPreference`, `set -e`)

### UX / Accessibility
- Ctrl+Enter keyboard shortcut works (no double-fire on inputs)
- History counter increments + dropdown opens
- Download button enables after generation
- Reset clears all fields + disables buttons + persists defaults
- localStorage persists OS + mode after page reload
- History save/restore/delete/clear all work correctly
- Focus restoration after history delete (not lost to body)
- Focus trap in copy modal uses dynamic `document.activeElement` (not hardcoded)
- Backdrop click closes copy modal
- Escape closes copy modal + returns focus to copy button
- Mobile keyboards show correct input type (`inputmode`)

### Edge Cases
- Infinity / NaN timestamps in localStorage — rejected by `Number.isFinite()`
- Corrupt history entries — filtered out by `isValidHistoryEntry`
- Clipboard API unavailable — falls back to `execCommand`, then manual modal
- Storage quota exceeded — silently handled (falls back to no persistence)
- Offline — tool still works, banner shown
- Reduced motion — orbs/custom cursor/transitions disabled
- Touch devices — custom cursor hidden

### Console & Runtime
- Zero console errors
- Zero uncaught exceptions
- Zero memory leaks (event listeners cleaned up on modal close)