Page({
  data: {
    content: '',
    contact: '',
    submitting: false,
    submitted: false,
  },

  onInput(e) {
    this.setData({ content: e.detail.value });
  },

  onContactInput(e) {
    this.setData({ contact: e.detail.value });
  },

  async onSubmit() {
    if (!this.data.content.trim()) return;

    this.setData({ submitting: true });
    wx.showLoading({ title: '提交中...' });

    try {
      const db = wx.cloud.database();
      await db.collection('feedbacks').add({
        data: {
          content: this.data.content.trim(),
          contact: this.data.contact.trim(),
          createdAt: db.serverDate(),
        },
      });

      wx.hideLoading();
      this.setData({ submitted: true, submitting: false });
    } catch (err) {
      wx.hideLoading();
      console.error('提交反馈失败:', err);
      wx.showToast({ title: '提交失败，请重试', icon: 'none' });
      this.setData({ submitting: false });
    }
  },

  onShareAppMessage() {
    return {
      title: 'AI 作文批改 — 意见反馈',
      path: '/pages/feedback/feedback',
    };
  },
});
