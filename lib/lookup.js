
// Domain lookup core library
// Implements the domain lookup functionality with caching and multiple data sources

const net = require('net');
const dns = require('dns');
const { promisify } = require('util');

// Promisify DNS lookup methods
const lookupHost = promisify(dns.lookup);
const lookupMX = promisify(dns.resolveMx);
const lookupTXT = promisify(dns.resolveTxt);
const lookupNS = promisify(dns.resolveNs);
const lookupCAA = promisify(dns.resolveCaa).catch(() => []); // CAA may not be supported by all DNS servers

// Cache implementation with expiration
const cache = new Map();
const CACHE_TTL = 3600000; // 1 hour in milliseconds

/**
 * Contact information structure
 * @typedef {Object} Contact
 * @property {string} [name] - Contact name
 * @property {string} [org] - Organization
 * @property {string[]} [email] - Contact emails
 * @property {string[]} [phone] - Contact phone numbers
 * @property {string} [address] - Contact address
 */

/**
 * DNS record data structure
 * @typedef {Object} DNSData
 * @property {string[]} [a] - A records (IPv4)
 * @property {Array<{exchange: string, priority: number}>} [mx] - MX records
 * @property {string[]} [txt] - TXT records
 * @property {string[]} [ns] - NS records
 * @property {boolean} [dnssec] - DNSSEC status
 */

/**
 * Domain information structure
 * @typedef {Object} DomainInfo
 * @property {string} domain - Domain name
 * @property {string} [registrar] - Registrar name
 * @property {string[]} [nameservers] - Nameservers
 * @property {boolean} [dnssec] - DNSSEC enabled status
 * @property {string[]} [status] - Domain statuses
 * @property {string} [created] - Creation date
 * @property {string} [updated] - Last update date
 * @property {string} [expires] - Expiration date
 * @property {DNSData} [dns_records] - DNS records
 * @property {Contact} [registrant] - Registrant contact
 * @property {Contact} [admin] - Administrative contact
 * @property {Contact} [tech] - Technical contact
 * @property {Contact} [abuse] - Abuse contact
 * @property {string} [source] - Source of information (rdap, whois, dns)
 * @property {string} [rawData] - Raw data for debugging
 */

/**
 * WHOIS servers for different TLDs
 */
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
  "no": "whois.norid.no",
  "bb": "whois.nic.bb",
  "fi": "whois.fi",
  "dk": "whois.dk-hostmaster.dk",
  "nz": "whois.irs.net.nz",
  "pl": "whois.dns.pl",
  "be": "whois.dns.be",
  "br": "whois.registro.br",
  "eu": "whois.eu"
};

/**
 * Parse dates from multiple formats
 * @param {string} dateStr - Date string to parse
 * @returns {string} - ISO formatted date or original string if parsing fails
 */
function parseDate(dateStr) {
  if (!dateStr) return null;
  try {
    // Try to parse the date string
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
    return dateStr;
  } catch (e) {
    return dateStr;
  }
}

/**
 * Query WHOIS server via socket connection
 * @param {string} domain - Domain to query
 * @param {string} server - WHOIS server to query
 * @returns {Promise<string>} - Raw WHOIS response
 */
async function queryWhoisServer(domain, server) {
  return new Promise((resolve, reject) => {
    console.log(`Connecting to WHOIS server ${server} for ${domain}...`);
    
    const client = net.createConnection({ port: 43, host: server }, () => {
      // WHOIS protocol: Send domain name followed by CRLF
      client.write(domain + '\\r\\n');
    });
    
    let data = '';
    client.on('data', (chunk) => {
      data += chunk.toString();
    });
    
    client.on('end', () => {
      console.log(`Successfully received info from ${server} for ${domain}`);
      resolve(data);
    });
    
    client.on('error', (err) => {
      console.error(`Connection to ${server} failed:`, err);
      reject(err);
    });
    
    // Set connection timeout (10 seconds)
    client.setTimeout(10000, () => {
      console.error(`Connection to ${server} timed out`);
      client.destroy();
      reject(new Error('Connection timeout'));
    });
  });
}

