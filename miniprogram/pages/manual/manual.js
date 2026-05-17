const { GRADES, GENRES } = require('../../utils/constants');

Page({
  data: {
    title: '',
    text: '',
    grade: 3,
    genre: 'narrative',
    grades: GRADES,
    genres: GENRES,
    selectedGrade: GRADES[2],
    submitting: false,
    debugLogs: [],
    showDebug: false,
  },

  addLog(msg) {
    const logs = this.data.debugLogs;
    logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
    this.setData({ debugLogs: logs, showDebug: true });
    console.log('[MANUAL]', msg);
  },

  onTitleInput(e) { this.setData({ title: e.detail.value }); },
  onTextInput(e) { this.setData({ text: e.detail.value }); },

  onGradeChange(e) {
    const idx = e.detail.value;
    this.setData({ grade: GRADES[idx].value, selectedGrade: GRADES[idx] });
  },

  onGenreSelect(e) {
    this.setData({ genre: e.currentTarget.dataset.value });
  },

  async onSubmit() {
    this.addLog('========== 手动输入批改 ==========');

    if (this.data.text.trim().length < 10) {
      wx.showToast({ title: '请至少输入 10 个字', icon: 'none' });
      return;
    }

    this.addLog(`字数: ${this.data.text.length}, 年级: ${this.data.grade}, 文体: ${this.data.genre}`);

    this.setData({ submitting: true });
    wx.showLoading({ title: 'AI 批改中...' });

    try {
      this.addLog('调用 aiProxy 云函数...');
      const res = await wx.cloud.callFunction({
        name: 'aiProxy',
        data: {
          mode: 'unified',
          text: this.data.text,
          grade: this.data.grade,
          genre: this.data.genre,
          title: this.data.title,
        },
      });

      const result = res.result;
      if (result.code !== 0) {
        throw new Error(result.message || '批改失败');
      }

      this.addLog(`AI 评分: ${result.data.report.overall_score}`);
      this.addLog(`保存成功: ${result.data.reportId}`);
      this.addLog('========== 完成 ==========');

      wx.hideLoading();
      wx.redirectTo({ url: `/pages/report/report?id=${result.data.reportId}` });

    } catch (err) {
      wx.hideLoading();
      this.addLog(`失败: ${err.message || JSON.stringify(err)}`);
      wx.showModal({
        title: '批改失败',
        content: err.message || '未知错误',
        showCancel: false,
      });
    } finally {
      this.setData({ submitting: false });
    }
  },
});
