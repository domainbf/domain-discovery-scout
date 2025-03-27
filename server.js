
// WHOIS查询本地服务器
const express = require('express');
const net = require('net');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// 启用CORS和JSON解析
app.use(cors());
app.use(express.json());

// WHOIS服务器列表
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
  "no": "whois.norid.no"
};

// 通过Socket连接查询WHOIS服务器
function queryWhoisServer(domain, server) {
  return new Promise((resolve, reject) => {
    const client = net.createConnection({ port: 43, host: server }, () => {
      // WHOIS协议：发送域名后跟CRLF
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
    
    // 设置连接超时
    client.setTimeout(10000, () => {
      client.destroy();
      reject(new Error('连接超时'));
    });
  });
}

// 解析WHOIS响应以提取重要信息
function parseWhoisResponse(response) {
  // 始终包含原始数据以便调试和显示
  const result = {
    rawData: response
  };

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
      const nameServerPatterns = [
        /Name Server:\s*(.*?)[\r\n]/ig,
        /Nameservers?:\s*(.*?)[\r\n]/ig,
        /域名服务器:\s*(.*?)[\r\n]/ig,
        /nserver:\s*(.*?)[\r\n]/ig
      ];
      
      for (const pattern of nameServerPatterns) {
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

// WHOIS API路由
app.get('/api/whois', async (req, res) => {
  // 设置正确的Content-Type头
  res.setHeader('Content-Type', 'application/json');
  
  try {
    const domain = req.query.domain;

    if (!domain) {
      return res.status(400).json({ error: '请提供域名参数' });
    }

    // 验证域名格式
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      return res.status(400).json({ error: '无效的域名格式' });
    }

    // 提取顶级域名
    const tld = domain.split('.').pop().toLowerCase();
    const whoisServer = whoisServers[tld];
    
    if (!whoisServer) {
      return res.status(400).json({ error: `不支持的顶级域名: .${tld}` });
    }
    
    console.log(`正在查询WHOIS服务器 ${whoisServer} 获取 ${domain} 的信息...`);
    
    // 查询WHOIS服务器
    const whoisResponse = await queryWhoisServer(domain, whoisServer);
    
    // 解析响应
    const parsedResult = parseWhoisResponse(whoisResponse);
    
    // 返回JSON结果
    return res.status(200).json(parsedResult);
  } catch (error) {
    console.error('WHOIS查询错误:', error);
    return res.status(500).json({
      error: `查询出错: ${error.message}`,
      message: error.toString()
    });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`WHOIS查询服务器已启动在 http://localhost:${PORT}`);
});
