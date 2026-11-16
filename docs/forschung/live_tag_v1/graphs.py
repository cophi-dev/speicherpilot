import json,datetime as d,numpy as np,matplotlib
matplotlib.use('Agg'); import matplotlib.pyplot as plt, matplotlib.dates as mdates
from zoneinfo import ZoneInfo
from scipy.optimize import linprog
from scipy.sparse import lil_matrix
B=ZoneInfo('Europe/Berlin')
BG='#F6F6F2';FG='#101214';PV='#B37D00';BESS='#0B6F70';GRID='#3558C9';LIM='#CA2E23';GR='#838689'
plt.rcParams.update({'font.family':'DejaVu Sans','axes.facecolor':BG,'figure.facecolor':BG,'axes.edgecolor':GR,'axes.labelcolor':FG,'xtick.color':FG,'ytick.color':FG,'font.size':12})
NOW=d.datetime(2026,11,14,16,27,40,tzinfo=B)
tp=json.load(open('tp_today.json')); S={p['name']:p['data'] for p in tp['production_types']}
ts=[d.datetime.fromtimestamp(t,B) for t in tp['unix_seconds']]
L=S['Load (incl. self-consumption)']; W=[None if a is None or b is None else a+b for a,b in zip(S['Wind offshore'],S['Wind onshore'])]; P=S['Solar']
R=[(l-w-s)/1e3 if None not in (l,w,s) else None for l,w,s in zip(L,W,P)]
pr=json.load(open('price_v1.json')); pts=[d.datetime.fromtimestamp(t,B) for t in pr['unix_seconds']]; pp=np.array(pr['price'],float)
# --- G1 Datenstand je Quelle
fig,ax=plt.subplots(figsize=(10.8,5.4),dpi=100)
src=[('Energy-Charts total_power\nLast',d.datetime(2026,11,14,15,0,tzinfo=B)),('Energy-Charts total_power\nWind, Solar, Restlast',d.datetime(2026,11,14,14,45,tzinfo=B)),('SMARD Viertelstunde\nLast, Wind, Solar',d.datetime(2026,11,14,15,45,tzinfo=B)),('Day-Ahead DE-LU\n(Energy-Charts, SMARD)',d.datetime(2026,11,16,0,0,tzinfo=B))]
t0=d.datetime(2026,11,14,0,0,tzinfo=B)
for i,(n,e) in enumerate(src):
    col=GRID if 'Day' in n else BESS
    ax.barh(i,(e-t0).total_seconds()/3600,left=0,color=col,height=.55)
    lag=(NOW-e).total_seconds()/60
    lab=f"bis {e:%H:%M}" + (f" · {lag:.0f} min hinter jetzt" if lag>0 else " · bis So 15.11 24:00 bekannt")
    ax.text(min((e-t0).total_seconds()/3600,47.2),i,'  '+lab if lag>0 else lab+'  ',va='center',ha='left' if lag>0 else 'right',color=FG if lag>0 else 'white',fontsize=11)
nh=(NOW-t0).total_seconds()/3600
ax.axvline(nh,color=LIM,lw=2); ax.text(nh,3.55,f'Abruf {NOW:%H:%M}',color=LIM,ha='center',fontsize=11)
ax.set_yticks(range(4)); ax.set_yticklabels([s[0] for s in src],fontsize=10); ax.invert_yaxis()
ax.set_xlim(0,48); ax.set_xticks(range(0,49,6)); ax.set_xticklabels(['Sa 00','06','12','18','So 00','06','12','18','24'])
ax.set_xlabel('Zeit (MEZ, Sa 14.11. bis So 15.11.2026), Balkenende = Ende der letzten Viertelstunde mit Wert')
ax.set_title('Wie weit reichen die Daten um 16:27 MEZ?',loc='left',fontsize=15,color=FG)
for s in ['top','right']: ax.spines[s].set_visible(False)
fig.text(.01,.01,'Quelle: api.energy-charts.info (total_power, price), smard.de chart_data 410/4067/4068; Abruf 14.11.2026 16:27–16:28 MEZ',fontsize=8,color=GR)
fig.tight_layout(rect=(0,.03,1,1)); fig.savefig('g1_datenstand.png'); plt.close()
# --- G2 Live-Tag Mockup: Restlast bis jetzt, DA-Preis ganzer Tag, Markt-Fahrplan x1
day=[t for t in pts if t.date()==d.date(2026,11,14)]; p=pp[:len(day)]
P_=4645.2;E=8154.5;eta=np.sqrt(.85);n=len(p);dt=.25
c=np.concatenate([p*dt,-p*dt,np.zeros(n)]);A=lil_matrix((n+1,3*n));b=np.zeros(n+1)
for t in range(n):
    A[t,2*n+t]=1
    if t>0:A[t,2*n+t-1]=-1
    A[t,t]=-eta*dt;A[t,n+t]=dt/eta;b[t]=.5*E if t==0 else 0
