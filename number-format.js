"use strict";

const NumberTools = (() => {
    const currencies = typeof module !== "undefined" && module.exports
        ? require("./currencies.js").CURRENCIES : CURRENCIES;
    const thaiDigits = "๐๑๒๓๔๕๖๗๘๙";
    const normalizeDigits = text => text.replace(/[๐-๙]/g, digit => String(thaiDigits.indexOf(digit)));
    const toThai = text => text.replace(/[0-9]/g, digit => thaiDigits[Number(digit)]);
    const group = text => text.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    const currencyByCode = code => currencies.find(item => item.code === code);

    function parseAmount(text, locale = "en-US") {
        let value = normalizeDigits(String(text).trim()).replace(/\u2212/g, "-");
        const parts = new Intl.NumberFormat(locale, { numberingSystem: "latn" }).formatToParts(12345.6);
        const decimal = parts.find(part => part.type === "decimal").value;
        const grouping = parts.find(part => part.type === "group")?.value;
        // Treat normal, nonbreaking and narrow nonbreaking spaces alike for space grouping.
        if (grouping && /\s/u.test(grouping)) value = value.replace(/[ \u00a0\u202f]/g, grouping);
        if (grouping === "’" || grouping === "'") value = value.replace(/['’]/g, grouping);
        let sign = "";
        if (/^[+-]/.test(value)) { sign = value[0]; value = value.slice(1); }
        const pieces = value.split(decimal);
        if (pieces.length > 2) throw new Error("Check the decimal separator for the selected input format.");
        let integer = pieces[0];
        const fraction = pieces[1] || "";
        const hasDecimal = pieces.length === 2;
        if (hasDecimal && !/^\d+$/.test(fraction)) throw new Error("Enter digits after the decimal separator.");
        if (grouping && integer.includes(grouping)) {
            const chunks = integer.split(grouping);
            // Verify locale-specific grouping rather than silently stripping malformed punctuation.
            if (!chunks.every(chunk => /^\d+$/.test(chunk))) throw new Error("Check the thousands separators.");
            const ungrouped = chunks.join("");
            const expected = new Intl.NumberFormat(locale, { numberingSystem: "latn", maximumFractionDigits: 0 })
                .format(BigInt("1" + ungrouped.slice(1))).replace(/^\d/, ungrouped[0]);
            if (integer !== expected) throw new Error("Check the thousands grouping or select a different input format.");
            integer = ungrouped;
        }
        if ((!integer && !hasDecimal) || (integer && !/^\d+$/.test(integer))) {
            throw new Error("Enter one number using the selected input format.");
        }
        integer ||= "0";
        return { integer, fraction, hasDecimal, negative: sign === "-", positive: sign === "+", original: String(text) };
    }

    function formatSeparators(text, mode = "add") {
        if (!["add", "remove"].includes(mode)) throw new Error("Choose add or remove commas.");
        parseAmount(text);
        // Work on the original characters to preserve mixed Thai/Arabic scripts and zeros.
        let original = String(text).trim().replace(/\u2212/g, "-").replace(/,/g, "");
        const sign = /^[+-]/.test(original) ? original[0] : "";
        if (sign) original = original.slice(1);
        const [whole, fraction] = original.split(".");
        const zero = /[๐-๙]/.test(original) && !/[0-9]/.test(original) ? "๐" : "0";
        let integer = whole || zero;
        if (mode === "add") {
            integer = Array.from(integer).map((digit, index) =>
                digit + ((integer.length - index - 1) % 3 === 0 && index !== integer.length - 1 ? "," : "")).join("");
        }
        return sign + integer + (fraction !== undefined ? "." + fraction : "");
    }

    const aliases = currencies.flatMap(currency => [
        ...currency.aliases.map(alias => ({ alias, code: currency.code })),
        ...(currency.ambiguousAliases || []).map(alias => ({ alias, code: currency.code })),
    ]).sort((a, b) => b.alias.length - a.alias.length);

    function detectCurrency(text, selectedCode = "") {
        if (selectedCode && !currencyByCode(selectedCode)) throw new Error("Choose a supported currency.");
        let remaining = String(text).trim();
        let sign = "";
        if (/^[+\-−]/.test(remaining)) { sign = remaining[0]; remaining = remaining.slice(1).trim(); }
        const upper = remaining.toUpperCase();
        const token = aliases.find(({ alias }) =>
            upper.startsWith(alias.toUpperCase()) || upper.endsWith(alias.toUpperCase()));
        if (!token) {
            if (!selectedCode) throw new Error("Choose a currency for this amount.");
            return { code: selectedCode, amount: sign + remaining, detected: false };
        }
        const matching = aliases.filter(item => item.alias.toUpperCase() === token.alias.toUpperCase());
        const candidates = [...new Set(matching.map(item => item.code))];
        if (!selectedCode && candidates.length > 1) {
            throw new Error("“" + token.alias + "” is shared. Choose the currency.");
        }
        if (selectedCode && !candidates.includes(selectedCode)) {
            throw new Error("The pasted currency does not match your currency selection.");
        }
        if (upper.startsWith(token.alias.toUpperCase())) remaining = remaining.slice(token.alias.length).trim();
        else remaining = remaining.slice(0, -token.alias.length).trim();
        if (sign && /^[+\-−]/.test(remaining)) throw new Error("Check the amount’s sign.");
        return { code: selectedCode || candidates[0], amount: sign + remaining, detected: true };
    }

    function precision(amount, places) {
        if (places === null) return { ...amount, rounded: false };
        if (!Number.isInteger(places) || places < 0 || places > 6) throw new Error("Decimal places must be between 0 and 6.");
        const scale = 10n ** BigInt(places);
        let value = BigInt(amount.integer) * scale + BigInt((amount.fraction + "0".repeat(places)).slice(0, places) || "0");
        if (amount.fraction.length > places && amount.fraction[places] >= "5") value++;
        const rounded = /[1-9]/.test(amount.fraction.slice(places));
        return {
            ...amount,
            integer: String(value / scale),
            fraction: places ? String(value % scale).padStart(places, "0") : "",
            hasDecimal: places > 0,
            negative: amount.negative && value !== 0n,
            rounded,
        };
    }

    function regionalNumber(amount, locale) {
        const parts = new Intl.NumberFormat(locale, { numberingSystem: "latn", maximumFractionDigits: 0 })
            .formatToParts(BigInt(amount.integer));
        const integer = parts.filter(part => ["integer", "group"].includes(part.type)).map(part => part.value).join("");
        const decimal = new Intl.NumberFormat(locale, { numberingSystem: "latn" })
            .formatToParts(1.1).find(part => part.type === "decimal").value;
        return integer + (amount.hasDecimal ? decimal + amount.fraction : "");
    }

    function formatCurrency(text, options = {}) {
        const detected = detectCurrency(text, options.currency || "");
        const currency = currencyByCode(detected.code);
        const locale = options.locale || currency.locale;
        const inputLocale = options.inputFormat === "regional" ? locale :
            options.inputFormat === "commaDecimal" ? "de-DE" : "en-US";
        const parsed = parseAmount(detected.amount, inputLocale);
        const places = options.precision === "currency" ? currency.decimalPlaces :
            options.precision === "custom" ? Number(options.decimalPlaces) : null;
        const amount = precision(parsed, places);
        const style = options.style || "thai";
        const english = group(String(BigInt(amount.integer))) + (amount.hasDecimal ? "." + amount.fraction : "");
        const signed = (amount.negative ? "-" : amount.positive ? "+" : "") + english;
        let output;
        if (style === "thai") output = signed + " " + currency.thaiName;
        else if (style === "code") output = currency.code + " " + signed;
        else if (style === "symbol") output = (amount.negative ? "-" : amount.positive ? "+" : "") +
            currency.symbol + (/^[A-Z]+$/.test(currency.symbol) ? " " : "") + english;
        else if (style === "regional") {
            const formatter = new Intl.NumberFormat(locale, {
                numberingSystem: "latn", style: "currency", currency: currency.code,
                minimumFractionDigits: 0, maximumFractionDigits: 0,
                signDisplay: amount.positive ? "always" : "auto",
            });
            // Use Intl for placement and spacing; insert our exact decimal string.
            const template = formatter.formatToParts(amount.negative ? -1 : 1);
            let inserted = false;
            output = template.map(part => {
                if (["integer", "group", "decimal", "fraction"].includes(part.type)) {
                    if (inserted) return "";
                    inserted = true;
                    return regionalNumber(amount, locale);
                }
                return part.value;
            }).join("");
        } else throw new Error("Choose an output style.");
        if (options.digits === "thai" || (options.digits === "preserve" &&
            /[๐-๙]/.test(detected.amount) && !/[0-9]/.test(detected.amount))) output = toThai(output);
        return { output, rounded: amount.rounded,
            originalAmount: detected.amount, currency: currency.code, locale };
    }

    return { parseAmount, formatSeparators, detectCurrency, formatCurrency, precision, currencyByCode };
})();

if (typeof module !== "undefined" && module.exports) module.exports = NumberTools;
