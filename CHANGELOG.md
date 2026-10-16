# 更新记录

## 1.0.0-preview.3 — 2026-10-16

- 修复“只有云在动”：海水绘画纹理局部流动，浪花向岸边推进。
- 改为原画中三簇前景花草的分段弯曲，根部归零，扩大可见摆动范围。
- 风力同步控制花草摆幅与速度、海面波动、浪花和云的速度，并在设置中解释。
- 海水与花草使用局部遮罩；保护船、灯塔、海中礁石和前景大岩石。
- 静态模式和减少动态效果直接显示未变形底图；日光滤镜同步作用于动态水草纹理。
- 新增独立水域、花丛、草丛的运动验证，以及三档风力的确定性连续画面比较。

## 1.0.0-preview.2 — 2026-10-16

- 移除浮动叶片入口，将完整控件嵌入原生“设置 → 通用设置”。
- 所有主题选项、说明、提示与辅助标签改为中文。
- 将不透明度改为直观的背景可见度，默认 70%，范围 10%～95%。
- 去掉整窗模糊，输入框、代码、设置与菜单保持高可读性底色。
- 迁移旧默认配置并保留明确的自定义设置；窗口可见时保持轻柔动态。
- 适度提高云层漂移速度，使微动更易观察；保留隐藏页面和减少动态效果暂停。
- 新增设置插槽生命周期、迁移、中文与画面清晰度验收。

## 1.0.0-preview.1 — 2026-10-16

- Add published Cordis Host/Client delivery for official DSH 0.2.0-rc.2.
- Add local coastal clean plate, transparent clouds, gentle ripples, rooted
  foreground grass blades and spatial daylight treatment.
- Add reversible native theme Token layer and scoped shell CSS.
- Add compact settings, keyboard interaction, persistence and reset.
- Add Eco / Balanced / High, frame/pixel budgets, hidden/blur pause,
  static reduced motion, disposal and known-background conflict detection.
- Add tests, asset inspection, packaging and validation evidence.

Preview milestone; final V1.0 art and desktop acceptance are tracked in STATUS.md.
