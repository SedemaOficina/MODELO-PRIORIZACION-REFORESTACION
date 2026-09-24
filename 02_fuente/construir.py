# -*- coding: utf-8 -*-
import re
import os
# Todas las piezas de la fuente viven junto a este archivo; el resultado se escribe en ../docs/index.html
# (página completa para GitHub Pages y el SIA). Con --artefacto RUTA escribe además la versión
# sin esqueleto que se publica como artefacto de Claude.
import sys
SC = os.path.dirname(os.path.abspath(__file__)) + os.sep
SALIDA = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'docs', 'index.html')
lines = open(SC + 'v6.html', encoding='utf-8').read().split('\n')
# el artefacto publicado viene envuelto en el esqueleto; el archivo fuente empieza en <title>
first = next(i for i, l in enumerate(lines) if l.startswith('<title>'))
src = '\n'.join(lines[first:])
src = re.sub(r'\s*</body></html>\s*$', '\n', src)
head, rest = src.split('<script src="https://cdn.jsdelivr.net/npm/deck.gl', 1)
libs = '<script src="https://cdn.jsdelivr.net/npm/deck.gl' + rest.split('<script id="meta-b64"', 1)[0]

def rep(old, new, count=1):
    global head
    assert head.count(old) >= 1, 'no encontrado: ' + old[:60]
    head = head.replace(old, new, count)

# ---------- CSS ----------
rep("--map-alc:#8A8C8E; --map-col:#B9B3A8; --map-label:#55585A; --map-sel:#9D2148;",
    "--map-alc:#8A8C8E; --map-col:#B9B3A8; --map-label:#55585A; --map-sel:#273A45; --map-vp:#6E7174;")
rep(".seg button:first-child{border-left:0}",
    """.seg button:first-child{border-left:0}
.seg button[hidden]{display:none}
/* bloques de consulta: 1 atribución · 2 territorio · 3 resultados */
.block{display:flex;flex-direction:column;gap:12px}
.block .field+.field{margin-top:0}
.block-h{display:flex;align-items:flex-start;gap:10px;justify-content:space-between}
.block-h>div{flex:1;min-width:0}
.block-h .num{display:grid;place-items:center;width:21px;height:21px;border-radius:50%;background:var(--guinda);color:#fff;font-family:Cabin,sans-serif;font-weight:700;font-size:12px;flex:none;margin-top:1px}
.block-h h2{margin:2px 0 0;font-size:16px;line-height:1.2;font-weight:700;color:var(--ink);text-wrap:balance}
.block-h .eyebrow{display:block}
.block-comp{background:var(--panel-2);border:1px solid var(--line);border-left:3px solid var(--guinda);border-radius:7px;padding:13px 14px 12px;gap:10px}
.res-h{margin-bottom:-10px}
.chips{display:grid;gap:8px}
.chip{position:relative;display:grid;grid-template-columns:26px 1fr;gap:1px 9px;align-content:start;width:100%;text-align:left;padding:10px 24px 10px 10px;border:1.5px solid var(--line-strong);border-radius:8px;background:var(--panel);cursor:pointer;box-shadow:0 1px 2px rgba(36,38,42,.05);transition:background .12s ease,border-color .12s ease}
.chip .ic{grid-row:1/3;align-self:start;width:26px;height:26px;border-radius:7px;background:rgba(157,33,72,.08);padding:5px;stroke:var(--guinda);fill:none;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.chip b{font-family:Cabin,sans-serif;font-size:13.5px;font-weight:700;line-height:1.25}
.chip small{grid-column:2;font-size:11px;color:var(--ink-3);line-height:1.3}
.chip i{position:absolute;right:8px;top:11px;width:13px;height:13px;border:1.5px solid var(--line-strong);border-radius:4px;background:var(--panel)}
.chip[aria-pressed="true"]{background:var(--guinda);border-color:var(--guinda);color:#fff;box-shadow:0 1px 3px rgba(157,33,72,.3)}
.chip[aria-pressed="true"] small{color:rgba(255,255,255,.8)}
.chip[aria-pressed="true"] .ic{background:rgba(255,255,255,.16);stroke:#fff}
.chip[aria-pressed="true"] i{border-color:rgba(255,255,255,.9);background:transparent}
.chip[aria-pressed="true"] i::after{content:"";position:absolute;left:3px;top:0;width:4px;height:8px;border:solid #fff;border-width:0 2px 2px 0;transform:rotate(45deg)}
.chip:hover:not([aria-pressed="true"]){background:var(--panel-2);border-color:var(--ink-3)}
/* detalle del mapa: píldoras ligeras, distintas de los chips de atribución */
.seg.pills{display:flex;flex-wrap:wrap;gap:6px;border:0;border-radius:0;background:transparent;overflow:visible}
.seg.pills button{padding:6px 11px;border:1.5px solid var(--line-strong);border-left:1.5px solid var(--line-strong);border-radius:999px;font-size:12.5px;background:var(--panel)}
.seg.pills button i{width:11px;height:11px;margin-right:6px;vertical-align:-1px}
.seg.pills button[aria-pressed="true"]{background:var(--dorado-soft);border-color:var(--dorado);color:var(--guinda-ink)}
.seg.pills button[aria-pressed="true"] i::after{border-color:var(--guinda-ink)}""")
rep(".kpi .l{font-size:11.5px;color:var(--ink-2);margin-top:4px;line-height:1.3}",
    ".kpi .l{font-size:11.5px;color:var(--ink-2);margin-top:4px;line-height:1.3}\n.kpis.dual .cap{grid-column:1/-1;padding:6px 12px 4px;font-family:Cabin,sans-serif;font-size:11px;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-3);font-weight:600;background:var(--panel);border-top:1px solid var(--line)}\n.kpis.dual .cap:first-child{border-top:0}\n.kpis.dual .kpi{border-top:1px solid var(--line)}\n.gcline{display:block;margin-top:4px;color:var(--guinda);font-weight:500}")
rep(".legend .hint{margin:6px 0 0;color:var(--ink-3);font-size:11px}",
    ".legend .hint{margin:6px 0 0;color:var(--ink-3);font-size:11px}\n.legend .static{cursor:default;border-top:1px solid var(--line);margin-top:5px;padding-top:6px;font-size:11.5px;color:var(--ink-2);align-items:flex-start}\n.legend .sw{width:22px;height:5px;border-radius:2px;flex:none;margin-top:6px}\n.legend .sw.ctx{background:var(--map-vp);height:3px;margin-top:7px}\n.legend .sw.thick{height:7px;margin-top:5px;background:linear-gradient(90deg,var(--p4),var(--p3),var(--p2),var(--p1),var(--p0))}")
rep(".card .dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px;vertical-align:-1px}",
    ".card .dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px;vertical-align:-1px}\n.card .act{margin-top:10px;width:100%;padding:8px 12px;font-size:13px}")

