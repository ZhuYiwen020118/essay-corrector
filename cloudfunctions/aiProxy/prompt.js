/**
 * Prompt 模板 — 统一版本
 */

const DIMENSIONS = [
  { key: 'language',     label: '语言表达', maxScore: 25, criteria: '用词准确性、句式多样性、修辞运用' },
  { key: 'structure',    label: '结构逻辑', maxScore: 25, criteria: '段落衔接、详略得当、逻辑清晰' },
  { key: 'content',      label: '内容立意', maxScore: 30, criteria: '主题明确、素材充实、立意深度' },
  { key: 'presentation', label: '卷面规范', maxScore: 20, criteria: '字迹工整、标点正确、格式规范' },
];

function buildSystemPrompt(grade, genre) {
  const genreMap = { narrative: '记叙文', argumentative: '议论文', expository: '说明文', practical: '应用文' };

  return [
    `你是资深语文教师。请批改这篇${genreMap[genre] || '作文'}（${grade}年级）。`,
    `评分维度：${DIMENSIONS.map(d => `${d.label}(${d.maxScore}分)`).join('、')}`,
    '',
    '只输出一个 JSON（不要 markdown）：',
    '{"overall_score":82,"level":"二类文","dimensions":{"language":{"score":20,"comment":"简短评语"},"structure":{"score":18,"comment":""},"content":{"score":25,"comment":""},"presentation":{"score":19,"comment":""}},"corrections":[{"original":"原文","suggestion":"建议","type":"typo","severity":"minor"}],"overall_advice":"总体建议1-2句话","encouragement":"鼓励语"}',
    'type:typo/grammar/redundancy/structure/style。corrections最多5条。comment控制在15字以内。overall_advice直接给字符串。',
  ].join('\n');
}

module.exports = { buildSystemPrompt, DIMENSIONS };
