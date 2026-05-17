const { DIMENSIONS } = require('../../utils/constants');

Component({
  properties: {
    dimensions: { type: Object, value: {} },
  },

  data: {
    dimList: [],
  },

  observers: {
    'dimensions'(val) {
      if (!val) return;
      const dimList = DIMENSIONS.map(d => ({
        ...d,
        score: val[d.key]?.score || 0,
        strength: val[d.key]?.strength || '',
        weakness: val[d.key]?.weakness || '',
        comment: val[d.key]?.comment || '',
        percent: ((val[d.key]?.score || 0) / d.maxScore * 100).toFixed(0),
      }));
      this.setData({ dimList });
    },
  },
});
