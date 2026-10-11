const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

// Minimal editor/document fixture for application behavior; no browser dependency.
function loadApp() {
    const elements = {};
    function element(id) {
        return elements[id] ||= {
            value: "", textContent: "", selectionStart: 0, selectionEnd: 0,
            focus() { this.focused = true; },
            setRangeText(text, start, end) {
                this.value = this.value.slice(0, start) + text + this.value.slice(end);
                this.selectionStart = this.selectionEnd = start + text.length;
            },
        };
    }
    const classes = new Set();
    const storage = new Map();
    const context = vm.createContext({
        document: {
            getElementById: element, querySelectorAll: () => [],
            documentElement: { classList: {
                contains: name => classes.has(name),
                add: name => classes.add(name),
                toggle(name) { classes.has(name) ? classes.delete(name) : classes.add(name); },
            } },
        },
        localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
        window: { matchMedia: () => ({ matches: false }) },
        navigator: { clipboard: { readText: async () => "", writeText: async () => {} } },
        Intl, setTimeout: () => {},
    });
    for (const file of ["converter.js", "app.js"]) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, "..", file), "utf8"), context);
    }
    return { context, element, storage };
}
test("initial results and empty Thai input", () => {
    const { element } = loadApp();
    assert.equal(element("bahtResult").textContent, "หนึ่งพันสองร้อยห้าสิบบาทเจ็ดสิบห้าสตางค์");
    assert.equal(element("thaiResult").textContent, "๒,๕๖๙.๕๐ + ๑๐%");
    assert.equal(element("arabicResult").textContent, "---");
});
test("keypad inserts at cursor and replaces selection", () => {
    const { context, element } = loadApp();
    const input = element("thaiInput");
    input.value = "ยอด ๑๒ บาท";
    input.selectionStart = input.selectionEnd = 5;
    context.appendThai("๓");
    assert.equal(input.value, "ยอด ๑๓๒ บาท");
    assert.equal(element("arabicResult").textContent, "ยอด 132 บาท");
    input.selectionStart = 4; input.selectionEnd = 7;
    context.appendThai("๙");
    assert.equal(input.value, "ยอด ๙ บาท");
});
test("delete handles selection and Thai combining marks", () => {
    const { context, element } = loadApp();
    const input = element("thaiInput");
    input.value = "กี้";
    input.selectionStart = input.selectionEnd = input.value.length;
    context.backspaceThai();
    assert.equal(input.value, "");
    input.value = "๑๒๓"; input.selectionStart = 1; input.selectionEnd = 3;
    context.backspaceThai();
    assert.equal(input.value, "๑");
    context.clearChips();
    assert.equal(element("arabicResult").textContent, "---");
});
test("paste keeps letters, line breaks, symbols and existing Arabic digits", async () => {
    const { context, element } = loadApp();
    context.navigator.clipboard.readText = async () => "ยอด ๑๒ บาท\nVAT 7% ✅";
    await context.pasteFromClipboard();
    assert.equal(element("thaiInput").value, "ยอด ๑๒ บาท\nVAT 7% ✅");
    assert.equal(element("arabicResult").textContent, "ยอด 12 บาท\nVAT 7% ✅");
});
test("denied paste focuses the editor and explains native paste", async () => {
    const { context, element } = loadApp();
    context.navigator.clipboard.readText = async () => { throw new Error("denied"); };
    await context.pasteFromClipboard();
    assert.equal(element("thaiInput").focused, true);
    assert.match(element("pasteStatus").textContent, /Paste into the field/);
});
test("theme choice persists", () => {
    const { context, storage } = loadApp();
    context.toggleDarkMode(); assert.equal(storage.get("theme"), "dark");
    context.toggleDarkMode(); assert.equal(storage.get("theme"), "light");
});
