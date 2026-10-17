import json, subprocess, math, random
random.seed(7)
tmpl={"kind":"human","build":"stylized","weight":"heavy","height":1.6,"skin":"#b8862f","top":"#b8862f","bottom":"#b8862f","shoes":"#b8862f","hairStyle":"none","face":False,"sleeves":"none","legs":"long","armAngle":24,"legSpread":7,"elbowBend":38}
json.dump({"name":"Mummy","template":tmpl},open('/tmp/mum_t.json','w'))
info=json.loads(subprocess.check_output(['node','scripts/studio.mjs','info','/tmp/mum_t.json','--json']).decode().strip().splitlines()[-1])
J=info['joints']; PT=info['parts']
H=1.6; W=1.1*1.3
PAL=['#dcaa3f','#e8bd53','#d2a037','#f0ca69','#c99532','#e2b247']
def col(i): return PAL[i%len(PAL)]
def v_add(a,b,t=1): return [a[i]+b[i]*t for i in range(3)]
def v_sub(a,b): return [a[i]-b[i] for i in range(3)]
def v_len(a): return math.sqrt(sum(x*x for x in a))
def v_norm(a):
    l=v_len(a) or 1; return [x/l for x in a]
def v_cross(a,b): return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
def lerp(a,b,t): return [a[i]+(b[i]-a[i])*t for i in range(3)]
def r4(v): return [round(x,4) for x in v]
def interp(table,t):
    for (t0,v0),(t1,v1) in zip(table,table[1:]):
        if t<=t1: return v0+(v1-v0)*(t-t0)/(t1-t0 or 1)
    return table[-1][1]
parts=[]
cnt=[0]
def P(**k): parts.append(k)
def band(name,c,axis,perp,w,rx,rz,tilt,i):
    """one bandage strip: a slanted collar around the limb; `tilt` = how much the strip rises over its width (metres)"""
    j=1+random.uniform(-0.04,0.05)
    deg=round(max(-38,min(38,math.degrees(math.atan2(tilt,2*rx)))),1)
    k=dict(name=f'{name} {i}',kind='band',center=r4(c),axis=r4(v_norm(axis)),radius=[round(rx*j,4),round(rz*j,4)],width=round(w,4),tilt=deg,thickness=0.016,color=col(i+len(parts)))
    if 'Left' in name: k['mirror']=True
    P(**k)
def limb(name,pts,radfn,n,w,tilt0,flip=False,mirror=True,rx_k=1.0):
    """wrap a limb polyline with n slanted bands"""
    segs=[(pts[k],pts[k+1]) for k in range(len(pts)-1)]
    lens=[v_len(v_sub(b,a)) for a,b in segs]; tot=sum(lens)
    for i in range(n):
        t=(i+0.5)/n
        d=t*tot; k=0
        while k<len(segs)-1 and d>lens[k]: d-=lens[k]; k+=1
        a,b=segs[k]; u=d/lens[k]
        c=lerp(a,b,u); axis=v_sub(b,a)
        ref=[0,0,1] if abs(axis[2])<0.9*v_len(axis) else [1,0,0]
        perp=v_cross(axis,ref)
        R=radfn(t)*rx_k
        sgn=-1 if (i%2 and flip) else 1
        band(name,c,axis,perp,w,R,R,tilt0*sgn*(1+0.3*math.sin(i*2.1)),i)
sh=J['Shoulder Left']; el=J['Elbow Left']; wr=J['Wrist Left']; fi=J['Fingers Left']
hp=J['Hip Left']; kn=J['Knee Left']; an=J['Ankle Left']; to=J['Toe Left']
armR=lambda t: 0.0755*interp([(0,1.15),(0.25,1.0),(0.5,0.88),(0.75,0.8),(1,0.66)],t)*1.55
legR=lambda t: 0.1007*interp([(0,1.05),(0.25,0.95),(0.5,0.78),(0.7,0.7),(1,0.55)],t)*1.36
hc=PT['Head']['center']; hs=[x*1.2 for x in PT['Head']['size']]; hc=[hc[0],hc[1]+0.025,hc[2]+0.01]
# ---------- head: a faceted dome, then bands
P(name='Head',kind='blob',center=[0,hc[1],hc[2]],radii=[hs[0]*0.5,hs[1]*0.5,hs[2]*0.5],color='#c8993a',segments=7)
hy=hc[1]
for i,dy in enumerate([-0.115,-0.07,-0.02,0.04,0.09,0.13]):
    yy=hy+dy; s=math.sqrt(max(0.05,1-((dy)/(hs[1]*0.5))**2))
    band('Head Wrap',[0,yy,hc[2]],[0,1,0],[1,0,0],0.07,hs[0]*0.5*1.1*s,hs[2]*0.5*1.1*s,0.05*(1 if i%2 else -1),i)
for i,x in enumerate([-0.06,0.0,0.06]):  # strips over the crown
    band('Crown Wrap',[x,hy+hs[1]*0.42,hc[2]],[0,1,0.0001],[0,0,1],0.05,0.06,hs[2]*0.5*0.9,0.04*(i-1),i)
# eyes: a dark gap with two glowing slits
P(name='Eye Pocket Left',kind='blob',center=[0.052,hy+0.012,hc[2]+hs[2]*0.5-0.004],radii=[0.05,0.036,0.022],color='#5d3714',segments=6,mirror=True)
P(name='Eye Glow Left',kind='blob',center=[0.052,hy+0.013,hc[2]+hs[2]*0.5+0.014],radii=[0.034,0.022,0.012],color='#ffd54a',mat={'glow':1.0,'rough':0.4},segments=6,mirror=True)
for i,(dy,tl) in enumerate([(-0.065,0.06),(-0.095,-0.05),(-0.125,0.05)]):  # wrapped mouth and chin
    band('Mouth Wrap',[0,hy+dy,hc[2]+0.012],[0,1,0],[1,0,0],0.05,hs[0]*0.5*0.98,hs[2]*0.5*0.98,tl,i)
