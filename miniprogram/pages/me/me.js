const { login } = require('../../utils/api');
const { FREE_DAILY_LIMIT } = require('../../utils/constants');

Page({
  data: {
    userInfo: null,
    dailyUsage: 0,
    remainingUsage: FREE_DAILY_LIMIT,
    totalEssays: 0,
    membership: 'free',
    membershipLabel: '免费版',
  },

  onShow() {
    this.loadUserInfo();
  },

  async loadUserInfo() {
    try {
      const result = await login();
      if (result.code === 0) {
        const user = result.data;
        const membershipMap = {
          free: '免费版', pro: 'Pro 个人版', family: 'Pro 家庭版', teacher: '教师版',
        };
        // 合并本地缓存头像/昵称
        const avatar = wx.getStorageSync('userAvatar') || user.avatar || '';
        const nickname = wx.getStorageSync('userNickname') || user.nickname || '';
        this.setData({
          userInfo: { ...user, avatar, nickname },
          dailyUsage: user.dailyUsage || 0,
          remainingUsage: Math.max(0, FREE_DAILY_LIMIT - (user.dailyUsage || 0)),
          totalEssays: user.totalEssays || 0,
          membership: user.membership || 'free',
          membershipLabel: membershipMap[user.membership] || '免费版',
        });
      }
    } catch (err) {
      console.warn('加载用户信息失败:', err);
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    if (avatarUrl) {
      wx.setStorageSync('userAvatar', avatarUrl);
      this.setData({ 'userInfo.avatar': avatarUrl });
    }
  },

  onNicknameBlur(e) {
    const nickname = e.detail.value;
    if (nickname) {
      wx.setStorageSync('userNickname', nickname);
      this.setData({ 'userInfo.nickname': nickname });
    }
  },

  onViewProgress() {
    wx.navigateTo({ url: '/pages/progress/progress' });
  },

  onViewReference() {
    wx.navigateTo({ url: '/pages/reference/reference' });
  },

  onViewPrivacy() {
    wx.navigateTo({ url: '/pages/privacy/privacy' });
  },

  onFeedback() {
    wx.navigateTo({ url: '/pages/feedback/feedback' });
  },

  onAbout() {
    wx.showModal({
      title: '关于 AI 作文批改',
      content: '版本 1.0.0\n\n一款基于 AI 大模型的智能作文批改工具。拍照上传作文，30 秒获取专业批改报告。\n\n专为 K12 学生和家长设计。',
      showCancel: false,
      confirmText: '好的',
    });
  },

  onUpgrade() {
    wx.navigateTo({ url: '/pages/upgrade/upgrade' });
  },

  onShareAppMessage() {
    return {
      title: 'AI 作文批改 — 拍照上传，30秒获取专业批改报告',
      path: '/pages/index/index',
    };
  },
});
