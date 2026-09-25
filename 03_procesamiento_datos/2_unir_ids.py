"""Enriquece el catálogo de colonias con el Índice de Desarrollo Social por Unidad Territorial (EVALÚA CDMX)."""
import json, numpy as np, shapefile, shapely, unicodedata, re
from shapely import STRtree
from pyproj import Transformer

import os
SC = os.path.dirname(os.path.abspath(__file__)) + os.sep          # esta carpeta
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) + os.sep
M=json.load(open(SC+'intermedios/meta.json', encoding='utf-8')); Q=M['Q']
to_wgs=Transformer.from_crs('EPSG:32614','EPSG:4326',always_xy=True)
r=shapefile.Reader(SC+'insumos/IDS_ut/IDS_ponderado.shp', encoding='utf-8')
f=[x[0] for x in r.fields[1:]]
UT=[]; polys=[]
for sr in r.iterShapeRecords():
    rec=dict(zip(f, sr.record)); pts=sr.shape.points; parts=list(sr.shape.parts)+[len(pts)]
    rings=[]
    for i in range(len(parts)-1):
        p=np.array(pts[parts[i]:parts[i+1]], float)
        if len(p)<4: continue
        lon,lat=to_wgs.transform(p[:,0],p[:,1]); rings.append(np.column_stack([lon,lat]))
    if not rings: continue
    g=shapely.MultiPolygon([shapely.Polygon(x) for x in rings]) if len(rings)>1 else shapely.Polygon(rings[0])
    if not g.is_valid: g=g.buffer(0)
    UT.append(rec); polys.append(g)
print('UT', len(UT))
tree=STRtree(polys)
# centroides de colonia
cent={}
for c in M['cols']:
    pts=[p for ring in c['rings'] for p in ring]
    if not pts: continue
    a=np.array(pts,float)/Q; cent[c['i']]=shapely.Point(a[:,0].mean(), a[:,1].mean())
ids_lbl=[]; asign=0; porcerc=0
for i,cn in enumerate(M['colonias']):
    if i==0 or not cn.get('n'): continue
    p=cent.get(i)
    if p is None: continue
    hit=tree.query(p, predicate='within')
    k=int(hit[0]) if len(hit) else int(tree.nearest(p))
    if not len(hit): porcerc+=1
    u=UT[k]
    cn['ids']=u['e_idsm'] if u['pobtotal'] else ''
    cn['nbi']=int(u['pobres_tot']) if u['pobtotal'] else 0
    cn['ut']=u['nombre_ut'].title()
    cn['utpob']=int(u['pobtotal'])
    asign+=1
print('colonias enlazadas', asign, '· por cercanía', porcerc)
from collections import Counter
print(Counter(c.get('ids') for c in M['colonias'][1:] if c.get('n')).most_common())
# población en colonias prioritarias
pob=sum(c.get('pob',0) for c in M['colonias'][1:] if c.get('n'))
pobp=sum(c.get('pob',0) for c in M['colonias'][1:] if c.get('n') and c.get('p',-1)>=3)
print(f'población total en colonias {pob:,} · en colonias prioritarias {pobp:,} ({100*pobp/pob:.1f} %)')
json.dump(M, open(SC+'intermedios/meta.json', 'w', encoding='utf-8'), ensure_ascii=False)
print('meta.json actualizado')
