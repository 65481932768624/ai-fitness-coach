# -*- coding: utf-8 -*-
"""解析《全身训练动作教学手册（83个动作）》→ reports/manual83.json"""

import json, os, re
from pathlib import Path
from docx import Document

DOC = os.environ.get('MANUAL83_DOCX', r'D:/document/全身训练动作教学手册（83个动作）.docx')
OUT = Path(__file__).resolve().parents[1] / 'data' / 'manual83.json'

# 章节结束标志：遇到这些说明正文结束，避免把文末附录当成要点
STOP_MARKERS = ('器材图鉴', '参考资料', '附录', '资料来源', '说明：以下图片')

doc = Document(DOC)
lines = [p.text.strip() for p in doc.paragraphs]

starts = []
for i, t in enumerate(lines):
    m = re.match(r'^(\d{2})  (.+)$', t)
    if m and 1 <= int(m.group(1)) <= 83:
        starts.append((i, int(m.group(1)), m.group(2)))
print('动作起始', len(starts))

def is_boundary(line: str, title: str) -> bool:
    if line in ('关键要点', '常见错误', '标准做法'):
        return True
    if line.startswith(('目标肌群', '所需器材', '对应录屏')):
        return True
    if re.match(r'^[①②③④⑤]', line):
        return True
    if re.match(r'^\d{2}\s\s', line):
        return True
    if re.match(r'^[A-Z][a-z]', line):
        return True
    if any(line.startswith(m) for m in STOP_MARKERS):
        return True
    return False

out = []
for j, (start, num, title) in enumerate(starts):
    end = starts[j + 1][0] if j + 1 < len(starts) else len(lines)
    body = [t for t in lines[start:end] if t]
    item = {'number': num, 'title': title}

    for ln in body:
        if ln.startswith('目标肌群　'):
            item['muscles'] = ln.replace('目标肌群　', '').strip()
        elif ln.startswith('所需器材　'):
            item['equipment'] = ln.replace('所需器材　', '').strip()
        elif ln.startswith('对应录屏　'):
            item['video'] = ln.replace('对应录屏　', '').strip()

    steps = []
    for ln in body:
        m = re.match(r'^([①②③④⑤])\s*([^　]+)　(.+)$', ln)
        if m:
            steps.append({'title': m.group(2), 'detail': m.group(3).strip()})
    item['steps'] = steps

    def sect(marker):
        o, on = [], False
        for ln in body:
            if ln == marker:
                on = True
                continue
            if on:
                if is_boundary(ln, title):
                    break
                o.append(ln.lstrip('▪ ').lstrip('× ').strip())
        return [x for x in o if x]

    item['keyPoints'] = sect('关键要点')
    item['mistakes'] = sect('常见错误')
    item['titleEn'] = next((ln for ln in body[1:3] if re.match(r'^[A-Za-z]', ln)), '')
    out.append(item)

OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding='utf-8')

bad = [(o['number'], o['title'], len(o['keyPoints']), len(o['mistakes'])) for o in out if len(o['keyPoints']) > 8 or len(o['mistakes']) > 8]
print('异常条目（要点数>8）:', bad)
print('total', len(out))
