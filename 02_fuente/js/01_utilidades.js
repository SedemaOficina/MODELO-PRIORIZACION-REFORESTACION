// Utilidades: acceso al DOM y formatos de número y distancia.
const $ = id => document.getElementById(id);
const PRIO_VARS = ['--p0','--p1','--p2','--p3','--p4'];
const fmt = new Intl.NumberFormat('es-MX');
const fmt1 = new Intl.NumberFormat('es-MX',{maximumFractionDigits:1});
const fmt0 = new Intl.NumberFormat('es-MX',{maximumFractionDigits:0});
const pct = (a,b)=> b? fmt1.format(100*a/b)+' %' : '—';
const kmTxt = v => v>=10? fmt0.format(v) : v>=1? fmt1.format(v) : v>0? fmt.format(Math.max(1,Math.round(v*1000))) : '0';
const kmUn = v => (v>0 && v<1)? 'm' : 'km';
const kmFull = v => kmTxt(v)+' '+kmUn(v);
const sum = a => a.reduce((x,y)=>x+y,0);
