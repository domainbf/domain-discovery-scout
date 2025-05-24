
/**
 * API Helper utility to handle WHOIS and RDAP queries through a local proxy
 */

export const queryLocalWhois = async (domain: string, type: string = 'whois'): Promise<any> => {
  try {
    console.log(`查询域名: ${domain}, 类型: ${type}`);
    
    const apiEndpoint = type === 'rdap' 
      ? `/api/domain-info?domain=${encodeURIComponent(domain)}&source=rdap`
      : `/api/domain-info?domain=${encodeURIComponent(domain)}&source=whois`;
    
    const response = await fetch(apiEndpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`);
    }
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error(`API查询失败:`, error);
    throw error;
  }
};

export const queryDirectWhois = async (domain: string): Promise<any> => {
  try {
    console.log(`直接WHOIS查询: ${domain}`);
    
    const response = await fetch(`/api/whois-direct?domain=${encodeURIComponent(domain)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`直接查询失败: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('直接WHOIS查询失败:', error);
    throw error;
  }
};

export const queryDomainInfoProxy = async (domain: string): Promise<any> => {
  return queryLocalWhois(domain, 'whois');
};
