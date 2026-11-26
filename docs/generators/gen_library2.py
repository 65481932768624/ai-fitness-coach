# -*- coding: utf-8 -*-
"""由 manual83.json 生成 library2.generated.ts 与《语音提示清单》。"""

import json, re
from pathlib import Path

SRC = Path(__file__).resolve().parents[1] / 'data' / 'manual83.json'
TS_OUT = Path(__file__).resolve().parents[2] / 'src' / 'exercises' / 'library2.generated.ts'
CUE_OUT = Path(__file__).resolve().parents[1] / '语音提示清单.md'

data = {o['number']: o for o in json.loads(SRC.read_text(encoding='utf-8'))}

# 编号 → (id, family, bodyPart, difficulty)
# 与 v1 重复的 4 个沿用 v1 的 id，注册时覆盖
SPEC = {
1:('leg-extension','leg-ext','legs',1),
2:('seated-leg-curl','leg-curl','legs',1),
3:('prone-leg-curl','leg-curl','legs',1),
4:('leg-press','leg-press','legs',2),
5:('hip-abduction-machine','abduction','glutes',1),
6:('hip-adduction-machine','adduction','legs',1),
7:('seated-leg-press','leg-press','legs',1),
8:('hack-squat','squat','legs',2),
9:('reverse-hack-squat','squat','legs',2),
10:('db-squat','squat','legs',1),
11:('db-deadlift','hinge','glutes',2),
12:('single-leg-db-deadlift','hinge','glutes',3),
13:('bulgarian-split-squat','lunge','legs',3),
14:('goblet-squat','squat','legs',1),
15:('barbell-squat','squat','legs',3),
16:('deadlift','hinge','back',3),
17:('romanian-deadlift','hinge','glutes',2),
18:('smith-squat','squat','legs',2),
19:('smith-deadlift','hinge','glutes',2),
20:('smith-sumo-squat','squat','glutes',2),
21:('sumo-deadlift','hinge','glutes',3),
22:('smith-bulgarian-squat','lunge','legs',3),
23:('smith-lunge','lunge','legs',2),
24:('lean-forward-abduction','abduction','glutes',1),
25:('glute-back-extension','back-ext','glutes',2),
26:('machine-hip-thrust','bridge','glutes',1),
27:('barbell-hip-thrust','bridge','glutes',2),
28:('smith-hip-thrust','bridge','glutes',2),
29:('cable-hip-abduction','abduction','glutes',2),
30:('cable-kickback','kickback','glutes',2),
31:('reverse-pec-deck','rear-delt','shoulders',1),
32:('machine-shoulder-press','shoulder-press','shoulders',1),
33:('machine-assisted-lateral-raise','lateral-raise','shoulders',1),
34:('plate-loaded-shoulder-press','shoulder-press','shoulders',2),
35:('machine-lateral-raise','lateral-raise','shoulders',1),
36:('viking-press','shoulder-press','shoulders',2),
37:('hammer-standing-rear-delt','rear-delt','shoulders',2),
38:('hammer-shoulder-press','shoulder-press','shoulders',2),
39:('hammer-prone-rear-delt','rear-delt','shoulders',2),
40:('db-shoulder-press','shoulder-press','shoulders',2),
41:('db-lateral-raise','lateral-raise','shoulders',2),
42:('db-front-raise','front-raise','shoulders',2),
43:('db-upright-row','upright-row','shoulders',2),
44:('db-bent-rear-delt-fly','rear-delt','shoulders',2),
45:('db-incline-pulldown','rear-delt','shoulders',2),
46:('incline-bench-rear-delt-fly','rear-delt','shoulders',2),
47:('single-arm-lateral-raise','lateral-raise','shoulders',2),
48:('single-arm-db-thruster','squat','legs',3),
49:('barbell-overhead-press','shoulder-press','shoulders',3),
50:('face-pull','rear-delt','shoulders',2),
51:('smith-shoulder-press','shoulder-press','shoulders',2),
52:('cable-front-raise','front-raise','shoulders',2),
53:('cable-single-lateral-raise','lateral-raise','shoulders',2),
54:('preacher-curl','curl','arms',2),
55:('underhand-pullup','pullup-curl','back',3),
56:('close-pullup','pullup-curl','back',3),
57:('concentration-curl','curl','arms',1),
58:('db-curl','curl','arms',1),
59:('hammer-curl','curl','arms',1),
60:('reverse-curl','curl','arms',1),
61:('incline-db-curl','curl','arms',2),
62:('prone-incline-curl','curl','arms',2),
63:('cable-bar-curl','curl','arms',1),
64:('machine-triceps-extension','triceps','arms',1),
65:('hammer-triceps-pressdown','triceps','arms',1),
66:('bent-over-db-triceps','triceps','arms',2),
67:('seated-overhead-db-triceps','triceps','arms',1),
68:('standing-overhead-db-triceps','triceps','arms',2),
69:('db-hammer-close-press','triceps','chest',2),
70:('single-arm-bent-triceps','triceps','arms',2),
71:('lying-db-skullcrusher','triceps','arms',3),
72:('rope-pushdown','triceps','arms',1),
73:('single-arm-cable-triceps','triceps','arms',2),
74:('bar-pushdown','triceps','arms',1),
75:('cable-overhead-triceps','triceps','arms',2),
76:('machine-leg-raise-crunch','crunch','core',2),
77:('hanging-leg-raise','crunch','core',3),
78:('floor-leg-raise','crunch','core',1),
79:('ab-wheel','crunch','core',3),
80:('seated-calf-raise','calf','calves',1),
81:('standing-calf-raise','calf','calves',2),
82:('wrist-curl','wrist','forearms',1),
83:('treadmill-incline','cardio','cardio',1),
}

