# Composes assets/audio/samurai-theme.mp3: an original 48-second loop in the Japanese
# "in" scale (koto, shakuhachi, shamisen and taiko, all synthesised with numpy).
# Run: python tools/samurai_theme.py && ffmpeg -i theme.wav -b:a 112k assets/audio/samurai-theme.mp3
import numpy as np, wave
SR=44100; BPM=80; BEAT=60/BPM; BARS=16
N=int(round(BARS*4*BEAT*SR)); L=np.zeros(N); R=np.zeros(N)
rng=np.random.default_rng(3)
NAMES={'C':0,'C#':1,'D':2,'Eb':3,'E':4,'F':5,'F#':6,'G':7,'Ab':8,'A':9,'Bb':10,'B':11}
def hz(n):
    name,octv=n[:-1],int(n[-1]); m=12*(octv+1)+NAMES[name]; return 440*2**((m-69)/12)
def put(sig,t,pan=0.0,gain=1.0):
    i=int(t*SR)%N; sig=sig*gain; n=len(sig)
    idx=(np.arange(n)+i)%N  # wrap around: seamless loop
    np.add.at(L,idx,sig*(1-pan)/2*2**.5*0.7071*1.414/1.414); np.add.at(R,idx,sig*(1+pan)/2)
def koto(f,dur=1.8,bend=True):
    n=int(dur*SR); t=np.arange(n)/SR
    fi=f*(1+(0.012*np.exp(-t*18) if bend else 0))
    ph=2*np.pi*np.cumsum(fi)/SR; s=np.zeros(n)
    for k in range(1,9):
        s+=np.sin(k*ph)*(1/k**1.1)*np.exp(-t*(2.2+k*1.6))
    att=np.minimum(1,t/0.003); click=rng.standard_normal(n)*np.exp(-t*300)*0.15
    return (s*att+click)*0.5
def shami(f,dur=0.9):
    n=int(dur*SR); t=np.arange(n)/SR; ph=2*np.pi*f*t; s=np.zeros(n)
    for k in range(1,12): s+=np.sin(k*ph)*(1/k)*np.exp(-t*(5+k*2.5))
    return s*np.minimum(1,t/0.002)*0.45
def lowpass(x,a):
    y=np.empty_like(x); acc=0.0
    # one-pole via numpy-friendly recursion approximation (small arrays only)
    for i in range(len(x)): acc+=a*(x[i]-acc); y[i]=acc
    return y
def taiko(strength=1.0,dur=0.9):
    n=int(dur*SR); t=np.arange(n)/SR
    f=48+40*np.exp(-t*30); ph=2*np.pi*np.cumsum(f)/SR
    body=np.sin(ph)*np.exp(-t*6)
    noise=lowpass(rng.standard_normal(n),0.08)*np.exp(-t*25)*1.5
    return (body+noise)*strength*0.9
def shaku(f,dur):
    n=int(dur*SR); t=np.arange(n)/SR
    vib=1+0.006*np.sin(2*np.pi*5.2*t)*np.minimum(1,t/0.6)
    ph=2*np.pi*np.cumsum(f*vib)/SR
    s=np.sin(ph)+0.25*np.sin(2*ph)+0.08*np.sin(3*ph)
    env=np.minimum(1,t/0.18)*np.minimum(1,(dur-t)/0.25).clip(0,1)
    breath=lowpass(lowpass(rng.standard_normal(n),0.12),0.3)*0.05*np.minimum(1,t/0.05)*np.exp(-t*3)
    breath2=0
    return (s*env*(0.8+0.2*np.exp(-t*2))+breath+breath2*env)*0.32
def pad(freqs,dur):
    n=int(dur*SR); t=np.arange(n)/SR; s=np.zeros(n)
    for f in freqs:
        for d in (-0.15,0.15):
            ph=2*np.pi*(f+d)*t
            s+=np.sin(ph)+0.3*np.sin(2*ph)+0.12*np.sin(3*ph)
    env=np.minimum(1,t/2.0)*np.minimum(1,(dur-t)/2.0).clip(0,1)
    return s*env*0.035
