
import React from 'react';
import { Separator } from "@/components/ui/separator";
import { WhoisResult } from '@/api/whoisService';
import { AlertCircle, Globe, Calendar, Shield, Server, User, RefreshCcw, FileText, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface WhoisResultsProps {
  data: WhoisResult | null;
  domain: string;
}

const WhoisResults: React.FC<WhoisResultsProps> = ({ data, domain }) => {
  if (!data) return null;

  if (data.error) {
    return (
      <div className="rounded-2xl bg-red-50/80 backdrop-blur-sm border border-red-100 shadow-lg p-6">
        <div className="flex items-center text-red-600 mb-4">
          <AlertTriangle className="h-6 w-6 mr-3 flex-shrink-0" />
          <h3 className="text-xl font-semibold">查询错误</h3>
        </div>
        <p className="text-red-700">{data.error}</p>
        
        {data.rawData && (
          <div className="mt-6">
            <Separator className="my-4" />
            <details className="group">
              <summary className="flex items-center cursor-pointer text-red-600 font-medium">
                <FileText className="h-4 w-4 mr-2" />
                查看详细错误
                <svg className="ml-2 h-5 w-5 group-open:rotate-180 transition-transform" 
                     xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </summary>
              <pre className="mt-3 bg-white/70 p-4 rounded-md text-sm overflow-auto max-h-60 text-gray-700 whitespace-pre-wrap">
                {data.rawData}
              </pre>
            </details>
          </div>
        )}
      </div>
    );
  }

  const formatDate = (dateString?: string) => {
    if (!dateString || dateString === "未知") return "未知";
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString;
      }
      return new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (e) {
      return dateString;
    }
  };

  // Calculate domain age if creation date is available
  const getDomainAge = (dateString?: string) => {
    if (!dateString) return null;
    
    try {
      const creationDate = new Date(dateString);
      if (isNaN(creationDate.getTime())) return null;
      
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - creationDate.getTime());
      const diffYears = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 365));
      const diffMonths = Math.floor((diffTime % (1000 * 60 * 60 * 24 * 365)) / (1000 * 60 * 60 * 24 * 30));
      
      return `${diffYears} 年 ${diffMonths} 个月`;
    } catch (e) {
      return null;
    }
  };

  // Calculate expiry date remaining time
  const getExpiryRemaining = (dateString?: string) => {
    if (!dateString) return null;
    
    try {
      const expiryDate = new Date(dateString);
      if (isNaN(expiryDate.getTime())) return null;
      
      const today = new Date();
      
      // If already expired
      if (expiryDate < today) {
        const diffTime = Math.abs(today.getTime() - expiryDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return `已过期 ${diffDays} 天`;
      }
      
      // If not expired yet
      const diffTime = Math.abs(expiryDate.getTime() - today.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays > 365) {
        const years = Math.floor(diffDays / 365);
        const days = diffDays % 365;
        return `剩余 ${years} 年 ${days} 天`;
      }
      
      return `剩余 ${diffDays} 天`;
    } catch (e) {
      return null;
    }
  };

  const domainAge = getDomainAge(data.creationDate || data.created);
  const expiryRemaining = getExpiryRemaining(data.expiryDate || data.expires);

  return (
    <div className="rounded-2xl bg-white/80 backdrop-blur-md shadow-xl border border-white/20 overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-5 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-white/10 backdrop-blur-sm"></div>
        <div className="flex items-center relative z-10">
          <Globe className="h-6 w-6 text-white mr-3" strokeWidth={1.5} />
          <h3 className="text-xl font-bold text-white">{domain}</h3>
        </div>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-5">
            <div className="bg-gray-50/80 rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1 flex items-center">
                <User className="h-4 w-4 mr-1 text-indigo-500" />
                注册商
              </div>
              <div className="font-medium text-gray-800">{data.registrar || "未知"}</div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50/80 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-1 flex items-center">
                  <Calendar className="h-4 w-4 mr-1 text-indigo-500" />
                  创建日期
                </div>
                <div className="font-medium text-gray-800">{formatDate(data.creationDate || data.created)}</div>
                {domainAge && (
                  <div className="text-xs text-indigo-600 mt-1 font-medium">
                    域名年龄: {domainAge}
                  </div>
                )}
              </div>
              
              <div className="bg-gray-50/80 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-1 flex items-center">
                  <Calendar className="h-4 w-4 mr-1 text-indigo-500" />
                  过期日期
                </div>
                <div className="font-medium text-gray-800">{formatDate(data.expiryDate || data.expires)}</div>
                {expiryRemaining && (
                  <div className={`text-xs mt-1 font-medium ${expiryRemaining.includes('已过期') ? 'text-red-600' : 'text-green-600'}`}>
                    {expiryRemaining}
                  </div>
                )}
              </div>
            </div>
            
            <div className="bg-gray-50/80 rounded-lg p-4">
              <div className="text-sm text-gray-500 mb-1 flex items-center">
                <RefreshCcw className="h-4 w-4 mr-1 text-indigo-500" />
                最后更新
              </div>
              <div className="font-medium text-gray-800">{formatDate(data.lastUpdated || data.updated)}</div>
            </div>
            
            {data.status && (
              <div className="bg-gray-50/80 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-2 flex items-center">
                  <Shield className="h-4 w-4 mr-1 text-indigo-500" />
                  域名状态
                </div>
                <div className="flex flex-wrap gap-2">
                  {(Array.isArray(data.status) ? data.status : [data.status]).map((status, index) => (
                    <Badge key={index} variant="outline" className="bg-white text-gray-700 border-indigo-100">
                      {status}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <div className="space-y-5">
            {data.nameservers && data.nameservers.length > 0 && (
              <div className="bg-gray-50/80 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-2 flex items-center">
                  <Server className="h-4 w-4 mr-1 text-indigo-500" />
                  域名服务器
                </div>
                <ul className="space-y-1">
                  {data.nameservers.map((ns, index) => (
                    <li key={index} className="text-gray-800 bg-white px-3 py-2 rounded text-sm border border-indigo-50">
                      {ns}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {data.registrant && (
              <>
                {(data.registrant.name || data.registrant.org) && (
                  <div className="bg-gray-50/80 rounded-lg p-4">
                    <div className="text-sm text-gray-500 mb-1 flex items-center">
                      <User className="h-4 w-4 mr-1 text-indigo-500" />
                      注册人
                    </div>
                    <div className="font-medium text-gray-800">{data.registrant.name || data.registrant.org}</div>
                    {data.registrant.address && (
                      <div className="text-sm text-gray-600 mt-1">
                        {data.registrant.address}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        
        {data.rawData && (
          <div className="mt-6 pt-4 border-t border-gray-100">
            <details className="group">
              <summary className="flex items-center cursor-pointer text-gray-600 font-medium">
                <FileText className="h-4 w-4 mr-1" />
                查看原始数据
                <svg className="ml-2 h-5 w-5 group-open:rotate-180 transition-transform" 
                     xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </summary>
              <div className="mt-3 overflow-hidden">
                <pre className="bg-gray-50/80 p-4 rounded-md text-sm overflow-auto max-h-80 text-gray-700 whitespace-pre-wrap">
                  {data.rawData}
                </pre>
              </div>
            </details>
          </div>
        )}
        
        <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400 flex items-center justify-between">
          <div>数据来源: {data.source || '未知'}</div>
          <div>查询时间: {new Date().toLocaleString('zh-CN')}</div>
        </div>
      </div>
    </div>
  );
};

export default WhoisResults;
