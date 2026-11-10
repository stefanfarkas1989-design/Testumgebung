# weclapp.py – Read-only-Wrapper

Nur `GET`, Entitäten-Allowlist, PII-Felder werden pseudonymisiert (`<redacted:hash>`),
Token nur via Umgebungsvariable, HTTP-Fehler ohne Response-Body.

```bash
export WECLAPP_URL=https://meinefirma.weclapp.com   # am besten Test-Mandant
export WECLAPP_TOKEN=...                            # eigener API-Benutzer, nur Leserechte
python3 tools/weclapp.py list customer --fields id,company,customerNumber --limit 5
python3 tools/weclapp.py get article 12345
python3 tools/weclapp.py count salesOrder --filter orderStatus-eq=OPEN
```

`--raw` schaltet die Pseudonymisierung ab – nur mit Testdaten verwenden.
Tests: `python3 tools/test_weclapp.py`.
