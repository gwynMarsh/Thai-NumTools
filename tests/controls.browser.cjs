const {chromium}=require('playwright');
const fs=require('fs');
const path=require('path');
const assert=require('node:assert/strict');
(async()=>{
 const launchOptions = { headless: true };
 if (process.env.BROWSER_EXECUTABLE) launchOptions.executablePath = process.env.BROWSER_EXECUTABLE;
 if (process.env.BROWSER_ARGS) launchOptions.args = JSON.parse(process.env.BROWSER_ARGS);

 for(const width of [320,390,800,959,960,1280,1920]) for(const theme of ['light','dark']){
 const browser=await chromium.launch(launchOptions);
  const context=await browser.newContext({viewport:{width,height:900},colorScheme:theme,hasTouch:width<800});
  const page=await context.newPage(); const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.hostname!=='localhost') return route.abort();
   const file=path.join(__dirname, '..',url.pathname==='/'?'index.html':url.pathname);
   await route.fulfill({body:fs.readFileSync(file),contentType:file.endsWith('.css')?'text/css':file.endsWith('.js')?'application/javascript':'text/html'});
  });
  async function pick(id,value) {
   const text=await page.locator('#'+id).evaluate((el,v)=>Array.from(el.options).find(o=>o.value===v).textContent,value);
   await page.locator('#'+id+'Button').click();
   await page.getByRole('option',{name:text,exact:true}).click();
  }
  await page.goto('http://localhost/');
  await page.locator('#bahtInput').fill('1.005'); assert.equal(await page.locator('#bahtResult').textContent(),'หนึ่งบาทหนึ่งสตางค์');
  await page.getByRole('button',{name:'๑๒๓ → 123',exact:true}).click();
  await page.locator('#thaiInput').fill('ยอด ๑๒ บาท\nVAT 7% — ✅');
  assert.equal(await page.locator('#arabicResult').textContent(),'ยอด 12 บาท\nVAT 7% — ✅');
  await page.locator('#thaiInput').evaluate(el=>el.setSelectionRange(5,5));
  await page.locator('.chip-btn').first().click(); assert.equal(await page.locator('#thaiInput').inputValue(),'ยอด ๑๑๒ บาท\nVAT 7% — ✅');
  await page.getByRole('button',{name:'Delete',exact:true}).click(); assert.equal(await page.locator('#thaiInput').inputValue(),'ยอด ๑๒ บาท\nVAT 7% — ✅');
  await page.locator('#thaiInput').evaluate(el=>el.setSelectionRange(4,6)); await page.locator('.chip-btn').nth(1).click(); assert.equal(await page.locator('#thaiInput').inputValue(),'ยอด ๒ บาท\nVAT 7% — ✅');
  await page.evaluate(()=>{Object.defineProperty(navigator,'clipboard',{configurable:true,value:{readText:async()=> ' เลข ๙',writeText:async t=>window.copied=t}})});
  await page.getByRole('button',{name:'Paste',exact:true}).click(); assert.equal(await page.locator('#thaiInput').inputValue(),'ยอด ๒ เลข ๙ บาท\nVAT 7% — ✅');
  await page.locator('#thaiToArabicTab .action-btn').last().click(); assert.equal(await page.evaluate(()=>window.copied),'ยอด 2 เลข 9 บาท\nVAT 7% — ✅');
  await page.evaluate(()=>{navigator.clipboard.readText=async()=>{throw Error('denied')}});
  await page.getByRole('button',{name:'Paste',exact:true}).click(); assert.match(await page.locator('#pasteStatus').textContent(),/Paste into/);
  await page.getByRole('button',{name:'Clear',exact:true}).click(); assert.equal(await page.locator('#arabicResult').textContent(),'---');
  await page.locator('#thaiInput').fill('ราคา ๑๒๓๔๕๖๗๘๙๐'.repeat(30));
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const sizes=await page.locator('.chip-btn').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().height)); assert(sizes.every(n=>n>=44));
  await page.locator('#thaiInput').fill('ยอด ๑,๒๕๐.๗๕ บาท');
  

  const thaiLayout=await page.evaluate(()=>{
   const input=document.getElementById('thaiInput').getBoundingClientRect();
   const keypad=document.querySelector('.palette-grid').getBoundingClientRect();
   return {input:{x:input.x,right:input.right,bottom:input.bottom},keypad:{x:keypad.x,y:keypad.y}};
  });
  if(width>=960) assert(thaiLayout.keypad.x>thaiLayout.input.right);
  else assert(thaiLayout.keypad.y>=thaiLayout.input.bottom);
  await page.getByRole('button',{name:'123 → ๑๒๓',exact:true}).click(); await page.locator('#arabicInput').fill('Invoice 123 / 50%'); assert.equal(await page.locator('#thaiResult').textContent(),'Invoice ๑๒๓ / ๕๐%');
  await page.getByRole('button',{name:'Number Format',exact:true}).click();
  const formatLayout=await page.evaluate(()=>{
   const cards=Array.from(document.querySelectorAll('.format-tools > .card')).map(el=>el.getBoundingClientRect());
   return {first:{x:cards[0].x,right:cards[0].right,y:cards[0].y,bottom:cards[0].bottom},second:{x:cards[1].x,y:cards[1].y},main:document.querySelector('main').getBoundingClientRect().width};
  });
  if(width>=960) {
   assert(formatLayout.second.x>formatLayout.first.right);
   assert(Math.abs(formatLayout.first.y-formatLayout.second.y)<1);
   assert(formatLayout.main>900 && formatLayout.main<=960);
  } else assert(formatLayout.second.y>=formatLayout.first.bottom);

  await page.locator('#separatorInput').fill('๑๒๓๔๕๖๗.๕๐'); assert.equal(await page.locator('#separatorResult').textContent(),'๑,๒๓๔,๕๖๗.๕๐');
  await page.locator('label[for=separatorCommas]').click(); assert.equal(await page.locator('#separatorResult').textContent(),'๑๒๓๔๕๖๗.๕๐');
  const toggle=page.getByRole('switch',{name:'Use commas',exact:true}); await toggle.focus(); await toggle.press('Space'); assert.equal(await toggle.isChecked(),true); assert.equal(await page.locator('#separatorResult').textContent(),'๑,๒๓๔,๕๖๗.๕๐'); await toggle.press('Space');
  await page.locator('#separatorInput').fill('12,34'); assert.equal(await page.locator('#separatorCopy').isDisabled(),true);
  await page.locator('#currencyInput').fill('US$1,234.50'); assert.equal(await page.locator('#currencyResult').textContent(),'1,234.50 ดอลลาร์สหรัฐ');
  await pick('currencyStyle','regional'); assert.equal(await page.locator('#currencyResult').textContent(),'$1,234.50');
  await page.locator('#currencyInput').fill('€1,234.50'); assert.match(await page.locator('#currencyResult').textContent(),/^1\.234,50\s€$/u);
  await pick('currencyRegion','fr-FR'); assert.match(await page.locator('#currencyResult').textContent(),/^1\s234,50\s€$/u);
  await pick('currencyInputFormat','regional'); await page.locator('#currencyInput').fill('1 234,50 €');
  await pick('currencyStyle','thai'); assert.equal(await page.locator('#currencyResult').textContent(),'1,234.50 ยูโร');
  await pick('currencyInputFormat','english'); await page.locator('#currencyInput').fill('$1,234.50'); assert.equal(await page.locator('#currencyCopy').isDisabled(),true);
  await pick('currencySelect','SGD'); assert.equal(await page.locator('#currencyResult').textContent(),'1,234.50 ดอลลาร์สิงคโปร์');
  await pick('currencyPrecision','currency'); await page.locator('#currencyInput').fill('S$1.005'); assert.equal(await page.locator('#currencyResult').textContent(),'1.01 ดอลลาร์สิงคโปร์'); assert.match(await page.locator('#currencyRounding').textContent(),/Rounded from/);
  await pick('currencyPrecision','custom'); assert.equal(await page.locator('#customDecimalsControl').isVisible(),true);
  await pick('currencyDecimals','3'); assert.equal(await page.locator('#currencyResult').textContent(),'1.005 ดอลลาร์สิงคโปร์'); assert.equal(await page.locator('#currencyRounding').textContent(),'');
  await pick('currencyDigits','thai'); assert.equal(await page.locator('#currencyResult').textContent(),'๑.๐๐๕ ดอลลาร์สิงคโปร์');
  await page.locator('#currencyCopy').click(); assert.equal(await page.evaluate(()=>window.copied),'๑.๐๐๕ ดอลลาร์สิงคโปร์');
  await pick('currencySelect',''); await pick('currencyStyle','thai'); await pick('currencyPrecision','preserve'); await pick('currencyDigits','preserve');
  await page.locator('#currencyInput').fill('US$1,234.50'); await page.locator('label[for=separatorCommas]').click(); await page.locator('#separatorInput').fill('1234567.50');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const styleButton=page.locator('#currencyStyleButton');
  await styleButton.focus(); await styleButton.press('ArrowDown');
  assert.equal(await styleButton.getAttribute('aria-expanded'),'true');
  await styleButton.press('End'); assert.equal(await page.locator('#currencyStyle').inputValue(),'thai');
  await styleButton.press('Escape'); assert.equal(await styleButton.getAttribute('aria-expanded'),'false');
  await styleButton.press('Enter'); await styleButton.press('Home'); await styleButton.press('ArrowDown'); await styleButton.press('Enter');
  assert.equal(await page.locator('#currencyStyle').inputValue(),'code'); assert.equal(await styleButton.getAttribute('aria-expanded'),'false');
  await styleButton.press('Enter'); await styleButton.press('Home'); await styleButton.press('Tab');
  assert.equal(await page.locator('#currencyStyle').inputValue(),'thai'); assert.equal(await styleButton.getAttribute('aria-expanded'),'false');
  const currencyButton=page.locator('#currencySelectButton'); await currencyButton.click(); await currencyButton.press('h'); await currencyButton.press('Enter');
  assert.equal(await page.locator('#currencySelect').inputValue(),'HKD'); await pick('currencySelect','');
  await styleButton.click(); await page.locator('#separatorHeading').click(); assert.equal(await styleButton.getAttribute('aria-expanded'),'false');
  const triggerStyles=await styleButton.evaluate(el=>({font:getComputedStyle(el).fontSize,height:el.getBoundingClientRect().height}));
  assert.equal(triggerStyles.font,'16px'); assert(triggerStyles.height>=48);
  if(width===390 || width===800) {
   await currencyButton.click();
   const bounds=await page.locator('#formatOptions').boundingBox(); assert(bounds.x>=0 && bounds.x+bounds.width<=width && bounds.y>=0 && bounds.y+bounds.height<=900);

   await currencyButton.press('Escape');
  }

  await page.locator('#themeToggle').click();
  assert.equal(await page.evaluate(()=>localStorage.getItem('theme')),theme==='light'?'dark':'light');
  assert.deepEqual(errors,[]); console.log('PASS browser '+width+'px '+theme); await browser.close();
 }
})().catch(e=>{console.error(e);process.exit(1)});
