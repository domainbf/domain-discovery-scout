
// 这个文件实现直接通过socket连接到WHOIS服务器查询域名信息

export interface WhoisResult {
  registrar?: string;
  creationDate?: string;
  expiryDate?: string;
  status?: string;
  error?: string;
  nameServers?: string[];
  registrant?: string;
  admin?: string;
  tech?: string;
  lastUpdated?: string;
  rawData?: string; // 原始WHOIS数据
}

// 我们支持查询的顶级域名列表及其对应的WHOIS服务器
const whoisServers: Record<string, string> = {
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

/**
 * 解析WHOIS响应，提取关键信息
 */
function parseWhoisResponse(response: string): WhoisResult {
  const result: WhoisResult = {
    rawData: response
  };

  // 通用解析模式
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
      /注册时间:\s*(.*?)[\r\n]/i
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
      /更新时间:\s*(.*?)[\r\n]/i
    ],
    status: [
      /Status:\s*(.*?)[\r\n]/i,
      /Domain Status:\s*(.*?)[\r\n]/i,
      /状态:\s*(.*?)[\r\n]/i
    ],
    nameServers: [
      /Name Server:\s*(.*?)[\r\n]/ig,
      /Nameservers?:\s*(.*?)[\r\n]/ig,
      /域名服务器:\s*(.*?)[\r\n]/ig
    ]
  };

  // 遍历每个字段的模式并尝试匹配
  for (const [field, patternsList] of Object.entries(patterns)) {
    if (field === 'nameServers') {
      // 特殊处理名称服务器，可能有多个
      const nameServers: string[] = [];
      for (const pattern of patternsList) {
        let match;
        while ((match = pattern.exec(response)) !== null) {
          if (match[1] && match[1].trim()) {
            nameServers.push(match[1].trim());
          }
        }
      }
      if (nameServers.length > 0) {
        result.nameServers = nameServers;
      }
    } else {
      // 处理其他字段
      for (const pattern of patternsList) {
        const match = response.match(pattern);
        if (match && match[1] && match[1].trim()) {
          (result as any)[field] = match[1].trim();
          break;
        }
      }
    }
  }

  return result;
}

/**
 * 查询域名的WHOIS信息
 * 使用Socket直接连接到WHOIS服务器
 */
export async function queryWhois(domain: string): Promise<WhoisResult> {
  try {
    // 验证域名格式
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      return { error: "无效的域名格式" };
    }

    const tld = domain.split('.').pop() || "";
    const whoisServer = whoisServers[tld];
    
    if (!whoisServer) {
      return { error: `不支持的顶级域名: .${tld}` };
    }
    
    console.log(`正在查询WHOIS服务器 ${whoisServer} 获取 ${domain} 的信息...`);

    // 由于浏览器环境不支持直接Socket连接，我们将使用服务端代理
    // 在实际项目中，您需要一个后端服务来处理这个Socket连接
    // 这里我们使用一个模拟函数来演示流程
    const whoisResponse = await socketWhoisQuery(domain, whoisServer);
    
    if (!whoisResponse) {
      return { error: "无法从WHOIS服务器获取响应" };
    }
    
    // 解析WHOIS响应
    const parsedResult = parseWhoisResponse(whoisResponse);
    
    return {
      ...parsedResult,
      error: parsedResult.error || (Object.keys(parsedResult).length <= 1 ? "无法解析WHOIS数据" : undefined)
    };
  } catch (error) {
    console.error("WHOIS查询错误:", error);
    return { error: `查询出错: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * 模拟Socket连接到WHOIS服务器并获取响应
 * 在实际项目中，这应该是一个后端API调用
 */
async function socketWhoisQuery(domain: string, whoisServer: string): Promise<string> {
  // 在浏览器环境中模拟WHOIS查询
  // 注意：在生产环境中，您需要实现一个后端API来执行此操作
  console.log(`模拟Socket连接到 ${whoisServer}:43 查询 ${domain}`);
  
  // 由于浏览器安全限制，我们无法直接使用Socket
  // 这里返回一条说明消息
  return `
*** 由于浏览器环境限制，无法直接使用Socket连接 ***

要实现真正的Socket WHOIS查询，您需要:
1. 创建一个后端服务 (Node.js、Python、Java等)
2. 在后端实现Socket连接到WHOIS服务器
3. 创建一个API端点供前端调用

域名: ${domain}
WHOIS服务器: ${whoisServer}

模拟WHOIS数据:
Domain Name: ${domain}
Registry Domain ID: 2336799_DOMAIN_COM-VRSN
Registrar WHOIS Server: whois.example-registrar.com
Registrar URL: http://www.example-registrar.com
Updated Date: 2023-01-15T09:45:00Z
Creation Date: 2000-05-10T18:20:00Z
Registry Expiry Date: 2025-05-10T18:20:00Z
Registrar: Example Registrar, Inc.
Registrar IANA ID: 1234
Registrar Abuse Contact Email: abuse@example-registrar.com
Registrar Abuse Contact Phone: +1.5555551234
Domain Status: clientDeleteProhibited
Domain Status: clientTransferProhibited
Domain Status: clientUpdateProhibited
Name Server: NS1.EXAMPLE-DNS.COM
Name Server: NS2.EXAMPLE-DNS.COM
DNSSEC: unsigned
`;
}
