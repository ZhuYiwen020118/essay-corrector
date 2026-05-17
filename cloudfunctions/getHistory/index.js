const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  const { page = 1, pageSize = 20 } = event;

  const countRes = await db.collection('reports')
    .where({ _openid: OPENID })
    .count();

  const reports = await db.collection('reports')
    .where({ _openid: OPENID })
    .orderBy('createdAt', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get();

  const essayIds = [...new Set(reports.data.map(r => r.essayId))];
  const essays = await db.collection('essays')
    .where({ _id: db.command.in(essayIds) })
    .get();
  const essayMap = {};
  essays.data.forEach(e => { essayMap[e._id] = e; });

  const list = reports.data.map(r => ({
    _id: r._id,
    essayId: r.essayId,
    overall_score: r.overall_score,
    level: r.level,
    essay_title: essayMap[r.essayId]?.title || '未命名',
    essay_content: (essayMap[r.essayId]?.content || '').slice(0, 80),
    createdAt: r.createdAt,
  }));

  return {
    code: 0,
    data: list,
    total: countRes.total,
    page,
    pageSize,
  };
};
