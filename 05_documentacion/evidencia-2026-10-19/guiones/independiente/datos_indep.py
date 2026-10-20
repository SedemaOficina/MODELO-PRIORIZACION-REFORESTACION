# Lector independiente de docs/datos (no usa código de la herramienta). Uso: import datos_indep as D; d = D.carga('X:/r7/docs')
import gzip, json, os
def ints(raw):
    out=[]; res=0; sh=0
    for b in raw:
        res |= (b & 0x7f) << sh
        if b & 0x80: sh += 7; continue
        out.append(-((res+1)//2) if res & 1 else res//2); res=0; sh=0
    return out
def rd(p):
    raw=open(p,'rb').read()
    return gzip.decompress(raw) if raw[:2]==b'\x1f\x8b' else raw
def carga(docs):
    M=json.loads(rd(os.path.join(docs,'datos','meta.bin')).decode('utf8'))
    a=ints(rd(os.path.join(docs,'datos','data.bin'))); p=0
    N=a[p]; p+=1; F=[]
    for i in range(N):
        mun,prio,name,tipo,col,ln,fl,vp=a[p:p+8]; p+=8; nv=a[p]; p+=1; p+=2*nv
        F.append(dict(i=i,mun=mun,prio=prio,name=name,tipo=tipo,col=col,len=ln,flags=fl,vp=vp-1,gc=(fl>>6)&1,arb=fl&7,banq=(fl>>3)&7))
    a=ints(rd(os.path.join(docs,'datos','vp.bin'))); p=0
    NV=a[p]; p+=1; V=[]
    for i in range(NV):
        nom,nombre,tipo,car,circ,alct,mun,prio,ln,clave,rec=a[p:p+11]; p+=11; nv=a[p]; p+=1; p+=2*nv
        V.append(dict(i=i,nom=nom,nombre=nombre,tipo=tipo,mun=mun,prio=prio,len=ln,clave=clave,rec=rec))
    # espacios
    a=ints(rd(os.path.join(docs,'datos','inventario','espacios_frentes.bin'))); p=0
    fmt=a[p]; n=a[p+1]; p+=2; EF={}; last=-1
    for k in range(n):
        last+=a[p]; EF[last]=(a[p+1],a[p+2],a[p+3]); p+=4
    a=ints(rd(os.path.join(docs,'datos','inventario','espacios_vp.bin'))); p=0
    fmt2=a[p]; n=a[p+1]; p+=2; EV={}; last=-1
    for k in range(n):
        last+=a[p]; EV[last]=(a[p+1],a[p+2],a[p+3]); p+=4
    return dict(M=M,F=F,V=V,EF=EF,EV=EV,fmtF=fmt,fmtV=fmt2)
PRIO=lambda p: p>=2
