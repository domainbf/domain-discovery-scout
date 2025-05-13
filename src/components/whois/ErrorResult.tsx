
import React from 'react';
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, FileText, Server, Globe, InfoIcon, Clock, ExternalLink, WifiOff, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorResultProps {
  error: string;
  rawData?: string;
  domain?: string;
}

const ErrorResult: React.FC<ErrorResultProps> = ({ error, rawData, domain }) => {
  // 检测特定类型的错误以提供更好的用户反馈
  const isServerError = error.includes('服务器') || error.includes('连接失败');
  const isHtmlError = error.includes('HTML') || (rawData && rawData.includes('<!DOCTYPE html>'));
  const isFormatError = error.includes('格式') || error.includes('解析');
  const isNotFoundError = error.includes('未注册') || error.includes('not found') || error.includes('No match');
  const isTimeoutError = error.includes('超时') || error.includes('timeout');
  const isJsonError = error.includes('JSON') || error.includes('解析');
  const isNetworkError = error.includes('网络') || error.includes('CORS') || error.includes('connect') || error.includes('Load failed');
  const isAllMethodsFailedError = error.includes('所有查询方法') || error.includes('无法通过任何渠道');
  const isApiError = error.includes('API') || error.includes('500');
  
  // 检测特殊TLD错误
  const tld = domain?.split('.').pop()?.toLowerCase() || "";
  
  // 根据TLD类型提供特定指导
  const isGeTldError = tld === 'ge' || error.includes('ge') || (rawData && rawData?.includes('.ge'));
  const isCnTldError = tld === 'cn' || error.includes('cn') || (rawData && rawData?.includes('.cn'));
  const isJpTldError = tld === 'jp' || error.includes('jp') || (rawData && rawData?.includes('.jp'));
  
  // 生成官方查询链接
  const getOfficialLink = () => {
    if (isGeTldError) return 'https://registration.ge/';
    if (isCnTldError) return 'http://whois.cnnic.cn/';
    if (isJpTldError) return 'https://jprs.jp/';
    if (domain) {
      // 提供一个备用的通用查询链接
      return `https://lookup.icann.org/en/lookup?q=${domain}&t=a`;
    }
    return '';
  };
  
  // 尝试其他查询网站的链接
  const getAlternativeLookupLinks = () => {
    if (!domain) return [];
    
    return [
      {
        name: 'ICANN Lookup',
        url: `https://lookup.icann.org/en/lookup?q=${domain}&t=a`
      },
      {
        name: 'WhoisXmlApi',
        url: `https://www.whoisxmlapi.com/whois-lookup-result.php?domain=${domain}`
      },
      {
        name: 'DomainTools',
        url: `https://whois.domaintools.com/${domain}`
      }
    ];
  };
  
  const officialLink = getOfficialLink();
  const alternativeLookupLinks = getAlternativeLookupLinks();
  const hasTldError = isGeTldError || isCnTldError || isJpTldError;
  
  // 根据错误类型选择建议
  const getSuggestions = () => {
    if (isAllMethodsFailedError) {
      return "由于网络原因或查询限制，无法通过多种渠道获取该域名信息，请通过下方链接在其他网站尝试查询。";
    }
    if (isNetworkError) {
      return "当前网络环境可能存在访问限制或CORS策略问题，请尝试使用其他域名查询工具。";
    }
    if (isApiError) {
      return "查询API暂时无法使用，可能是服务器负载过高或维护中，请稍后再试。";
    }
    if (isTimeoutError) {
      return "查询超时，可能是服务器响应较慢或网络连接不稳定，请稍后再试。";
    }
    return "可以尝试使用其他在线工具查询该域名信息。";
  };
  
  return (
    <div className="rounded-2xl bg-red-50/80 backdrop-blur-sm border border-red-100 shadow-lg p-6">
      <div className="flex items-center text-red-600 mb-4">
        <AlertTriangle className="h-6 w-6 mr-3 flex-shrink-0" />
        <h3 className="text-xl font-semibold">查询错误</h3>
      </div>
      <p className="text-red-700">{error}</p>
      
      {/* 根据错误类型提供更具体的帮助信息 */}
      {isNetworkError && (
        <div className="mt-3 flex items-start text-sm text-red-600">
          <WifiOff className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
          <p>网络连接问题，无法访问WHOIS/RDAP服务器。可能是CORS策略限制或网络连接问题。</p>
        </div>
      )}
      
      {isServerError && (
        <div className="mt-3 flex items-start text-sm text-red-600">
          <Server className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
          <p>WHOIS服务器可能暂时不可用或拒绝了连接请求。请稍后再试。</p>
        </div>
      )}
      
      {isApiError && (
        <div className="mt-3 flex items-start text-sm text-red-600">
          <ShieldAlert className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
          <p>API服务器返回了错误响应，可能是查询限制或服务器维护问题。</p>
        </div>
      )}
      
      {isTimeoutError && (
        <div className="mt-3 flex items-start text-sm text-red-600">
          <Clock className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
          <p>查询超时，WHOIS服务器响应过慢或不可用。请稍后再试。</p>
        </div>
      )}
      
      {isHtmlError && (
        <div className="mt-3 flex items-start text-sm text-red-600">
          <Globe className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
          <p>服务器返回了HTML页面而不是WHOIS数据。此顶级域名可能需要通过Web界面查询。</p>
        </div>
      )}
      
      {isJsonError && (
        <div className="mt-3 flex items-start text-sm text-red-600">
          <FileText className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
          <p>无法解析JSON响应，请检查服务端返回格式是否正确。</p>
        </div>
      )}
      
      {hasTldError && officialLink && (
        <div className="mt-3 flex items-start text-sm text-red-600">
          <InfoIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <p>
              {isGeTldError && '.ge (格鲁吉亚)域名需要通过特殊方式查询，无法通过标准WHOIS获取详细信息。'}
              {isCnTldError && '.cn (中国)域名查询可能受到限制，标准WHOIS可能无法获取完整信息。'}
              {isJpTldError && '.jp (日本)域名可能需要通过官方网站查询以获取完整信息。'}
            </p>
            <a 
              href={officialLink} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center text-blue-600 hover:underline mt-2"
            >
              访问官方查询网站 <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </div>
        </div>
      )}
      
      {isFormatError && (
        <div className="mt-3 flex items-start text-sm text-red-600">
          <FileText className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
          <p>无法解析服务器返回的数据格式。请尝试使用其他查询方式。</p>
        </div>
      )}
      
      {isNotFoundError && (
        <div className="mt-3 flex items-start text-sm text-gray-600">
          <Globe className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
          <p>该域名可能未被注册，您可以考虑注册它。</p>
        </div>
      )}
      
      {/* 尝试其他查询方式建议 */}
      <div className="mt-6 bg-white/70 p-4 rounded-lg border border-gray-100">
        <h4 className="font-medium text-gray-800 mb-2 flex items-center">
          <InfoIcon className="h-4 w-4 mr-2" />
          查询建议
        </h4>
        <p className="text-sm text-gray-600 mb-3">{getSuggestions()}</p>
        
        <div className="flex flex-wrap gap-2">
          {alternativeLookupLinks.map((link, index) => (
            <a 
              key={index}
              href={link.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-1 bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100 text-sm"
            >
              {link.name} <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          ))}
        </div>
      </div>
      
      {rawData && (
        <div className="mt-6">
          <Separator className="my-4" />
          <details className="group">
            <summary className="flex items-center cursor-pointer text-red-600 font-medium">
              <FileText className="h-4 w-4 mr-2" />
              查看详细错误信息
              <svg className="ml-2 h-5 w-5 group-open:rotate-180 transition-transform" 
                   xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </summary>
            <pre className="mt-3 bg-white/70 p-4 rounded-md text-sm overflow-auto max-h-60 text-gray-700 whitespace-pre-wrap">
              {rawData}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};

export default ErrorResult;
