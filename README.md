# 于子俊的简历

静态 HTML 简历。全栈版和 Web 前端版共用内容与模板，网页、SEO 文件和 PDF 都自动生成到 `dist/`。不需要 SSR 服务或数据库。

## 编辑与预览

使用 Node.js 22.12+（可运行 `nvm use`），首次安装：

```sh
npm ci
npm run dev
```

- `src/content/profile.json`：姓名、联系方式、岗位标题、PDF 文件名、网站地址、SEO 摘要和真实内容更新日期。
- `src/content/experience.html`：项目、工作经历和技能正文，沿用 HTML 的强调和排版方式。
- `src/templates/document.ejs`：统一页面结构，日常改简历不用动它。
- `src/css/`：屏幕和打印样式。

修改以上文件后，开发页面自动刷新。访问 `/` 是全栈版，`/web-frontend.html` 是前端版。两个版本共用同一正文，职位只在模板指定位置变化，不做全文替换。

`updatedAt` 是内容的实际更新日期，请在更新经历时填写；不会把每次部署日期伪装成内容更新时间。经历、效果数字和公开身份由本人维护，本次迁移保留原有正文，没有新增工作经历或业绩。

## 自动生成网页与 PDF

另开一个终端运行：

```sh
npm run watch
```

保存源文件后自动构建网页、SEO 和两个岗位 PDF。连续保存会合并，PDF 按顺序生成；构建失败后再次保存会自动重试。只监听源码，不监听 `dist`，不会形成构建循环。`Ctrl+C` 会关闭监听和当前构建进程。**保存文件不会自动上传线上。**

开发预览的 PDF 下载按钮读取最近一次完整构建；如果源文件已改变或尚未构建，会提示先完成构建，避免下载旧版简历。

也可以手动执行：

```sh
npm run check           # 类型检查与逻辑测试
npm run build           # 网页 + SEO + PDF + 发布清单
npm run build:web       # 只生成网页与 SEO（不能用于正式发布）
npm run preview         # 预览 dist
npm run deploy:dry-run  # 校验内容、文件完整性及上传/刷新清单，不连接云端
```

Puppeteer 默认使用它下载的 Chrome，可在 macOS/Linux 使用。如果本机下载浏览器失败，可以使用现有 Chrome：

```sh
PUPPETEER_SKIP_DOWNLOAD=true npm ci
PUPPETEER_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run build
```

运行 watch 时也可以设置同一个 `PUPPETEER_EXECUTABLE_PATH`。CI 已安装中文字体。仅在需要禁用沙箱的 CI/容器环境设置 `PUPPETEER_NO_SANDBOX=true`。

产物包含：

- `index.html`、`web-frontend.html`、`404.html`、带哈希的样式资源；
- `robots.txt`、`sitemap.xml`、Person/ProfilePage JSON-LD、canonical、description 和 Open Graph；
- 两个中文岗位 PDF，以及保留旧下载地址的 `resume.pdf` 别名；
- `build-manifest.json`：构建时间、源码摘要及每个文件的内容校验值。

之前单独制作的英文 PDF 保留在 `output/pdf/`，属于历史手工附件，不会冒充由当前中文内容自动生成的英文版。之后如需自动维护英文版，应补充对应英文内容源和模板。

## 服务器自动发布（当前官网）

官网现由独立 Nginx 站点提供服务，`yuzijun.cn` 和 `www.yuzijun.cn` 共用简历产物，Finance 的 `x.yuzijun.cn` 不受影响。

服务器每 30 秒检查 `main` 更新，自动安装依赖、测试、构建网页与 PDF，校验后原子切换版本。构建失败保留旧页面并重试。部署目录、日志与回滚方法见 [服务器部署说明](docs/server-deploy.md)。

## OSS / CDN 发布（备用）

复制 `.env.example` 为 `.env`，填写当前部署环境的 Bucket、Region 和 RAM 凭据。不要提交 `.env`。脚本不打印密钥，仅上传 `dist` 清单内文件，不上传仓库源码、环境文件或历史附件。

