
// Types for WHOIS and RDAP services

export interface Contact {
  name?: string;
  org?: string;
  email?: string[];
  phone?: string[];
  address?: string;
  country?: string; 
}

export interface DNSData {
  a?: string[];
  mx?: Array<{exchange: string, priority: number}>;
  txt?: string[];
  ns?: string[];
  caa?: any[];
  dnssec?: boolean;
}

export interface WhoisResult {
  domain?: string;
  registrar?: string;
  nameservers?: string[];
  dnssec?: boolean;
  status?: string[];
  created?: string;
  updated?: string;
  expires?: string;
  dns_records?: DNSData;
  registrant?: Contact;
  admin?: Contact;
  tech?: Contact;
  abuse?: Contact;
  source?: string;
  error?: string;
  rawData?: string;
  creationDate?: string; // For backward compatibility
  expiryDate?: string;   // For backward compatibility
  lastUpdated?: string;  // For backward compatibility
  registrantEmail?: string; // For backward compatibility
  registrantPhone?: string; // For backward compatibility
  tldSupported?: boolean; // Added for TLD support indication
  errorDetails?: {
    cors?: boolean;
    network?: boolean;
    timeout?: boolean;
    apiError?: boolean;
    serverError?: boolean;
    notSupported?: boolean;
    formatError?: boolean; // Added for format validation errors
    parseError?: boolean;  // Added for parsing errors
    patternError?: boolean; // Added for pattern matching errors
    notFound?: boolean;    // Added for domain not found errors
    statusCode?: number;   // Added for HTTP status codes
  };  // Added for more detailed error information
  alternativeLinks?: Array<{name: string, url: string}>; // For providing alternative resources
}

