"""Refresh local CSS/JS URLs after edits, before publishing index.html."""
import hashlib
import re
from pathlib import Path

root = Path(__file__).resolve().parents[1]
index = root / 'index.html'
pattern = r'((?:src|href)=")((?:js/[^"?]+\.js|styles\.css))(?:\?[^" ]*)?(")'

def version(match):
    digest = hashlib.sha256((root / match[2]).read_bytes()).hexdigest()[:12]
    return f'{match[1]}{match[2]}?v={digest}{match[3]}'

index.write_text(re.sub(pattern, version, index.read_text()))
