
// WHOIS Parser - Parses raw WHOIS text responses
import { WhoisResult, Contact } from '../types/WhoisTypes';

/**
 * Simple function to parse basic WHOIS text when receiving non-JSON responses
 */
export function parseBasicWhoisText(text: string, domain: string): WhoisResult {
  const result: WhoisResult = {
    domain,
    source: 'direct-whois-text',
    rawData: text
  };
  
  if (!text || text.trim() === '') {
    result.error = "WHOIS服务器返回空响应";
    return result;
  }
  
  // Check if the response contains "No match" or similar phrases that indicate domain is not registered
  if (text.match(/no match|not found|no data found|not registered|no entries found|没有找到|not exist/i)) {
    result.error = "域名未注册或无法找到记录";
    return result;
  }
  
  // Define regex patterns for different WHOIS data fields
  const patterns: Record<string, RegExp[]> = {
    registrar: [
      /Registrar:\s*(.*?)[\r\n]/i,
      /Sponsoring Registrar:\s*(.*?)[\r\n]/i,
      /注册商:\s*(.*?)[\r\n]/i,
      /registrar:\s*(.*?)[\r\n]/i,
      /Registrar Name:\s*(.*?)[\r\n]/i
    ],
    created: [
      /Creation Date:\s*(.*?)[\r\n]/i, 
      /Created on:\s*(.*?)[\r\n]/i,
      /Registration Date:\s*(.*?)[\r\n]/i,
      /注册时间:\s*(.*?)[\r\n]/i,
      /Registry Creation Date:\s*(.*?)[\r\n]/i,
      /Created:\s*(.*?)[\r\n]/i,
      /created:\s*(.*?)[\r\n]/i,
      /Domain Create Date:\s*(.*?)[\r\n]/i
    ],
    expires: [
      /Expir(?:y|ation) Date:\s*(.*?)[\r\n]/i,
      /Registry Expiry Date:\s*(.*?)[\r\n]/i,
      /Expiration Date:\s*(.*?)[\r\n]/i,
      /到期时间:\s*(.*?)[\r\n]/i,
      /expires:\s*(.*?)[\r\n]/i,
      /Expires:\s*(.*?)[\r\n]/i,
      /Domain Expiration Date:\s*(.*?)[\r\n]/i
    ],
    updated: [
      /Updated Date:\s*(.*?)[\r\n]/i,
      /Last Modified:\s*(.*?)[\r\n]/i,
      /更新时间:\s*(.*?)[\r\n]/i,
      /Last update(?:d)?:\s*(.*?)[\r\n]/i,
      /Update Date:\s*(.*?)[\r\n]/i,
      /modified:\s*(.*?)[\r\n]/i,
      /Changed:\s*(.*?)[\r\n]/i,
      /Domain Last Updated Date:\s*(.*?)[\r\n]/i
    ],
    registrantName: [
      /Registrant(?:\s+Organization)?:\s*(.*?)[\r\n]/i,
      /注册人:\s*(.*?)[\r\n]/i,
      /Registrant Name:\s*(.*?)[\r\n]/i,
      /registrant:\s*(.*?)[\r\n]/i
    ],
    registrantEmail: [
      /Registrant Email:\s*(.*?)[\r\n]/i,
      /注册人邮箱:\s*(.*?)[\r\n]/i,
      /Registrant Contact Email:\s*(.*?)[\r\n]/i
    ],
    registrantPhone: [
      /Registrant Phone(?:\s+Number)?:\s*(.*?)[\r\n]/i,
      /注册人电话:\s*(.*?)[\r\n]/i,
      /Registrant Contact Phone:\s*(.*?)[\r\n]/i
    ],
    dnssec: [
      /DNSSEC:\s*(.*?)[\r\n]/i
    ]
  };
  
  // Process each pattern to extract information
  for (const [field, patternsList] of Object.entries(patterns)) {
    for (const pattern of patternsList) {
      const match = text.match(pattern);
      if (match && match[1] && match[1].trim()) {
        if (field === 'registrantName' || field === 'registrantEmail' || field === 'registrantPhone') {
          // Create registrant object if it doesn't exist
          if (!result.registrant) {
            result.registrant = {};
          }
          
          if (field === 'registrantName') {
            result.registrant.name = match[1].trim();
          } else if (field === 'registrantEmail') {
            result.registrant.email = [match[1].trim()];
          } else if (field === 'registrantPhone') {
            result.registrant.phone = [match[1].trim()];
          }
          
          // Also set legacy fields for backward compatibility
          if (field === 'registrantEmail') result.registrantEmail = match[1].trim();
          if (field === 'registrantPhone') result.registrantPhone = match[1].trim();
        } else if (field === 'dnssec') {
          // Convert DNSSEC string to boolean
          const dnssecValue = match[1].trim().toLowerCase();
          result.dnssec = dnssecValue === 'yes' || dnssecValue === 'true' || dnssecValue === 'signed';
        } else {
          (result as any)[field] = match[1].trim(); // Using type assertion
          
          // Also set legacy field names for backward compatibility
          if (field === 'created') result.creationDate = match[1].trim();
          if (field === 'expires') result.expiryDate = match[1].trim();
          if (field === 'updated') result.lastUpdated = match[1].trim();
        }
        
        break;
      }
    }
  }
  
  // Extract nameservers
  const nameserverPatterns = [
    /Name Server:\s*(.*?)[\r\n]/ig,
    /Nameservers?:\s*(.*?)[\r\n]/ig,
    /域名服务器:\s*(.*?)[\r\n]/ig,
    /nserver:\s*(.*?)[\r\n]/ig,
    /name server:\s*(.*?)[\r\n]/ig,
    /DNS服务器:\s*(.*?)[\r\n]/ig
  ];
  
  const nameservers: string[] = [];
  for (const pattern of nameserverPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1] && match[1].trim()) {
        nameservers.push(match[1].trim());
      }
    }
  }
  
  if (nameservers.length > 0) {
    result.nameservers = nameservers;
  }
  
  // Extract status
  const statusPatterns = [
    /Status:\s*(.*?)[\r\n]/ig,
    /Domain Status:\s*(.*?)[\r\n]/ig,
    /状态:\s*(.*?)[\r\n]/ig,
    /status:\s*(.*?)[\r\n]/ig
  ];
  
  const statuses: string[] = [];
  for (const pattern of statusPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1] && match[1].trim()) {
        statuses.push(match[1].trim());
      }
    }
  }
  
  if (statuses.length > 0) {
    result.status = statuses;
  }
  
  // 如果什么都没提取到但有原始数据，则设置基本信息
  if (!result.registrar && !result.created && !result.expires && !result.nameservers && text.length > 0) {
    // Attempt to extract key-value pairs from formatted text
    const keyValuePattern = /^([^:]+):\s*(.+?)$/gm;
    let match;
    
    while ((match = keyValuePattern.exec(text)) !== null) {
      const key = match[1].trim().toLowerCase();
      const value = match[2].trim();
      
      if (!value) continue;
      
      if (key.includes('registrar')) {
        result.registrar = value;
      } else if (key.includes('creation') || key.includes('created') || key.includes('regist')) {
        if (!result.created) {
          result.created = value;
          result.creationDate = value;
        }
      } else if (key.includes('expir') || key.includes('renew')) {
        if (!result.expires) {
          result.expires = value;
          result.expiryDate = value;
        }
      } else if (key.includes('updat') || key.includes('modif')) {
        if (!result.updated) {
          result.updated = value;
          result.lastUpdated = value;
        }
      } else if (key.includes('name server') || key.includes('nameserver') || key.includes('ns ')) {
        if (!result.nameservers) result.nameservers = [];
        result.nameservers.push(value);
      } else if (key.includes('status')) {
        if (!result.status) result.status = [];
        result.status.push(value);
      } else if (key.includes('registrant') || key.includes('owner')) {
        if (!result.registrant) result.registrant = {};
        result.registrant.name = value;
      }
    }
    
    // 至少显示一些基本信息
    result.source = 'raw-whois';
  }
  
  return result;
}

/**
 * Convert the new domain-info API format to the legacy WhoisResult format for backward compatibility
 */
export function convertToLegacyFormat(info: WhoisResult): WhoisResult {
  // Create a copy to avoid mutating the original
  const result = { ...info };
  
  // Forward compatibility fields
  if (info.created && !info.creationDate) result.creationDate = info.created;
  if (info.expires && !info.expiryDate) result.expiryDate = info.expires;
  if (info.updated && !info.lastUpdated) result.lastUpdated = info.updated;
  
  // Backward compatibility fields
  if (info.creationDate && !info.created) result.created = info.creationDate;
  if (info.expiryDate && !info.expires) result.expires = info.expiryDate;
  if (info.lastUpdated && !info.updated) result.updated = info.lastUpdated;
  
  // Registrant information
  if (info.registrant) {
    if (info.registrant.email && info.registrant.email.length > 0) {
      result.registrantEmail = info.registrant.email[0];
    }
    
    if (info.registrant.phone && info.registrant.phone.length > 0) {
      result.registrantPhone = info.registrant.phone[0];
    }
  }
  
  return result;
}