P(name='Jaw',kind='box',pos=[0,hy-0.11,hc[2]+hs[2]*0.5-0.02],size=[hs[0]*0.5,0.05,0.05],rot=[15,0,0],color='#e2b247')
# ---------- neck
nk=J['Neck']
for i in range(2): band('Neck Wrap',[0,nk[1]+0.0+0.03*i,0.012],[0,1,0],[1,0,0],0.06,0.08,0.085,0.04*(1 if i else -1),i)
# ---------- torso: belly bands, criss-cross on the chest, shoulders
hipsY=J['Hips'][1]; chestY=J['Chest'][1]; shY=sh[1]
waistY=hipsY+(chestY-hipsY)*0.32
prof=[(waistY-0.032,(0.178,0.136)),(waistY,(0.25,0.133)),(chestY,(0.314,0.146)),(shY+0.008,(0.229,0.136))]
def torso_r(y):
    ys=[p[0] for p in prof]
    if y<=ys[0]: return prof[0][1]
    for (y0,r0),(y1,r1) in zip(prof,prof[1:]):
        if y<=y1:
            t=(y-y0)/(y1-y0); return (r0[0]+(r1[0]-r0[0])*t,r0[1]+(r1[1]-r0[1])*t)
    return prof[-1][1]
y=waistY-0.02; i=0
while y<chestY-0.06:  # belly: horizontal-ish bands
    rx,rz=torso_r(y); band('Belly Wrap',[0,y,0.005],[0,1,0],[1,0,0],0.062,rx*1.1,rz*1.13,0.03*(1 if i%2 else -1),i); y+=0.048; i+=1
for k,(y0,sgn) in enumerate([(chestY-0.05,1),(chestY+0.02,-1),(chestY+0.09,1),(chestY+0.16,-1)]):  # chest criss-cross
    rx,rz=torso_r(y0); band('Chest Wrap',[0,y0,0.005],[0,1,0],[1,0,0],0.085,rx*1.1,rz*1.14,0.2*sgn,k)
for i,yy in enumerate([hipsY-0.07,hipsY-0.02,hipsY+0.03]):  # hips
    band('Hip Wrap',[0,yy,0],[0,1,0],[1,0,0],0.06,0.2,0.145,0.03*(1 if i%2 else -1),i)
# shoulder pads
P(name='Shoulder Pad Left',kind='blob',center=[sh[0]+0.015,sh[1]+0.015,0.01],radii=[0.1,0.075,0.105],color='#e0b04a',segments=6,mirror=True)
for i in range(2): band('Shoulder Wrap Left',[sh[0]+0.015,sh[1]+0.01+0.02*i,0.01],[1,0.25,0],[0,0,1],0.05,0.1,0.105,0.04*(1 if i else -1),i)
# ---------- arms
limb('Arm Wrap Left',[sh,el,wr],armR,9,0.085,0.045,flip=True)
# hands: palm and claw fingers, wrapped
hand=lerp(wr,fi,0.5)
P(name='Palm Left',kind='box',pos=r4([hand[0],hand[1]-0.01,hand[2]]),size=[0.15,0.13,0.075],rot=[0,0,-20],color='#d8a640',mirror=True)
for f,(dx,ln) in enumerate([(-0.05,0.1),(-0.017,0.125),(0.017,0.115),(0.05,0.095)]):
    P(name=f'Finger {f+1} Left',kind='box',pos=r4([hand[0]+dx+0.02,hand[1]-0.11,hand[2]+0.05]),size=[0.033,ln,0.034],rot=[-38,0,-10],color=col(f+2),mirror=True)
P(name='Thumb Left',kind='box',pos=r4([hand[0]-0.055,hand[1]-0.05,hand[2]+0.035]),size=[0.038,0.09,0.038],rot=[-20,0,28],color='#e2b247',mirror=True)
for i in range(2): band('Wrist Wrap Left',lerp(wr,fi,-0.05+0.2*i),v_sub(wr,el),[0,0,1],0.045,0.058,0.06,0.03*(1 if i else -1),i)
# loose strips
P(name='Loose End Left',kind='box',pos=r4([el[0]+0.045,el[1]-0.12,0.085]),size=[0.035,0.17,0.006],rot=[0,0,6],color='#f0ca69',mirror=True)
P(name='Loose Waist Left',kind='box',pos=r4([0.1,waistY-0.1,0.14]),size=[0.04,0.17,0.006],rot=[0,0,-6],color='#e8bd53',mirror=True)
# ---------- legs
limb('Leg Wrap Left',[hp,kn,an],legR,11,0.075,0.04,flip=True)
# boots: chunky, wrapped
P(name='Boot Left',kind='box',pos=r4([an[0]+0.005,0.075,0.045]),size=[0.19,0.15,0.34],color='#c8993a',smooth=False,mirror=True)
P(name='Boot Toe Left',kind='box',pos=r4([an[0]+0.005,0.06,0.2]),size=[0.18,0.11,0.12],rot=[-10,0,0],color='#e2b247',mirror=True)
for i in range(3): band('Boot Wrap Left',[an[0]+0.005,0.07+0.045*i,0.045+0.01*i],[0,0,1],[1,0,0],0.075,0.085,0.07,0.04*(1 if i%2 else -1),i)
spec={"name":"Mummy","template":tmpl,"remove":["Hand Left","Hand Right"],"parts":parts}
json.dump(spec,open('examples/mummy.json','w'),indent=1)
print(len(parts),'parts')
