const { PLANS } = require('../../utils/constants');

Page({
  data: {
    plans: PLANS,
    currentMembership: 'free',
  },

  onLoad() {
    const app = getApp();
    const membership = app.globalData.membership || 'free';
    this.setData({ currentMembership: membership });
  },

  onSelectPlan(e) {
    const { key } = e.currentTarget.dataset;
    if (key === 'free' || key === this.data.currentMembership) {
      return;
    }
    wx.showModal({
      title: '即将上线',
      content: '会员支付功能即将上线，敬请期待！届时您将可以享受更专业的批改服务。',
      showCancel: false,
      confirmText: '知道了',
    });
  },
});
