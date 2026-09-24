const { chromium } = require('playwright'); const fs = require('fs');
const SC = '/tmp/claude-0/-home-claude/dd9ce749-5a99-545b-9acc-0332c785cc1e/scratchpad/'; const O=SC+'b1/';
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
  await page.screenshot({path:O+'d1.png'});
  log('LEYENDA:', await T('.legend')); log('scale:', await T('#scalebar'));
  log('header h:', await page.$eval('.panel-head', e=>Math.round(e.getBoundingClientRect().height)));
  // contraste mínimo de textos visibles
  log('contraste:', JSON.stringify(await page.evaluate(()=>{ const lum=c=>{const m=c.match(/[\d.]+/g); const [r,g,b]=m.slice(0,3).map(v=>{v/=255; return v<=0.03928? v/12.92 : Math.pow((v+0.055)/1.055,2.4)}); return 0.2126*r+0.7152*g+0.0722*b;};
    const bgOf=el=>{while(el){const c=getComputedStyle(el).backgroundColor; if(c && c!=='rgba(0, 0, 0, 0)' && c!=='transparent') return c; el=el.parentElement;} return 'rgb(255,255,255)';};
    const bad=[]; const sizes=new Set(); document.querySelectorAll('body *').forEach(el=>{ const t=[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join(''); if(!t) return; const r=el.getBoundingClientRect(); if(!r.width) return; const cs=getComputedStyle(el); if(cs.visibility==='hidden'||cs.display==='none') return; sizes.add(parseFloat(cs.fontSize)); const a=lum(cs.color), b=lum(bgOf(el)); const cr=(Math.max(a,b)+0.05)/(Math.min(a,b)+0.05); if(cr<4.5) bad.push(t.slice(0,30)+' '+cr.toFixed(2)); });
    return {bajo45:bad.slice(0,8), nBajo:bad.length, tamaños:[...sizes].sort((a,b)=>a-b)}; })));
  // alcaldía
  const ix = await page.$eval('#alc', e=>[...e.options].findIndex(o=>o.text.includes('Iztapalapa')));
  await page.selectOption('#alc',{index:ix}); await page.waitForTimeout(6000);
  log('IZT titulo:', await T('#search-title'), '//', await T('#search-count'));
  log('IZT lista:', (await T('#results')).slice(0,600));
  log('IZT leyenda km:', await T('#legend-rows'), '/', await T('#lg-scope'));
  await page.screenshot({path:O+'d2_izt.png'});
  await page.$eval('#dl-calles', e=>{e.scrollIntoView({block:'center'}); e.click();}); await page.waitForTimeout(8000);
  // colonia con etiquetas
  await page.fill('#col-q','Ermita Zaragoza'); await page.waitForTimeout(1800);
  let li=await page.$$('#col-list li[role=option]'); if(li.length) await li[0].click({noWaitAfter:true}); await page.waitForTimeout(5000);
  await page.click('#card .close',{noWaitAfter:true}).catch(()=>{});
  await page.click('#zin',{noWaitAfter:true}); await page.waitForTimeout(4000);
  log('scale colonia:', await T('#scalebar'));
  await page.screenshot({path:O+'d3_etiquetas.png'});
  // clic en el centro para abrir ficha de frente
  const mb = await page.$eval('#map', e=>{const r=e.getBoundingClientRect(); return {x:r.x+r.width/2, y:r.y+r.height/2};});
  let got=false; for (const [dx,dy] of [[0,0],[12,0],[0,12],[-12,0],[0,-12],[20,20],[-20,-20],[30,0],[0,30]]){ await page.mouse.click(mb.x+dx, mb.y+dy); await page.waitForTimeout(2500); const c = await page.$eval('#card', e=>e.hidden? '' : e.innerText).catch(()=>''); if (c && c.includes('Cómo llegar')){ got=true; log('FICHA frente:', c.replace(/\n/g,' | ').slice(0,400)); break; } }
  if (!got) log('FICHA frente: no se abrió con clic');
  await page.screenshot({path:O+'d4_ficha.png'});
  log('enlaces campo:', JSON.stringify(await page.$$eval('#card a.fa', as=>as.map(a=>a.href))));
  // colonia vacía
  await page.fill('#col-q','Adame Macias'); await page.waitForTimeout(1800);
  li=await page.$$('#col-list li[role=option]'); if(li.length) await li[0].click({noWaitAfter:true}); await page.waitForTimeout(5000);
  log('VACIA kpis:', await T('#kpis')); log('VACIA mapsum:', await T('#mapsum')); log('VACIA nota:', await T('#bars-note')); log('VACIA ficha:', await T('#card'));
  await page.screenshot({path:O+'d5_vacia.png'});
  await page.close();
  // teléfono
  const mp = await (await browser.newContext({viewport:{width:390,height:844}, isMobile:true, hasTouch:true})).newPage(); mp.setDefaultTimeout(150000);
  mp.on('pageerror',e=>errors.push('M PAGEERROR: '+e.message));
  await mp.route('**/*', route);
  await mp.goto('file://'+SC+'test_page.html'); await mp.waitForSelector('#loader[hidden]',{state:'attached'}); await mp.waitForTimeout(3500);
  log('MOVIL 390:', JSON.stringify(await mp.evaluate(()=>({innerW:innerWidth, docW:document.documentElement.scrollWidth, wide:[...document.querySelectorAll('body *')].filter(e=>{const b=e.getBoundingClientRect(); return b.width && b.right>392;}).slice(0,5).map(e=>(e.className||e.id||e.tagName).toString().slice(0,30)+':'+Math.round(e.getBoundingClientRect().right))}))));
  await mp.screenshot({path:O+'m1.png'});
  await mp.click('#legend-toggle',{noWaitAfter:true}).catch(()=>{}); await mp.waitForTimeout(1500);
  await mp.screenshot({path:O+'m2_capas.png'});
  await mp.setViewportSize({width:360,height:780}); await mp.waitForTimeout(2000);
  log('MOVIL 360:', JSON.stringify(await mp.evaluate(()=>({innerW:innerWidth, docW:document.documentElement.scrollWidth}))));
  log('errors:', errors.length? errors.join('\n') : 'none');
  await browser.close();
})().catch(e=>{console.error('FAILED',e.message);process.exit(1)});
