# AI 作文批改小程序

基于微信小程序原生框架 + 云开发 + 腾讯云 OCR + 智譜 GLM-4.7 大模型，拍照上传手写作文，30 秒获取专业批改报告。

## 快速开始

```bash
# 1. 微信开发者工具导入项目
# 2. 修改 project.config.json 中的 appid 为你的 AppID
# 3. 修改 miniprogram/app.js 中的 env 为你的云环境 ID
# 4. 配置 cloudfunctions/aiProxy/config.json 中的环境变量（API 密钥）
# 5. 逐个右键 cloudfunctions/ → 上传并部署（云端安装依赖）
# 6. 云开发控制台新建数据库集合：users, essays, reports, feedbacks
# 7. 编译运行
```

## 功能

- **拍照 / 相册 / 手动输入**三种方式提交作文
- **OCR 手写体识别**：腾讯云作文专用 OCR，三级降级链保障识别成功率
- **AI 四维评分**：语言表达、结构逻辑、内容立意、卷面规范，智譜大模型批改
- **逐句批注**：错别字、语法、冗余、结构、文采五种类型标记
- **批改报告**：环形评分图 + 分项进度条 + 逐句批注 + 提升建议 + AI 评语
- **历史记录**：分页加载 + 下拉刷新 + 骨架屏加载态
- **进步追踪**：Canvas 折线图展示评分趋势，统计最高/最低/平均分
- **范文库**：6 篇优质范文，支持按年级和文体筛选，含 AI 赏析
- **意见反馈**：用户直接填写反馈内容，存入云数据库

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| 前端 | 微信小程序原生框架 | WXML + WXSS + JS，无第三方 UI 库 |
| 后端 | 微信云开发 | 云函数 (Node.js) + 云数据库 (MongoDB) + 云存储 |
| OCR | 腾讯云 HandwritingEssayOCR | 中英文手写作文识别，免费 1000 次/用户 |
| AI 批改 | 智譜 GLM-4.7-Flash | OpenAI 兼容 API，免费模型 |

## 架构

```
小程序客户端
  │
  ├─ wx.cloud.uploadFile() → 云存储 (作文图片)
  │
  ├─ wx.cloud.callFunction('login')       → 用户注册/登录
  ├─ wx.cloud.callFunction('aiProxy')     → OCR 识别 + AI 批改 + 存库
  └─ wx.cloud.callFunction('getHistory')  → 历史记录查询
```

**aiProxy 云函数内部结构：**

```
aiProxy/
├── index.js      # 主入口，三种 mode: ocr / correct / unified
├── ocr.js        # OCR 模块（三级降级链）
├── correct.js    # 批改模块（调用智譜 API）
├── prompt.js     # Prompt 模板
├── parser.js     # JSON 解析 + 校验 + 容错
├── env.js        # 服务端配置（API 密钥，优先读环境变量）
├── config.json   # 云函数超时 + 环境变量声明
└── package.json  # 依赖：wx-server-sdk + tencentcloud-sdk-nodejs
```

**OCR 三级降级链：**

```
1. HandwritingEssayOCR  ← 腾讯云作文专用 OCR（首选）
   ├─ 成功 → 返回文本
   └─ 失败 ↓
2. GeneralHandwritingOCR ← 腾讯云通用手写 OCR（降级1）
   ├─ 成功 → 返回文本
   └─ 失败 ↓
3. 智譜 glm-4.6v-flash   ← 视觉模型 OCR（兜底）
   └─ 最终降级
```

**AI 批改超时保护链：**

```
云函数超时: 60s (config.json)
  └─ HTTP 超时: 58s (index.js httpPostJSON)
       └─ 每步耗时日志: console.log('[⏱] xxx ms')
```

## 完整开发历程

### 第一阶段：项目启动与架构设计（Day 1-2）

**背景**：目标是做一个面向 K12 学生和家长的作文批改工具。用户拍照上传手写作文，AI 自动识别文字并生成结构化批改报告。

