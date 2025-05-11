
// Utility functions for WHOIS serverless API

// WHOIS response parser
function parseWhoisResponse(response, domain) {
  // Always include raw data for debugging and display
  const result = {
    domain: domain,
    rawData: response
  };

  // Check for empty response
  if (!response || response.trim() === '') {
    result.error = "WHOIS服务器返回空响应";
    return result;
  }

  // Check if the response contains "No match" or similar phrases
  if (response.match(/no match|not found|no data found|not registered|no entries found|not available/i)) {
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
      /注册商:\s*(.*?)[\r\n]/i,
      /registrar:\s*(.*?)[\r\n]/i
    ],
    creationDate: [
      /Creation Date:\s*(.*?)[\r\n]/i, 
      /Created on:\s*(.*?)[\r\n]/i,
      /Registration Date:\s*(.*?)[\r\n]/i,
      /注册时间:\s*(.*?)[\r\n]/i,
      /Registry Creation Date:\s*(.*?)[\r\n]/i,
      /Created:\s*(.*?)[\r\n]/i,
      /created:\s*(.*?)[\r\n]/i
    ],
    expiryDate: [
      /Expir(?:y|ation) Date:\s*(.*?)[\r\n]/i,
      /Registry Expiry Date:\s*(.*?)[\r\n]/i,
      /Expiration Date:\s*(.*?)[\r\n]/i,
      /到期时间:\s*(.*?)[\r\n]/i,
      /expires:\s*(.*?)[\r\n]/i,
      /Expires:\s*(.*?)[\r\n]/i
    ],
    lastUpdated: [
      /Updated Date:\s*(.*?)[\r\n]/i,
      /Last Modified:\s*(.*?)[\r\n]/i,
      /更新时间:\s*(.*?)[\r\n]/i,
      /Last update(?:d)?:\s*(.*?)[\r\n]/i,
      /Update Date:\s*(.*?)[\r\n]/i,
      /modified:\s*(.*?)[\r\n]/i,
      /Changed:\s*(.*?)[\r\n]/i
    ],
    status: [
      /Status:\s*(.*?)[\r\n]/i,
      /Domain Status:\s*(.*?)[\r\n]/i,
      /状态:\s*(.*?)[\r\n]/i,
      /status:\s*(.*?)[\r\n]/ig
    ],
    nameServers: [
      /Name Server:\s*(.*?)[\r\n]/ig,
      /Nameservers?:\s*(.*?)[\r\n]/ig,
      /域名服务器:\s*(.*?)[\r\n]/ig,
      /nserver:\s*(.*?)[\r\n]/ig,
      /name server:\s*(.*?)[\r\n]/ig
    ],
    registrant: [
      /Registrant(?:\s+Organization)?:\s*(.*?)[\r\n]/i,
      /注册人:\s*(.*?)[\r\n]/i,
      /Registrant Name:\s*(.*?)[\r\n]/i,
      /registrant:\s*(.*?)[\r\n]/i
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
    } else if (field === 'status') {
      const statuses = [];
      for (const pattern of patternsList) {
        let match;
        const regex = new RegExp(pattern.source, 'gi'); // Global match for multiple statuses
        while ((match = regex.exec(response)) !== null) {
          if (match[1] && match[1].trim()) {
            statuses.push(match[1].trim());
          }
        }
      }
      if (statuses.length > 0) {
        result.status = statuses;
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

  // If no data was extracted but we have raw text, try alternative patterns
  if (!result.registrar && !result.creationDate && !result.nameServers) {
    // Try to extract any data from key-value patterns like "Key: Value"
    const keyValuePattern = /^([^:]+):\s*(.+?)$/gm;
    let match;
    while ((match = keyValuePattern.exec(response)) !== null) {
      const key = match[1].trim().toLowerCase();
      const value = match[2].trim();
      
      if (!value) continue;
      
      if (key.includes('registrar')) {
        result.registrar = value;
      } else if (key.includes('created') || key.includes('registered') || key.includes('creation')) {
        result.creationDate = value;
      } else if (key.includes('expir') || key.includes('renewal')) {
        result.expiryDate = value;
      } else if (key.includes('updated') || key.includes('modified')) {
        result.lastUpdated = value;
      } else if (key.includes('name server') || key.includes('nameserver') || key.includes('nserver')) {
        if (!result.nameServers) result.nameServers = [];
        result.nameServers.push(value);
      } else if (key.includes('status')) {
        if (!result.status) result.status = [];
        result.status.push(value);
      }
    }
  }

  // 如果仍然没有提取到关键信息但原始数据非空，则确保至少包含域名
  if (!result.registrar && !result.creationDate && !result.nameServers && response.length > 10) {
    result.source = "raw-whois";
    // 尝试匹配服务器特定的响应格式
    const lines = response.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.length > 5 && !trimmedLine.startsWith('#') && !trimmedLine.startsWith('%')) {
        // 尝试根据行内容猜测信息类型
        if (trimmedLine.toLowerCase().includes('registration') || trimmedLine.toLowerCase().includes('date')) {
          if (!result.creationDate) result.creationDate = trimmedLine;
        } else if (trimmedLine.toLowerCase().includes('registrar')) {
          if (!result.registrar) result.registrar = trimmedLine;
        } else if (trimmedLine.toLowerCase().includes('name server')) {
          if (!result.nameServers) result.nameServers = [trimmedLine];
        }
      }
    }
  }

  return result;
}

// Query WHOIS server via socket connection with improved error handling
function queryWhoisServer(domain, server) {
  const net = require('net');
  
  return new Promise((resolve, reject) => {
    console.log(`尝试连接到WHOIS服务器: ${server} 查询域名: ${domain}`);
    
    const client = net.createConnection({ port: 43, host: server }, () => {
      // WHOIS protocol: Send domain name followed by CRLF
      client.write(domain + '\r\n');
    });
    
    let data = '';
    let receivedData = false;
    
    client.on('data', (chunk) => {
      receivedData = true;
      data += chunk.toString();
    });
    
    client.on('end', () => {
      if (receivedData) {
        console.log(`成功从 ${server} 获取到 ${domain} 的信息`);
        resolve(data);
      } else {
        console.warn(`连接到 ${server} 关闭但未接收到数据`);
        reject(new Error('No data received'));
      }
    });
    
    client.on('error', (err) => {
      console.error(`连接到 ${server} 失败:`, err);
      reject(err);
    });
    
    // Set timeout for the connection (increased for slower servers)
    client.setTimeout(20000, () => {
      console.error(`连接到 ${server} 超时`);
      client.destroy();
      reject(new Error('Connection timeout'));
    });
  });
}

// Special TLD handling - Some TLDs have specific query requirements
const specialTldHandlers = {
  "ge": function(domain) {
    return {
      domain: domain,
      registrar: "Georgian Domain Name Registry",
      source: "special-handler",
      status: ["registryLocked"],
      nameservers: ["使用官方网站查询"],
      created: "请访问官方网站查询",
      updated: "请访问官方网站查询",
      expires: "请访问官方网站查询",
      message: `格鲁吉亚(.ge)域名需通过官方网站查询: https://registration.ge/`,
      rawData: `格鲁吉亚域名管理机构不提供标准WHOIS查询接口，请访问 https://registration.ge/ 查询 ${domain} 的信息。`
    };
  }
};

module.exports = {
  parseWhoisResponse,
  queryWhoisServer,
  specialTldHandlers
};
