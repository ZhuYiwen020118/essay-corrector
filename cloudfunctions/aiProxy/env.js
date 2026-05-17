/**
 * 云函数服务端配置
 * 优先从 process.env 读取（云开发控制台环境变量），兜底使用硬编码值
 * 云函数代码运行在服务端，不会暴露给客户端
 */
module.exports = {
  TENCENT_SECRET_ID:  process.env.TENCENT_SECRET_ID  || 'your-tencent-secret-id',
  TENCENT_SECRET_KEY: process.env.TENCENT_SECRET_KEY || 'your-tencent-secret-key',
  ZHIPU_API_KEY:      process.env.ZHIPU_API_KEY      || 'your-zhipu-api-key',
  ZHIPU_BASE_URL:     process.env.ZHIPU_BASE_URL     || 'https://open.bigmodel.cn/api/paas/v4',
  ZHIPU_MODEL:        process.env.ZHIPU_MODEL        || 'glm-4.7-flash',
};
