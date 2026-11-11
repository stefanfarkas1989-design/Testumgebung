#!/usr/bin/env python3
"""Wandelt die Ausgabe von frischeis_katalog.py in das kompakte Format für den Möbel-Generator um.
Aufruf: python3 frischeis_kompakt.py <roh.json> moebel/frischeis-dekor.json"""
import json, sys
src = json.load(open(sys.argv[1], encoding='utf-8'))
kante = src.get('kategorie') == 'kante'  # bei Kanten: l = Rollenlänge, w = Kantenhöhe
for a in src['artikel']:
    a['kat'] = a['kat'] or 'sonstige'
kats = sorted({a['kat'] for a in src['artikel']})
out = {'quelle': src['quelle'], 'abgerufen': src['abgerufen'], 'hinweis': 'Öffentliche Artikeldaten ohne Preise',
       'kategorien': kats,
       'url_basis': 'https://www.frischeis.at/shop/platte/',
       'artikel': [[a['nr'], a['name'], a['l'], a['w'], a['t'], kats.index(a['kat']), (a.get('url') or '').split('?')[0].replace('/shop/platte/', '', 1)] for a in src['artikel']
                   if a['l'] and a['w'] and a['t'] and (kante or (a['l'] >= 500 and a['w'] >= 300))]}
json.dump(out, open(sys.argv[2], 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(len(out['artikel']), 'Artikel,', len(kats), 'Kategorien')