# 机位指引
CAMERA = {
 'leg-ext':'侧面，含小腿与托垫','leg-curl':'侧面，含小腿','leg-press':'侧面，含踏板与膝',
 'abduction':'正面（额状面动作）','adduction':'正面（额状面动作）','squat':'侧面全身',
 'hinge':'侧面全身含器械','lunge':'侧面全身','back-ext':'侧面全身含髋垫','bridge':'侧面，含髋与踏板',
 'kickback':'侧后方，含工作腿','shoulder-press':'侧面或正前','lateral-raise':'正面','front-raise':'侧面',
 'rear-delt':'侧面或后侧','upright-row':'正面或侧前','curl':'侧面','pullup-curl':'正面或侧面全身',
 'triceps':'侧面','crunch':'侧面','calf':'侧面含脚踝','wrist':'侧面含前臂与手','cardio':'不需要',
}

# ---- 规则模板 ----
def rule(rid, label, triple, lo, hi, sev, weight, lo_msg, hi_msg, metric=None, phases=None):
    return dict(id=rid, label=label, triple=triple, lo=lo, hi=hi, sev=sev,
                weight=weight, lo_msg=lo_msg, hi_msg=hi_msg, metric=metric, phases=phases)

FAMILY_RULES = {
 'squat': lambda: [
   rule('knee-depth','下蹲深度','LEFT_KNEE',60,100,'error',40,'没蹲到位，大腿到平行','蹲太深了，先到大腿平行'),
   rule('torso-lean','躯干前倾','LEFT_TORSO_AXIS',10,35,'warn',25,'太直立了，髋部往后坐','前倾太多，胸口抬起来','vAngle'),
   rule('knee-align','膝盖轨迹','LEFT_KNEE_ALIGN',0,6,'warn',20,'膝盖内扣了，沿脚尖方向推开','膝盖外展过多，收回到脚尖方向','hDist'),
 ],
 'hinge': lambda: [
   rule('hip-hinge','髋铰链深度','LEFT_HIP',70,110,'error',40,'髋没下去，屁股往后推','下太深了，背会先垮'),
   rule('flat-back','背部挺直','LEFT_BODY_LINE',150,180,'error',35,'弯腰了，背部挺直再拉','别过度后仰，收到中立位'),
   rule('knee-flex','膝部微屈','LEFT_KNEE',150,175,'warn',15,'膝弯太多，保持微屈固定','膝别锁死，留一点角度'),
 ],
 'lunge': lambda: [
   rule('front-knee','前腿膝角','LEFT_KNEE',75,105,'error',40,'前腿没蹲到位','蹲太深了，前腿到平行即可'),
   rule('torso-upright','躯干直立','LEFT_TORSO_AXIS',0,20,'warn',25,'前倾太多了，胸口立起来','别后仰，躯干保持直立','vAngle'),
   rule('knee-align','前膝轨迹','LEFT_KNEE_ALIGN',0,6,'warn',20,'膝盖内扣了，沿脚尖方向推','前膝外展过多，收回'),
 ],
 'leg-ext': lambda: [
   rule('knee-extend','伸膝幅度','LEFT_KNEE',155,175,'error',45,'没伸直，股四还没顶到位','别锁死，留一点角度'),
   rule('knee-return','回落幅度','LEFT_KNEE',80,110,'warn',25,'回落太浅，行程不够','回落太深，配重别放到底','angle',['bottom']),
 ],
 'leg-curl': lambda: [
   rule('knee-curl','弯举幅度','LEFT_KNEE',40,70,'error',45,'没收到位，再收紧一点','收太过了，别超过自然极限'),
   rule('knee-extend-back','回落幅度','LEFT_KNEE',150,175,'warn',25,'回落不够，腘绳没拉长','回落太深，别放到底'),
 ],
 'leg-press': lambda: [
   rule('knee-depth','蹬起幅度','LEFT_KNEE',70,100,'error',45,'没蹬到位，再推起来','蹬太深了，别让腰离垫'),
   rule('knee-lock','膝关节锁定','LEFT_KNEE',160,180,'warn',25,'没伸到位','别锁死，留一点角度'),
 ],
 'abduction': lambda: [
   rule('torso-upright','躯干稳定','LEFT_TORSO_AXIS',0,12,'warn',40,'身体侧倾了，躯干保持直立','别后仰，坐稳','vAngle'),
 ],
 'adduction': lambda: [
   rule('torso-upright','躯干稳定','LEFT_TORSO_AXIS',0,12,'warn',40,'身体侧倾了，躯干保持直立','别后仰，坐稳','vAngle'),
 ],
 'kickback': lambda: [
   rule('leg-straight','支撑腿伸直','LEFT_KNEE',150,175,'warn',30,'腿弯了，保持伸直','别锁死'),
   rule('hip-extend','后踢幅度','LEFT_HIP',120,180,'warn',35,'没踢到位，臀再收紧','踢太高，腰会代偿'),
 ],
 'back-ext': lambda: [
   rule('hip-extend','上挺幅度','LEFT_HIP',160,180,'error',45,'没挺起来，臀发力往上顶','过头了，头背臀一条线就停'),
   rule('hip-lower','下放幅度','LEFT_HIP',45,75,'warn',25,'下得不够，躯干到45到60度','下太深了，别让腰吃力'),
 ],
 'bridge': lambda: [
   rule('hip-extend','顶髋幅度','LEFT_HIP',160,180,'error',45,'没顶到位，身体与大腿成一条线','顶太高了，别过度伸展'),
   rule('shin-vertical','小腿垂直','LEFT_KNEE',80,100,'warn',25,'小腿不垂直，脚收一点','脚太近了，膝角太小'),
 ],
 'shoulder-press': lambda: [
   rule('press-top','推起幅度','LEFT_ELBOW',160,175,'error',45,'没推到位，再推到接近伸直','别锁死，留一点微屈'),
   rule('press-bottom','下放幅度','LEFT_ELBOW',80,100,'warn',25,'下放不够，到手肘约90度','下太深，肩会吃力'),
 ],
 'lateral-raise': lambda: [
   rule('arm-height','抬起高度','LEFT_ARM_TORSO',80,100,'error',45,'没抬到与肩平行','抬太高了，到肩高就停'),
   rule('elbow-fixed','肘部微屈','LEFT_ELBOW',150,175,'warn',20,'肘别弯，保持微屈','肘伸太直，留一点角度'),
 ],
 'front-raise': lambda: [
   rule('arm-height','抬起高度','LEFT_ARM_TORSO',80,100,'error',45,'没抬到与肩平行','抬太高了，到肩高就停'),
   rule('elbow-fixed','肘部微屈','LEFT_ELBOW',150,175,'warn',20,'肘别弯，保持微屈','肘伸太直，留一点角度'),
 ],
 'rear-delt': lambda: [
   rule('arm-open','打开幅度','LEFT_ARM_TORSO',80,100,'error',40,'没打开到与肩平行','打开过头，到平行就停'),
   rule('torso-hinge','俯身角度','LEFT_TORSO_AXIS',40,65,'warn',25,'俯身不够，后束吃不到','俯身太多，腰会代偿','vAngle'),
 ],
 'upright-row': lambda: [
   rule('lift-height','提拉高度','LEFT_ELBOW',80,110,'warn',30,'没提到位，肘到肩高','提太高，肩会夹'),
   rule('arm-open','大臂外展','LEFT_ARM_TORSO',80,100,'warn',25,'大臂没打开','大臂太开，收到肩高'),
 ],
 'curl': lambda: [
   rule('curl-top','弯举幅度','LEFT_ELBOW',40,70,'error',45,'没弯到位，再收一点','弯过头了，别耸肩借力'),
   rule('curl-bottom','下放幅度','LEFT_ELBOW',150,170,'warn',25,'下放不够，接近伸直','完全伸直了，留一点微屈'),
 ],
 'pullup-curl': lambda: [
   rule('hang-extend','悬垂伸展','LEFT_ELBOW',160,180,'warn',30,'没放到底，背阔没拉长','别锁死'),
   rule('pull-up','拉起幅度','LEFT_ELBOW',30,80,'error',45,'没拉起来，用二头带','拉太过了，别缩肩'),
 ],
 'triceps': lambda: [
   rule('tri-extend','伸直幅度','LEFT_ELBOW',150,175,'error',45,'没伸直，三头没收紧','别超伸，留一点微屈'),
   rule('tri-flex','下放幅度','LEFT_ELBOW',60,90,'warn',25,'下放不够，小臂到垂直','下太深，肘会吃力'),
 ],
 'crunch': lambda: [
   rule('crunch-up','卷起幅度','LEFT_BODY_LINE',90,125,'error',45,'腹肌没卷起来，用腹部发力','卷太多，腰别离垫'),
   rule('crunch-down','下放幅度','LEFT_BODY_LINE',150,175,'warn',25,'下放不够，腹肌保持张力','别完全放松，保持收缩'),
 ],
 'calf': lambda: [
   rule('ankle-up','提踵高度','LEFT_ANKLE',110,130,'error',45,'没踮到顶，再往上','踮过头，脚踝会不稳'),
   rule('ankle-down','下放幅度','LEFT_ANKLE',150,170,'warn',25,'下放不够，脚跟要落到最低','别塌脚踝，控制住'),
 ],
 'wrist': lambda: [
   rule('wrist-flex','手腕幅度','LEFT_WRIST',140,170,'error',45,'没抬到位，手腕再往上','抬过头，幅度控制住'),
 ],
 'cardio': lambda: [],
}

