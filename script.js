// ======================================================
// Git First-Time Setup Assistant (Enterprise Edition)
// ======================================================

// Get Elements
const username = document.getElementById("username");
const email = document.getElementById("email");
const githubUser = document.getElementById("githubUser");
const repository = document.getElementById("repository");
const repoURL = document.getElementById("repoURL");

const output = document.getElementById("output");
const generateButton = document.getElementById("generateButton");
const copyButton = document.getElementById("copyButton");
const clearButton = document.getElementById("clearButton");
const toast = document.getElementById("toast");
const cursorGlow = document.getElementById("cursor-glow");
const terminalTitle = document.getElementById("terminal-title");
const osButtons = document.querySelectorAll(".os-btn");

// Step Cards for Show/Hide
const step1Card = document.getElementById("step1-card");
const step2Card = document.getElementById("step2-card");
const step3Card = document.getElementById("step3-card");

// Mode Radios
const setupModeRadios = document.querySelectorAll('input[name="setupMode"]');

let selectedOS = "win"; // Default to Windows
let rawCommands = ""; // Store raw commands for clean copying
let currentMode = "full"; // Default mode

// ==========================================
// CURSOR GLOW (Perfect Scroll Tracking)
// ==========================================
let mouseX = 0;
let mouseY = 0;

document.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

function updateCursorGlow() {
    cursorGlow.style.transform = `translate3d(${mouseX - 150}px, ${mouseY - 150}px, 0)`;
    requestAnimationFrame(updateCursorGlow);
}
updateCursorGlow(); // Start the animation loop

// ==========================================
// MODE SELECTION LOGIC (SHOW/HIDE STEPS)
// ==========================================
function updateModeUI() {
    setupModeRadios.forEach(radio => {
        if (radio.checked) {
            currentMode = radio.value;
        }
    });

    // Hide all first
    step1Card.classList.add('hidden-step');
    step2Card.classList.add('hidden-step');
    step3Card.classList.add('hidden-step');

    // Show based on mode
    if (currentMode === "full") {
        step1Card.classList.remove('hidden-step');
        step2Card.classList.remove('hidden-step');
        step3Card.classList.remove('hidden-step');
    } else if (currentMode === "new") {
        step2Card.classList.remove('hidden-step');
    } else if (currentMode === "update") {
        // Sab hide hain, sirf generate wala chalega
    }
}

setupModeRadios.forEach(radio => {
    radio.addEventListener('change', updateModeUI);
});

// Helper: Show Toast Notification
function showToast(message, isError = false) {
    toast.textContent = message;
    toast.className = "toast show";
    if (isError) toast.classList.add("error");
    setTimeout(() => { 
        toast.className = "toast"; 
    }, 3000);
}

// OS Toggle Logic
osButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        osButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedOS = btn.dataset.os;
        
        terminalTitle.textContent = selectedOS === "win" ? "PowerShell" : "Terminal - bash";
        
        if (!copyButton.disabled) {
            generateCommands(true);
        } else {
            const prompt = getPrompt();
            output.innerHTML = `<span class="prompt">${prompt}</span> Commands will appear here after clicking "Generate"...`;
        }
    });
});

// Get OS Specific Prompt
function getPrompt() {
    return selectedOS === "win" ? "PS C:\\Project>" : "$";
}

