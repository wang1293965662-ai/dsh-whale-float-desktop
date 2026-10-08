# dsh-whale-float-desktop · 小鲸鱼浮窗（电脑版）

> 同一只小鲸鱼，**为电脑浏览器适配**：鼠标拖拽、悬停手感、抓手光标；后端便携，不依赖安卓专属路径。

| 与手机版的差别 | 说明 |
|---|---|
| 输入 | 鼠标拖拽（mousedown/move/up）+ 悬停高亮 + `cursor:grab/grabbing`；触屏那套原样保留，**一套代码两边跑** |
| 后端 | 自带便携 `server/pet-lite.mjs`（8902：余额 + 立绘，图挂了用内置 SVG 兜底）+ `server/用量服务.mjs`（8903）；DSH_HOME 由 host 半边注入 |
| 立绘 | 随包 `server/pet-art.png`（1280×1280 透明 PNG） |
| 自动拉起 | `lib/index.js` 在引擎启动 4 秒后把两个后端拉起来（失败不影响界面） |

## 装（电脑上的 DSH）

```sh
node install.mjs            # 从自身位置推出 dshhome，只写那一个 profile
```

或手动：把本包放进 `<dshhome>/profiles/node_modules/`，并在 `profiles/web/package.json` 的 `dsh.profile.bundles` 加上 `dsh-whale-float-desktop`；重启引擎 + 刷新页面。

> 端口 8902 / 8903 是本地回环；若被占用，改 `server/pet-lite.mjs` 的 `PET_PORT`。

## 许可
MIT
