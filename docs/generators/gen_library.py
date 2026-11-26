# -*- coding: utf-8 -*-
"""从 manual-extract.json 生成 src/exercises/library.ts（只生成，不参与运行时）。"""
import json, re
from pathlib import Path

ROOT = Path(r'E:/dev-tools/fitness-coach')
SRC = ROOT / 'reports/manual-extract.json'
OUT = ROOT / 'source-code/src/exercises/library.generated.ts'

data = json.loads(SRC.read_text(encoding='utf-8'))

# id：标题转 ASCII 拼音（手工映射，71 个）
PINYIN = {
    '器械坐姿推胸': 'machine-seated-press', '器械推胸': 'machine-press',
    '蝴蝶机夹胸': 'pec-deck', '坐姿器械夹胸': 'seated-fly',
    '悍马上斜推胸': 'hammer-incline-press', '悍马下斜推胸': 'hammer-decline-press',
    '双杠臂屈伸（胸主导）': 'chest-dip', '双杠臂屈伸（三头主导）': 'triceps-dip',
    '坐姿器械推胸（重复拍摄）': 'machine-seated-press-b',
    '器械下斜推胸': 'machine-decline-press', '仰卧下斜推胸': 'lying-decline-press',
    '挂片卧推': 'plate-loaded-press', '器械夹下胸': 'machine-decline-fly',
    '哑铃推胸': 'db-press', '上斜哑铃推胸': 'db-incline-press',
    '平板哑铃飞鸟': 'db-fly', '窄距锤式哑铃卧推': 'db-hammer-close-press',
    '锤式哑铃推胸': 'db-hammer-press', '仰卧哑铃上提': 'db-pullover',
    '上斜哑铃飞鸟': 'db-incline-fly',
    '杠铃卧推': 'bb-benchpress', '上斜杠铃推胸': 'bb-incline-press',
    '史密斯推胸': 'smith-press', '史密斯上斜推胸': 'smith-incline-press',
    '绳索夹胸': 'cable-crossover', '上斜绳索飞鸟夹胸': 'cable-incline-fly',
    '绳索夹下胸': 'cable-low-crossover', '绳索夹上胸': 'cable-high-crossover',
    '绳动坐姿夹胸': 'cable-seated-fly', '上斜凳下夹胸': 'bench-low-fly',
    '钻石俯卧撑': 'diamond-pushup', '窄距俯卧撑': 'close-pushup',
    '下斜俯卧撑': 'decline-pushup', '跪姿俯卧撑': 'knee-pushup',
    '上斜俯卧撑': 'incline-pushup',
    '宽距高位下拉': 'wide-pulldown', '窄距高位下拉': 'close-pulldown',
    '颈后高位下拉': 'behind-neck-pulldown', '反手高位下拉': 'reverse-pulldown',
    '坐姿划船（窄距）': 'seated-close-row', '坐姿划船（宽距）': 'seated-wide-row',
    '器械高位下拉': 'machine-pulldown', '剪刀器械高位下拉': 'scissor-pulldown',
    '挂片划船': 'plate-row', '悍马划船（单侧）': 'hammer-one-arm-row',
    '悍马反手高位下拉': 'hammer-reverse-pulldown', '引体向上': 'pullup',
    '窄距引体': 'close-pullup', '悍马单臂高位下拉': 'hammer-one-arm-pulldown',
    '悍马俯身划船': 'hammer-bent-row', '器械坐姿划船': 'machine-row',
    '器械T杆划船（宽距）': 't-bar-wide-row', '鹦鹉螺': 'nautilus-pullover',
    '海豹划船': 'seal-row', '山羊挺身（练背）': 'back-extension',
    '器械T杆划船（窄距）': 't-bar-close-row',
    '俯身哑铃划船': 'db-bent-row', '单臂哑铃划船': 'db-one-arm-row',
    '反手哑铃划船': 'db-reverse-row', '上斜哑铃提拉': 'db-incline-pulldown',
    '俯身杠铃划船': 'bb-bent-row', '反手杠铃划船': 'bb-reverse-row',
    '杠铃硬拉': 'deadlift', '宽距T杆划船': 't-bar-wide-row-v2',
    '窄距T杆划船': 't-bar-close-row-v2', '上斜凳杠铃划船': 'bench-bb-row',
    '史密斯划船': 'smith-row', '直臂下压': 'straight-arm-pushdown',
    '上斜凳绳索单臂划船': 'cable-one-arm-row', '上斜凳绳索单臂下拉': 'cable-one-arm-pulldown',
    '绳索直臂下压': 'cable-pushdown',
}

