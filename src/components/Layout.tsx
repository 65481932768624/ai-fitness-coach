/**
 * Layout —— 全局骨架（顶栏 + 内容区 + 底部说明）。
 *
 * v2：导航加选中态、顶栏玻璃拟态、安全区内边距（iPhone 刘海/底部条）。
 */

import { Activity, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';

export interface LayoutProps {
  /** 内容 */
  children: ReactNode;
}

/** 顶栏导航项 */
function navClass({ isActive }: { isActive: boolean }): string {
  return [
    'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
    isActive
      ? 'bg-white/10 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.08)]'
      : 'text-white/50 hover:text-white/85',
  ].join(' ');
}

export function Layout({ children }: LayoutProps): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="safe-top sticky top-0 z-30 border-b border-white/[0.06] bg-base-950/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/" className="group flex items-center gap-3">
            <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-soft via-accent to-accent-deep text-base-950 shadow-[0_10px_28px_-12px_rgba(52,211,153,.9)] transition-transform duration-300 group-hover:scale-105">
              <Activity size={20} strokeWidth={2.4} />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-[15px] font-bold tracking-tight text-white">
                AI 健身教练
              </span>
              <span className="mt-1 hidden text-[9px] font-semibold tracking-[0.22em] text-white/30 sm:block">
                REAL-TIME FORM COACH
              </span>
            </span>
          </Link>

          <nav
            aria-label="主导航"
            className="flex items-center gap-1 rounded-full border border-white/[0.06] bg-white/[0.03] p-1"
          >
            <NavLink to="/" end className={navClass}>
              首页
            </NavLink>
            <NavLink to="/exercises" className={navClass}>
              动作库
            </NavLink>
          </nav>

          <div className="hidden items-center gap-1.5 rounded-full border border-accent/20 bg-accent/[0.07] px-3 py-1.5 text-[11px] font-medium text-accent-soft md:flex">
            <ShieldCheck size={13} />
            本地运行 · 不上传
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
        {children}
      </main>

      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-[11px] text-white/30 sm:flex-row sm:px-6">
          <p>姿态识别与画面处理全部在本机完成，不上传服务器</p>
          <p>训练记录仅存本机浏览器 · 清除缓存会丢失</p>
        </div>
      </footer>
    </div>
  );
}

export default Layout;