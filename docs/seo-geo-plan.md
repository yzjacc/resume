# 简历站 SEO / GEO 技术方案

日期：2026-09-19。范围：`yzjacc/resume`，本地提交 `999d250`。本次只读检查仓库、DNS、服务器配置和线上 HTTP 响应；仅新增本方案，未修改或发布网站。

## 建议

保留静态托管，先完善当前 HTML 的 SEO 和发布流程；如果要长期拓展搜索入口，再升级为 Astro 静态生成的个人网站。暂不引入请求时 SSR 服务。

目标分两层：第一层是搜索姓名、GitHub 用户名、职位时能准确找到本人；第二层是搜索相关技术问题时，能够找到本人有证据支持的项目案例和文章，并有机会被联网 AI 引用。第二层需要内容建设，单页简历换渲染框架无法解决。

## 已核实的现状

| 检查项 | 证据与结论 |
| --- | --- |
| 页面渲染 | `src/index.html` 包含完整正文；`src/main.ts` 只有样式导入。不是依赖 JS 拉取正文的 SPA。 |
| 构建 | `vite.config.ts` 使用 Vite + singlefile，把资源内联并生成根目录的 `index.html` 和 `web-frontend.html`。已有静态预生成能力。 |
| 远端服务器 | SSH 检查现有 ECS 的宝塔 Nginx 配置，只找到 `x.yuzijun.cn`，其 root 是 finance 的前端产物目录；没有找到简历主域站点配置。不能把记账站 Nginx 当作简历站入口修改。 |
| DNS | `yuzijun.cn` 和 `www.yuzijun.cn` 分别指向 `*.w.kunlunaq.com` CDN CNAME。 |
| CDN / 源站 | 公网响应含 `Server: Tengine`、CDN Via / X-Cache、`x-oss-cdn-auth: success`、OSS 对象响应头；结合上传脚本，可确认阿里云 CDN → OSS 静态资源链路。具体 CDN 控制台配置及当前源站 Bucket 仍需控制台/API 核实。 |
| 首页 | 从 ECS 发起 GET 返回 200，38,988 字节，标题为“简历 \| 于子俊 - Zijun Yu”；含 h1 和正文；未见 description、canonical、JSON-LD。Last-Modified 为 2026-06-13。 |
| 本地与线上 | 本地 index 标题包含“全栈开发工程师”，线上标题没有；确认产物不一致，但不能仅凭这个断定是哪次部署未执行。 |
| 抓取入口 | GET `/robots.txt`、`/sitemap.xml`、`/web-frontend.html` 均为 403，XML 错误码 AccessDenied。尚不能区分对象不存在且无列表权限、对象 ACL 或其他源站权限问题。 |
| 重复 URL | HTTP 首页、HTTPS 首页、www 首页、`/index.html` 均直接返回 200，没有统一重定向。两个 HTTPS 主机首页及 `/index.html` 正文 SHA-256 一致。 |
| 缓存 | 裸域样本出现 `Cache-Control: max-age=1`；www 样本 Age 约 15 天且缓存时间更长。需要检查两个加速域名的规则和刷新策略，不能把单次响应直接当作全部配置。 |
| 错误页 | 一个随机不存在路径返回 403，应核实对象存储错误响应，给真正不存在的公开网页返回 404。不要把所有 403 都盲目改成 404。 |
| 可达性 | 本机访问裸域多次超时，www 成功；ECS 访问裸域成功。只能证明测点差异，不能声称网站全网不可用，也不能声称全球访问正常。 |

首页正文校验值：`a700fe9bf57e9f6422e710d8e236918d30ae236f5d786c21fb4934780e489480`。

`robots.txt` 返回 403 不等于 Google 被全面禁止抓取。Google 对 robots 的 4xx（429 除外）按没有有效规则处理；仍建议发布明确、可访问的规则文件。[Google robots 状态码说明](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec)

## 渲染原理与选型

| 方式 | HTML 何时生成 | 爬虫首次响应能否拿到正文 | 对本项目的取舍 |
| --- | --- | --- | --- |
| CSR | 浏览器运行 JS 后 | 可能只有壳 | 不适合把简历正文改成此方式。 |
| 手写静态 HTML / SSG | 编写或构建时 | 能 | 当前已经具备；适合低频更新的简历、案例和文章。 |
| SSR | 每次请求到服务端时 | 能 | 适合必须实时生成的页面；本项目目前没有这类需求，新增运行时、运维和缓存复杂度没有必要。 |

