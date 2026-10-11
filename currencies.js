"use strict";

// Add a record here to extend the dropdown, recognition and output together.
// aliases must identify this currency uniquely. Put shared signs in ambiguousAliases.
// locale controls regional separators, symbol position and spacing.
const CURRENCIES = [
    { code: "THB", name: "Thai baht", thaiName: "บาท", symbol: "฿", aliases: ["THB", "฿", "บาท"], decimalPlaces: 2, locale: "th-TH", region: "Thailand" },
    { code: "USD", name: "US dollar", thaiName: "ดอลลาร์สหรัฐ", symbol: "US$", aliases: ["USD", "US$", "ดอลลาร์สหรัฐ"], ambiguousAliases: ["$"], decimalPlaces: 2, locale: "en-US", region: "United States" },
    { code: "EUR", name: "Euro", thaiName: "ยูโร", symbol: "€", aliases: ["EUR", "€", "ยูโร"], decimalPlaces: 2, locale: "de-DE", region: "Germany",
        otherRegions: [{ locale: "fr-FR", region: "France" }, { locale: "en-IE", region: "Ireland" }] },
    { code: "GBP", name: "British pound", thaiName: "ปอนด์สเตอร์ลิง", symbol: "£", aliases: ["GBP", "£", "ปอนด์สเตอร์ลิง"], decimalPlaces: 2, locale: "en-GB", region: "United Kingdom" },
    { code: "SGD", name: "Singapore dollar", thaiName: "ดอลลาร์สิงคโปร์", symbol: "S$", aliases: ["SGD", "S$", "ดอลลาร์สิงคโปร์"], ambiguousAliases: ["$"], decimalPlaces: 2, locale: "en-SG", region: "Singapore" },
    { code: "CHF", name: "Swiss franc", thaiName: "ฟรังก์สวิส", symbol: "CHF", aliases: ["CHF", "Fr.", "ฟรังก์สวิส"], decimalPlaces: 2, locale: "de-CH", region: "Switzerland (German)",
        otherRegions: [{ locale: "fr-CH", region: "Switzerland (French)" }] },
    { code: "JPY", name: "Japanese yen", thaiName: "เยนญี่ปุ่น", symbol: "JP¥", aliases: ["JPY", "JP¥", "เยนญี่ปุ่น"], ambiguousAliases: ["¥", "￥"], decimalPlaces: 0, locale: "ja-JP", region: "Japan" },
    { code: "CNY", name: "Chinese yuan", thaiName: "หยวนจีน", symbol: "CN¥", aliases: ["CNY", "RMB", "CN¥", "หยวนจีน"], ambiguousAliases: ["¥", "￥"], decimalPlaces: 2, locale: "zh-CN", region: "China" },
    { code: "AUD", name: "Australian dollar", thaiName: "ดอลลาร์ออสเตรเลีย", symbol: "A$", aliases: ["AUD", "A$", "ดอลลาร์ออสเตรเลีย"], ambiguousAliases: ["$"], decimalPlaces: 2, locale: "en-AU", region: "Australia" },
    { code: "CAD", name: "Canadian dollar", thaiName: "ดอลลาร์แคนาดา", symbol: "C$", aliases: ["CAD", "C$", "ดอลลาร์แคนาดา"], ambiguousAliases: ["$"], decimalPlaces: 2, locale: "en-CA", region: "Canada" },
    { code: "HKD", name: "Hong Kong dollar", thaiName: "ดอลลาร์ฮ่องกง", symbol: "HK$", aliases: ["HKD", "HK$", "ดอลลาร์ฮ่องกง"], ambiguousAliases: ["$"], decimalPlaces: 2, locale: "en-HK", region: "Hong Kong" },
];

function validateCurrencies(currencies) {
    const codes = new Set();
    const aliases = new Map();
    const shared = new Set();
    for (const currency of currencies) {
        if (!/^[A-Z]{3}$/.test(currency.code) || codes.has(currency.code)) {
            throw new Error("Invalid or duplicate currency code: " + currency.code);
        }
        codes.add(currency.code);
        if (!currency.name || !currency.thaiName || !currency.symbol ||
            !Number.isInteger(currency.decimalPlaces) || currency.decimalPlaces < 0 || currency.decimalPlaces > 6 ||
            !Array.isArray(currency.aliases) || !currency.aliases.includes(currency.code)) {
            throw new Error("Incomplete currency definition: " + currency.code);
        }
        for (const locale of [currency.locale, ...(currency.otherRegions || []).map(item => item.locale)]) {
            if (!locale || Intl.NumberFormat.supportedLocalesOf([locale]).length === 0) {
                throw new Error("Unsupported currency locale: " + locale);
            }
        }
        for (const alias of currency.aliases) {
            const key = alias.toUpperCase();
            if (!alias || (aliases.has(key) && aliases.get(key) !== currency.code)) {
                throw new Error("Conflicting currency alias: " + alias);
            }
            aliases.set(key, currency.code);
        }
        for (const alias of currency.ambiguousAliases || []) {
            if (!alias) throw new Error("Empty shared currency alias");
            shared.add(alias.toUpperCase());
        }
    }
    for (const alias of shared) {
        if (aliases.has(alias)) throw new Error("Alias is both unique and shared: " + alias);
    }
    return true;
}

validateCurrencies(CURRENCIES);
if (typeof module !== "undefined" && module.exports) {
    module.exports = { CURRENCIES, validateCurrencies };
}