# ---------- refinamiento de controles (estilo herramienta de diseño) ----------
rep('@media (prefers-reduced-motion:reduce){ .bars .fill{transition:none} }',
'''@media (prefers-reduced-motion:reduce){ .bars .fill{transition:none} }
/* --- refinamiento de controles --- */
:focus-visible{outline:2px solid var(--focus);outline-offset:2px;border-radius:4px}
.select-wrap select,.combo input,.search input{border-color:var(--line);box-shadow:0 1px 2px rgba(36,38,42,.05);transition:border-color .12s ease,box-shadow .12s ease}
.select-wrap select:hover,.combo input:hover,.search input:hover{border-color:var(--ink-3)}
.select-wrap select:focus,.combo input:focus,.search input:focus{border-color:var(--dorado);box-shadow:0 0 0 3px rgba(178,142,92,.22);outline:none}
.seg.pills button{box-shadow:0 1px 2px rgba(36,38,42,.05);transition:background .12s ease,border-color .12s ease}
.seg.pills button:hover:not([aria-pressed="true"]){border-color:var(--ink-3)}
.seg.pills button[aria-pressed="true"]{box-shadow:0 1px 2px rgba(178,142,92,.28)}
.btn{border-radius:8px;box-shadow:0 1px 2px rgba(36,38,42,.06);transition:background .12s ease,border-color .12s ease,box-shadow .12s ease}
.btn:active{transform:translateY(1px)}
.reset{border:1px solid transparent;border-radius:6px;padding:3px 8px;transition:background .12s ease,border-color .12s ease}
.reset:hover{background:var(--panel-2);border-color:var(--line)}
/* menús de autocompletado con filas redondeadas */
.combo-list{padding:6px;border-radius:10px;border-color:var(--line);box-shadow:0 10px 30px rgba(36,38,42,.16)}
.combo-list li{border-radius:6px;padding:7px 9px}
.results{border-radius:10px}
.results li{transition:background .12s ease}
/* barra de herramientas del mapa agrupada */
.toolbar{gap:0;background:var(--panel);border:1px solid var(--line);border-radius:9px;box-shadow:0 4px 14px rgba(36,38,42,.12);overflow:hidden}
.tool{width:34px;height:34px;border:0;border-radius:0;box-shadow:none;border-top:1px solid var(--line);transition:background .12s ease,color .12s ease}
.tool:first-child{border-top:0}
.tool:hover{background:var(--panel-2)}
.legend{border-radius:10px;box-shadow:0 6px 22px rgba(36,38,42,.13)}
.legend .row{border-radius:5px;padding:3px 5px;margin:0 -5px;transition:background .12s ease}
.legend .row:hover{background:var(--panel-2)}
.legend .row.static:hover{background:transparent}
.card{border-radius:10px;box-shadow:0 10px 30px rgba(36,38,42,.16)}
/* palomitas: trazo SVG en vez del truco de bordes rotados */\n:root{--check:url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M3.4 8.7l3 3.1 6.2-6.9' fill='none' stroke='%23000' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")}\n.chip i,.seg.pills button i{background:var(--panel);border:1.5px solid var(--line-strong);border-radius:4px}\n.chip i{width:14px;height:14px;right:9px;top:11px}\n.seg.pills button i{width:13px;height:13px;margin-right:7px;vertical-align:-2px}\n.chip i::after,.seg.pills button i::after{content:\"\";position:absolute;left:0;top:0;right:0;bottom:0;width:auto;height:auto;border:0;transform:none;background:transparent;-webkit-mask:var(--check) center/78% no-repeat;mask:var(--check) center/78% no-repeat}\n.chip[aria-pressed=\"true\"] i{background:#fff;border-color:#fff}\n.chip[aria-pressed=\"true\"] i::after{left:0;top:0;right:0;bottom:0;width:auto;height:auto;border:0;transform:none;background:var(--guinda)}\n.seg.pills button[aria-pressed=\"true\"] i{background:var(--guinda-ink);border-color:var(--guinda-ink)}\n.seg.pills button[aria-pressed=\"true\"] i::after{background:var(--dorado-soft)}\n/* diagrama de tramos en la metodología */
.diag{margin:14px 0 4px;border:1px solid var(--line);border-radius:10px;background:var(--panel-2);padding:14px 16px 10px}
.diag svg{display:block;width:100%;height:auto}
.diag figcaption{font-size:12px;color:var(--ink-3);margin-top:8px;line-height:1.45}''')

# ---------- panel: reestructura en dos consultas ----------
rep('<p>Consulta por alcaldía y colonia los frentes de manzana donde el modelo de priorización indica plantar primero.</p>',
    '<p>Dos consultas en una: a quién le corresponde atender cada calle y qué dice el modelo de priorización sobre ella.</p>')

i0 = head.index('      <div class="field">\n        <div class="lblrow">')
i1 = head.index('<div class="colinfo" id="colinfo" hidden></div>')
end = head.index('\n      </div>\n', i1) + len('\n      </div>\n')
head = head[:i0] + '''      <div class="block block-comp">
        <div class="block-h"><span class="num">1</span><div><span class="eyebrow">Atribución</span><h2 id="resp-label">¿A quién le corresponde?</h2></div></div>
        <div class="chips" role="group" aria-labelledby="resp-label">
          <button type="button" class="chip" data-resp="alc" aria-pressed="true"><svg class="ic" viewBox="0 0 24 24"><path d="M3 21h18M5 21V8l7-4 7 4v13M9.5 21v-4h5v4M9 11.5h1.5M13.5 11.5H15"/></svg><b>Alcaldías</b><small>Calles y frentes de manzana</small><i></i></button>
          <button type="button" class="chip" data-resp="gc" aria-pressed="false"><svg class="ic" viewBox="0 0 24 24"><path d="M8 3.5 4 20.5M16 3.5l4 17M12 4v3M12 10.5v3M12 17v3"/></svg><b>Gobierno Central</b><small>Vialidades primarias</small><i></i></button>
        </div>
        <p class="note" id="resp-note">Frentes de manzana que plantan las alcaldías; las vialidades primarias aparecen en gris. Puedes activar las dos.</p>
      </div>

      <div class="block">
        <div class="block-h"><span class="num">2</span><div><span class="eyebrow">Modelo de priorización</span><h2>¿Qué territorio consultas?</h2></div><button type="button" class="reset" id="reset-all" title="Quitar atribución, alcaldía, colonia, búsquedas y capas"><svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.3-5.7M4 4v5h5"/></svg>Reiniciar</button></div>
        <div class="field">
          <label for="alc">Alcaldía</label>
          <div class="select-wrap"><select id="alc"><option value="">Toda la Ciudad de México</option></select></div>
          <div class="colinfo" id="alcinfo" hidden></div>
        </div>
        <div class="field" id="col-field">
          <label for="col-q">Colonia</label>
          <div class="combo">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>
            <input id="col-q" type="text" placeholder="Escribe el nombre de la colonia…" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="col-list">
            <button class="clear" id="col-clear" type="button" aria-label="Quitar colonia" hidden>×</button>
            <ul class="combo-list" id="col-list" role="listbox" hidden></ul>
          </div>
          <div class="colinfo" id="colinfo" hidden></div>
        </div>
        <div class="field" id="av-field" hidden>
          <label for="av-q">Avenida o eje</label>
          <div class="combo">
            <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>
            <input id="av-q" type="text" placeholder="Escribe el nombre de la avenida…" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="av-list">
            <button class="clear" id="av-clear" type="button" aria-label="Quitar avenida" hidden>×</button>
            <ul class="combo-list" id="av-list" role="listbox" hidden></ul>
          </div>
          <div class="colinfo" id="avinfo" hidden></div>
        </div>
        <div class="field">
          <label id="lvl-label">Detalle en el mapa</label>
          <div class="seg lvl pills" role="group" aria-labelledby="lvl-label">
            <button type="button" data-lvl="alc" aria-pressed="false"><i></i>Alcaldías</button>
            <button type="button" data-lvl="col" aria-pressed="true"><i></i>Colonias</button>
            <button type="button" data-lvl="fr" aria-pressed="true"><i></i>Calles</button>
          </div>
          <p class="note" id="lvl-note">Colonias y Calles se pueden combinar. Alcaldías se muestra sola, coloreada con la prioridad predominante de cada demarcación.</p>
        </div>
      </div>
''' + head[end:]

rep('      <div class="kpis" id="kpis"></div>',
    '''      <div class="block-h res-h"><span class="num">3</span><div><span class="eyebrow">Resultados</span><h2>Lo que indica el modelo</h2></div></div>

      <div class="kpis" id="kpis"></div>''')
rep('<div class="section-title"><h2>Kilómetros de frente por prioridad</h2><span id="scope-label">Ciudad</span></div>',
    '<div class="section-title"><h2 id="bars-title">Kilómetros de frente por prioridad</h2><span id="scope-label">Ciudad</span></div>')
