const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext();

  try {
    const userRes = await db.collection('users').where({ _openid: OPENID }).get();

    if (userRes.data.length === 0) {
      const newUser = {
        _openid: OPENID,
        nickname: '',
        avatar: '',
        membership: 'free',
        dailyUsage: 0,
        totalEssays: 0,
        createdAt: db.serverDate(),
        updatedAt: db.serverDate(),
      };
      await db.collection('users').add({ data: newUser });
      return { code: 0, data: newUser, isNew: true };
    }

    return { code: 0, data: userRes.data[0], isNew: false };
  } catch (err) {
    console.error('登录失败:', err);
    return { code: -1, message: '登录失败', error: err.message };
  }
};
