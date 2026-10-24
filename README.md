# GrowLog

GrowLog 是一个面向单个家庭的儿童健康成长记录系统。它帮助家长持续记录儿童档案、身高体重、睡眠、饮食、奶量与饮水、运动、户外活动和情绪观察，并通过移动端 Dashboard 与历史时间线查看已提交数据的变化。

GrowLog 的定位是家庭记录工具，不提供疾病诊断、成人身高预测或未经权威数据验证的医学结论。

## 功能

- 单管理员登录，无公开注册入口
- 儿童档案创建、查看和编辑
- 身高、体重、头围记录与历史趋势
- 夜间睡眠、午睡、清醒时长和 7/30 日汇总
- 餐次、食物、奶量、饮水及未知数量记录
- 运动类型、强度、时长和独立户外时长
- 情绪、标签、场景及互动观察
- 面向手机的今日 Dashboard 和快速录入入口
- 所有健康记录的编辑、软删除与恢复
- 仅显示字段名称的审计历史
- JSON 和分领域 CSV 数据导出
- 按孩子上传、查看和替换每日保教单与每周菜单图片
- PWA 安装、离线提示和安全缓存策略
- PostgreSQL 持久化、数据库感知健康检查
- Docker Compose、Caddy 自动 HTTPS、备份与恢复

MVP 的 M0–M14 已全部实现并通过验收。详细状态见 [TASKS.md](TASKS.md) 和 [PROGRESS.md](PROGRESS.md)。

## 技术栈

- Next.js 15 App Router、React 19、TypeScript 5
- PostgreSQL 16、Prisma 6
- Zod 请求参数校验
- Argon2id 管理员密码验证
- Vitest、Testing Library、真实 PostgreSQL 集成测试
- Docker、Docker Compose、Caddy

```mermaid
flowchart LR
    B[浏览器 / PWA] --> C[Caddy HTTPS]
    C --> N[Next.js 应用]
    N --> A[认证与领域模块]
    A --> P[Prisma]
    P --> D[(PostgreSQL)]
    N --> E[JSON / CSV 导出]
    N --> U[(上传图片卷)]
```

## 使用 Docker 快速启动

### 1. 准备环境

需要 Docker Engine、Docker Compose v2 和可用的 BuildKit。生产部署建议准备一个已经指向服务器的域名，并开放 TCP 80 和 443。

```sh
git clone https://github.com/jianminbai/GrowLog.git
cd GrowLog
docker build -t growlog-app:local .
```

### 2. 生成管理员密码哈希

下面的命令从终端读取密码，不会把明文写入命令历史：

```sh
read -rsp '管理员密码: ' GROWLOG_ADMIN_PASSWORD
echo
printf '%s' "$GROWLOG_ADMIN_PASSWORD" | docker run --rm -i growlog-app:local \
  node --input-type=module -e 'import { hash } from "@node-rs/argon2"; const chunks=[]; for await (const chunk of process.stdin) chunks.push(chunk); console.log(await hash(Buffer.concat(chunks).toString("utf8")))'
unset GROWLOG_ADMIN_PASSWORD
```

保存命令输出的完整 Argon2id 哈希。

### 3. 配置环境变量

```sh
cp .env.production.example .env.production
chmod 600 .env.production
```

编辑 `.env.production`：

```dotenv
POSTGRES_DB=growlog
POSTGRES_USER=growlog
POSTGRES_PASSWORD=替换为长随机密码
DATABASE_URL=postgresql://growlog:相同的长随机密码@postgres:5432/growlog

ADMIN_EMAIL=parent@example.com
ADMIN_PASSWORD_HASH='替换为上一步生成的完整Argon2id哈希'

HOUSEHOLD_ID=family-home
HOUSEHOLD_NAME=My family
HOUSEHOLD_TIME_ZONE=Asia/Shanghai
UPLOAD_DIR=/data/uploads

SITE_ADDRESS=growlog.example.com
HTTP_PORT=80
HTTPS_PORT=443
```

可以使用 `openssl rand -hex 32` 生成 URL 安全的数据库密码。`ADMIN_PASSWORD_HASH` 必须保留单引号，否则 Compose 会解析哈希中的 `$` 字符。

本机试用时可设置：

```dotenv
SITE_ADDRESS=:80
HTTP_PORT=8080
HTTPS_PORT=8443
```

### 4. 启动并验证

```sh
docker compose --env-file .env.production up -d --no-build
docker compose --env-file .env.production ps
```

生产环境验证：

```sh
curl --fail https://growlog.example.com/api/health
```

本机验证：

```sh
curl --fail http://localhost:8080/api/health
```

健康响应应包含应用和数据库状态：

