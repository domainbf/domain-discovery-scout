
// Serverless function to handle WHOIS queries
const whoisServers = require('./whois-servers');
const { parseWhoisResponse, queryWhoisServer, specialTldHandlers } = require('./whois-utils');

// Main API handler function
module.exports = async (req, res) => {
  // CRITICAL: Always set correct Content-Type header first to ensure JSON response
  res.setHeader('Content-Type', 'application/json');
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ status: 'ok' });
  }

  // Only allow GET and POST requests
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: '只支持 GET 和 POST 请求' });
  }

  let domain = null;

  try {
    // Get domain from query parameter or request body
    domain = (req.method === 'GET') 
      ? req.query.domain 
      : (req.body ? req.body.domain : null);

    if (!domain) {
      return res.status(400).json({ error: '请提供域名参数' });
    }

    // 更新域名格式验证，支持单字符域名和更多类型域名
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*(\.[a-zA-Z]{2,})+$/;
    if (!domainRegex.test(domain)) {
      return res.status(400).json({ error: '无效的域名格式' });
    }

    // Extract the TLD
    const tld = domain.split('.').pop().toLowerCase();
    
    // Check if this is a special TLD with custom handling
    if (specialTldHandlers[tld]) {
      console.log(`使用特殊处理程序处理 .${tld} 域名: ${domain}`);
      const result = specialTldHandlers[tld](domain);
      return res.status(200).json(result);
    }
    
    const whoisServer = whoisServers[tld];
    
    if (!whoisServer) {
      return res.status(200).json({ 
        domain: domain,
        error: `不支持的顶级域名: .${tld}`,
        rawData: `未找到 .${tld} 的WHOIS服务器配置，请在whoisServers中添加对应服务器。`
      });
    }
    
    console.log(`正在查询WHOIS服务器 ${whoisServer} 获取 ${domain} 的信息...`);
    
    try {
      // Query the WHOIS server
      const whoisResponse = await queryWhoisServer(domain, whoisServer);
      
      // Check if response is empty
      if (!whoisResponse || whoisResponse.trim() === '') {
        return res.status(200).json({
          domain: domain,
          error: "WHOIS服务器返回空响应",
          rawData: "No data returned from server"
        });
      }
      
      // Check if response contains HTML
      if (whoisResponse.includes('<!DOCTYPE html>') || whoisResponse.includes('<html')) {
        return res.status(200).json({
          domain: domain,
          error: `WHOIS服务器 ${whoisServer} 返回了HTML而非预期的文本格式`,
          rawData: whoisResponse.substring(0, 500) + "... (response trimmed)"
        });
      }
      
      // Parse the response
      const parsedResult = parseWhoisResponse(whoisResponse, domain);
      
      // Make sure domain is included in the result
      if (!parsedResult.domain) {
        parsedResult.domain = domain;
      }
      
      // Return the result as JSON
      return res.status(200).json(parsedResult);
    } catch (serverError) {
      console.error(`连接到WHOIS服务器 ${whoisServer} 失败:`, serverError);
      return res.status(200).json({
        domain: domain,
        error: `连接到WHOIS服务器失败: ${serverError.message}`,
        rawData: `无法连接到 ${whoisServer}，请确认该服务器是否可用。详细错误: ${serverError.toString()}`
      });
    }
  } catch (error) {
    console.error('WHOIS查询错误:', error);
    return res.status(200).json({
      domain: domain || "unknown",
      error: `查询出错: ${error.message}`,
      rawData: error.toString()
    });
  }
};
