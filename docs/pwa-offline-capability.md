# PWA 离线能力说明

本说明用于 MVP 和内部测试阶段的 PWA 验收。当前目标是低成本跑通完整业务链路，不提前做高成本生产化部署。

## 可离线使用

| 功能 | 离线表现 | 数据来源 |
|---|---|---|
| 打开 App Shell | 已安装或访问过后可打开基础页面 | Service Worker 缓存的 HTML、manifest、图标和运行时静态资源 |
| 查看本机历史报告 | 可查看已经保存在本机的分析报告 | `localStorage` 本机报告快照 |
| 查看分析历史和产品档案 | 可查看已保存在本机的产品档案元数据和缩略图 | `localStorage` 元数据 + IndexedDB 图片 |
| 查看收藏和个人成分档案 | 可查看本机收藏、过敏原、关注成分和忌口项 | `localStorage` 本机数据 |
| 成分搜索和详情 | 已访问或接口成功缓存过的食品成分 API 可离线兜底；本地草稿数据仍可作为前端降级 | Service Worker 运行时缓存 + 本地种子数据 |

## 需要联网

| 功能 | 原因 | 离线表现 |
|---|---|---|
| OCR 识别 | 真实 OCR API 需要服务端或供应商网络调用 | 不缓存 OCR 请求；无网络时继续使用手动输入/确认路径 |
| 登录和注册 | 账号鉴权必须访问后端 | 显示网络失败或本地降级，不创建假登录态 |
| 云同步 | 收藏、历史、报告、产品档案同步需要后端 API | 本机数据继续可用，云端同步等待网络恢复 |
| 新数据获取 | 未缓存过的后端成分 API 需要网络 | 返回本地草稿数据或 API 错误提示 |
| 支付、订阅、商店能力 | 当前阶段后置且依赖平台服务 | 不在 MVP 离线范围内 |

## Service Worker 策略

| 资源类型 | 策略 | 说明 |
|---|---|---|
| App Shell | Install Precache + Stale-While-Revalidate | 安装时缓存 HTML、manifest、图标，并解析 `index.html` 预热 Vite 产物里的 JS/CSS；运行时先返回已缓存 shell，后台刷新时先缓存新 HTML 引用的 Vite JS/CSS，成功后再替换 HTML |
| 静态资源 | Stale-While-Revalidate | JS/CSS/manifest/font 访问后进入运行时缓存 |
| 成分 API `/api/ingredients` | Network First | 优先网络，失败时返回同 URL 缓存 |
| 登录态 API `/api/auth/*`、`/api/user/*` | Network Only | 不写入 Cache Storage，避免共享设备串读账号数据；失败时返回离线 JSON |
| 图片和图标 | Cache First + Shell Cache 回退 | 本地图标优先从图片缓存读取，首次离线时可回退到安装阶段预缓存的 App Shell 图标；已访问图片进入图片缓存 |
| OCR API `/api/ocr` | Network Only | OCR 结果不缓存，避免保存敏感图片识别结果 |

## App 内提示

- 当 `navigator.onLine === false` 时，全局顶部显示“当前离线，部分功能不可用”。
- 设置页展示离线与安装摘要，说明哪些能力可离线使用、哪些仍需联网。
- Android Chrome 第 3 次打开后，如浏览器触发 `beforeinstallprompt`，底部显示“添加到主屏幕”提示。
- iOS Safari 第 3 次打开后，提示用户通过分享菜单添加到主屏幕。

## 当前未完成的人工验收

- Lighthouse PWA 分数需要在浏览器中手动运行，目标不低于 80。
- iPhone Safari 添加到主屏幕后需真机确认：状态栏、底部安全区、输入框不自动缩放。
- Android 长按图标显示 shortcuts 需要真机或模拟器确认。
- 弱网/离线切换需要在浏览器 DevTools 或真机网络条件下验收。