A[n,3*n-1]=1;b[n]=.5*E
r=linprog(c,A_eq=A.tocsr(),b_eq=b,bounds=[(0,P_)]*(2*n)+[(.1*E,.9*E)]*n,method='highs')
net=(r.x[n:2*n]-r.x[:n])/1e3
json.dump({'t':[x.isoformat() for x in day],'price':p.tolist(),'net_gw':net.tolist(),'erloes_eur_modell':-r.fun},open('fahrplan_x1_1411.json','w'))
fig,(a1,a2)=plt.subplots(2,1,figsize=(10.8,10.8),dpi=100,sharex=True,gridspec_kw={'height_ratios':[1.2,1]})
import statistics
def flag(Ls):
    # Einbruch-Regel: Wert > 6 GW unter dem letzten plausiblen Wert -> vorläufig, bis die Reihe zurückkommt
    f=[];good=None
    for v in Ls:
        if v is None: f.append(False); continue
        if good is not None and v<good-6000: f.append(True)
        else: f.append(False); good=v
    return f
FL=flag(L); json.dump([ts[i].strftime('%H:%M') for i,x in enumerate(FL) if x],open('flags_ec.json','w'))
rt=[t for t,v in zip(ts,R) if v is not None]; rv=[v for v in R if v is not None]; rf=[FL[i] for i,v in enumerate(R) if v is not None]
ok=np.array([None if f else v for v,f in zip(rv,rf)],dtype=float)
gt=[t for t,f in zip(rt,rf) if not f]; gv=[v for v,f in zip(rv,rf) if not f]
a1.plot(gt,gv,color=FG,lw=1.2,ls=':'); a1.plot(rt,ok,color=FG,lw=2.5); a1.fill_between(gt,0,gv,color=FG,alpha=.08)
for t,v,f in zip(rt,rv,rf):
    if f: a1.axvspan(t,t+d.timedelta(minutes=15),color=LIM,alpha=.18,lw=0); a1.plot(t+d.timedelta(minutes=7.5),max(v,0.3),'x',color=LIM,ms=8)
fx=[t for t,f in zip(rt,rf) if f]
a1.annotate('6 Viertelstunden mit Last-Einbruch um 9–14 GW:\nvorläufig, ausgeblendet (gepunktet überbrückt),\nsonst stünde hier ein Schein-„Überschuss“',xy=(fx[0],2),xytext=(d.datetime(2026,11,14,3,0,tzinfo=B),2.5),color=LIM,fontsize=10,arrowprops=dict(arrowstyle='->',color=LIM))
rv=[v for v,f in zip(rv,rf) if not f]; rt=[t for t,f in zip(rt,rf) if not f]
a1.text(rt[-1],rv[-1],f'  {rv[-1]:.1f} GW\n  Stand {rt[-1]+d.timedelta(minutes=15):%H:%M}',color=FG,va='center',fontsize=11)
a1.axvspan(rt[-1]+d.timedelta(minutes=15),day[-1]+d.timedelta(minutes=15),color=GR,alpha=.12)
a1.text(d.datetime(2026,11,14,20,30,tzinfo=B),max(rv)*.35,'noch keine\nIst-Daten',ha='center',color=GR,fontsize=12)
a1.set_ylabel('Restlast DE in GW\n(Last − Wind − Solar)'); a1.set_ylim(-5,max(rv)*1.25); a1.axhline(0,color=GR,lw=.8)
a1.set_title('So könnte /tag/heute aussehen: „läuft, Stand 14:45“',loc='left',fontsize=15)
a2.step(day,p,where='post',color=GRID,lw=2); a2.set_ylabel('Day-Ahead DE-LU in €/MWh',color=GRID)
a3=a2.twinx(); col=[BESS if v>0 else PV for v in net]
a3.bar(day,net,width=1/96*.9,align='edge',color=col,alpha=.55); a3.set_ylabel('Referenzflotte ×1, Markt-Fahrplan in GW\n(+ entladen, − laden)',color=BESS)
a3.axhline(0,color=GR,lw=.8); a3.set_ylim(-6,6)
for a in (a1,a2): a.axvline(NOW,color=LIM,lw=1.5,ls='--')
a1.text(NOW,max(rv)*1.18,f' Abruf {NOW:%H:%M}',color=LIM,fontsize=10)
a2.xaxis.set_major_formatter(mdates.DateFormatter('%H',tz=B)); a2.set_xlim(day[0],day[-1]+d.timedelta(minutes=15))
a2.set_xlabel('Uhrzeit Sa 14.11.2026 (MEZ), Viertelstunden')
for a in (a1,a2,a3):
    for s in ['top']: a.spines[s].set_visible(False)
