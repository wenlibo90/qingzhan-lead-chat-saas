# 轻客服 SaaS

客服挂件接住访客，线索 CRM 沉淀商机。一段 JS 接入网站，客服、访客行为、营销触达与线索跟进一体化。

- 访客挂件：右下角客服、实时聊天、主动触发、知识库、录屏、公告、广告拦截检测
- 客户管理后台：会话接待、访客 360 档案、线索 CRM、报表、自动化、知识库、站点/挂件配置、团队权限、套餐与工单
- 网站分析：流量概览、实时数据、来源、内容、受众、事件与 Web Vitals，支持环比、趋势和 CSV 导出
- 对外落地页：产品介绍、套餐价格、接入教程、案例、自助注册与团队演示申请
- 平台运营后台：注册账号、工作空间、试用/订阅、订单收入、申请线索、支持工单、风控、平台成员与操作审计
- 双线增长：个人站长自助注册 + 团队/企业销售申请，共用一套挂件与业务引擎
- 自助订阅：订单、月付/年付、模拟支付、支付回调验签、幂等开通、发票记录与到期降级
- 支付宝电脑网站支付：APPID/公私钥/网关配置后自动启用，下单跳转支付宝收银台，异步通知验签后开通套餐
- 增长闭环：PQL 自动识别高意向工作空间并进入销售线索池；客户可在后台提交支持工单
- 推广激励：专属邀请链接、注册归因、首单 20% 奖励、7 天结算、提现申请与运营审核
- 国际化：简体中文、繁体中文、英语、日语、韩语；覆盖落地页、注册、后台导航/登录、个人资料和访客挂件
- 数据隔离：所有业务表按 `tenant_id` 隔离，站点维度再按 `site_id` 隔离；平台运营数据独立于客户后台

## 两种客户路径

| 路径 | 适合对象 | 入口 | 开通方式 | 后续运营 |
| --- | --- | --- | --- | --- |
| 自助注册 | 个人站长、独立开发者、小项目 | 官网 / 登录页注册弹窗 | 手机号验证码 → 账号与工作空间 → 14 天专业版试用 | 后台添加网站、接入向导、自助订阅、帮助工单 |
| 销售开通 | 团队、企业、外贸独立站 | 落地页团队表单 | 申请进入平台线索池 → 销售跟进 → 转为工作空间 | 演示、报价、合同、客户成功 |

两条线共用同一套挂件、会话、访客分析、线索 CRM 和套餐权限，差异放在获客方式、开通流程和支持方式上。

## 快速启动

```bash
# 安装依赖
npm install

# 初始化演示数据（会清空并重建 data/app.db）
npm run seed

# 启动服务（默认 3000 端口）
npm start
```

访问：

- 产品官网：`http://localhost:3000`
- 管理后台：`http://localhost:3000/admin/`
- 自助注册：官网「免费注册」或 `/admin/` 登录页「免费注册」弹窗
- 平台运营后台：`http://localhost:3000/ops/`
- 推广计划：`http://localhost:3000/promote`
- 演示宿主站：`http://localhost:3000/demo/`
- 挂件脚本：`http://localhost:3000/qz.js?0f928e95b1adc3f89d3a1e0dab18c5bf`

## 演示账号

| 角色 | 登录名 | 密码 | 租户 |
| --- | --- | --- | --- |
| 管理员 | admin@demo.com | admin123 | 云图科技（专业版） |
| 运营 | ops@demo.com | ops123 | 云图科技 |
| 客服 | agent@demo.com | agent123 | 云图科技 |
| 客服 | agent2@demo.com | agent123 | 云图科技 |
| 管理员 | owner@demo.com | demo1234 | 星辰跨境（标准版） |
| 平台超级管理员 | ops@platform.com | ops123 | 平台运营后台（含工单、订单） |
| 平台销售 | sales@platform.com | sales123 | 平台运营后台 |
| 自助注册演示 | 13600000001 | demo1234 | 木棉设计工作室（试用中，含推广奖励演示） |

使用 `owner@demo.com` 可以验证租户隔离与标准版功能锁定；`/ops/` 账号独立于客户账号体系。

## 推广激励

- 每个账号有独立的 8 位推广码和 `/r/:code` 邀请短链。
- 新用户通过邀请链接注册后写入推荐关系；被邀请人首次付费按实付金额的 20% 生成奖励。
- 奖励在支付后 7 天转为可提现，最低提现 ¥100，由平台运营人工审核打款。
- 客户后台「推广中心」展示访问、注册、激活、付费、奖励和提现记录。
- 运营后台「推广奖励」处理提现审核、通过、拒绝和标记打款。
- 公开推广说明页：`/promote`。