rep('''        <p class="note" id="bars-note"></p>
      </div>
''', '''        <div id="bars2" hidden style="margin-top:14px">
          <div class="section-title"><h2>Km de vialidad por prioridad · Gob. Central</h2></div>
          <div class="bars" id="bars2-rows"></div>
        </div>
        <p class="note" id="bars-note"></p>
      </div>
''')
rep('<p class="note">Prioritario = categorías Muy Alta y Alta. Selecciona una calle para ubicarla en el mapa.</p>',
    '<p class="note">Prioritario = categorías Muy Alta y Alta. Selecciona una calle o avenida para ubicarla en el mapa.</p>')
rep('''          <button class="btn secondary" id="dl-ficha-alc" hidden>''',
'''          <button class="btn" id="dl-tramos" hidden title="Tramos Muy Alta y Alta de vialidades primarias del ámbito seleccionado"><svg viewBox="0 0 24 24"><path d="M12 4v12m0 0l-5-5m5 5l5-5M4 20h16"/></svg>Descargar tramos prioritarios (CSV)</button>
          <button class="btn secondary" id="dl-avenidas" hidden><svg viewBox="0 0 24 24"><path d="M12 4v12m0 0l-5-5m5 5l5-5M4 20h16"/></svg>Resumen por avenida (CSV)</button>
          <button class="btn secondary" id="dl-ficha-vpalc" hidden><svg viewBox="0 0 24 24"><path d="M6 3h9l5 5v13H6zM15 3v5h5M9 13h8M9 17h8"/></svg>Ficha de vialidades primarias de la alcaldía (PDF)</button>
          <button class="btn secondary" id="dl-ficha-av" hidden><svg viewBox="0 0 24 24"><path d="M6 3h9l5 5v13H6zM15 3v5h5M9 13h8M9 17h8"/></svg>Ficha de la avenida (PDF)</button>
          <button class="btn secondary" id="dl-ficha-alc" hidden>''')
rep('Colonias, prioridad por colonia y grado de marginación 2020: capa colonias_manzanas_verdes (SEDEMA-SIA). <span id="n-total"></span>',
    'Colonias, prioridad por colonia y grado de marginación 2020: capa colonias_manzanas_verdes (SEDEMA-SIA). Vialidades primarias y de acceso controlado con prioridad de reforestación: capa PRIMARIAS_REFORESTACION (SEDEMA, ago. 2026); su atención corresponde al Gobierno de la Ciudad. <span id="n-total"></span>')
# leyenda
rep('''      <div id="legend-rows"></div>
      <p class="hint">Clic para ocultar o mostrar una categoría.</p>''',
'''      <div id="legend-rows"></div>
      <div class="row static" id="legend-vp"></div>
      <p class="hint">Clic para ocultar o mostrar una categoría.</p>''')
rep('<div class="attrib">Sin mapa base · colonias y frentes de manzana</div>', '<div class="attrib">Sin mapa base · colonias, frentes de manzana y vialidades primarias</div>')
# metodología: los tramos de una calle y cómo se ven en el mapa
rep('permite ordenar el trabajo calle por calle dentro de cada colonia.</p>',
'''permite ordenar el trabajo calle por calle dentro de cada colonia.</p>
    <p><b>Una calle no es una sola línea en el mapa: son varios tramos.</b> Cada línea de color que se dibuja es un tramo independiente y tiene su propia prioridad, así que una misma avenida puede aparecer roja en unas cuadras y verde en otras. Por eso, al buscar una calle por su nombre, la herramienta resalta y suma todos sus tramos: los kilómetros que reporta son la suma de esos tramos, no la longitud de un solo trazo.</p>
    <figure class="diag">
      <svg viewBox="0 0 660 240" role="img" aria-label="Diagrama: una calle se dibuja en tramos. En la red de las alcaldías cada tramo es el frente de una manzana; en las vialidades primarias cada tramo va de cruce a cruce.">
        <text x="0" y="13" font-family="Cabin, sans-serif" font-size="12.5" font-weight="700" fill="#24262A">Calles de las alcaldías</text>
        <text x="0" y="30" font-family="Roboto, sans-serif" font-size="11" fill="#8A8C8E">un tramo = el frente de una manzana</text>
        <g fill="#E7E2D9" stroke="#D2CBBF" stroke-width="1">
          <rect x="10" y="46" width="86" height="52" rx="3"/><rect x="104" y="46" width="86" height="52" rx="3"/><rect x="198" y="46" width="86" height="52" rx="3"/>
          <rect x="10" y="160" width="86" height="52" rx="3"/><rect x="104" y="160" width="86" height="52" rx="3"/><rect x="198" y="160" width="86" height="52" rx="3"/>
        </g>
        <text x="228" y="134" text-anchor="middle" font-family="Roboto, sans-serif" font-size="10.5" letter-spacing="1.4" fill="#B5B0A6">CALLE</text>
        <g stroke-width="7" stroke-linecap="round" fill="none">
          <path d="M14 108H92" stroke="#A3141C"/><path d="M108 108H186" stroke="#EF7A2A"/><path d="M202 108H280" stroke="#F2C11E"/>
          <path d="M14 150H92" stroke="#EF7A2A"/><path d="M108 150H186" stroke="#F2C11E"/><path d="M202 150H280" stroke="#93C64A"/>
        </g>
        <rect x="8" y="101" width="90" height="14" rx="7" fill="none" stroke="#8A8C8E" stroke-width="1" stroke-dasharray="3 3"/>
        <text x="53" y="134" text-anchor="middle" font-family="Roboto, sans-serif" font-size="10.5" fill="#55585A">1 tramo</text>
        <text x="0" y="232" font-family="Roboto, sans-serif" font-size="11" fill="#8A8C8E">Los dos lados de la calle son tramos distintos.</text>
        <path d="M320 40V212" stroke="#E2DDD5" stroke-width="1"/>
        <text x="348" y="13" font-family="Cabin, sans-serif" font-size="12.5" font-weight="700" fill="#24262A">Vialidades primarias</text>
        <text x="348" y="30" font-family="Roboto, sans-serif" font-size="11" fill="#8A8C8E">un tramo = de cruce a cruce</text>
        <g stroke="#E7E2D9" stroke-width="13" stroke-linecap="round"><path d="M446 52V196"/><path d="M556 52V196"/></g>
        <g stroke-width="10" stroke-linecap="round" fill="none">
          <path d="M354 124H436" stroke="#A3141C"/><path d="M456 124H546" stroke="#EF7A2A"/><path d="M566 124H650" stroke="#93C64A"/>
        </g>
        <g font-family="Roboto, sans-serif" font-size="10.5" fill="#55585A" text-anchor="middle">
          <text x="395" y="150">tramo</text><text x="501" y="150">tramo</text><text x="608" y="150">tramo</text>
        </g>
        <g font-family="Roboto, sans-serif" font-size="10.5" fill="#8A8C8E" text-anchor="middle">
          <text x="446" y="212">cruce</text><text x="556" y="212">cruce</text>
        </g>
        <text x="348" y="232" font-family="Roboto, sans-serif" font-size="11" fill="#8A8C8E">La avenida también se corta al cambiar de alcaldía.</text>
      </svg>
      <figcaption>Los colores son las cinco clases de prioridad. La red de las alcaldías está formada por 372,534 frentes de manzana y la de vialidades primarias por <span id="m-vp-tramos">—</span> tramos; al seleccionar una calle o una avenida, el panel indica cuántos de sus tramos son prioritarios y cuántos kilómetros suman.</figcaption>
    </figure>''')