# 计数模板：triple + (primary=complete, middle, target=required intermediate) + labels
MOTION = {
 'squat': ('LEFT_KNEE',[160,180],[100,160],[60,100],['站立','下蹲中','底部']),
 'hinge': ('LEFT_HIP',[150,180],[100,150],[70,100],['站立','下放中','底端']),
 'lunge': ('LEFT_KNEE',[155,180],[105,155],[75,105],['站立','下蹲中','底端']),
 'leg-ext': ('LEFT_KNEE',[155,180],[110,155],[80,110],['伸直','回落中','屈膝']),
 'leg-curl': ('LEFT_KNEE',[150,180],[70,150],[40,70],['伸展','弯举中','收紧']),
 'leg-press': ('LEFT_KNEE',[160,180],[100,160],[70,100],['蹬直','回放中','屈膝']),
 'abduction': ('LEFT_KNEE',[150,180],[100,150],[80,110],['并拢','外展中','打开']),
 'adduction': ('LEFT_KNEE',[150,180],[100,150],[80,110],['打开','内收中','并拢']),
 'kickback': ('LEFT_HIP',[160,180],[100,160],[70,100],['起始','后踢中','顶臀']),
 'back-ext': ('LEFT_HIP',[160,180],[75,160],[45,75],['直立','下放中','底端']),
 'bridge': ('LEFT_HIP',[160,180],[120,160],[85,120],['落地','顶髋中','顶端']),
 'shoulder-press': ('LEFT_ELBOW',[160,175],[100,160],[80,100],['推起','下放中','底端']),
 'lateral-raise': ('LEFT_ARM_TORSO',[0,40],[40,80],[80,100],['放下','抬起中','肩高']),
 'front-raise': ('LEFT_ARM_TORSO',[0,40],[40,80],[80,100],['放下','抬起中','肩高']),
 'rear-delt': ('LEFT_ARM_TORSO',[0,40],[40,80],[80,100],['放下','打开中','平行']),
 'upright-row': ('LEFT_ELBOW',[150,180],[110,150],[80,110],['垂下','上提中','肩高']),
 'curl': ('LEFT_ELBOW',[150,175],[70,150],[40,70],['伸直','弯举中','收紧']),
 'pullup-curl': ('LEFT_ELBOW',[160,180],[80,160],[30,80],['悬垂','拉起中','顶端']),
 'triceps': ('LEFT_ELBOW',[60,90],[90,150],[150,175],['屈肘','下压中','伸直']),
 'crunch': ('LEFT_BODY_LINE',[150,175],[125,150],[90,125],['放下','卷起中','卷起']),
 'calf': ('LEFT_ANKLE',[150,175],[130,150],[110,130],['下放','提起中','顶峰']),
 'wrist': ('LEFT_WRIST',[150,175],[130,150],[110,130],['下放','弯举中','收紧']),
}

