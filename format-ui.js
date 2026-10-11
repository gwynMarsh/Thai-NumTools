"use strict";

function setFormatResult(tool, value, message = "") {
    document.getElementById(tool + "Result").textContent = value || "---";
    document.getElementById(tool + "Status").textContent = message;
    document.getElementById(tool + "Copy").disabled = !value;
    document.getElementById(tool + "Input").setAttribute("aria-invalid", message ? "true" : "false");
}

function updateSeparators() {
    const input = document.getElementById("separatorInput").value;
    if (!input.trim()) return setFormatResult("separator", "");
    try {
        setFormatResult("separator", NumberTools.formatSeparators(input, document.getElementById("separatorMode").value));
    } catch (error) {
        setFormatResult("separator", "", error.message);
    }
}

function currentCurrencyCode() {
    const selected = document.getElementById("currencySelect").value;
    if (selected) return selected;
    try {
        return NumberTools.detectCurrency(document.getElementById("currencyInput").value).code;
    } catch {
        return "";
    }
}

function updateCurrencyRegions() {
    const select = document.getElementById("currencyRegion");
    const currency = NumberTools.currencyByCode(currentCurrencyCode());
    const code = currency?.code || "";
    if (select.dataset.currency === code) return;
    select.dataset.currency = code;
    select.replaceChildren();
    if (!currency) return;
    for (const region of [{ locale: currency.locale, region: currency.region }, ...(currency.otherRegions || [])]) {
        const option = document.createElement("option");
        option.value = region.locale;
        option.textContent = region.region || region.locale;
        select.appendChild(option);
    }
}

function updateCurrencyFormat() {
    updateCurrencyRegions();
    const input = document.getElementById("currencyInput").value;
    const style = document.getElementById("currencyStyle").value;
    const inputFormat = document.getElementById("currencyInputFormat").value;
    const precision = document.getElementById("currencyPrecision").value;
    document.getElementById("currencyRegionControl").hidden = style !== "regional" && inputFormat !== "regional";
    document.getElementById("customDecimalsControl").hidden = precision !== "custom";
    document.getElementById("currencyRounding").textContent = "";
    document.getElementById("currencyDetected").textContent = "";
    if (!input.trim()) return setFormatResult("currency", "");
    try {
        const result = NumberTools.formatCurrency(input, {
            currency: document.getElementById("currencySelect").value,
            inputFormat, style, precision,
            locale: document.getElementById("currencyRegion").value || undefined,
            digits: document.getElementById("currencyDigits").value,
            decimalPlaces: document.getElementById("currencyDecimals").value,
        });
        setFormatResult("currency", result.output);
        const currency = NumberTools.currencyByCode(result.currency);
        document.getElementById("currencyDetected").textContent = result.currency + " · " + currency.thaiName;
        if (result.rounded) {
            document.getElementById("currencyRounding").textContent = "Rounded from " + result.originalAmount;
        }
    } catch (error) {
        setFormatResult("currency", "", error.message);
    }
}

function clearFormatInput(tool) {
    document.getElementById(tool + "Input").value = "";
    if (tool === "currency") updateCurrencyFormat();
    else updateSeparators();
    document.getElementById(tool + "Input").focus();
}

for (const currency of CURRENCIES) {
    const option = document.createElement("option");
    option.value = currency.code;
    option.textContent = currency.code + " · " + currency.thaiName;
    document.getElementById("currencySelect").appendChild(option);
}
updateSeparators();
updateCurrencyFormat();