# metodología: paso 3 nuevo
rep('''    <h3><span class="step">3</span>Cómo usar esta herramienta</h3>''',
'''    <h3><span class="step">3</span>Quién atiende cada calle: alcaldías y Gobierno Central</h3>
    <p>Las <b>vialidades primarias y de acceso controlado</b> (ejes viales, calzadas, Circuito Interior, Periférico, Viaducto y avenidas principales) corresponden al Gobierno de la Ciudad de México; el resto de la red la atienden las alcaldías. La capa de vialidades primarias (<span id="m-vp-km">—</span> km) trae su propia prioridad de reforestación en la misma escala de cinco niveles: <span id="m-vp-prio">—</span> km son prioritarios (<span id="m-vp-pct">—</span>).</p>
    <p>Para no contar dos veces la misma calle, los frentes de manzana que dan a una vialidad primaria se asignan al Gobierno Central y se excluyen de las cifras, listados y fichas de las alcaldías: son <span id="m-gc-fr">—</span> frentes (<span id="m-gc-km">—</span> km). Un frente se considera sobre la vialidad primaria cuando corre paralelo a ella (diferencia de rumbo de 30° o menos) y está a 18 m o menos de su eje, o hasta 60 m cuando además coincide el nombre de la calle. El <span id="m-cov">—</span> de los kilómetros de vialidad primaria tiene frentes asociados; el resto son tramos sin manzanas al frente (vías de acceso controlado, puentes y entronques).</p>
    <p>Por eso el panel separa dos consultas. La primera, <b>Atribución</b>, define de quién es la calle: con <b>Alcaldías</b> se consultan los frentes que planta cada demarcación; con <b>Gobierno Central</b>, las vialidades primarias con su prioridad, su buscador de avenida y sus descargas; ambas casillas pueden estar activas para ver las dos redes juntas. La segunda, <b>Modelo de priorización</b>, define el territorio y el detalle con que se consulta ese universo: alcaldía, colonia o avenida, y si el mapa dibuja alcaldías, colonias o calles. Las cifras, los listados, las fichas y los archivos descargables siempre corresponden a la combinación elegida en ambas.</p>

    <h3><span class="step">4</span>Cómo usar esta herramienta</h3>''')
rep('''      <li><b>Verifique en campo.</b>''', '''      <li><b>Distinga responsabilidades.</b> Si una calle no aparece en el listado de la alcaldía, revise en el mapa si es una vialidad primaria (en gris): la atiende el Gobierno Central y se consulta activando esa casilla en Atribución.</li>
      <li><b>Verifique en campo.</b>''')
rep('Sistema de Información Ambiental, modelo de priorización de frentes de manzana (nov. 2025).</p>',
    'Sistema de Información Ambiental, modelo de priorización de frentes de manzana (nov. 2025); SEDEMA, capa de vialidades primarias priorizadas para reforestación (ago. 2026).</p>')

# sustituir la lámina de la metodología por la composición sin el mapa de la derecha
import base64 as _b64
_img = _b64.b64encode(open(SC + 'composicion_frentes_manzana.jpg', 'rb').read()).decode()
_fig = ('<figure><img src="data:image/jpeg;base64,' + _img + '" alt="Ortofoto de un conjunto de manzanas y la misma zona con sus frentes clasificados: en verde los que tienen arbolado y en rojo los que no">'
        '<figcaption>Así se clasifica el verdor de cada frente de manzana: en verde los tramos con arbolado y en rojo los que no lo tienen. Es el nivel de detalle con el que se prioriza al interior de las colonias.</figcaption></figure>')
_pat = re.compile(r'<figure><img src="data:image/jpeg;base64,[^"]+"[^>]*>.*?</figure>', re.S)
assert _pat.search(head), 'no se encontró la lámina original'
head = _pat.sub(lambda m: _fig, head, count=1)

# ---------- adaptación a móvil ----------
rep('  <aside class="panel">\n    <div class="panel-head">',
"""  <aside class="panel">
    <button class="sheet-grip" id="sheet" type="button" aria-expanded="false" aria-controls="panel-body"><i></i><b id="sheet-label">Ver la consulta</b></button>
    <div class="panel-head">""")
rep('    <div class="panel-body">', '    <div class="panel-body" id="panel-body">')
rep("""      <h3>Prioridad de reforestación</h3>
      <div id="legend-rows"></div>""",
"""      <button class="legend-head" id="legend-toggle" type="button" aria-expanded="true" aria-controls="legend-body"><h3>Prioridad de reforestación</h3><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10l5 5 5-5"/></svg></button>
      <div id="legend-body">
      <div id="legend-rows"></div>""")
rep("""      <p class="hint">Clic para ocultar o mostrar una categoría.</p>
    </div>""",
"""      <p class="hint">Clic para ocultar o mostrar una categoría.</p>
      </div>
    </div>""")
rep('.card{border-radius:10px;box-shadow:0 10px 30px rgba(36,38,42,.16)}',
""".card{border-radius:10px;box-shadow:0 10px 30px rgba(36,38,42,.16)}
/* --- cabecera de la leyenda (plegable en móvil) --- */
.legend-head{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;padding:0;border:0;background:none;text-align:left;cursor:default;color:inherit}
.legend-head svg{display:none;width:16px;height:16px;stroke:var(--ink-3);fill:none;stroke-width:2;flex:none;transition:transform .18s ease}
.legend-head h3{margin:0}
/* --- asa de la hoja inferior (solo móvil) --- */
.sheet-grip{display:none}
/* --- móvil --- */
@media (max-width:860px){
  html,body{overscroll-behavior:none}
  .app{grid-template-columns:1fr;grid-template-rows:minmax(180px,1fr) auto}
  .mapwrap{order:1;min-height:0}
  .panel{order:2;border-right:0;border-top:1px solid var(--line);max-height:56dvh;box-shadow:0 -8px 24px rgba(36,38,42,.12);transition:max-height .22s ease}
  body.sheet-open .panel{max-height:88dvh}
  .sheet-grip{display:flex;flex-direction:column;align-items:center;gap:3px;width:100%;padding:8px 16px 4px;border:0;background:var(--panel);cursor:pointer;flex:none}
  .sheet-grip i{width:40px;height:4px;border-radius:2px;background:var(--line-strong)}
  .sheet-grip b{font-family:Cabin,sans-serif;font-size:11.5px;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-3);font-weight:600}
  .panel-head{padding:10px 16px 10px;border-bottom-width:3px}
  .panel-head .logo{max-width:250px}
  .panel-head p{display:none}
  .panel-head h1{font-size:17px}
  .panel-body{padding:14px 16px 26px;gap:18px}
  .block-comp{padding:12px}
  .kpi{padding:10px 9px 9px}
  .kpi .v{font-size:20px}
  .kpi .l{font-size:11px}
  .btn{min-height:46px}
  .tool{width:40px;height:40px}
  .toolbar{right:10px;top:10px}
  .attrib{display:none}
  .combo input,.search input,.select-wrap select{font-size:16px}
  .combo-list{max-height:44dvh}
  .combo-list li{padding:10px 10px}
  .results li{padding:11px 12px}
  .legend{left:10px;bottom:10px;right:auto;max-width:min(74vw,250px);padding:9px 11px}
  .legend-head{cursor:pointer}
  .legend-head svg{display:block}
  .legend:not(.open) #legend-body{display:none}
  .legend:not(.open) .legend-head svg{transform:rotate(-90deg)}
  .legend .row{padding:5px 5px}
  .legend .hint{display:none}
  .card{position:fixed;left:0;right:0;bottom:0;width:auto;max-height:64dvh;overflow-y:auto;border-radius:12px 12px 0 0;z-index:12;box-shadow:0 -10px 30px rgba(36,38,42,.22)}
  .card .close{width:34px;height:34px;font-size:22px}
  .modal{padding:0}
}
@media (max-width:420px){
  .kpi .v{font-size:18px}
  .kpi .v small{font-size:11px}
  .block-h h2{font-size:15px}
  .panel-head .logo{max-width:210px}
}""")

# ---------- correcciones de la auditoría ----------
rep('<input id="q" type="search" placeholder="Buscar calle o avenida…" autocomplete="off">',
    '<input id="q" type="search" placeholder="Buscar calle o avenida…" autocomplete="off" aria-label="Buscar calle o avenida">')
rep('<h3>Prioridad de reforestación</h3>',
    '<h3><span class="lg-long">Prioridad de reforestación</span><span class="lg-short">Prioridad</span></h3>')
rep('.legend-head h3{margin:0}', '.legend-head h3{margin:0}\n.lg-short{display:none}')
rep('  .legend .row{padding:5px 5px}',
    '  .seg.pills button{padding:9px 13px}\n  .lg-long{display:none}\n  .lg-short{display:inline}\n  .legend{max-width:none;width:auto}\n  .legend .row{padding:5px 5px}')