## 国际化

支持简体中文、繁体中文、英语、日语、韩语五种界面语言。

- 落地页、注册页、后台登录与导航、个人资料、访客挂件均提供语言切换。
- 后台语言选择会保存到账号偏好，下次登录自动恢复。
- 访客挂件语言在「挂件配置 → 界面语言」中设置，静态 UI 文案随语言切换。
- 语言文件：`public/i18n.js`；挂件内置语言包在 `public/widget-core.js`。

## 平台运营后台

访问 `/ops/`，平台运营账号独立于客户账号体系，使用单独的 Token 域和 RBAC。

- 运营概览：注册账号、工作空间、试用、安装、激活漏斗、收入、申请和风险指标。
- 客户账号：手机号/邮箱检索、关联工作空间、风险分、停用与恢复。
- 工作空间：套餐、试用、订阅周期、成员、站点、安装状态与用量。
- 申请线索：落地页申请、手动录入、销售分配、跟进时间线、转工作空间。
- 订阅与试用：套餐分布、已收金额、订单记录、3 天内到期与最近订阅变化。
- 支持工单：客户工单列表、优先级、状态、回复与关闭。
- 风控审核：高风险账号、停用工作空间、同 IP 批量注册。
- 平台成员：superadmin / ops / sales / support / finance 角色管理。
- 操作日志：登录、账号、套餐、申请、订单、工单等平台级审计。

客户后台与平台运营后台的数据域隔离：客户只能看到自己的工作空间、订单和工单，看不到平台销售线索与其他客户数据；平台运营账号也不能直接使用客户接口。

## 账号与数据模型

- `accounts`：登录身份，支持手机号或邮箱。
- `users`：账号在工作空间内的成员关系，承载客户 RBAC。
- `tenants`：工作空间，承载套餐、试用、订阅周期与数据边界。
- `sites`：客户自己的网站，每个站点生成独立 32 位加载令牌 `loader_token`。
- `applications`：平台销售线索池，与客户自己的 `leads` 分离。
- `orders` / `payment_events`：自助订单、发票号、支付回调与幂等事件。
- `support_tickets` / `ticket_messages`：客户与平台运营的工单对话。
- `platform_users` / `platform_audit_logs`：平台运营身份与审计。

一个人可以加入多个工作空间，登录后通过账号菜单切换；平台运营数据不写入任何客户工作空间。

## 自助订阅与支付

- 套餐页选择月付或年付，服务端按 `plans.js` 计算订单金额，客户端传入的价格无效。
- 开发环境 `PAYMENT_PROVIDER=mock` 时可直接模拟支付；生产环境需接入支付渠道适配器。
- 支付宝回调地址：`POST /api/public/payments/alipay/notify`，同步返回：`GET /api/public/payments/alipay/return`。
- 支付宝使用官方 SDK 做 RSA2 验签，校验 APPID、金额、订单号，并以 `notify_id` 做幂等。
- 通用模拟回调地址：`POST /api/public/payments/webhook/:provider`，使用 `x-payment-signature` HMAC-SHA256 验签。
- 支付成功后立即更新套餐、订阅周期、发票号，并发送站内通知。
- 订阅到期先进入 7 天宽限期（`past_due`），仍未续费则降级免费版；取消续费在当前周期结束后降级。
- 已支付订单生成 `invoice_no` 和发票记录；PDF/税务对接属于后续能力。

## PQL 与支持工单

PQL 由生命周期任务每小时评估：工作空间已安装 JS、访客数不少于 50，且会话不少于 5 或线索不少于 2 时，自动生成 `applications.source='pql'` 的销售线索，按未关闭线索数分配给销售；30 天内不重复生成。

客户在「帮助与工单」提交问题，运营后台「支持工单」回复。客户追加回复会把状态改回 `open`，运营回复后进入 `pending`；双方可以标记解决或关闭。

## 接入方式

```html
<script async src="https://your-domain.com/qz.js?YOUR_LOADER_TOKEN"></script>
```

加载器约 4KB，异步执行；挂件、聊天内核、Socket.IO 客户端均在浏览器空闲或访客产生交互后按需加载。新增能力由后台开启，不需要客户再次修改代码。

