/**
 * 全局常量与阈值。
 */

/** 关键点置信度门控阈值：低于此值的点视为不可信 */
export const VISIBILITY_THRESHOLD = 0.5;

/** 指数平滑系数（0-1，越小越平滑、越滞后） */
export const SMOOTH_ALPHA = 0.4;

/** React HUD 更新节流间隔（ms，约 5fps） */
export const UI_UPDATE_INTERVAL_MS = 200;

/** 同文案语音去重间隔（ms） */
export const FEEDBACK_MIN_INTERVAL_MS = 3000;

/** 判定「检测到人体」所需的最少有效关键点数 */
export const BODY_MIN_VISIBLE_LANDMARKS = 8;

/** 单次动作达标分数线 */
export const PASS_SCORE = 70;

/** 引擎目标帧率上限 */
export const TARGET_FPS = 30;

/** 目标帧间隔（ms） */
export const TARGET_FRAME_INTERVAL_MS = 1000 / TARGET_FPS;

/** 站点部署根路径（GitHub Pages 子路径时自动带前缀，如 /ai-fitness-coach/） */
const BASE_URL: string =
  (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';

/** 静态资源目录（public/media 下的实拍图，跟随部署子路径） */
export const MEDIA_BASE = `${BASE_URL}media/`;

/** 拼一张实拍图的地址，例如 media('hero-field.jpg') */
export function media(file: string): string {
  return `${MEDIA_BASE}${file}`;
}

/** 默认模型路径（本地优先，跟随部署子路径） */
export const LOCAL_MODEL_PATH = `${BASE_URL}models/pose_landmarker_lite.task`;

/** 官方 CDN 模型兜底地址（本地模型缺失时使用） */
export const CDN_MODEL_PATH =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

/** MediaPipe WASM 文件根目录（CDN） */
export const MEDIAPIPE_WASM_ROOT =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm';

/** localStorage key 前缀 */
export const STORAGE_PREFIX = 'fitness_coach.';

/** 训练记录存储 key（带版本号） */
export const STORAGE_SESSIONS_KEY = `${STORAGE_PREFIX}sessions.v1`;

/** 语音偏好存储 key */
export const STORAGE_SPEECH_KEY = `${STORAGE_PREFIX}speech.v1`;