# ---------- descargas en Excel con diccionario ----------
rep('Descargar frentes prioritarios (CSV)', 'Descargar frentes prioritarios (Excel)')
rep('Resumen por calle (CSV)', 'Resumen por calle (Excel)')
rep('Descargar tramos prioritarios (CSV)', 'Descargar tramos prioritarios (Excel)')
rep('Resumen por avenida (CSV)', 'Resumen por avenida (Excel)')
rep('<div class="section-title"><h2>Listado para planeación</h2></div>',
    '<div class="section-title"><h2>Listado para planeación</h2><span>Excel + diccionario</span></div>')
rep('<b>Use el listado descargable para programar cuadrillas.</b> Incluye calle, tipo de vialidad, colonia, código postal, longitud del frente y coordenadas.',
    '<b>Use el listado descargable para programar cuadrillas.</b> Cada archivo de Excel trae dos hojas: <i>Datos</i>, con calle, tipo de vialidad, colonia, código postal, longitud del frente y coordenadas, y <i>Diccionario</i>, con la definición de cada campo, sus valores posibles, el ámbito consultado y las fuentes. Si no hay conexión para generar el Excel, la herramienta entrega el listado y el diccionario en dos archivos CSV.')

# ---------- separación visual de secciones del panel ----------
rep('.res-h{margin-bottom:-10px}',
    """.res-h{margin-bottom:-10px}
.block:not(.block-comp) .block-h,.res-h,.panel-section{border-top:1px solid var(--line);padding-top:16px}
.panel-section{display:flex;flex-direction:column;gap:12px}
.panel-section .section-title{margin:0}""")
rep("""      <div>
        <div class="section-title"><h2>Listado para planeación</h2>""",
    """      <div class="panel-section">
        <div class="section-title"><h2>Listado para planeación</h2>""")

# ---------- fundamento legal de las atribuciones (metodología) ----------
rep('Las cifras, los listados, las fichas y los archivos descargables siempre corresponden a la combinación elegida en ambas.</p>',
r"""Las cifras, los listados, las fichas y los archivos descargables siempre corresponden a la combinación elegida en ambas.</p>
    <p><b>Nada de esto es una atribución nueva.</b> El reparto que ordena la herramienta ya está en la ley: la Ley Orgánica de Alcaldías encomienda a las demarcaciones los programas de reforestación <b>en las vías secundarias</b>, de modo que las vialidades primarias y de acceso controlado quedan fuera de ese ámbito y corresponden al Gobierno de la Ciudad.</p>
    <div class="fund">
      <div class="col">
        <h4><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21c0-5 2-9 7-11-1 6-3 9-7 11zM12 21c0-4-1.5-7-5-8.5"/></svg>Alcaldías: plantar y cuidar</h4>
        <dl>
          <dt>Constitución CDMX, art. 53 B.3 a) fr. XIX y b) fr. XXII</dt>
          <dd>Servicio público de poda; conservación y mejora de parques urbanos y áreas verdes.</dd>
          <dt>Ley Ambiental CDMX, art. 106</dt>
          <dd>Las Alcaldías, en coordinación con la Secretaría, tienen a su cargo la conservación, mantenimiento, protección, restitución y desarrollo de los árboles de su territorio; crear áreas verdes cuando no se alcancen 9 m² por habitante, con especies nativas y conforme a las disposiciones de la Secretaría.</dd>
          <dt>Ley Ambiental, art. 8 fr. IX–X y art. 110</dt>
          <dd>Vigilar el arbolado en vía pública, sustituirlo gradualmente por nativas y prestar el servicio de poda.</dd>
          <dt>Ley Orgánica de Alcaldías, arts. 50 y 52 fr. VI</dt>
          <dd>Incrementar las áreas verdes por habitante y diseñar e implementar programas de reforestación de especies arbóreas idóneas en las vías secundarias.</dd>
        </dl>
      </div>
      <div class="col">
        <h4><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v16M7 20h10M5 8h14M8 8l-3 6h6zM16 8l-3 6h6z"/></svg>Secretaría: norma, datos y técnica</h4>
        <dl>
          <dt>Ley Ambiental CDMX, art. 7 fr. IV y LI</dt>
          <dd>Expedir las normas ambientales de la Ciudad (NADF-001; paleta vegetal obligatoria).</dd>
          <dt>Ley Ambiental, art. 7 fr. VIII y XVII</dt>
          <dd>Resolver y, en su caso, limitar o negar plantación, poda, derribo y trasplante en suelo urbano; promover la sustitución de exóticas por nativas.</dd>
          <dt>Ley Ambiental, art. 7 fr. XXXV y art. 107</dt>
          <dd>Sistema de Información Ambiental e inventario del arbolado urbano, en coordinación con las Alcaldías (reforma del 24 de diciembre de 2025).</dd>
          <dt>Reglamento Interior, art. 190 fr. V, VI y VII</dt>
          <dd>Lineamientos de reforestación; autorizar plantación, poda y trasplante en áreas verdes urbanas; asistencia técnica y capacitación.</dd>
        </dl>
      </div>
    </div>
    <p class="fundnote">Cabildo (Constitución, art. 54): órgano de planeación, coordinación, acuerdo y decisión entre el Gobierno de la Ciudad y las Alcaldías; garantiza el cumplimiento de sus acuerdos.</p>""")
rep('.modal-card figcaption{font-size:12px;color:var(--ink-3);margin-top:6px}',
    """.modal-card figcaption{font-size:12px;color:var(--ink-3);margin-top:6px}
.fund{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:14px 0 4px}
.fund .col{border:1px solid var(--line);border-radius:9px;padding:13px 15px;background:var(--panel-2)}
.fund .col+.col{background:#FBF6EE;border-color:var(--dorado-soft)}
.fund h4{margin:0 0 9px;font-family:Cabin,sans-serif;font-size:15px;font-weight:700;color:var(--guinda);display:flex;align-items:center;gap:8px}
.fund h4 svg{width:19px;height:19px;stroke:var(--guinda);fill:none;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;flex:none}
.fund dl{margin:0}
.fund dt{font-weight:700;font-size:12.5px;margin-top:9px;color:var(--ink)}
.fund dl>dt:first-child{margin-top:0}
.fund dd{margin:2px 0 0;font-size:12.5px;color:var(--ink-2);line-height:1.5}
.fundnote{font-size:12.5px;color:var(--guinda);font-style:italic;margin:8px 0 0;line-height:1.5}
@media (max-width:700px){ .fund{grid-template-columns:1fr} }""")

# ---------- población beneficiada ----------
rep('      <div class="kpis" id="kpis"></div>',
    '      <div class="kpis" id="kpis"></div>\n      <div class="pobbox" id="pobbox" hidden></div>')
rep('.gcline{display:block;margin-top:4px;color:var(--guinda);font-weight:500}',
    """.gcline{display:block;margin-top:4px;color:var(--guinda);font-weight:500}
.pobbox{margin-top:-12px}\n.utline{display:block;margin-top:3px;color:var(--ink-3);font-size:11.5px}
.pobline{display:flex;align-items:flex-start;gap:8px;padding:10px 12px;border:1px solid var(--dorado-soft);border-left:3px solid var(--dorado);border-radius:7px;background:#FBF6EE;font-size:12.5px;line-height:1.45;color:var(--ink-2)}
.pobline::before{content:"";width:16px;height:16px;flex:none;margin-top:1px;background:var(--guinda);-webkit-mask:var(--people) center/100% no-repeat;mask:var(--people) center/100% no-repeat}
.pobline b{font-family:Cabin,sans-serif;font-size:14px;color:var(--ink)}
.kpis.dual .cap.pob{padding:8px 10px;background:var(--panel)}
.kpis.dual .cap.pob .pobline{text-transform:none;letter-spacing:0;font-weight:400}""")
rep('.lg-short{display:none}',
    """.lg-short{display:none}
:root{--people:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='9' cy='8' r='3.2'/%3E%3Cpath d='M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5'/%3E%3Ccircle cx='17' cy='9' r='2.4'/%3E%3Cpath d='M16 14.2c2.4.2 4.5 2 4.5 4.8'/%3E%3C/svg%3E")}""")
rep('CONAPO, Índice de marginación urbana 2020; SEDEMA, temperatura superficial urbana 2024 y cobertura de copa;',
    'CONAPO, Índice de marginación urbana 2020; EVALÚA CDMX, Índice de Desarrollo Social por unidad territorial (población, población en pobreza por necesidades básicas insatisfechas y estrato de desarrollo social); SEDEMA, temperatura superficial urbana 2024 y cobertura de copa;')

