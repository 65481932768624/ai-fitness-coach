/**
 * useCamera —— 摄像头权限与视频流管理。
 *
 * 负责 getUserMedia、把流绑定到 video 元素、错误态与清理。
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/** 摄像头错误态 */
export interface CameraError {
  /** 错误码：denied / notfound / insecure / busy / unknown */
  code: 'denied' | 'notfound' | 'insecure' | 'busy' | 'unknown';
  /** 面向用户的错误提示 */
  message: string;
}

export interface UseCameraResult {
  /** 绑定到 <video> 的 ref */
  videoRef: React.RefObject<HTMLVideoElement>;
  /** 视频流是否已就绪（元数据加载完成） */
  ready: boolean;
  /** 是否正在请求 */
  loading: boolean;
  /** 错误态 */
  error: CameraError | null;
  /** 设备列表（已授权后可见 label） */
  devices: MediaDeviceInfo[];
  /** 当前使用的设备 id */
  deviceId: string | null;
  /** 主动开启摄像头 */
  start: () => Promise<void>;
  /** 切换到指定设备并重启 */
  selectDevice: (deviceId: string) => Promise<void>;
  /** 关闭摄像头并释放流 */
  stop: () => void;
}

/** 将原生错误映射为友好提示 */
function mapError(error: unknown): CameraError {
  const err = error as { name?: string; message?: string };
  if (err?.name === 'NotAllowedError' || err?.name === 'SecurityError') {
    return { code: 'denied', message: '摄像头权限被拒绝，请在浏览器设置中允许访问' };
  }
  if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
    return { code: 'notfound', message: '未检测到可用摄像头，请检查设备连接' };
  }
  if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
    return {
      code: 'busy',
      message: '摄像头被其他程序占用或抓取了无效设备，请关闭占用程序（QQ/微信/相机等）后重试，或切换到其他摄像头',
    };
  }
  if (err?.name === 'OverconstrainedError') {
    return { code: 'unknown', message: '指定的摄像头不可用，请切换到其他摄像头重试' };
  }
  return { code: 'unknown', message: '摄像头启动失败，请刷新页面重试' };
}

/**
 * 启动策略：逐个设备尝试。
 *
 * 本机可能存在「已拔出但残留在系统中的幽灵设备」（PnP 状态 IsPresent=false），
 * 浏览器会在枚举列表里列出它，但打开时会抛 NotReadableError。
 * 因此这里做两件事：
 *   1. 优先用调用方指定的 deviceId；
 *   2. 失败后按枚举顺序逐个 deviceId 重试，跳过打不开的设备。
 */
async function acquireStream(targetDeviceId?: string): Promise<MediaStream> {
  // 先请求一次基础权限（不带 deviceId），以便拿到带 label 的完整设备列表
  const baseConstraints: MediaStreamConstraints = {
    video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
    audio: false,
  };

  // 已指定具体设备：直接尝试；失败则回退到逐个尝试
  if (targetDeviceId) {
    return navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: targetDeviceId }, width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });
  }

  // 先尝试默认（facingMode: user），这是大多数情况的最优解
  try {
    return await navigator.mediaDevices.getUserMedia(baseConstraints);
  } catch (firstErr) {
    const e = firstErr as { name?: string };
    // 只有「设备打不开」类错误才继续逐个试；权限被拒就直接抛
    if (e?.name === 'NotAllowedError' || e?.name === 'SecurityError') {
      throw firstErr;
    }

    // 枚举设备，逐个用 exact deviceId 试
    let devices = await navigator.mediaDevices.enumerateDevices();
    devices = devices.filter((d) => d.kind === 'videoinput' && d.deviceId);

    // 优先非 facingMode 约束逐试（部分幽灵设备用 exact 能跳过）
    for (const d of devices) {
      try {
        return await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: d.deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch {
        // 这个设备不可用，继续下一个
      }
    }

    // 全部失败：抛出原始错误
    throw firstErr;
  }
}

export function useCamera(): UseCameraResult {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<CameraError | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  /** 刷新设备列表（需已有权限才能拿到 label） */
  const refreshDevices = useCallback(async (): Promise<MediaDeviceInfo[]> => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      return [];
    }
    const all = await navigator.mediaDevices.enumerateDevices();
    const cams = all.filter((d) => d.kind === 'videoinput');
    setDevices(cams);
    return cams;
  }, []);

  const stop = useCallback((): void => {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    const video = videoRef.current;
    if (video) {
      video.srcObject = null;
    }
    setReady(false);
  }, []);

  const start = useCallback(
    async (targetId?: string): Promise<void> => {
      // 环境检查：需要 https 或 localhost
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setError({ code: 'insecure', message: '当前环境不支持摄像头，请使用 https 或 localhost 访问' });
        return;
      }

      setLoading(true);
      setError(null);
      try {
        // 先释放旧流，避免「自己占用自己」
        stop();

        const stream = await acquireStream(targetId);
        streamRef.current = stream;

        // 记录实际生效的设备
        const track = stream.getVideoTracks()[0];
        const settings = track?.getSettings?.();
        if (settings?.deviceId) {
          setDeviceId(settings.deviceId);
        }

        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          video.muted = true;
          video.playsInline = true;
          await video.play().catch(() => undefined);
          setReady(true);
        }

        // 拿到权限后刷新设备列表（此时 label 才可读）
        await refreshDevices();
      } catch (err) {
        console.warn('[useCamera] 启动失败', err);
        setError(mapError(err));
        setReady(false);
      } finally {
        setLoading(false);
      }
    },
    [stop, refreshDevices],
  );

  /** 切换到指定摄像头并重启 */
  const selectDevice = useCallback(
    async (id: string): Promise<void> => {
      await start(id);
    },
    [start],
  );

  // 监听设备插拔，自动刷新列表
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.addEventListener) {
      return;
    }
    const onChange = (): void => {
      void refreshDevices();
    };
    navigator.mediaDevices.addEventListener('devicechange', onChange);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', onChange);
    };
  }, [refreshDevices]);

  // 卸载时释放
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return { videoRef, ready, loading, error, devices, deviceId, start: () => start(), selectDevice, stop };
}
