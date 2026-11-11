#!/usr/bin/env python3
"""Liest öffentliche Kategorien von frischeis.at aus (ohne Login, ohne Preise).

Kategorien: dekor (Dekorative Platte), kante (Kanten), rueckwand (MDF/HDF/Hartfaser roh bis 8 mm),
arbeitsplatte (Laminat-Arbeitsplatten).
Die Seiten-Navigation des Shops endet bei ca. 1400 Treffern, daher wird nach Stärke (und bei
Bedarf nach Unterkategorie) aufgeteilt. Beim Stärke-Filter zeigt jede Kachel die passende
Stärke-Variante mit eigener Artikel-Nr., so kommen auch alle Varianten mit.

Aufruf: python3 frischeis_katalog.py <dekor|kante|rueckwand|arbeitsplatte> <ausgabe.json>
"""
import html as H, json, re, sys, time, urllib.request, urllib.parse

SITE = 'https://www.frischeis.at'
KATEGORIEN = {
    'dekor': {
        'pfad': '/shop/platte/dekorative-platte~c14208173',
        'unter': {
            'beschichtete-platte': '/shop/platte/dekorative-platte/beschichtete-platte~c14208180',
            'dekorative-platte-mdf-hdf-hartfaser': '/shop/platte/dekorative-platte/dekorative-platte-mdf-hdf-hartfaser~c14208186',
            'durchgefarbte-platte': '/shop/platte/dekorative-platte/durchgefarbte-platte~c17646825',
            'grundierplatte': '/shop/platte/dekorative-platte/grundierplatte~c14208188',
            'mobelfront': '/shop/platte/dekorative-platte/mobelfront~c14641144',
            'prageplatte': '/shop/platte/dekorative-platte/prageplatte~c15170023'},
        'baender': [0, 4, 7, 9, 12, 15, 17, 18.5, 19.5, 22, 26, 30, 45, 200]},
    'kante': {
        'pfad': '/shop/platte/kante~c14208189',
        'unter': {
            'kunststoffkante': '/shop/platte/kante/kunststoffkante~c14208204',
            'furnierte-kante': '/shop/platte/kante/furnierte-kante~c14208190'},
        'baender': [0, 0.45, 0.65, 0.85, 1.1, 1.6, 2.1, 3.1, 50]},
    'arbeitsplatte': {
        'pfad': '/shop/platte/arbeitsplatte/laminat-arbeitsplatte~c14207636',
        'unter': {},
        'baender': [0, 25, 60]},
    'rueckwand': {
        'pfad': '/shop/platte/mdf--hdf--hartfaserplatte-roh~c14208412',
        'unter': {},
        'baender': [0, 2.6, 3.1, 4.1, 5.1, 6.1, 8.1]},
}
BASE = SITE + KATEGORIEN['dekor']['pfad']
UA = {'User-Agent': 'Mozilla/5.0 (Moebel-Generator Katalogabgleich)', 'X-Requested-With': 'XMLHttpRequest'}
PAUSE = 1.5

CAP = 1400  # mehr Treffer liefert die Seiten-Navigation des Shops nicht

def get(params, base=BASE):
    q = dict(params, ajax=1, perPage=200)
    url = base + '?' + urllib.parse.urlencode(q)
    for attempt in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
                data = json.loads(r.read().decode('utf-8'))
            time.sleep(PAUSE)
            return data.get('html', '')
        except Exception as e:  # noqa
            print('  Wiederholung', attempt + 1, e, file=sys.stderr); time.sleep(5 * (attempt + 1))
    raise RuntimeError('Abruf fehlgeschlagen: ' + url)

def num(s):
    s = re.sub(r'(?<=\d)[\s\xa0\u202f](?=\d{3}\b)', '', s or '')  # Tausender-Leerzeichen: "1 200" -> "1200"
    m = re.search(r'[\d.,]+', s)
    if not m:
        return None
    v = float(m.group(0).replace('.', '').replace(',', '.'))
    return int(v) if v == int(v) else v