GENERAL_CUE = {
 'legs': ['膝盖沿脚尖方向，不要内扣', '收紧核心，腰不要塌', '下放慢一点，两到三秒控制回位', '发力时吐气，还原时吸气'],
 'glutes': ['用臀部发力，不要用腰代偿', '收紧核心，腰背保持稳定', '顶端停一下，感受臀部收缩', '下放慢一点，保持张力'],
 'shoulders': ['沉肩，肩膀远离耳朵', '用大臂发力，不要用手臂甩', '核心收紧，身体不要晃动', '发力时吐气，还原时吸气'],
 'arms': ['大臂固定不动，只有肘在动', '沉肩，不要耸肩借力', '下放慢一点，保持张力', '发力时吐气，还原时吸气'],
 'core': ['收紧核心，腰不要塌', '用腹部发力，不要用腰', '下放不要完全放松，保持张力', '呼吸均匀，不要憋气'],
 'calves': ['踮到最高点停一下', '下放到最低，做全幅度', '膝盖保持稳定，不要借力', '发力时吐气，还原时吸气'],
 'forearms': ['前臂固定不动，只动手腕', '幅度做满，顶端停一下', '下放控制住，不要甩', '发力时吐气'],
 'cardio': ['保持均匀呼吸，不要憋气', '心率控制在减脂区间', '上身直立，不要一直扶把手', '感觉太喘就降一点速度'],
 'chest': ['沉肩，肩胛后缩贴稳', '大臂与身体约六十度', '下放慢一点，控制离心', '发力时吐气，还原时吸气'],
 'back': ['先沉肩，再动手臂', '用背部发力，不要用手拉', '收紧核心，腰背稳定', '下放慢一点，保持张力'],
}