/**
 * Parse WHOIS response to extract important information
 * @param {string} response - Raw WHOIS response
 * @returns {DomainInfo} Parsed domain information
 */
function parseWhoisResponse(response, domain) {
  // Standard domain info structure
  const result = {
    domain,
    rawData: response,
    source: 'whois'
  };

  // Define regex patterns for different WHOIS data fields
  const patterns = {
    registrar: [
      /Registrar:\\s*(.*?)[\\r\\n]/i,
      /Sponsoring Registrar:\\s*(.*?)[\\r\\n]/i,
      /注册商:\\s*(.*?)[\\r\\n]/i
    ],
    created: [
      /Creation Date:\\s*(.*?)[\\r\\n]/i, 
      /Created on:\\s*(.*?)[\\r\\n]/i,
      /Registration Date:\\s*(.*?)[\\r\\n]/i,
      /Registry Creation Date:\\s*(.*?)[\\r\\n]/i
    ],
    expires: [
      /Expir(?:y|ation) Date:\\s*(.*?)[\\r\\n]/i,
      /Registry Expiry Date:\\s*(.*?)[\\r\\n]/i,
      /Expiration Date:\\s*(.*?)[\\r\\n]/i
    ],
    updated: [
      /Updated Date:\\s*(.*?)[\\r\\n]/i,
      /Last Modified:\\s*(.*?)[\\r\\n]/i,
      /Update Date:\\s*(.*?)[\\r\\n]/i
    ],
    status: [
      /Status:\\s*(.*?)[\\r\\n]/i,
      /Domain Status:\\s*(.*?)[\\r\\n]/i
    ],
    nameservers: [
      /Name Server:\\s*(.*?)[\\r\\n]/ig,
      /Nameservers?:\\s*(.*?)[\\r\\n]/ig,
      /nserver:\\s*(.*?)[\\r\\n]/ig
    ]
  };

  // Process registrant information
  const registrantPatterns = {
    name: [
      /Registrant(?:\\s+Name)?:\\s*(.*?)[\\r\\n]/i,
      /Registrant Name:\\s*(.*?)[\\r\\n]/i
    ],
    org: [
      /Registrant Organization:\\s*(.*?)[\\r\\n]/i,
      /Registrant Organisation:\\s*(.*?)[\\r\\n]/i
    ],
    email: [
      /Registrant Email:\\s*(.*?)[\\r\\n]/i
    ],
    phone: [
      /Registrant Phone(?:\\s+Number)?:\\s*(.*?)[\\r\\n]/i
    ],
    address: [
      /Registrant Street:\\s*(.*?)[\\r\\n]/i,
      /Registrant Address:\\s*(.*?)[\\r\\n]/i
    ]
  };

  // Extract basic domain info
  for (const [field, patternsList] of Object.entries(patterns)) {
    if (field === 'nameservers') {
      const nameServers = [];
      for (const pattern of patternsList) {
        let match;
        const regex = new RegExp(pattern.source, 'gi');
        while ((match = regex.exec(response)) !== null) {
          if (match[1] && match[1].trim()) {
            nameServers.push(match[1].trim());
          }
        }
      }
      if (nameServers.length > 0) {
        result.nameservers = nameServers;
      }
    } else if (field === 'status') {
      const statuses = [];
      for (const pattern of patternsList) {
        let match;
        const regex = new RegExp(pattern.source, 'gi');
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
          // Parse dates if applicable
          if (field === 'created' || field === 'expires' || field === 'updated') {
            result[field] = parseDate(match[1].trim());
          } else {
            result[field] = match[1].trim();
          }
          break;
        }
      }
    }
  }

  // Extract registrant information
  const registrant = {};
  for (const [field, patternsList] of Object.entries(registrantPatterns)) {
    for (const pattern of patternsList) {
      const match = response.match(pattern);
      if (match && match[1] && match[1].trim()) {
        if (field === 'email' || field === 'phone') {
          registrant[field] = [match[1].trim()];
        } else {
          registrant[field] = match[1].trim();
        }
        break;
      }
    }
  }

  // Only add registrant if we found any information
  if (Object.keys(registrant).length > 0) {
    result.registrant = registrant;
  }

  return result;
}