```json
{"data":{"status":"ok","database":"ok"}}
```

首次启动会自动应用已提交的 Prisma 迁移，并根据环境变量创建或更新家庭记录。Caddy 在域名解析正确且 80/443 端口可访问时自动申请和续期 HTTPS 证书。

## VPS 部署要点

1. 将 `.env.production` 保存在版本库之外并设置为仅部署用户可读。
2. 让域名 A/AAAA 记录指向 VPS。
3. 只向公网开放 SSH、80 和 443；应用端口和 PostgreSQL 不需要开放。
4. 在仓库目录运行 `docker compose --env-file /安全路径/growlog.env up -d --build`。
5. 检查 `docker compose ps`、应用日志和 `/api/health`。
6. 定期生成备份，并把备份与校验文件复制到服务器之外。

完整部署、组织 CA 和恢复步骤见 [部署与恢复文档](docs/DEPLOYMENT.md)。

## 备份与恢复

协调备份脚本会短暂停止应用写入，并生成同一备份 ID 下的 PostgreSQL custom-format 文件、上传图片 tar、manifest 和 SHA-256 校验文件。使用仓库外环境文件时，先将变量载入当前 shell：

```sh
set -a
. /安全路径/growlog.env
set +a

BACKUP_DIR=/安全备份路径 ./scripts/backup-all.sh
sha256sum -c /安全备份路径/growlog-YYYYMMDDTHHMMSSZ.dump.sha256
sha256sum -c /安全备份路径/growlog-YYYYMMDDTHHMMSSZ-uploads.tar.sha256
```

恢复时应先使用独立数据库名验证：

```sh
./scripts/restore.sh \
  /安全备份路径/growlog-YYYYMMDDTHHMMSSZ.dump \
  growlog_restore_verify
./scripts/restore-uploads.sh \
  /安全备份路径/growlog-YYYYMMDDTHHMMSSZ.manifest
```

上传恢复默认写入独立的 `growlog_uploads_restore_verify` 卷。数据库与图片必须使用同一 manifest 配对验证；只恢复其中一部分会造成图片记录与文件不一致。脚本默认拒绝覆盖主数据库和主上传卷，恢复主环境需要明确设置 `ALLOW_RESTORE_OVER_PRIMARY=true` 并再次备份。

## 本地开发

本地工具链需要 Node.js 24 和 npm。测试数据库通过独立 Compose 文件运行在端口 55432：

```sh
npm ci
docker compose -f docker-compose.test.yml up -d
npm run db:test:prepare
```

常用命令：

```sh
npm run dev          # 开发服务器
npm run lint         # ESLint，禁止警告
npm run typecheck    # TypeScript 类型检查
npm test             # 单元测试；未配置 DATABASE_URL 时数据库用例会跳过
npm run build        # Next.js 生产构建
npm run smoke:mvp    # 针对已运行部署的端到端 HTTP 验收
```

运行包含 PostgreSQL 集成用例的完整测试：

```sh
DATABASE_URL=postgresql://growlog_test:growlog_test@localhost:55432/growlog_test \
  npm test
```

端到端验收需要提供已运行环境和管理员凭据：

```sh
SMOKE_BASE_URL=https://growlog.example.com \
SMOKE_ADMIN_EMAIL=parent@example.com \
SMOKE_ADMIN_PASSWORD='管理员明文密码' \
  npm run smoke:mvp
```

不要把实际密码、哈希、数据库连接串或导出的儿童数据提交到版本库。

## 安全边界

- 会话 Cookie 使用 `Secure`、`HttpOnly` 和 `SameSite=Lax`。
- 数据库只保存会话与 CSRF 凭据的摘要。
- 写操作同时验证会话绑定的 CSRF token 和请求来源。
- API 和数据访问始终按已认证家庭隔离。
- API 响应标记为 private/no-store；Service Worker 不缓存 API 或已认证页面。
- 删除采用软删除并写入审计事件；普通界面不执行永久删除。
- GrowLog 是家庭记录工具，不替代医生或专业医疗建议。

依赖审计、适用性分析和后续升级计划见 [MVP 安全审查](docs/SECURITY_REVIEW.md)。当前已记录的依赖告警需要 Prisma 7 和 Next.js 16 大版本迁移，已列入 P1 维护任务。

## 项目文档

- [工程与协作规范](AGENTS.md)
- [MVP 任务与路线图](TASKS.md)
- [开发进度与验证记录](PROGRESS.md)
- [架构决策记录](DECISIONS.md)
- [部署与恢复](docs/DEPLOYMENT.md)
- [安全审查](docs/SECURITY_REVIEW.md)

## License

GrowLog 使用 [Apache License 2.0](LICENSE)。
