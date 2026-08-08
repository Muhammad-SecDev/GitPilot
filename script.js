"use strict";

// ======================================================
// Git First-Time Setup Assistant (Enterprise Edition)
// IIFE Architecture for Global Scope Isolation
// ======================================================

const GitAssistantApp = (() => {
    const MODES = {
        FULL: "full",
        NEW: "new",
        UPDATE: "update",
        FIX: "fix",
        IGNORE: "ignore"
    };

    const OS_CONFIG = {
        win: { prompt: "PS C:\\Project>", helper: "manager", label: "Windows", title: "PowerShell" },
        mac: { prompt: "user@macbook project %", helper: "osxkeychain", label: "macOS", title: "Terminal - zsh" },
        linux: { prompt: "user@linux:~/project$", helper: "cache", label: "Linux", title: "Terminal - bash" }
    };

    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const GITHUB_USER_REGEX = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;
    const REPO_REGEX = /^[a-z\d_.-]+$/i;
    const URL_REGEX = /^https:\/\/github\.com\/[A-Za-z0-9-]+\/[A-Za-z0-9._-]+(?:\.git)?\/?$/;

    function must(id) {
        const el = document.getElementById(id);
        if (!el) throw new Error(`Missing element: ${id}`);
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
        clearButton: must("clearButton"),
        toast: must("toast"),
        cursorGlow: must("cursor-glow"),
        terminalTitle: must("terminal-title"),
        terminalHeader: document.querySelector(".terminal-header"),
        osButtons: document.querySelectorAll(".os-btn"),
        step1Card: must("step1-card"),
        step2Card: must("step2-card"),
        step3Card: must("step3-card"),
        setupModeRadios: document.querySelectorAll('input[name="setupMode"]'),
        radioCards: document.querySelectorAll('.radio-card'),
        fullRadio: document.querySelector('input[name="setupMode"][value="full"]')
    };

    const state = {
        selectedOS: "win",
        rawCommands: "",
        currentMode: MODES.FULL,
        toastTimer: null,
        animationId: null
    };

    // ==========================================
    // HELPERS
    // ==========================================
    function getPrompt() { return OS_CONFIG[state.selectedOS].prompt; }
    function getCredentialHelper() { return OS_CONFIG[state.selectedOS].helper; }
    function getOSLabel() { return OS_CONFIG[state.selectedOS].label; }

    function showToast(message, isError = false) {
        clearTimeout(state.toastTimer);
        elements.toast.textContent = message;
        elements.toast.className = "toast show" + (isError ? " error" : "");
        elements.toast.setAttribute('role', isError ? 'alert' : 'status');
        state.toastTimer = setTimeout(() => { elements.toast.className = "toast"; }, 3000);
    }

    function buildRemoteURL(github, repo) {
        if (!GITHUB_USER_REGEX.test(github)) return { error: "Invalid GitHub username!" };
        if (!REPO_REGEX.test(repo)) return { error: "Invalid repo name!" };
        return { url: `https://github.com/${github}/${repo}.git` };
    }

    function isValidGitHubURL(urlString) { return URL_REGEX.test(urlString); }

    function updateURLPlaceholder() {
        const github = elements.githubUser.value.trim();
        const repo = elements.repository.value.trim();
        elements.repoURL.placeholder = (github && repo) 
            ? `https://github.com/${github}/${repo}.git` 
            : "https://github.com/username/My-Project.git";
    }

    // ==========================================
    // COMMAND BUILDERS
    // ==========================================
    function buildFullCommands(name, mail, remote, commitMsg) {
        const credHelper = getCredentialHelper();
        const osLabel = getOSLabel();
        return [
            "# Check Git Installation", "git --version", "",
            "# Configure Username", `git config --global user.name "${name}"`, "",
            "# Configure Email", `git config --global user.email "${mail}"`, "",
            "# Default Branch", "git config --global init.defaultBranch main", "",
            `# Credential Manager (${osLabel})`, `git config --global credential.helper ${credHelper}`, "",
            "# Optional (requires VS Code CLI)", 'git config --global core.editor "code --wait"', "",
            "# Verify Configuration", "git config --global --get user.name", "git config --global --get user.email", "",
            "# Initialize Local Repository (Run this if you haven't already)", "git init", "",
            "# Check Status", "git status", "",
            "# Stage all changes (new, modified, deleted)", "git add -A", "",
            "# Create Commit", `git commit -m "${commitMsg}"`, "",
            "# Add Remote Repository", `git remote add origin "${remote}"`, "",
            "# If remote already exists, run this instead:", `git remote set-url origin "${remote}"`, "",
            "git remote -v", "",
            "# Rename branch to main (if it's master)", "git branch -M main", "",
            "# Push Project to GitHub", "git push -u origin main", "",
            "# Verify final status (Working tree clean)", "git status", ""
        ];
    }

    function buildNewCommands(remote, commitMsg) {
        return [
            "# Initialize Local Repository (Run this if you haven't already)", "git init", "",
            "# Check Status", "git status", "",
            "# Stage all changes (new, modified, deleted)", "git add -A", "",
            "# Create Commit", `git commit -m "${commitMsg}"`, "",
            "# Add Remote Repository", `git remote add origin "${remote}"`, "",
            "# If remote already exists, run this instead:", `git remote set-url origin "${remote}"`, "",
            "git remote -v", "",
            "# Rename branch to main (if it's master)", "git branch -M main", "",
            "# Push Project to GitHub", "git push -u origin main", "",
            "# Verify final status (Working tree clean)", "git status", ""
        ];
    }

    function buildUpdateCommands(commitMsg) {
        return [
            "# Check Status", "git status", "",
            "# Stage all changes (new, modified, deleted)", "git add -A", "",
            "# Create Commit", `git commit -m "${commitMsg}"`, "",
            "# Push Updates to GitHub", "git push", "",
            "# Verify final status (Working tree clean)", "git status", ""
        ];
    }

    function buildFixCommands() {
        return [
            "# Fix Git Mistakes (Recovery)", "", "",
            "# 1. Change your LAST commit message (Before pushing to GitHub)", 'git commit --amend -m "Your new correct message"', "",
            "# 2. If you already pushed the wrong commit, update GitHub safely", "# DANGER: Only run this if the amended commit has already been pushed.", "# Never use on shared branches unless you understand the impact.", "git push --force-with-lease", "",
            "# 3. Remove only the latest commit but keep your file changes (Safe)", "git reset --soft HEAD~1", "",
            "# 4. Remove the latest commit and DELETE all file changes (Dangerous)", "git reset --hard HEAD~1", ""
        ];
    }

    function buildIgnoreCommands() {
        return [
            '# 1. Create a new file named ".gitignore" in your project root.', "", "",
            "# 2. Paste the following rules inside that .gitignore file:", "", "",
            "# ----- .gitignore Content Start -----", "",
            "# Dependencies", "node_modules/", "",
            "# Environment Variables", ".env", ".env.*", "",
            "# Build files", "dist/", "build/", "coverage/", "",
            "# OS generated files", ".DS_Store", "Thumbs.db", "",
            "# Editor directories and files", ".vscode/", ".idea/", "*.log", "",
            "# ----- .gitignore Content End -----", "", "",
            "# 3. Add and commit the .gitignore file", "git add .gitignore", 'git commit -m "Add .gitignore"', "",
            "# 4. Verify it's working", "git status", ""
        ];
    }

    // ==========================================
    // UI & RENDERING (Safe DOM Manipulation)
    // ==========================================
    function renderOutput(cmds) {
        const prompt = getPrompt();
        const fragment = document.createDocumentFragment();

        cmds.forEach(line => {
            if (line.trim() === '') {
                fragment.appendChild(document.createElement('br'));
            } else if (line.startsWith('#')) {
                const span = document.createElement('span');
                span.className = 'comment';
                span.textContent = line;
                fragment.appendChild(span);
                fragment.appendChild(document.createElement('br'));
            } else if (line.startsWith('git ')) {
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
                span.textContent = line;
                fragment.appendChild(span);
                fragment.appendChild(document.createElement('br'));
            }
        });

        elements.output.style.opacity = 0;
        requestAnimationFrame(() => {
            elements.output.replaceChildren(fragment);
            elements.output.style.opacity = 1;
        });
    }

    function renderPlaceholder() {
        const fragment = document.createDocumentFragment();
        const promptSpan = document.createElement('span');
        promptSpan.className = 'prompt';
        promptSpan.textContent = `${getPrompt()} `;
        
        const textSpan = document.createElement('span');
        textSpan.textContent = 'Commands will appear here after clicking "Generate"...';
        
        fragment.appendChild(promptSpan);
        fragment.appendChild(textSpan);
        elements.output.replaceChildren(fragment);
    }

    function renderError(msg) {
        const fragment = document.createDocumentFragment();
        const promptSpan = document.createElement('span');
        promptSpan.className = 'prompt';
        promptSpan.textContent = `${getPrompt()} `;
        
        const errorSpan = document.createElement('span');
        errorSpan.className = 'error';
        errorSpan.textContent = `Error: ${msg}`;
        
        fragment.appendChild(promptSpan);
        fragment.appendChild(errorSpan);
        elements.output.replaceChildren(fragment);
        showToast(msg.split('\n')[0], true); 
    }

    function clearInvalidStates() {
        [elements.username, elements.email, elements.githubUser, elements.repository, elements.repoURL, elements.commitMessage].forEach(el => {
            el.removeAttribute('aria-invalid');
        });
    }

    function setInvalidState(el) { el.setAttribute('aria-invalid', 'true'); }

    function updateModeUI() {
        elements.setupModeRadios.forEach(radio => {
            if (radio.checked) state.currentMode = radio.value;
        });

        elements.radioCards.forEach(card => {
            const radio = card.querySelector('input[type="radio"]');
            if (radio && radio.checked) {
                card.classList.add('checked');
            } else {
                card.classList.remove('checked');
            }
        });

        elements.step1Card.classList.add('hidden-step');
        elements.step1Card.setAttribute('aria-hidden', 'true');
        elements.step2Card.classList.add('hidden-step');
        elements.step2Card.setAttribute('aria-hidden', 'true');
        elements.step3Card.classList.add('hidden-step');
        elements.step3Card.setAttribute('aria-hidden', 'true');

        if (state.currentMode === MODES.FULL) {
            elements.step1Card.classList.remove('hidden-step');
            elements.step1Card.setAttribute('aria-hidden', 'false');
            elements.step2Card.classList.remove('hidden-step');
            elements.step2Card.setAttribute('aria-hidden', 'false');
            elements.step3Card.classList.remove('hidden-step');
            elements.step3Card.setAttribute('aria-hidden', 'false');
        } else if (state.currentMode === MODES.NEW) {
            elements.step2Card.classList.remove('hidden-step');
            elements.step2Card.setAttribute('aria-hidden', 'false');
        }
    }

    // ==========================================
    // CORE LOGIC (With Advanced Validation)
    // ==========================================
    function generateCommands(isToggleUpdate = false) {
        try {
            clearInvalidStates();
            
            const name = elements.username.value.trim();
            const mail = elements.email.value.trim();
            const github = elements.githubUser.value.trim();
            const repo = elements.repository.value.trim();
            let remote = elements.repoURL.value.trim();
            const customCommit = elements.commitMessage.value.trim();
            
            const commitMsg = (customCommit || (state.currentMode === MODES.UPDATE ? "feat: update project" : "feat: initial project setup"))
                .replace(/[\r\n]/g, " ")
                .replace(/"/g, '\\"');

            let cmdArray = [];
            let missingFields = [];
            let invalidElements = [];

            if (state.currentMode === MODES.FULL) {
                if (!name) {
                    missingFields.push("Git Username");
                    invalidElements.push(elements.username);
                }
                if (!mail) {
                    missingFields.push("Git Email");
                    invalidElements.push(elements.email);
                } else if (!EMAIL_REGEX.test(mail)) {
                    missingFields.push("Valid Git Email");
                    invalidElements.push(elements.email);
                }
            }

            if (state.currentMode === MODES.FULL || state.currentMode === MODES.NEW) {
                if (remote === "") {
                    if (!github) {
                        missingFields.push("GitHub Username");
                        invalidElements.push(elements.githubUser);
                    }
                    if (!repo) {
                        missingFields.push("Repository Name");
                        invalidElements.push(elements.repository);
                    }
                    if (github && repo) {
                        const result = buildRemoteURL(github, repo);
                        if (result.error) {
                            missingFields.push(result.error);
                            invalidElements.push(result.error.includes("username") ? elements.githubUser : elements.repository);
                        } else {
                            remote = result.url;
                        }
                    }
                } else if (!isValidGitHubURL(remote)) {
                    missingFields.push("Valid GitHub URL");
                    invalidElements.push(elements.repoURL);
                }
            }
            
            if (repo && repo.length > 100 && !missingFields.includes("Repository Name")) {
                missingFields.push("Repository Name (max 100 chars)");
                invalidElements.push(elements.repository);
            }

            if (missingFields.length > 0) {
                const errorTitle = "Missing required info:";
                const errorDetails = missingFields.join(", ");
                renderError(`${errorTitle}\n${errorDetails}`);
                invalidElements.forEach(el => setInvalidState(el));
                if (invalidElements.length > 0) invalidElements[0].focus();
                return;
            }

            const builders = {
                [MODES.FULL]: () => buildFullCommands(name, mail, remote, commitMsg),
                [MODES.NEW]: () => buildNewCommands(remote, commitMsg),
                [MODES.UPDATE]: () => buildUpdateCommands(commitMsg),
                [MODES.FIX]: () => buildFixCommands(),
                [MODES.IGNORE]: () => buildIgnoreCommands()
            };

            if (builders[state.currentMode]) cmdArray = builders[state.currentMode]();

            state.rawCommands = cmdArray.join('\n').trim();
            renderOutput(state.rawCommands.split('\n'));

            elements.copyButton.disabled = false;
            if (!isToggleUpdate) showToast("Commands generated successfully!");
        } catch (error) {
            console.error("Error generating commands:", error);
            showToast("An unexpected error occurred.", true);
        }
    }

    async function copyCommands() {
        if (!state.rawCommands) {
            showToast("Nothing to copy!", true);
            return;
        }
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(state.rawCommands);
                showToast("Clean git commands copied successfully.");
            } else {
                const textarea = document.createElement("textarea");
                textarea.value = state.rawCommands;
                textarea.style.position = "fixed";
                textarea.style.opacity = "0";
                document.body.appendChild(textarea);
                textarea.focus();
                textarea.select();
                const success = document.execCommand("copy");
                document.body.removeChild(textarea);
                if (!success) throw new Error("Copy command failed");
                showToast("Clean git commands copied successfully.");
            }
        } catch (err) {
            showToast("Failed to copy. Please copy manually.", true);
        }
    }

    function resetForm() {
        elements.username.value = "";
        elements.email.value = "";
        elements.githubUser.value = "";
        elements.repository.value = "";
        elements.repoURL.value = "";
        elements.commitMessage.value = "";
        
        elements.osButtons.forEach(b => {
            b.classList.remove('active');
            b.setAttribute('aria-pressed', 'false');
        });
        const winBtn = document.querySelector('.os-btn[data-os="win"]');
        winBtn.classList.add('active');
        winBtn.setAttribute('aria-pressed', 'true');
        
        state.selectedOS = "win";
        elements.terminalTitle.textContent = OS_CONFIG.win.title;
        
        // OS Header Class Reset
        if (elements.terminalHeader) {
            elements.terminalHeader.classList.remove('os-win', 'os-mac', 'os-linux');
            elements.terminalHeader.classList.add('os-win');
        }
        
        elements.fullRadio.checked = true;
        updateModeUI(); 
        state.rawCommands = ""; 
        updateURLPlaceholder();
        
        elements.output.style.opacity = 0;
        requestAnimationFrame(() => {
            renderPlaceholder();
            elements.output.style.opacity = 1;
        });
        
        elements.copyButton.disabled = true;
        clearInvalidStates();
        showToast("Form reset successfully!");
        elements.username.focus();
    }

    // ==========================================
    // EVENT LISTENERS
    // ==========================================
    function initEventListeners() {
        if (window.matchMedia("(hover: hover) and (pointer: fine)").matches && elements.cursorGlow) {
            let mouseX = 0, mouseY = 0;
            document.addEventListener('pointermove', (e) => {
                mouseX = e.clientX; mouseY = e.clientY;
            });
            function animateGlow() {
                if (elements.cursorGlow) {
                    elements.cursorGlow.style.transform = `translate3d(${mouseX - 150}px, ${mouseY - 150}px, 0)`;
                }
                state.animationId = requestAnimationFrame(animateGlow);
            }
            document.addEventListener("visibilitychange", () => {
                if (document.hidden) cancelAnimationFrame(state.animationId);
                else animateGlow();
            });
            animateGlow();
        }

        elements.setupModeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                updateModeUI();
                if (!elements.copyButton.disabled) generateCommands(true);
            });
        });

        elements.osButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                elements.osButtons.forEach(b => {
                    b.classList.remove('active');
                    b.setAttribute('aria-pressed', 'false');
                });
                btn.classList.add('active');
                btn.setAttribute('aria-pressed', 'true');
                
                state.selectedOS = btn.dataset.os;
                elements.terminalTitle.textContent = OS_CONFIG[state.selectedOS].title;
                
                // OS Header Class Update
                if (elements.terminalHeader) {
                    elements.terminalHeader.classList.remove('os-win', 'os-mac', 'os-linux');
                    elements.terminalHeader.classList.add(`os-${state.selectedOS}`);
                }
                
                if (!elements.copyButton.disabled) {
                    generateCommands(true);
                } else {
                    elements.output.style.opacity = 0;
                    requestAnimationFrame(() => {
                        renderPlaceholder();
                        elements.output.style.opacity = 1;
                    });
                }
            });
        });

        elements.githubUser.addEventListener('input', updateURLPlaceholder);
        elements.repository.addEventListener('input', updateURLPlaceholder);

        elements.generateButton.addEventListener("click", () => generateCommands(false));

        [elements.username, elements.email, elements.githubUser, elements.repository, elements.repoURL, elements.commitMessage].forEach(input => {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    elements.generateButton.click();
                }
            });
            input.addEventListener('input', () => {
                if (input.hasAttribute('aria-invalid')) input.removeAttribute('aria-invalid');
            });
        });

        elements.copyButton.addEventListener("click", copyCommands);
        elements.clearButton.addEventListener("click", resetForm);

        window.addEventListener('beforeunload', () => clearTimeout(state.toastTimer));
    }

    function init() {
        initEventListeners();
        updateModeUI();
        updateURLPlaceholder();
    }

    return { init };
})();

document.addEventListener("DOMContentLoaded", () => {
    try { GitAssistantApp.init(); } 
    catch (err) { console.error("Initialization Error:", err); }
});