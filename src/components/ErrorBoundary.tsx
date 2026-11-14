/**
 * ErrorBoundary —— 全局错误边界。
 *
 * 解决的问题：任一页面组件抛错时，React 18 会卸载整棵树，用户看到的是纯白屏，
 * 连导航和「返回」都没了。这里兜住异常，保留品牌外壳，给出重试与回首页两条出口。
 *
 * React 只支持 class 组件做错误边界，这是唯一必须用 class 的地方。
 */

import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';

export interface ErrorBoundaryProps {
  /** 被保护的内容 */
  children: ReactNode;
  /** 出错时的额外回调（上报 / 控制台日志） */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  /** 捕获到的错误，null 表示正常 */
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // 保留组件栈，出问题时能在控制台定位到具体组件而不是只剩一条 message
    console.error('[ErrorBoundary] 页面渲染失败', error, info.componentStack);
    this.props.onError?.(error, info);
  }

  /** 清空错误态，让子树重新挂载 */
  private handleReset = (): void => {
    this.setState({ error: null });
  };

  /** 回首页并清空错误态（整页跳转，确保状态干净） */
  private handleBackHome = (): void => {
    const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
    window.location.href = base;
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 py-16">
        <div className="w-full max-w-md rounded-panel border border-line bg-paper-pure p-10 text-center shadow-soft">
          <AlertTriangle className="mx-auto text-warn" size={26} strokeWidth={1.8} />
          <h1 className="display mt-5 text-[22px] leading-tight">页面出了点问题</h1>
          <p className="mt-2.5 text-[13px] leading-relaxed text-ink-500">
            训练记录仍然保存在本机浏览器里，不会因为这次报错丢失。
          </p>

          <pre className="mt-5 max-h-32 overflow-auto rounded-xl border border-line-soft bg-paper-soft p-3 text-left text-[11px] leading-relaxed text-ink-500">
            {error.message || String(error)}
          </pre>

          <div className="mt-7 flex flex-col gap-2.5">
            <button
              type="button"
              className="btn-dark inline-flex items-center justify-center gap-2 py-2.5 text-[13px]"
              onClick={this.handleReset}
            >
              <RotateCcw size={13} strokeWidth={2.2} />
              重试
            </button>
            <button
              type="button"
              className="text-[12.5px] text-ink-400 transition-colors hover:text-ink-900"
              onClick={this.handleBackHome}
            >
              返回首页
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