# ---------- IDS como indicador social reportado y meta sobre la red completa ----------
rep('<p>La suma de las tres clases define la <b>prioridad de la colonia</b> en cinco niveles, de Muy Alta a Muy Baja. Es el dato que aparece al seleccionar una colonia y en la ficha de cada calle.</p>',
    """<p>La suma de las tres clases define la <b>prioridad de la colonia</b> en cinco niveles, de Muy Alta a Muy Baja. Es el dato que aparece al seleccionar una colonia y en la ficha de cada calle.</p>
    <p>El contexto social que reporta el programa —el que se muestra en la caja de la colonia, en las fichas y en los archivos descargables— es el <b>Índice de Desarrollo Social por unidad territorial de EVALÚA CDMX</b>, instrumento oficial de focalización de la Ciudad, con su estrato y su población en pobreza por necesidades básicas insatisfechas. El modelo vigente clasificó el rezago social con el grado de marginación urbana CONAPO 2020, como indica la tabla; la actualización del modelo para clasificarlo con el Índice de Desarrollo Social está en proceso.</p>""")
rep('El <span id="m-cov">—</span> de los kilómetros de vialidad primaria tiene frentes asociados; el resto son tramos sin manzanas al frente (vías de acceso controlado, puentes y entronques).',
    'El <span id="m-cov">—</span> de los kilómetros de vialidad primaria tiene frentes asociados; el resto son tramos sin manzanas al frente (vías de acceso controlado, puentes y entronques). La meta del Gobierno de la Ciudad se mide sobre la red primaria completa —los <span id="m-vp-km2">—</span> km—, no sobre el subconjunto con frentes.')
rep('Colonias, prioridad por colonia y grado de marginación 2020: capa colonias_manzanas_verdes (SEDEMA-SIA).',
    'Colonias y prioridad por colonia: capa colonias_manzanas_verdes (SEDEMA-SIA). Contexto social: Índice de Desarrollo Social por unidad territorial, EVALÚA CDMX.')

# ---------- barra de resumen sobre el mapa y panel plegable ----------
rep('    <div class="toolbar">',
"""    <div class="mapbar">
      <button class="panel-toggle" id="panel-toggle" type="button" title="Ocultar el panel de consulta" aria-label="Ocultar el panel de consulta" aria-expanded="true"><svg viewBox="0 0 24 24"><path d="M14 6l-6 6 6 6"/></svg></button>
      <div class="mapsum" id="mapsum"></div>
    </div>
    <div class="toolbar">""")
rep('.card{border-radius:10px;box-shadow:0 10px 30px rgba(36,38,42,.16)}',
""".card{border-radius:10px;box-shadow:0 10px 30px rgba(36,38,42,.16)}
/* --- barra de resumen sobre el mapa --- */
.mapbar{position:absolute;left:16px;top:16px;z-index:6;display:flex;align-items:stretch;gap:8px;max-width:calc(100% - 74px)}
.panel-toggle{width:34px;flex:none;border:1px solid var(--line);border-radius:9px;background:var(--panel);box-shadow:0 4px 14px rgba(36,38,42,.12);cursor:pointer;display:grid;place-items:center;color:var(--ink-2);transition:background .12s ease,color .12s ease}
.panel-toggle:hover{background:var(--panel-2);color:var(--guinda)}
.panel-toggle svg{width:17px;height:17px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;transition:transform .18s ease}
body.panel-off .panel{display:none}
body.panel-off .app{grid-template-columns:1fr}
body.panel-off .panel-toggle svg{transform:rotate(180deg)}
.mapsum{display:flex;align-items:center;gap:14px;min-width:0;padding:8px 15px;background:var(--panel);border:1px solid var(--line);border-radius:10px;box-shadow:0 4px 14px rgba(36,38,42,.12)}
.mapsum .scope{display:flex;flex-direction:column;min-width:0}
.mapsum .scope b{font-family:Cabin,sans-serif;font-size:14.5px;font-weight:700;line-height:1.15;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:34ch}
.mapsum .scope span{font-size:10.5px;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-3);font-weight:600;font-family:Cabin,sans-serif}
.mapsum .scope i{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;vertical-align:1px}
.mapsum .sep{width:1px;align-self:stretch;background:var(--line);flex:none}
.mapsum .st{display:flex;flex-direction:column;white-space:nowrap}
.mapsum .st b{font-family:Cabin,sans-serif;font-size:16px;font-weight:700;line-height:1.1;color:var(--ink);font-variant-numeric:tabular-nums}
.mapsum .st small{font-size:10.5px;color:var(--ink-2);line-height:1.3}
@media (max-width:860px){
  .mapbar{left:10px;top:10px;max-width:calc(100% - 62px)}
  .panel-toggle{display:none}
  .mapsum{padding:6px 11px;gap:10px}
  .mapsum .scope b{font-size:13px;max-width:14ch}
  .mapsum .st.opt{display:none}
  .mapsum .st b{font-size:14px}
}""")

# ---------- icono de ayuda y autoría ----------
rep('aria-label="Cómo se priorizó">i</button>', 'aria-label="Cómo se priorizó y cómo se usa">?</button>')
rep('Vialidades primarias y de acceso controlado con prioridad de reforestación: capa PRIMARIAS_REFORESTACION (SEDEMA, ago. 2026); su atención corresponde al Gobierno de la Ciudad. <span id="n-total"></span>',
    'Vialidades primarias y de acceso controlado con prioridad de reforestación: capa PRIMARIAS_REFORESTACION (SEDEMA, ago. 2026); su atención corresponde al Gobierno de la Ciudad. <span id="n-total"></span><span class="autoria">Elaboración: Secretaría del Medio Ambiente de la Ciudad de México · Sistema de Información Ambiental (SIA).</span>')
rep('.card .act{margin-top:10px;width:100%;padding:8px 12px;font-size:13px}',
    """.card .act{margin-top:10px;width:100%;padding:8px 12px;font-size:13px}
.card .acts{display:flex;gap:8px}
.card .acts .act{margin-top:10px}
.autoria{display:block;margin-top:8px;padding-top:8px;border-top:1px solid var(--line);color:var(--ink-2);font-weight:500}""")

rep('<div class="section-title"><h2>Km de vialidad por prioridad · Gob. Central</h2></div>',
    '<div class="section-title"><h2 id="bars2-title">Kilómetros de vialidad primaria por prioridad · a cargo del Gobierno Central</h2></div>')
rep('.autoria{display:block',
    """.cardnote{margin-top:8px;font-size:11.5px;line-height:1.4;color:var(--ink-3)}
.autoria{display:block""")

# ================= BLOQUE 1 (auditoría UX v1) =================
# C4 · rampa de calor con luminosidad creciente (legible con daltonismo)
rep('--p0:#2E8B3D; --p1:#93C64A; --p2:#F2C11E; --p3:#EF7A2A; --p4:#A3141C;',
    '--p0:#F9E7BF; --p1:#F4C56E; --p2:#E88A2E; --p3:#C2421B; --p4:#7F1D12;')
rep('así que una misma avenida puede aparecer roja en unas cuadras y verde en otras',
    'así que una misma avenida puede aparecer oscura en unas cuadras y clara en otras')
