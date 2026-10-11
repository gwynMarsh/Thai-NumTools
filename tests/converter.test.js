const test = require("node:test");
const assert = require("node:assert/strict");
const { bahtText, thaiToArabic, arabicToThai } = require("../converter.js");

const amounts = [
    ["0", "ศูนย์บาทถ้วน"],
    ["1", "หนึ่งบาทถ้วน"],
    ["11", "สิบเอ็ดบาทถ้วน"],
    ["21", "ยี่สิบเอ็ดบาทถ้วน"],
    ["101", "หนึ่งร้อยเอ็ดบาทถ้วน"],
    ["1250.75", "หนึ่งพันสองร้อยห้าสิบบาทเจ็ดสิบห้าสตางค์"],
    ["๒,๕๖๐.๕๐", "สองพันห้าร้อยหกสิบบาทห้าสิบสตางค์"],
    ["1.005", "หนึ่งบาทหนึ่งสตางค์"],
    ["1.015", "หนึ่งบาทสองสตางค์"],
    ["2.675", "สองบาทหกสิบแปดสตางค์"],
    ["999.995", "หนึ่งพันบาทถ้วน"],
    ["-1.005", "ลบหนึ่งบาทหนึ่งสตางค์"],
    ["-0.004", "ศูนย์บาทถ้วน"],
    [".005", "หนึ่งสตางค์"],
    ["0.994", "เก้าสิบเก้าสตางค์"],
    ["0.995", "หนึ่งบาทถ้วน"],
    ["+001.50", "หนึ่งบาทห้าสิบสตางค์"],
    ["1,000,001", "หนึ่งล้านเอ็ดบาทถ้วน"],
    ["1000000000000", "หนึ่งล้านล้านบาทถ้วน"],
];
for (const [input, expected] of amounts) {
    test("bahtText: " + input, () => assert.equal(bahtText(input), expected));
}
for (const input of ["", null, undefined, " ", "123abc", "1+2", "NaN", "Infinity", "1e3", "12,34", "1.2.3", ","]) {
    test("invalid amount: " + String(input), () => assert.equal(bahtText(input), "---"));
}
test("Thai conversion preserves all surrounding text", () => {
    assert.equal(thaiToArabic("ยอด ๑,๒๕๐.๗๕ บาท\nVAT 7% — ✅"), "ยอด 1,250.75 บาท\nVAT 7% — ✅");
});
test("Arabic conversion preserves all surrounding text", () => {
    assert.equal(arabicToThai("INV-123 / 50%\nบาท"), "INV-๑๒๓ / ๕๐%\nบาท");
});
test("all ten digits round trip", () => {
    assert.equal(thaiToArabic(arabicToThai("0123456789")), "0123456789");
});
test("rounding boundaries across many amounts", () => {
    for (let whole = 0; whole <= 100; whole++) {
        for (let cents = 0; cents < 100; cents++) {
            const base = whole * 100 + cents;
            const input = whole + "." + String(cents).padStart(2, "0");
            assert.equal(bahtText(input + "4"), bahtText(input));
            const next = base + 1;
            assert.equal(bahtText(input + "5"), bahtText(Math.floor(next / 100) + "." + String(next % 100).padStart(2, "0")));
        }
    }
});
