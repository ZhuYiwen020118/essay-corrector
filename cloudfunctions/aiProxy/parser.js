/**
 * JSON 解析 + 校验 — 统一版本
 */

/**
 * 从 AI 返回的文本中提取 JSON
 */
function extractJSON(text) {
  const cleaned = (text || '').trim();
  let content = cleaned.replace(/以上内容为AI生成[\s\S]*$/g, '').trim();

  // 尝试从 markdown 代码块提取
  let m = content.match(/```json\s*([\s\S]*?)```/);
  if (m) { try { return JSON.parse(m[1].trim()); } catch (e) { /* continue */ } }

  m = content.match(/```\s*([\s\S]*?)```/);
  if (m) { try { return JSON.parse(m[1].trim()); } catch (e) { /* continue */ } }

  // 从文本中匹配 JSON 对象
  const i = content.indexOf('{');
  if (i === -1) throw new Error('AI 返回中未找到 JSON');

  const closes = [];
  let p = -1;
  while ((p = content.indexOf('}', p + 1)) !== -1) closes.push(p);

  for (let k = closes.length - 1; k >= 0; k--) {
    try { return JSON.parse(content.slice(i, closes[k] + 1)); }
    catch (e) { continue; }
  }

  console.error('[parser] 所有方式均失败。原始:', cleaned.slice(0, 500));
  throw new Error('JSON 解析失败');
}

/**
 * 校验并补齐 AI 返回的批改结果
 */
function validateAndNormalize(raw) {
  const dims = ['language', 'structure', 'content', 'presentation'];

  if (!raw.dimensions) raw.dimensions = {};
  for (const key of dims) {
    if (!raw.dimensions[key]) {
      raw.dimensions[key] = { score: 0, strength: '', weakness: '', comment: '评分缺失' };
    }
    if (typeof raw.dimensions[key].score !== 'number') {
      raw.dimensions[key].score = 0;
    }
  }

  if (typeof raw.overall_score !== 'number') {
    raw.overall_score = Math.round(
      dims.reduce((sum, k) => sum + (raw.dimensions[k]?.score || 0), 0)
    );
  }

  raw.corrections = (raw.corrections || []).map(c => ({
    original: c.original || '',
    suggestion: c.suggestion || '',
    type: ['typo', 'grammar', 'redundancy', 'structure', 'style'].includes(c.type) ? c.type : 'style',
    severity: c.severity === 'major' ? 'major' : 'minor',
    comment: c.comment || '',
  }));

  // overall_advice 兼容字符串和数组
  if (typeof raw.overall_advice === 'string') {
    raw.overall_advice = [raw.overall_advice];
  }
  raw.overall_advice = raw.overall_advice || [];
  raw.encouragement = raw.encouragement || '继续加油！';
  raw.good_sentences = raw.good_sentences || [];

  return raw;
}

module.exports = { extractJSON, validateAndNormalize };
