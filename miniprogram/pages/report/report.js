const { getLevelByScore } = require('../../utils/format');
const { CORRECTION_TYPES } = require('../../utils/constants');

Page({
  data: {
    report: null,
    essay: { title: '', content: '' },
    levelInfo: null,
    correctionTypes: CORRECTION_TYPES,
    loading: true,
  },

  onLoad(options) {
    const { id } = options;
    if (id) this.loadReport(id);
  },

  async loadReport(reportId) {
    try {
      const db = wx.cloud.database();
      const res = await db.collection('reports').doc(reportId).get();
      if (!res.data) {
        wx.showToast({ title: '报告不存在', icon: 'none' });
        this.setData({ loading: false });
        return;
      }
      const report = res.data;
      const levelInfo = getLevelByScore(report.overall_score);
      let essay = { title: '', content: '' };
      if (report.essayId) {
        try {
          const essayRes = await db.collection('essays').doc(report.essayId).get();
          essay = essayRes.data || essay;
        } catch (e) { /* ignore */ }
      }
      this.setData({ report, essay, levelInfo, loading: false });
    } catch (err) {
      console.error('加载报告失败:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
      this.setData({ loading: false });
    }
  },

  onShareAppMessage() {
    const r = this.data.report;
    return {
      title: `AI 批改报告：${r.overall_score}分 ${r.level}`,
      path: `/pages/report/report?id=${r._id}`,
    };
  },

  onViewReference() {
    wx.navigateTo({ url: '/pages/reference/reference' });
  },
});

