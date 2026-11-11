import type { Config } from 'tailwindcss';



/**

 * Tailwind 主题：深墨绿 + 荧光青柠（v4）。

 *

 * 原则（对齐参考稿的气质）：

 * - 一套色两副面孔：深色只用在「主视觉块」——首页 Hero、训练视频框、完成度卡；

 *   其余全是纸白与白卡。深色块的面积被严格控制，所以整站仍然是干净的。

 * - 强调色只有一个：荧光青柠（#C9F26B）。它只出现在数字、状态点、进度条、

 *   选中态和深色块上的主按钮里，绝不铺满。

 * - 深色块靠「玻璃分层」而不是描边：bg-white/6 + border-white/10 + backdrop-blur。

 * - 圆角：卡片 20 / 面板 26 / 大块 32 / 胶囊 999。

 */

const config: Config = {

  content: ['./index.html', './src/**/*.{ts,tsx}'],

  theme: {

    extend: {

      colors: {

        /** 页面底色与「纸」层级 */

        paper: {

          DEFAULT: '#F1F3F1',

          soft: '#F7F8F6',

          pure: '#FFFFFF',

        },

        /** 文字：带一点墨绿的近黑，不用纯黑 */

        ink: {

          900: '#0E1A1B',

          800: '#16292B',

          700: '#2C4345',

          600: '#4A6365',

          500: '#6C8283',

          400: '#8FA2A2',

          300: '#B6C3C1',

          200: '#D8E0DC',

        },

        /** 深色承载面：Hero / 视频框 / 数据卡 */

        deep: {

          DEFAULT: '#0B1517',

          800: '#0E1C1E',

          700: '#122A2C',

          600: '#173638',

          500: '#1E4445',

          400: '#2A5556',

        },

        /** 唯一的强调色：荧光青柠 */

        lime: {

          DEFAULT: '#C9F26B',

          deep: '#A9D93F',

          soft: '#DCF7A0',

          tint: '#F2FBD9',

        },

        /** 视频框边缘的青绿辉光 */

        aqua: {

          DEFAULT: '#5FE3D8',

          deep: '#2FB9B0',

        },

        line: {

          DEFAULT: '#E1E6E2',

          soft: '#ECF0EB',

        },

        danger: '#C4574B',

        warn: '#B8862F',

        ok: '#4E9080',

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

        card: '20px',

        panel: '26px',

        block: '32px',

      },

      boxShadow: {

        /** 白卡：几乎只在边缘可见 */

        soft: '0 1px 2px rgba(14,26,27,.04), 0 10px 28px -20px rgba(14,26,27,.16)',

        /** 悬停抬升 */

        lift: '0 26px 54px -30px rgba(14,26,27,.32), 0 2px 6px rgba(14,26,27,.04)',

        /** 深色大块 */

        block: '0 44px 96px -56px rgba(6,18,20,.85), 0 8px 24px -18px rgba(6,18,20,.5)',

        /** 深色胶囊按钮 */

        pill: '0 14px 30px -16px rgba(11,21,23,.55)',

        /** 青柠按钮的柔光（克制） */

        glow: '0 16px 40px -20px rgba(201,242,107,.55)',

        /** 视频框的青绿内辉光 */

        frame: '0 0 0 1px rgba(95,227,216,.22), 0 0 60px -18px rgba(95,227,216,.35), 0 30px 70px -40px rgba(6,18,20,.9)',

      },

      backgroundImage: {

        /** Hero 场景：顶部光源 + 远处地平线 + 地面反光（不用照片，靠光位造氛围） */

        'hero-scene':

          'radial-gradient(58% 46% at 74% 8%, rgba(226,246,247,.26) 0%, rgba(226,246,247,0) 62%), radial-gradient(70% 52% at 12% 0%, rgba(38,84,84,.75) 0%, rgba(38,84,84,0) 68%), radial-gradient(120% 60% at 50% 100%, rgba(95,227,216,.10) 0%, rgba(11,21,23,0) 62%), linear-gradient(172deg, #0E2022 0%, #102A2C 34%, #0F3033 58%, #0C1E20 82%, #0A1315 100%)',

        /** 纸面：顶部一层极淡的暖光 */

        'paper-fade': 'linear-gradient(180deg, #FFFFFF 0%, #F5F6F4 100%)',

        /** 青柠按钮 */

        lime: 'linear-gradient(180deg, #D6F88A 0%, #C9F26B 52%, #B9E856 100%)',

      },

      keyframes: {

        'slide-up': {

          '0%': { opacity: '0', transform: 'translateY(8px)' },

          '100%': { opacity: '1', transform: 'translateY(0)' },

        },

        'fade-in': {

          '0%': { opacity: '0' },

          '100%': { opacity: '1' },

        },

        float: {

          '0%, 100%': { transform: 'translateY(0)' },

          '50%': { transform: 'translateY(-7px)' },

        },

        breathe: {

          '0%, 100%': { opacity: '1' },

          '50%': { opacity: '.45' },

        },

        scan: {

          '0%': { transform: 'translateY(-10%)', opacity: '0' },

          '40%': { opacity: '.9' },

          '100%': { transform: 'translateY(120%)', opacity: '0' },

        },

      },

      animation: {

        'slide-up': 'slide-up .3s cubic-bezier(.16,1,.3,1)',

        'fade-in': 'fade-in .45s ease-out',

        float: 'float 7s ease-in-out infinite',

        breathe: 'breathe 2.2s ease-in-out infinite',

        scan: 'scan 6s linear infinite',

      },

    },

  },

  plugins: [],

};



export default config;
