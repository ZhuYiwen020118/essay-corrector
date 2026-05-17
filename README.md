# AI 作文批改小程序

拍照上传手写作文，AI 自动识别文字并生成四维评分批改报告。基于微信小程序原生框架 + 云开发搭建。

## 功能

- 拍照 / 相册 / 手动输入三种作文提交方式
- 腾讯云 OCR 手写体识别（作文OCR → 通用手写OCR → 视觉模型三级降级）
- 智譜 GLM-4.7 大模型批改：四维评分 + 逐句批注 + 提升建议
- 历史记录管理 + 进步追踪趋势图
- 内置范文库（按年级和文体筛选）
- 意见反馈（存入云数据库）

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | 微信小程序原生框架 (WXML/WXSS/JS) |
| 后端 | 微信云开发 (云函数 + 云数据库 + 云存储) |
| OCR | 腾讯云手写作文识别 HandwritingEssayOCR |
| AI | 智譜 GLM-4.7-Flash (OpenAI 兼容 API) |

## 架构

```
小程序客户端 → 微信云函数 aiProxy → 腾讯云 OCR / 智譜 AI
                                   → 云数据库 (users/essays/reports/feedbacks)
                                   → 云存储 (作文图片)
```

## 快速开始

1. 微信开发者工具导入项目
2. 修改 `project.config.json` 中的 `appid`
3. 修改 `miniprogram/app.js` 中的云环境 ID
4. 配置云函数环境变量 (`cloudfunctions/aiProxy/config.json`)：
   - `TENCENT_SECRET_ID` / `TENCENT_SECRET_KEY`
   - `ZHIPU_API_KEY` / `ZHIPU_BASE_URL` / `ZHIPU_MODEL`
5. 逐个右键云函数 → 上传并部署（云端安装依赖）
6. 云开发控制台创建数据库集合（users, essays, reports, feedbacks）
7. 编译运行

## 项目结构

```
essay-corrector/
├── miniprogram/
│   ├── app.js / app.json / app.wxss
│   ├── pages/
│   │   ├── index/          # 首页（拍照/相册/手动输入）
│   │   ├── correcting/     # 上传→OCR→批改流程
│   │   ├── report/         # 批改报告（评分+批注+建议）
│   │   ├── history/        # 历史记录（分页+下拉刷新）
│   │   ├── me/             # 我的（统计+设置+反馈）
│   │   ├── manual/         # 手动输入
│   │   ├── progress/       # 进步追踪（Canvas 折线图）
│   │   ├── reference/      # 范文库
│   │   ├── feedback/       # 意见反馈
│   │   └── privacy/        # 隐私政策
│   ├── components/
│   │   ├── score-ring/     # 环形评分（Canvas 2D）
│   │   ├── dimension-bars/ # 分项得分进度条
│   │   └── loading-steps/  # 加载步骤动画
│   └── utils/              # 工具模块
├── cloudfunctions/
│   ├── aiProxy/            # 核心：OCR+AI批改+数据库
│   │   ├── ocr.js          # OCR 模块（三级降级链）
│   │   ├── correct.js      # 批改模块（流式 API）
│   │   ├── prompt.js       # Prompt 模板
│   │   └── parser.js       # JSON 解析+校验
│   ├── login/              # 用户登录
│   └── getHistory/         # 历史记录查询
└── project.config.json
```

## License

MIT
