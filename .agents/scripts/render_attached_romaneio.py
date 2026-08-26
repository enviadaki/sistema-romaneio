import fitz
from pathlib import Path
src = Path('attached_assets/romaneio-motorista-RASCUNHO-2026-08-26_1787754528944.pdf')
out = Path('.agents/outputs/romaneio-motorista-render')
out.mkdir(parents=True, exist_ok=True)
doc = fitz.open(src)
print('pages', doc.page_count)
for i, page in enumerate(doc):
    print('page', i+1, 'rect', page.rect, 'text_blocks', len(page.get_text('dict')['blocks']))
    pix = page.get_pixmap(matrix=fitz.Matrix(2,2), alpha=False)
    path = out / f'page-{i+1}.png'
    pix.save(path)
    print(path)
