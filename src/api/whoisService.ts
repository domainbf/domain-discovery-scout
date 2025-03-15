
// This file simulates the WHOIS API service
// In a real implementation, this would be a backend server endpoint

export interface WhoisResult {
  registrar?: string;
  creationDate?: string;
  expiryDate?: string;
  status?: string;
  error?: string;
}

const whoisServers: Record<string, string> = {
  "com": "whois.verisign-grs.com",
  "net": "whois.verisign-grs.com",
  "org": "whois.pir.org",
  "cn": "whois.cnnic.cn",
  "io": "whois.nic.io"
};

// This is a frontend mock since we can't directly connect to WHOIS servers from the browser
// In a real implementation, this would be a backend API call
export async function queryWhois(domain: string): Promise<WhoisResult> {
  try {
    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      return { error: "无效的域名格式" };
    }

    const tld = domain.split('.').pop() || "";
    
    if (!whoisServers[tld]) {
      return { error: "不支持的顶级域名" };
    }
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock data based on domain
    // In a real app, this would come from a server that actually queries WHOIS servers
    if (domain === "google.com") {
      return {
        registrar: "MarkMonitor Inc.",
        creationDate: "1997-09-15T04:00:00Z",
        expiryDate: "2028-09-14T04:00:00Z",
        status: "clientUpdateProhibited clientTransferProhibited clientDeleteProhibited serverDeleteProhibited serverTransferProhibited serverUpdateProhibited"
      };
    } else if (domain === "microsoft.com") {
      return {
        registrar: "MarkMonitor Inc.",
        creationDate: "1991-05-02T04:00:00Z",
        expiryDate: "2021-05-03T04:00:00Z",
        status: "clientDeleteProhibited clientTransferProhibited clientUpdateProhibited"
      };
    } else if (domain === "baidu.com") {
      return {
        registrar: "MarkMonitor Inc.",
        creationDate: "1999-10-11T04:00:00Z",
        expiryDate: "2026-10-11T04:00:00Z",
        status: "clientDeleteProhibited clientTransferProhibited clientUpdateProhibited"
      };
    } else {
      // Generate random data for testing
      const currentDate = new Date();
      const creationDate = new Date(currentDate.getTime() - Math.random() * 1000 * 3600 * 24 * 365 * 10);
      const expiryDate = new Date(currentDate.getTime() + Math.random() * 1000 * 3600 * 24 * 365 * 5);
      
      return {
        registrar: "Example Registrar, LLC",
        creationDate: creationDate.toISOString(),
        expiryDate: expiryDate.toISOString(),
        status: "clientTransferProhibited"
      };
    }
  } catch (error) {
    console.error("WHOIS query error:", error);
    return { error: `查询出错: ${error instanceof Error ? error.message : String(error)}` };
  }
}