**技术选型决策**：
- 选择微信小程序原生框架而非 uni-app/Taro，因为不需要跨端，原生包体积最小
- 选择微信云开发而非自建后端，因为免运维且免费额度够用
- 选择智譜 GLM-4.7-Flash 而非混元大模型，因为智譜的 OpenAI 兼容 API 更标准，从云函数调用更方便

**初期文件结构**：按照 PRD 的设计建立了项目骨架：`app.js` 初始化云环境，`app.json` 注册页面路由，`app.wxss` 定义金色主题的 CSS 变量系统。

**设计系统选择**：主色调定为金色 `#D4A853`，配合暖白背景 `#FFFDF5`，营造温暖专业的感觉。这个配色贯穿了整个项目。

### 第二阶段：核心功能开发（Day 3-5）

**首页（index）**：设计了三大入口——拍照上传、相册选择、手动输入。拍照和相册使用微信的 `wx.chooseImage` API。按钮设计经历了多次迭代，从最初的 emoji 图标到纯文字标题到彩色圆点装饰。

**手动输入页（manual）**：包含作文标题输入、年级选择器、文体标签、内容文本框，带字数统计。这个页面后期也添加了调试日志功能。

**批改中页面（correcting）**：这是变化最大的页面。最初设计是"上传图片 → OCR 识别 → 用户确认文字 → 提交批改"的四步流程，后来为了减少云函数冷启动次数，改为"上传 → OCR + 批改一气呵成"的两步流程，但遇到了 60 秒超时问题后又改回了分步流程。最终版本是"上传 → OCR（显示文字 → 用户确认 → 提交批改"的三步流程。

**报告页（report）**：核心结果展示页面。包含环形评分图（Canvas 2D 绘制）、分项得分进度条、逐句批注列表、AI 评语、提升建议、精彩语句。这个页面的 UI 经过了多次重构。

**历史记录（history）**：分页加载，支持下拉刷新和上拉加载更多。使用骨架屏作为加载态。后期添加了错误重试功能。

**我的页面（me）**：用户信息展示、使用统计、菜单入口。菜单包括进步追踪、范文库、意见反馈、隐私政策、关于我们。后期添加了头像和昵称的微信授权功能。

### 第三阶段：OCR 方案探索与落地（Day 6-7）

**最初的 OCR 方案（失败）**：最初使用智譜的视觉模型 `glm-4.6v-flash` 做 OCR。方法是将图片转 base64，用 `"你是一个OCR文字识别工具，请识别图片中的文字"` 作为系统提示词，让视觉模型看图识字。这个方案失败的原因是视觉模型不是专用 OCR 引擎，会漏字、产生幻觉，对手写体的识别率极低。

**调研过程**：搜索了腾讯云 OCR、百度 OCR、微信内置 OCR 三种方案。对比结果：
- 微信内置 OCR：仅支持印刷体，手写体不行
- 百度手写 OCR：宣称 90%+ 准确率，但需要额外注册百度云账户
- 腾讯云 OCR：提供手写作文专用接口 HandwritingEssayOCR，免费 1000 次/用户，且与微信同一生态

**最终方案**：选用腾讯云 OCR，设计三级降级链保障可用性。第一级是作文专用 OCR（HandwritingEssayOCR），第二级是通用手写 OCR（GeneralHandwritingOCR），第三级是智譜视觉模型作为兜底。

**实际表现**：在实践中，HandwritingEssayOCR 对手写作文的识别率波动较大，有时返回 0 字符。降级到 GeneralHandwritingOCR 后识别稳定，准确率在 80-90%。

**集成方式**：通过 `tencentcloud-sdk-nodejs` 在云函数中调用 OCR API。API 密钥最初硬编码在代码中，后来改为通过 `env.js` 读取（优先环境变量，兜底硬编码），提交 GitHub 前又替换为占位符。

### 第四阶段：AI 批改引擎开发（Day 8-10）