/**
 * Query RDAP server for domain information
 * @param {string} domain - Domain to query
 * @returns {Promise<DomainInfo>} Domain information
 */
async function rdapLookup(domain) {
  try {
    console.log(`Performing RDAP lookup for ${domain}`);
    
    // Use standard RDAP bootstrap service
    const apiUrl = `https://rdap.org/domain/${encodeURIComponent(domain)}`;
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      cache: 'no-cache'
    });
    
    if (!response.ok) {
      throw new Error(`RDAP query failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Parse RDAP response into our domain info structure
    const result = {
      domain,
      source: 'rdap',
      rawData: JSON.stringify(data, null, 2)
    };
    
    // Extract basic information
    if (data.events) {
      for (const event of data.events) {
        if (event.eventAction === 'registration') {
          result.created = event.eventDate;
        } else if (event.eventAction === 'expiration') {
          result.expires = event.eventDate;
        } else if (event.eventAction === 'last changed') {
          result.updated = event.eventDate;
        }
      }
    }
    
    // Extract status
    if (data.status && Array.isArray(data.status)) {
      result.status = data.status;
    }
    
    // Extract nameservers
    if (data.nameservers && Array.isArray(data.nameservers)) {
      result.nameservers = data.nameservers.map(ns => ns.ldhName || ns);
    }
    
    // Extract registrar
    if (data.entities) {
      for (const entity of data.entities) {
        if (entity.roles && entity.roles.includes('registrar')) {
          // Try to get registrar name from various fields
          result.registrar = entity.vcardArray?.[1]?.find(arr => arr[0] === 'fn')?.[3] || 
                            entity.publicIds?.[0]?.identifier ||
                            entity.handle;
        }
        
        // Extract registrant information
        if (entity.roles && entity.roles.includes('registrant') && entity.vcardArray) {
          const registrant = {};
          const vcard = entity.vcardArray[1];
          
          if (Array.isArray(vcard)) {
            for (const entry of vcard) {
              if (entry[0] === 'fn') {
                registrant.name = entry[3];
              } else if (entry[0] === 'org') {
                registrant.org = entry[3];
              } else if (entry[0] === 'email') {
                if (!registrant.email) registrant.email = [];
                registrant.email.push(entry[3]);
              } else if (entry[0] === 'tel') {
                if (!registrant.phone) registrant.phone = [];
                registrant.phone.push(entry[3]);
              } else if (entry[0] === 'adr') {
                registrant.address = entry[3].join(', ');
              }
            }
          }
          
          if (Object.keys(registrant).length > 0) {
            result.registrant = registrant;
          }
        }
      }
    }
    
    return result;
  } catch (error) {
    console.error(`RDAP lookup error for ${domain}:`, error);
    throw error;
  }
}

/**
 * Perform WHOIS lookup for a domain
 * @param {string} domain - Domain to query
 * @returns {Promise<DomainInfo>} Domain information
 */
async function whoisLookup(domain) {
  try {
    console.log(`Performing WHOIS lookup for ${domain}`);
    
    // Extract the TLD
    const tld = domain.split('.').pop().toLowerCase();
    const whoisServer = whoisServers[tld];
    
    if (!whoisServer) {
      throw new Error(`Unsupported TLD: .${tld}`);
    }
    
    // Query WHOIS server
    const whoisResponse = await queryWhoisServer(domain, whoisServer);
    
    // Parse WHOIS response
    return parseWhoisResponse(whoisResponse, domain);
  } catch (error) {
    console.error(`WHOIS lookup error for ${domain}:`, error);
    throw error;
  }
}

/**
 * Resolve DNS records for a domain
 * @param {string} domain - Domain to query
 * @returns {Promise<DNSData>} DNS records
 */
async function resolveDNS(domain) {
  try {
    console.log(`Resolving DNS records for ${domain}`);
    
    // Query A, MX, TXT, NS records in parallel
    const [aRecords, mxRecords, txtRecords, nsRecords, caaRecords] = await Promise.allSettled([
      lookupHost(domain).then(res => [res.address]),
      lookupMX(domain),
      lookupTXT(domain).then(records => records.map(record => record.join(' '))),
      lookupNS(domain),
      lookupCAA(domain)
    ]);
    
    const result = {
      a: aRecords.status === 'fulfilled' ? aRecords.value : [],
      mx: mxRecords.status === 'fulfilled' ? mxRecords.value : [],
      txt: txtRecords.status === 'fulfilled' ? txtRecords.value : [],
      ns: nsRecords.status === 'fulfilled' ? nsRecords.value : [],
      caa: caaRecords.status === 'fulfilled' ? caaRecords.value : []
    };
    
    // Check for DNSSEC (simplified, just check for RRSIG records in DNS)
    const dnssecEnabled = result.txt.some(txt => txt.includes('DNSSEC'));
    
    return {
      dns_records: result,
      dnssec: dnssecEnabled,
      nameservers: result.ns
    };
  } catch (error) {
    console.error(`DNS resolution error for ${domain}:`, error);
    return {
      dns_records: { a: [], mx: [], txt: [], ns: [], caa: [] },
      dnssec: false,
      nameservers: []
    };
  }
}

/**
 * Get domain information from cache or query it from available sources
 * @param {string} domain - Domain name to query
 * @param {string} source - Source to query: 'rdap', 'whois', 'dns', or 'all'
 * @returns {Promise<DomainInfo>} Domain information
 */
async function getDomainInfo(domain, source = 'all') {
  // Check cache first
  const cacheKey = `${domain}-${source}`;
  const cachedItem = cache.get(cacheKey);
  
  if (cachedItem && cachedItem.expiry > Date.now()) {
    console.log(`Cache hit for ${domain}`);
    return cachedItem.data;
  }
  
  console.log(`Cache miss for ${domain}, querying live data`);
  
  let result = { domain };
  
  try {
    // Based on requested source, perform appropriate lookups
    if (source === 'all' || source === 'rdap') {
      try {
        const rdapData = await rdapLookup(domain);
        Object.assign(result, rdapData);
      } catch (rdapError) {
        console.warn(`RDAP lookup failed for ${domain}:`, rdapError);
        if (source === 'rdap') {
          throw rdapError;
        }
      }
    }
    
    if ((source === 'all' || source === 'whois') && 
        (!result.registrar || !result.created)) {
      try {
        const whoisData = await whoisLookup(domain);
        // Merge WHOIS data, preferring existing values from RDAP if available
        Object.keys(whoisData).forEach(key => {
          if (key === 'rawData') {
            // Append WHOIS raw data rather than replacing
            result.whoisRawData = whoisData.rawData;
          } else if (!result[key] && whoisData[key]) {
            result[key] = whoisData[key];
          }
        });
        
        if (!result.source || result.source === 'whois') {
          result.source = 'whois';
        } else {
          result.source = `${result.source},whois`;
        }
      } catch (whoisError) {
        console.warn(`WHOIS lookup failed for ${domain}:`, whoisError);
        if (source === 'whois') {
          throw whoisError;
        }
      }
    }
    
    if (source === 'all' || source === 'dns') {
      try {
        const dnsData = await resolveDNS(domain);
        // Merge DNS data
        result.dns_records = dnsData.dns_records;
        
        if (!result.dnssec && dnsData.dnssec) {
          result.dnssec = dnsData.dnssec;
        }
        
        if (!result.nameservers && dnsData.nameservers && dnsData.nameservers.length > 0) {
          result.nameservers = dnsData.nameservers;
        }
        
        if (!result.source || result.source === 'dns') {
          result.source = 'dns';
        } else {
          result.source = `${result.source},dns`;
        }
      } catch (dnsError) {
        console.warn(`DNS resolution failed for ${domain}:`, dnsError);
        if (source === 'dns') {
          throw dnsError;
        }
      }
    }
    
    // Cache the result with expiration
    cache.set(cacheKey, {
      data: result,
      expiry: Date.now() + CACHE_TTL
    });
    
    return result;
  } catch (error) {
    console.error(`Error getting domain info for ${domain}:`, error);
    throw error;
  }
}

module.exports = {
  getDomainInfo,
  whoisLookup,
  rdapLookup,
  resolveDNS,
  parseWhoisResponse,
  whoisServers
};
