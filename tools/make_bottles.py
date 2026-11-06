"""يولّد 56 صورة زجاجة عطر (SVG) ويحدّث db.json. شغّله: python tools/make_bottles.py
هذه رسومات متجهية مولّدة بالكود (ليست صور تصوير فوتوغرافي). للصور الواقعية استبدل الملفات بصورك بنفس الأسماء."""
import json, math, os, colorsys, random
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'public', 'images', 'art')

def hx(h):  h=h.lstrip('#'); return [int(h[i:i+2],16) for i in (0,2,4)]
def mix(a,b,t): A,B=hx(a),hx(b); return '#%02x%02x%02x'%tuple(round(A[i]*(1-t)+B[i]*t) for i in range(3))
def hsl(h,s,l): r,g,b=colorsys.hls_to_rgb(h/360,l,s); return '#%02x%02x%02x'%(round(r*255),round(g*255),round(b*255))

CAPS = {  # (فاتح، متوسط، داكن)
 'gold':('#f0d9a0','#cba36a','#6e4f22'), 'silver':('#f4f4f6','#b9bcc4','#5d6068'),
 'rose':('#f7d3c8','#d9a08e','#7d4a3e'), 'black':('#6b6b72','#2a2a30','#0c0c0f'), 'copper':('#f0b98a','#b8683a','#5a2e16')}

# الشكل: (عنصر الجسم، المركز، صندوق، العنق(x,y,w,h)، مكان الملصق(x,y,w,h))
def shapes():
    return {
 'rect':  (lambda e:f'<rect x="60" y="190" width="180" height="280" rx="22" {e}/>', (150,330), (60,190,240,470), (126,160,48,32), (92,300,116,100)),
 'round': (lambda e:f'<circle cx="150" cy="340" r="130" {e}/>', (150,340), (20,210,280,470), (128,170,44,42), (104,318,92,84)),
 'slim':  (lambda e:f'<rect x="92" y="130" width="116" height="340" rx="14" {e}/>', (150,300), (92,130,208,470), (130,104,40,28), (108,290,84,110)),
 'hex':   (lambda e:f'<polygon points="150,200 240,245 240,425 150,470 60,425 60,245" {e}/>', (150,335), (60,200,240,470), (128,168,44,34), (104,290,92,100)),
 'ovoid': (lambda e:f'<path d="M150 200 C238 200 252 330 238 428 C234 458 214 470 150 470 C86 470 66 458 62 428 C48 330 62 200 150 200 Z" {e}/>', (150,335), (50,200,250,470), (128,170,44,32), (106,310,88,86)),
 'tall':  (lambda e:f'<path d="M84 250 Q84 196 150 196 Q216 196 216 250 L216 450 Q216 470 196 470 L104 470 Q84 470 84 450 Z" {e}/>', (150,333), (84,196,216,470), (130,166,40,32), (104,300,92,100)),
 'block': (lambda e:f'<path d="M70 215 H230 L244 235 V452 Q244 470 226 470 H74 Q56 470 56 452 V235 Z" {e}/>', (150,342), (56,215,244,470), (128,184,44,32), (94,310,112,92)),
    }

def cap_svg(kind, cx, top, nw, m):
    g=f'url(#m)'; y=top
    collar=f'<rect x="{cx-nw/2-8}" y="{y-12}" width="{nw+16}" height="14" rx="3" fill="{g}"/>'
    if kind=='cyl':  c=f'<rect x="{cx-nw/2-10}" y="{y-80}" width="{nw+20}" height="70" rx="7" fill="{g}"/><rect x="{cx-nw/2-6}" y="{y-76}" width="5" height="62" rx="2.5" fill="#fff" opacity=".35"/>'
    elif kind=='sph':c=f'<circle cx="{cx}" cy="{y-42}" r="{nw/2+16}" fill="url(#mr)"/><ellipse cx="{cx-10}" cy="{y-54}" rx="8" ry="12" fill="#fff" opacity=".4"/>'
    elif kind=='blk':c=f'<rect x="{cx-nw/2-18}" y="{y-62}" width="{nw+36}" height="52" rx="4" fill="{g}"/><path d="M{cx-nw/2-18} {y-44} H{cx+nw/2+18}" stroke="#000" stroke-opacity=".25"/><rect x="{cx-nw/2-14}" y="{y-58}" width="5" height="44" rx="2" fill="#fff" opacity=".35"/>'
    elif kind=='tall':c=f'<rect x="{cx-nw/2-2}" y="{y-90}" width="{nw+4}" height="80" rx="5" fill="{g}"/><rect x="{cx-nw/2+2}" y="{y-84}" width="4" height="68" rx="2" fill="#fff" opacity=".35"/>'
    else:            c=f'<rect x="{cx-5}" y="{y-34}" width="10" height="26" fill="{g}"/><rect x="{cx-nw/2-26}" y="{y-58}" width="{nw+52}" height="26" rx="13" fill="{g}"/><rect x="{cx-nw/2-18}" y="{y-54}" width="{nw+30}" height="4" rx="2" fill="#fff" opacity=".4"/>'
    return collar+c

