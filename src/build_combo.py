# «Комбинированный заказ»: combo_src.html + pdf-lib.js → ../combo.html
import os
S = os.path.dirname(os.path.abspath(__file__)) + '/'
s = open(S + 'combo_src.html', encoding='utf-8').read()
assert s.count('/*PDFLIB*/') == 1
s = s.replace('/*PDFLIB*/', open(S + 'pdf-lib.js', encoding='utf-8').read())
open(S + '../combo.html', 'w', encoding='utf-8').write(s)
print('combo.html ok')
