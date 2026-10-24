"""Refresh local CSS/JS and audio URLs before publishing index.html."""
import hashlib
import re
from pathlib import Path

root = Path(__file__).resolve().parents[1]
index = root / 'index.html'
audio_pattern = r"(assets/audio/[^'\"?]+\.(?:wav|bin))(?:\?v=[^'\"]*)?"
def audio_version(match):
    digest = hashlib.sha256((root / match[1]).read_bytes()).hexdigest()[:12]
    return f'{match[1]}?v={digest}'
for audio_script in [root / 'js/audio.js', root / 'js/bgm.js']:
    audio_script.write_text(re.sub(audio_pattern, audio_version, audio_script.read_text()))
pattern = r'((?:src|href)=")((?:js/[^"?]+\.js|styles\.css))(?:\?[^" ]*)?(")'

def version(match):
    digest = hashlib.sha256((root / match[2]).read_bytes()).hexdigest()[:12]
    return f'{match[1]}{match[2]}?v={digest}{match[3]}'

index.write_text(re.sub(pattern, version, index.read_text()))
