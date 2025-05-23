
/**
 * API Helper utility to handle WHOIS and RDAP queries through a local proxy
 */

// Check if response contains HTML content with improved detection
export const isHtmlResponse = (content: string): boolean => {
  return content.trim().startsWith('<!DOCTYPE html>') || 
         content.trim().startsWith('<html') ||
         content.includes('<body') ||
         content.includes('<head') ||
         content.includes('<div') && content.includes('</div>') ||
         content.includes('<script') && content.includes('</script>');
};

// Parse response safely, ensuring JSON format with better error handling
export const safeParseResponse = async (response: Response): Promise<any> => {
  const contentType = response.headers.get('content-type');
  
  // First check if the response is empty
  if (!response.ok) {
    console.error(`API请求失败，HTTP状态码: ${response.status}`);
    throw new Error(`API请求失败，HTTP状态码: ${response.status}`);
  }
  
  const responseText = await response.text();
  
  // Check if response is completely empty
  if (!responseText || responseText.trim() === '') {
    console.error('API返回了空响应，可能服务器端出现问题');
    throw new Error('API返回了空响应，可能是由于网络问题或服务器错误');
  }
  
  // Check if we got HTML instead of JSON
  if (isHtmlResponse(responseText) || (contentType && contentType.includes('text/html'))) {
    console.error('API返回了HTML而非预期的JSON数据', responseText.substring(0, 200));
    throw new Error('API返回了HTML而非JSON数据，可能是由于服务器配置问题');
  }
  
  try {
    // Try to parse the response as JSON
    return JSON.parse(responseText);
  } catch (e) {
    console.error('解析API响应失败:', responseText.substring(0, 200));
    throw new Error(`解析响应失败: ${e instanceof Error ? e.message : String(e)}\n原始响应: ${responseText.substring(0, 200)}...`);
  }
};

// Make a fetch request with proper error handling and retry logic
export const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeoutMs = 30000): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const fetchOptions = {
      ...options,
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Domain-Info-Tool/1.0',
        ...(options.headers || {})
      },
      cache: 'no-store' as RequestCache
    };
    
    // Add retry logic for network errors
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        console.log(`尝试请求API (尝试 ${attempts + 1}/${maxAttempts}): ${url}`);
        const response = await fetch(url, fetchOptions);
        clearTimeout(timeoutId);
        
        // Check if response is ok
        if (!response.ok) {
          console.warn(`API请求失败，HTTP状态码: ${response.status} ${response.statusText}`);
          if (response.status === 429) {
            throw new Error('请求频率过高，请稍后再试');
          }
          if (response.status === 500) {
            // 尝试读取错误信息
            const errorText = await response.text();
            console.error(`服务器错误 (500)，响应内容: ${errorText.substring(0, 200)}`);
            throw new Error(`服务器内部错误: ${errorText.substring(0, 100)}`);
          }
        }
        
        return response;
      } catch (fetchError) {
        attempts++;
        
        // If it's the last attempt, throw the error
        if (attempts >= maxAttempts) {
          throw fetchError;
        }
        
        // Wait before retrying - exponential backoff
        const waitTime = Math.pow(2, attempts) * 1000;
        console.log(`请求失败，${waitTime}ms后重试，错误: ${fetchError}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        console.log(`重试请求，第 ${attempts + 1} 次，共 ${maxAttempts} 次`);
      }
    }
    
    // This should never be reached, but TypeScript requires a return
    throw new Error('所有请求尝试均失败');
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('请求超时，请稍后再试');
    }
    
    // Improve error messages
    if (error instanceof Error) {
      if (error.message.includes('networkerror') || error.message.includes('failed to fetch')) {
        throw new Error('网络连接错误，请检查您的网络连接');
      }
      
      if (error.message.includes('CORS')) {
        throw new Error('跨域请求被阻止，这可能是由于安全设置导致的');
      }
    }
    
    throw error;
  }
};

// Query our local API proxy for WHOIS data with improved error handling
export const queryLocalWhois = async (domain: string, type: string = 'whois'): Promise<any> => {
  try {
    console.log(`使用本地API代理查询${type === 'rdap' ? 'RDAP' : 'WHOIS'}: ${domain}`);
    
    // Use proxy API for better error handling
    const apiEndpoint = `/api/whois-query?domain=${encodeURIComponent(domain)}&type=${type}`;
    console.log(`请求API端点: ${apiEndpoint}`);
    
    const response = await fetchWithTimeout(
      apiEndpoint,
      { 
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      },
      30000 // 30秒超时
    );
    
    // Now handle the response with our improved parser
    const result = await safeParseResponse(response);
    
    // Check if the response contains valid data
    if (!result) {
      throw new Error(`API返回了无效的数据格式`);
    }
    
    // If we have an error in the result, propagate it
    if (result.error) {
      console.warn(`API返回错误: ${result.error}`);
    }
    
    return result;
  } catch (error) {
    console.error(`本地API代理查询失败:`, error);
    throw error;
  }
};

// Query domain info through our proxy API with improved error handling
export const queryDomainInfoProxy = async (domain: string): Promise<any> => {
  try {
    console.log(`使用代理API查询域名信息: ${domain}`);
    
    const response = await fetchWithTimeout(
      `/api/domain-info?domain=${encodeURIComponent(domain)}&format=json`,
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      },
      30000 // 30秒超时
    );
    
    return await safeParseResponse(response);
  } catch (error) {
    console.error('代理API查询失败:', error);
    throw error;
  }
};

// Direct WHOIS query using the dedicated WHOIS endpoint
export const queryDirectWhois = async (domain: string): Promise<any> => {
  try {
    console.log(`使用直接WHOIS API查询: ${domain}`);
    
    const response = await fetchWithTimeout(
      `/api/whois-direct?domain=${encodeURIComponent(domain)}`,
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      },
      30000 // 30秒超时
    );
    
    return await safeParseResponse(response);
  } catch (error) {
    console.error('直接WHOIS查询失败:', error);
    throw error;
  }
};