fig.text(.01,.01,'Restlast: Energy-Charts total_power (Abruf 16:27 MEZ). Preis: Energy-Charts price DE-LU. Fahrplan: Modell, Preisnehmer, 4,65 GW / 8,15 GWh,\nRound-Trip 85 %, SoC 10–90 %, Start = Ende 50 %, volle Voraussicht auf den bekannten Day-Ahead-Preis. Kein beobachteter Speicherbetrieb.\nLaden ab 23:00 = Modellrand (SoC muss um 24:00 wieder 50 % sein), keine Marktaussage.',fontsize=8,color=GR)
fig.tight_layout(rect=(0,.055,1,1)); fig.savefig('g2_live_mockup.png'); plt.close()
print('erloes x1',-r.fun, 'max lade',net.min(),'max ent',net.max(), 'last R',rt[-1],rv[-1])

# --- G3 vorläufige Last heute: EC vs SMARD
sm=json.load(open('smard_today.json'))
fig,ax=plt.subplots(figsize=(10.8,6),dpi=100)
x=[t for t,v in zip(ts,L) if v is not None and t.hour>=9]; y=[v/1e3 for t,v in zip(ts,L) if v is not None and t.hour>=9]
ax.plot(x,y,'-o',color=FG,ms=3,lw=2,label='Energy-Charts Last inkl. Eigenverbrauch, Abruf 16:27')
b2=json.load(open('tp_today_2.json')); L2={p['name']:p['data'] for p in b2['production_types']}['Load (incl. self-consumption)']
t2=[d.datetime.fromtimestamp(t,B) for t in b2['unix_seconds']]
ax.plot([t for t,v in zip(t2,L2) if v is not None and t.hour>=9],[v/1e3 for t,v in zip(t2,L2) if v is not None and t.hour>=9],'--s',color=PV,ms=4,lw=1.8,label='dieselbe Reihe, Abruf 16:49 (nachkorrigiert)')
xs=[d.datetime(2026,11,14,int(k[:2]),int(k[3:]),tzinfo=B) for k in sorted(sm['410']) if sm['410'][k] is not None and int(k[:2])>=9]
ys=[sm['410'][k]*4/1e3 for k in sorted(sm['410']) if sm['410'][k] is not None and int(k[:2])>=9]
ax.plot(xs,ys,'-o',color=GRID,ms=3,lw=2,label='SMARD: Netzlast (MWh je ¼ h × 4)')
for t,v,f in zip(ts,L,FL):
    if f: ax.plot(t,v/1e3,'o',ms=11,mfc='none',mec=LIM,mew=2)
ax.text(x[0],64.5,'rote Kreise: Einbruch > 6 GW unter den letzten plausiblen Wert',color=LIM,fontsize=10)
ax.set_ylim(40,66); ax.set_ylabel('Last in GW'); ax.legend(loc='lower left',frameon=False,fontsize=9)
ax.xaxis.set_major_formatter(mdates.DateFormatter('%H:%M',tz=B)); ax.set_xlabel('Sa 14.11.2026, MEZ (Viertelstundenbeginn)')
ax.set_title('Die letzten 2–3 Stunden sind vorläufig: Einbrüche, die 20 Minuten später anders aussehen',loc='left',fontsize=13)
for s_ in ['top','right']: ax.spines[s_].set_visible(False)
fig.text(.01,.01,'Quelle: api.energy-charts.info total_power, smard.de chart_data 410; Abrufe 14.11.2026 16:27–16:49 MEZ. SMARD ohne Eigenverbrauch, daher Niveauabstand.',fontsize=8,color=GR)
fig.tight_layout(rect=(0,.03,1,1)); fig.savefig('g3_vorlaeufig.png'); plt.close()
print('flags',[ts[i].strftime('%H:%M') for i,x in enumerate(FL) if x])
