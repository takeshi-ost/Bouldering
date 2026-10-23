from html.parser import HTMLParser
from pathlib import Path
import json,hashlib,re
root=Path(__file__).resolve().parents[1];cat=(root/'js/text-ja.js').read_text();catalog=json.loads(cat[cat.index('Object.freeze(')+14:cat.rindex(');')])
class Copy(HTMLParser):
 def __init__(self,localized):super().__init__();self.localized=localized;self.stack=[];self.text=[];self.attrs=[]
 def handle_starttag(self,tag,items):
  a=dict(items);bindings={k:v for k,v in items if k.startswith('data-i18n')};extra=tag=='span' and len(a)==1 and 'data-i18n' in a
  if tag not in ['script','style'] and not extra:
   values={k:v for k,v in items if k in ['aria-label','alt','title','placeholder']}
   if self.localized:
    for k,v in bindings.items():
     if k!='data-i18n':values[k[10:]]=catalog[v]
   if values:self.attrs.append((tag,values))
  if self.localized and 'data-i18n' in a:self.text.append(catalog[a['data-i18n']])
  if tag not in ['meta','link','img','input','br','hr','source','wbr','area','base','embed','param','track']:self.stack.append(tag)
 def handle_endtag(self,tag):
  for i in range(len(self.stack)-1,-1,-1):
   if self.stack[i]==tag:self.stack=self.stack[:i];break
 def handle_data(self,text):
  if self.stack and self.stack[-1] not in ['script','style']:self.text.append(text)
 def value(self):return {'text':re.sub(r'\s+',' ',''.join(self.text)).strip(),'attributes':self.attrs}
current=Copy(True);current.feed((root/'index.html').read_text())
digest=hashlib.sha256(json.dumps(current.value(),ensure_ascii=False,sort_keys=True).encode()).hexdigest()
# Snapshot of 0.2.17 visible copy (collapsed HTML whitespace) and accessibility labels.
assert digest == 'be6ae2736e97a9287d1679896987a850b0f8f1ae7ba6dfc110c83ba55ce9c9e8', 'Static game copy changed; review intentional wording changes before updating the snapshot.'
print('PASS static text: all labels/help text and accessibility attributes exactly match 0.2.17')
