"""Package tracked assessment source without local runtime or account data."""
from pathlib import Path
import subprocess
import zipfile

root = Path(__file__).resolve().parents[1]
paths = subprocess.check_output(['git', 'ls-files', '-z'], cwd=root).decode().split('\0')
excluded = {'.git', 'node_modules', 'dist', 'coverage', '.idea', '.aws', '.codex', '.agents', 'output', '__pycache__'}
files = []
for name in filter(None, paths):
    path = Path(name)
    if excluded.intersection(path.parts) or path.name.startswith('.env'):
        continue
    if path.suffix in {'.db', '.sqlite', '.sqlite3', '.zip', '.mp4', '.mov', '.log', '.pyc'}:
        continue
    source = root / path
    if source.is_symlink():
        raise SystemExit(f'Refusing symlink: {path}')
    files.append(path)

required = {'README.md', 'backend/db.js', 'backend/data/sensor-readings.json', 'backend/package-lock.json', 'frontend/package-lock.json'}
if not required.issubset({str(path) for path in files}):
    raise SystemExit('Required assessment source is missing')

output = root / 'output' / 'greenfields-smartfarm-source.zip'
output.parent.mkdir(exist_ok=True)
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(files):
        archive.write(root / path, Path('greenfields-smartfarm') / path)
with zipfile.ZipFile(output) as archive:
    if archive.testzip() is not None:
        raise SystemExit('ZIP integrity check failed')
print(f'{output}\n{len(files)} source files; {output.stat().st_size} bytes')
