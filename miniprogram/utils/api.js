/** 通用云函数调用 */
async function callCloud(name, data = {}) {
  try {
    const res = await wx.cloud.callFunction({ name, data });
    return res.result;
  } catch (err) {
    console.error(`云函数 [${name}] 调用失败:`, err);
    throw err;
  }
}

/** 微信登录 */
async function login() {
  return callCloud('login');
}

/** 获取历史记录 */
async function getHistory({ page = 1, pageSize = 20 } = {}) {
  return callCloud('getHistory', { page, pageSize });
}

module.exports = { login, getHistory };