// Generate Commands Function
function generateCommands(isToggleUpdate = false) {
    let name = username.value.trim();
    let mail = email.value.trim();
    let github = githubUser.value.trim();
    let repo = repository.value.trim();
    let remote = repoURL.value.trim();
    const prompt = getPrompt();

    // Validation & Command Building based on Mode
    let cmdArray = [];

    if (currentMode === "full") {
        // Validation for Full Setup
        if (!name || !mail) {
            output.innerHTML = `<span class="prompt">${prompt}</span> Error: Git Username and Email are required!`;
            showToast("Please fill in Username and Email!", true);
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(mail)) {
            output.innerHTML = `<span class="prompt">${prompt}</span> Error: Invalid email format!`;
            showToast("Please enter a valid email!", true);
            return;
        }
        if (remote === "" && github !== "" && repo !== "") {
            if (repo.includes(" ")) {
                output.innerHTML = `<span class="prompt">${prompt}</span> Error: Repository name cannot contain spaces.`;
                showToast("Repo name cannot have spaces!", true);
                return;
            }
            remote = `https://github.com/${github}/${repo}.git`;
        } else if (remote === "") {
            output.innerHTML = `<span class="prompt">${prompt}</span> Error: Repository URL or Name is required!`;
            showToast("Missing repository info!", true);
            return;
        }

        let credHelper = selectedOS === "win" ? "manager" : (selectedOS === "mac" ? "osxkeychain" : "cache");

        cmdArray.push("# Check Git Installation", "git --version", "");
        cmdArray.push("# Configure Username", `git config --global user.name "${name}"`, "");
        cmdArray.push("# Configure Email", `git config --global user.email "${mail}"`, "");
        cmdArray.push("# Default Branch", "git config --global init.defaultBranch main", "");
        cmdArray.push(`# Credential Manager (${selectedOS.toUpperCase()})`, `git config --global credential.helper ${credHelper}`, "");
        cmdArray.push("# VS Code as Default Editor", 'git config --global core.editor "code --wait"', "");
        cmdArray.push("# Verify Configuration", "git config --global --list", "");
        cmdArray.push("# Initialize Local Repository", "git init", "");
        cmdArray.push("# Check Status", "git status", "");
        cmdArray.push("# Add Files", "git add .", "");
        cmdArray.push("# Create Commit", 'git commit -m "Initial commit"', "");
        cmdArray.push("# Connect Remote Repository", `git remote add origin ${remote}`, "");
        cmdArray.push("# If remote already exists, run this instead:", `# git remote set-url origin ${remote}`, "");
        cmdArray.push("git remote -v", "");
        cmdArray.push("# Push Project to GitHub", "git push -u origin main", "");

    } else if (currentMode === "new") {
        // Validation for New Project
        if (remote === "" && github !== "" && repo !== "") {
            if (repo.includes(" ")) {
                output.innerHTML = `<span class="prompt">${prompt}</span> Error: Repository name cannot contain spaces.`;
                showToast("Repo name cannot have spaces!", true);
                return;
            }
            remote = `https://github.com/${github}/${repo}.git`;
        } else if (remote === "") {
            output.innerHTML = `<span class="prompt">${prompt}</span> Error: Repository URL or Name is required!`;
            showToast("Missing repository info!", true);
            return;
        }

        cmdArray.push("# Initialize Local Repository", "git init", "");
        cmdArray.push("# Check Status", "git status", "");
        cmdArray.push("# Add Files", "git add .", "");
        cmdArray.push("# Create Commit", 'git commit -m "Initial commit"', "");
        cmdArray.push("# Connect Remote Repository", `git remote add origin ${remote}`, "");
        cmdArray.push("# If remote already exists, run this instead:", `# git remote set-url origin ${remote}`, "");
        cmdArray.push("git remote -v", "");
        cmdArray.push("# Push Project to GitHub", "git push -u origin main", "");

    } else if (currentMode === "update") {
        // Update Existing Project
        cmdArray.push("# Check Status", "git status", "");
        cmdArray.push("# Add Files", "git add .", "");
        cmdArray.push("# Create Commit", 'git commit -m "Update project"', "");
        cmdArray.push("# Push Updates to GitHub", "git push", "");
    }

    // Join array to string
    rawCommands = cmdArray.join('\n').trim();

    // Formatted commands for display (with prompts on commands only)
    let formattedCommands = rawCommands.split('\n').map(line => {
        if (line.trim() === '' || line.startsWith('#')) {
            return line;
        }
        return `<span class="prompt">${prompt}</span> ${line}`;
    }).join('\n');

    // Fade out, change text, fade in animation
    output.style.opacity = 0;
    setTimeout(() => {
        output.innerHTML = formattedCommands;
        output.style.opacity = 1;
    }, 200);

    copyButton.disabled = false;
    
    if (!isToggleUpdate) {
        showToast("Commands generated successfully!");
    }
}

// Generate Button Click Listener
generateButton.addEventListener("click", () => generateCommands(false));

// Enter Key Support on Inputs
[username, email, githubUser, repository, repoURL].forEach(input => {
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            generateButton.click();
        }
    });
});

// Copy Commands (Uses rawCommands for clean copy)
copyButton.addEventListener("click", async function () {
    if (!rawCommands) {
        showToast("Nothing to copy!", true);
        return;
    }

    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(rawCommands);
        } else {
            const textarea = document.createElement("textarea");
            textarea.value = rawCommands;
            textarea.style.position = "fixed";
            textarea.style.opacity = "0";
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            document.execCommand("copy");
            document.body.removeChild(textarea);
        }
        showToast("Clean git commands copied successfully.");
    } catch (err) {
        showToast("Failed to copy. Please copy manually.", true);
    }
});

// Clear Form (Resets OS to Windows as well)
clearButton.addEventListener("click", function () {
    username.value = "";
    email.value = "";
    githubUser.value = "";
    repository.value = "";
    repoURL.value = "";
    
    // Reset OS Toggle
    osButtons.forEach(b => b.classList.remove('active'));
    document.querySelector('.os-btn[data-os="win"]').classList.add('active');
    selectedOS = "win";
    terminalTitle.textContent = "PowerShell";
    
    // Reset Mode to Full Setup
    document.querySelector('input[name="setupMode"][value="full"]').checked = true;
    updateModeUI(); // Update UI to show steps again
    
    rawCommands = ""; // Clear raw commands
    
    output.style.opacity = 0;
    setTimeout(() => {
        output.innerHTML = `<span class="prompt">PS C:\\Project></span> Commands will appear here after clicking "Generate"...`;
        output.style.opacity = 1;
    }, 200);
    
    copyButton.disabled = true;
    showToast("Form cleared! Reset to Full Setup.");
});

// Initial UI Setup on Load
updateModeUI();