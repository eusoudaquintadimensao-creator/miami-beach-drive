# Falas do rádio da ponte (Kokoro-82M, Apache-2.0) -> assets/voz/radio/<piloto>/<fnv>.mp3 + index.json
import json, sys, os, re, subprocess, unicodedata, tempfile
import kokoro_onnx, soundfile as sf, numpy as np
OUT = sys.argv[2] if len(sys.argv) > 2 else '/workspace/miami-mundo-aberto/assets/voz/radio'
def norm(t):
    t = unicodedata.normalize('NFC', t.lower())
    t = ''.join(ch if (unicodedata.category(ch)[0] in 'LN' or ch == ' ') else ' ' for ch in t)
    return re.sub(r'\s+', ' ', t).strip()
def fnv(s):
    h = 0x811c9dc5; b = s.encode('utf-16-le')
    for i in range(0, len(b), 2):
        h ^= b[i] | (b[i+1] << 8); h = (h * 0x01000193) & 0xffffffff
    return '%08x' % h
SAY = {'Tchê': 'Tchê', 'piá': 'piá'}
def main():
    bank = json.load(open(sys.argv[1]))  # {"voices": {...}, "lines": [[driver, text], ...]}
    k = kokoro_onnx.Kokoro('/workspace/vozes-gratuitas/kokoro-models/kokoro-v1.0.int8.onnx', '/workspace/vozes-gratuitas/kokoro-models/voices-v1.0.bin')
    idx_path = OUT + '/index.json'; idx = json.load(open(idx_path)) if os.path.exists(idx_path) else {'v': 1, 'd': {}}
    for d, t in bank['lines']:
        V = bank['voices'][d]; os.makedirs(f'{OUT}/{d}', exist_ok=True); have = idx['d'].setdefault(d, {})
        h = fnv(norm(t)); fn = f'{OUT}/{d}/{h}.mp3'
        if h in have and os.path.exists(fn): continue
        a, sr = k.create(t, voice=V['v'], speed=V['speed'], lang='pt-br')
        a = np.asarray(a, dtype=np.float32); nz = np.where(np.abs(a) > 0.01)[0]
        if len(nz): a = a[max(0, nz[0] - int(0.03 * sr)): nz[-1] + int(0.12 * sr)]
        with tempfile.NamedTemporaryFile(suffix='.wav') as w:
            sf.write(w.name, a, sr)
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', w.name, '-af', 'highpass=f=90,loudnorm=I=-16:TP=-1.5:LRA=8', '-ar', '22050', '-ac', '1', '-b:a', '32k', fn], check=True)
        have[h] = round(len(a) / sr, 2); print(d, h, have[h], t, flush=True)
        json.dump(idx, open(idx_path, 'w'), separators=(',', ':'))
main()
