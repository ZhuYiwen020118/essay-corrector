const ESSAYS = require('../../data/essays');
const { GENRES, GRADES } = require('../../utils/constants');

const GENRE_MAP = {};
GENRES.forEach(g => { GENRE_MAP[g.value] = g.label; });

const GRADE_MAP = {};
GRADES.forEach(g => { GRADE_MAP[g.value] = g.label; });

Page({
  data: {
    essay: null,
    loading: true,
  },

  onLoad(options) {
    const { id } = options;
    if (id) {
      const essay = ESSAYS.find(e => e.id === id);
      if (essay) {
        const paragraphs = essay.content.split('\n\n').filter(Boolean);
        this.setData({
          essay: {
            ...essay,
            paragraphs,
            genreLabel: GENRE_MAP[essay.genre] || essay.genre,
            gradeLabel: GRADE_MAP[essay.grade] || `${essay.grade}年级`,
          },
          loading: false,
        });
      } else {
        wx.showToast({ title: '范文不存在', icon: 'none' });
        this.setData({ loading: false });
      }
    }
  },
});