BODY_CN = {
 'legs':'下肢','glutes':'臀部','chest':'胸','back':'背部','shoulders':'肩部',
 'arms':'手臂','core':'核心','calves':'小腿','forearms':'前臂','cardio':'有氧',
}

# 动作族专属要领：覆盖通用四条里不适用的情况
FAMILY_CUE = {
 'adduction': ['匀速内收，不要靠速度甩', '上身保持稳定，只让腿动', '收回时控制住，保持张力', '发力时吐气，还原时吸气'],
 'abduction': ['用臀部把腿向外撑开', '上身固定，不要靠前后晃借力', '打开到最大停一秒', '回收时慢慢放，保持张力'],
 'leg-ext': ['转轴对准膝关节', '背和臀全程贴住靠垫', '伸到接近伸直就停，别锁死', '回落慢一点，配重不要撞击'],
 'leg-curl': ['膝对准转轴，大腿被压垫压住', '臀不要离座，腰不要晃', '收紧要到位，回落要放慢', '发力时吐气，还原时吸气'],
 'leg-press': ['背和臀完全贴垫，腰不要悬空', '膝盖沿脚尖方向，不要内扣', '起始膝不锁死，蹬起不锁死', '脚跟不离板，全脚掌发力'],
 'calf': ['踮到最高点停一下', '下放到最低，做全幅度', '膝盖保持稳定，不要借力', '发力时吐气，还原时吸气'],
 'wrist': ['前臂固定不动，只动手腕', '幅度做满，顶端停一下', '下放控制住，不要甩', '发力时吐气'],
 'cardio': ['保持均匀呼吸，不要憋气', '心率控制在减脂区间', '上身直立，不要一直扶把手', '感觉太喘就降一点速度'],
}