后台生成的嵌入代码始终是完整的绝对地址，例如 `https://your-saas.com/qz.js?<32位随机令牌>`。URL 不出现 `widget`、`key` 等业务词，每个站点使用独立的 32 位十六进制令牌。部署在反向代理后会自动读取 `X-Forwarded-Proto`、`X-Forwarded-Host` 和 `X-Forwarded-Prefix`；也可以通过 `PUBLIC_BASE` 固定对外地址。公开 API 已开启跨域访问，客户网站可以直接从其他域名加载挂件。

加载器只允许在页面中以脚本方式加载：直接打开 `qz.js` 或 `qz-core.js` 会返回 404，脚本文件除首行版权头外不包含注释。该限制基于 `Sec-Fetch-Dest` 与 `Referer`，属于基础防盗用措施，不能替代服务端鉴权。

## 技术栈

| 层 | 方案 |
| --- | --- |
| 服务端 | Node.js 22 + Express 4 + Socket.IO 4 |
| 数据库 | Node 内置 `node:sqlite`（WAL），零外部服务 |
| 上传 | Multer，文件落盘到 `uploads/`，白名单扩展名校验 |
| 认证 | scrypt 密码哈希 + HMAC-SHA256 签名 Token；账号与工作空间成员分离，平台运营独立认证域 |
| 前端 | 原生 ES5/ES2017 + Apollo UI（玻璃拟态），无构建步骤 |
| 实时 | WebSocket，房间模型 `tenant:*` / `conv:*` / `agent:*` |
| 测试 | Node 脚本冒烟测试（143 项）+ Playwright 浏览器测试（42 项） |

## 目录结构

```
server/
  index.js            服务入口、路由挂载、静态资源、Socket.IO
  db.js               SQLite 连接与查询封装
  schema.sql          完整数据表结构
  seed.js             演示数据
  auth.js             密码、Token、RBAC、套餐特性门禁
  socket.js           访客/客服实时协议
  upload.js           文件上传
  routes/             public / payments / auth / signup / onboarding / ops / support /
                      conversations / visitors / leads / analytics / reports / config / settings / external / landing
  services/           geo / scoring / presence / analytics / ratify / notify / ai / provision / lifecycle /
                      billing / pql
  test/               smoke.js / ui.js
public/
  index.html          产品落地页
  admin/              客户管理后台 SPA（hash 路由，多页面脚本）
  ops/                平台运营后台 SPA（账号、工作空间、申请、订阅、订单、工单、推广、风控）
  widget.js           旧版加载器入口（保留兼容）
  qz.js               新加载器（服务端按令牌注入站点，禁止直接访问）
  widget-core.js      挂件内核（通过 /qz-core.js 提供）
  demo/               演示宿主站点
  privacy.html        隐私说明
  terms.html          服务条款
  assets/             Apollo UI 与落地页样式
data/                 SQLite 数据库（运行时生成）
uploads/              上传文件（运行时生成）
docs/ARCHITECTURE.md  架构、数据库与接口规划
```

## 套餐与权限

| 能力 | 免费版 | 标准版 | 专业版 | 企业版 |
| --- | --- | --- | --- | --- |
| 基础聊天 / 离线留言 | 是 | 是 | 是 | 是 |
| 主动触发 / 自定义表单 / 来源统计 / 关键词回复 | - | 是 | 是 | 是 |
| 转化漏斗 / 意向打分 / 线索 CRM / 区域热力 / 绩效 / 自动化 / 录屏 / 导出 | - | - | 是 | 是 |
| AI 机器人 / 翻译 / 白标 / 自定义域名 / 开放 API / SLA | - | - | - | 是 |

- 前端菜单置灰并提示升级套餐
- 后端每个敏感接口都做 `featureGate`，绕过 UI 也无法越权
- 角色权限：管理员全部；运营可配置与看报表；客服仅接待、访客基础档案与线索跟进
- 平台运营角色：superadmin / ops / sales / support / finance，与客户 RBAC 完全隔离
- 自助注册只创建账号与工作空间，客户登录后在站点管理添加自己的网站
- 自助注册默认开通 14 天专业版试用，试用到期自动降级免费版并保留数据
- 自助订阅支持月付/年付，订单金额由服务端计算；开发环境可模拟支付，生产环境使用验签回调开通
- 付费订阅到期进入 7 天宽限期，未续费自动降级免费版；取消续费会在当前周期结束后降级
- 支持工单由客户后台提交，运营后台回复，客户收到站内通知
- PQL 自动识别高意向工作空间，进入平台销售线索池

## 测试

```bash
# 需先启动服务
npm start

# API + 实时通讯冒烟测试（143 项）
npm test

# 浏览器端到端测试（42 项，需要 Playwright Chromium）
npx playwright install chromium
npm run test:ui
```

