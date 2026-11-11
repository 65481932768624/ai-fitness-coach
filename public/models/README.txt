# 模型文件放置目录

将 MediaPipe BlazePose Lite 模型放在此目录，文件名必须是：

```
pose_landmarker_lite.task
```

下载命令（项目根目录执行）：

```bash
curl -L -o public/models/pose_landmarker_lite.task \
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task"
```

若此文件缺失，应用会自动回退从 MediaPipe 官方 CDN 加载（需联网）。