搜索发现 → 抓取 HTML → 理解和选择规范 URL → 建立索引 → 按问题检索和排序。联网 AI 通常还会在检索结果上选择资料、组织答案、给出来源，各产品具体实现不同。能抓到正文只是起点，既不保证收录，也不保证排名或 AI 引用。SSR 与 SSG 都能提供完整 HTML，不存在“必须 SSR 才能 SEO”的前提。[Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)

推荐未来内容站采用 Astro 的静态输出：模板和 Markdown 在构建时产出页面，继续上传 OSS/CDN，无需 Node 常驻服务。只有未来出现真正动态需求时再考虑服务端渲染。[Astro 渲染说明](https://docs.astro.build/en/guides/on-demand-rendering/)

## 第一阶段：直接改现有项目

1. **页面基础信息**：增加 `lang="zh-CN"`、准确的 title、description、canonical；使用一个清晰的 h1，按经历、项目、能力组织标题；补充 Open Graph 分享信息。OG 用于分享展示，不把它当成排名保证。
2. **人物身份**：首页添加 `ProfilePage` / `Person` JSON-LD，使用稳定 `@id`，写入姓名、英文名、公开介绍、主页和确属本人的 GitHub `sameAs`。仅标记页面可见、已确认的事实；不要添加不存在的奖项、雇佣关系或评价。[Google ProfilePage 文档](https://developers.google.com/search/docs/appearance/structured-data/profile-page)
3. **统一 URL**：建议沿用 `https://yuzijun.cn/` 为主地址；HTTP、www、`/index.html` 一跳 301/308 到主地址，保留合法路径与参数并防止循环。先解决裸域测点可达性再正式统一。当前前端版仅标题替换，与主版高度重复：继续供投递使用时指向主版 canonical，不用重复版本制造搜索页面。
4. **抓取文件**：在正式域根路径部署 `robots.txt`（text/plain）和 `sitemap.xml`（XML，UTF-8），都返回 200。站点地图只收录实际发布、可索引的规范页面；`lastmod` 跟随真实内容修改。
5. **发布完整性**：当前上传脚本只上传 `index.html` 与 `resume.pdf`，但 PDF 脚本生成两个岗位命名 PDF；前端版和新生成 PDF 没有被这个脚本覆盖。改为构建清单驱动的完整发布，校验页面内 PDF 链接全部可用；HTML 的 build、PDF、deploy 分成独立步骤。
6. **缓存与错误状态**：HTML、robots、sitemap 使用短缓存并在发布后刷新；带内容哈希的 CSS/图片长缓存。清理双主机规则差异；真实缺失页面返回 404，服务器错误保留真实 5xx，不把所有路径回退首页 200。
7. **发布回滚**：固定依赖和构建环境，输出到独立 dist；先上传被引用资源，再上传 HTML 和 sitemap，刷新 CDN，验证主机/别名响应及哈希。保留上一版文件清单/对象版本，支持恢复后刷新缓存。现有构建会格式化源码、产物写回仓库根目录、PDF 依赖 macOS Chrome，需拆分后才适合直接搬进 CI。
8. **上传脚本治理**：删除输出 OSS AccessKey ID/Secret 的日志；凭据从受控环境/CI Secrets 读取。这里发现的是代码存在输出凭据的行为，没有读取或确认任何实际密钥泄漏。

部署结构继续保持：源码 → 构建完整 HTML / 资源 / PDF → OSS → CDN → 用户和爬虫。CDN 的回源、URL 重定向、缓存和 WAF 需要在阿里云侧配置；已有 ECS 的 finance Nginx 无需承接简历。

## 第二阶段：从一页简历扩展为可检索的内容站

推荐结构（路径为拟定设计，不代表已经上线）：

```text
/                          人物主页与核心履历
/projects/                 项目目录
/projects/schema-table/    SchemaTable 案例：问题、方案、本人职责、结果、证据
/projects/performance/     性能优化案例：环境、指标口径、测量与限制
/writing/                  技术文章目录
/writing/<slug>/           真实工程经验与公开示例
/en/                       独立维护的英文页面；有完整译文后再发布
/downloads/                PDF 文件
/robots.txt
/sitemap.xml
```

页面用普通 `<a href>` 互链；保留现有首页、PDF 旧链接兼容，迁移路径做永久重定向。中英版本各自 canonical，用双向 hreflang 关联；不能用中文正文套英文标题伪装多语言页面。

内容共用一份事实数据（例如 `src/data/profile.ts`）和 Markdown 案例；网页、结构化数据和 PDF 由同源内容派生，避免岗位版、英文版长期漂移。适合先做 2–3 个信息完整的案例，而不是批量生成几十个相似关键词页面。

README 当前写着“正文为生成的模板，不具备真实性”，与个人简历定位存在歧义。正式推广前需要确认哪些经历、数字和对外身份是真实且可公开的，再同步修正文案；不能把模板声明或未经确认的效果数字当作已核实事实。项目结果应注明测量范围、时间、基线和本人贡献，链接到可公开 Demo、代码或文章。

## GEO：提升被联网 AI 检索、正确识别和引用的机会

- 人名、英文名、GitHub 用户名和站点身份保持一致；正文有简明介绍，案例有完整上下文与可信证据。自然地回答访问者的问题，不堆叠“推荐我”的指令。
- Google 的生成式搜索继续依托搜索索引和质量系统。`llms.txt` 并非 Google 收录或 AI 展示的必要文件，不能替代 HTML、索引和内容；不作为第一阶段投入重点。[Google AI 搜索指导](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
- 对 ChatGPT 搜索，核查 robots / CDN / WAF 对 `OAI-SearchBot` 和官方公布 IP 的访问规则。搜索访问与 `GPTBot` 训练用途可分别控制，不需要为了搜索曝光默认开放训练权限。[OpenAI 爬虫说明](https://developers.openai.com/api/docs/bots)
- 豆包：本次未找到可核实的“提交即收录/引用”站长规则，不将开发者社区用户文章视为豆包官方承诺，不把 Bytespider 被放行等同于豆包会引用。首先保证公开页面可稳定访问，再用开启联网的豆包测试固定问题并记录实际来源；有明确官方提交入口时再单独验证接入。
- 在本人真实运营的 GitHub、技术社区或文章作者页补全官网链接和一致介绍，建立可验证的关联。不要购买虚假背书或复制同一内容铺设大量站点。
- 无需给简历站自己添加聊天窗口，也无需为了这个目标搭建向量数据库/MCP。目标是外部 AI 的联网检索能找到这个网站，不是建设站内聊天产品。

## 发布、提交与验收

**工程验收可在发布当天证明：**

- 不执行 JS 的 HTTP GET 能拿到姓名、简介、经历和项目正文；重要链接为可抓取的 href。
- 每个公开页面状态码、Content-Type、title、description、canonical 正确，没有意外 noindex；结构化数据与可见内容一致。
- robots、sitemap 返回 200，地图内 URL 都是规范地址、可访问、实际存在的内容；不可访问路径返回真实错误状态。
- HTTP、www、index 别名最终归一；当前页面、旧 PDF 下载地址可用。
- 国内与海外多个测点检查 DNS、TLS、首屏和无验证码访问；本地伪造 User-Agent 成功不能代替真实爬虫日志。
- CDN 页面版本、对象版本和 Git 构建版本一致；保留回滚证据。

**收录与曝光属于上线后的观测：**

1. 验证 Google Search Console、Bing Webmaster Tools 和百度搜索资源平台的站点所有权；通过当前可用的入口提交 sitemap / URL，不能把“已提交”写成“已收录”。
2. 对 Bing 可用 IndexNow 通知已修改/新增 URL，它是发现更新的信号，不是排名保证。[Bing 官方指南](https://www.bing.com/webmasters/help/bing-webmaster-guidelines-30fba23a)
3. 保留基线并按周观察：已索引规范页面数、姓名与技术主题查询展示/点击、抓取错误、文章入口、真实联系转化。
4. 固定一组“于子俊是谁”“yzjacc 的项目经历”“SchemaTable 的实践案例”等查询，分别在豆包/ChatGPT 的联网模式记录日期、问题、是否提及本人、引用 URL、答案准确性。明确区分“提供 URL 后能读取”和“不给 URL 能自行检索到”。
5. Bing AI Performance 可观察其支持的 Copilot 和合作场景引用情况，不能代表豆包或所有 AI 平台。[Bing AI Performance](https://www.bing.com/webmasters/help/ai-performance-9f8e7d6c)

技术改造提高可抓取性、身份清晰度和内容质量；实际收录、排名和引用由外部系统决定，没有可承诺的固定增长倍数或生效日期。

## 实施顺序与剩余信息

先完成现有页面和发布链路修复，再进行 Astro 内容站迁移，随后持续发布经本人确认的案例。第一阶段不依赖迁移框架，两阶段都保持静态托管。

实施前还需确认：阿里云中两个加速域名的回源 Bucket、对象权限/回源鉴权、缓存规则、错误页与重定向能力；真实公开履历及案例；各搜索平台的站点验证权限。这些是实施所需信息，不影响本方案的架构判断。本次没有这些控制台的读取凭据，未声称已核实它们的具体配置。