# 家族分类
FAMILY = {
    'press': 'press', 'fly': 'fly', 'pushup': 'pushup', 'dip': 'dip',
    'pulldown': 'pulldown', 'row': 'row', 'straight-arm': 'straight-arm',
    'deadlift': 'deadlift',
}
def family_of(title: str, equip: str) -> str:
    if '俯卧撑' in title: return 'pushup'
    if '双杠' in title: return 'dip'
    if '硬拉' in title: return 'deadlift'
    if '直臂下压' in title or '鹦鹉螺' in title: return 'straight-arm'
    if '飞鸟' in title or '夹' in title: return 'fly'
    if '划船' in title or '提拉' in title: return 'row'
    if '下拉' in title or '引体' in title: return 'pulldown'
    return 'press'

# 动作族 → 规则/计数配置参数
FAMILY_SPEC = {
    'press':    dict(motion=dict(primary=[145,180], middle=[100,145], target=[40,100], labels=['推起','移动中','下放']), rules='press'),
    'fly':      dict(motion=dict(primary=[155,180], middle=[120,155], target=[80,120], labels=['打开','移动中','夹拢']), rules='fly'),
    'pushup':   dict(motion=dict(primary=[150,180], middle=[100,150], target=[60,100], labels=['撑起','移动中','下放']), rules='pushup'),
    'dip':      dict(motion=dict(primary=[145,180], middle=[100,145], target=[70,100], labels=['撑起','移动中','下落']), rules='dip'),
    'pulldown': dict(motion=dict(primary=[150,180], middle=[95,150], target=[40,95], labels=['伸展','移动中','收紧']), rules='pulldown'),
    'row':      dict(motion=dict(primary=[150,180], middle=[95,150], target=[35,95], labels=['伸展','移动中','拉拢']), rules='row'),
    'straight-arm': dict(motion=dict(primary=[160,180], middle=[90,160], target=[20,90], labels=['抬起','移动中','下压']), rules='straight-arm'),
    'deadlift': dict(motion=dict(primary=[160,180], middle=[100,160], target=[60,100], labels=['锁定','移动中','拉起']), rules='deadlift'),
}

def parse_steps(lines):
    out = []
    for ln in lines:
        m = re.match(r'^([①②③④⑤])\s*([^　\s]+)　(.+)$', ln)
        if m:
            out.append({'title': m.group(2), 'detail': m.group(3).strip()})
    return out

def parse_section(lines, marker):
    """marker（如'关键要点'）之后到下一个小节标题之间的条目"""
    out, on = [], False
    for ln in lines:
        if ln == marker:
            on = True; continue
        if on:
            if ln.startswith(('标准做法', '关键要点', '常见错误')) or re.match(r'^[①②③④⑤]', ln) or ln.startswith(('目标肌群', '所需器材', '对应录屏')) or re.match(r'^[a-zA-Z]', ln) or re.match(r'^\d{2}\s', ln):
                break
            if ln.strip():
                out.append(ln.strip())
    return out

def cues_from(entry):
    """从手册内容提炼周期要领与准备提示"""
    kp = entry['keyPoints']
    setup, coaching = [], []
    for ln in entry['lines']:
        t = ln.strip()
        if t.startswith('①'):
            setup.append(t.split('　', 1)[-1])
    # 通用要领（手册“八条通用原则”）
    coaching += ['沉肩，肩膀远离耳朵', '挺胸，核心收紧', '发力时吐气，还原时吸气', '下放慢一点，两到三秒控制回位']
    # 动作专属：从关键要点里挑短句（≤26字）做轮播
    for k in kp:
        k2 = k.lstrip('▪ ').strip()
        if 0 < len(k2) <= 26 and not any(x in k2 for x in ('×',)):
            coaching.append(k2)
    return setup, coaching

def esc(s):
    return s.replace('\\', '\\\\').replace("'", "\\'")

SKIP_IDS = {'bb-benchpress', 'deadlift'}

entries = []
seen_ids = {}
for e in data:
    title = e['title']
    num = e['number']
    pid = PINYIN.get(title)
    if not pid:
        raise SystemExit(f'缺映射: {title}')
    if pid in seen_ids:
        seen_ids[pid] += 1
        pid = f'{pid}-{seen_ids[pid]}'
    else:
        seen_ids[pid] = 1
    fam = family_of(title, e.get('equipment', ''))
    steps = parse_steps(e['lines'])
    kp = [x.lstrip('▪ ').strip() for x in parse_section(e['lines'], '关键要点')]
    mis = [x.lstrip('× ').strip() for x in parse_section(e['lines'], '常见错误')]
    setup, coaching = cues_from({'lines': e['lines'], 'keyPoints': kp})
    is_pushup_fam = fam == 'pushup'
    spec = FAMILY_SPEC[fam]
    body = 'back' if num >= 36 else 'chest'
    supported = fam not in ('deadlift',) and title != '绳动坐姿夹胸'
    tips = [f'器材：{e.get("equipment", "徒手")}']
    tips += [f'准备：{x}' for x in setup[:1]]
    tips += kp[:3]
    entries.append({
        'id': pid, 'name': title, 'nameEn': e.get('titleEn', ''),
        'bodyPart': body, 'difficulty': e.get('difficulty', 2),
        'supported': supported and pid not in SKIP_IDS, 'family': fam,
        'description': (e.get('muscles', '') or '胸背部训练')[:40],
        'tips': tips, 'muscles': e.get('muscles', ''), 'equipment': e.get('equipment', ''),
        'steps': steps, 'keyPoints': kp, 'mistakes': mis,
        'setupCues': setup, 'coachingCues': coaching,
        'sourceVideo': e.get('video', ''), 'sourceNumber': num,
        'mode': 'reps', 'motion': spec['motion'], 'rulesSpec': spec['rules'],
    })

