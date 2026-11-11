/**
 * Layout —— 全局骨架（深色顶栏 + 内容区 + 页脚）。
 *
 * v4：顶栏整条压成深墨绿，与首页 Hero、训练视频框同色系，
 * 于是"深色"成了品牌的上半身，纸白是下半身；导航项收进一枚深色玻璃胶囊，
 * 选中态用白实心反色——这是深色条上最省力的层级表达。
 */

import { Activity, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';

export interface LayoutProps {
  /** 内容 */
  children: ReactNode;
  /** 顶栏浮在页面上（首页首屏用，照片要顶到窗口最上沿） */
  overlayHeader?: boolean;
}

/** 顶栏导航项 */
function navClass({ isActive }: { isActive: boolean }): string {
  return [
    'rounded-full px-3.5 py-1.5 text-[13px] transition-colors',
    isActive ? 'bg-white font-medium text-deep' : 'text-white/60 hover:text-white',
  ].join(' ');
}

export function Layout({ children, overlayHeader = false }: LayoutProps): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col overflow-x-clip">
      <header
        className={
          overlayHeader
            ? 'safe-top absolute inset-x-0 top-0 z-40'
            : 'safe-top sticky top-0 z-40 border-b border-white/[.06] bg-deep/95 backdrop-blur-xl'
        }
      >
        <div className="relative mx-auto flex h-[64px] w-full max-w-[1180px] items-center justify-between gap-3 px-4 sm:px-8">
          <Link to="/" className="group flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-lime text-deep transition-transform duration-300 group-hover:scale-[1.06]">
              <Activity size={15} strokeWidth={2.4} />
            </span>
            <span className="hidden flex-col leading-none sm:flex">
              <span className="text-[13.5px] font-semibold tracking-tight text-white">
                AI 健身教练
              </span>
              <span className="mt-[5px] text-[8px] font-medium uppercase tracking-[.26em] text-white/35">
                Posture Coach
              </span>
            </span>
          </Link>

          <nav
            aria-label="主导航"
            className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-0.5 rounded-full border border-white/[.08] bg-white/[.06] p-1 sm:static sm:translate-x-0 sm:translate-y-0"
          >
            <NavLink to="/" end className={navClass}>
              首页
            </NavLink>
            <NavLink to="/exercises" className={navClass}>
              动作库
            </NavLink>
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden items-center gap-1.5 text-[11px] text-white/40 lg:flex">
              <ShieldCheck size={13} className="text-lime" strokeWidth={2} />
              本地运行 · 不上传
            </span>
            <Link
              to="/exercises"
              className="hidden rounded-full bg-white px-4 py-2 text-[12.5px] font-medium text-deep transition hover:bg-white/90 sm:block"
            >
              开始训练
            </Link>
          </div>
        </div>
      </header>

      <main
        className={`mx-auto w-full max-w-[1180px] flex-1 px-4 pb-20 sm:px-8 ${
          overlayHeader ? '' : 'pt-4 sm:pt-6'
        }`}
      >
        {children}
      </main>

      <footer className="border-t border-line/80">
        <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-3 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-deep text-lime">
              <Activity size={11} strokeWidth={2.4} />
            </span>
            <p className="text-[11.5px] text-ink-400">
              姿态识别与画面处理全部在本机完成，不上传服务器
            </p>
          </div>
          <p className="text-[11.5px] text-ink-300">
            训练记录仅存本机浏览器 · 清除缓存会丢失
          </p>
        </div>
      </footer>
    </div>
  );
}

export default Layout;
