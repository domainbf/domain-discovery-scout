
import React from 'react';
import { WhoisResult } from '@/api/types/WhoisTypes';
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
  // Check if data contains an error or if it has a specific HTML content error
  const hasError = data.error || (data.rawData && (data.rawData.includes('<!DOCTYPE html>') || data.rawData.includes('<html')));
  
  if (hasError) {
    // If rawData contains HTML but error doesn't specifically mention it, add a clearer error
    let errorText = data.error || '';
    let errorDetails = data.errorDetails || {};
    
    if (!errorText.includes('HTML') && data.rawData && 
        (data.rawData.includes('<!DOCTYPE html>') || data.rawData.includes('<html'))) {
      errorText = `${errorText || '查询返回了非预期的HTML数据而不是JSON'}`;
      errorDetails = {
        ...errorDetails,
        formatError: true,
        parseError: true
      };
    }
    
    return (
      <ErrorResult 
        error={errorText} 
        rawData={data.rawData} 
        domain={domain}
        errorDetails={errorDetails}
        alternativeLinks={data.alternativeLinks}
      />
    );
  }

  // 处理数据部分缺失的情况，确保组件不会因为数据不完整而崩溃
  return (
    <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-100 shadow-lg p-6">
      <DomainHeader domain={domain} />
      <StatusBadges 
        status={data.status || []} 
        dnssec={data.dnssec} 
      />
      <DateInfo 
        created={data.created || data.creationDate} 
        updated={data.updated || data.lastUpdated} 
        expires={data.expires || data.expiryDate} 
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
}

export default WhoisResults;
