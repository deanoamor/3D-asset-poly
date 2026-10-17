import json, subprocess, sys
BUILD=sys.argv[1] if len(sys.argv)>1 else 'realistic'
tmpl={"kind":"human","build":BUILD,"height":1.85,"weight":"normal","skin":"#c79670","hair":"#2b2220","hairStyle":"none","top":"#667060","bottom":"#4e5a6e","shoes":"#17181a","sleeves":"short","legs":"long","armAngle":32,"legSpread":7,"eyeScale":0.55,"paint":{"top":0.3,"bottom":0.85}}
json.dump({"name":"Operator","template":tmpl},open('/tmp/op_t.json','w'))
info=json.loads(subprocess.check_output(['node','scripts/studio.mjs','info','/tmp/op_t.json','--json']).decode().strip().splitlines()[-1])
J=info['joints']; PT=info['parts']
def lerp(a,b,t): return [round(a[i]+(b[i]-a[i])*t,4) for i in range(3)]
def add(a,b,t): return [round(a[i]+b[i]*t,4) for i in range(3)]
sp=J['Shoulder Left']; el=J['Elbow Left']; wr=J['Wrist Left']; fi=J['Fingers Left']
tw=PT['Torso']['size'][0]/2; td=PT['Torso']['size'][2]/2
hc=PT['Head']['center']; hs=PT['Head']['size']
BLACK='#1b1d20'; VEST='#25282a'; POUCH='#17191b'; GREY='#4b5058'
parts=[]
def P(**k): parts.append(k)
# --- head gear
hy=hc[1]
P(name='Helmet',kind='blob',center=[0,hy+0.07,-0.01],radii=[hs[0]*0.66,hs[1]*0.56,hs[2]*0.68],color='#1e2124',smooth=True,segments=9)
P(name='Helmet Rim',kind='sweep',rings=[{'p':[0,hy+0.047,-0.01],'r':[hs[0]*0.64,hs[2]*0.66]},{'p':[0,hy+0.066,-0.01],'r':[hs[0]*0.64,hs[2]*0.66]}],sides=10,color='#15171a')
P(name='NVG Mount',kind='box',pos=[0,hy+0.085,hs[2]*0.5+0.012],size=[0.05,0.04,0.026],color='#2d3135')
P(name='Helmet Rail Left',kind='box',pos=[hs[0]*0.64,hy+0.075,-0.005],size=[0.014,0.045,0.12],color='#2d3135',mirror=True)
P(name='Headset Left',kind='cylinder',pos=[hs[0]*0.5+0.012,hy-0.005,0.02],size=[0.07,0.045,0.07],rot=[0,0,90],segments=8,color='#121417',mirror=True)
P(name='Headset Boom',kind='sweep',rings=[{'p':[hs[0]*0.52,hy-0.01,0.035],'r':0.007},{'p':[hs[0]*0.48,hy-0.04,0.09],'r':0.007},{'p':[0.035,hy-0.06,hs[2]*0.5+0.02],'r':0.007}],sides=5,color='#121417')
# --- beard
P(name='Beard',kind='blob',center=[0,hy-0.052,hs[2]*0.35],radii=[hs[0]*0.44,0.072,0.062],color='#2a211d',smooth=True,segments=8)
P(name='Moustache',kind='box',pos=[0,hy-0.022,hs[2]*0.5+0.002],size=[0.07,0.016,0.02],color='#2a211d')
P(name='Sideburn Left',kind='blob',center=[hs[0]*0.44,hy-0.025,0.05],radii=[0.024,0.045,0.036],color='#2a211d',mirror=True,segments=6)
# --- plate carrier (narrower than the torso part + margin)
cx=tw*1.06; cz=td*1.14
P(name='Vest',kind='sweep',rings=[{'p':[0,1.03,0.003],'r':[cx*0.84,cz*0.95]},{'p':[0,1.2,0.008],'r':[cx,cz]},{'p':[0,1.42,0.01],'r':[cx*1.03,cz*1.02]},{'p':[0,1.57,0.012],'r':[cx*0.78,cz*0.95]}],sides=8,color=VEST,smooth=True)
P(name='Vest Strap Left',kind='box',pos=[cx*0.52,1.565,0.003],size=[0.07,0.02,cz*2+0.02],color=VEST,mirror=True)
fz=cz+0.012
P(name='Admin Pouch',kind='box',pos=[-0.02,1.38,fz],size=[cx*0.9,0.13,0.03],color='#2e3236')
P(name='Chest Patch',kind='box',pos=[-0.02,1.405,fz+0.016],size=[0.08,0.04,0.008],color='#4a4f55')
P(name='Radio Pouch',kind='box',pos=[cx*0.78,1.4,fz-0.004],size=[0.075,0.12,0.05],color='#1d2023')
P(name='Radio Antenna',kind='cylinder',pos=[cx*0.9,1.5,fz-0.02],size=[0.011,0.15,0.011],segments=5,color='#101113')
n=4; w=cx*1.5/n
for i in range(n):
    x=(i-(n-1)/2)*w
    P(name=f'Mag Pouch {i+1}',kind='box',pos=[round(x,3),1.14,fz+0.012],size=[round(w*0.92,3),0.135,0.05],color=POUCH)
    P(name=f'Mag Flap {i+1}',kind='box',pos=[round(x,3),1.2,fz+0.016],size=[round(w*0.94,3),0.026,0.054],color='#2b2f33')
