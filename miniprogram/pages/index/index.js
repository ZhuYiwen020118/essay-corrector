const { login, getHistory } = require('../../utils/api');
const { FREE_DAILY_LIMIT } = require('../../utils/constants');
const { getLevelByScore, formatRelativeTime } = require('../../utils/format');

Page({
  data: {
    dailyUsage: 0,
    remainingUsage: FREE_DAILY_LIMIT,
    recentReports: [],
    loadingRecent: true,
    userInfo: null,
  },

  async onLoad() {
    await this.initUser();
    await this.loadRecentReports();
  },

  async onShow() {
    await this.loadRecentReports();
    await this.refreshUsage();
  },

  async initUser() {
    try {
      const result = await login();
      if (result.code === 0) {
        const app = getApp();
        app.globalData.openid = result.data._openid;
        app.globalData.userInfo = result.data;
        this.setData({
          dailyUsage: result.data.dailyUsage || 0,
          remainingUsage: FREE_DAILY_LIMIT - (result.data.dailyUsage || 0),
          userInfo: result.data,
        });
      }
    } catch (err) {
      console.error('登录失败:', err);
    }
  },

  async loadRecentReports() {
    try {
      const result = await getHistory({ page: 1, pageSize: 5 });
      if (result.code === 0) {
        const reports = (result.data || []).map(r => ({
          ...r,
          timeAgo: formatRelativeTime(r.createdAt),
          levelColor: getLevelByScore(r.overall_score).color,
        }));
        this.setData({ recentReports: reports, loadingRecent: false });
      }
    } catch (err) {
      console.error('加载历史失败:', err);
      this.setData({ loadingRecent: false });
    }
  },

  async refreshUsage() {
    const app = getApp();
    const usage = app.globalData.dailyUsage || 0;
    this.setData({
      dailyUsage: usage,
      remainingUsage: Math.max(0, FREE_DAILY_LIMIT - usage),
    });
  },

  onTakePhoto() {
    this.pickImage('camera');
  },

  onChooseAlbum() {
    this.pickImage('album');
  },

  pickImage(sourceType) {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: [sourceType],
      success: (res) => {
        this.navigateToCorrecting(res.tempFilePaths[0]);
      },
      fail: (err) => {
        if (err.errMsg && err.errMsg.includes('cancel')) return;
        console.error('chooseImage 失败:', err);
        wx.showToast({ title: '打开失败，请重试', icon: 'none' });
      },
    });
  },

  onManualInput() {
    wx.navigateTo({ url: '/pages/manual/manual' });
  },

  navigateToCorrecting(imagePath) {
    wx.navigateTo({
      url: `/pages/correcting/correcting?imagePath=${encodeURIComponent(imagePath)}`,
    });
  },

  onViewReport(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/report/report?id=${id}` });
  },

  onViewHistory() {
    wx.switchTab({ url: '/pages/history/history' });
  },

  onShareAppMessage() {
    return {
      title: 'AI 作文批改 — 拍照上传，30秒获取专业批改报告',
      path: '/pages/index/index',
      imageUrl: '',
    };
  },
});
