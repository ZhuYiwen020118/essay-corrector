const { getHistory } = require('../../utils/api');
const { getLevelByScore, formatDate } = require('../../utils/format');

Page({
  data: {
    reports: [],
    stats: null,
    loading: true,
    empty: false,
  },

  onLoad() {
    this.loadAllReports();
  },

  async loadAllReports() {
    try {
      const res = await getHistory({ page: 1, pageSize: 100 });
      if (res.code === 0 && res.data.length > 0) {
        // 按时间正序排列（旧→新）
        const raw = res.data.reverse();
        const reports = raw.map(r => ({
          ...r,
          levelColor: getLevelByScore(r.overall_score).color,
          dateLabel: formatDate(r.createdAt),
        }));
        const stats = this.calcStats(reports);

        this.setData({ reports, stats, loading: false });
        setTimeout(() => this.drawChart(reports), 300);
      } else {
        this.setData({ loading: false, empty: true });
      }
    } catch (err) {
      console.error('加载进度数据失败:', err);
      this.setData({ loading: false, empty: true });
    }
  },

  calcStats(reports) {
    const scores = reports.map(r => r.overall_score);
    const total = reports.length;
    const highest = Math.max(...scores);
    const lowest = Math.min(...scores);
    const average = Math.round(scores.reduce((a, b) => a + b, 0) / total);

    const recent = reports.slice(-5);
    const firstScore = recent[0]?.overall_score || 0;
    const lastScore = recent[recent.length - 1]?.overall_score || 0;
    const trend = lastScore - firstScore;

    return { total, highest, lowest, average, trend };
  },

  drawChart(reports) {
    const query = wx.createSelectorQuery();
    query.select('#trendCanvas')
      .fields({ node: false, size: true })
      .exec((res) => {
        if (!res[0] || !res[0].width) return;
        const rect = res[0];
        this.renderChart(reports, rect.width, rect.height);
      });
  },

  renderChart(reports, width, height) {
    const ctx = wx.createCanvasContext('trendCanvas');
    const padding = { top: 40, right: 24, bottom: 48, left: 56 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    ctx.setFillStyle('#FFFDF5');
    ctx.fillRect(0, 0, width, height);

    const scores = reports.map(r => r.overall_score);
    const maxScore = Math.max(100, Math.ceil(Math.max(...scores) / 10) * 10);
    const minScore = Math.max(0, Math.floor(Math.min(...scores) / 10) * 10 - 10);

    // Y 轴
    ctx.setStrokeStyle('#F0E4C8');
    ctx.setLineWidth(1);
    ctx.setFontSize(11);
    ctx.setFillStyle('#B8A88A');
    ctx.setTextAlign('right');
    ctx.setTextBaseline('middle');

    const ySteps = 5;
    for (let i = 0; i <= ySteps; i++) {
      const yVal = minScore + ((maxScore - minScore) / ySteps) * (ySteps - i);
      const y = padding.top + (chartH / ySteps) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      ctx.fillText(String(Math.round(yVal)), padding.left - 8, y);
    }

    // X 轴
    ctx.setTextAlign('center');
    ctx.setTextBaseline('top');
    const maxLabels = Math.min(8, reports.length);
    const labelStep = Math.max(1, Math.floor(reports.length / maxLabels));

    for (let i = 0; i < reports.length; i += labelStep) {
      const x = padding.left + (chartW / (reports.length - 1 || 1)) * i;
      const d = new Date(reports[i].createdAt);
      const label = `${d.getMonth() + 1}/${d.getDate()}`;
      ctx.fillText(label, x, padding.top + chartH + 8);
    }

    // 折线
    if (reports.length >= 2) {
      ctx.setStrokeStyle('#D4A853');
      ctx.setLineWidth(3);
      ctx.setLineCap('round');
      ctx.setLineJoin('round');
      ctx.beginPath();

      reports.forEach((r, i) => {
        const x = padding.left + (chartW / (reports.length - 1 || 1)) * i;
        const ratio = (r.overall_score - minScore) / (maxScore - minScore || 1);
        const y = padding.top + chartH * (1 - ratio);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // 圆点 + 极值标注
      const topScore = Math.max(...scores);
      const bottomScore = Math.min(...scores);
      reports.forEach((r, i) => {
        const x = padding.left + (chartW / (reports.length - 1 || 1)) * i;
        const ratio = (r.overall_score - minScore) / (maxScore - minScore || 1);
        const y = padding.top + chartH * (1 - ratio);
        ctx.setFillStyle('#D4A853');
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();

        if (r.overall_score === topScore || r.overall_score === bottomScore) {
          ctx.setFillStyle('#3D2E14');
          ctx.setFontSize(10);
          ctx.setTextAlign('center');
          ctx.setTextBaseline('bottom');
          ctx.fillText(String(r.overall_score), x, y - 8);
        }
      });
    }

    ctx.draw();
  },

  onRetry() {
    this.setData({ loading: true, empty: false });
    this.loadAllReports();
  },
});
