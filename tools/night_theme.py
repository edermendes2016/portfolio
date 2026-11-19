# Composes assets/audio/night-rain-theme.mp3: the night (dark theme) version, slower and more
# melodic, with koto arpeggios, a shakuhachi melody and a soft rain bed. Needs numpy.
# Run: python tools/night_theme.py && ffmpeg -i night.wav -b:a 112k assets/audio/night-rain-theme.mp3
import numpy as np, wave
SR=44100; BPM=66; BEAT=60/BPM; BARS=16
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
half=BARS*4*BEAT/2
for st in (0,half): put(pad([hz('A2'),hz('E3'),hz('C4')],half+2.0),st-1.0,0,1.2)
# soft koto arpeggios (A minor / F / D minor / E, in the "in"-like colour with Bb and F)
pats={'Am':['A3','E4','A4','C5','B4','A4','E4','C4'],'F':['F3','C4','A4','C5','A4','F4','C4','A3'],
      'Dm':['D3','A3','D4','F4','E4','D4','A3','F3'],'E':['E3','B3','E4','Ab4','B4','Ab4','E4','B3']}
prog=['Am','F','Dm','E','Am','F','Dm','Am','F','Dm','Am','E','F','Dm','E','Am']
for bi,ch in enumerate(prog):
    for e in range(8):
        put(koto(hz(pats[ch][e]),2.2,bend=False),b(bi+1,e*0.5),-0.25,0.42 if e%4 else 0.55)
    put(shami(hz(pats[ch][0][:-1]+'2'),1.6),b(bi+1,0),0.1,0.5)
# melodic shakuhachi line (bars 3-16)
mel=[(3,[('C5',2),('B4',1),('A4',1)]),(4,[('B4',3),('E4',1)]),(5,[('A4',1.5),('B4',.5),('C5',1),('E5',1)]),(6,[('D5',2),('C5',2)]),
     (7,[('A4',2),('F4',1),('E4',1)]),(8,[('A4',4)]),(9,[('C5',1),('D5',1),('E5',2)]),(10,[('F5',2),('E5',1),('D5',1)]),
     (11,[('E5',2),('C5',1),('A4',1)]),(12,[('B4',4)]),(13,[('C5',1.5),('A4',.5),('F4',2)]),(14,[('D5',2),('C5',1),('B4',1)]),
     (15,[('Ab4',2),('B4',2)]),(16,[('A4',4)])]
for bar,notes in mel:
    beat=0
    for nme,d in notes:
        put(shaku(hz(nme),d*BEAT*0.96),b(bar,beat),0.3,1.05); beat+=d
# gentle rain bed (circular so it loops)
n=N; r=rng.standard_normal(n)
r=lowpass(lowpass(r,0.12),0.2); r=r-lowpass(r,0.01)
drops=np.zeros(n); idx=rng.integers(0,n,4000); drops[idx]=rng.uniform(0.2,1,4000)
drops=lowpass(drops,0.5)
L+=r*0.012+drops*0.01; R+=np.roll(r,9000)*0.012+np.roll(drops,5000)*0.01
def reverb(x,secs=3.0,mix=0.32):
    n=len(x); t=np.arange(int(secs*SR))/SR
    ir=rng.standard_normal(len(t))*np.exp(-t*2.4); ir=lowpass(ir,0.25)
    ir/=np.sqrt(np.sum(ir**2)); h=np.zeros(n); h[:len(ir)]=ir
    return x+mix*np.real(np.fft.ifft(np.fft.fft(x)*np.fft.fft(h)))
L=reverb(L); R=reverb(R)
peak=max(np.abs(L).max(),np.abs(R).max()); L*=0.85/peak; R*=0.85/peak
st=(np.stack([L,R],1)*32767).astype(np.int16)
with wave.open('night.wav','wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes())
print(N/SR,'s')
