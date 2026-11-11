/**
 * LiveTrainingPage —— 实时训练页（核心）。
 *
 * 集成：useCamera（摄像头）+ usePoseEngine（引擎桥接）+ useSpeech（语音设置）。
 * v4：按参考稿的排法——标题只留动作名，视频框是页面的主角（青绿辉光的深色玻璃），
 * 下面紧跟三枚白色数据胶囊；右侧是两张白卡（动作要点 / 实时反馈）与一条深色控制条。
 * 深浅分工很清楚：画面与控件是深的，信息是白的。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, CheckCircle2, Clock, Gauge, Repeat } from 'lucide-react';
import { CameraView } from '../components/CameraView';
import { ControlBar } from '../components/ControlBar';
import { FeedbackBar } from '../components/FeedbackBar';
import { Layout } from '../components/Layout';
import { StatusBanner, type StatusBannerKind } from '../components/StatusBanner';
import { TrainingHUD } from '../components/TrainingHUD';
import { getExercise, isExerciseId } from '../exercises';
import { useCamera } from '../hooks/useCamera';
import { usePoseEngine } from '../hooks/usePoseEngine';
import { useSpeech } from '../hooks/useSpeech';
import { formatDuration, formatPercent } from '../utils/format';

export function LiveTrainingPage(): JSX.Element {
  const { exerciseId = '' } = useParams<{ exerciseId: string }>();
  const navigate = useNavigate();

  const config = useMemo(
    () => (isExerciseId(exerciseId) ? getExercise(exerciseId) : null),
    [exerciseId],
  );

  const camera = useCamera();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [engineStarting, setEngineStarting] = useState<boolean>(false);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  // 已累计的运行时长 + 本次运行的起点（暂停时冻结，避免计时器把暂停时间算进去）
  const elapsedBaseRef = useRef<number>(0);
  const runStartedAtRef = useRef<number>(0);
  const speech = useSpeech();

  // camera.videoRef 是绑定到 <video> 的唯一 ref，引擎复用同一个 ref
  const videoRef = camera.videoRef;

  const engine = usePoseEngine(videoRef, canvasRef);

  // 计时器（只累计真正在跑的时间）
  useEffect(() => {
    const now = performance.now();
    if (engine.isRunning) {
      runStartedAtRef.current = now;
    } else if (runStartedAtRef.current > 0) {
      elapsedBaseRef.current += now - runStartedAtRef.current;
      runStartedAtRef.current = 0;
    }
    const timer = window.setInterval(() => {
      const extra =
        runStartedAtRef.current > 0 ? performance.now() - runStartedAtRef.current : 0;
      setElapsedMs(elapsedBaseRef.current + extra);
    }, 500);
    return () => window.clearInterval(timer);
  }, [engine.isRunning]);

  // 应用语音设置到引擎
  useEffect(() => {
    engine.engineRef.current?.setSpeechEnabled(speech.settings.enabled);
    engine.engineRef.current?.setSpeechVolume(speech.settings.volume);
  }, [engine.engineRef, speech.settings.enabled, speech.settings.volume, engine.isRunning]);

  // 自动请求摄像头
  useEffect(() => {
    void camera.start();
    // 仅在挂载时请求一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 摄像头就绪后自动启动引擎（仅一次）
  const startedRef = useRef<boolean>(false);
  useEffect(() => {
    if (!config || !camera.ready || startedRef.current) {
      return;
    }
    startedRef.current = true;
    const run = async (): Promise<void> => {
      setEngineStarting(true);
      elapsedBaseRef.current = 0;
      runStartedAtRef.current = 0;
      setElapsedMs(0);
      await engine.start(config);
      setEngineStarting(false);
    };
    void run();
  }, [config, camera.ready, engine]);

  const handleToggleRun = useCallback((): void => {
    if (engine.isRunning) {
      engine.pause();
    } else {
      engine.resume();
    }
  }, [engine]);

  const handleStop = useCallback((): void => {
    const summary = engine.stop();
    camera.stop();
    if (summary) {
      navigate('/result', { state: summary });
    } else {
      navigate('/exercises');
    }
  }, [engine, camera, navigate]);

  const handleToggleSpeech = useCallback((): void => {
    speech.toggleEnabled();
    const nextEnabled = !speech.settings.enabled;
    engine.engineRef.current?.setSpeechEnabled(nextEnabled);
  }, [speech, engine.engineRef]);

  const handleReplay = useCallback((): void => {
    engine.replay();
  }, [engine]);

  // 未找到动作
  if (!config) {
    return (
      <Layout>
        <div className="mx-auto mt-16 max-w-md rounded-panel border border-line bg-paper-pure p-10 text-center">
          <AlertTriangle className="mx-auto text-warn" size={26} strokeWidth={1.8} />
          <h1 className="display mt-5 text-[22px]">未找到该动作</h1>
          <p className="mt-2.5 text-[13px] text-ink-500">请返回动作列表重新选择。</p>
          <button
            type="button"
            className="btn-dark mt-7"
            onClick={() => navigate('/exercises')}
          >
            返回动作列表
          </button>
        </div>
      </Layout>
    );
  }

  // 状态提示计算
  let bannerVisible = false;
  let bannerKind: StatusBannerKind = 'info';
  let bannerMessage = '';

  if (camera.error) {
    bannerVisible = true;
    bannerKind = 'error';
    bannerMessage = camera.error.message;
  } else if (camera.loading) {
    bannerVisible = true;
    bannerKind = 'loading';
    bannerMessage = '正在启动摄像头…';
  } else if (!engine.isReady && engineStarting) {
    bannerVisible = true;
    bannerKind = 'loading';
    bannerMessage = '正在加载姿态识别模型…';
  } else if (engine.error) {
    bannerVisible = true;
    bannerKind = 'error';
    bannerMessage = engine.error;
  } else if (engine.isReady && !engine.snapshot.detected) {
    bannerVisible = true;
    bannerKind = 'warn';
    bannerMessage = '请站到画面中央，保持全身入镜';
  }

  const isHold = config.mode === 'hold';
  const hasError = engine.snapshot.violations.some((v) => v.severity === 'error');

  const quickStats = [
    {
      icon: Repeat,
      value: isHold ? formatDuration(engine.snapshot.holdElapsedMs ?? 0) : `${engine.snapshot.repCount}`,
      unit: isHold ? '' : '次',
    },
    { icon: Clock, value: formatDuration(elapsedMs), unit: '' },
    {
      icon: Gauge,
      value: formatPercent(engine.snapshot.passRate ?? 0),
      unit: '',
    },
  ];

  return (
    <Layout>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-400 transition-colors hover:text-ink-900"
            onClick={() => navigate('/exercises')}
          >
            <ArrowLeft size={12} strokeWidth={2.2} />
            返回动作库
          </button>
          <h1 className="display mt-3 text-[28px] leading-tight sm:text-[34px]">{config.name}</h1>
          <p className="mt-1.5 text-[11.5px] text-ink-400">
            {config.nameEn} · {isHold ? '静态保持' : '计次'} · 难度 {config.difficulty}/3
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-full border border-line bg-paper-pure px-3.5 py-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              engine.isRunning ? 'animate-breathe bg-lime-deep' : 'bg-ink-200'
            }`}
          />
          <span className="text-[11.5px] text-ink-600">
            {engine.isRunning ? '监测中' : engine.isReady ? '已暂停' : '准备中'}
          </span>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div>
          <CameraView
            videoRef={videoRef}
            canvasRef={canvasRef}
            overlay={
              <>
                <TrainingHUD
                  exerciseName={config.name}
                  phase={engine.snapshot.phase}
                  repCount={engine.snapshot.repCount}
                  currentScore={engine.snapshot.currentScore}
                  elapsedMs={elapsedMs}
                  holdElapsedMs={engine.snapshot.holdElapsedMs}
                  passRate={engine.snapshot.passRate}
                  isHold={isHold}
                />
                <StatusBanner
                  visible={bannerVisible}
                  kind={bannerKind}
                  message={bannerMessage}
                />
              </>
            }
          />

          {/* 三枚数据胶囊：参考稿放在视频正下方，读起来像"这一刻的三个数" */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {quickStats.map((s, index) => (
              <div
                key={index}
                className="flex items-center justify-center gap-2 rounded-full border border-line bg-paper-pure px-4 py-2.5 shadow-soft sm:gap-2.5 sm:px-5"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lime-tint text-[#6E8A2E]">
                  <s.icon size={12} strokeWidth={2.2} />
                </span>
                <span className="num text-[15px] font-semibold leading-none text-ink-900 sm:text-[17px]">
                  {s.value}
                </span>
                {s.unit && <span className="text-[10.5px] text-ink-400">{s.unit}</span>}
              </div>
            ))}
          </div>

          <div className="mt-3">
            <FeedbackBar message={engine.snapshot.lastFeedback} isError={hasError} />
          </div>
        </div>

        <aside className="flex flex-col gap-3">
          <div className="rounded-card border border-line bg-paper-pure p-5">
            <h2 className="text-[9.5px] uppercase tracking-[.2em] text-ink-400">动作要点</h2>
            <ul className="mt-3.5 space-y-2.5">
              {config.tips.map((tip) => (
                <li key={tip} className="flex items-start gap-2.5">
                  <CheckCircle2
                    size={13}
                    className="mt-[3px] shrink-0 text-lime-deep"
                    strokeWidth={2.2}
                  />
                  <span className="text-[12.5px] leading-[1.7] text-ink-600">{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-card border border-line bg-paper-pure p-5">
            <h2 className="text-[9.5px] uppercase tracking-[.2em] text-ink-400">实时姿态反馈</h2>
            <ul className="mt-2">
              {config.rules.map((rule, index) => {
                const hit = engine.snapshot.violations.find((v) => v.ruleId === rule.id);
                return (
                  <li
                    key={rule.id}
                    className={`flex items-center justify-between py-2.5 ${
                      index > 0 ? 'border-t border-line-soft' : ''
                    }`}
                  >
                    <span className="text-[12.5px] text-ink-600">{rule.label}</span>
                    <span
                      className={`num text-[11.5px] ${
                        hit
                          ? hit.severity === 'error'
                            ? 'font-medium text-danger'
                            : 'font-medium text-warn'
                          : 'text-ink-400'
                      }`}
                    >
                      {hit ? `${hit.actualAngle}°` : '正常'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-card border border-line bg-paper-pure p-5">
            <h2 className="text-[9.5px] uppercase tracking-[.2em] text-ink-400">摄像头</h2>

            {camera.error ? (
              <div className="mt-3 space-y-3">
                <p className="text-[12px] leading-relaxed text-danger">{camera.error.message}</p>
                <button
                  type="button"
                  className="btn-dark w-full py-2.5 text-[13px]"
                  onClick={() => void camera.start()}
                  disabled={camera.loading}
                >
                  {camera.loading ? '重试中…' : '重新连接摄像头'}
                </button>
              </div>
            ) : (
              <p className="mt-3 text-[12.5px] text-ink-500">
                {camera.ready ? '已连接，画面正常。' : '正在连接…'}
              </p>
            )}

            {camera.devices.length > 0 && (
              <div className="mt-4">
                <label className="text-[10px] uppercase tracking-[.14em] text-ink-400">
                  画面来源
                </label>
                <select
                  className="mt-2 w-full rounded-xl border border-line bg-paper-soft px-3 py-2 text-[12.5px] text-ink-700 outline-none transition focus:border-lime-deep/60 focus:bg-white"
                  value={camera.deviceId ?? ''}
                  onChange={(e) => void camera.selectDevice(e.target.value)}
                >
                  {camera.devices.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {d.label || `摄像头 ${i + 1}`}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-[11px] leading-[1.7] text-ink-400">
                  若提示「被占用」，切到另一个摄像头试试。
                </p>
              </div>
            )}
          </div>

          <ControlBar
            running={engine.isRunning}
            speechEnabled={speech.settings.enabled}
            onToggleRun={handleToggleRun}
            onStop={handleStop}
            onToggleSpeech={handleToggleSpeech}
            onReplay={handleReplay}
          />

          {!speech.supported && (
            <p className="px-1 text-[11px] leading-relaxed text-ink-400">
              当前浏览器不支持语音合成，将只显示文字提示。
            </p>
          )}
        </aside>
      </div>
    </Layout>
  );
}

export default LiveTrainingPage;