测试默认访问 `http://localhost:3000`，可通过 `BASE_URL` 覆盖。UI 测试截图输出到 `/tmp/shots/`。

## 环境变量

| 变量 | 说明 | 默认 |
| --- | --- | --- |
| `PORT` | 服务端口 | `3000` |
| `HOST` | 监听地址 | `0.0.0.0` |
| `APP_SECRET` | Token 签名密钥，生产必须修改 | 开发默认值 |
| `DB_FILE` | SQLite 文件路径 | `data/app.db` |
| `PUBLIC_BASE` | 对外访问基址（含协议和可选路径前缀），用于生成绝对嵌入代码；留空时按请求 Host / `X-Forwarded-*` 自动生成 | 请求 Host |
| `GEO_API` | IP 归属地接口模板，`{ip}` 占位；配置后优先使用，失败回退离线库 | 不启用 |
| `GEO_FAMILIES` | ip2region 加载的地址族，逗号分隔，可选 `4`、`6` | `4,6` |
| `GEO_DEBUG` | 设为 `1` 时输出 ip2region 加载失败日志 | 关闭 |
| `SMS_WEBHOOK` | 注册短信发送 Webhook，POST `{phone, code, scene}` | 未配置时开发环境返回演示验证码 |
| `SIGNUP_DEV_CODE` | 设为 `false` 时生产环境不返回验证码 | 开发环境返回 |
| `PAYMENT_PROVIDER` | 支付渠道标识，开发默认 `mock` | `mock` |
| `ALIPAY_APP_ID` | 支付宝应用 APPID | 未配置 |
| `ALIPAY_PRIVATE_KEY` | 支付宝应用私钥，PKCS8/PKCS1 单行内容 | 未配置 |
| `ALIPAY_PRIVATE_KEY_FILE` | 支付宝应用私钥 PEM 文件路径，和上一项二选一 | 未配置 |
| `ALIPAY_PUBLIC_KEY` | 支付宝公钥，用于异步通知验签 | 未配置 |
| `ALIPAY_GATEWAY` | 支付宝网关 | `https://openapi.alipay.com/gateway.do` |
| `ALIPAY_NOTIFY_URL` | 支付宝异步通知地址 | 未配置 |
| `ALIPAY_RETURN_URL` | 支付完成同步返回地址 | 未配置 |
| `PAYMENT_WEBHOOK_SECRET` | 支付回调 HMAC 验签密钥，生产必须配置 | 回退 `APP_SECRET` |
| `ALLOW_PLAN_SWITCH` | 生产环境设为 `1` 才开放演示套餐切换接口 | 仅开发环境 |

## 生产化说明

当前实现是可直接运行的完整业务闭环，以下能力采用轻量实现，生产环境建议替换为外部服务：

- IP 归属地：内置 ip2region 离线库，支持 IPv4/IPv6 国家省市与运营商；可通过 `GEO_API` 覆盖为高德/腾讯等第三方接口
- AI 应答与摘要：基于知识库相似度与规则模板，可替换为大模型调用
- 多语言翻译：内置短语词典，可替换为翻译 API
- 自定义域名：已完成配置与白标展示，生产环境需在网关/DNS 侧绑定证书与路由
- 告警通知：钉钉/企业微信 Webhook 已接通，发送失败会静默降级为站内通知
- 注册短信：开发环境直接返回演示验证码；生产环境必须配置 `SMS_WEBHOOK` 并设置 `SIGNUP_DEV_CODE=false`
- 自助支付：订单、订阅与回调链路已完成，开发环境使用模拟支付；生产环境需接入微信/支付宝适配器并配置 `PAYMENT_WEBHOOK_SECRET`
- 发票：已支付订单生成发票号与记录，PDF/税务对接属于后续能力
- 订阅续费：当前采用手动续费，自动扣款需要保存支付协议并接入渠道的签约/代扣能力
- 推广奖励：当前由运营人工审核提现并线下打款，自动分账需要接入支付渠道的转账能力
- 国际化：当前覆盖核心界面与挂件静态文案；客户业务数据、知识库内容和后台深层页面内容保持原文
- 平台运营：建议使用独立子域名、MFA 和 IP 白名单限制 `/ops/` 访问

安全的默认实践：租户隔离、参数校验、上传白名单、消息频率限制、敏感词拦截、黑名单、审计日志与追踪总开关。

## 文档

详细架构、数据表与接口清单见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。
