const test = require("node:test");
const assert = require("node:assert/strict");
const tools = require("../number-format.js");
const { CURRENCIES, validateCurrencies } = require("../currencies.js");

for (const [input, expected] of [
    ["1234567.50", "1,234,567.50"],
    ["๑๒๓๔๕๖๗.๕๐", "๑,๒๓๔,๕๖๗.๕๐"],
    ["-1234.00500", "-1,234.00500"],
    ["+1234", "+1,234"],
    ["๑2๓4๕.๕0", "๑2,๓4๕.๕0"],
    [".๕๐", "๐.๕๐"],
    ["0001234.00", "0,001,234.00"],
    ["900719925474099312345.123456789", "900,719,925,474,099,312,345.123456789"],
]) {
    test("add separators: " + input, () => assert.equal(tools.formatSeparators(input), expected));
}
test("remove separators without changing decimals or digit style", () => {
    assert.equal(tools.formatSeparators("๑,๒๓๔.๕๐", "remove"), "๑๒๓๔.๕๐");
    assert.equal(tools.formatSeparators("1,234.56700", "remove"), "1234.56700");
    assert.equal(tools.formatSeparators("0,001,234.00", "remove"), "0001234.00");
});
for (const input of ["12,34", "1,234,56", "123abc", "1e3", "1+2", "1.234,50", "NaN", ".", "1."]) {
    test("reject malformed separator input: " + input, () => assert.throws(() => tools.formatSeparators(input)));
}
test("detect explicit prefixes, suffixes and Thai currency names", () => {
    assert.equal(tools.formatCurrency("US$1,234.50").output, "1,234.50 ดอลลาร์สหรัฐ");
    assert.equal(tools.formatCurrency("1,234.50 SGD").output, "1,234.50 ดอลลาร์สิงคโปร์");
    assert.equal(tools.formatCurrency("CHF 1,234.50").output, "1,234.50 ฟรังก์สวิส");
    assert.equal(tools.formatCurrency("๑,๒๓๔.๕๐ ดอลลาร์สหรัฐ", { digits: "preserve" }).output, "๑,๒๓๔.๕๐ ดอลลาร์สหรัฐ");
});
test("bare symbols require a compatible explicit selection", () => {
    for (const symbol of ["$", "¥", "￥"]) assert.throws(() => tools.formatCurrency(symbol + "1234.50"), /shared/);
    assert.equal(tools.formatCurrency("$1234.50", { currency: "SGD" }).currency, "SGD");
    assert.throws(() => tools.formatCurrency("$1234.50", { currency: "EUR" }), /does not match/);
    assert.throws(() => tools.formatCurrency("USD 1234", { currency: "CAD" }), /does not match/);
    assert.throws(() => tools.formatCurrency("1234"), /Choose a currency/);
});
test("Thai digits can be selected independently", () => {
    assert.equal(tools.formatCurrency("US$1234.50", { digits: "thai" }).output, "๑,๒๓๔.๕๐ ดอลลาร์สหรัฐ");
    assert.equal(tools.formatCurrency("USD ๑๒๓๔.๕๐", { digits: "arabic", style: "code" }).output, "USD 1,234.50");
});
test("code and symbol styles", () => {
    assert.equal(tools.formatCurrency("-SGD 1234.5", { style: "symbol" }).output, "-S$1,234.5");
    assert.equal(tools.formatCurrency("+CHF 1234.5", { style: "symbol" }).output, "+CHF 1,234.5");
    assert.equal(tools.formatCurrency("USD -1234.50", { style: "code" }).output, "USD -1,234.50");
});
test("regional output uses German placement and separators", () => {
    const result = tools.formatCurrency("€1234.50", { style: "regional" });
    assert.match(result.output, /^1\.234,50\s€$/u);
    const parsed = tools.formatCurrency(result.output, { inputFormat: "regional", style: "thai" });
    assert.equal(parsed.output, "1,234.50 ยูโร");
});
test("French euro output and space-grouped input", () => {
    const result = tools.formatCurrency("EUR 1234.50", { style: "regional", locale: "fr-FR" });
    assert.match(result.output, /^1\s234,50\s€$/u);
    assert.equal(tools.formatCurrency("1 234,50 €", { inputFormat: "regional", locale: "fr-FR" }).output, "1,234.50 ยูโร");
});
test("Swiss input accepts straight or curly apostrophes", () => {
    for (const input of ["CHF 1'234.50", "CHF 1’234.50"]) {
        assert.equal(tools.formatCurrency(input, { inputFormat: "regional" }).output, "1,234.50 ฟรังก์สวิส");
    }
});
test("input convention is explicit, independent of output", () => {
    assert.equal(tools.formatCurrency("USD 1.234,50", { inputFormat: "commaDecimal" }).output, "1,234.50 ดอลลาร์สหรัฐ");
    assert.throws(() => tools.formatCurrency("USD 1.234,50"), /decimal/);
});
test("preserve decimals, including long fractions and integers", () => {
    assert.equal(tools.formatCurrency("USD 900719925474099312345.123456789012345").output,
        "900,719,925,474,099,312,345.123456789012345 ดอลลาร์สหรัฐ");
    assert.equal(tools.formatCurrency("JPY 1234.567").output, "1,234.567 เยนญี่ปุ่น");
});
test("currency precision pads decimals without a rounding notice", () => {
    const result = tools.formatCurrency("USD 1234.5", { precision: "currency" });
    assert.equal(result.output, "1,234.50 ดอลลาร์สหรัฐ");
    assert.equal(result.rounded, false);
});
test("round half away from zero with notice on value change", () => {
    assert.equal(tools.formatCurrency("USD 1.005", { precision: "currency" }).output, "1.01 ดอลลาร์สหรัฐ");
    assert.equal(tools.formatCurrency("USD -1.005", { precision: "currency" }).output, "-1.01 ดอลลาร์สหรัฐ");
    assert.equal(tools.formatCurrency("USD 999.995", { precision: "currency" }).output, "1,000.00 ดอลลาร์สหรัฐ");
    assert.equal(tools.formatCurrency("USD 1.004", { precision: "currency" }).rounded, true);
    assert.equal(tools.formatCurrency("USD 1.000", { precision: "currency" }).rounded, false);
    assert.equal(tools.formatCurrency("USD -0.004", { precision: "currency" }).output, "0.00 ดอลลาร์สหรัฐ");
});
test("Japanese currency default and custom precision", () => {
    assert.equal(tools.formatCurrency("JPY 1234.5", { precision: "currency" }).output, "1,235 เยนญี่ปุ่น");
    assert.equal(tools.formatCurrency("JPY 1234.5678", { precision: "custom", decimalPlaces: 3 }).output, "1,234.568 เยนญี่ปุ่น");
    assert.throws(() => tools.formatCurrency("USD 1234", { precision: "custom", decimalPlaces: 7 }), /between/);
});
test("signs are not doubled and foreign text is not silently removed", () => {
    assert.throws(() => tools.formatCurrency("-USD -1234"), /sign/);
    assert.throws(() => tools.formatCurrency("USD 1234 dollars"));
    assert.throws(() => tools.formatCurrency("USD EUR 1234"));
});
test("all registered currencies format and round-trip regional outputs", () => {
    for (const currency of CURRENCIES) {
        const result = tools.formatCurrency("1234.50", { currency: currency.code, style: "regional" });
        // Shared regional symbols are resolved by the explicit selected currency.
        const recovered = tools.formatCurrency(result.output, { currency: currency.code, inputFormat: "regional" });
        assert.equal(recovered.output, "1,234.50 " + currency.thaiName, currency.code);
    }
});
test("registry validates codes and alias conflicts", () => {
    assert.equal(validateCurrencies(CURRENCIES), true);
    assert.throws(() => validateCurrencies([...CURRENCIES, CURRENCIES[0]]), /duplicate/);
    assert.throws(() => validateCurrencies([...CURRENCIES, {
        code: "NZD", name: "New Zealand dollar", thaiName: "ดอลลาร์นิวซีแลนด์",
        symbol: "NZ$", aliases: ["NZD", "USD"], locale: "en-NZ", decimalPlaces: 2,
    }]), /Conflicting/);
});
