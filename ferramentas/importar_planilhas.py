import sys, json, re, zipfile, io, datetime, unicodedata
import xml.etree.ElementTree as ET
import openpyxl
from PIL import Image
quero_x, tenho_x, out = sys.argv[1], sys.argv[2], sys.argv[3]
import os
os.makedirs(f'{out}/data', exist_ok=True); os.makedirs(f'{out}/img', exist_ok=True)
NS = {'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
      'xlrd':'http://schemas.microsoft.com/office/spreadsheetml/2017/richdata',
      'rv':'http://schemas.microsoft.com/office/spreadsheetml/2017/richdata',
      'rel':'http://schemas.microsoft.com/office/spreadsheetml/2022/richvaluerel',
      'pr':'http://schemas.openxmlformats.org/package/2006/relationships'}
RID='{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'
z = zipfile.ZipFile(quero_x)
meta = ET.fromstring(z.read('xl/metadata.xml'))
bks = [bk.find('.//xlrd:rvb', NS).get('i') for bk in meta.find('m:futureMetadata', NS).findall('m:bk', NS)]
vm = []  # vm index (1-based) -> rich value index
for bk in meta.find('m:valueMetadata', NS).findall('m:bk', NS):
    rc = bk.find('m:rc', NS); vm.append(int(bks[int(rc.get('v'))]))
rvs = [int(rv.findall('rv:v', NS)[0].text) for rv in ET.fromstring(z.read('xl/richData/rdrichvalue.xml')).findall('rv:rv', NS)]
rels = [r.get(RID) for r in ET.fromstring(z.read('xl/richData/richValueRel.xml')).findall('rel:rel', NS)]
targets = {r.get('Id'): r.get('Target') for r in ET.fromstring(z.read('xl/richData/_rels/richValueRel.xml.rels')).findall('pr:Relationship', NS)}
sheet = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
cell_img = {}
for c in sheet.iter('{%s}c' % NS['m']):
    if c.get('vm'):
        t = targets[rels[rvs[vm[int(c.get('vm'))-1]]]]
        cell_img[c.get('r')] = 'xl/' + t.replace('../', '')

def slug(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii','ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')[:50]
def save_img(data, name):
    im = Image.open(io.BytesIO(data)).convert('RGB'); im.thumbnail((600, 600))
    im.save(f'{out}/img/{name}.jpg', 'JPEG', quality=82, optimize=True); return f'img/{name}.jpg'
def clean(v):
    return v.strip() if isinstance(v, str) else v

ws = openpyxl.load_workbook(quero_x).active
quero = []
for row in ws.iter_rows(min_row=3):
    v = [c.value for c in row]
    if not v[2] and not v[4]: continue
    num = v[1]; id_ = f'q{num:03d}-' + slug(f'{clean(v[2])} {clean(v[4])}')
    capa = ''
    ref = f'F{row[0].row}'
    if ref in cell_img: capa = save_img(z.read(cell_img[ref]), id_)
    d = v[10]
    quero.append({'id': id_, 'num': num, 'artista': clean(v[2]), 'genero': clean(v[3]), 'album': clean(v[4]),
        'capa': capa, 'lancamento': v[6], 'nacionalidade': clean(v[7]), 'lojas': clean(v[8]),
        'preco': v[9] if isinstance(v[9], (int, float)) else clean(v[9]),
        'atualizacao': d.strftime('%Y-%m-%d') if isinstance(d, datetime.datetime) else (d or ''),
        'linkImagens': v[11] or ''})

ws = openpyxl.load_workbook(tenho_x).active
tenho = []; cur = None
for row in ws.iter_rows(min_row=3, values_only=True):
    _, art, est, alb, foto, lado, mus, val = row[:8]
    if alb:
        cur = {'id': '', 'artista': clean(art) or '', 'estilo': [], 'album': clean(alb), 'foto': '', 'lados': [], 'valorPago': val if val is not None else ''}
        tenho.append(cur)
    if cur is None: continue
    if est: cur['estilo'].append(clean(est))
    if val is not None and cur['valorPago'] == '': cur['valorPago'] = val
    if lado: cur['lados'].append({'lado': clean(lado), 'musicas': []})
    if mus:
        if not cur['lados']: cur['lados'].append({'lado': 'Lado A', 'musicas': []})
        cur['lados'][-1]['musicas'].append(clean(mus))
for i, t in enumerate(tenho, 1):
    t['estilo'] = ', '.join(t['estilo']); t['id'] = f't{i:03d}-' + slug(f"{t['artista']} {t['album']}")
json.dump(quero, open(f'{out}/data/quero.json', 'w'), ensure_ascii=False, indent=1)
json.dump(tenho, open(f'{out}/data/tenho.json', 'w'), ensure_ascii=False, indent=1)
print(len(quero), sum(1 for q in quero if q['capa']), len(tenho), sum(len(m['musicas']) for t in tenho for m in t['lados']))
