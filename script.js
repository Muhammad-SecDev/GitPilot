"use strict";

// CSP Safe: Browser ko yaad rakhne se roko ki user pichli baar kahan scroll kar gaya tha
if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

// CSP Safe: Jab page poori tarah load ho jaye (images, fonts), tab top par le jao
window.addEventListener('load', () => {
    window.scrollTo(0, 0);
});


/* ======================================================
   Git Setup & Code Push Assistant (Ultimate Edition)
   IIFE Architecture for Global Scope Isolation

   Power Features:
   - Shell-safe quoting (PowerShell '' / POSIX '\'')
   - URL constructor validation (rejects non-github.com, ports, userinfo)
   - Conditional remote add/set-url (auto-detect existing origin)
   - Commit-if-staged guard (no empty commits)
   - Push HEAD (works on any branch name)
   - Frozen config (immutability)
   - Input length + control-character sanitization
   - Download as .ps1 / .sh script
   - Keyboard shortcuts (Ctrl/Cmd+Enter, Ctrl/Cmd+Shift+C)
   - localStorage persistence (OS + mode)
   - Command history (last 10 generations, click to restore)
   - Real-time validation hints
   - Output fade animation
   - Offline detection
   - Command counter
   ====================================================== */

const GitAssistantApp = (() => {
    const MODES = Object.freeze({
        FULL: "full",
        NEW: "new",
        UPDATE: "update",
        FIX: "fix",
        IGNORE: "ignore"
    });

    const OS_CONFIG = Object.freeze({
        win: Object.freeze({
            prompt: "PS C:\\Project>",
            label: "Windows",
            title: "PowerShell",
            shell: "powershell",
            scriptExtension: "ps1",
            scriptHeader: "# Git Setup Script - PowerShell\n# Run in your project folder.\n# Review each command before executing.\n# If PowerShell blocks execution, run this first: Set-ExecutionPolicy Bypass -Scope Process -Force\n$ErrorActionPreference = 'Stop'\n",
            credentialHelper: "manager"
        }),
        mac: Object.freeze({
            prompt: "user@macbook project %",
            label: "macOS",
            title: "Terminal - zsh",
            shell: "posix",
            scriptExtension: "sh",
            scriptHeader: "#!/bin/bash\n# Git Setup Script - macOS/zsh\n# Run in your project folder.\n# Review each command before executing.\nset -e\n",
            credentialHelper: "osxkeychain"
        }),
        linux: Object.freeze({
            prompt: "user@linux:~/project$",
            label: "Linux",
            title: "Terminal - bash",
            shell: "posix",
            scriptExtension: "sh",
            scriptHeader: "#!/bin/bash\n# Git Setup Script - Linux/bash\n# Run in your project folder.\n# Review each command before executing.\nset -e\n",
            credentialHelper: "cache --timeout=3600"
        })
    });

    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const GITHUB_USER_REGEX = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
    const REPO_REGEX = /^[a-z\d](?:[a-z\d._-]{0,99})?$/i;
    const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

    const STORAGE_KEYS = Object.freeze({
        OS: "gsa.v1.selectedOS",
        MODE: "gsa.v1.selectedMode",
        HISTORY: "gsa.v1.history"
    });

    const MAX_HISTORY = 10;

    const GITIGNORE_RULES = Object.freeze([
        "# Dependencies",
        "node_modules/",
        "",
        "# Environment variables and secrets",
        ".env",
        ".env.*",
        "!.env.example",
        "",
        "# Private keys and credentials",
        "*.pem",
        "*.key",
        "*.p12",
        "*.pfx",
        "id_rsa",
        "id_rsa.*",
        "id_ecdsa",
        "id_ecdsa.*",
        "id_ed25519",
        "id_ed25519.*",
        "credentials.json",
        "client_secret*.json",
        "service-account*.json",
        "",
        "# Package manager tokens",
        ".npmrc",
        ".pypirc",
        ".netrc",
        "",
        "# Build and test output",
        "dist/",
        "build/",
        "coverage/",
        "",
        "# Operating system files",
        ".DS_Store",
        "Thumbs.db",
        "",
        "# Editor files",
        ".vscode/",
        ".idea/",
        "*.log"
    ]);

    // Secret file patterns to untrack if previously committed.
    // MUST stay consistent with GITIGNORE_RULES above — every pattern here
    // should have a matching .gitignore rule so future changes stay ignored.
    // .env.* covers ALL env variants (test, qa, staging.local, etc.)
    // .env.example is explicitly re-added after untracking (see buildUntrackSecretsLines).
    const SECRET_PATTERNS = Object.freeze([
        ".env", ".env.*",
        "*.pem", "*.key", "*.p12", "*.pfx",
        "id_rsa", "id_rsa.*",
        "id_ecdsa", "id_ecdsa.*",
        "id_ed25519", "id_ed25519.*",
        "credentials.json",
        "client_secret*.json",
        "service-account*.json"
    ]);

    function must(id) {
        const el = document.getElementById(id);
        if (!el) throw new Error(`Missing required page element: ${id}`);
        return el;
    }

    const elements = {
        username: must("username"),
        email: must("email"),
        githubUser: must("githubUser"),
        repository: must("repository"),
        repoURL: must("repoURL"),
        commitMessage: must("commitMessage"),
        output: must("output"),
        generateButton: must("generateButton"),
        copyButton: must("copyButton"),
        downloadButton: must("downloadButton"),
        clearButton: must("clearButton"),
        toast: must("toast"),
        terminalTitle: must("terminal-title"),
        terminalHeader: document.querySelector(".terminal-header"),
        osButtons: document.querySelectorAll(".os-btn"),
        step1Card: must("step1-card"),
        step2Card: must("step2-card"),
        commitCard: must("commit-card"),
        step3Card: must("step3-card"),
        setupModeRadios: document.querySelectorAll('input[name="setupMode"]'),
        radioCards: document.querySelectorAll('.radio-card'),
        fullRadio: document.querySelector('input[name="setupMode"][value="full"]'),
        historyButton: must("historyButton"),
        historyList: must("historyList"),
        cmdCount: must("cmdCount"),
        offlineIndicator: document.getElementById("offline-indicator"),
        urlPreview: document.getElementById("url-preview")
    };

    const state = {
        selectedOS: "win",
        currentMode: MODES.FULL,
        rawCommands: "",
        toastTimer: null,
        animationId: null,
        history: [],
        cmdCounter: 0
    };

    function currentOS() {
        return OS_CONFIG[state.selectedOS] || OS_CONFIG.win;
    }

    // ==========================================
    // STORAGE (localStorage with safe fallback)
    // ==========================================
    const storage = {
        available: (() => {
            try {
                const k = "__gsa_test__";
                localStorage.setItem(k, "1");
                localStorage.removeItem(k);
                return true;
            } catch (_e) {
                return false;
            }
        })(),
        get(key, fallback) {
            if (!this.available) return fallback;
            try {
                const v = localStorage.getItem(key);
                return v === null ? fallback : JSON.parse(v);
            } catch (_e) {
                return fallback;
            }
        },
        set(key, value) {
            if (!this.available) return;
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (_e) {
                /* quota exceeded or disabled - silently ignore */
            }
        }
    };

    // Validate a history entry has the required shape before restoring.
    function isValidHistoryEntry(entry) {
        if (!entry || typeof entry !== "object") return false;
        const validModes = Object.values(MODES);
        const validOS = Object.keys(OS_CONFIG);
        return typeof entry.mode === "string" && validModes.includes(entry.mode)
            && typeof entry.os === "string" && validOS.includes(entry.os)
            && typeof entry.commands === "string" && entry.commands.length > 0
            && Number.isFinite(entry.timestamp) && entry.timestamp > 0;
    }

    function sanitizeHistory(rawHistory) {
        if (!Array.isArray(rawHistory)) return [];
        return rawHistory.filter(isValidHistoryEntry).slice(0, MAX_HISTORY);
    }

    // ==========================================
    // SHELL QUOTING (verified safe for PowerShell + POSIX)
    // ==========================================
    function shellQuote(value) {
        const stringValue = String(value);
        if (currentOS().shell === "powershell") {
            // Fix: Replace standard and smart single quotes
            return `'${stringValue.replace(/['\u2018\u2019\u201A\u201B]/g, "''")}'`;
        }
        return `'${stringValue.replace(/'/g, "'\\''")}'`;
    }

    // ==========================================
    // TOAST
    // ==========================================
    function showToast(message, isError = false) {
        window.clearTimeout(state.toastTimer);
        elements.toast.textContent = message;
        elements.toast.className = "toast show" + (isError ? " error" : " success");
        elements.toast.setAttribute('role', isError ? 'alert' : 'status');
        elements.toast.setAttribute('aria-live', isError ? 'assertive' : 'polite');
        state.toastTimer = window.setTimeout(() => {
            elements.toast.className = "toast";
            state.toastTimer = null;
        }, 3200);
    }

    // ==========================================
    // VALIDATION
    // ==========================================
    function validateRepositoryName(repository) {
        const normalized = repository.toLowerCase().endsWith(".git") ? repository.slice(0, -4) : repository;
        return normalized.length >= 1 && normalized.length <= 100
            && REPO_REGEX.test(normalized)
            && normalized !== "." && normalized !== ".."
            && !normalized.toLowerCase().endsWith(".wiki");
    }

    function parseGitHubRemote(rawURL) {
        let parsedURL;
        try {
            parsedURL = new URL(rawURL);
        } catch (_error) {
            return { error: "Enter a valid GitHub HTTPS repository URL." };
        }

        if (parsedURL.protocol !== "https:"
            || parsedURL.hostname.toLowerCase() !== "github.com"
            || parsedURL.port !== ""
            || parsedURL.username !== ""
            || parsedURL.password !== ""
            || parsedURL.search !== ""
            || parsedURL.hash !== "") {
            return { error: "Only a plain HTTPS URL on github.com is supported." };
        }

        const pathMatch = parsedURL.pathname.match(/^\/([^/]+)\/([^/]+)\/?$/);
        if (!pathMatch) return { error: "The URL must point directly to /owner/repository." };

        const owner = pathMatch[1];
        let repository = pathMatch[2];
        if (repository.toLowerCase().endsWith(".git")) repository = repository.slice(0, -4);

        if (!GITHUB_USER_REGEX.test(owner)) return { error: "The GitHub username in the URL is invalid." };
        if (!validateRepositoryName(repository)) return { error: "The repository name in the URL is invalid." };

        return { url: `https://github.com/${owner}/${repository}.git`, owner, repository };
    }

    function buildRemoteURL(owner, repository) {
        if (!GITHUB_USER_REGEX.test(owner)) return { error: "Enter a valid GitHub username." };
        if (!validateRepositoryName(repository)) return { error: "Enter a valid GitHub repository name (up to 100 chars)." };
        const normalizedRepo = repository.replace(/\.git$/i, "");
        return { url: `https://github.com/${owner}/${normalizedRepo}.git` };
    }

    function getRemoteFromInputs(errors) {
        const suppliedURL = elements.repoURL.value.trim();
        if (suppliedURL) {
            const parsed = parseGitHubRemote(suppliedURL);
            if (parsed.error) {
                errors.push({ message: parsed.error, element: elements.repoURL });
                return "";
            }
            return parsed.url;
        }

        const owner = elements.githubUser.value.trim();
        const repository = elements.repository.value.trim();
        if (!owner) errors.push({ message: "Enter a GitHub username.", element: elements.githubUser });
        if (!repository) errors.push({ message: "Enter a repository name.", element: elements.repository });
        if (!owner || !repository) return "";

        const result = buildRemoteURL(owner, repository);
        if (result.error) {
            const target = !GITHUB_USER_REGEX.test(owner) ? elements.githubUser : elements.repository;
            errors.push({ message: result.error, element: target });
            return "";
        }
        return result.url;
    }

    function validateInputs() {
        const errors = [];
        let remote = "";
        const usesRepository = state.currentMode === MODES.FULL || state.currentMode === MODES.NEW;
        const usesCommitMessage = usesRepository || state.currentMode === MODES.UPDATE;

        if (state.currentMode === MODES.FULL) {
            const name = elements.username.value.trim();
            const email = elements.email.value.trim();

            if (!name) {
                errors.push({ message: "Enter your Git username.", element: elements.username });
            } else if (name.length > 100 || CONTROL_CHARACTERS.test(name)) {
                errors.push({ message: "Git username must be 1-100 characters (no control chars).", element: elements.username });
            }

            if (!email) {
                errors.push({ message: "Enter your Git email address.", element: elements.email });
            } else if (email.length > 254 || !EMAIL_REGEX.test(email) || CONTROL_CHARACTERS.test(email)) {
                errors.push({ message: "Enter a valid email address (max 254 chars).", element: elements.email });
            }
        }

        if (usesRepository) remote = getRemoteFromInputs(errors);

        if (usesCommitMessage) {
            const message = elements.commitMessage.value.trim();
            if (message.length > 200 || CONTROL_CHARACTERS.test(message)) {
                errors.push({ message: "Commit message must be up to 200 characters (no control chars).", element: elements.commitMessage });
            }
        }

        return { errors, remote };
    }

    // ==========================================
    // VALIDATION STATE HELPERS
    // ==========================================
    function setInvalidState(el) { el.setAttribute('aria-invalid', 'true'); }
    function clearInvalidStates() {
        [elements.username, elements.email, elements.githubUser, elements.repository, elements.repoURL, elements.commitMessage].forEach(el => {
            el.removeAttribute('aria-invalid');
        });
    }

    // Real-time validation hint (subtle, non-blocking)
    function validateFieldLive(el) {
        if (!el.value.trim()) {
            el.removeAttribute('aria-invalid');
            return;
        }
        const id = el.id;
        let valid = true;
        const v = el.value.trim();
        if (id === "email") {
            valid = EMAIL_REGEX.test(v) && v.length <= 254 && !CONTROL_CHARACTERS.test(v);
        } else if (id === "githubUser") {
            valid = GITHUB_USER_REGEX.test(v);
        } else if (id === "repository") {
            valid = validateRepositoryName(v);
        } else if (id === "repoURL") {
            valid = !v || (parseGitHubRemote(v).url !== undefined);
        } else if (id === "username") {
            valid = v.length <= 100 && !CONTROL_CHARACTERS.test(v);
        } else if (id === "commitMessage") {
            valid = v.length <= 200 && !CONTROL_CHARACTERS.test(v);
        }
        if (valid) {
            el.removeAttribute('aria-invalid');
        } else {
            el.setAttribute('aria-invalid', 'true');
        }
    }

    // ==========================================
    // RENDERING
    // ==========================================
    function renderOutput(lines) {
        const prompt = currentOS().prompt;
        const fragment = document.createDocumentFragment();

        lines.forEach(line => {
            if (line === '') {
                fragment.appendChild(document.createElement('br'));
            } else if (line.startsWith('#')) {
                const span = document.createElement('span');
                span.className = 'comment';
                span.textContent = line;
                fragment.appendChild(span);
                fragment.appendChild(document.createElement('br'));
            } else {
                // Use trimmed line for classification (handles indented continuation lines)
                const trimmed = line.trimStart();
                
                // FIX: Removed dead code 'cat >> ' and added new dynamic commands like '$lastLine', 'tr -d', 'exit_code='
                if (trimmed.startsWith('git ') || trimmed.startsWith('echo ') || trimmed.startsWith('Write-Host ') || trimmed.startsWith('Write-Error ') || trimmed.startsWith('@(') || trimmed.startsWith('foreach') || trimmed.startsWith('touch') || trimmed.startsWith('while') || trimmed.startsWith('if ') || trimmed.startsWith('else') || trimmed.startsWith('elif') || trimmed.startsWith('fi') || trimmed.startsWith('}') || trimmed.startsWith('New-Item') || trimmed.startsWith('Test-Path') || trimmed.startsWith('Select-String') || trimmed.startsWith('Add-Content') || trimmed.startsWith('exit') || trimmed.startsWith('done') || trimmed.startsWith('[') || trimmed.startsWith('))') || trimmed.startsWith('try') || trimmed.startsWith('catch') || trimmed.startsWith('$lastLine') || trimmed.startsWith('tr -d') || trimmed.startsWith('exit_code=') || trimmed === 'EOF') {
                    const promptSpan = document.createElement('span');
                    promptSpan.className = 'prompt';
                    promptSpan.textContent = `${prompt} `;

                    const cmdSpan = document.createElement('span');
                    cmdSpan.className = 'command';
                    cmdSpan.textContent = line;

                    fragment.appendChild(promptSpan);
                    fragment.appendChild(cmdSpan);
                    fragment.appendChild(document.createElement('br'));
                } else {
                    const span = document.createElement('span');
                    span.className = 'shell-line';
                    span.textContent = line;
                    fragment.appendChild(span);
                    fragment.appendChild(document.createElement('br'));
                }
            }
        });

        // Smooth fade transition (CSP-safe via classList)
        elements.output.classList.add('terminal-fading');
        requestAnimationFrame(() => {
            elements.output.replaceChildren(fragment);
            elements.output.classList.remove('terminal-fading');
        });
    }

    function renderPlaceholder() {
        const fragment = document.createDocumentFragment();
        const promptSpan = document.createElement('span');
        promptSpan.className = 'prompt';
        promptSpan.textContent = `${currentOS().prompt} `;

        const textSpan = document.createElement('span');
        textSpan.textContent = 'Commands will appear here after clicking "Generate"...';

        fragment.appendChild(promptSpan);
        fragment.appendChild(textSpan);

        elements.output.classList.add('terminal-fading');
        requestAnimationFrame(() => {
            elements.output.replaceChildren(fragment);
            elements.output.classList.remove('terminal-fading');
        });
    }

    function renderError(errors) {
        const fragment = document.createDocumentFragment();
        const heading = document.createElement('span');
        heading.className = 'error';
        heading.textContent = "Please correct the following:";
        fragment.appendChild(heading);

        errors.forEach(err => {
            fragment.appendChild(document.createElement('br'));
            const span = document.createElement('span');
            span.className = 'error';
            span.textContent = `• ${err.message}`;
            fragment.appendChild(span);
        });

        elements.output.classList.add('terminal-fading');
        requestAnimationFrame(() => {
            elements.output.replaceChildren(fragment);
            elements.output.classList.remove('terminal-fading');
        });

        elements.copyButton.disabled = true;
        elements.downloadButton.disabled = true;
        state.rawCommands = "";
        showToast("Some information needs attention.", true);
    }

    // ==========================================
    // COMMAND BUILDERS
    // ==========================================
    function buildRemoteSetupLines(remote) {
        const quotedRemote = shellQuote(remote);
        if (currentOS().shell === "powershell") {
            return [
                "# Connect your project to a GitHub repository.",
                "git remote get-url origin *> $null",
                "if ($LASTEXITCODE -eq 0) {",
                `    git remote set-url origin ${quotedRemote}`,
                "} else {",
                `    git remote add origin ${quotedRemote}`,
                "}"
            ];
        }
        return [
            "# Connect your project to a GitHub repository.",
            "if git remote get-url origin >/dev/null 2>&1; then",
            `    git remote set-url origin ${quotedRemote}`,
            "else",
            `    git remote add origin ${quotedRemote}`,
            "fi"
        ];
    }

    function buildPushCurrentBranchLines() {
        return [
            "# Upload your committed code to GitHub.",
            "# Tip: If this fails with 'no commits', make sure your changes are committed first.",
            "# Tip: If this fails with 'no remote', connect your project to GitHub first.",
            "git push -u origin HEAD"
        ];
    }

    function buildCommitIfStagedLines(commitMessage) {
        if (currentOS().shell === "powershell") {
            return [
                "git diff --cached --quiet",
                "if ($LASTEXITCODE -eq 1) {",
                `    git commit -m ${shellQuote(commitMessage)}`,
                "} elseif ($LASTEXITCODE -eq 0) {",
                "    Write-Host 'No staged changes to commit.'",
                "} else {",
                "    Write-Error 'An error occurred while checking git diff.'",
                "    exit 1",
                "}"
            ];
        }
        return [
            "if git diff --cached --quiet; then",
            "    exit_code=0",
            "else",
            "    exit_code=$?",
            "fi",
            "if [ $exit_code -eq 1 ]; then",
            `    git commit -m ${shellQuote(commitMessage)}`,
            "elif [ $exit_code -eq 0 ]; then",
            "    echo 'No staged changes to commit.'",
            "else",
            "    echo 'Error checking git diff.' >&2",
            "    exit 1",
            "fi"
        ];
    }

    function buildStagingLines() {
        return [
            "# Prepare your changes for saving (make sure .gitignore is configured to exclude .env/secrets).",
            "git status",
            "git add ."
        ];
    }

    // Creates .gitignore with standard rules BEFORE staging (idempotent — won't duplicate rules).
    // This ensures .env, node_modules, dist, .DS_Store etc. are ignored by the time `git add .` runs.
    function buildGitignoreEnsureLines() {
        if (currentOS().shell === "powershell") {
            const psLines = GITIGNORE_RULES.map(rule => `    ${shellQuote(rule)}`);
            return [
                "# Create or update .gitignore to exclude secrets and unnecessary files.",
                "if (!(Test-Path '.gitignore')) {",
                "    try { New-Item -ItemType File -Path '.gitignore' -ErrorAction Stop | Out-Null }",
                "    catch { Write-Error \"Cannot create .gitignore: $_\"; exit 1 }",
                "}",
                "# Ensure a new line before adding new rules.",
                "if ((Get-Item '.gitignore').Length -gt 0) { Add-Content -Path '.gitignore' -Value '' -ErrorAction Stop }",
                "foreach ($rule in @(",
                ...psLines,
                ")) {",
                "    if ($rule -ne '' -and !(Select-String -LiteralPath '.gitignore' -Pattern ('^' + [regex]::Escape($rule) + '$') -Quiet)) {",
                "        Add-Content -Path '.gitignore' -Value $rule -ErrorAction Stop",
                "    }",
                "}",
                "# Ensure !.env.example is at the end (overrides any .env.* that may come before it)",
                "if (!(Select-String -LiteralPath '.gitignore' -Pattern '^!\.env\.example$' -Quiet)) { Add-Content -Path '.gitignore' -Value '!.env.example' -ErrorAction Stop }"
            ];
        }
        return [
            "# Create or update .gitignore to exclude secrets and unnecessary files.",
            "[ -f .gitignore ] || touch .gitignore || { echo 'Error: Cannot create .gitignore. Check permissions.' >&2; exit 1; }",
            "[ -w .gitignore ] || { echo 'Error: .gitignore is not writable. Check permissions.' >&2; exit 1; }",
            "# Ensure a new line before adding new rules.",
            "[ -s .gitignore ] && printf '\\n' >> .gitignore",
            "while IFS= read -r rule; do",
            '    if [ -n "$rule" ] && ! tr -d \'\\r\' < .gitignore | grep -qxF "$rule"; then',
            '        echo "$rule" >> .gitignore',
            "    fi",
            "done <<'EOF'",
            ...GITIGNORE_RULES,
            "EOF",
            "# Ensure !.env.example is at the end (overrides any .env.* that may come before it)",
            "grep -qxF '!.env.example' .gitignore || echo '!.env.example' >> .gitignore"
        ];
    }

    // Untrack secrets that were committed BEFORE .gitignore existed.
    // `git rm --cached` removes the file from git's index but keeps it on disk.
    // `--ignore-unmatch` exits 0 if the file isn't tracked (no need for || true).
    // Real errors (not a git repo, disk issues) surface naturally — do NOT suppress them.
    // NOTE: This only removes from the INDEX. If secrets were already PUSHED to GitHub,
    // they remain in commit history. Use `git filter-repo` or BFG Repo-Cleaner to purge
    // history, then rotate the leaked credentials immediately.
    function buildUntrackSecretsLines() {
        // Quote EVERY pattern so globs like *.pem are passed literally to git
        // (which does its own pathspec matching). Without quotes, zsh/macOS
        // would try to expand *.pem against the filesystem and fail with
        // "no match found" when no .pem files exist in the current directory.
        //
        // SECURITY: Always run git rm --cached regardless of HEAD status.
        // --ignore-unmatch safely exits 0 if nothing matches (no error on new repos).
        // The previous HEAD guard could skip untracking staged secrets on unborn branches.
        const patterns = SECRET_PATTERNS.map(p => shellQuote(p)).join(" ");
        if (currentOS().shell === "powershell") {
            return [
                "# Check that this is a Git repository.",
                "git rev-parse --is-inside-work-tree *> $null",
                "if ($LASTEXITCODE -ne 0) { Write-Error 'Not a git repository. Run this in a git project folder.'; exit 1 }",
                "# Stop tracking secret files that were committed or staged before .gitignore existed (they remain on your computer).",
                "# Skip safely if there are no secret files.",
                `git rm --cached --ignore-unmatch ${patterns}`,
                "# Stop if removing files fails.",
                "if ($LASTEXITCODE -ne 0) { Write-Error 'git rm failed. Aborting.'; exit 1 }",
                "# Force-add .env.example (even if ignored) so others know the variables.",
                "if (Test-Path '.env.example') { git add -f '.env.example' 2>$null }",
                "# Warning: Previously pushed secrets remain in Git history and may be exposed.",
                "# Remove exposed secrets from Git history using git filter-repo or BFG, then replace them.",
            ];
        }
        return [
            "# Check that this is a Git repository.",
            "git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo 'Error: Not a git repository. Run this in a git project folder.' >&2; exit 1; }",
            "# Stop tracking secret files that were committed or staged before .gitignore existed (they remain on your computer).",
            "# Skip safely if there are no secret files.",
            `git rm --cached --ignore-unmatch ${patterns}`,
            "# Stop if removing files fails.",
            "if [ $? -ne 0 ]; then echo 'Error: git rm failed. Aborting.' >&2; exit 1; fi",
            "# Force-add .env.example (even if ignored) so others know the variables.",
            "[ -f .env.example ] && git add -f '.env.example' 2>/dev/null",
            "# Warning: Previously pushed secrets remain in Git history and may be exposed.",
            "# Remove exposed secrets from Git history using git filter-repo or BFG, then replace them.",
        ];
    }

    function buildFullCommands(name, email, remote, commitMsg) {
        const lines = [
            "# Check if Git is installed.", "git --version", "",
            "# Set your name and email for Git.",
            "# Note: This applies to all Git projects on this computer.",
            "# For multiple GitHub accounts, remove --global to set different details for this project.",
            "#   git config user.name '...' && git config user.email '...'",
            `git config --global user.name ${shellQuote(name)}`,
            `git config --global user.email ${shellQuote(email)}`,
            "git config --global init.defaultBranch main",
            `git config --global credential.helper ${shellQuote(currentOS().credentialHelper)}`,
            "",
            "# Initialize Repository", "git init",
            ...buildGitignoreEnsureLines(),
            ...buildUntrackSecretsLines(),
            "",
            ...buildStagingLines(),
            ...buildCommitIfStagedLines(commitMsg),
            ""
        ];
        lines.push(...buildRemoteSetupLines(remote));
        lines.push("", "# Show your connected GitHub URL.", "git remote -v", "# Show your current branch name.", "git branch --show-current", ...buildPushCurrentBranchLines(), "git status");
        return lines;
    }

    function buildNewCommands(remote, commitMsg) {
        const lines = ["# Start a new Git repository in this folder.", "git init", ...buildGitignoreEnsureLines(), ...buildUntrackSecretsLines(), "", ...buildStagingLines(), ...buildCommitIfStagedLines(commitMsg), ""];
        lines.push(...buildRemoteSetupLines(remote));
        lines.push("", "# Show your connected GitHub URL.", "git remote -v", "# Show your current branch name.", "git branch --show-current", ...buildPushCurrentBranchLines(), "git status");
        return lines;
    }

    function buildUpdateCommands(commitMsg) {
        if (currentOS().shell === "powershell") {
            return [
                "# Check if this project is connected to GitHub (if not, use 'New Project' mode).",
                "git remote get-url origin",
                "if ($LASTEXITCODE -ne 0) { Write-Error \"No 'origin' remote found. Use 'New Project' mode to add it.\"; exit 1 }",
                "",
                "git status",
                ...buildGitignoreEnsureLines(),
                ...buildUntrackSecretsLines(),
                "",
                ...buildStagingLines(),
                ...buildCommitIfStagedLines(commitMsg),
                ...buildPushCurrentBranchLines(),
                "git status"
            ];
        }
        return [
            "# Check if this project is connected to GitHub (if not, use 'New Project' mode).",
            "if ! git remote get-url origin >/dev/null 2>&1; then echo \"Error: No 'origin' remote found. Use 'New Project' mode to add it.\" >&2; exit 1; fi",
            "",
            "git status",
            ...buildGitignoreEnsureLines(),
            ...buildUntrackSecretsLines(),
            "",
            ...buildStagingLines(),
            ...buildCommitIfStagedLines(commitMsg),
            ...buildPushCurrentBranchLines(),
            "git status"
        ];
    }

    function buildFixCommands() {
        return [
            "# Step 1: Check repository status and the latest commit.",
            "git status",
            "git log -1 --oneline",
            "",
            "# Step 2: Choose ONE recovery option (remove # to enable it).",
            "# Option A: Undo the last commit but keep your file changes locally.",
            "# git reset --soft HEAD~1",
            "",
            "# Option B: Change the last commit message (only if not pushed).",
            "# git commit --amend -m \"Your corrected message here\"",
            "",
            "# Option C: Safely force push (use only if needed).",
            "# git push --force-with-lease origin HEAD",
            "",
            "# Option D: Undo the last push safely (creates a new undo commit).",
            "# git revert HEAD && git push origin HEAD"
        ];
    }

    function buildIgnoreCommands() {
        if (currentOS().shell === "powershell") {
            const psLines = GITIGNORE_RULES.map(rule => `    ${shellQuote(rule)}`);
            return [
                "# Create or update .gitignore to exclude secrets and unnecessary files.",
                "if (!(Test-Path '.gitignore')) {",
                "    try { New-Item -ItemType File -Path '.gitignore' -ErrorAction Stop | Out-Null }",
                "    catch { Write-Error \"Cannot create .gitignore: $_\"; exit 1 }",
                "}",
                "# Ensure a new line before adding new rules.",
                "if ((Get-Item '.gitignore').Length -gt 0) { Add-Content -Path '.gitignore' -Value '' -ErrorAction Stop }",
                "foreach ($rule in @(",
                ...psLines,
                ")) {",
                "    if ($rule -ne '' -and !(Select-String -LiteralPath '.gitignore' -Pattern ('^' + [regex]::Escape($rule) + '$') -Quiet)) {",
                "        Add-Content -Path '.gitignore' -Value $rule -ErrorAction Stop",
                "    }",
                "}",
                "# Ensure !.env.example is at the end (overrides any .env.* that may come before it)",
                "if (!(Select-String -LiteralPath '.gitignore' -Pattern '^!\.env\.example$' -Quiet)) { Add-Content -Path '.gitignore' -Value '!.env.example' -ErrorAction Stop }",
                ...buildUntrackSecretsLines(),
                "git status --short",
                "git add .gitignore",
                "# Commit all prepared changes in one commit (including .gitignore and secret removals).",
                "# Note: Other staged changes will also be included in this commit.",
                "git diff --cached --quiet",
                "if ($LASTEXITCODE -eq 0) {",
                "    Write-Host 'No changes to commit.'",
                "} elseif ($LASTEXITCODE -eq 1) {",
                `    git commit -m ${shellQuote("chore: update gitignore and untrack secrets")}`,
                "} else {",
                "    Write-Error \"git diff failed with exit code $LASTEXITCODE\"",
                "    exit 1",
                "}"
            ];
        }
        return [
            "[ -f .gitignore ] || touch .gitignore || { echo 'Error: Cannot create .gitignore. Check permissions.' >&2; exit 1; }",
            "[ -w .gitignore ] || { echo 'Error: .gitignore is not writable. Check permissions.' >&2; exit 1; }",
            "# Ensure a new line before adding new rules.",
            "[ -s .gitignore ] && printf '\\n' >> .gitignore",
            "while IFS= read -r rule; do",
            '    if [ -n "$rule" ] && ! tr -d \'\\r\' < .gitignore | grep -qxF "$rule"; then',
            '        echo "$rule" >> .gitignore',
            "    fi",
            "done <<'EOF'",
            ...GITIGNORE_RULES,
            "EOF",
            "# Ensure !.env.example is at the end (overrides any .env.* that may come before it)",
            "grep -qxF '!.env.example' .gitignore || echo '!.env.example' >> .gitignore",
            ...buildUntrackSecretsLines(),
            "git status --short",
            "git add .gitignore",
            "# Commit all prepared changes in one commit (including .gitignore and secret removals).",
            "# Note: Other staged changes will also be included in this commit.",
            "if git diff --cached --quiet; then",
            "    exit_code=0",
            "else",
            "    exit_code=$?",
            "fi",
            "if [ $exit_code -eq 0 ]; then",
            "    echo 'No changes to commit.'",
            "elif [ $exit_code -eq 1 ]; then",
            `    git commit -m ${shellQuote("chore: update gitignore and untrack secrets")}`,
            "else",
            "    echo \"git diff failed with exit code $exit_code\" >&2",
            "    exit 1",
            "fi"
        ];
    }

    // ==========================================
    // MODE UI (show/hide cards)
    // ==========================================
    function renderModeUI() {
        elements.setupModeRadios.forEach(radio => {
            if (radio.checked) state.currentMode = radio.value;
        });

        elements.radioCards.forEach(card => {
            const radio = card.querySelector('input[type="radio"]');
            card.classList.toggle('checked', Boolean(radio && radio.checked));
        });

        const showIdentity = state.currentMode === MODES.FULL;
        const showRepository = state.currentMode === MODES.FULL || state.currentMode === MODES.NEW;
        const showCommit = [MODES.FULL, MODES.NEW, MODES.UPDATE].includes(state.currentMode);

        elements.step1Card.classList.toggle('hidden-step', !showIdentity);
        elements.step1Card.setAttribute('aria-hidden', String(!showIdentity));

        elements.step2Card.classList.toggle('hidden-step', !showRepository);
        elements.step2Card.setAttribute('aria-hidden', String(!showRepository));

        elements.commitCard.classList.toggle('hidden-step', !showCommit);
        elements.commitCard.setAttribute('aria-hidden', String(!showCommit));

        elements.step3Card.classList.toggle('hidden-step', !showRepository);
        elements.step3Card.setAttribute('aria-hidden', String(!showRepository));

        updateURLPlaceholder();
    }

    function updateURLPlaceholder() {
        const owner = elements.githubUser.value.trim();
        const repo = elements.repository.value.trim();
        const customURL = elements.repoURL.value.trim();
        const generated = (owner && repo) ? `https://github.com/${owner}/${repo}.git` : "";
        elements.repoURL.placeholder = generated || "https://github.com/username/My-Project.git";
        if (elements.urlPreview) {
            if (customURL) {
                elements.urlPreview.textContent = "Custom URL will be used (overrides username + repo)";
            } else if (generated) {
                elements.urlPreview.textContent = `Will use: ${generated}`;
            } else {
                elements.urlPreview.textContent = "";
            }
        }
    }

    // ==========================================
    // CORE: GENERATE
    // ==========================================
    function generateCommands(isRefresh = false) {
        clearInvalidStates();
        const validation = validateInputs();
        if (validation.errors.length > 0) {
            validation.errors.forEach(err => setInvalidState(err.element));
            renderError(validation.errors);
            validation.errors[0].element.focus();
            return;
        }

        const customCommit = elements.commitMessage.value.trim();
        const commitMsg = customCommit || (state.currentMode === MODES.UPDATE ? "feat: update project" : "feat: initial project setup");

        const builders = {
            [MODES.FULL]: () => buildFullCommands(elements.username.value.trim(), elements.email.value.trim(), validation.remote, commitMsg),
            [MODES.NEW]: () => buildNewCommands(validation.remote, commitMsg),
            [MODES.UPDATE]: () => buildUpdateCommands(commitMsg),
            [MODES.FIX]: buildFixCommands,
            [MODES.IGNORE]: buildIgnoreCommands
        };

        try {
            const cmdArray = builders[state.currentMode]();
            state.rawCommands = cmdArray.join('\n').trim();
            renderOutput(cmdArray);
            elements.copyButton.disabled = false;
            elements.downloadButton.disabled = false;

            // Persist mode + OS for next visit
            storage.set(STORAGE_KEYS.MODE, state.currentMode);
            storage.set(STORAGE_KEYS.OS, state.selectedOS);

            // Add to history + bump counter
            if (!isRefresh) {
                addToHistory({
                    mode: state.currentMode,
                    os: state.selectedOS,
                    preview: state.rawCommands.split('\n').filter(l => l && !l.startsWith('#')).slice(0, 2).join(' | '),
                    commands: state.rawCommands,
                    timestamp: Date.now()
                });
                state.cmdCounter += 1;
                elements.cmdCount.textContent = String(state.cmdCounter);
                showToast("Commands generated successfully!");
            }
        } catch (err) {
            console.error("Generation Error:", err);
            showToast("An unexpected error occurred.", true);
        }
    }

    // ==========================================
    // COPY
    // ==========================================
    async function copyCommands() {
        if (!state.rawCommands) {
            showToast("Nothing to copy!", true);
            return;
        }

        // Strategy 1: Modern Clipboard API (requires secure context / HTTPS)
        if (navigator.clipboard && window.isSecureContext) {
            try {
                await navigator.clipboard.writeText(state.rawCommands);
                showToast("Clean git commands copied successfully.");
                return;
            } catch (_err) {
                // Fall through to legacy fallback
            }
        }

        // Strategy 2: Legacy execCommand fallback (deprecated but widely supported)
        let textarea = null;
        try {
            textarea = document.createElement("textarea");
            textarea.value = state.rawCommands;
            textarea.className = "clipboard-fallback";
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            const success = document.execCommand("copy");
            if (success) {
                showToast("Clean git commands copied successfully.");
                return;
            }
        } catch (_err) {
            // Fall through to manual copy
        } finally {
            if (textarea && textarea.parentNode) {
                textarea.parentNode.removeChild(textarea);
            }
        }

        // Strategy 3: Manual copy — show selectable text if both APIs fail
        showManualCopyModal(state.rawCommands);
    }

    // Manual copy modal — shown when clipboard APIs are unavailable
    // Includes focus trap (Tab/Shift+Tab cycle within modal) + Escape to close
    function showManualCopyModal(text) {
        const existing = document.getElementById("copy-modal");
        if (existing) {
            if (existing._trapKeydown) {
                document.removeEventListener("keydown", existing._trapKeydown);
            }
            existing.remove();
        }

        const overlay = document.createElement("div");
        overlay.id = "copy-modal";
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-modal", "true");
        overlay.setAttribute("aria-label", "Copy commands manually");

        const box = document.createElement("div");
        box.className = "copy-modal-box";

        const heading = document.createElement("p");
        heading.textContent = "Clipboard unavailable. Select the text below and press Ctrl+C:";
        box.appendChild(heading);

        const ta = document.createElement("textarea");
        ta.value = text;
        ta.readOnly = true;
        ta.className = "copy-modal-textarea";
        ta.setAttribute("aria-label", "Commands to copy");
        box.appendChild(ta);

        const closeBtn = document.createElement("button");
        closeBtn.type = "button";
        closeBtn.className = "btn btn-secondary";
        closeBtn.textContent = "Close";
        box.appendChild(closeBtn);

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        const focusable = [ta, closeBtn];

        function closeModal() {
            document.removeEventListener("keydown", trapKeydown);
            overlay.remove();
            elements.copyButton.focus();
        }

        function trapKeydown(e) {
            if (e.key === "Escape") {
                e.preventDefault();
                closeModal();
            } else if (e.key === "Tab") {
                e.preventDefault();
                // FIX: Dynamically find the current focus instead of hardcoded index
                let currentIndex = focusable.indexOf(document.activeElement);
                if (currentIndex === -1) currentIndex = 0; // Fallback
                
                if (e.shiftKey) {
                    currentIndex = (currentIndex - 1 + focusable.length) % focusable.length;
                } else {
                    currentIndex = (currentIndex + 1) % focusable.length;
                }
                focusable[currentIndex].focus();
            }
        }

        closeBtn.addEventListener("click", closeModal);
        // Backdrop click closes modal (standard UX pattern)
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) closeModal();
        });
        document.addEventListener("keydown", trapKeydown);
        overlay._trapKeydown = trapKeydown;
        ta.focus();
        ta.select();
    }

    // ==========================================
    // DOWNLOAD AS SCRIPT
    // ==========================================
    function downloadScript() {
        if (!state.rawCommands) {
            showToast("Generate commands first.", true);
            return;
        }
        const os = currentOS();
        const ext = os.scriptExtension;
        const header = os.scriptHeader;
        const content = `${header}\n${state.rawCommands}\n`;

        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        const safeMode = state.currentMode.replace(/[^a-z0-9]/gi, "_");
        a.href = url;
        a.download = `git-setup-${safeMode}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // Release the object URL after a tick to ensure download started
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        showToast(`Script downloaded: git-setup-${safeMode}.${ext}`);
    }

    // ==========================================
    // HISTORY
    // ==========================================
    function addToHistory(entry) {
        state.history.unshift(entry);
        if (state.history.length > MAX_HISTORY) {
            state.history = state.history.slice(0, MAX_HISTORY);
        }
        storage.set(STORAGE_KEYS.HISTORY, state.history);
        updateHistoryButton();
    }

    function updateHistoryButton() {
        const count = state.history.length;
        elements.historyButton.disabled = count === 0;
        elements.historyButton.setAttribute('aria-expanded', String(!elements.historyList.hidden));
    }

    function toggleHistory() {
        const list = elements.historyList;
        const willShow = list.hidden;
        if (willShow) renderHistoryList();
        list.hidden = !willShow;
        elements.historyButton.setAttribute('aria-expanded', String(willShow));
    }

    function renderHistoryList() {
        const list = elements.historyList;
        list.innerHTML = "";
        if (state.history.length === 0) {
            const li = document.createElement("li");
            li.className = "hist-empty";
            li.textContent = "No history yet. Generate commands to start building history.";
            list.appendChild(li);
            return;
        }

        // "Clear All" header row
        const clearRow = document.createElement("li");
        clearRow.className = "hist-clear-row";
        const clearLabel = document.createElement("span");
        clearLabel.className = "hist-clear-label";
        clearLabel.textContent = `${state.history.length} entr${state.history.length === 1 ? "y" : "ies"} stored`;
        const clearBtn = document.createElement("button");
        clearBtn.type = "button";
        clearBtn.className = "hist-clear-btn";
        clearBtn.textContent = "Clear All";
        clearBtn.setAttribute("aria-label", "Delete all history entries");
        clearBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            clearAllHistory();
        });
        clearRow.appendChild(clearLabel);
        clearRow.appendChild(clearBtn);
        list.appendChild(clearRow);

        state.history.forEach((entry, idx) => {
            const li = document.createElement("li");
            li.setAttribute("role", "listitem");
            li.tabIndex = 0;

            const meta = document.createElement("span");
            meta.className = "hist-meta";
            const modeLabel = entry.mode.toUpperCase();
            const osLabel = OS_CONFIG[entry.os]?.label || entry.os;
            const time = new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            meta.textContent = `${modeLabel} · ${osLabel} · ${time}`;

            const preview = document.createElement("span");
            preview.className = "hist-preview";
            preview.textContent = entry.preview || "(no preview)";

            // Individual delete button
            const delBtn = document.createElement("button");
            delBtn.type = "button";
            delBtn.className = "hist-del-btn";
            delBtn.setAttribute("aria-label", `Delete entry ${idx + 1}: ${modeLabel} ${osLabel}`);
            delBtn.title = "Delete this entry";
            delBtn.innerHTML = "&times;";
            delBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                deleteHistoryEntry(idx);
            });

            li.appendChild(meta);
            li.appendChild(preview);
            li.appendChild(delBtn);

            const restore = () => {
                // Restore mode + OS + commands
                selectMode(entry.mode);
                selectOS(entry.os);
                // Persist restored mode + OS to localStorage
                storage.set(STORAGE_KEYS.MODE, entry.mode);
                storage.set(STORAGE_KEYS.OS, entry.os);
                state.rawCommands = entry.commands;
                renderOutput(entry.commands.split('\n'));
                elements.copyButton.disabled = false;
                elements.downloadButton.disabled = false;
                list.hidden = true;
                elements.historyButton.setAttribute('aria-expanded', 'false');
                showToast("Restored from history.");
            };
            li.addEventListener("click", restore);
            li.addEventListener("keydown", (e) => {
                // Only handle keyboard events when the li itself is focused,
                // not when a child element (like the delete button) is focused.
                if (e.target !== li) return;
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    restore();
                } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
                    e.preventDefault();
                    const next = li.nextElementSibling;
                    if (next && next.getAttribute("role") === "listitem") {
                        next.focus();
                    } else {
                        // Wrap to first entry
                        const first = list.querySelector('li[role="listitem"]');
                        if (first) first.focus();
                    }
                } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
                    e.preventDefault();
                    const prev = li.previousElementSibling;
                    if (prev && prev.getAttribute("role") === "listitem") {
                        prev.focus();
                    } else {
                        // At first entry — move focus to history button
                        elements.historyButton.focus();
                    }
                } else if (e.key === "Escape") {
                    e.preventDefault();
                    list.hidden = true;
                    elements.historyButton.setAttribute('aria-expanded', 'false');
                    elements.historyButton.focus();
                } else if (e.key === "Delete" || e.key === "Backspace") {
                    e.preventDefault();
                    deleteHistoryEntry(idx);
                }
            });
            list.appendChild(li);
        });
    }

    // Delete a single history entry by index
    function deleteHistoryEntry(idx) {
        if (idx < 0 || idx >= state.history.length) return;
        const entry = state.history[idx];
        const modeLabel = entry.mode.toUpperCase();
        const osLabel = OS_CONFIG[entry.os]?.label || entry.os;
        state.history.splice(idx, 1);
        storage.set(STORAGE_KEYS.HISTORY, state.history);
        renderHistoryList();
        updateHistoryButton();
        
        // If list is now empty, show the empty state
        if (state.history.length === 0) {
            elements.historyList.hidden = true;
            elements.historyButton.setAttribute('aria-expanded', 'false');
            elements.historyButton.focus();
        } else if (!elements.historyList.hidden) {
            // FOCUS FIX: Move focus to the next item instead of losing it to the body
            const items = elements.historyList.querySelectorAll('li[role="listitem"]');
            const nextFocus = items[idx] || items[idx - 1] || items[0];
            if (nextFocus) nextFocus.focus();
        }
        showToast(`Deleted: ${modeLabel} · ${osLabel}`);
    }

    // Delete all history entries
    function clearAllHistory() {
        if (state.history.length === 0) return;
        const count = state.history.length;
        state.history = [];
        storage.set(STORAGE_KEYS.HISTORY, state.history);
        renderHistoryList();
        updateHistoryButton();
        elements.historyList.hidden = true;
        elements.historyButton.setAttribute('aria-expanded', 'false');
        elements.historyButton.focus();
        showToast(`Cleared ${count} entr${count === 1 ? "y" : "ies"} from history.`);
    }

    function selectMode(modeValue) {
        const radio = document.querySelector(`input[name="setupMode"][value="${modeValue}"]`);
        if (radio) {
            radio.checked = true;
            renderModeUI();
        }
    }

    function selectOS(osValue) {
        if (!OS_CONFIG[osValue]) return;
        elements.osButtons.forEach(b => {
            const selected = (b.dataset.os === osValue);
            b.classList.toggle('active', selected);
            b.setAttribute('aria-pressed', String(selected));
        });
        state.selectedOS = osValue;
        elements.terminalTitle.textContent = OS_CONFIG[osValue].title;
        if (elements.terminalHeader) {
            elements.terminalHeader.classList.remove('os-win', 'os-mac', 'os-linux');
            elements.terminalHeader.classList.add(`os-${osValue}`);
        }
    }

    // ==========================================
    // RESET
    // ==========================================
    function resetForm() {
        [elements.username, elements.email, elements.githubUser, elements.repository, elements.repoURL, elements.commitMessage].forEach(el => {
            el.value = "";
            el.removeAttribute('aria-invalid');
        });
        elements.fullRadio.checked = true;
        renderModeUI();
        selectOS("win");
        // Persist the reset to defaults so reload doesn't revert
        storage.set(STORAGE_KEYS.MODE, MODES.FULL);
        storage.set(STORAGE_KEYS.OS, "win");
        state.rawCommands = "";
        elements.copyButton.disabled = true;
        elements.downloadButton.disabled = true;
        renderPlaceholder();
        showToast("Form cleared successfully!");
        elements.username.focus();
    }

    // ==========================================
    // KEYBOARD SHORTCUTS
    // ==========================================
    function handleGlobalKeydown(e) {
        const ctrl = e.ctrlKey || e.metaKey;
        // Ctrl/Cmd + Enter → Generate
        if (ctrl && e.key === "Enter") {
            e.preventDefault();
            generateCommands(false);
            return;
        }
        // Ctrl/Cmd + Shift + C → Copy
        if (ctrl && e.shiftKey && (e.key === "C" || e.key === "c")) {
            e.preventDefault();
            if (!elements.copyButton.disabled) copyCommands();
            return;
        }
        // Ctrl/Cmd + Shift + D → Download
        if (ctrl && e.shiftKey && (e.key === "D" || e.key === "d")) {
            e.preventDefault();
            if (!elements.downloadButton.disabled) downloadScript();
            return;
        }
    }

    // ==========================================
    // OFFLINE DETECTION
    // ==========================================
    function updateOnlineStatus() {
        if (!elements.offlineIndicator) return;
        const isOnline = navigator.onLine;
        elements.offlineIndicator.hidden = isOnline;
        if (!isOnline) {
            showToast("You are offline. The tool still works.", true);
        }
    }

    // ==========================================
    // EVENT LISTENERS
    // ==========================================
    function initEventListeners() {
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const isDesktop = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

        if (!prefersReducedMotion && isDesktop) {
            const cursorDot = document.getElementById("cursor-dot");
            const cursorRing = document.getElementById("cursor-ring");

            if (cursorDot && cursorRing) {
                let mouseX = window.innerWidth / 2, mouseY = window.innerHeight / 2;
                let ringX = mouseX, ringY = mouseY;

                cursorDot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
                cursorRing.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;

                document.addEventListener("pointermove", (e) => {
                    mouseX = e.clientX;
                    mouseY = e.clientY;

                    const isHoverable = e.target.closest('a, button, .radio-card, .os-btn');
                    const isInput = e.target.closest('input, textarea');

                    if (isHoverable) {
                        cursorRing.style.width = '54px';
                        cursorRing.style.height = '54px';
                        cursorRing.style.backgroundColor = 'rgba(88, 166, 255, 0.15)'; 
                        cursorRing.style.borderColor = 'transparent';
                        cursorRing.style.opacity = '1';
                        cursorDot.style.opacity = '0'; 
                    } else if (isInput) {
                        cursorRing.style.opacity = '0';
                        cursorDot.style.opacity = '0';
                    } else {
                        cursorRing.style.width = '36px';
                        cursorRing.style.height = '36px';
                        cursorRing.style.backgroundColor = 'transparent';
                        cursorRing.style.borderColor = 'rgba(88, 166, 255, 0.7)';
                        cursorRing.style.opacity = '1';
                        cursorDot.style.opacity = '1';
                    }
                });

                function animateCursor() {
                    cursorDot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
                    
                    ringX += (mouseX - ringX) * 0.2;
                    ringY += (mouseY - ringY) * 0.2;
                    cursorRing.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;

                    state.animationId = requestAnimationFrame(animateCursor);
                }

                animateCursor();

                document.addEventListener("visibilitychange", () => {
                    if (document.hidden) {
                        cancelAnimationFrame(state.animationId);
                    } else {
                        animateCursor();
                    }
                });
            }
        }

        // Mode radio change
        elements.setupModeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                renderModeUI();
                storage.set(STORAGE_KEYS.MODE, radio.value);
                if (!elements.copyButton.disabled) generateCommands(true);
            });
        });

        // OS button click
        elements.osButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                selectOS(btn.dataset.os);
                storage.set(STORAGE_KEYS.OS, btn.dataset.os);
                if (!elements.copyButton.disabled) generateCommands(true);
                else renderPlaceholder();
            });
        });

        // Input listeners
        elements.githubUser.addEventListener('input', updateURLPlaceholder);
        elements.repository.addEventListener('input', updateURLPlaceholder);
        elements.repoURL.addEventListener('input', updateURLPlaceholder);

        // Real-time validation on blur (non-intrusive)
        [elements.username, elements.email, elements.githubUser, elements.repository, elements.repoURL, elements.commitMessage].forEach(input => {
            input.addEventListener('blur', () => validateFieldLive(input));
            input.addEventListener('input', () => {
                if (input.hasAttribute('aria-invalid')) {
                    // Re-validate on input if previously invalid
                    validateFieldLive(input);
                }
            });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
                    e.preventDefault();
                    generateCommands(false);
                }
            });
        });

        // Button clicks
        elements.generateButton.addEventListener("click", () => generateCommands(false));
        elements.copyButton.addEventListener("click", copyCommands);
        elements.downloadButton.addEventListener("click", downloadScript);
        elements.clearButton.addEventListener("click", resetForm);
        elements.historyButton.addEventListener("click", toggleHistory);

        // Global keyboard shortcuts
        document.addEventListener("keydown", handleGlobalKeydown);

        // Online/offline
        window.addEventListener("online", updateOnlineStatus);
        window.addEventListener("offline", updateOnlineStatus);

        // Click outside history list to close
        document.addEventListener("click", (e) => {
            if (elements.historyList.hidden) return;
            if (!elements.historyList.contains(e.target) && !elements.historyButton.contains(e.target)) {
                elements.historyList.hidden = true;
                elements.historyButton.setAttribute('aria-expanded', 'false');
            }
        });

        // Cleanup on unload
        window.addEventListener('beforeunload', () => {
            window.clearTimeout(state.toastTimer);
            if (state.animationId) cancelAnimationFrame(state.animationId);
        });
    }

    // ==========================================
    // INIT (restore persisted state)
    // ==========================================
    function init() {
        initEventListeners();

        // Restore OS preference
        const savedOS = storage.get(STORAGE_KEYS.OS, null);
        if (savedOS && OS_CONFIG[savedOS]) {
            selectOS(savedOS);
        }

        // Restore mode preference
        const savedMode = storage.get(STORAGE_KEYS.MODE, null);
        if (savedMode && Object.values(MODES).includes(savedMode)) {
            selectMode(savedMode);
        } else {
            renderModeUI();
        }

        // Restore history (validate schema — corrupt entries are filtered out)
        const savedHistory = storage.get(STORAGE_KEYS.HISTORY, []);
        state.history = sanitizeHistory(savedHistory);
        updateHistoryButton();

        // Initial render
        updateURLPlaceholder();
        renderPlaceholder();

        // Online status
        updateOnlineStatus();
    }

    return Object.freeze({ init, generateCommands, copyCommands, downloadScript, resetForm });
})();

document.addEventListener("DOMContentLoaded", () => {
    try {
        GitAssistantApp.init();
    } catch (err) {
        console.error("Initialization Error:", err);
    }
});
