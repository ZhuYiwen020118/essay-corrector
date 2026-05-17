Component({
  properties: {
    score: { type: Number, value: 0 },
    level: { type: String, value: '' },
    levelLabel: { type: String, value: '' },
    scoreColor: { type: String, value: '#D4A853' },
    stars: { type: Number, value: 3 },
  },

  lifetimes: {
    ready() {
      this.drawRing();
    },
  },

  observers: {
    'score, scoreColor'(score, color) {
      this.drawRing();
    },
  },

  methods: {
    drawRing() {
      const query = this.createSelectorQuery();
      query.select('#scoreCanvas')
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res[0] || !res[0].node) return;

          const canvas = res[0].node;
          const w = res[0].width || 240;
          const h = res[0].height || 240;
          const dpr = wx.getSystemInfoSync().pixelRatio;
          canvas.width = w * dpr;
          canvas.height = h * dpr;

          const ctx = canvas.getContext('2d');
          ctx.scale(dpr, dpr);

          const centerX = w / 2;
          const centerY = h / 2;
          const radius = Math.min(w, h) / 2 - 8;
          const lineWidth = 6;
          const score = this.properties.score || 0;
          const color = this.properties.scoreColor || '#D4A853';

          // 清空画布
          ctx.clearRect(0, 0, w, h);

          // 背景圆环
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
          ctx.strokeStyle = '#F0E4C8';
          ctx.lineWidth = lineWidth;
          ctx.lineCap = 'round';
          ctx.stroke();

          // 进度圆环（从顶部 12 点钟方向顺时针）
          if (score > 0) {
            const ratio = score / 100;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.lineCap = 'round';
            ctx.stroke();
          }
        });
    },
  },
});
