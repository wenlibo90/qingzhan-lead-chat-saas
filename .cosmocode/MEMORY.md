# 用户指令记忆

本文件记录用户的指令、偏好和项目知识，用于未来交互参考。

## 条目

[构建与运行]
- Date: 2026-10-30
- Context: 轻站线索客服 SaaS 开发完成后的环境与验证方式
- Instructions:
  - 安装依赖：`npm install`
  - 初始化/重置演示数据：`npm run seed`（会清空并重建 `data/app.db`）
  - 启动服务：`npm start`，单端口 3000，同时提供落地页 `/`、后台 `/admin/`、演示站 `/demo/`、挂件 `/widget.js`
  - 后端冒烟测试：`npm test`，必须先启动服务
  - 浏览器测试：`npm run test:ui`，依赖 Playwright Chromium，截图输出到 `/tmp/shots/`

[项目知识：环境配置]
- Date: 2026-10-30
- Context: Agent 在配置浏览器端到端测试时发现
- Category: 环境配置
- Instructions:
  - 本环境 Playwright 官方下载源不可用，需加 `PLAYWRIGHT_DOWNLOAD_HOST=https://cdn.npmmirror.com/binaries/playwright`
  - Chromium 系统依赖通过 `DEBIAN_FRONTEND=noninteractive npx playwright install-deps chromium` 安装

[项目知识：数据与架构]
- Date: 2026-10-30
- Context: Agent 在设计数据库与部署方式时确定
- Category: 构建方法
- Instructions:
  - 数据库使用 Node 22 内置 `node:sqlite`，不依赖外部数据库服务
  - 运行期数据在 `data/`，上传文件在 `uploads/`，两者已加入 `.gitignore`
  - 在线预览必须使用端口根路径，单端口同时承载前端、API 与 WebSocket
  - 所有租户数据通过 `tenant_id` 隔离，站点数据再加 `site_id`，接口不得信任客户端传入的租户
