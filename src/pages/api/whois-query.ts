
import { Request, Response } from 'express';
import net from 'net';
import { whoisServers } from '@/utils/whois-servers';

export default async function handler(req: Request, res: Response) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ status: 'ok' });
  }

  try {
    const domain = req.query.domain as string;
    
    if (!domain || typeof domain !== 'string') {
      return res.status(400).json({ error: '请提供域名参数' });
    }

    // 验证域名格式 - 使用更宽松的正则表达式
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?)+$/;
    if (!domainRegex.test(domain)) {
      return res.status(400).json({ error: '无效的域名格式' });
    }

    // 提取顶级域名
    const tld = domain.split('.').pop()?.toLowerCase() || "";
    const whoisServer = whoisServers[tld];
    
    if (!whoisServer) {
      return res.status(404).json({ error: `不支持的顶级域名: .${tld}` });
    }
    
    console.log(`正在查询WHOIS服务器 ${whoisServer} 获取 ${domain} 的信息...`);
    
    // 直接调用WHOIS服务器
    try {
      const whoisData = await queryWhoisServer(domain, whoisServer);
      
      // 检查是否返回了HTML而不是WHOIS数据
      if (whoisData.includes('<!DOCTYPE html>') || whoisData.includes('<html') || whoisData.includes('<body')) {
        return res.status(200).json({ 
          error: `WHOIS服务器 ${whoisServer} 返回了HTML而非预期的文本格式`,
          domain,
          rawData: whoisData.substring(0, 500) + "... (response truncated)"
        });
      }
      
      // 检查是否找不到域名
      if (whoisData.match(/no match|not found|no data found|not registered|no entries found|not available|没有找到|not exist/i)) {
        return res.status(200).json({ 
          domain,
          error: "域名未注册或无法找到记录",
          rawData: whoisData
        });
      }
      
      const parsedResult = parseWhoisResponse(whoisData, domain);
      return res.status(200).json(parsedResult);
    } catch (whoisError) {
      console.error('WHOIS服务器查询错误:', whoisError);
      return res.status(200).json({
        domain,
        error: `WHOIS查询失败: ${whoisError instanceof Error ? whoisError.message : String(whoisError)}`,
        rawData: String(whoisError)
      });
    }
  } catch (error) {
    console.error('WHOIS查询错误:', error);
    return res.status(200).json({
      error: `查询出错: ${error instanceof Error ? error.message : String(error)}`,
      message: String(error)
    });
  }
}

// Query WHOIS server via socket connection with improved error handling
function queryWhoisServer(domain: string, server: string): Promise<string> {
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
    
    // Reduce timeout for faster error response
    client.setTimeout(8000, () => {
      client.destroy();
      reject(new Error('连接超时'));
    });
  });
}

// Parse WHOIS response to extract important information
function parseWhoisResponse(response: string, domain: string) {
  // Always include raw data for debugging and display
  const result: any = {
    domain,
    rawData: response
  };

  // Define regex patterns for different WHOIS data fields
  const patterns: Record<string, RegExp[]> = {
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
    nameservers: [
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

  // Check for empty response
  if (!response || response.trim() === '') {
    result.error = "WHOIS服务器返回空响应";
    return result;
  }

  // Process each pattern
  for (const [field, patternsList] of Object.entries(patterns)) {
    if (field === 'nameservers') {
      const nameServers: string[] = [];
      for (const pattern of patternsList) {
        let match;
        // Reset lastIndex to ensure regex works correctly with global flag
        pattern.lastIndex = 0;
        while ((match = pattern.exec(response)) !== null) {
          if (match[1] && match[1].trim()) {
            nameServers.push(match[1].trim());
          }
        }
      }
      
      if (nameServers.length > 0) {
        result.nameServers = nameServers;
      }
    } else if (field === 'status') {
      const statuses: string[] = [];
      for (const pattern of patternsList) {
        const regex = new RegExp(pattern.source, 'gi'); // Create a global version
        let match;
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

  return result;
}
