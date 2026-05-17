/**
 * OCR 模块 — 腾讯云中英文手写作文识别 + 降级链
 *
 * 首选: HandwritingEssayOCR（中英文手写作文识别，专为作文场景设计）
 * 降级1: GeneralHandwritingOCR（通用手写体）
 * 降级2: 智譜视觉模型（兜底）
 *
 * 免费额度:
 *   HandwritingEssayOCR: 1000次/用户（开通一次性发放，一年有效）
 *   GeneralHandwritingOCR: 1000次/月（每月自动发放）
 */

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const env = require('./env');

function getOcrClient() {
  const secretId = env.TENCENT_SECRET_ID;
  const secretKey = env.TENCENT_SECRET_KEY;
  const tencentcloud = require('tencentcloud-sdk-nodejs');
  const OcrClient = tencentcloud.ocr.v20181119.Client;
  return new OcrClient({
    credential: { secretId, secretKey },
    region: 'ap-guangzhou',
    httpProfile: { reqTimeout: 15 },
  });
}

async function downloadAndEncode(fileID) {
  const res = await cloud.downloadFile({ fileID });
  const buffer = res.fileContent;
  const base64 = Buffer.from(buffer).toString('base64');
  const head = buffer.slice(0, 4).toString('hex');
  const mime = head.startsWith('ffd8') ? 'image/jpeg'
    : head.startsWith('8950') ? 'image/png'
    : head.startsWith('5249') ? 'image/webp'
    : 'image/jpeg';
  return { base64, mime, dataUrl: `data:${mime};base64,${base64}` };
}

function extractText(res) {
  return (res.TextDetections || [])
    .map(t => t.DetectedText)
    .join('\n')
    .trim();
}

/**
 * 中英文手写作文识别（首选 — 专为作文场景设计）
 * 支持 ConfigId: ArticleRecognize(中文) / ArticleRecognizeEng(英文)
 */
async function ocrHandwritingEssay(imageUrl) {
  const client = getOcrClient();
  const img = await downloadAndEncode(imageUrl);
  console.log('[OCR-essay] 图片下载完成, mime:', img.mime, '大小:', img.base64.length);

  const res = await client.HandwritingEssayOCR({
    ImageBase64: img.base64,
    ConfigId: 'ArticleRecognize',  // 手写中文作文模板
  });

  const text = extractText(res);
  console.log('[OCR-essay] 识别成功,', text.length, '字');
  return text;
}

/**
 * 通用手写体 OCR（降级1）
 */
async function ocrGeneralHandwriting(imageUrl) {
  const client = getOcrClient();
  const img = await downloadAndEncode(imageUrl);
  console.log('[OCR-handwriting] 图片下载完成');

  const res = await client.GeneralHandwritingOCR({
    ImageBase64: img.base64,
    EnableDetectText: true,
  });

  const text = extractText(res);
  console.log('[OCR-handwriting] 识别成功,', text.length, '字');
  return text;
}

/**
 * 智譜视觉模型 OCR（降级2，兜底）
 */
async function ocrZhipuVision(imageUrl, httpPostJSON) {
  const img = await downloadAndEncode(imageUrl);
  console.log('[OCR-zhipu] 图片下载完成, mime:', img.mime);

  const apiKey = env.ZHIPU_API_KEY;
  const baseUrl = env.ZHIPU_BASE_URL;

  const messages = [
    {
      role: 'system',
      content: '你是一个OCR文字识别工具。请将图片中的文字原文转录出来。只输出转录的文字内容，不要加任何解释、标记或其他内容。',
    },
    {
      role: 'user',
      content: [
        { type: 'text', text: '请识别并输出图片中的所有文字：' },
        { type: 'image_url', image_url: { url: img.dataUrl } },
      ],
    },
  ];

  const url = baseUrl.replace(/\/$/, '') + '/chat/completions';
  const { status, data } = await httpPostJSON(url, {
    'Authorization': `Bearer ${apiKey}`,
  }, {
    model: 'glm-4.6v-flash',
    messages,
    temperature: 0.1,
    max_tokens: 4096,
  });

  if (status >= 400) {
    throw new Error(data.error?.message || `HTTP ${status}`);
  }

  const text = (data.choices?.[0]?.message?.content || '').trim();
  console.log('[OCR-zhipu] 识别成功,', text.length, '字');
  return text;
}

/**
 * 统一 OCR 入口 — 三级降级
 * 1. 中英文手写作文识别（专为作文场景）
 * 2. 通用手写体 OCR
 * 3. 智譜视觉模型 OCR
 */
async function recognizeText(imageUrl, httpPostJSON) {
  // 方式 1: 中英文手写作文识别
  try {
    console.log('=== OCR 尝试: 中英文手写作文识别 ===');
    const text = await ocrHandwritingEssay(imageUrl);
    if (text && text.length >= 2) return { text, method: 'tencent-handwriting-essay' };
    console.log('作文OCR返回文本过短，降级...');
  } catch (e) {
    console.log('作文OCR失败:', e.message);
  }

  // 方式 2: 通用手写体 OCR
  try {
    console.log('=== OCR 降级: 通用手写体 ===');
    const text = await ocrGeneralHandwriting(imageUrl);
    if (text && text.length >= 2) return { text, method: 'tencent-handwriting' };
    console.log('通用手写体返回文本过短，降级...');
  } catch (e) {
    console.log('通用手写体失败:', e.message);
  }

  // 方式 3: 智譜视觉模型（兜底）
  try {
    console.log('=== OCR 降级: 智譜视觉模型 ===');
    const text = await ocrZhipuVision(imageUrl, httpPostJSON);
    if (text && text.length >= 2) return { text, method: 'zhipu-vision' };
  } catch (e) {
    console.log('智譜视觉模型失败:', e.message);
  }

  throw new Error('所有 OCR 方式均失败——请确保图片清晰且包含文字');
}

module.exports = { recognizeText, downloadAndEncode };
