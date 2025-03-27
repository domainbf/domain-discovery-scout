
// 服务器健康检查API
module.exports = async (req, res) => {
  // 设置CORS和内容类型头
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  // 处理OPTIONS请求
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ status: 'ok' });
  }

  // 只允许GET请求
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '只支持 GET 请求' });
  }

  // 返回健康状态
  return res.status(200).json({
    status: 'online',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
};
