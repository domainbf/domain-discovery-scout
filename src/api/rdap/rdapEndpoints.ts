
// RDAP endpoints for different TLDs

export const rdapEndpoints: Record<string, string> = {
  "com": "https://rdap.verisign.com/com/v1/",
  "net": "https://rdap.verisign.com/net/v1/",
  "org": "https://rdap.publicinterestregistry.org/rdap/",
  "info": "https://rdap.afilias.net/rdap/",
  "biz": "https://rdap.bizregistry.net/rdap/",
  "io": "https://rdap.nic.io/",
  "app": "https://rdap.nominet.uk/app/",
  "dev": "https://rdap.nominet.uk/dev/",
  "xyz": "https://rdap.centralnic.com/xyz/",
  "online": "https://rdap.centralnic.com/online/",
  "site": "https://rdap.centralnic.com/site/",
  "club": "https://rdap.nic.club/"
};

// List of TLDs known to support RDAP
export const rdapSupportedTlds: string[] = [
  "com", "net", "org", "info", "biz", "io", "app", "dev", 
  "xyz", "online", "site", "club", "edu", "gov", "us", "ca"
];

// Check if a TLD supports RDAP protocol
export function isRdapSupported(tld: string): boolean {
  return rdapSupportedTlds.includes(tld.toLowerCase()) || tld in rdapEndpoints;
}

// Get RDAP endpoint for a domain
export function getRdapEndpoint(domain: string): string {
  const tld = domain.split('.').pop()?.toLowerCase() || "";
  
  if (tld in rdapEndpoints) {
    return `${rdapEndpoints[tld]}domain/${encodeURIComponent(domain)}`;
  }
  
  // Default to RDAP bootstrap service
  return `https://rdap.org/domain/${encodeURIComponent(domain)}`;
}
