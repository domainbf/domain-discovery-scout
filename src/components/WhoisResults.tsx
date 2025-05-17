import React from 'react';
import { WhoisResult } from '@/api/whoisService';
import ErrorResult from './whois/ErrorResult';
import DomainHeader from './whois/DomainHeader';
import StatusBadges from './whois/StatusBadges';
import DateInfo from './whois/DateInfo';
import NameserversList from './whois/NameserversList';
import RegistrantInfo from './whois/RegistrantInfo';
import RawDataDetails from './whois/RawDataDetails';
import WhoisDataFooter from './whois/WhoisDataFooter';

interface WhoisResultsProps {
  data: WhoisResult;
  domain: string;
}

const WhoisResults: React.FC<WhoisResultsProps> = ({ data, domain }) => {
  if (data.error) {
    return (
      <ErrorResult 
        error={data.error} 
        rawData={data.rawData} 
        domain={domain}
        errorDetails={data.errorDetails}
        alternativeLinks={data.alternativeLinks}
      />
    );
  }

  return (
    <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-100 shadow-lg p-6">
      <DomainHeader domain={domain} />
      <StatusBadges status={data.status} dnssec={data.dnssec} />
      <DateInfo 
        created={data.created} 
        updated={data.updated} 
        expires={data.expires} 
        registrar={data.registrar} 
      />
      <NameserversList nameservers={data.nameservers} />
      <RegistrantInfo 
        registrant={data.registrant} 
        admin={data.admin} 
        tech={data.tech} 
        abuse={data.abuse} 
      />
      <RawDataDetails rawData={data.rawData} />
      <WhoisDataFooter source={data.source} />
    </div>
  );
};

export default WhoisResults;
