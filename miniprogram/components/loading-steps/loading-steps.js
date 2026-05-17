Component({
  properties: {
    steps: {
      type: Array,
      value: [
        { label: '正在识别文字...', icon: '📷' },
        { label: '正在分析语法...', icon: '🔍' },
        { label: '正在生成建议...', icon: '✨' },
      ],
    },
    currentStep: {
      type: Number,
      value: 0,
    },
  },
});
