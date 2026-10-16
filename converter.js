"use strict";
const THAI_DIGITS = "๐๑๒๓๔๕๖๗๘๙";
function thaiToArabic(text) {
    return String(text).replace(/[๐-๙]/g, digit => String(THAI_DIGITS.indexOf(digit)));
}
function arabicToThai(text) {
    return String(text).replace(/[0-9]/g, digit => THAI_DIGITS[Number(digit)]);
}
function bahtText(numInput) {
    if (numInput === null || numInput === undefined || numInput === "") return "---";

    let cleanInput = thaiToArabic(numInput).trim();

    // Validate the entire amount; never accept a numeric prefix of invalid text.
    if (!/^[+-]?(?:(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d*)?|\.\d+)$/.test(cleanInput)) return "---";
    cleanInput = cleanInput.replace(/,/g, "");
    const negative = cleanInput.startsWith("-");
    cleanInput = cleanInput.replace(/^[+-]/, "");
    const [whole = "", fraction = ""] = cleanInput.split(".");
    let satang = BigInt(whole || "0") * 100n + BigInt((fraction + "00").slice(0, 2));
    // Round half away from zero using decimal digits, without floating-point error.
    if (fraction.length > 2 && fraction[2] >= "5") satang += 1n;
    const prefix = negative && satang !== 0n ? "ลบ" : "";
    const integerPart = String(satang / 100n);
    const decimalPart = String(satang % 100n).padStart(2, "0");

    const numbers = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
    const positions = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];

    function convertSegment(strNum, hasPrecedingDigit = false) {
        let result = "";
        const len = strNum.length;

        for (let i = 0; i < len; i++) {
            const digit = parseInt(strNum.charAt(i), 10);
            const pos = len - i - 1;

            if (digit !== 0) {
                if (pos === 1 && digit === 1) {
                    result += "";
                } else if (pos === 1 && digit === 2) {
                    result += "ยี่";
                } else if (pos === 0 && digit === 1 && hasPrecedingDigit) {
                    result += "เอ็ด";
                } else {
                    result += numbers[digit];
                }
                result += positions[pos];
                hasPrecedingDigit = true;
            }
        }
        return result;
    }

    function convertInteger(strNum) {
        if (strNum === "0" || strNum === "") return "ศูนย์";
        let result = "";
        let remaining = strNum;

        while (remaining.length > 6) {
            const chunk = remaining.substring(remaining.length - 6);
            remaining = remaining.substring(0, remaining.length - 6);
            result = convertSegment(chunk, true) + result;
            result = "ล้าน" + result;
        }
        result = convertSegment(remaining) + result;
        return result;
    }

    const bahtResult = convertInteger(integerPart);
    let satangResult = "";

    if (decimalPart !== "00") {
        satangResult = convertSegment(decimalPart) + "สตางค์";
    }

    if (bahtResult === "ศูนย์" && satangResult !== "") {
        return prefix + satangResult;
    } else if (satangResult === "") {
        return prefix + bahtResult + "บาทถ้วน";
    } else {
        return prefix + bahtResult + "บาท" + satangResult;
    }
}


if (typeof module !== "undefined" && module.exports) {
    module.exports = { thaiToArabic, arabicToThai, bahtText };
}

