#!/bin/sh
# Hängt eine Versionsnummer an Skripte und CSS, damit Browser nach Updates nie alte Dateien benutzen.
v=$(( $(git rev-list --count HEAD 2>/dev/null || echo 0) + 1 ))
sed -i -E "s#(src=\"(js|lib)/[a-z0-9.]+\.js)(\?v=[0-9]+)?\"#\1?v=$v\"#; s#(href=\"style\.css)(\?v=[0-9]+)?\"#\1?v=$v\"#" index.html
echo "Version $v"
