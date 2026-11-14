"""Reproducible original procedural music, SVG art, and house advert. No external media."""
import math, wave, struct, random, subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'public'; SR=24000
TRACKS=[('after-hours',92,57,[0,3,7,10],[0,7,3,5]),('golden-hour',104,60,[0,4,7,11],[0,5,9,7]),('city-lights',116,54,[0,3,7,10],[0,8,3,10]),('slow-mornings',78,62,[0,3,7,10],[0,5,3,7]),('wildflower',100,59,[0,4,7,11],[0,5,2,7]),('ocean-drive',110,55,[0,4,7,9],[0,9,5,7])]
def hz(n):return 440*2**((n-69)/12)
def generate(slug,bpm,root,chord,progression):
    length=32*60/bpm; n=int(length*SR); data=[0.0]*n; rng=random.Random(slug)
    def note(start,dur,midi,amp,voice='soft'):
        s=int(start*SR); count=min(int(dur*SR),n-s); f=hz(midi)
        for j in range(max(0,count)):
            t=j/SR; env=min(1,t/.018)*math.exp(-t/(dur*.55))*min(1,(dur-t)/.09)
            v=math.sin(2*math.pi*f*t)
            if voice=='soft':v+=.23*math.sin(2*math.pi*f*2*t)+.1*math.sin(2*math.pi*f*3*t)
            else:v+=.18*math.sin(2*math.pi*f*2*t)
            data[s+j]+=amp*env*v
    beat=60/bpm
    for b in range(32):
        base=root+progression[(b//8)%4]
        if b%4==0:
            for k in chord:note(b*beat,beat*3.8,base+k,.065)
        if b%2==0:note(b*beat,beat*.85,base-24,.21,'bass')
        melody=[12,19,15 if chord[1]==3 else 16,22,19,14,12,19]
        note((b+.5)*beat,beat*.75,base+melody[(b+len(slug))%8],.09)
        if b%4 in [0,2]:
            start=int(b*beat*SR)
            for j in range(min(int(.18*SR),n-start)):
                t=j/SR; data[start+j]+=.28*math.sin(2*math.pi*(48*t+80*.018*(1-math.exp(-t/.018))))*math.exp(-t*22)
        for offset in [0,.5]:
            start=int((b+offset)*beat*SR)
            for j in range(min(int(.04*SR),n-start)):
                t=j/SR; data[start+j]+=(rng.random()*2-1)*.035*math.exp(-t*100)
        if b%4==2:
            start=int(b*beat*SR)
            for j in range(min(int(.1*SR),n-start)):
                t=j/SR; data[start+j]+=(rng.random()*2-1)*.10*math.exp(-t*40)
    # A quiet quarter-note echo, soft limiting, and click-free bookends.
    delay=int(beat*.75*SR)
    for i in range(n-1,delay,-1):data[i]+=data[i-delay]*.16
    peak=max(abs(x) for x in data); pcm=bytearray()
    for i,x in enumerate(data):
        fade=min(1,i/(SR*.12),(n-i)/(SR*1.1)); pcm.extend(struct.pack('<h',int(math.tanh(x/peak*1.3)*25000*fade)))
    path=OUT/'audio'/f'{slug}.wav'
    with wave.open(str(path),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes(pcm)
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(path),'-codec:a','libmp3lame','-b:a','96k',str(path.with_suffix('.mp3'))],check=True);path.unlink()
    print(f'{slug}: {length:.2f}s')
for t in TRACKS:generate(*t)
palettes=[('#06052d','#ad69ff','#e5a9fc'),('#592119','#fc994f','#ffe4ad'),('#002832','#26bca8','#aff8e0'),('#30243e','#baaecc','#e8dcef'),('#203e29','#a9be79','#e5e1b6'),('#122b55','#5a9fe5','#c4dfef')]
names=['AFTER HOURS','GOLDEN HOUR','CITY LIGHTS','SLOW MORNINGS','WILDFLOWER','OCEAN DRIVE']
for i,(slug,*_) in enumerate(TRACKS):
    a,b,c=palettes[i];rng=random.Random(i)
    paths=''
    for k in range(7):
        y=240+k*24; points=' '.join(f'{x},{y+math.sin(x/90+k+i)*50}' for x in range(-30,551,20))
        paths+=f'<polyline points="{points}" fill="none" stroke="{c}" stroke-opacity="{.14+k*.08}" stroke-width="{2+k*3}"/>'
    stars=''.join(f'<circle cx="{rng.randrange(500)}" cy="{rng.randrange(500)}" r="{rng.random()*1.5}" fill="white" opacity=".4"/>' for _ in range(70))
    design=f'<circle cx="{270+i*15%100}" cy="190" r="100" fill="url(#sun)"/>{paths}'
    if i==1:design=f'<circle cx="250" cy="230" r="157" fill="url(#sun)"/><path d="M0 410 Q160 210 320 375 T550 320V500H0Z" fill="{a}"/>{paths}'
    if i==2:design=''.join(f'<rect x="{j*37}" y="{150+rng.randrange(200)}" width="30" height="350" fill="'+(b if j%3 else c)+'" opacity=".5"/>' for j in range(14))+paths
    if i==3:design=f'<ellipse cx="250" cy="280" rx="170" ry="170" fill="{c}" opacity=".4"/><path d="M140 310h175v60q-85 60-175 0Z" fill="{c}"/><ellipse cx="228" cy="310" rx="88" ry="18" fill="{a}"/><path d="M310 320q80-20 35 40h-30" fill="none" stroke="{c}" stroke-width="16"/>'
    if i==4:design=''.join(f'<ellipse cx="250" cy="250" rx="45" ry="150" fill="{c}" opacity=".65" transform="rotate({k*60} 250 250)"/>' for k in range(6))+f'<circle cx="250" cy="250" r="54" fill="{a}"/>'
    if i==5:design=f'<circle cx="365" cy="125" r="47" fill="{c}"/>'+paths+f'<path d="M110 500 250 290 340 500" fill="{a}" stroke="{c}" stroke-opacity=".5"/><path d="m250 320-12 35m-14 25-17 45m-17 30-22 45" stroke="{c}" stroke-width="4"/>'
    svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="{a}"/><stop offset="1" stop-color="{b}"/></linearGradient><linearGradient id="sun" x2=".2" y2="1"><stop stop-color="{c}"/><stop offset="1" stop-color="{b}" stop-opacity=".1"/></linearGradient><filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".65" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feBlend in="SourceGraphic" mode="soft-light"/></filter></defs><rect width="500" height="500" fill="url(#bg)"/>{stars}{design}<rect width="500" height="500" fill="transparent" filter="url(#grain)" opacity=".14"/><text x="30" y="45" font-family="sans-serif" letter-spacing="5" font-size="12" fill="{c}">HORICX ORIGINALS / 0{i+1}</text><text x="30" y="467" font-family="sans-serif" font-weight="700" letter-spacing="4" font-size="25" fill="{c}">{names[i]}</text></svg>'
    (OUT/'art'/f'{slug}.svg').write_text(svg)
    # Abstract portraits: fictional artists, entirely geometric original artwork.
    portrait=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 300"><defs><linearGradient id="b" x2="1" y2="1"><stop stop-color="{b}"/><stop offset="1" stop-color="{a}"/></linearGradient></defs><rect width="300" height="300" fill="url(#b)"/><circle cx="150" cy="150" r="110" fill="none" stroke="{c}" opacity=".25"/><path d="M45 300q0-100 105-100t105 100" fill="{a}"/><ellipse cx="150" cy="136" rx="50" ry="65" fill="{c}"/><path d="M99 141q-24-102 63-84 58 10 40 88l-16-48q-50 38-87 25Z" fill="{a}"/><path d="m118 145 24 4m18 0 23-4" stroke="{a}" stroke-width="5"/><path d="M141 174q10 6 20-1" stroke="{a}" fill="none" stroke-width="3"/><path d="M80 282q70-50 140 0" stroke="{b}" fill="none" stroke-width="3"/></svg>'
    (OUT/'art'/f'artist-{i}.svg').write_text(portrait)
# Wide original landscape for the featured release.
svg='''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1400 650"><defs><linearGradient id="sky" x2=".5" y2="1"><stop stop-color="#1c123a"/><stop offset=".55" stop-color="#603f8c"/><stop offset="1" stop-color="#dc9fb4"/></linearGradient><linearGradient id="moon" x2="0" y2="1"><stop stop-color="#ffe5d1"/><stop offset="1" stop-color="#c77aaf"/></linearGradient><linearGradient id="floor" x2="0" y2="1"><stop stop-color="#433259"/><stop offset="1" stop-color="#151225"/></linearGradient><filter id="blur"><feGaussianBlur stdDeviation="35"/></filter></defs><rect width="1400" height="650" fill="url(#sky)"/><ellipse cx="1000" cy="290" rx="210" ry="180" fill="#b68bbd" filter="url(#blur)" opacity=".5"/><circle cx="1000" cy="228" r="136" fill="url(#moon)"/><path d="m0 420 190-170 110 90 180-120 145 170 130-70 120 90 160-130 130 90 150-160 85 55v385H0Z" fill="#3c2c59"/><path d="m0 440 210-97 170 110 210-130 180 90 160-70 100 110 145-100 225 120v177H0Z" fill="#261d3e"/><path d="M0 470q400-120 760-35t640-20v235H0Z" fill="url(#floor)"/><path d="m1050 440-450 210h500l-20-210" fill="#191625"/><path d="m1064 448-21 18m-13 13-30 24m-20 20-50 40m-30 25-90 62" stroke="#d8acc7" stroke-opacity=".6" stroke-width="3"/><g fill="#e4c9f5" opacity=".6"><circle cx="730" cy="70" r="1.4"/><circle cx="1240" cy="110" r="2"/><circle cx="880" cy="120" r="1"/><circle cx="1120" cy="43" r="1.4"/><circle cx="680" cy="160" r="2"/><circle cx="1330" cy="200" r="1.4"/></g><path d="M1250 470v-130m0 20-40-23m40 8 43-22m-43 70-46-26m46 0 40-25" stroke="#1d192b" stroke-width="12" stroke-linecap="round"/><path d="M1185 490v-80m0 20-22-12m22-1 25-19" stroke="#1d192b" stroke-width="7" stroke-linecap="round"/></svg>'''
(OUT/'art'/'hero.svg').write_text(svg)
subprocess.run(['ffmpeg','-y','-loglevel','error','-f','lavfi','-i','color=c=0x171225:s=960x540:r=24:d=8','-i',str(OUT/'audio'/'golden-hour.mp3'),'-vf',"drawbox=x=0:y=490:w=iw:h=50:color=0xc5f66d:t=fill,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text='HORICX MUSIC':fontcolor=0xc5f66d:fontsize=58:x=(w-tw)/2:y=160,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='Good music. Your frequency.':fontcolor=white:fontsize=29:x=(w-tw)/2:y=250,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf:text='DEMO ADVERT - 8 SECONDS':fontcolor=0xa9a2b7:fontsize=18:x=(w-tw)/2:y=355",'-af','afade=t=in:d=0.3,afade=t=out:st=7:d=1','-t','8','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-b:a','96k','-movflags','+faststart',str(OUT/'demo-advert.mp4')],check=True)
print('Original artwork and 8-second advert generated.')
# Raster exports for the strict production cover-upload allowlist.
for slug,*_ in TRACKS:
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(OUT/'art'/f'{slug}.svg'),'-frames:v','1',str(OUT/'art'/f'{slug}.png')],check=True)
