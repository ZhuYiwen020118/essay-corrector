const ESSAYS = require('../../data/essays');
const { GENRES, GRADES } = require('../../utils/constants');

const GENRE_MAP = {};
GENRES.forEach(g => { GENRE_MAP[g.value] = g.label; });

const ESSAYS_WITH_LABEL = ESSAYS.map(e => ({
  ...e,
  genreLabel: GENRE_MAP[e.genre] || e.genre,
}));

Page({
  data: {
    essays: ESSAYS_WITH_LABEL,
    genres: GENRES,
    grades: GRADES,
    activeGenre: '',
    activeGrade: 0,
    filteredEssays: ESSAYS_WITH_LABEL,
  },

  onFilterGenre(e) {
    const genre = e.currentTarget.dataset.value;
    const activeGenre = this.data.activeGenre === genre ? '' : genre;
    this.setData({ activeGenre });
    this.applyFilter(activeGenre, this.data.activeGrade);
  },

  onFilterGrade(e) {
    const grade = parseInt(e.currentTarget.dataset.value) || 0;
    const activeGrade = this.data.activeGrade === grade ? 0 : grade;
    this.setData({ activeGrade });
    this.applyFilter(this.data.activeGenre, activeGrade);
  },

  applyFilter(genre, grade) {
    let filtered = ESSAYS_WITH_LABEL;
    if (genre) filtered = filtered.filter(e => e.genre === genre);
    if (grade) filtered = filtered.filter(e => e.grade === grade);
    this.setData({ filteredEssays: filtered });
  },

  onViewEssay(e) {
    const { id } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/reference/detail?id=${id}` });
  },
});
