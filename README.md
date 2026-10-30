# 轻站线索客服 SaaS

一段 JS 嵌入，客服 + 访客行为埋点 + 营销触达 + 轻线索 CRM 一体化。

- 访客挂件：右下角客服、实时聊天、主动触发、知识库、录屏、公告、合规、广告拦截检测
- 管理后台：会话接待、访客 360 档案、线索 CRM、报表、自动化、知识库、站点/挂件配置、RBAC、套餐
- 对外落地页：产品介绍、套餐价格、接入教程、案例、试用申请
- 数据隔离：所有业务表按 `tenant_id` 隔离，站点维度再按 `site_id` 隔离

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
- 演示宿主站：`http://localhost:3000/demo/`
- 挂件脚本：`http://localhost:3000/widget.js?key=qz_demo_8f3k2m`

## 演示账号

| 角色 | 邮箱 | 密码 | 租户 |
| --- | --- | --- | --- |
| 管理员 | admin@demo.com | admin123 | 云图科技（专业版） |
| 运营 | ops@demo.com | ops123 | 云图科技 |
| 客服 | agent@demo.com | agent123 | 云图科技 |
| 客服 | agent2@demo.com | agent123 | 云图科技 |
| 管理员 | owner@demo.com | demo1234 | 星辰跨境（标准版） |

用第二组账号可以验证租户隔离与标准版功能锁定。

## 接入方式

```html
<script async src="https://your-domain.com/widget.js?key=YOUR_SITE_KEY"></script>
```

加载器约 4KB，异步执行；挂件、聊天内核、Socket.IO 客户端均在浏览器空闲或访客产生交互后按需加载。新增能力由后台开启，不需要客户再次修改代码。

## 技术栈

| 层 | 方案 |
| --- | --- |
| 服务端 | Node.js 22 + Express 4 + Socket.IO 4 |
| 数据库 | Node 内置 `node:sqlite`（WAL），零外部服务 |
| 上传 | Multer，文件落盘到 `uploads/`，白名单扩展名校验 |
| 认证 | scrypt 密码哈希 + HMAC-SHA256 签名 Token |
| 前端 | 原生 ES5/ES2017 + Apollo UI（玻璃拟态），无构建步骤 |
| 实时 | WebSocket，房间模型 `tenant:*` / `conv:*` / `agent:*` |
| 测试 | Node 脚本冒烟测试（77 项）+ Playwright 浏览器测试（28 项） |

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
  routes/             public / auth / conversations / visitors / leads /
                      reports / config / settings / external / landing
  services/           geo / scoring / presence / ratify / notify / ai
  test/               smoke.js / ui.js
public/
  index.html          产品落地页
  admin/              管理后台 SPA（hash 路由，多页面脚本）
  widget.js           轻量加载器
  widget-core.js      挂件内核（Shadow DOM）
  demo/               演示宿主站点
  privacy.html        隐私说明
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

## 测试

```bash
# 需先启动服务
npm start

# API + 实时通讯冒烟测试（77 项）
npm test

# 浏览器端到端测试（需要 Playwright Chromium）
npx playwright install chromium
npm run test:ui
```

UI 测试截图输出到 `/tmp/shots/`。

## 环境变量

| 变量 | 说明 | 默认 |
| --- | --- | --- |
| `PORT` | 服务端口 | `3000` |
| `HOST` | 监听地址 | `0.0.0.0` |
| `APP_SECRET` | Token 签名密钥，生产必须修改 | 开发默认值 |
| `DB_FILE` | SQLite 文件路径 | `data/app.db` |
| `PUBLIC_BASE` | 对外访问域名，用于生成嵌入代码 | 请求 Host |
| `GEO_API` | IP 归属地接口模板，`{ip}` 占位 | 本地确定性映射 |

## 生产化说明

当前实现是可直接运行的完整业务闭环，以下能力采用轻量实现，生产环境建议替换为外部服务：

- IP 归属地：本地确定性映射，可通过 `GEO_API` 接入高德/腾讯位置服务
- AI 应答与摘要：基于知识库相似度与规则模板，可替换为大模型调用
- 多语言翻译：内置短语词典，可替换为翻译 API
- 自定义域名：已完成配置与白标展示，生产环境需在网关/DNS 侧绑定证书与路由
- 告警通知：钉钉/企业微信 Webhook 已接通，发送失败会静默降级为站内通知

安全的默认实践：租户隔离、参数校验、上传白名单、消息频率限制、敏感词拦截、黑名单、审计日志、追踪总开关与访客拒绝追踪。

## 文档

详细架构、数据表与接口清单见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。