def clean(s):
    s = s.replace('　', '').strip()
    for a, b in [('肩脾','肩胛'),('肩脚','肩胛'),('肩肿','肩胛'),('胭绳','腘绳'),('胆绳','腘绳'),('鼎工','臀')]:
        s = s.replace(a, b)
    return s

def split_cues(text, limit=3):
    parts = re.split(r'[；;。]', clean(text))
    out = []
    for p in parts:
        p = p.strip(' ，,')
        if 4 <= len(p) <= 40:
            out.append(p)
        if len(out) >= limit:
            break
    return out

def esc(s):
    return s.replace('\\', '\\\\').replace("'", "\\'")

def ts_str(s):
    return "'" + esc(s) + "'"

entries = []
cue_rows = []
for num in sorted(SPEC):
    o = data[num]
    aid, family, body, diff = SPEC[num]
    title = o['title']
    steps = o.get('steps', [])
    kp = [clean(x) for x in o.get('keyPoints', [])]
    mis = [clean(x) for x in o.get('mistakes', [])]

    # 准备提示：起始位拆句，优先器材/握距/站距
    setup = split_cues(steps[0]['detail'], 3) if steps else []
    # 要领：通用 4 条 + 关键要点里较短的
    cues = list(FAMILY_CUE.get(family) or GENERAL_CUE.get(body) or GENERAL_CUE['legs'])
    for k in kp:
        k2 = k.rstrip('。；;')
        if 5 <= len(k2) <= 26 and k2 not in cues:
            cues.append(k2)
        if len(cues) >= 9:
            break

    tip_items = [f'器材：{o.get("equipment","")}'] + setup[:1] + kp[:2]
    rules = FAMILY_RULES[family]()
    motion = MOTION.get(family)

    entries.append(dict(num=num, id=aid, name=title, name_en=o.get('titleEn',''), body=body,
                        diff=diff, family=family, equipment=o.get('equipment',''),
                        muscles=o.get('muscles',''), steps=steps, kp=kp, mis=mis,
                        setup=setup, cues=cues, tips=tip_items, rules=rules, motion=motion,
                        video=o.get('video','')))
    cue_rows.append(dict(num=num, name=title, family=family, body=body,
                         equipment=o.get('equipment',''), setup=setup, cues=cues,
                         rules=[(r['label'], r['lo_msg'], r['hi_msg'], r['sev']) for r in rules]))

def js_rules(rules):
    if not rules:
        return '[]'
    out = []
    for r in rules:
        phases = ''
        if r.get('phases'):
            phases = ", activePhases: [" + ', '.join(ts_str(p) for p in r['phases']) + "]"
        metric = f", metric: '{r['metric']}'" if r.get('metric') else ''
        out.append(
            "{ id: %s, label: %s, triple: TRIPLES.%s, targetRange: [%d, %d], "
            "messageLow: %s, messageHigh: %s, severity: '%s', weight: %d%s%s }" % (
                ts_str(r['id']), ts_str(r['label']), r['triple'], r['lo'], r['hi'],
                ts_str(r['lo_msg']), ts_str(r['hi_msg']), r['sev'], r['weight'], metric, phases))
    return '[\n      ' + ',\n      '.join(out) + ',\n    ]'

def js_counter(m):
    if not m:
        return 'null'
    triple, a, b, c, labels = m
    return (
        "{\n      phases: [\n"
        "        { phase: 'top', label: %s, condition: { triple: TRIPLES.%s, range: [%d, %d] } },\n"
        "        { phase: 'moving', label: %s, condition: { triple: TRIPLES.%s, range: [%d, %d] } },\n"
        "        { phase: 'bottom', label: %s, condition: { triple: TRIPLES.%s, range: [%d, %d] } },\n"
        "      ],\n      completePhase: 'top',\n      requiredIntermediatePhase: 'bottom',\n"
        "      minRepIntervalMs: 900,\n    }" % (
            ts_str(labels[0]), triple, a[0], a[1],
            ts_str(labels[1]), triple, b[0], b[1],
            ts_str(labels[2]), triple, c[0], c[1]))

