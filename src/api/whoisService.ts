
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

// Real domain data - more accurate than random generation
const knownDomains: Record<string, WhoisResult> = {
  "google.com": {
    registrar: "MarkMonitor Inc.",
    creationDate: "1997-09-15T04:00:00Z",
    expiryDate: "2028-09-14T04:00:00Z",
    status: "clientUpdateProhibited clientTransferProhibited clientDeleteProhibited serverDeleteProhibited serverTransferProhibited serverUpdateProhibited"
  },
  "microsoft.com": {
    registrar: "MarkMonitor Inc.",
    creationDate: "1991-05-02T04:00:00Z",
    expiryDate: "2024-05-03T04:00:00Z",
    status: "clientDeleteProhibited clientTransferProhibited clientUpdateProhibited"
  },
  "baidu.com": {
    registrar: "MarkMonitor Inc.",
    creationDate: "1999-10-11T04:00:00Z",
    expiryDate: "2024-10-11T04:00:00Z",
    status: "clientDeleteProhibited clientTransferProhibited clientUpdateProhibited"
  },
  "apple.com": {
    registrar: "CSC Corporate Domains, Inc.",
    creationDate: "1987-02-19T05:00:00Z",
    expiryDate: "2024-02-20T05:00:00Z",
    status: "clientTransferProhibited serverDeleteProhibited serverTransferProhibited serverUpdateProhibited"
  },
  "amazon.com": {
    registrar: "MarkMonitor Inc.",
    creationDate: "1994-11-01T05:00:00Z",
    expiryDate: "2024-10-31T04:00:00Z",
    status: "clientTransferProhibited clientUpdateProhibited clientDeleteProhibited"
  },
  "taobao.com": {
    registrar: "Alibaba Cloud Computing Ltd. d/b/a HiChina",
    creationDate: "1999-04-21T04:00:00Z",
    expiryDate: "2024-04-21T04:00:00Z",
    status: "clientTransferProhibited"
  },
  "tencent.com": {
    registrar: "DNSPod, Inc.",
    creationDate: "1998-11-11T05:00:00Z",
    expiryDate: "2024-11-11T05:00:00Z",
    status: "clientTransferProhibited"
  },
  "alibaba.com": {
    registrar: "Alibaba Cloud Computing Ltd. d/b/a HiChina",
    creationDate: "1999-05-04T04:00:00Z",
    expiryDate: "2024-05-04T04:00:00Z",
    status: "clientTransferProhibited"
  }
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
    
    // Check if we have predefined data for this domain
    const lowerDomain = domain.toLowerCase();
    if (knownDomains[lowerDomain]) {
      return knownDomains[lowerDomain];
    }
    
    // For unknown domains, generate more reasonable data
    // This simulates a real WHOIS response better than completely random dates
    const currentYear = new Date().getFullYear();
    const randomPastYear = currentYear - Math.floor(Math.random() * 20) - 1; // 1-20 years ago
    const randomFutureYear = currentYear + Math.floor(Math.random() * 5) + 1; // 1-5 years in future
    
    const creationDate = new Date(randomPastYear, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
    const expiryDate = new Date(randomFutureYear, creationDate.getMonth(), creationDate.getDate());
    
    const registrars = [
      "GoDaddy.com, LLC",
      "Namecheap, Inc.",
      "NameSilo, LLC",
      "Alibaba Cloud Computing Ltd. d/b/a HiChina",
      "DNSPod, Inc.",
      "Dynadot, LLC"
    ];
    
    const statuses = [
      "clientTransferProhibited",
      "clientDeleteProhibited clientTransferProhibited",
      "clientUpdateProhibited clientTransferProhibited",
      "ok"
    ];
    
    return {
      registrar: registrars[Math.floor(Math.random() * registrars.length)],
      creationDate: creationDate.toISOString(),
      expiryDate: expiryDate.toISOString(),
      status: statuses[Math.floor(Math.random() * statuses.length)]
    };
  } catch (error) {
    console.error("WHOIS query error:", error);
    return { error: `查询出错: ${error instanceof Error ? error.message : String(error)}` };
  }
}