b=lambda bar,beat: ((bar-1)*4+beat)*BEAT
# pad drone, two overlapping halves for a smooth loop
half=BARS*4*BEAT/2
for st in (0,half): put(pad([hz('D3'),hz('A3')],half+2.0),st-1.0,0,1)
# koto melody, section A (bars 1-8), played twice softer echo in B
melA=[ [('D5',1),('A4',.5),('Bb4',.5),('A4',1),('G4',1)], [('A4',1.5),('D4',.5),('Eb4',1),('D4',1)],
  [('G4',1),('A4',.5),('Bb4',.5),('D5',1),('Eb5',1)], [('D5',3),(None,1)],
  [('Bb4',1),('A4',.5),('G4',.5),('A4',1),('Bb4',1)], [('A4',1.5),('G4',.5),('Eb4',1),('D4',1)],
  [('G4',.5),('A4',.5),('Bb4',1),('A4',.5),('G4',.5),('Eb4',1)], [('D4',3),(None,1)] ]
for bi,bar in enumerate(melA):
    beat=0
    for nme,d in bar:
        if nme: put(koto(hz(nme),max(1.4,d*BEAT+0.8)),b(bi+1,beat),-0.35,0.9)
        beat+=d
# shakuhachi, section B (bars 9-16)
melB=[[('A4',2),('Bb4',1),('A4',1)],[('G4',4)],[('Bb4',2),('D5',2)],[('Eb5',3),('D5',1)],
  [('D5',2),('Bb4',1),('A4',1)],[('G4',2),('A4',2)],[('Bb4',1.5),('A4',.5),('G4',1),('Eb4',1)],[('D4',4)]]
for bi,bar in enumerate(melB):
    beat=0
    for nme,d in bar:
        put(shaku(hz(nme),d*BEAT*0.97),b(bi+9,beat),0.35,1); beat+=d
# koto arpeggios under section B
pats={'D':['D4','A4','D5','A4'],'G':['G3','D4','G4','D4'],'Bb':['Bb3','D4','A4','D4'],'A':['A3','Eb4','A4','Eb4']}
for bi,root in enumerate(['D','G','Bb','A','D','G','Bb','D']):
    for e in range(8):
        put(koto(hz(pats[root][e%4]),1.2,bend=False),b(bi+9,e*0.5),-0.2,0.35)
# shamisen bass
rootsA=['D','D','G','D','Bb','A','G','D']; rootsB=['D','G','Bb','A','D','G','Bb','D']
oct2={'D':'D3','G':'G2','Bb':'Bb2','A':'A2'}
for bi,r in enumerate(rootsA+rootsB):
    put(shami(hz(oct2[r])),b(bi+1,0),0.1,0.8); put(shami(hz(oct2[r])),b(bi+1,2),0.1,0.55)
    if bi>=8: put(shami(hz(oct2[r])*1.5),b(bi+1,3.5),0.1,0.4)
# taiko
for bar in range(1,BARS+1):
    put(taiko(1.0),b(bar,0),0,0.9); put(taiko(0.6),b(bar,2),0,0.9)
    if bar>8: put(taiko(0.45),b(bar,2.5),0,0.9); put(taiko(0.35),b(bar,1.5),0,0.9)
    if bar%4==0:
        for k in range(4): put(taiko(0.25+0.12*k,0.4),b(bar,3+k*0.25),0,0.9)
# circular reverb (seamless loop)
def reverb(x,secs=2.2,mix=0.22):
    n=len(x); t=np.arange(int(secs*SR))/SR
    ir=rng.standard_normal(len(t))*np.exp(-t*3.2); ir=lowpass(ir,0.3)
    ir/=np.sqrt(np.sum(ir**2)); h=np.zeros(n); h[:len(ir)]=ir
    wet=np.real(np.fft.ifft(np.fft.fft(x)*np.fft.fft(h)))
    return x+mix*wet
L=reverb(L); R=reverb(R)
peak=max(np.abs(L).max(),np.abs(R).max()); L*=0.89/peak; R*=0.89/peak
st=(np.stack([L,R],1)*32767).astype(np.int16)
with wave.open('theme.wav','wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes())
print(N/SR,'s')