head = '''/**
 * library2.generated.ts —— 第二批 83 个动作（腿、臀、肩、臂、核心、小腿、有氧）。
 *
 * 生成脚本：tools/gen_library2.py，数据源 reports/manual83.json
 * （由《全身训练动作教学手册（83个动作）》解析）。
 *
 * 规则里的角度是手册标称值换算的初值，未经真人标定。
 * 其中 metric: 'vAngle' 表示躯干与竖直方向夹角，'hDist' 表示水平距离百分比。
 */

import { TRIPLES } from '../constants/landmarks';
import type { LibraryEntry } from './library-types';

export const LIBRARY2: LibraryEntry[] = [
'''

body_parts = []
for e in entries:
    steps_ts = ', '.join(
        "{ title: %s, detail: %s }" % (ts_str(clean(s['title'])), ts_str(clean(s['detail'])))
        for s in e['steps'])
    kp_ts = ', '.join(ts_str(x) for x in e['kp'])
    mis_ts = ', '.join(ts_str(x) for x in e['mis'])
    setup_ts = ', '.join(ts_str(x) for x in e['setup'])
    cue_ts = ', '.join(ts_str(x) for x in e['cues'])
    tips_ts = ', '.join(ts_str(x) for x in e['tips'])
    body_parts.append(f"""  {{
    id: {ts_str(e['id'])},
    name: {ts_str(e['name'])},
    nameEn: {ts_str(e['name_en'])},
    bodyPart: '{e['body']}',
    difficulty: {e['diff']},
    supported: true,
    family: '{e['family']}',
    description: {ts_str(e['muscles'][:38] if e['muscles'] else e['family'])},
    tips: [{tips_ts}],
    muscles: {ts_str(e['muscles'])},
    equipment: {ts_str(e['equipment'])},
    steps: [{steps_ts}],
    keyPoints: [{kp_ts}],
    mistakes: [{mis_ts}],
    setupCues: [{setup_ts}],
    coachingCues: [{cue_ts}],
    sourceVideo: {ts_str(e['video'])},
    sourceNumber: {e['num']},
    mode: '{'cardio' if e['family']=='cardio' else 'reps'}',
    rules: {js_rules(e['rules'])},
    repCounter: {js_counter(e['motion'])},
  }},""")

TS_OUT.write_text(head + '\n'.join(body_parts) + '\n];\n', encoding='utf-8')

# ---- 语音提示清单 ----
lines = ['# 动作要领提示音清单（第二批 83 个动作）', '',
         '> 来源：《全身训练动作教学手册（83个动作）》+ 83 段录屏要点。',
         '> 用途：语音提示代码的素材表。每条动作给出「入场准备」「周期要领」「错误纠错」三类提示音。',
         '', '## 一、通用要领（所有动作共享，按部位选用）', '']
for body, cues in GENERAL_CUE.items():
    lines.append(f'**{BODY_CN.get(body, body)}**：' + '；'.join(cues))
lines += ['', '## 二、逐动作清单', '',
          '| # | 动作 | 器材 | 入场准备提示（器材摆放 / 握距 / 站位） | 周期要领（每 12 秒轮播） | 错误纠错（判违规时） |',
          '|---|---|---|---|---|---|']
for r in cue_rows:
    setup = '；'.join(r['setup']) if r['setup'] else '—'
    cues = '；'.join(r['cues'][:6])
    errs = '；'.join(f"{lab}：{lo}" for lab, lo, hi, sev in r['rules'][:2]) if r['rules'] else '—'
    lines.append(f"| {r['num']} | {r['name']} | {r['equipment']} | {setup} | {cues} | {errs} |")
lines += ['', '## 三、播放策略', '',
          '- 入场：播 1 次「开始 + 动作名 + 第一条准备提示」，例如「开始坐姿腿屈伸。调靠背，让后背完全贴住靠垫」。',
          '- 纠错：规则命中时立即播，同文案 3 秒去重，error 优先抢播。',
          '- 周期要领：每 12 秒轮播 1 条；若 6 秒内刚播过纠错，自动顺延，不抢话。',
          '- 所有语音共用一条播放通道，避免多条叠加。']
CUE_OUT.write_text('\n'.join(lines) + '\n', encoding='utf-8')
print('entries', len(entries), '->', TS_OUT.name, '| cues ->', CUE_OUT.name)
