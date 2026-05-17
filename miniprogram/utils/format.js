const { SCORE_LEVELS } = require('./constants');

/** 根据分数获取等级信息 */
function getLevelByScore(score) {
  return SCORE_LEVELS.find(l => score >= l.min) || SCORE_LEVELS[SCORE_LEVELS.length - 1];
}

/** 格式化日期为 "2026-05-05 14:30" */
function formatDate(date) {
  const d = new Date(date);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** 格式化相对时间 "刚刚" "3分钟前" "昨天" */
function formatRelativeTime(date) {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '昨天';
  if (days < 7) return `${days}天前`;
  return formatDate(date);
}

/** 截断文本 */
function truncate(text, maxLen = 60) {
  if (!text) return '';
  return text.length > maxLen ? text.slice(0, maxLen) + '...' : text;
}

module.exports = { getLevelByScore, formatDate, formatRelativeTime, truncate };
