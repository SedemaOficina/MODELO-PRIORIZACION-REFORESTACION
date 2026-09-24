const { chromium } = require('playwright'); const fs = require('fs');
const SC = '/tmp/claude-0/-home-claude/dd9ce749-5a99-545b-9acc-0332c785cc1e/scratchpad/'; const O=SC+'b2/';
const route = async route=>{const u=route.request().url();const map={'deck.gl@9.4.0/dist.min.js':'deck.js','pako_inflate.min.js':'pako.js','jspdf.umd.min.js':'jspdf.js','xlsx.full.min.js':'xlsx.js'};for(const k in map) if(u.includes(k)){const p=SC+'libs/'+map[k];if(fs.existsSync(p))return route.fulfill({path:p,contentType:'application/javascript'});} if(u.startsWith('https://fonts.'))return route.fulfill({status:200,body:'',contentType:'text/css'}); return route.continue();};
const log=(...a)=>console.log(...a);
(async () => {
  const body = fs.readFileSync(SC+'calles_prioritarias.html','utf8');
  fs.writeFileSync(SC+'test_page.html','<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'+body+'</body></html>');
  const proxy = process.env.HTTPS_PROXY;
  const browser = await chromium.launch({proxy:proxy?{server:proxy}:undefined,args:['--ignore-certificate-errors','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const ctx = await browser.newContext({viewport:{width:1440,height:900}, acceptDownloads:true});
  const page = await ctx.newPage(); page.setDefaultTimeout(150000);
  const errors=[]; page.on('pageerror',e=>errors.push('PAGEERROR: '+e.message)); page.on('console',m=>{ if(m.type()==='error') errors.push(m.text().slice(0,200)); });
  page.on('download', async d=>{ await d.saveAs(O+d.suggestedFilename()); log('  ↓', d.suggestedFilename()); });
  await page.route('**/*', route);
  await page.goto('file://'+SC+'test_page.html'); await page.waitForSelector('#loader[hidden]',{state:'attached'}); await page.waitForTimeout(3000);
  const T = s=>page.$eval(s,e=>e.innerText.replace(/\n/g,' | ')).catch(()=>'n/a');
  const top = s=>page.$eval(s,e=>Math.round(e.getBoundingClientRect().top)).catch(()=>-1);
  const state = async n=>{ log('== '+n); log('  ruta:', await T('#crumb'), '| título:', await T('#scope-title'));
    log('  acción:', await T('#act-main'), 'disabled=', await page.$eval('#act-main',e=>e.disabled), '| ficha:', await page.$eval('#act-ficha',e=>e.hidden?'oculta':e.dataset.target), '| hint:', await T('#act-hint'));
    log('  top kpis', await top('#kpis'), 'top acción', await top('#act-main'), '| pestaña listado:', await T('#tab-list')); };
  await state('inicio'); await page.screenshot({path:O+'d1.png'});
  const omniQ = async q=>{ await page.fill('#omni',''); await page.fill('#omni', q); await page.waitForTimeout(900); return (await T('#omni-list')); };
  for (const q of ['Calzada Ignacio Zaragoza','Calz Zaragoza','Ignacio Zaragoza','santa cruz meyehualco','ermita zaragoza','iztapalapa','benito juarez','insurgentes sur','cuahutemoc'])
    log('BUSCA', JSON.stringify(q), '→', (await omniQ(q)).slice(0,420));
  // alcaldía
  await omniQ('iztapalapa'); await page.keyboard.press('Enter'); await page.waitForTimeout(6000);
  await state('alcaldía por buscador'); await page.screenshot({path:O+'d2_alc.png'});
  await page.click('#tab-list'); await page.waitForTimeout(800); log('  listado:', (await T('#tp-list')).slice(0,200));
  await page.click('#act-main'); await page.waitForTimeout(9000);
  // avenida
  await omniQ('calz zaragoza'); await page.keyboard.press('Enter'); await page.waitForTimeout(6000);
  await state('avenida'); await page.screenshot({path:O+'d3_av.png'});
  await page.$eval('#cr-rest .cr-up', e=>e.click()); await page.waitForTimeout(5000); await state('tras quitar avenida');
  // colonia
  await omniQ('ermita zaragoza'); await page.keyboard.press('Enter'); await page.waitForTimeout(6000);
  await state('colonia'); await page.screenshot({path:O+'d4_col.png'});
  await page.$eval('#cr-rest .cr-up', e=>e.click()); await page.waitForTimeout(5000); await state('tras quitar colonia');
  // calle con muchas colonias
  await omniQ('benito juarez'); const opts = await page.$$eval('#omni-list li.opt', a=>a.map(x=>x.innerText.replace(/\n/g,' ')));
  const iSt = opts.findIndex(t=>t.startsWith('Calle')); log('  opción calle índice', iSt, opts[iSt]);
  if (iSt>=0){ const els = await page.$$('#omni-list li.opt'); await els[iSt].dispatchEvent('mousedown'); await page.waitForTimeout(6000); await state('calle homónima'); log('  listado:', (await T('#tp-list')).slice(0,260)); }
  await page.click('#cr-city'); await page.waitForTimeout(5000); await state('volver a ciudad');
  // ayuda
  await page.click('#open-info'); await page.waitForTimeout(1500); await page.screenshot({path:O+'d5_ayuda.png'}); log('ayuda:', (await T('.howto')).slice(0,160));
  await page.keyboard.press('Escape'); await page.close();
  // teléfono
  const mp = await (await browser.newContext({viewport:{width:390,height:844}, isMobile:true, hasTouch:true})).newPage(); mp.setDefaultTimeout(150000);
  mp.on('pageerror',e=>errors.push('M PAGEERROR: '+e.message));
  await mp.route('**/*', route);
  await mp.goto('file://'+SC+'test_page.html'); await mp.waitForSelector('#loader[hidden]',{state:'attached'}); await mp.waitForTimeout(3500);
  const ph = async n=>log('M '+n, JSON.stringify(await mp.evaluate(()=>({cls:document.body.className, panelH:Math.round(document.querySelector('.panel').getBoundingClientRect().height), docW:document.documentElement.scrollWidth, grip:document.getElementById('sheet-label').textContent}))));
  await ph('inicio'); await mp.screenshot({path:O+'m1_peek.png'});
  await mp.click('#sheet',{noWaitAfter:true}); await mp.waitForTimeout(1200); await ph('tras asa'); await mp.screenshot({path:O+'m2_half.png'});
  await mp.click('#sheet',{noWaitAfter:true}); await mp.waitForTimeout(1200); await ph('tras asa 2');
  await mp.click('#sheet',{noWaitAfter:true}); await mp.waitForTimeout(1200); await ph('tras asa 3');
  await mp.tap('#omni'); await mp.waitForTimeout(1200); await ph('foco buscador');
  await mp.fill('#omni','coyoacan'); await mp.waitForTimeout(900); await mp.screenshot({path:O+'m3_buscar.png'});
  await mp.keyboard.press('Enter'); await mp.waitForTimeout(6000); await ph('alcaldía elegida'); await mp.screenshot({path:O+'m4_alc.png'});
  log('errors:', errors.length? errors.join('\n') : 'none');
  await browser.close();
})().catch(e=>{console.error('FAILED',e.message);process.exit(1)});