# 与手写动作同名的条目跳过注册（避免重复卡片）
# difficulty 从标题推断（手册未直接给分值数字）
def diff_of(e):
    n = e['sourceNumber']
    if '俯卧撑' in e['name']: return 3 if e['family'] == 'pushup' and ('钻石' in e['name'] or '窄距' in e['name'] or '下斜' in e['name']) else 1
    return 2
for e in entries:
    e['difficulty'] = diff_of(e)

# 写 TS
head = """/**
 * library.generated.ts —— 由 71 段录屏 + 教学手册合并生成的动作库。
 *
 * 生成脚本：tools/gen_library.py（数据源 reports/manual-extract.json）。
 * 手写的角度区间为手册标称值，未经真人标定；接入检测后按
 * calibrate_pose 流程重标。
 *
 * 规则使用 library-types.ts 的共享模板；不要手改本文件，
 * 需要调整时改生成脚本或转入手写 exercises/*.ts。
 */

import type { LibraryEntry } from './library-types';
import {
  armAngleRule, bodyLineRule, bottomRule, elbowHoldRule, elbowRepCounter,
  flatBackRule, lockoutRule, torsoLeanRule,
} from './library-types';

/** 家族规则集（每动作取 2-3 条，避免机位遮挡时误报） */
function rulesFor(family: string): ReturnType<typeof lockoutRule>[] {
  switch (family) {
    case 'press': return [lockoutRule(), bottomRule(), armAngleRule()];
    case 'fly': return [elbowHoldRule()];
    case 'pushup': return [bottomRule(), bodyLineRule()];
    case 'dip': return [bottomRule(), lockoutRule(), bodyLineRule()];
    case 'pulldown': return [lockoutRule([150, 178]), bottomRule([40, 95], '拉太深了，肘部别过度屈', '没拉到位，手肘再往回收')];
    case 'row': return [bottomRule([35, 95], '拉太深了，肘部别过度屈', '没拉到位，肘往腰靠'), torsoLeanRule()];
    case 'straight-arm': return [elbowHoldRule([160, 178])];
    case 'deadlift': return [flatBackRule()];
    default: return [lockoutRule()];
  }
}

export const GENERATED_LIBRARY: LibraryEntry[] = [
"""

def ts_str(s): return "'" + esc(s) + "'"
def motion_block(m):
    labels = m.get('labels', ['伸直', '移动中', '收紧'])
    return (f"{{ primary: {m['primary']}, middle: {m['middle']}, target: {m['target']}, "
            f"labels: {labels}, minRepIntervalMs: 900 }}")

body = []
for e in entries:
    steps_ts = ', '.join(f"{{ title: {ts_str(s['title'])}, detail: {ts_str(s['detail'])} }}" for s in e['steps'])
    kp_ts = ', '.join(ts_str(x) for x in e['keyPoints'])
    mis_ts = ', '.join(ts_str(x) for x in e['mistakes'])
    setup_ts = ', '.join(ts_str(x) for x in e['setupCues'])
    coach_ts = ', '.join(ts_str(x) for x in e['coachingCues'])
    tips_ts = ', '.join(ts_str(x) for x in e['tips'])
    body.append(f"""  {{
    id: {ts_str(e['id'])},
    name: {ts_str(e['name'])},
    nameEn: {ts_str(e['nameEn'])},
    bodyPart: '{e['bodyPart']}',
    difficulty: {e['difficulty']},
    supported: {str(e['supported']).lower()},
    family: '{e['family']}',
    description: {ts_str(e['description'])},
    tips: [{tips_ts}],
    muscles: {ts_str(e['muscles'])},
    equipment: {ts_str(e['equipment'])},
    steps: [{steps_ts}],
    keyPoints: [{kp_ts}],
    mistakes: [{mis_ts}],
    setupCues: [{setup_ts}],
    coachingCues: [{coach_ts}],
    sourceVideo: {ts_str(e['sourceVideo'])},
    sourceNumber: {e['sourceNumber']},
    mode: 'reps',
    rules: rulesFor('{e['rulesSpec']}'),
    repCounter: elbowRepCounter({motion_block(e['motion'])}),
  }},""")

tail = """
];

/** 供 index.ts 注册用 */
export const LIBRARY: LibraryEntry[] = GENERATED_LIBRARY;
"""

OUT.write_text(head + '\n'.join(body) + tail, encoding='utf-8')
print('生成', len(entries), '个动作 ->', OUT)