**Prompt 工程**：编写结构化 System Prompt 约束大模型输出 JSON 格式的批改报告。Prompt 要求模型作为"资深语文教师"进行批改，从四个维度评分：语言表达(25分)、结构逻辑(25分)、内容立意(30分)、卷面规范(20分)。输出包含综合评分（overall_score）、等级（level）、分项得分（dimensions）、逐句批注（corrections）、总体建议（overall_advice）、鼓励语（encouragement）、精彩语句（good_sentences）。

**Prompt 迭代**：
- v1：要求输出完整 JSON，包含 strength/weakness/comment 三个字段
- v2：去掉 strength/weakness，只保留简短的 comment，减少输出 token
- v3：corrections 从无限量改为最多 5 条，overall_advice 从数组改为单字符串

**JSON 解析容错**：AI 有时在 JSON 前后加 markdown 代码块标记、或者输出不完整的 JSON。parser.js 实现了多层容错：先尝试匹配 markdown 代码块，再尝试从文本中提取 `{...}` 结构，最后对缺失字段填充默认值。

### 第五阶段：腾讯云作文批改 Agent（曾尝试，后放弃）

**发现**：在查阅腾讯云 OCR 文档时，发现了一个"作文批改 Agent"接口（SubmitMarkEssayAgentJob / DescribeMarkEssayAgentJob）。它声称基于千亿参数多模态大模型，端到端实现作文图片的纠错和批注。输入是作文图片，输出是带图片坐标定位的逐句批注。

**为何放弃**：
1. 异步接口，需要先提交任务再轮询查询结果，不适合实时场景
2. 不返回评分（overall_score），只返回纠错内容。打分还需要再调智譜，导致图片模式走了两次 AI 调用
3. 轮询循环设置为 20 次 × 3 秒 = 60 秒，刚好等于云函数超时上限，没有留时间给降级路径
4. 2 次/分钟的并发限制在生产环境不够用

**教训**：看到名字匹配的 API 不要急着集成，先看清楚它的实际能力边界。这个 Agent 本质是"批注工具"而非"评分工具"。

### 第六阶段：性能优化——超时攻坚战（反复调优）

这是项目中最耗时的问题。完整链路是：图片上传 → 云存储 → OCR 识别 → AI 批改 → 数据库写入 → 用量更新。其中 AI 批改是最慢的步骤。

**第一轮：合并调用导致 60 秒超时**
- 现象：将 OCR 和 AI 批改合并为一次云函数调用后，总耗时超过 60 秒超时上限
- 原因：OCR 约 12 秒 + AI 批改约 40 秒 = 52 秒，加上数据库操作和网络延迟，接近 60 秒上限
- 解决：拆回两次独立调用，各自有 60 秒预算

**第二轮：AI 推理模式消耗所有 token**
- 现象：AI 返回"响应长度为 0"，日志显示 `finish_reason: length`
- 原因：GLM-4.7-Flash 是推理模型，会先生成"思考过程"（reasoning_content），再生成正式输出。3000 tokens 全被思考过程耗尽
- 解决：添加 `thinking: { type: 'disabled' }` 关闭推理模式

**第三轮：HTTP 超时设置不够**
- 现象：55 秒 HTTP 超时刚好卡在 AI 生成的关键节点
- 解决：将 HTTP 超时提升到 58 秒，同时将 max_tokens 从 4000 降至 3000

**第四轮：精简 Prompt 输出**
- 现象：复杂作文（多错别字）导致 AI 生成大量纠正内容，token 超限
- 解决：去掉 strength/weakness 字段，corrections 限 5 条，overall_advice 改为单字符串。输出 token 量减半，响应时间从 55 秒降到 35 秒

**最终超时配置**：
```
云函数超时:       60s  (config.json timeout)
HTTP 请求超时:    58s  (https.request timeout)
总超时保护:       50s  (Promise.race wrapper，已移除)
OCR API 超时:     15s  (SDK httpProfile.reqTimeout)
```

**添加全链路监控**：在云函数的每一个步骤添加了 `console.log('[⏱] 步骤名: X ms')` 格式的耗时日志，前端调试面板也展示这些耗时数据。这样每次批改都能看到精确的瓶颈所在。

