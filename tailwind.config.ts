import type { Config } from 'tailwindcss';

/**
 * Tailwind 主题：深色运动风（v2 设计令牌）。
 *
 * 原则：
 * - 背景用「墨蓝」而不是纯黑，避免 OLED 上的涂抹感与生硬对比；
 * - 主色沿用能量绿（品牌连续性），但降低饱和度、提高明度，暗底上更贵；
 * - 所有表面用半透明白叠加出层次，不用纯灰描边；
 * - 圆角、阴影、动效统一收口，组件只引用令牌，不散写魔法数。
 */
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: {
          950: '#05080B',
          900: '#090F14',
          800: '#0F171E',
          700: '#17222C',
          600: '#22303C',
          500: '#2F3F4D',
        },
        accent: {
          DEFAULT: '#34D399',
          soft: '#6EE7B7',
          deep: '#10B981',
          lime: '#BEF264',
        },
        danger: '#F87171',
        warn: '#FBBF24',
        info: '#7DD3FC',
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'PingFang SC',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          'sans-serif',
        ],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(52,211,153,.22), 0 12px 48px -12px rgba(52,211,153,.35)',
        card:
          'inset 0 1px 0 rgba(255,255,255,.04), 0 24px 48px -32px rgba(0,0,0,.95)',
        lift: '0 24px 60px -28px rgba(0,0,0,1)',
      },
      backgroundImage: {
        'hero-glow':
          'radial-gradient(60% 90% at 18% 0%, rgba(52,211,153,.16), transparent 62%), radial-gradient(50% 80% at 96% 8%, rgba(125,211,252,.10), transparent 60%)',
        'grid-fade':
          'linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px)',
      },
      keyframes: {
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '12%': { opacity: '1' },
          '88%': { opacity: '1' },
          '100%': { transform: 'translateY(1400%)', opacity: '0' },
        },
      },
      animation: {
        'pulse-soft': 'pulse-soft 1.6s ease-in-out infinite',
        'slide-up': 'slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fade-in 0.4s ease-out',
        float: 'float 6s ease-in-out infinite',
        scan: 'scan 4.5s cubic-bezier(0.4, 0, 0.2, 1) infinite',
      },
    },
  },
  plugins: [],
};

export default config;