# las muestras claras (Muy Baja) necesitan borde para no perderse sobre blanco
rep('.pill i{width:9px;height:9px;border-radius:50%}',
    '.pill i{width:9px;height:9px;border-radius:50%}\n.dot,.pr,.pill i,.legend .row i,.mapsum .scope i,.bars .fill{box-shadow:inset 0 0 0 1px rgba(36,38,42,.14)}')

meta = open(SC + 'blk_meta.txt', encoding='utf-8').read(); data = open(SC + 'blk_data.txt', encoding='utf-8').read(); vp = open(SC + 'blk_vp.txt', encoding='utf-8').read()
app = open(SC + 'v7_app.js', encoding='utf-8').read()
rep('<div class="attrib">Sin mapa base', '<div class="scalebar" id="scalebar" aria-label="Escala del mapa"><i></i><span></span></div><div class="attrib">Sin mapa base')
# I1 + M1 · el nivel de detalle pasa al control del mapa, junto a la leyenda con casillas y km
import re as _re
_m = _re.search(r'\n        <div class="field">\n          <label id="lvl-label">Detalle en el mapa</label>\n          (<div class="seg lvl pills".*?</div>)\n          <p class="note" id="lvl-note">.*?</p>\n        </div>', head, _re.S)
assert _m, 'bloque de detalle no encontrado'
_seg = _m.group(1)
head = head[:_m.start()] + head[_m.end():]
rep('<div id="legend-body">\n      <div id="legend-rows"></div>',
    '<div id="legend-body">\n      <div class="lg-sec"><span class="lg-cap" id="lvl-label">Ver en el mapa</span>' + _seg + '<p class="lg-note" id="lvl-note">Colonias y Calles se combinan; Alcaldías va sola.</p></div>\n      <span class="lg-cap" id="lg-scope">Prioridad · km de frente de la ciudad</span>\n      <div id="legend-rows"></div>')
rep('<p class="hint">Clic para ocultar o mostrar una categoría.</p>', '')
rep('<span class="lg-long">Prioridad de reforestación</span><span class="lg-short">Prioridad</span>', '<span class="lg-long">Capas y prioridad</span><span class="lg-short">Capas</span>')
# I2 · gris secundario con contraste AA
rep('--ink-3:#8A8C8E;', '--ink-3:#666A6D;')
# M2 · encabezado compacto
rep('<p>Dos consultas en una: a quién le corresponde atender cada calle y qué dice el modelo de priorización sobre ella.</p>', '')
rep('<button class="linkbtn" id="open-info" type="button">¿Cómo se priorizaron las colonias y las calles?</button>',
    '<button class="linkbtn" id="open-info" type="button" aria-label="Cómo se priorizaron las colonias y las calles, y cómo usar la herramienta">Cómo funciona</button>')
# ================= BLOQUE 2 (auditoría UX v1) =================
# C1 + C6 + I4 · el panel se reorganiza: consulta compacta arriba, la respuesta enseguida, pestañas y acciones fijas
def _grab(src, start, end, frm=0):
    i = src.index(start, frm); j = src.index(end, i) + len(end); return src[i:j]
_pb0 = head.index('<div class="panel-body" id="panel-body">'); _pb1 = head.index('</aside>', _pb0)
_pb = head[_pb0:_pb1]
_chips = _grab(_pb, '<div class="chips" role="group" aria-labelledby="resp-label">', '</div>')
_respnote = _grab(_pb, '<p class="note" id="resp-note">', '</p>')
_reset = _grab(_pb, '<button type="button" class="reset" id="reset-all"', '</button>')
_select = _grab(_pb, '<select id="alc">', '</select>').replace('<select id="alc">', '<select id="alc" aria-label="Alcaldía">').replace('>Toda la Ciudad de México</option>', '>Elige una alcaldía</option>')
_colf = _grab(_pb, '<div class="field" id="col-field">', '<div class="colinfo" id="colinfo" hidden></div>\n        </div>').replace('<div class="colinfo" id="colinfo" hidden></div>', '')
_avf = _grab(_pb, '<div class="field" id="av-field" hidden>', '<div class="colinfo" id="avinfo" hidden></div>\n        </div>').replace('<div class="colinfo" id="avinfo" hidden></div>', '')
_bars = _grab(_pb, '<div>\n        <div class="section-title"><h2 id="bars-title">', '<p class="note" id="bars-note"></p>\n      </div>')
_res = _grab(_pb, '<div>\n        <div class="section-title"><h2 id="search-title">', '</ul>\n        <p class="note">')
_res += _grab(_pb, 'Prioritario = categorías Muy Alta y Alta.', '</div>', _pb.index('<ul class="results"'))
_dl = _grab(_pb, '<div class="panel-section">', '<div class="status" id="dl-status"></div>\n      </div>')
_src = _grab(_pb, '<div class="source">', '</div>')
_ico_s = '<svg class="ic-s" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>'
_new_pb = f"""<div class="panel-body" id="panel-body">
      <div class="query" id="query">
        <div class="omni combo">
          {_ico_s}
          <input id="omni" type="search" placeholder="Busca alcaldía, colonia, avenida o calle" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="omni-list" aria-label="Buscar alcaldía, colonia, avenida o calle">
          <button class="clear" id="omni-clear" type="button" aria-label="Borrar búsqueda" hidden>×</button>
          <ul class="combo-list omni-list" id="omni-list" role="listbox" hidden></ul>
        </div>
        <div class="resp-row"><span class="lab" id="resp-label">Atiende</span>{_chips}<button type="button" class="help-i" id="resp-help" aria-expanded="false" aria-controls="resp-note" title="¿Qué atiende cada quien?">?</button></div>
        {_respnote.replace('<p class="note" id="resp-note">', '<p class="note resp-note" id="resp-note" hidden>')}
        <nav class="crumb" id="crumb" aria-label="Ruta de la consulta">
          <button type="button" class="cr-city" id="cr-city">Ciudad de México</button><span class="cr-sep" aria-hidden="true">›</span>
          <span class="cr-alc">{_select}</span>
          <span class="cr-rest" id="cr-rest"></span>
        </nav>
        <div class="legacy" hidden>{_colf}{_avf}</div>
      </div>

      <div class="answer" id="answer">
        <div class="scope-head"><div><span class="eyebrow">Lo que indica el modelo de priorización</span><h2 id="scope-title">Ciudad de México</h2></div>{_reset}</div>
        <div class="colinfo" id="alcinfo" hidden></div>
        <div class="colinfo" id="colinfo" hidden></div>
        <div class="colinfo" id="avinfo" hidden></div>
        <div class="kpis" id="kpis"></div>
        <div class="pobbox" id="pobbox" hidden></div>
        <div class="tabs" role="tablist" aria-label="Detalle de la consulta">
          <button type="button" role="tab" id="tab-res" data-tab="res" aria-selected="true" aria-controls="tp-res">Resumen</button>
          <button type="button" role="tab" id="tab-list" data-tab="list" aria-selected="false" aria-controls="tp-list">Listado</button>
          <button type="button" role="tab" id="tab-dl" data-tab="dl" aria-selected="false" aria-controls="tp-dl">Descargas</button>
        </div>
        <div class="tabpanel" id="tp-res" role="tabpanel" aria-labelledby="tab-res">{_bars}</div>
        <div class="tabpanel" id="tp-list" role="tabpanel" aria-labelledby="tab-list" hidden>{_res}</div>
        <div class="tabpanel" id="tp-dl" role="tabpanel" aria-labelledby="tab-dl" hidden>{_dl}</div>
        {_src}
      </div>
    </div>
    <div class="panel-actions" id="panel-actions">
      <button type="button" class="btn" id="act-main"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14"/></svg><span id="act-main-lbl">Descargar listado (Excel)</span></button>
      <button type="button" class="btn secondary" id="act-ficha">Ficha PDF</button>
      <p class="act-hint" id="act-hint" hidden></p>
    </div>
  """
