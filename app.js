function switchTab(tabId, btnElement) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    document.getElementById(tabId).classList.add('active');
    btnElement.classList.add('active');
}

// --- Native Dark Mode Handler ---
function updateThemeToggle() {
    const isDark = document.documentElement.classList.contains('dark');
    const label = isDark ? 'Switch to light theme' : 'Switch to dark theme';
    document.getElementById('themeIcon').textContent = isDark ? 'light_mode' : 'dark_mode';
    const button = document.getElementById('themeToggle');
    button.setAttribute('aria-label', label);
    button.title = label;
}

function toggleDarkMode() {
    const html = document.documentElement;
    html.classList.toggle('dark');
    updateThemeToggle();
    localStorage.setItem('theme', html.classList.contains('dark') ? 'dark' : 'light');
}

if (localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
}
updateThemeToggle();

// --- Clipboard Operations ---
function copyToClipboard(elementId, btnElement) {
    const textToCopy = document.getElementById(elementId).textContent;
    if (!textToCopy || textToCopy === "---") return;

    Promise.resolve().then(() => navigator.clipboard.writeText(textToCopy)).then(() => {
        document.getElementById("clipboardStatus").textContent = "";
        const originalText = btnElement.textContent;
        btnElement.textContent = "✅ Copied!";
        setTimeout(() => {
            btnElement.textContent = originalText;
        }, 1500);
    }).catch(() => {
        document.getElementById("clipboardStatus").textContent =
            "Copy failed. Select the result and use your device’s Copy command.";
    });
}

async function pasteFromClipboard() {
    const input = document.getElementById("thaiInput");
    try {
        const text = await navigator.clipboard.readText();
        if (text) insertThaiText(text);
    } catch {
        input.focus();
        document.getElementById("pasteStatus").textContent =
            "Paste into the field using your device’s Paste command.";
    }
}

function convertBahtText() {
    const inputVal = document.getElementById('bahtInput').value;
    const resEl = document.getElementById('bahtResult');
    resEl.textContent = bahtText(inputVal);
}

// --- Conversion Engines ---
function convertArabicToThai() {
    const value = document.getElementById("arabicInput").value;
    document.getElementById("thaiResult").textContent = value ? arabicToThai(value) : "---";
}

function updateThaiChipDisplay() {
    const value = document.getElementById("thaiInput").value;
    document.getElementById("arabicResult").textContent = value ? thaiToArabic(value) : "---";
    document.getElementById("pasteStatus").textContent = "";
}

function insertThaiText(text) {
    const input = document.getElementById("thaiInput");
    input.setRangeText(text, input.selectionStart, input.selectionEnd, "end");
    updateThaiChipDisplay();
}

function appendThai(char) {
    insertThaiText(char);
}

function backspaceThai() {
    const input = document.getElementById("thaiInput");
    const start = input.selectionStart;
    const end = input.selectionEnd;
    if (start !== end) {
        input.setRangeText("", start, end, "end");
    } else if (start > 0) {
        // Delete a complete grapheme, including Thai combining marks.
        const segments = Array.from(new Intl.Segmenter("th", { granularity: "grapheme" })
            .segment(input.value.slice(0, start)));
        input.setRangeText("", segments[segments.length - 1].index, start, "end");
    }
    updateThaiChipDisplay();
}

function clearChips() {
    document.getElementById("thaiInput").value = "";
    updateThaiChipDisplay();
}

// Keep the editor selection when clicking keypad keys on desktop.
document.querySelectorAll(".chip-btn, .chip-actions-group button").forEach(button => {
    button.addEventListener("mousedown", event => event.preventDefault());
});

// Run default state setup on load
document.getElementById('bahtInput').value = "1250.75";
convertBahtText();

document.getElementById('arabicInput').value = "2,569.50 + 10%";
convertArabicToThai();
    
updateThaiChipDisplay();

