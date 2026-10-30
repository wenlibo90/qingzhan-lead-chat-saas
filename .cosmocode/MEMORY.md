# 用户指令记忆

本文件记录用户的指令、偏好和项目知识，用于未来交互参考。

## 条目

[构建与运行]
- Date: 2026-10-30
- Context: 轻站线索客服 SaaS 开发完成后的环境与验证方式
- Instructions:
  - 安装依赖：`npm install`
  - 初始化/重置演示数据：`npm run seed`（会清空并重建 `data/app.db`）
  - 启动服务：`npm start`，单端口 3000，同时提供落地页 `/`、注册页 `/signup/`、客户后台 `/admin/`、平台运营后台 `/ops/`、演示站 `/demo/`、体验站 `/sandbox/:key`、挂件 `/widget.js`
  - 后端冒烟测试：`npm test`（122 项），必须先启动服务
  - 浏览器测试：`npm run test:ui`（41 项），依赖 Playwright Chromium，截图输出到 `/tmp/shots/`

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
  - 账号与工作空间分离：`accounts` 是登录身份，`users` 是账号在工作空间内的成员关系；平台运营账号在 `platform_users`，使用独立 `realm=ops` Token
  - 平台销售线索在 `applications`，与客户自己的 `leads` 分开
  - 体验站 `sites.is_sandbox=1` 不占套餐站点额度，也不触发正式安装检测
  - 平台运营后台演示账号：`ops@platform.com / ops123`（超级管理员）、`sales@platform.com / sales123`（销售）；平台账号只在 `/ops/` 登录，客户账号在 `/admin/` 登录
  - 自助注册只创建账号与工作空间，不自动建站、不生成体验站；客户登录后在站点管理添加自己的网站
  - 隐私提示/访客拒绝追踪功能暂时移除，默认关闭；等产品稳定后再接入
  - 管理后台深色模式在 `public/admin/styles.css` 末尾的 `.au-dark` 覆盖块维护
  - 挂件嵌入代码必须生成绝对地址：后台通过 `publicBase(req)` 读取 `PUBLIC_BASE` 或 `X-Forwarded-Proto/Host/Prefix`；优先采用浏览器 `Referer/Origin` 的 HTTPS 协议，避免混合内容
  - 新嵌入格式为 `/qz.js?<32位loader_token>`，不再出现 `key`；加载器从自身 `script.src` 推导 `base`，核心从 `/qz-core.js` 加载
  - `/qz.js`、`/qz-core.js`、旧 `/widget.js` 仅允许脚本上下文（Sec-Fetch-Dest=script 或无该头时 Referer），直接打开返回 404
  - `/api/public/*` 必须保留跨域头与 OPTIONS 处理，否则客户网站无法加载挂件配置和上报
  - 注册短信：开发环境返回 `dev_code`；生产必须配置 `SMS_WEBHOOK` 并设置 `SIGNUP_DEV_CODE=false`
  - 自助订阅：订单金额由 `server/services/billing.js` 服务端计算；开发环境 `PAYMENT_PROVIDER=mock` 可直接模拟支付；生产回调必须配置 `PAYMENT_WEBHOOK_SECRET` 并验签
  - 支付回调入口：`POST /api/public/payments/webhook/:provider`，使用 `x-payment-signature` HMAC-SHA256，`event_id` 幂等
  - 支持工单：客户 `/api/support/tickets`，运营 `/api/ops/tickets`，回复后发站内通知
  - 推广激励：每个账号有 8 位 `referral_code`，短链 `/r/:code`，首单支付按 20% 生成奖励，7 天后可提现，最低 ¥100，运营人工审核
  - 推广奖励在 `services/referral.js`，支付成功由 `billing.applyPaidOrder` 触发；提现审核在运营后台「推广奖励」
  - 国际化：`public/i18n.js` 提供简中/繁中/英/日/韩；后台语言写入 `accounts.locale`，挂件语言由 `widget.locale` 控制
  - 新增/修改语言文案时同时更新 `public/i18n.js` 和 `public/widget-core.js` 语言包
  - PQL 由 `services/lifecycle.js` 每小时调用 `services/pql.js`，默认条件为已安装 JS、访客≥50 且会话≥5或线索≥2
