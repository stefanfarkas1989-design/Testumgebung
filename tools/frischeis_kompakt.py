#!/usr/bin/env python3
"""Wandelt die Ausgabe von frischeis_dekor.py in das kompakte Format für den Möbel-Generator um.
Aufruf: python3 frischeis_kompakt.py <roh.json> moebel/frischeis-dekor.json"""
import json, sys
src = json.load(open(sys.argv[1], encoding='utf-8'))
kats = sorted({a['kat'] for a in src['artikel']})
out = {'quelle': src['quelle'], 'abgerufen': src['abgerufen'], 'hinweis': 'Öffentliche Artikeldaten ohne Preise',
       'kategorien': kats,
       'artikel': [[a['nr'], a['name'], a['l'], a['w'], a['t'], kats.index(a['kat'])] for a in src['artikel']
                   if a['l'] and a['w'] and a['t']]}
json.dump(out, open(sys.argv[2], 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(len(out['artikel']), 'Artikel,', len(kats), 'Kategorien')