### 第七阶段：UI/UX 全面重构

**设计审计**：调用 ui-ux-pro-max 技能进行设计系统分析，搜索了 2025-2026 年的 UI 设计趋势。最终确定方向为"自然质朴 + 编辑式排版"（Nature Distilled + Editorial Grid），保持温暖的金色主题。

**全页面 emoji 清除**：对所有页面进行了审计，发现 18 处 emoji 被用作图标。全部替换为纯文字标签或 CSS 装饰（彩色圆点、边框线条、箭头等）。ui-ux-pro-max 的设计规范明确指出 emoji 会降低专业感。

**报告页重构**：经历了三次大的重构：
1. v1：原始版本，Canvas 手绘分享图，文字拥挤
2. v2：Editorial 风格，更大留白和字号层级，去掉分享图改用 wxml-to-canvas
3. v3：回退 wxml-to-canvas，简化为纯报告展示页

**分项得分改进**：dimension-bars 组件原来只显示一条 comment，当 AI 给满分但评论却说有问题时就显得矛盾。改为分开显示 strength（绿色左边框）和 weakness（琥珀色左边框），用户可以清楚看到每个维度的优缺点。

**score-ring 环形评分改进**：从 CSS 伪圆环改为 Canvas 2D 绘制，线宽从 10px 减到 6px，增加了 fadeIn 入场动画，数字更大（72rpx），等级文字更小更精致。

**骨架屏**：index、report、history 三个页面都添加了骨架屏加载态，替代了原来的空白加载。

### 第八阶段：生产就绪改造

**隐私合规**：微信 2023 年起要求小程序必须配置隐私保护指引。步骤是：
1. app.json 添加 `__usePrivacyCheck__: true`
2. 小程序后台（mp.weixin.qq.com）配置用户隐私保护指引
3. 新建隐私政策页面（pages/privacy/privacy）

**注意**：在后台配置隐私协议之前，不能打开 `__usePrivacyCheck__`，否则相机和相册会被拦截，出现"打开失败"的情况。开发阶段保持关闭，提审前配置好后台再打开。

**用户授权**：微信 2023 年废弃了 wx.getUserProfile，改为要求使用 `<button open-type="chooseAvatar">` 获取头像和 `<input type="nickname">` 获取昵称。头像和昵称存储在 wx.Storage 中持久化。

**图片压缩**：上传前调用 `wx.compressImage({ quality: 80 })` 压缩图片，减少上传时间和云存储成本。原图可能 3-8MB，压缩后约 300-600KB，对 OCR 识别率几乎无影响。

**全局错误处理**：app.js 中添加了 `onError`、`onUnhandledRejection`、`wx.onNetworkStatusChange` 三个全局处理。

**分享**：所有主要页面添加了 `onShareAppMessage`，支持分享到微信聊天和朋友圈。

**安全加固**：
- 关闭 `uploadWithSourceMap` 防止代码被反编译
- API 密钥从客户端代码中完全移除
- 提交 GitHub 前替换所有密钥、AppID、邮箱为占位符

### 第九阶段：审核与提交

**提审准备**：
1. 上传前端代码（微信开发者工具 → 上传）
2. 部署所有云函数（aiProxy、login、getHistory）
3. 创建数据库集合（feedbacks）
4. 配置小程序后台：隐私指引、基本信息、类目选择

**被拒原因**：个人主体不能做 AI 类小程序。微信认为 AI 批改涉及"深度合成技术"，个人主体尚未开放此类目。

**解决方案**：注册个体工商户（营业执照）后将个人号升级为企业号，或申诉说明本小程序属于教育辅导工具而非深度合成。目前未解决。

### 第十阶段：GitHub 开源与简历整理

**隐私清理**：推送前全局搜索并替换了所有敏感信息：
- Tencent Cloud SecretId/SecretKey → `your-tencent-secret-id/key`
- Zhipu API Key → `your-zhipu-api-key`
- WeChat AppID → `your-appid`
- 个人邮箱 → `your-email@example.com`
- 云环境 ID → `your-cloud-env-id`

