const { chromium } = require('playwright'); const fs = require('fs');
const SC = '/tmp/claude-0/-home-claude/dd9ce749-5a99-545b-9acc-0332c785cc1e/scratchpad/';
(async () => {
  const proxy = process.env.HTTPS_PROXY;
  const browser = await chromium.launch({proxy:proxy?{server:proxy}:undefined,args:['--ignore-certificate-errors','--use-gl=swiftshader','--enable-unsafe-swiftshader']});
  const page = await (await browser.newContext({viewport:{width:1400,height:900}})).newPage(); page.setDefaultTimeout(150000);
  const errors=[]; page.on('pageerror',e=>errors.push('PAGEERROR: '+e.message)); page.on('console',m=>{if(m.type()==='error')errors.push(m.text().slice(0,160));});
  await page.route('**/*', async route=>{const u=route.request().url();const map={'deck.gl@9.4.0/dist.min.js':'deck.js','pako_inflate.min.js':'pako.js','jspdf.umd.min.js':'jspdf.js','xlsx.full.min.js':'xlsx.js'};for(const k in map) if(u.includes(k)){const p=SC+'libs/'+map[k];if(fs.existsSync(p))return route.fulfill({path:p,contentType:'application/javascript'});} if(u.startsWith('https://fonts.'))return route.fulfill({status:200,body:'',contentType:'text/css'}); return route.continue();});
  await page.goto('file://'+SC+'test_page.html');
  await page.waitForSelector('#loader[hidden]',{state:'attached'}); await page.waitForTimeout(3000);
  const snap = async () => await page.evaluate(()=>{
    const t=id=>{const e=document.getElementById(id); return e? (e.hidden?'[oculto] ':'')+e.innerText.replace(/\n/g,' ⏐ ').trim() : 'n/a';};
    const vis=id=>{const e=document.getElementById(id); if(!e) return 'n/a'; const cs=getComputedStyle(e); return (e.hidden||cs.display==='none')?'oculto':'visible';};
    const press=sel=>[...document.querySelectorAll(sel)].map(b=>b.dataset.resp||b.dataset.lvl||b.textContent.trim()+':'+ (b.getAttribute('aria-pressed'))).join(',');
    const pr=sel=>[...document.querySelectorAll(sel)].map(b=>(b.dataset.resp||b.dataset.lvl)+'='+b.getAttribute('aria-pressed')+(b.hidden?'(oculto)':'')).join(' ');
    return {
      resp: document.body.dataset.resp,
      atrib: pr('button[data-resp]'), capas: pr('.seg.lvl button'),
      controles: 'colonia:'+vis('col-field')+' avenida:'+vis('av-field')+' buscador:'+vis('q'),
      alc: document.getElementById('alc').value,
      scope: t('scope-label'), barsT: t('bars-title'), bars2T: t('bars2-title'), bars2vis: vis('bars2'),
      kpis: t('kpis').slice(0,320), note: t('bars-note').slice(0,220),
      searchT: t('search-title'), searchC: t('search-count'),
      results: t('results').slice(0,150),
      mapsum: t('mapsum'),
      descargas: [...document.querySelectorAll('[id^=dl-]')].filter(e=>e.id!=='dl-status').map(e=>e.id.replace('dl-','')+(e.hidden?'✗':(e.disabled?'⊘':'✓'))).join(' '),
      colinfo: t('colinfo').slice(0,120), avinfo: t('avinfo').slice(0,120), alcinfo: t('alcinfo').slice(0,160)
    };
  });
  const show = async name => { const s = await snap(); console.log('\n█ '+name); for(const k in s) console.log('   '+k+': '+s[k]); };
  const resp = async r => { await page.click(`button[data-resp="${r}"]`,{noWaitAfter:true}); await page.waitForTimeout(3500); };
  const lvl = async l => { await page.click(`.seg.lvl button[data-lvl="${l}"]`,{noWaitAfter:true}); await page.waitForTimeout(3000); };
  const alc = async name => { const i=await page.$eval('#alc',e=>[...e.options].findIndex(o=>o.text.includes('Azcapotzalco'))); await page.selectOption('#alc',{index: name? i : 0}); await page.waitForTimeout(5000); };
  const col = async q => { await page.fill('#col-q',q); await page.waitForTimeout(1800); const li=await page.$$('#col-list li[role=option]'); if(li.length) await li[0].click({noWaitAfter:true}); await page.waitForTimeout(4500); };
  const av = async q => { await page.fill('#av-q',q); await page.waitForTimeout(1800); const li=await page.$$('#av-list li[role=option]'); if(li.length) await li[0].click({noWaitAfter:true}); await page.waitForTimeout(4500); };

  await show('1. inicio · alcaldías · ciudad');
  await alc(true); await show('2. alcaldías · Azcapotzalco');
  await col('Trabajadores del Hierro'); await show('3. alcaldías · colonia');
  await resp('gc'); await show('4. + Gobierno Central (ambas) sobre colonia');
  await resp('alc'); await show('5. solo Gobierno Central');
  await av('Circuito Interior'); await show('6. GC · avenida');
  await resp('alc'); await show('7. de vuelta a Alcaldías desde avenida');
  console.log('\nerrors:', errors.length?errors.join('\n'):'none');
  await browser.close();
})().catch(e=>{console.error('FAILED',e.message);process.exit(1)});
