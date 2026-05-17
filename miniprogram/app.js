App({
  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      return;
    }
    wx.cloud.init({
      env: 'your-cloud-env-id',
    });

    // 启用分享菜单
    wx.showShareMenu({
      menus: ['shareAppMessage', 'shareTimeline'],
    });

    // 网络状态监听
    wx.onNetworkStatusChange((res) => {
      this.globalData.isConnected = res.isConnected;
      if (!res.isConnected) {
        wx.showToast({ title: '网络已断开', icon: 'none' });
      }
    });
  },

  onError(err) {
    console.error('全局错误:', err);
    wx.showToast({ title: '应用遇到问题，请重启小程序', icon: 'none' });
  },

  onUnhandledRejection(err) {
    console.error('未处理的 Promise 拒绝:', err.reason);
  },

  globalData: {
    userInfo: null,
    openid: '',
    dailyUsage: 0,
    membership: 'free',
    isConnected: true,
    _privacyResolve: null,
  },
});
