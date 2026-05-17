/**
 * 批改模块 — 智譜文本模型
 */
const { buildSystemPrompt } = require('./prompt');
const { extractJSON, validateAndNormalize } = require('./parser');
const env = require('./env');

async function callOpenAI(httpPostJSON, { messages }) {
  const apiKey = env.ZHIPU_API_KEY;
  const baseUrl = env.ZHIPU_BASE_URL;
  const model = env.ZHIPU_MODEL;

  const url = baseUrl.replace(/\/$/, '') + '/chat/completions';
  console.log('[correct] 调用 AI, model:', model);

  const t0 = Date.now();
  const { status, data } = await httpPostJSON(url, {
    'Authorization': `Bearer ${apiKey}`,
  }, {
    model,
    messages,
    temperature: 0.3,
    max_tokens: 4000,
    thinking: { type: 'disabled' },
  });
  console.log('[correct] AI 响应耗时:', Date.now() - t0, 'ms');

  if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
  if (status >= 400) throw new Error(`HTTP ${status}: ${JSON.stringify(data).slice(0, 200)}`);

  const content = data.choices?.[0]?.message?.content || '';
  if (!content) {
    console.error('[correct] AI 返回空! finish_reason:', data.choices?.[0]?.finish_reason);
    console.error('[correct] 原始响应:', JSON.stringify(data).slice(0, 500));
  }
  return content;
}

async function correctEssay({ httpPostJSON, essayText, grade, genre }) {
  const messages = [
    { role: 'system', content: buildSystemPrompt(grade, genre) },
    { role: 'user', content: `年级：${grade}\n文体：${genre}\n作文：\n${essayText}` },
  ];

  console.log('[correct] 开始批改, 字数:', essayText.length);

  const t0 = Date.now();
  const responseText = await callOpenAI(httpPostJSON, { messages });
  console.log('[correct] 批改总耗时:', Date.now() - t0, 'ms, 响应长度:', responseText.length);

  const rawReport = extractJSON(responseText);
  const report = validateAndNormalize(rawReport);

  console.log('[correct] 评分:', report.overall_score);
  return { report, essayText };
}

module.exports = { correctEssay };
