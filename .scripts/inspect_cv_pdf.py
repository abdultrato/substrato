import os
from pathlib import Path
import zipfile

home = Path(os.environ['USERPROFILE'])
download = home / 'Downloads'
print('Scanning PDFs for Johanniter...')
for path in sorted(download.glob('*.pdf')):
    try:
        from PyPDF2 import PdfReader
    except ImportError:
        print('PyPDF2 not installed')
        break
    try:
        reader = PdfReader(str(path))
        text = ''.join(page.extract_text() or '' for page in reader.pages)
        lower = text.lower()
        if 'johanniter' in lower:
            pos = lower.find('johanniter')
            snippet = text[max(0,pos-80):pos+160]
            print(path.name)
            print('  snippet:', repr(snippet))
    except Exception:
        pass
print('---')
cv_path = download / 'cv-lab.odg'
print('CV path:', cv_path.exists(), cv_path)
if cv_path.exists():
    with zipfile.ZipFile(cv_path, 'r') as z:
        print('ODG contents:')
        for name in z.namelist():
            if name in ('content.xml', 'styles.xml', 'meta.xml') or 'manifest' in name:
                print(' ', name)
        try:
            data = z.read('content.xml').decode('utf-8', errors='ignore')
            idx = data.find('<office:text')
            print('office:text index', idx)
            print('preview:', data[idx:idx+500].replace('\n', ' '))
        except Exception as e:
            print('Error reading content.xml:', e)
