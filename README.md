# AI 健身教练 · 实时动作监测

打开摄像头即可实时识别 33 个身体关键点，在关节角度偏离标准时语音纠正；全部计算在浏览器内完成，画面不出本机。

- **在线体验**：https://65481932768624.github.io/ai-fitness-coach/
- 纯前端 MVP：Vite 5 + React 18 + TypeScript 5 + Tailwind 3
- 推理：`@mediapipe/tasks-vision`（PoseLandmarker，WASM），模型本地化在 `public/models/`
- 数据：训练记录只写 `localStorage`，无后端、无账号

## 本地开发

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck
npm run build
```

## 新增动作

动作知识全部在 `src/exercises/*.ts` 的 `ExerciseConfig` 里，引擎只读配置：

1. 新建 `src/exercises/<id>.ts`，照 `squat.ts` 写一个 `ExerciseConfig`
2. `src/types/exercise.ts` 的 `ExerciseId` 加上该 id
3. `src/exercises/index.ts` 注册表加一行
4. `npm run typecheck` 通过即可

> 阈值目前是经验初值，上线前需按机位与真实用户标定，详见 `AI健身教练-源代码与扩展指南.md`。

## 发布（GitHub Pages）

```bash
bash scripts/deploy-pages.sh
```

脚本会构建（base `/ai-fitness-coach/`）、生成 `404.html` 与 `.nojekyll`，并推送到 `gh-pages` 分支。

## 已知限制

- GitHub Pages 无法自定义响应头：缺少 `COOP/COEP`，MediaPipe 会退化为单线程
- 深链（如 `/training/squat`）返回 HTTP 404 状态，但会正确渲染页面
- 单人、单机位、2D 关键点：旋转类问题（膝内扣、躯干旋转）测不准