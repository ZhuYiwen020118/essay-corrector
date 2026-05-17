const { getHistory } = require('../../utils/api');
const { getLevelByScore, formatRelativeTime } = require('../../utils/format');

Page({
  data: {
    reports: [],
    page: 1,
    total: 0,
    hasMore: true,
    loading: false,
    refreshing: false,
    error: false,
  },

  onLoad() {
    this.loadData();
  },

  async loadData() {
    if (this.data.loading) return;
    this.setData({ loading: true });

    try {
      const res = await getHistory({ page: this.data.page });
      if (res.code === 0) {
        const reports = (res.data || []).map(r => ({
          ...r,
          timeAgo: formatRelativeTime(r.createdAt),
          levelInfo: getLevelByScore(r.overall_score),
        }));

        this.setData({
          reports: this.data.page === 1 ? reports : [...this.data.reports, ...reports],
          total: res.total,
          hasMore: this.data.reports.length + reports.length < res.total,
        });
      }
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
      if (this.data.reports.length === 0) this.setData({ error: true });
    } finally {
      this.setData({ loading: false, refreshing: false });
    }
  },

  onPullDownRefresh() {
    this.setData({ page: 1, refreshing: true });
    this.loadData();
    wx.stopPullDownRefresh();
  },

  onReachBottom() {
    if (!this.data.hasMore || this.data.loading) return;
    this.setData({ page: this.data.page + 1 });
    this.loadData();
  },

  onRetryLoad() {
    this.setData({ error: false, page: 1 });
    this.loadData();
  },

  onViewReport(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/report/report?id=${id}` });
  },

  onGoHome() {
    wx.switchTab({ url: '/pages/index/index' });
  },

  onShareAppMessage() {
    return {
      title: '我的作文批改记录 — AI 作文批改',
      path: '/pages/history/history',
    };
  },
});
