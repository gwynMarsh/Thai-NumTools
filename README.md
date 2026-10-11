# Thai Number Tools

Static tools for BahtText, Thai/Arabic numeral conversion and number/currency notation.

## Number Format tab

- Separators: add/remove commas while preserving Thai/Arabic digit scripts and decimal digits.
- Currency Notation: Thai currency names, international codes, explicit symbols or regional formatting.
- Choose input separators explicitly. The output style does not change how the input is interpreted.
- Bare shared signs such as $ and ¥ require a currency selection.
- Preserve input decimals is the default. Currency default or custom precision uses decimal-digit rounding, with a notice when the numeric value changes.
- Currency notation keeps the monetary value; it does not use exchange rates.

## Add a currency

Edit only **currencies.js**. Append an entry to CURRENCIES:

```js
{
    code: "NZD",
    name: "New Zealand dollar",
    thaiName: "ดอลลาร์นิวซีแลนด์",
    symbol: "NZ$",
    aliases: ["NZD", "NZ$", "ดอลลาร์นิวซีแลนด์"],
    ambiguousAliases: ["$"],
    decimalPlaces: 2,
    locale: "en-NZ",
    region: "New Zealand"
}
```

The dropdown and input detection update automatically. Include the code and Thai name in aliases so the tool can read its own outputs. Unique aliases cannot overlap other currencies. Put shared signs in ambiguousAliases instead. Decimal places is the default precision for ordinary currency notation, not a cash-rounding rule.

For additional regional choices, add otherRegions:

```js
otherRegions: [{ locale: "fr-FR", region: "France" }]
```

Regional placement, grouping and spacing come from the browser's Intl locale data; details may vary with browser versions.

## Tests

No runtime dependencies or build step. With Node.js installed:

```sh
node --test tests/*.test.js
```

Open index.html in a browser or serve the folder with any static server.
