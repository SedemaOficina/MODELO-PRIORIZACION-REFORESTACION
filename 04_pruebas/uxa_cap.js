const { chromium } = require('playwright'); const fs = require('fs');
const SC = '/tmp/claude-0/-home-claude/dd9ce749-5a99-545b-9acc-0332c785cc1e/scratchpad/'; const O = SC+'uxa/';
const route = async route=>{const u=route.request().url();const map={'deck.gl@9.4.0/dist.min.js':'deck.js','pako_inflate.min.js':'pako.js','jspdf.umd.min.js':'jspdf.js','xlsx.full.min.js':'xlsx.js'};for(const k in map) if(u.includes(k)){const p=SC+'libs/'+map[k];if(fs.existsSync(p))return route.fulfill({path:p,contentType:'application/javascript'});} if(u.startsWith('https://fonts.'))return route.fulfill({status:200,body:'',contentType:'text/css'}); return route.continue();};
(async () => {
  const proxy = process.env.HTTPS_PROXY;
  const browser = await chromium.launch({proxy:proxy?{server:proxy}:undefined,args:['--ignore-certificate-errors','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  // ---------- escritorio ----------
  const page = await (await browser.newContext({viewport:{width:1440,height:900}})).newPage(); page.setDefaultTimeout(150000);
  await page.route('**/*', route);
  const t0=Date.now();
  await page.goto('file://'+SC+'test_page.html');
  await page.waitForSelector('#loader[hidden]',{state:'attached'}); console.log('carga ms (swiftshader):', Date.now()-t0);
  await page.waitForTimeout(3000);
  const shot = async n => { await page.waitForTimeout(1500); await page.screenshot({path:O+n+'.png', timeout:150000}); console.log('shot', n); };
  await shot('d1_inicio');
  // métricas
  const m = await page.evaluate(()=>{
    const panel = document.querySelector('.panel, aside, #panel, .side') || document.body;
    const lum = c=>{ const m=c.match(/[\d.]+/g); if(!m) return null; const [r,g,b]=m.slice(0,3).map(v=>{v/=255; return v<=0.03928? v/12.92 : Math.pow((v+0.055)/1.055,2.4)}); return 0.2126*r+0.7152*g+0.0722*b; };
    const bgOf = el=>{ while(el){ const c=getComputedStyle(el).backgroundColor; if(c && !c.includes('rgba(0, 0, 0, 0)') && c!=='transparent') return c; el=el.parentElement;} return 'rgb(255,255,255)'; };
    const out=[]; const seen=new Set();
    document.querySelectorAll('body *').forEach(el=>{ if(!el.childNodes.length) return; const txt=[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join(' ').trim(); if(!txt) return; const r=el.getBoundingClientRect(); if(!r.width||!r.height) return; const cs=getComputedStyle(el); if(cs.visibility==='hidden'||cs.display==='none') return;
      const L1=lum(cs.color), L2=lum(bgOf(el)); if(L1==null||L2==null) return; const cr=(Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05); const fs=parseFloat(cs.fontSize); const key=cs.color+'|'+fs;
      if(cr<4.5 && !seen.has(key)){ seen.add(key); out.push({t:txt.slice(0,40), color:cs.color, bg:bgOf(el), fs, cr:+cr.toFixed(2)}); } });
    const fsz={}; document.querySelectorAll('body *').forEach(el=>{ const txt=[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join(''); if(!txt) return; const r=el.getBoundingClientRect(); if(!r.width) return; const f=Math.round(parseFloat(getComputedStyle(el).fontSize)*10)/10; fsz[f]=(fsz[f]||0)+1; });
    const side = document.querySelector('#side, .sidebar, aside, .panel'); 
    const sc = side? {sel: side.className||side.id, scrollH: side.scrollHeight, clientH: side.clientHeight} : null;
    const ctrls = document.querySelectorAll('button:not([hidden]), select, input, [role=button]').length;
    const heads=[...document.querySelectorAll('h1,h2,h3,h4')].filter(h=>h.getBoundingClientRect().width).map(h=>h.tagName+':'+h.innerText.slice(0,30));
    return {lowContrast:out.slice(0,30), fontSizes:fsz, sidebar:sc, controls:ctrls, heads};
  });
  fs.writeFileSync(O+'metricas_escritorio.json', JSON.stringify(m,null,1));
  console.log('sidebar', JSON.stringify(m.sidebar), 'controles', m.controls);
  // alcaldía
  const ix = await page.$eval('#alc', e=>[...e.options].findIndex(o=>o.text.includes('Iztapalapa')));
  await page.selectOption('#alc',{index:ix}); await page.waitForTimeout(6000); await shot('d2_alcaldia');
  // panel completo (captura alta del sidebar)
  const sideSel = await page.evaluate(()=>{ const s=document.querySelector('#side, .sidebar, aside, .panel'); return s? (s.id? '#'+s.id : '.'+[...s.classList].join('.')) : null; });
  console.log('sideSel', sideSel);
  if (sideSel){ const h = await page.$eval(sideSel, e=>e.scrollHeight); console.log('altura panel con alcaldía:', h);
    await page.setViewportSize({width:1440, height:Math.min(h+40, 5200)}); await page.waitForTimeout(3000);
    await page.screenshot({path:O+'d2b_panel_completo.png', clip:{x:0,y:0,width:400,height:Math.min(h,5200)}, timeout:150000}); console.log('shot panel');
    await page.setViewportSize({width:1440, height:900}); await page.waitForTimeout(2500); }
  // colonia + tarjeta
  await page.fill('#col-q','Santa Martha Acatitla'); await page.waitForTimeout(1800);
  let li=await page.$$('#col-list li[role=option]'); if(li.length) await li[0].click({noWaitAfter:true}); await page.waitForTimeout(5000); await shot('d3_colonia');
  // GC + avenida
  await page.click('button[data-resp="gc"]',{noWaitAfter:true}); await page.waitForTimeout(1500);
  await page.click('button[data-resp="alc"]',{noWaitAfter:true}); await page.waitForTimeout(4000);
  await page.fill('#av-q','Calzada Ignacio Zaragoza'); await page.waitForTimeout(1800);
  li=await page.$$('#av-list li[role=option]'); if(li.length) await li[0].click({noWaitAfter:true}); await page.waitForTimeout(5000); await shot('d4_gc_avenida');
  // ayuda
  await page.click('button[aria-label*="Cómo se prioriz"]',{noWaitAfter:true}); await page.waitForTimeout(2500); await shot('d5_ayuda');
  await page.close();
  // ---------- móvil ----------
  const mp = await (await browser.newContext({viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true, hasTouch:true})).newPage(); mp.setDefaultTimeout(150000);
  await mp.route('**/*', route);
  await mp.goto('file://'+SC+'test_page.html'); await mp.waitForSelector('#loader[hidden]',{state:'attached'}); await mp.waitForTimeout(3500);
  await mp.screenshot({path:O+'m1_inicio.png', timeout:150000}); console.log('shot m1');
  const mm = await mp.evaluate(()=>{ const small=[]; document.querySelectorAll('button, a, select, input, [role=button], [role=option], .legend .row').forEach(el=>{ const r=el.getBoundingClientRect(); const cs=getComputedStyle(el); if(!r.width||cs.display==='none'||cs.visibility==='hidden') return; if(r.height<44||r.width<44) small.push({t:(el.innerText||el.getAttribute('aria-label')||el.tagName).trim().slice(0,30), w:Math.round(r.width), h:Math.round(r.height)}); }); return small; });
  fs.writeFileSync(O+'metricas_movil_tactiles.json', JSON.stringify(mm,null,1)); console.log('objetivos <44px en móvil:', mm.length);
  // abrir hoja
  const handle = await mp.$('.sheet-handle, .handle, #sheet-handle, .grab'); if(handle){ await handle.click({noWaitAfter:true}); await mp.waitForTimeout(2500); }
  else { await mp.evaluate(()=>document.body.classList.add('sheet-open')); await mp.waitForTimeout(2000); }
  await mp.screenshot({path:O+'m2_hoja.png', timeout:150000}); console.log('shot m2');
  await browser.close();
})().catch(e=>{console.error('FAILED',e.message);process.exit(1)});
