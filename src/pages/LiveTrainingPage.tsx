/**
 * LiveTrainingPage —— 实时训练页（核心）。
 *
 * 集成：useCamera（摄像头）+ usePoseEngine（引擎桥接）+ useSpeech（语音设置）。
 * 展示：CameraView（video + canvas）+ TrainingHUD + FeedbackBar + ControlBar + StatusBanner。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft } from 'lucide-react';
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

export function LiveTrainingPage(): JSX.Element {
  const { exerciseId = '' } = useParams<{ exerciseId: string }>();
  const navigate = useNavigate();

  const config = useMemo(() => (isExerciseId(exerciseId) ? getExercise(exerciseId) : null), [
    exerciseId,
  ]);

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
        <div className="card-surface mx-auto max-w-lg p-8 text-center">
          <AlertTriangle className="mx-auto text-warn" size={32} />
          <h1 className="mt-4 text-xl font-semibold text-gray-50">未找到该动作</h1>
          <p className="mt-2 text-sm text-gray-400">请返回动作列表重新选择。</p>
          <button
            type="button"
            className="btn-primary mt-6"
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

  return (
    <Layout>
      <div className="mb-5 flex items-center justify-between">
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-gray-100"
          onClick={() => navigate('/exercises')}
        >
          <ArrowLeft size={16} />
          返回
        </button>
        <div className="text-right">
          <div className="text-lg font-semibold text-gray-50">{config.name}</div>
          <div className="text-xs text-gray-500">
            {config.tips.join(' · ')}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
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
          <div className="mt-4">
            <FeedbackBar message={engine.snapshot.lastFeedback} isError={hasError} />
          </div>
        </div>

        <aside className="flex flex-col gap-5">
          <div className="card-surface p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
              动作要点
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-gray-300">
              {config.tips.map((tip) => (
                <li key={tip} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>

          <div className="card-surface p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
              实时合规检查
            </h3>
            <ul className="mt-3 space-y-2.5">
              {config.rules.map((rule) => {
                const hit = engine.snapshot.violations.find((v) => v.ruleId === rule.id);
                return (
                  <li key={rule.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">{rule.label}</span>
                    <span
                      className={
                        hit
                          ? hit.severity === 'error'
                            ? 'font-medium text-danger'
                            : 'font-medium text-warn'
                          : 'text-gray-500'
                      }
                    >
                      {hit ? `${hit.actualAngle}°` : '正常'}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="card-surface p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">
              摄像头
            </h3>

            {camera.error ? (
              <div className="mt-3 space-y-3">
                <p className="text-sm leading-relaxed text-danger">{camera.error.message}</p>
                <button
                  type="button"
                  className="btn-primary w-full"
                  onClick={() => void camera.start()}
                  disabled={camera.loading}
                >
                  {camera.loading ? '重试中…' : '重新连接摄像头'}
                </button>
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-400">
                {camera.ready ? '已连接，画面正常。' : '正在连接…'}
              </p>
            )}

            {camera.devices.length > 0 && (
              <div className="mt-4">
                <label className="text-xs text-gray-500">选择摄像头</label>
                <select
                  className="mt-1.5 w-full rounded-lg border border-base-700 bg-base-900 px-3 py-2 text-sm text-gray-200 outline-none focus:border-accent"
                  value={camera.deviceId ?? ''}
                  onChange={(e) => void camera.selectDevice(e.target.value)}
                >
                  {camera.devices.map((d, i) => (
                    <option key={d.deviceId || i} value={d.deviceId}>
                      {d.label || `摄像头 ${i + 1}`}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs leading-relaxed text-gray-500">
                  如果提示「被占用」，请切换到这里另一个摄像头试试。
                </p>
              </div>
            )}
          </div>

          <div className="card-surface p-5">
            <ControlBar
              running={engine.isRunning}
              speechEnabled={speech.settings.enabled}
              onToggleRun={handleToggleRun}
              onStop={handleStop}
              onToggleSpeech={handleToggleSpeech}
              onReplay={handleReplay}
            />
          </div>

          {!speech.supported && (
            <p className="text-xs text-amber-300/80">
              当前浏览器不支持语音合成，将只显示文字提示。
            </p>
          )}
        </aside>
      </div>
    </Layout>
  );
}

export default LiveTrainingPage;