P(name='Side Pouch Left',kind='box',pos=[cx*0.98,1.1,0.03],size=[0.065,0.15,0.12],color=POUCH,mirror=True)
P(name='Belt',kind='sweep',rings=[{'p':[0,0.985,0],'r':[cx*0.86,cz*0.98]},{'p':[0,1.03,0],'r':[cx*0.86,cz*0.98]}],sides=8,color='#14161a')
# --- gloves: a flat hand that continues the forearm
import math
f=[wr[i]-el[i] for i in range(3)]; L=math.sqrt(sum(x*x for x in f)); f=[x/L for x in f]
def along(t): return [round(wr[i]+f[i]*t,4) for i in range(3)]
P(name='Glove Left',kind='sweep',rings=[{'p':along(-0.02),'r':[0.036,0.05]},{'p':along(0.07),'r':[0.032,0.068]},{'p':along(0.15),'r':[0.022,0.058]}],sides=6,start='flat',end='dome',color=BLACK,mirror=True)
P(name='Glove Knuckles Left',kind='box',pos=[along(0.085)[0],along(0.085)[1],along(0.085)[2]+0.03],size=[0.07,0.07,0.012],rot=[0,0,-32],color=GREY,mirror=True)
P(name='Glove Cuff Left',kind='sweep',rings=[{'p':lerp(el,wr,0.82),'r':0.058},{'p':along(0.0),'r':0.056}],sides=7,color=BLACK,mirror=True)
# --- arms: muscle over the thin template arm
P(name='Arm Muscle Left',kind='sweep',rings=[{'p':lerp(sp,el,0.45),'r':0.07},{'p':el,'r':0.056},{'p':lerp(el,wr,0.45),'r':0.062},{'p':lerp(el,wr,0.9),'r':0.046}],sides=7,color='#c79670',paint=0.2,smooth=True,mirror=True)
# thigh straps and knee pad / calf detail are added below
# --- trousers: thicker legs, pockets, holsters, knee pads, boots
hp=J['Hip Left']; kn=J['Knee Left']; an=J['Ankle Left']
P(name='Trouser Left',kind='sweep',rings=[{'p':lerp(hp,kn,-0.06),'r':0.13},{'p':lerp(hp,kn,0.5),'r':0.118},{'p':kn,'r':0.1},{'p':lerp(kn,an,0.5),'r':0.092},{'p':lerp(kn,an,0.92),'r':0.086}],sides=8,color='#4e5a6e',paint=0.85,smooth=True,mirror=True)
th=lerp(hp,kn,0.38)
P(name='Thigh Pocket Left',kind='box',pos=[th[0]+0.0,th[1],0.138],size=[0.12,0.17,0.05],color='#2b2f34',mirror=True)
ho=lerp(hp,kn,0.3)
P(name='Holster Left',kind='box',pos=[ho[0]+0.14,ho[1]-0.02,0.03],size=[0.05,0.2,0.105],color='#15171a',mirror=True)
P(name='Holster Strap Left',kind='box',pos=[ho[0]+0.137,ho[1]+0.08,0.03],size=[0.056,0.028,0.11],color='#1d2023',mirror=True)
P(name='Pistol Left',kind='box',pos=[ho[0]+0.148,ho[1]-0.02,0.035],size=[0.03,0.15,0.085],color=GREY,mirror=True)
kp=lerp(kn,hp,0.0)
P(name='Knee Pad Left',kind='box',pos=[kp[0],kp[1],0.125],size=[0.14,0.17,0.06],color='#16181b',mirror=True,smooth=True)
P(name='Boot Shaft Left',kind='sweep',rings=[{'p':[an[0],0.07,0.0],'r':0.08},{'p':[lerp(kn,an,0.8)[0],lerp(kn,an,0.8)[1],0.0],'r':0.082}],sides=8,color='#17181a',mirror=True)
for t in (0.22,0.62):
    st_=lerp(hp,kn,t)
    P(name=f'Thigh Strap {int(t*100)} Left',kind='sweep',rings=[{'p':[st_[0],st_[1]-0.012,0.0],'r':0.131},{'p':[st_[0],st_[1]+0.012,0.0],'r':0.131}],sides=8,color='#1d2125',mirror=True)
P(name='Calf Pouch Left',kind='box',pos=[lerp(kn,an,0.4)[0]+0.095,lerp(kn,an,0.4)[1],0.02],size=[0.04,0.13,0.1],color='#1d2125',mirror=True)
P(name='Beard Lower',kind='blob',center=[0,hy-0.1,hs[2]*0.3],radii=[0.05,0.05,0.04],color='#2a211d',smooth=True,segments=6)
P(name='Back Plate',kind='box',pos=[0,1.35,-(cz+0.006)],size=[cx*1.2,0.26,0.03],color='#2b2f33')
P(name='Back Handle',kind='box',pos=[0,1.53,-(cz+0.006)],size=[0.07,0.025,0.02],color='#15171a')
spec={"name":"Operator","template":tmpl,"remove":["Hand Left","Hand Right","Cheek Left","Cheek Right"],"parts":parts}
json.dump(spec,open('examples/operator.json','w'),indent=1)