def parse(page):
    out = []
    total = re.search(r'([\d.]+)\s*Artikel', page)
    for b in page.split('<section class="product-teaser')[1:]:
        pid = re.search(r'data-product-id="(\d+)"', b)
        name = re.search(r'product-teaser__title[^>]*>\s*<a href="([^"]+)"[^>]*>([^<]+)</a>', b)
        if not pid or not name:
            continue
        meta = dict(re.findall(r'(Artikel-Nr\.|Stärke x Länge|Länge|Breite|Stärke)\s*<span[^>]*>\s*([^<]+?)\s*</span>', b))
        variants = re.findall(r'<option[^>]*value="(\d+)"[^>]*>\s*Stärke[^:<]*:\s*([\d,\.]+)', b)
        out.append({
            'id': pid.group(1), 'name': H.unescape(name.group(2)).strip(), 'url': H.unescape(name.group(1)),
            'nr': meta.get('Artikel-Nr.'), 'l': num(meta.get('Länge')), 'w': num(meta.get('Breite')), 't': num(meta.get('Stärke')),
            'variants': [num(t) for v, t in variants],
        })
        sl = meta.get('Stärke x Länge')  # Kanten: "0,8 x 75 000 mm"
        if sl:
            a, _, c = sl.replace('\xa0', ' ').partition('x')
            out[-1]['t'] = num(a); out[-1]['l'] = num(c.replace(' ', ''))
    return out, (int(total.group(1).replace('.', '')) if total else 0)

def crawl(extra=None, base=BASE, label=''):
    """Alle Seiten einer Abfrage; liefert (items, total). Bricht ab, wenn der Shop Seiten wiederholt."""
    items, seen, page, total = [], set(), 1, None
    while True:
        got, tot = parse(get(dict(extra or {}, page=page), base))
        total = tot if total is None else total
        new = [g for g in got if g['id'] not in seen]
        seen.update(g['id'] for g in got)
        items += new
        print(f'{label} Seite {page}: {len(new)} neu (gesamt {len(items)}/{total})', file=sys.stderr)
        if not new or len(items) >= total:
            return items, total
        page += 1

def band(lo, hi):
    return {'thickness_from': round(lo, 2), 'thickness_to': round(hi, 2)}

def category_of(url):
    m = re.search(r'^/shop/platte/[^/]+/([^/]+)/', url)
    return m.group(1) if m else ''

def main(kat, outfile):
    cfg = KATEGORIEN[kat]
    base = SITE + cfg['pfad']
    rows = {}
    def add(items):
        for it in items:
            if it['nr']:
                rows[it['nr']] = {'nr': it['nr'], 'name': it['name'], 'l': it['l'], 'w': it['w'], 't': it['t'], 'kat': category_of(it['url']), 'url': it['url']}

    def full(extra, label):
        """Abfrage komplett holen; bei zu vielen Treffern je Unterkategorie."""
        items, total = crawl(extra, base=base, label=label)
        if total <= CAP or not cfg['unter']:
            if total > CAP: print('  WARNUNG: mehr Treffer als abrufbar', file=sys.stderr)
            return items
        out = []
        for k, path in cfg['unter'].items():
            out += crawl(extra, base='https://www.frischeis.at' + path, label=f'{label} / {k}')[0]
        return out

    # 1. Stärken entdecken (grobe Bänder, Haupt- und Variantenstärken)
    thick = set()
    edges = cfg['baender']
    for lo, hi in zip(edges, edges[1:]):
        items = full(band(lo + 0.001, hi), f'Band {lo}-{hi}')
        for it in items:
            if it['t'] is not None and edges[0] <= it['t'] <= edges[-1]: thick.add(it['t'])
            thick.update(t for t in it['variants'] if t is not None and edges[0] <= t <= edges[-1])
    print('Stärken:', sorted(thick), file=sys.stderr)
    # 2. Je Stärke abrufen: Kachel zeigt die passende Variante mit eigener Artikel-Nr.
    for t in sorted(thick):
        add(full(band(t - 0.01, t + 0.01), f'Stärke {t}'))
    data = sorted(rows.values(), key=lambda r: (r['kat'], r['name'], r['t'] or 0))
    json.dump({'quelle': base, 'kategorie': kat, 'abgerufen': time.strftime('%Y-%m-%d'), 'anzahl': len(data), 'artikel': data},
              open(outfile, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    print('fertig:', len(data), 'Artikel', file=sys.stderr)

if __name__ == '__main__':
    if len(sys.argv) < 3 or sys.argv[1] not in KATEGORIEN:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
