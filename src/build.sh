#!/bin/sh
# Сборка всех калькуляторов: исходники в src/ → готовые страницы в корне репозитория.
set -e
cd "$(dirname "$0")"
python3 build_uni2.py        # uni_pre_amo.html → uni2_pre_amo.html
python3 build_zebra.py       # uni_pre_amo.html → zebra_pre_amo.html
python3 build_plisse.py      # mesh_pre_amo.html → plisse_pre_amo.html
python3 build_vert.py        # mesh_pre_amo.html → vert_pre_amo.html
python3 build_horiz.py       # vert_pre_amo.html → horiz_pre_amo.html
python3 insert_amo.py        # *_pre_amo.html + amo-client.js + extras.js + polish.* + иконки → ../uni.html, ../mesh.html, …
echo "Готово: страницы обновлены в корне репозитория"
