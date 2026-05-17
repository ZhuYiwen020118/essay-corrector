/** 评分等级映射 */
const SCORE_LEVELS = [
  { min: 90, level: '一类文', label: '优秀', stars: 5, color: '#52C41A' },
  { min: 80, level: '二类文', label: '良好', stars: 4, color: '#4A90D9' },
  { min: 70, level: '三类文', label: '一般', stars: 3, color: '#FAAD14' },
  { min: 60, level: '四类文', label: '及格', stars: 2, color: '#FF7A45' },
  { min: 0,  level: '五类文', label: '待提高', stars: 1, color: '#FF4D4F' },
];

/** 批改维度定义 */
const DIMENSIONS = [
  { key: 'language',     label: '语言表达', maxScore: 25, criteria: '用词准确性、句式多样性、修辞运用' },
  { key: 'structure',    label: '结构逻辑', maxScore: 25, criteria: '段落衔接、详略得当、逻辑清晰' },
  { key: 'content',      label: '内容立意', maxScore: 30, criteria: '主题明确、素材充实、立意深度' },
  { key: 'presentation', label: '卷面规范', maxScore: 20, criteria: '字迹工整、标点正确、格式规范' },
];

/** 文体类型 */
const GENRES = [
  { value: 'narrative',    label: '记叙文' },
  { value: 'argumentative', label: '议论文' },
  { value: 'expository',   label: '说明文' },
  { value: 'practical',    label: '应用文' },
];

/** 年级 */
const GRADES = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: `${i + 1}年级`,
}));

/** 批改错误类型 */
const CORRECTION_TYPES = {
  typo:       { label: '错别字',  color: '#FF4D4F', icon: '✏️' },
  grammar:    { label: '语法',    color: '#FAAD14', icon: '📝' },
  redundancy: { label: '冗余',    color: '#FF7A45', icon: '🗑️' },
  structure:  { label: '结构',    color: '#4A90D9', icon: '🏗️' },
  style:      { label: '文采',    color: '#722ED1', icon: '✨' },
};

/** 免费版每日批改上限 */
const FREE_DAILY_LIMIT = 5;

/** 会员套餐 */
const PLANS = [
  {
    key: 'free',
    name: '免费版',
    price: '¥0',
    period: '',
    features: [
      '每日 2 次批改',
      '基础批改报告',
      '历史记录管理',
    ],
    highlight: false,
  },
  {
    key: 'pro',
    name: 'Pro 个人版',
    price: '¥19.9',
    period: '/月',
    features: [
      '无限次批改',
      '多维评分体系',
      '进步追踪图表',
      '范文库全部内容',
      '分享报告长图',
      '去广告',
    ],
    highlight: true,
  },
  {
    key: 'family',
    name: 'Pro 家庭版',
    price: '¥29.9',
    period: '/月',
    features: [
      'Pro 全部功能',
      '最多 3 个孩子档案',
      '家庭成员共享',
      '学习进度对比',
    ],
    highlight: false,
  },
  {
    key: 'teacher',
    name: '教师版',
    price: '¥39.9',
    period: '/月',
    features: [
      'Pro 全部功能',
      '批量批改模式',
      'Excel 报告导出',
      '打印版报告',
      '班级管理',
    ],
    highlight: false,
  },
];

module.exports = {
  SCORE_LEVELS, DIMENSIONS, GENRES, GRADES,
  CORRECTION_TYPES, FREE_DAILY_LIMIT, PLANS,
};
