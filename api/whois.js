
// Serverless function to handle WHOIS queries
const net = require('net');

// WHOIS servers list
const whoisServers = {
  "com": "whois.verisign-grs.com",
  "net": "whois.verisign-grs.com",
  "org": "whois.pir.org",
  "cn": "whois.cnnic.cn",
  "io": "whois.nic.io",
  "info": "whois.afilias.net",
  "biz": "whois.neulevel.biz",
  "mobi": "whois.dotmobiregistry.net",
  "name": "whois.nic.name",
  "co": "whois.nic.co",
  "tv": "whois.nic.tv",
  "me": "whois.nic.me",
  "cc": "ccwhois.verisign-grs.com",
  "us": "whois.nic.us",
  "de": "whois.denic.de",
  "uk": "whois.nic.uk",
  "jp": "whois.jprs.jp",
  "fr": "whois.nic.fr",
  "au": "whois.auda.org.au",
  "ru": "whois.tcinet.ru",
  "ch": "whois.nic.ch",
  "es": "whois.nic.es",
  "ca": "whois.cira.ca",
  "in": "whois.registry.in",
  "nl": "whois.domain-registry.nl",
  "it": "whois.nic.it",
  "se": "whois.iis.se",
  "no": "whois.norid.no",
  "bb": "whois.nic.bb"  // 例如：添加巴巴多斯域名服务器
};

// Query WHOIS server via socket connection
function queryWhoisServer(domain, server) {
  return new Promise((resolve, reject) => {
    const client = net.createConnection({ port: 43, host: server }, () => {
      // WHOIS protocol: Send domain name followed by CRLF
      client.write(domain + '\r\n');
    });
    
    let data = '';
    client.on('data', (chunk) => {
      data += chunk.toString();
    });
    
    client.on('end', () => {
      resolve(data);
    });
    
    client.on('error', (err) => {
      reject(err);
    });
    
    // Set timeout for the connection
    client.setTimeout(10000, () => {
      client.destroy();
      reject(new Error('Connection timeout'));
    });
  });
}

// Parse WHOIS response to extract important information
function parseWhoisResponse(response) {
  // Always include raw data for debugging and display
  const result = {
    rawData: response
  };

  // Define regex patterns for different WHOIS data fields
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

  // Process each pattern
  for (const [field, patternsList] of Object.entries(patterns)) {
    if (field === 'nameServers') {
      const nameServers = [];
      for (const pattern of patternsList) {
        let match;
        const regex = new RegExp(pattern.source, 'gi'); // Create a new regex for each iteration
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

  try {
    // Get domain from query parameter or request body
    const domain = (req.method === 'GET') 
      ? req.query.domain 
      : (req.body ? req.body.domain : null);

    if (!domain) {
      return res.status(400).json({ error: '请提供域名参数' });
    }

    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      return res.status(400).json({ error: '无效的域名格式' });
    }

    // Extract the TLD
    const tld = domain.split('.').pop().toLowerCase();
    const whoisServer = whoisServers[tld];
    
    if (!whoisServer) {
      return res.status(400).json({ error: `不支持的顶级域名: .${tld}，请在whoisServers对象中添加对应的WHOIS服务器` });
    }
    
    console.log(`正在查询WHOIS服务器 ${whoisServer} 获取 ${domain} 的信息...`);
    
    try {
      // Query the WHOIS server
      const whoisResponse = await queryWhoisServer(domain, whoisServer);
      
      // Parse the response
      const parsedResult = parseWhoisResponse(whoisResponse);
      
      // Return the result as JSON
      return res.status(200).json(parsedResult);
    } catch (serverError) {
      console.error(`连接到WHOIS服务器 ${whoisServer} 失败:`, serverError);
      return res.status(500).json({
        error: `连接到WHOIS服务器失败: ${serverError.message}`,
        message: `无法连接到 ${whoisServer}，请确认该服务器是否可用。详细错误: ${serverError.toString()}`
      });
    }
  } catch (error) {
    console.error('WHOIS查询错误:', error);
    return res.status(500).json({
      error: `查询出错: ${error.message}`,
      message: error.toString()
    });
  }
};
