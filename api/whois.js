
// Serverless function to handle WHOIS queries
const net = require('net');

// WHOIS servers list - consistent with src/utils/whois-servers.ts
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
  "bb": "whois.nic.bb",
  "fi": "whois.fi",
  "dk": "whois.dk-hostmaster.dk",
  "nz": "whois.srs.net.nz",
  "pl": "whois.dns.pl",
  "be": "whois.dns.be",
  "br": "whois.registro.br",
  "eu": "whois.eu",
  // Added TLDs from whois-servers.ts
  "app": "whois.nic.google",
  "dev": "whois.nic.google",
  "top": "whois.nic.top",
  "xyz": "whois.nic.xyz",
  "online": "whois.nic.online",
  "site": "whois.nic.site",
  "club": "whois.nic.club",
  // Additional country code TLDs
  "rw": "whois.ricta.org.rw",
  "ge": "whois.nic.ge", // 格鲁吉亚域名服务器
  "kr": "whois.kr",
  "hk": "whois.hkirc.hk",
  "tw": "whois.twnic.net.tw",
  "sg": "whois.sgnic.sg",
  "my": "whois.mynic.my",
  "id": "whois.id",
  "th": "whois.thnic.co.th",
  "ph": "whois.dot.ph",
  "vn": "whois.vnnic.vn",
  "mx": "whois.mx",
  "ar": "whois.nic.ar",
  "cl": "whois.nic.cl",
  "za": "whois.registry.net.za"
};

// 特殊TLD处理 - 某些TLD有特殊的查询要求
const specialTldHandlers = {
  "ge": function(domain) {
    return {
      error: `格鲁吉亚(.ge)域名需通过官方网站查询: https://registration.ge/`,
      rawData: `格鲁吉亚域名管理机构不提供标准WHOIS查询接口，请访问 https://registration.ge/ 查询 ${domain} 的信息。`,
      domain: domain
    };
  }
};

// Query WHOIS server via socket connection
function queryWhoisServer(domain, server) {
  return new Promise((resolve, reject) => {
    console.log(`尝试连接到WHOIS服务器: ${server} 查询域名: ${domain}`);
    
    const client = net.createConnection({ port: 43, host: server }, () => {
      // WHOIS protocol: Send domain name followed by CRLF
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
    
    // Set timeout for the connection
    client.setTimeout(10000, () => {
      console.error(`连接到 ${server} 超时`);
      client.destroy();
      reject(new Error('Connection timeout'));
    });
  });
}

// Parse WHOIS response to extract important information
function parseWhoisResponse(response, domain) {
  // Always include raw data for debugging and display
  const result = {
    rawData: response,
    domain: domain
  };

  // Check if the response contains "No match" or similar phrases
  if (response.match(/no match|not found|no data found|not registered|no entries found/i)) {
    result.error = "域名未注册或无法找到记录";
    return result;
  }

  // Check if response contains HTML
  if (response.includes('<!DOCTYPE html>') || response.includes('<html')) {
    result.error = "WHOIS服务器返回了HTML而非预期的文本格式";
    return result;
  }

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
      return res.status(400).json({ 
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
          error: "WHOIS服务器返回空响应",
          rawData: "No data returned from server",
          domain: domain
        });
      }
      
      // Check if response contains HTML
      if (whoisResponse.includes('<!DOCTYPE html>') || whoisResponse.includes('<html')) {
        return res.status(200).json({
          error: `WHOIS服务器 ${whoisServer} 返回了HTML而非预期的文本格式`,
          rawData: whoisResponse.substring(0, 500) + "... (response trimmed)",
          domain: domain
        });
      }
      
      // Parse the response
      const parsedResult = parseWhoisResponse(whoisResponse, domain);
      
      // Return the result as JSON
      return res.status(200).json(parsedResult);
    } catch (serverError) {
      console.error(`连接到WHOIS服务器 ${whoisServer} 失败:`, serverError);
      return res.status(200).json({
        error: `连接到WHOIS服务器失败: ${serverError.message}`,
        rawData: `无法连接到 ${whoisServer}，请确认该服务器是否可用。详细错误: ${serverError.toString()}`,
        domain: domain
      });
    }
  } catch (error) {
    console.error('WHOIS查询错误:', error);
    return res.status(500).json({
      error: `查询出错: ${error.message}`,
      rawData: error.toString()
    });
  }
};