**GitHub 安全告警**：GitHub 的 secret scanning 检测到了初始提交中的微信 AppID。通过补充提交替换为占位符解决。由于仓库只有两笔提交且无外部协作者，历史记录中的旧值影响可控。

## 项目结构

```
essay-corrector/
├── miniprogram/
│   ├── app.js                    # 入口：云环境初始化 + 全局错误
│   ├── app.json                  # 路由 + 窗口 + TabBar + 权限
│   ├── app.wxss                  # 全局 Design System (CSS 变量)
│   ├── pages/
│   │   ├── index/                # 首页：三大入口 + 近期批改
│   │   ├── correcting/           # 上传→OCR→用户确认→批改
│   │   ├── report/               # 批改报告：评分 + 批注 + 建议
│   │   ├── history/              # 历史记录：分页 + 下拉刷新
│   │   ├── me/                   # 我的：统计 + 菜单 + 头像
│   │   ├── manual/               # 手动输入作文
│   │   ├── progress/             # 进步追踪 (Canvas 折线图)
│   │   ├── reference/            # 范文库：筛选 + 列表
│   │   ├── reference/detail/     # 范文详情：正文 + AI 赏析
│   │   ├── upgrade/              # 会员升级 (已隐藏)
│   │   ├── feedback/             # 意见反馈 (存入数据库)
│   │   └── privacy/              # 隐私政策 + 用户协议
│   ├── components/
│   │   ├── score-ring/           # 环形评分 (Canvas 2D, 6px 线宽)
│   │   ├── dimension-bars/       # 分项得分 (strength/weakness 分列)
│   │   └── loading-steps/        # 三阶段加载动画
│   ├── data/
│   │   └── essays.js             # 共享范文数据 (6 篇)
│   └── utils/
│       ├── api.js                # 云函数调用封装
│       ├── config.js             # 应用配置
│       ├── constants.js          # 常量 (评分等级/文体/年级/会员)
│       └── format.js             # 格式化 (日期/分数/相对时间)
│
├── cloudfunctions/
│   ├── aiProxy/                  # 核心云函数
│   │   ├── index.js              # 主入口 (mode: ocr/correct/unified)
│   │   ├── ocr.js                # OCR 模块 (三级降级链)
│   │   ├── correct.js            # 批改模块 (调用智譜 API)
│   │   ├── prompt.js             # Prompt 模板
│   │   ├── parser.js             # JSON 解析 + 校验 + 容错
│   │   ├── env.js                # 服务端配置 (密钥管理)
│   │   ├── config.json           # 超时 + 环境变量
│   │   └── package.json          # 依赖声明
│   ├── login/                    # 用户注册/登录
│   └── getHistory/               # 历史记录查询 (分页)
│
├── project.config.json           # 项目配置
├── .gitignore                    # Git 忽略规则
└── README.md                     # 本文件
```

## 踩过的坑

| 坑 | 原因 | 解决 |
|----|------|------|
| 视觉模型 OCR 识别率低 | LLM 不是 OCR 引擎 | 改用腾讯云专用 OCR API |
| 作文 OCR 返回 0 字符 | 笔迹潦草/图片质量 | 降级到通用手写 OCR |
| 云函数 60 秒超时 | OCR+AI 合并调用 | 拆分为两次独立调用 |
| AI 返回空响应 | 推理模式消耗 token | `thinking: { type: 'disabled' }` |
| 相机/相册打不开 | 隐私检查开启但后台未配 | 开发时关 `__usePrivacyCheck__` |
| 个人主体审核被拒 | AI 功能需企业主体 | 注册个体工商户 |
| GitHub 密钥泄露告警 | 历史提交含 AppID | 补充提交替换为占位符 |
| AI 批改超时 | 输出 token 过多 | 精简 Prompt + 多层超时控制 |

## License

MIT