```sh
npm run build
npm run deploy:dry-run
npm run deploy
npm run verify:live
```

部署会检查源码是否在构建后变化、每个文件是否被篡改、是否漏掉 PDF 或 SEO 文件。先上传资源和 PDF，再上传页面、站点地图和版本清单；任一失败会返回非零退出码。旧的带哈希资源暂不删除，避免访问者缓存的 HTML 引用失效。

`.env` 中 `CDN_DOMAINS` 填写实际加速域名，例如 `https://yuzijun.cn,https://www.yuzijun.cn`。配置后，上传完成会调用阿里云 CDN 文件刷新 API，覆盖首页、index 别名、SEO 与 PDF，再轮询比对线上文件内容；最长约 10 分钟，未更新就标记失败。RAM 需有指定 Bucket 的对象写入权限和指定域名的 `cdn:RefreshObjectCaches` 权限。

若没有设置 `CDN_DOMAINS`，只上传 OSS 并明确提示 CDN 未核验，不会宣称已完成线上部署。HTML、SEO、固定文件名 PDF 使用 5 分钟缓存，带哈希资源使用长期缓存；云端已有覆盖规则时以云端规则为准。

公开站点产物按对象设置 `public-read`；脚本不会更改整个 Bucket 权限。项目原先就是公开简历，上传前请确认填写的是正确 Bucket。

## GitHub 构建与备用 OSS 发布

`.github/workflows/resume.yml` 已提供：PR / main 推送 → 安装 → 检查 → 构建含 PDF → 发布预检 → 保存构建产物。

官网由服务器定时拉取 main 并发布。以下 OSS 配置仅供备用，且只在手动触发 workflow_dispatch 时上传，避免普通推送仍向旧 CDN 发布。在 GitHub 仓库 Settings → Secrets and variables → Actions 设置：

| 类型 | 名称 | 内容 |
| --- | --- | --- |
| Variables | `OSS_DEPLOY_ENABLED` | `true`，启用云端写入 |
| Variables | `OSS_REGION` | 实际 OSS 区域 |
| Variables | `OSS_BUCKET` | 当前站点 Bucket |
| Variables | `CDN_DOMAINS` | 实际加速域名，逗号分隔 |
| Secrets | `OSS_ACCESS_KEY_ID` | RAM AccessKey ID |
| Secrets | `OSS_ACCESS_KEY_SECRET` | RAM AccessKey Secret |

未配置时仍自动检查、构建并保存产物，OSS 发布步骤跳过。PR 永不发布，同分支任务串行执行。这里仅提供备用工作流，不能在未填写凭据时声称 OSS 发布已启用。

上线后还需要在阿里云侧一次性配置：HTTP / www / `/index.html` 到规范 URL 的重定向、404 文档及真实 404 状态、回源权限、TLS 和缓存规则。仓库文件不能代替这些控制台设置。新 robots / sitemap 是否能替代旧的 403，需要部署后通过线上校验确认。

搜索平台验证和站点地图提交需要站点所有权权限。SEO 文件生成成功不代表搜索引擎已经收录，也不保证豆包等联网 AI 一定引用。

## 项目结构

```text
src/content/       日常编辑内容
src/templates/     共用 EJS 模板
src/css/           现有页面与打印样式
public/            静态图标
scripts/lib/       内容渲染、PDF、清单、队列、CDN 逻辑
scripts/           构建、监听、上传和线上验证入口（统一 ESM）
tests/             内容、发布约束、监听并发、CDN 校验测试
.github/workflows/ 自动检查、构建和可选发布
output/pdf/        保留的历史英文 PDF
dist/              生成文件（不提交）
```

构建不会运行格式化或修改源码。需要格式化时手动运行 `npm run format`。原来的根目录 HTML/PDF、旧字体副本、三个 CommonJS 脚本和全文替换插件已经由上述结构取代。
