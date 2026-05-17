const cloud = require('wx-server-sdk');
const https = require('https');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const { recognizeText } = require('./ocr');
const { correctEssay } = require('./correct');

/* ============================================================
 *  HTTP 工具
 * ============================================================ */

function httpPostJSON(urlString, headers, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlString);
    const req = https.request({
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      timeout: 58000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json;
        try { json = JSON.parse(data); } catch (e) { json = { _raw: data }; }
        resolve({ status: res.statusCode, data: json });
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('请求超时')); });
    req.write(JSON.stringify(body));
    req.end();
  });
}

/* ============================================================
 *  用户用量管理
 * ============================================================ */

async function getUser(openid) {
  const res = await db.collection('users').where({ _openid: openid }).get();
  return res.data[0] || null;
}

async function checkUsageLimit(user) {
  if (!user) return { allowed: false, message: '请重新打开小程序' };
  if (user.membership !== 'free') return { allowed: true, remaining: -1 };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastReset = user.lastUsageReset ? new Date(user.lastUsageReset) : new Date(0);

  const dailyUsage = lastReset >= today ? (user.dailyUsage || 0) : 0;
  const remaining = Math.max(0, 5 - dailyUsage);

  if (dailyUsage >= 5) {
    return { allowed: false, remaining: 0, message: '今日免费次数已用完' };
  }
  return { allowed: true, remaining };
}

async function updateUserUsage(openid, user) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastReset = user.lastUsageReset ? new Date(user.lastUsageReset) : new Date(0);
  const newDailyUsage = lastReset >= today ? (user.dailyUsage || 0) + 1 : 1;

  await db.collection('users').where({ _openid: openid }).update({
    data: {
      dailyUsage: newDailyUsage,
      lastUsageReset: db.serverDate(),
      totalEssays: db.command.inc(1),
      updatedAt: db.serverDate(),
    },
  });
}

async function saveToDatabase(openid, { title, grade, genre, content, report }) {
  const essayRes = await db.collection('essays').add({
    data: {
      _openid: openid,
      title: title || '',
      grade, genre,
      wordCount: content.length,
      content,
      createdAt: db.serverDate(),
    },
  });

  const reportData = {
    _openid: openid,
    essayId: essayRes._id,
    overall_score: report.overall_score,
    level: report.level,
    dimensions: report.dimensions,
    corrections: report.corrections,
    overall_advice: report.overall_advice,
    encouragement: report.encouragement,
    good_sentences: report.good_sentences,
    createdAt: db.serverDate(),
  };
  const reportRes = await db.collection('reports').add({ data: reportData });

  return { essayId: essayRes._id, reportId: reportRes._id };
}

/* ============================================================
 *  核心批改流程 — 图片模式
 * ============================================================ */

/**
 * 图片批改: OCR → 智譜批改
 */
async function correctImage(imageUrl, grade, genre) {
  const timing = {};
  const tTotal = Date.now();

  // OCR 识别（腾讯云手写OCR，15s超时）
  const tOCR = Date.now();
  const ocrResult = await recognizeText(imageUrl, httpPostJSON);
  timing.ocr = Date.now() - tOCR;
  console.log('[⏱] OCR:', timing.ocr, 'ms, 方法:', ocrResult.method);

  const essayText = ocrResult.text.trim();
  console.log('OCR 字数:', essayText.length);

  if (!essayText || essayText.length < 10) {
    throw new Error('内容太短，请至少输入 10 个字');
  }

  // 智譜批改（纠错 + 评分，30s超时）
  const tCorrect = Date.now();
  const result = await correctEssay({ httpPostJSON, essayText, grade, genre });
  timing.correction = Date.now() - tCorrect;
  console.log('[⏱] AI批改:', timing.correction, 'ms');

  timing.total = Date.now() - tTotal;
  console.log('[⏱] 图片批改总耗时:', timing.total, 'ms');
  return { essayText, report: result.report, method: 'ocr+zhipu', timing };
}

/* ============================================================
 *  主入口
 * ============================================================ */

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const {
    mode = 'unified',
    text: inputText,
    imageUrl,
    grade = 3,
    genre = 'narrative',
    title = '',
  } = event;

  console.log('=== aiProxy === mode:', mode, 'hasText:', !!inputText, 'hasImage:', !!imageUrl);

  // —— 模式 1: OCR 识别 ——
  if (mode === 'ocr') {
    if (!imageUrl) return { code: -1, message: 'OCR 模式需要 imageUrl' };
    try {
      const result = await recognizeText(imageUrl, httpPostJSON);
      return { code: 0, data: { text: result.text, method: result.method } };
    } catch (err) {
      console.error('OCR 失败:', err.message);
      return { code: -2, message: 'OCR 识别失败: ' + err.message };
    }
  }

  // —— 模式 2: 纯批改（不存库、不检查次数）——
  if (mode === 'correct') {
    const essayText = (inputText || '').trim();
    if (essayText.length < 10) return { code: -1, message: '作文内容过短' };

    try {
      const result = await correctEssay({ httpPostJSON, essayText, grade, genre });
      return { code: 0, data: { essayText: result.essayText, report: result.report } };
    } catch (err) {
      console.error('批改失败:', err.message);
      return { code: -3, message: 'AI 批改失败: ' + err.message };
    }
  }

  // —— 模式 3: 统一流程（批改 + 存库 + 用量）——
  if (mode === 'unified') {
    const user = await getUser(OPENID);
    if (!user) return { code: -1, message: '请重新打开小程序以自动注册' };

    const usage = await checkUsageLimit(user);
    if (!usage.allowed) return { code: -2, message: usage.message };

    // 获取文本
    let essayText = (inputText || '').trim();
    let report;

    let timings = {};

    if (imageUrl) {
      try {
        const imgResult = await correctImage(imageUrl, grade, genre);
        essayText = imgResult.essayText;
        report = imgResult.report;
        timings = imgResult.timing || {};
        console.log('图片批改方法:', imgResult.method);
      } catch (err) {
        console.error('图片批改失败:', err.message);
        return { code: -3, message: err.message };
      }
    } else {
      if (!essayText || essayText.length < 10) {
        return { code: -4, message: '内容太短，请至少输入 10 个字' };
      }

      const tCorrect = Date.now();
      try {
        const result = await correctEssay({ httpPostJSON, essayText, grade, genre });
        timings.correction = Date.now() - tCorrect;
        report = result.report;
      } catch (err) {
        console.error('AI 批改彻底失败:', err.message);
        return { code: -5, message: err.message };
      }
    }

    // 存库
    const tDB = Date.now();
    const { reportId } = await saveToDatabase(OPENID, {
      title, grade, genre, content: essayText, report,
    });
    timings.dbSave = Date.now() - tDB;

    // 更新用量
    await updateUserUsage(OPENID, user);

    console.log('[⏱] DB保存:', timings.dbSave, 'ms');
    console.log('[⏱] 各步骤耗时(ms):', JSON.stringify(timings));
    console.log('=== aiProxy 成功, reportId:', reportId, '===');
    return { code: 0, data: { reportId, report, timings } };
  }

  return { code: -1, message: `未知 mode: ${mode}` };
};
