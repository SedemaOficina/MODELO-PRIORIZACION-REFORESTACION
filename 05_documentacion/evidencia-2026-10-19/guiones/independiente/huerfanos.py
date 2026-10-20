# Frentes prioritarios del modelo (clase del frente >= Media) a cargo del Gobierno Central que no quedan en ninguna lista ni descarga
import sys; sys.path.insert(0, sys.argv[1] if len(sys.argv)>1 else '.')
import datos_indep as D
d=D.carga('X:/r7/docs'); F=d['F']; V=d['V']
gc=[f for f in F if f['gc']]; gcp=[f for f in gc if D.PRIO(f['prio'])]
sinvp=[f for f in gcp if f['vp']<0]
vpbaja=[f for f in gcp if f['vp']>=0 and not D.PRIO(V[f['vp']]['prio'])]
km=lambda L: sum(f['len'] for f in L)/1000
print('frentes GC', len(gc), 'km', round(km(gc),2))
print('frentes GC prioritarios por su clase de frente', len(gcp), 'km', round(km(gcp),2))
print(' sin parte de vialidad (vp<0):', len(sinvp), 'km', round(km(sinvp),2))
print(' con parte de vialidad NO prioritaria:', len(vpbaja), 'km', round(km(vpbaja),2))
# al revés: frentes GC NO prioritarios cuya parte de VP sí es prioritaria
inv=[f for f in gc if not D.PRIO(f['prio']) and f['vp']>=0 and D.PRIO(V[f['vp']]['prio'])]
print('frentes GC no prioritarios con parte VP prioritaria', len(inv), 'km', round(km(inv),2))
# frentes de alcaldía prioritarios sin colonia
sc=[f for f in F if not f['gc'] and f['col']==0 and D.PRIO(f['prio'])]
print('frentes de alcaldía prioritarios sin colonia', len(sc), 'km', round(km(sc),2))
# frentes de alcaldía cuya colonia pertenece a otra alcaldía en el catálogo
M=d['M']; mun_of={i:c.get('m') for i,c in enumerate(M['colonias'])}
otra=[f for f in F if not f['gc'] and f['col'] and D.PRIO(f['prio']) and mun_of[f['col']]!=M['muns'][f['mun']]]
print('frentes de alcaldía prioritarios en colonia de otra alcaldía (catálogo)', len(otra), 'km', round(km(otra),2))
