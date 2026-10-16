# 美术资产来源与方案

2026-10-16 使用内置 imagegen 生成。资源已复制到 assets/production/，
不依赖默认生成目录。仓库提供 coast.webp；WebP 仅编码转换，未放大或重绘。

## 无云底图

真实输出 1672×941 RGB。设计坐标 2560×1440 不代表原图尺寸。
最终 prompt：

> Create an original production background painting for Open Meadow / Coastal
> Breeze, a tranquil Japanese hand-painted animation landscape. Wide 16:9,
> target 2560x1440. Bright airy clean blue CLOUDLESS sky occupying top 55%,
> subtly textured gouache gradient pale cyan near horizon. Absolutely no clouds
> or birds; independent animated clouds will be composited later. Calm turquoise
> blue sea on left middle, horizon at y=58%. Coastal meadow and pale sand curving
> from bottom left to middle right; little white lighthouse with warm red roof
> on the distant RIGHT headland at x=82%, base at y=65%, top y=42%; a small red
> wooden rowboat with no lettering resting on sand at x=28%, y=80%. Rich painterly
> grasses and tiny ivory wildflowers frame bottom right, grounded organic shapes,
> subtle individual brush strokes, natural greens, cream and cool shadows. Keep
> central region visually quiet for translucent chat panel. Spacious cinematic
> composition, refined gouache on paper, delicate varied brushwork, warm clear
> noon light. Finished landscape clean plate, no UI, typography, watermark,
> borders. Avoid plastic 3D, geometric hills, excessive saturation. Do not copy
> an existing painting.

输出的地平线实际约 46.5%，灯塔顶约 32%；渲染器按实际构图定位，不照搬提示词坐标。

## 透明云

真实输出 2172×724 RGBA，Alpha 0–254。
生成 prompt：单一宽幅白色积云，日系手绘 gouache，冷青灰阴影、象牙白高光，
自然软边，完整入镜，四周透明留白，真实 RGBA，无天空/文字/棋盘背景。
追加编辑 prompt：保留内部构图，去掉青/紫彩边、孤立碎片与斑点，保留真实 Alpha。
黑底全尺寸检查仍能看到少量源图彩边，不能称为已完成精修的最终生产资产。

## 分层动画

不透明底图固定，灯塔和小船不重复叠加。三个云层以独立速率在画外循环。
预览三版：海面绘画纹理按水平细带产生局部位移，叠加向岸边推进的柔和碎浪；
两者统一受柔边海洋遮罩与礁石/小船保护区限制。前景三簇原画花草使用根部归零的
分段水平剪切与独立阵风相位，大岩石、沙滩、灯塔不参与变形；中远景草甸仍静止。
这是平面原画的局部近似，尚非逐株独立植物骨骼。
日光采用分区渐变、色温与亮度；没有全屏强橙色覆盖。

原 Art Kit 的小 sprite 保留为概念参考，不放大叠入成品运行场景。
下一轮美术应提供原生 2560×1440+ 底图、精修云边、精确对齐的中近景草层。