def svg(p):
    S=shapes()[p['shape']]; body,(cx,cy),(x0,y0,x1,y1),(nx,ny,nw,nh),(lx,ly,lw,lh)=S
    col=p['color']; m=CAPS[p['cap']]; lvl=y0+(y1-y0)*p['level']
    lab=''
    if p['label']=='rect':
        lab=(f'<rect x="{lx}" y="{ly}" width="{lw}" height="{lh}" rx="3" fill="#f7ece6" opacity=".92"/>'
             f'<rect x="{lx+5}" y="{ly+5}" width="{lw-10}" height="{lh-10}" rx="2" fill="none" stroke="#2b0b16" stroke-opacity=".35" stroke-width=".7"/>'
             f'<text x="{lx+lw/2}" y="{ly+lh/2-2}" text-anchor="middle" font-family="Georgia,serif" font-size="12" fill="#2b0b16" textLength="{min(lw-22,len(p["en"])*9.2):.0f}" lengthAdjust="spacingAndGlyphs">{p["en"].upper()}</text>'
             f'<text x="{lx+lw/2}" y="{ly+lh/2+14}" text-anchor="middle" font-family="Georgia,serif" font-size="6.5" letter-spacing="2" fill="#2b0b16" opacity=".75">AURELLE · 50 ML</text>')
    elif p['label']=='band':
        lab=(f'<rect x="{x0+6}" y="{ly+20}" width="{x1-x0-12}" height="40" fill="#f7ece6" opacity=".9"/>'
             f'<text x="{cx}" y="{ly+45}" text-anchor="middle" font-family="Georgia,serif" font-size="12" fill="#2b0b16" textLength="{min(x1-x0-40,len(p["en"])*9.2):.0f}" lengthAdjust="spacingAndGlyphs">{p["en"].upper()}</text>')
    inner=f'translate({cx} {cy}) scale(.9) translate({-cx} {-cy})'
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 500" width="300" height="500">
<defs>
<linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".42"/><stop offset=".25" stop-color="#fff" stop-opacity=".08"/><stop offset=".75" stop-color="#fff" stop-opacity=".06"/><stop offset="1" stop-color="#fff" stop-opacity=".34"/></linearGradient>
<linearGradient id="l" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="{mix(col,'#ffffff',.28)}"/><stop offset=".45" stop-color="{col}"/><stop offset="1" stop-color="{mix(col,'#000000',.5)}"/></linearGradient>
<linearGradient id="m" x1="0" x2="1"><stop offset="0" stop-color="{m[2]}"/><stop offset=".3" stop-color="{m[0]}"/><stop offset=".62" stop-color="{m[1]}"/><stop offset="1" stop-color="{m[2]}"/></linearGradient>
<radialGradient id="mr" cx=".35" cy=".3"><stop offset="0" stop-color="{m[0]}"/><stop offset=".6" stop-color="{m[1]}"/><stop offset="1" stop-color="{m[2]}"/></radialGradient>
<linearGradient id="s" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".7"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<radialGradient id="sh"><stop offset="0" stop-color="#000" stop-opacity=".5"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
<clipPath id="c">{body(f'transform="{inner}"')}</clipPath>
<clipPath id="o">{body('')}</clipPath>
</defs>
<ellipse cx="150" cy="478" rx="{(x1-x0)/2+14}" ry="7" fill="url(#sh)"/>
<rect x="{nx}" y="{ny}" width="{nw}" height="{nh+14}" fill="url(#g)" stroke="#fff" stroke-opacity=".3"/>
{body('fill="url(#g)" stroke="#fff" stroke-opacity=".4" stroke-width="1.5"')}
<g clip-path="url(#c)"><rect x="{x0}" y="{lvl}" width="{x1-x0}" height="{y1-lvl}" fill="url(#l)"/></g>
{body(f'transform="{inner}" fill="none" stroke="#fff" stroke-opacity=".22"')}
<line x1="{cx}" y1="{ny+nh}" x2="{cx}" y2="{y1-18}" stroke="#fff" stroke-opacity=".3" stroke-width="2"/>
{lab}
<g clip-path="url(#o)"><rect x="{x0+(x1-x0)*.1:.0f}" y="{y0+16}" width="9" height="{(y1-y0)*.8:.0f}" rx="4.5" fill="url(#s)" opacity=".75"/><rect x="{x1-(x1-x0)*.12:.0f}" y="{y0+24}" width="4" height="{(y1-y0)*.75:.0f}" rx="2" fill="#fff" opacity=".2"/></g>
{cap_svg(p['capshape'], cx, ny, nw, m)}
</svg>'''

# ───────── البيانات: 56 عطراً ─────────
FAM = {  # لون (hue, sat) + نوتات + موسم
 'ورديّة': dict(h=(335,352), s=.62, top=['ورد دمشقي','فلفل وردي','ليتشي','رمان'], heart=['بيوني','ياسمين','زنبق','جوري'], base=['مسك أبيض','عنبر','فانيليا','خشب أبيض'], season=['مسائي','ربيعي','طوال العام']),
 'عودية':  dict(h=(18,32),   s=.58, top=['زعفران','هيل','فلفل أسود','بخور'], heart=['عود كمبودي','ورد طائفي','لبان','جلد'], base=['صندل','باتشولي','عنبر','مسك'], season=['شتوي','مناسبات','خريفي']),
 'حمضية':  dict(h=(48,92),   s=.72, top=['ليمون صقلي','برغموت','يوسفي','جريب فروت'], heart=['نيرولي','زهر البرتقال','شاي أخضر','نعناع'], base=['مسك خفيف','أرز','خشب أبيض','ريحان'], season=['صيفي','ربيعي','طوال العام']),
 'شرقية':  dict(h=(8,26),    s=.7,  top=['قرفة','زعفران','هيل','برتقال مر'], heart=['ورد','جلد','عسل','تمر'], base=['عنبر','لبان','فانيليا','تونكا'], season=['خريفي','شتوي','مسائي']),
 'خشبية':  dict(h=(24,40),   s=.38, top=['صنوبر','فلفل','برغموت','جنزبيل'], heart=['أرز','فيتيفر','تبغ','سرو'], base=['صندل','باتشولي','خشب الجوز','عنبر'], season=['خريفي','شتوي','طوال العام']),
 'مائيّة': dict(h=(188,214), s=.66, top=['ملح البحر','ليمون','خيار','نعناع'], heart=['زنبق الماء','أوزون','أعشاب بحرية','لوتس'], base=['مسك أبيض','خشب طافٍ','عنبر رمادي','أرز'], season=['صيفي','ربيعي','طوال العام']),
}
DESC = {'ورديّة':['وردة ناعمة تتفتّح ببطء وتبقى قريبة من البشرة.','بتلات رطبة وظلال مسك، أنوثة هادئة بلا مبالغة.','ورد غني بلمسة فاكهية تلفت الانتباه بلطف.'],
 'عودية':['عود عميق ودافئ بحضور واثق، مناسب للأمسيات.','دخان خفيف وعود عتيق يترك أثراً طويلاً.','عود مصقول تلطّفه الزهور والتوابل.'],
 'حمضية':['انتعاش مشرق للنهار يبدأ حيوياً وينتهي نظيفاً.','حمضيات لامعة وأخضر منعش، خفيف على الجو الحار.','فتح مضيء وقاعدة ناعمة تناسب الاستخدام اليومي.'],
 'شرقية':['توابل دافئة وحلاوة داكنة بأثر يُذكَر.','عنبر ولبان وحلاوة ناعمة لأمسيات الشتاء.','شرقي غني بتفاصيل كثيرة يتكشّف مع الوقت.'],
 'خشبية':['أخشاب جافة ونظيفة بحضور هادئ وأنيق.','خشب دافئ بلمسة ترابية، طابع رجولي ناعم.','غابة بعد المطر: أرز وفيتيفر وظلال عنبر.'],
 'مائيّة':['نسيم بحر بارد ونظافة مشرقة بلا ثقل.','رذاذ ملحي وزهور مائية، هدوء وانتعاش.','شفافية منعشة تناسب الصيف والرحلات.']}
NEW = {
 'ورديّة':[('ليلة الدمشقي','Damask Night'),('بتلات الفجر','Dawn Petals'),('وردة الياقوت','Ruby Rose'),('حدائق الجوري','Jouri Gardens'),('همسة الورد','Rose Whisper'),('ورد المساء','Evening Bloom')],
 'عودية':[('عود الملوك','Royal Oud'),('دخان العود','Oud Smoke'),('عود الصحراء','Desert Oud'),('عنبر وعود','Amber Oud'),('عود الغيم','Cloud Oud'),('العود الأبيض','White Oud')],
 'حمضية':[('برتقال الصباح','Morning Orange'),('برغموت الشمس','Sun Bergamot'),('ليمون الميناء','Harbor Lemon'),('يوسفي الشتاء','Winter Mandarin'),('جريب فروت','Pink Grapefruit'),('نسيم الحمضيات','Citrus Breeze')],
 'شرقية':[('زعفران ملكي','Royal Saffron'),('ليالي دمشق','Damascus Nights'),('عنبر الشرق','Orient Amber'),('قرفة وعسل','Cinnamon Honey'),('تمر وهيل','Date Cardamom'),('بخور المساء','Evening Incense')],
 'خشبية':[('خشب الأرز','Cedar Wood'),('صندل ذهبي','Golden Sandalwood'),('غابة الصنوبر','Pine Forest'),('باتشولي أسود','Black Patchouli'),('فيتيفر','Vetiver Noir'),('جذور الخشب','Root Wood'),('خشب الغروب','Sunset Wood'),('أرز وتبغ','Cedar Tobacco'),('خشب الجوز','Walnut Wood'),('ظل السرو','Cypress Shade'),('خشب الصمغ','Resin Wood'),('بلوط قديم','Old Oak')],
 'مائيّة':[('رذاذ البحر','Sea Spray'),('ندى الصباح','Morning Dew'),('موج أزرق','Blue Wave'),('ملح ورمل','Salt Sand'),('مطر الربيع','Spring Rain'),('ينابيع','Springs'),('جليد','Glacier'),('لؤلؤ','Pearl'),('شاطئ الغروب','Sunset Shore'),('بحيرة','Lake'),('نسيم المرفأ','Harbor Breeze'),('غيمة','Cloud Mist')],
}
EN_OLD = {'rose-royale':'Rose Royale','oud-al-layl':'Oud Al Layl','fajr-lemon':'Fajr Lemon','silk-musk':'Silk Musk','saffron-night':'Saffron Night','morning-fig':'Morning Fig','black-vanilla':'Black Vanilla','taif-rose':'Taif Rose'}

def slug(s): return s.lower().replace(' ','-')
def pick(lst,i,k): return [lst[(i+j*2)%len(lst)] for j in range(k)]

db = json.load(open(os.path.join(ROOT,'db.json')))
existing = {q['slug']: q for q in db['perfumes']}
old = db['perfumes'][:8]
for p in old: p['_en']=EN_OLD[p['slug']]
items = [dict(ar=p['name'],en=p['_en'],fam=p['family'],color=p['color'],old=p) for p in old]
for fam,lst in NEW.items():
    f=FAM[fam]
    for i,(ar,en) in enumerate(lst):
        random.seed(sum(map(ord,en)))
        prev = existing.get(slug(en))
        items.append(dict(ar=ar,en=en,fam=fam,color=prev['color'] if prev else hsl(random.uniform(*f['h']),f['s']+random.uniform(-.08,.08),random.uniform(.42,.56)),old=None))

perfumes=[]; shape_names=list(shapes().keys()); caps=list(CAPS.keys())
for idx,it in enumerate(items):
    fam=it['fam']; f=FAM[fam]; r=random.Random(idx*77+5)
    sl = it['old']['slug'] if it['old'] else slug(it['en'])
    shape = shape_names[idx%len(shape_names)]
    capk  = ['cyl','sph','blk','tall','disc'][(idx*3)%5]
    if shape=='slim' and capk in ('sph','disc'): capk='tall'
    param = dict(shape=shape,color=it['color'],cap=caps[(idx*2+(1 if fam in('عودية','شرقية') else 0))%5] if fam!='مائيّة' else ['silver','black','silver','rose','gold'][idx%5],
                 capshape=capk,label=['rect','rect','band'][idx%3] if shape in('rect','slim','block') else 'rect',level=r.uniform(.12,.3),en=it['en'])
    open(os.path.join(OUT,sl+'.svg'),'w',encoding='utf-8').write(svg(param))
    if it['old']: p=dict(it['old']); p.pop('_en',None)
    else:
        p50=r.choice(range(95,300,5))
        p=dict(id=idx+1,slug=sl,name=it['ar'],family=fam,color=it['color'],top=pick(f['top'],idx,2),heart=pick(f['heart'],idx,2),base=pick(f['base'],idx,2),
               longevity=r.randint(55,95),sillage=r.randint(45,90),season=r.choice(f['season']),description=r.choice(DESC[fam]),
               sizes=[dict(ml=2,price=max(5,round(p50/22))),dict(ml=30,price=round(p50*.65)),dict(ml=50,price=p50),dict(ml=100,price=round(p50*1.75))])
    prev=existing.get(sl,{}).get('image','')
    p['image']=prev if prev and not prev.endswith('.svg') else f'images/art/{sl}.svg'; perfumes.append(p)
db['perfumes']=perfumes
json.dump(db,open(os.path.join(ROOT,'db.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=2)
print(len(perfumes),'perfumes;',len(os.listdir(OUT)),'svg files')