head = head[:_pb0] + _new_pb + head[_pb1:]
# el filtro del listado ya no es el buscador principal
rep('placeholder="Buscar calle o avenida…" autocomplete="off" aria-label="Buscar calle o avenida"', 'placeholder="Filtrar este listado…" autocomplete="off" aria-label="Filtrar este listado"')
# I4 · el botón del panel usa un ícono de panel lateral, no una flecha de regreso
rep('<svg viewBox="0 0 24 24"><path d="M14 6l-6 6 6 6"/></svg></button>\n      <div class="mapsum" id="mapsum"></div>',
    '<svg viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M9.5 4.5v15"/></svg></button>\n      <div class="mapsum" id="mapsum"></div>')
# M3 · la ayuda empieza por cómo usar la herramienta; la metodología sigue abajo
rep('<div class="eyebrow">Programa de Reforestación Urbana · Metodología</div>\n    <h2 id="info-title">',
    """<section class="howto" aria-labelledby="howto-title">
      <div class="eyebrow">Calles prioritarias para reforestar · Ayuda</div>
      <h2 id="howto-title">Cómo usar la herramienta</h2>
      <ol class="howto-steps">
        <li><b>Elige quién atiende.</b> <em>Alcaldías</em> muestra las calles y frentes de manzana que plantan las alcaldías; <em>Gobierno Central</em>, las vialidades primarias. Puedes marcar las dos.</li>
        <li><b>Busca tu territorio o tu calle.</b> En el mismo buscador escribe una alcaldía, una colonia, una avenida o una calle. No hace falta el nombre exacto: basta con algunas palabras, y reconoce abreviaturas como «Calz.» o «Av.». La ruta que aparece debajo te deja volver a la alcaldía o a toda la ciudad.</li>
        <li><b>Revisa y descarga.</b> Arriba de la respuesta ves los kilómetros prioritarios; en las pestañas, el detalle, el listado de calles y las descargas. El botón del pie descarga el listado en Excel y la ficha en PDF.</li>
      </ol>
      <h3 class="howto-gl">Términos que usa la herramienta</h3>
      <dl class="howto-terms">
        <dt>Frente de manzana</dt><dd>Cada lado de una manzana que da a la calle. Es la unidad que se prioriza: una calle tiene dos frentes, uno por acera.</dd>
        <dt>Tramo</dt><dd>Pedazo de una calle o avenida con su propia prioridad. Por eso una misma calle puede verse en varios colores.</dd>
        <dt>Prioritario</dt><dd>Categorías Muy Alta y Alta: donde conviene plantar primero.</dd>
        <dt>Atiende</dt><dd>Quién tiene la atribución de plantar: la alcaldía en la red local o el Gobierno de la Ciudad en las vialidades primarias.</dd>
      </dl>
    </section>
    <div class="eyebrow">Programa de Reforestación Urbana · Metodología</div>
    <h2 id="info-title">""")
rep('aria-modal="true" aria-labelledby="info-title"', 'aria-modal="true" aria-labelledby="howto-title"')
_b2 = open(SC + 'b2.css', encoding='utf-8').read()
# I2 · escala tipográfica de cinco pasos (12 · 14 · 16 · 20 · 28 px)
def _fs(m):
    v=float(m.group(1)); t = 12 if v<=12.5 else 14 if v<=14.5 else 16 if v<=17.5 else 20 if v<=22.5 else 28
    return 'font-size:%dpx' % t
_b1 = open(SC + 'b1.css', encoding='utf-8').read()
head = _re.sub(r'font-size:\s*(\d+(?:\.\d+)?)px', _fs, head)
_b1 = _re.sub(r'font-size:\s*(\d+(?:\.\d+)?)px', _fs, _b1)
_b2 = _re.sub(r'font-size:\s*(\d+(?:\.\d+)?)px', _fs, _b2)
app = _re.sub(r'font-size:\s*(\d+(?:\.\d+)?)px', _fs, app)
head += '<style id="bloque1">' + _b1 + '</style>\n<style id="bloque2">' + _b2 + '</style>\n'
out = head + libs + f'<script id="meta-b64" type="text/plain">{meta}</script>\n<script id="data-b64" type="text/plain">{data}</script>\n<script id="vp-b64" type="text/plain">{vp}</script>\n' + app
# esqueleto de página completa: el mismo que agrega el artefacto, más idioma y la instrucción
# de no aparecer en buscadores (quitar la línea ROBOTS cuando se apruebe su difusión)
_sk = lines[0].replace('<html>', '<html lang="es">', 1)
ROBOTS = '<meta name="robots" content="noindex, nofollow">'
_sk = _sk.replace('</head><body>', ROBOTS + '</head><body>', 1)
def completa(cuerpo):
    return _sk + '\n' + cuerpo + '</body></html>\n'

import hashlib as _hl, json as _json
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(RAIZ, 'docs')

def poner(rel, contenido):
    """Escribe un archivo del sitio solo si cambió (así Git no ve cambios falsos)."""
    ruta = os.path.join(DOCS, *rel.split('/'))
    os.makedirs(os.path.dirname(ruta), exist_ok=True)
    if os.path.exists(ruta) and open(ruta, 'rb').read() == contenido:
        return
    open(ruta, 'wb').write(contenido)

huella = lambda b: _hl.sha1(b).hexdigest()[:10]

# 1) Versión de un solo archivo, para abrir con doble clic sin servidor (no se publica: _local/ está en .gitignore)
os.makedirs(os.path.join(RAIZ, '_local'), exist_ok=True)
open(os.path.join(RAIZ, '_local', 'calles_prioritarias.html'), 'w', encoding='utf-8').write(completa(out))

# 2) Sitio (GitHub Pages y SIA): datos, librerías e imagen en archivos aparte, que el navegador
#    descarga en paralelo y conserva en caché aunque cambie el código
ver, total = {}, 0
for nombre, txt in (('meta.bin', meta), ('data.bin', data), ('vp.bin', vp)):
    b = _b64.b64decode(txt.strip())
    poner('datos/' + nombre, b); ver[nombre] = huella(b); total += len(b)
lver = {}
for lib in ('deck.js', 'pako.js', 'jspdf.js', 'xlsx.js'):
    b = open(SC + 'libs/' + lib, 'rb').read()
    poner('libs/' + lib, b); lver[lib] = huella(b)
_jpg = open(SC + 'composicion_frentes_manzana.jpg', 'rb').read()
poner('img/composicion_frentes_manzana.jpg', _jpg)
_imgtag = '<img src="data:image/jpeg;base64,' + _img + '"'
assert head.count(_imgtag) == 1, 'no se encontró la imagen de la metodología'
head_sitio = head.replace(_imgtag, '<img loading="lazy" src="img/composicion_frentes_manzana.jpg?v=' + huella(_jpg) + '"')
cfg = ('<script>window.SIA_LIBS = "libs/"; window.SIA_DATOS = '
       + _json.dumps({'v': ver, 'total': total}) + ';</script>\n'
       + '<script src="libs/deck.js?v=' + lver['deck.js'] + '"></script>\n'
       + '<script src="libs/pako.js?v=' + lver['pako.js'] + '"></script>\n')
_msg = 'Descomprimiendo datos…</div>'
assert head_sitio.count(_msg) == 1, 'no se encontró el mensaje inicial del cargador'
head_sitio = head_sitio.replace(_msg, 'Descargando la herramienta…</div>')
pagina = completa(head_sitio + cfg + app)
# que el navegador empiece a bajar los datos desde el primer momento, en paralelo con las librerías
_pre = ''.join('<link rel="preload" href="datos/%s?v=%s" as="fetch" crossorigin>' % (n, ver[n]) for n in ('data.bin', 'meta.bin', 'vp.bin'))
pagina = pagina.replace('</head>', _pre + '</head>', 1)
open(SALIDA, 'w', encoding='utf-8').write(pagina)
print('escrito en', SALIDA, '(%d KB; datos %.1f MB aparte)' % (len(pagina.encode()) // 1024, total / 1048576))
if '--artefacto' in sys.argv:
    _ruta = sys.argv[sys.argv.index('--artefacto') + 1]
    open(_ruta, 'w', encoding='utf-8').write(out)
    print('versión para artefacto en', _ruta)
print('bytes', len(out.encode()))
