
// 直接WHOIS查询无服务器函数，用作备用方案
const net = require('net');

// 解析WHOIS响应以提取重要信息
function parseWhoisResponse(response) {
  // 始终包含原始数据以便调试和显示
  const result = {
    rawData: response
  };

  // Check if the response contains "No match" or similar phrases
  if (response.match(/no match|not found|no data found|not registered|no entries found/i)) {
    result.error = "域名未注册或无法找到记录";
    return result;
  }

  // 为不同的WHOIS数据字段定义正则表达式模式
  const patterns = {
    registrar: [
      /Registrar:\s*(.*?)[\r\n]/i,
      /Sponsoring Registrar:\s*(.*?)[\r\n]/i,
      /注册商:\s*(.*?)[\r\n]/i
    ],
    creationDate: [
      /Creation Date:\s*(.*?)[\r\n]/i, 
      /Created on:\s*(.*?)[\r\n]/i,
      /Registration Date:\s*(.*?)[\r\n]/i,
      /注册时间:\s*(.*?)[\r\n]/i,
      /Registry Creation Date:\s*(.*?)[\r\n]/i
    ],
    expiryDate: [
      /Expir(?:y|ation) Date:\s*(.*?)[\r\n]/i,
      /Registry Expiry Date:\s*(.*?)[\r\n]/i,
      /Expiration Date:\s*(.*?)[\r\n]/i,
      /到期时间:\s*(.*?)[\r\n]/i
    ],
    lastUpdated: [
      /Updated Date:\s*(.*?)[\r\n]/i,
      /Last Modified:\s*(.*?)[\r\n]/i,
      /更新时间:\s*(.*?)[\r\n]/i,
      /Last update:\s*(.*?)[\r\n]/i,
      /Update Date:\s*(.*?)[\r\n]/i
    ],
    status: [
      /Status:\s*(.*?)[\r\n]/i,
      /Domain Status:\s*(.*?)[\r\n]/i,
      /状态:\s*(.*?)[\r\n]/i
    ],
    nameServers: [
      /Name Server:\s*(.*?)[\r\n]/ig,
      /Nameservers?:\s*(.*?)[\r\n]/ig,
      /域名服务器:\s*(.*?)[\r\n]/ig,
      /nserver:\s*(.*?)[\r\n]/ig
    ],
    registrant: [
      /Registrant(?:\s+Organization)?:\s*(.*?)[\r\n]/i,
      /注册人:\s*(.*?)[\r\n]/i,
      /Registrant Name:\s*(.*?)[\r\n]/i
    ],
    registrantEmail: [
      /Registrant Email:\s*(.*?)[\r\n]/i,
      /注册人邮箱:\s*(.*?)[\r\n]/i
    ],
    registrantPhone: [
      /Registrant Phone(?:\s+Number)?:\s*(.*?)[\r\n]/i,
      /注册人电话:\s*(.*?)[\r\n]/i
    ]
  };

  // 处理每个模式
  for (const [field, patternsList] of Object.entries(patterns)) {
    if (field === 'nameServers') {
      const nameServers = [];
      for (const pattern of patternsList) {
        let match;
        const regex = new RegExp(pattern.source, 'gi'); // 为每次迭代创建新的正则表达式
        while ((match = regex.exec(response)) !== null) {
          if (match[1] && match[1].trim()) {
            nameServers.push(match[1].trim());
          }
        }
      }
      if (nameServers.length > 0) {
        result.nameServers = nameServers;
      }
    } else {
      for (const pattern of patternsList) {
        const match = response.match(pattern);
        if (match && match[1] && match[1].trim()) {
          result[field] = match[1].trim();
          break;
        }
      }
    }
  }

  return result;
}

// 直接通过Socket连接查询WHOIS服务器
function queryWhoisServer(domain, server) {
  return new Promise((resolve, reject) => {
    console.log(`直接连接到WHOIS服务器 ${server} 查询 ${domain}...`);
    
    const client = net.createConnection({ port: 43, host: server }, () => {
      // WHOIS协议：发送域名后跟CRLF
      client.write(domain + '\r\n');
    });
    
    let data = '';
    client.on('data', (chunk) => {
      data += chunk.toString();
    });
    
    client.on('end', () => {
      console.log(`成功从 ${server} 获取到 ${domain} 的信息`);
      resolve(data);
    });
    
    client.on('error', (err) => {
      console.error(`连接到 ${server} 失败:`, err);
      reject(err);
    });
    
    // 设置连接超时（15秒）
    client.setTimeout(15000, () => {
      console.error(`连接到 ${server} 超时`);
      client.destroy();
      reject(new Error('连接超时'));
    });
  });
}

// 主API处理函数
module.exports = async (req, res) => {
  // 设置CORS和内容类型头
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理OPTIONS请求
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ status: 'ok' });
  }

  // 只允许GET和POST请求
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: '只支持 GET 和 POST 请求' });
  }

  try {
    // 获取查询参数
    const domain = req.query.domain || (req.body && req.body.domain);
    const server = req.query.server || (req.body && req.body.server);

    if (!domain) {
      return res.status(400).json({ error: '请提供域名参数' });
    }

    if (!server) {
      return res.status(400).json({ error: '请提供WHOIS服务器参数' });
    }

    // 更新域名验证规则，支持单字符域名和国别域名
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*(\.[a-zA-Z]{2,})+$/;
    if (!domainRegex.test(domain)) {
      return res.status(400).json({ error: '无效的域名格式' });
    }
    
    console.log(`正在通过无服务器函数直接查询WHOIS服务器 ${server} 获取 ${domain} 的信息...`);
    
    try {
      // 查询WHOIS服务器
      const whoisResponse = await queryWhoisServer(domain, server);
      
      // 检查响应是否为空
      if (!whoisResponse || whoisResponse.trim() === '') {
        return res.status(200).json({
          error: "WHOIS服务器返回空响应",
          rawData: "No data returned from server"
        });
      }
      
      // 检查响应是否包含HTML
      if (whoisResponse.includes('<!DOCTYPE html>') || whoisResponse.includes('<html')) {
        return res.status(200).json({
          error: "WHOIS服务器返回了HTML而非预期的文本格式",
          rawData: whoisResponse.substring(0, 500) + "... (response trimmed)"
        });
      }
      
      // 解析响应
      const parsedResult = parseWhoisResponse(whoisResponse);
      
      // 返回JSON结果
      return res.status(200).json(parsedResult);
    } catch (serverError) {
      console.error(`无服务器函数: 连接到WHOIS服务器 ${server} 失败:`, serverError);
      
      // 返回更详细的错误信息和状态码400而非500，因为这是客户端请求的问题（无法连接到指定的WHOIS服务器）
      return res.status(400).json({
        error: `连接到WHOIS服务器失败: ${serverError.message}`,
        message: `无法连接到 ${server}，请确认该服务器是否可用。详细错误: ${serverError.toString()}`
      });
    }
  } catch (error) {
    console.error('无服务器函数: WHOIS查询错误:', error);
    
    // 返回更清晰的错误消息
    return res.status(500).json({
      error: `查询出错: ${error.message}`,
      message: error.toString()
    });
  }
};
