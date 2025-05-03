
import React from 'react';
import { WhoisResult } from '@/api/whoisService';
import { RefreshCcw, User } from "lucide-react";
import DomainHeader from './whois/DomainHeader';
import ErrorResult from './whois/ErrorResult';
import InfoPanel from './whois/InfoPanel';
import DateInfo from './whois/DateInfo';
import NameserversList from './whois/NameserversList';
import StatusBadges from './whois/StatusBadges';
import RegistrantInfo from './whois/RegistrantInfo';
import RawDataDetails from './whois/RawDataDetails';
import WhoisDataFooter from './whois/WhoisDataFooter';
import { formatDate, getDomainAge, getExpiryRemaining } from './whois/WhoisUtils';

interface WhoisResultsProps {
  data: WhoisResult | null;
  domain: string;
}

const WhoisResults: React.FC<WhoisResultsProps> = ({ data, domain }) => {
  if (!data) return null;

  if (data.error) {
    return <ErrorResult error={data.error} rawData={data.rawData} />;
  }

  const domainAge = getDomainAge(data.creationDate || data.created);
  const expiryRemaining = getExpiryRemaining(data.expiryDate || data.expires);
  
  // Get all relevant dates for the components
  const creationDate = data.creationDate || data.created;
  const expiryDate = data.expiryDate || data.expires;

  return (
    <div className="rounded-2xl bg-white/80 backdrop-blur-md shadow-xl border border-white/20 overflow-hidden">
      <DomainHeader 
        domain={domain} 
        creationDate={creationDate} 
        expiryDate={expiryDate}
      />
      
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-5">
            {/* Registrar Information */}
            <InfoPanel 
              icon={<User className="h-4 w-4 mr-1 text-indigo-500" />}
              label="注册商"
              value={data.registrar || "未知"}
            />
            
            {/* Creation and Expiry Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DateInfo 
                label="创建日期"
                date={formatDate(creationDate)}
                additionalText={domainAge}
                additionalTextClass="text-indigo-600"
              />
              
              <DateInfo 
                label="过期日期"
                date={formatDate(expiryDate)}
                additionalText={expiryRemaining}
                additionalTextClass={expiryRemaining?.includes('已过期') ? 'text-red-600' : 'text-green-600'}
              />
            </div>
            
            {/* Last Updated */}
            <InfoPanel
              icon={<RefreshCcw className="h-4 w-4 mr-1 text-indigo-500" />}
              label="最后更新"
              value={formatDate(data.lastUpdated || data.updated)}
            />
            
            {/* Domain Status */}
            {data.status && <StatusBadges status={data.status} />}
          </div>
          
          <div className="space-y-5">
            {/* Nameservers */}
            {data.nameservers && data.nameservers.length > 0 && (
              <NameserversList nameservers={data.nameservers} />
            )}
            
            {/* Registrant Information */}
            {data.registrant && <RegistrantInfo registrant={data.registrant} />}
          </div>
        </div>
        
        {/* Raw Data Details */}
        {data.rawData && <RawDataDetails rawData={data.rawData} />}
        
        {/* Footer with raw data for copy/download */}
        <WhoisDataFooter source={data.source} rawData={data.rawData} />
      </div>
    </div>
  );
};

export default WhoisResults;
