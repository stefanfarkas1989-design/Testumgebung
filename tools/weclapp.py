#!/usr/bin/env python3
"""Read-only Weclapp-Wrapper fuer die Nutzung mit KI-Coding-Tools.

Ziel: Der API-Token bleibt in der Umgebungsvariable (nie im Kontext) und
personenbezogene Felder werden vor der Ausgabe pseudonymisiert.

Konfiguration (Umgebungsvariablen):
  WECLAPP_URL    z.B. https://meinefirma.weclapp.com   (nur https)
  WECLAPP_TOKEN  API-Token (Header AuthenticationToken)

Beispiele:
  weclapp.py list customer --fields id,company,customerNumber --limit 5
  weclapp.py list salesOrder --filter orderStatus-eq=OPEN --limit 10
  weclapp.py get article 12345
  weclapp.py count customer
  weclapp.py list customer --raw     # ohne Pseudonymisierung (bewusst!)

Es werden ausschliesslich GET-Requests gesendet.
"""
import argparse
import hashlib
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

# Nur diese Entitaeten sind abrufbar (Allowlist, bei Bedarf erweitern).
ALLOWED_ENTITIES = {
    "article", "customer", "supplier", "contact", "party",
    "salesOrder", "salesInvoice", "quotation", "purchaseOrder",
    "warehouse", "warehouseStock", "shipment", "unit", "currency",
}

# Feldnamen (case-insensitive, Teilstring), die pseudonymisiert werden.
PII_PATTERNS = re.compile(
    r"(firstname|lastname|^name$|fullname|email|phone|fax|mobile|iban|bic|"
    r"bankaccount|street|zipcode|city|birthdate|taxnumber|vatid|"
    r"password|token|secret|note|comment|description)",
    re.IGNORECASE,
)
# Diese Felder sind unkritisch und werden nie maskiert.
SAFE_FIELDS = {"id", "version", "createdDate", "lastModifiedDate"}

MAX_LIMIT = 100
TIMEOUT = 30


def die(msg, code=1):
    print(f"Fehler: {msg}", file=sys.stderr)
    sys.exit(code)


def config():
    url = os.environ.get("WECLAPP_URL", "").rstrip("/")
    token = os.environ.get("WECLAPP_TOKEN", "")
    if not url or not token:
        die("WECLAPP_URL und WECLAPP_TOKEN muessen als Umgebungsvariablen gesetzt sein.")
    if not url.startswith("https://"):
        die("WECLAPP_URL muss mit https:// beginnen.")
    return url, token


def pseudonym(value):
    digest = hashlib.sha256(str(value).encode("utf-8")).hexdigest()[:8]
    return f"<redacted:{digest}>"


def redact(obj, key=None):
    """Ersetzt Werte PII-verdaechtiger Felder rekursiv durch stabile Hashes."""
    if isinstance(obj, dict):
        return {k: redact(v, k) for k, v in obj.items()}
    if isinstance(obj, list):
        return [redact(v, key) for v in obj]
    if obj is None or isinstance(obj, bool):
        return obj
    if key and key not in SAFE_FIELDS and PII_PATTERNS.search(key):
        return pseudonym(obj)
    return obj


def request(path, params):
    base, token = config()
    qs = urllib.parse.urlencode(params, safe=",-")
    url = f"{base}/webapp/api/v1/{path}" + (f"?{qs}" if qs else "")
    req = urllib.request.Request(
        url, method="GET",
        headers={"AuthenticationToken": token, "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as e:
        # Nur Statuscode ausgeben, keinen Body (kann Daten enthalten).
        die(f"HTTP {e.code} bei {path}")
    except urllib.error.URLError as e:
        die(f"Verbindungsfehler: {e.reason}")


def check_entity(entity):
    if entity not in ALLOWED_ENTITIES:
        die(f"Entitaet '{entity}' nicht erlaubt. Erlaubt: {', '.join(sorted(ALLOWED_ENTITIES))}")


def build_params(args):
    params = {}
    if getattr(args, "fields", None):
        params["properties"] = args.fields
    for f in getattr(args, "filter", None) or []:
        if "=" not in f:
            die(f"Ungueltiger Filter '{f}' (erwartet key-op=value, z.B. orderStatus-eq=OPEN)")
        k, v = f.split("=", 1)
        params[k] = v
    return params


def emit(data, raw):
    print(json.dumps(data if raw else redact(data), indent=2, ensure_ascii=False))


def cmd_list(args):
    check_entity(args.entity)
    params = build_params(args)
    params["pageSize"] = min(max(args.limit, 1), MAX_LIMIT)
    data = request(args.entity, params)
    emit(data.get("result", data), args.raw)


def cmd_get(args):
    check_entity(args.entity)
    if not re.fullmatch(r"[A-Za-z0-9_-]+", args.id):
        die("Ungueltige ID.")
    emit(request(f"{args.entity}/id/{args.id}", build_params(args)), args.raw)


def cmd_count(args):
    check_entity(args.entity)
    emit(request(f"{args.entity}/count", build_params(args)), True)


def main():
    p = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)

    def common(sp):
        sp.add_argument("entity")
        sp.add_argument("--fields", help="Komma-getrennte Feldliste (properties=)")
        sp.add_argument("--filter", action="append", help="key-op=value, mehrfach moeglich")
        sp.add_argument("--raw", action="store_true", help="Pseudonymisierung ausschalten")

    sl = sub.add_parser("list"); common(sl)
    sl.add_argument("--limit", type=int, default=10, help=f"max. {MAX_LIMIT}")
    sl.set_defaults(func=cmd_list)

    sg = sub.add_parser("get"); common(sg)
    sg.add_argument("id"); sg.set_defaults(func=cmd_get)

    sc = sub.add_parser("count"); common(sc); sc.set_defaults(func=cmd_count)

    args = p.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
