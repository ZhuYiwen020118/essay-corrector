const { GRADES, GENRES } = require('../../utils/constants');

Page({
  data: {
    isImageMode: false,
    imagePath: '',
    essayText: '',
    grade: 3,
    genre: 'narrative',
    selectedGrade: null,
    grades: GRADES,
    genres: GENRES,
    step: 'idle',        // uploading | ocr | editing | correcting | done | error
    stepLabel: '',
    ocrError: '',
    submitting: false,
    errorMessage: '',
    timings: {},
    debugLogs: [],
    showDebug: false,
  },

  onLoad(options) {
    const { imagePath, text, grade, genre } = options;
    const g = parseInt(grade) || 3;
    const gn = genre || 'narrative';

    if (imagePath) {
      const localPath = decodeURIComponent(imagePath);
      this.setData({
        isImageMode: true,
        imagePath: localPath,
        grade: g,
        genre: gn,
        selectedGrade: GRADES[g - 1] || GRADES[2],
      });
      this.doUploadAndOCR(localPath);
    } else if (text) {
      const decoded = decodeURIComponent(text);
      this.setData({ essayText: decoded, grade: g, genre: gn });
      this.doCorrect();
    }
  },

  addLog(msg) {
    const logs = this.data.debugLogs;
    logs.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
    this.setData({ debugLogs: logs });
    console.log('[CORRECT]', msg);
  },

  /* ═══ 图片模式：上传 → OCR → 用户确认 → 批改 ═══ */
  async doUploadAndOCR(localPath) {
    const t0 = Date.now();
    this.setData({ step: 'uploading', stepLabel: '正在上传图片...' });
    this.addLog('========== Step1 上传 ==========');

    let fileID;
    try {
      const compressRes = await wx.compressImage({ src: localPath, quality: 80 });
      const cloudPath = `essays/${Date.now()}_${Math.random().toString(36).slice(2, 6)}.jpg`;
      const uploadRes = await wx.cloud.uploadFile({ cloudPath, filePath: compressRes.tempFilePath });
      fileID = uploadRes.fileID;
      this.setData({ timings: { upload: Date.now() - t0 } });
      this.addLog(`上传完成 ${this.data.timings.upload}ms`);
    } catch (err) {
      this.addLog('上传失败: ' + err.errMsg);
      this.setData({ step: 'error', ocrError: '图片上传失败，请重试' });
      return;
    }

    this.setData({ step: 'ocr', stepLabel: '正在识别文字...' });
    this.addLog('========== Step2 OCR ==========');
    const t1 = Date.now();

    try {
      const ocrRes = await wx.cloud.callFunction({
        name: 'aiProxy',
        data: { mode: 'ocr', imageUrl: fileID },
      });
      const ocrMs = Date.now() - t1;
      this.setData({ 'timings.ocr': ocrMs });
      this.addLog(`OCR完成 ${ocrMs}ms 方法:${ocrRes.result.data?.method || '?'}`);

      const text = (ocrRes.result.data?.text || '').trim();
      if (text.length >= 10) {
        this.setData({
          essayText: text,
          step: 'editing',
          stepLabel: 'AI 识别完成，可修改后提交',
        });
        this.addLog(`OCR 结果: ${text.length} 字`);
      } else {
        throw new Error('识别内容太短(' + text.length + '字)');
      }
    } catch (err) {
      this.addLog('OCR失败: ' + (err.message || ''));
      this.setData({ step: 'error', ocrError: '文字识别失败，请确保图片清晰。或切换到手动输入。' });
    }
  },

  onRetryOCR() {
    this.setData({ step: 'idle', ocrError: '' });
    this.doUploadAndOCR(this.data.imagePath);
  },

  onSwitchToManual() {
    wx.navigateBack();
  },

  onTextInput(e) {
    this.setData({ essayText: e.detail.value });
  },

  onGradeChange(e) {
    const idx = e.detail.value;
    this.setData({ grade: GRADES[idx].value, selectedGrade: GRADES[idx] });
  },

  onGenreSelect(e) {
    this.setData({ genre: e.currentTarget.dataset.value });
  },

  /* ═══ 提交批改 ═══ */
  async onSubmit() {
    const text = this.data.essayText.trim();
    if (text.length < 10) {
      wx.showToast({ title: '请至少输入 10 个字', icon: 'none' });
      return;
    }

    this.setData({ step: 'correcting', stepLabel: 'AI 正在批改作文...', submitting: true, errorMessage: '' });
    this.addLog('========== Step3 AI批改 ==========');
    wx.showLoading({ title: 'AI 批改中...' });
    const t0 = Date.now();

    try {
      const res = await wx.cloud.callFunction({
        name: 'aiProxy',
        data: {
          mode: 'unified',
          text,
          grade: this.data.grade,
          genre: this.data.genre,
          title: '',
        },
      });
      const aiMs = Date.now() - t0;
      this.setData({ 'timings.ai': aiMs });
      this.addLog(`AI批改完成 ${aiMs}ms`);

      wx.hideLoading();
      const result = res.result;

      if (result.code === 0) {
        const t = result.data.timings || {};
        this.addLog(`评分:${result.data.report.overall_score} reportId:${result.data.reportId}`);
        this.addLog(`[⏱ 总耗时] 上传:${this.data.timings.upload || '-'}ms OCR:${this.data.timings.ocr || '-'}ms AI:${aiMs}ms DB:${t.dbSave || '-'}ms`);
        wx.redirectTo({ url: `/pages/report/report?id=${result.data.reportId}` });
      } else {
        throw new Error(result.message || '批改失败');
      }
    } catch (err) {
      wx.hideLoading();
      this.addLog(`失败: ${err.message || ''}`);
      this.setData({ step: 'error', errorMessage: err.message || '未知错误' });
    } finally {
      this.setData({ submitting: false });
    }
  },

  async doCorrect() {
    if (this.data.essayText.length < 10) {
      this.setData({ errorMessage: '内容太短，请至少输入 10 个字' });
      return;
    }
    await this.onSubmit();
  },

  onRetry() {
    wx.navigateBack();
  },
});
