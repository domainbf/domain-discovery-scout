
import React from 'react';
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { WhoisResult } from '@/api/whoisService';
import { AlertCircle, Globe, Calendar, Shield, Server, User, RefreshCcw, FileText, Mail, Phone, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface WhoisResultsProps {
  data: WhoisResult | null;
  domain: string;
}

const WhoisResults: React.FC<WhoisResultsProps> = ({ data, domain }) => {
  if (!data) return null;

  if (data.error) {
    return (
      <Card className="p-6 mt-6 w-full mx-auto bg-red-50 border border-red-200 shadow-lg rounded-xl">
        <div className="flex items-center text-red-600 mb-4">
          <AlertCircle className="h-6 w-6 mr-2" />
          <h3 className="text-xl font-semibold">查询错误</h3>
        </div>
        <p className="text-red-700">{data.error}</p>
        
        {data.rawData && (
          <div className="mt-4">
            <Separator className="my-4" />
            <h4 className="text-lg font-medium mb-2 text-red-700">服务器响应信息:</h4>
            <pre className="bg-white p-4 rounded-md text-sm overflow-auto max-h-96 text-gray-700 whitespace-pre-wrap">
              {data.rawData}
            </pre>
          </div>
        )}
      </Card>
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
    <Card className="p-8 mt-8 w-full mx-auto border-t-4 border-t-indigo-500 shadow-xl bg-white rounded-xl">
      <div className="flex items-center mb-6">
        <Globe className="h-6 w-6 text-indigo-600 mr-3" />
        <h3 className="text-2xl font-bold text-gray-800">域名: <span className="text-indigo-600">{domain}</span></h3>
      </div>
      
      <Separator className="my-6" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h4 className="text-lg font-medium text-gray-700 mb-4">基本信息</h4>
          
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-500 mb-1 flex items-center">
                <User className="h-4 w-4 mr-1 text-indigo-400" />
                注册商
              </div>
              <div className="font-medium">{data.registrar || "未知"}</div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500 mb-1 flex items-center">
                  <Calendar className="h-4 w-4 mr-1 text-indigo-400" />
                  创建日期
                </div>
                <div className="font-medium">{formatDate(data.creationDate || data.created)}</div>
                {domainAge && (
                  <div className="text-xs text-indigo-600 mt-1">
                    域名年龄: {domainAge}
                  </div>
                )}
              </div>
              
              <div>
                <div className="text-sm text-gray-500 mb-1 flex items-center">
                  <Calendar className="h-4 w-4 mr-1 text-indigo-400" />
                  过期日期
                </div>
                <div className="font-medium">{formatDate(data.expiryDate || data.expires)}</div>
                {expiryRemaining && (
                  <div className={`text-xs mt-1 ${expiryRemaining.includes('已过期') ? 'text-red-600' : 'text-green-600'}`}>
                    {expiryRemaining}
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <div className="text-sm text-gray-500 mb-1 flex items-center">
                <RefreshCcw className="h-4 w-4 mr-1 text-indigo-400" />
                最后更新
              </div>
              <div className="font-medium">{formatDate(data.lastUpdated || data.updated)}</div>
            </div>
            
            {data.status && (
              <div>
                <div className="text-sm text-gray-500 mb-2 flex items-center">
                  <Shield className="h-4 w-4 mr-1 text-indigo-400" />
                  域名状态
                </div>
                <div className="flex flex-wrap gap-2">
                  {(Array.isArray(data.status) ? data.status : [data.status]).map((status, index) => (
                    <Badge key={index} variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                      {status}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="space-y-6">
          <h4 className="text-lg font-medium text-gray-700 mb-4">联系信息和DNS配置</h4>
          
          <div className="space-y-4">
            {data.registrant && (
              <>
                {(data.registrant.name || data.registrant.org) && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1 flex items-center">
                      <User className="h-4 w-4 mr-1 text-indigo-400" />
                      注册人
                    </div>
                    <div className="font-medium">{data.registrant.name || data.registrant.org}</div>
                  </div>
                )}
                
                {data.registrant.email && data.registrant.email[0] && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1 flex items-center">
                      <Mail className="h-4 w-4 mr-1 text-indigo-400" />
                      联系邮箱
                    </div>
                    <div className="font-medium">{data.registrant.email[0]}</div>
                  </div>
                )}
                
                {data.registrant.phone && data.registrant.phone[0] && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1 flex items-center">
                      <Phone className="h-4 w-4 mr-1 text-indigo-400" />
                      联系电话
                    </div>
                    <div className="font-medium">{data.registrant.phone[0]}</div>
                  </div>
                )}
              </>
            )}
            
            {(!data.registrant || (!data.registrant.name && !data.registrant.email && !data.registrant.phone)) && 
              data.registrantEmail && (
                <div>
                  <div className="text-sm text-gray-500 mb-1 flex items-center">
                    <Mail className="h-4 w-4 mr-1 text-indigo-400" />
                    注册人邮箱
                  </div>
                  <div className="font-medium">{data.registrantEmail}</div>
                </div>
            )}
            
            {data.nameservers && data.nameservers.length > 0 && (
              <div>
                <div className="text-sm text-gray-500 mb-2 flex items-center">
                  <Server className="h-4 w-4 mr-1 text-indigo-400" />
                  域名服务器
                </div>
                <ul className="space-y-1">
                  {data.nameservers.map((ns, index) => (
                    <li key={index} className="text-gray-700 bg-gray-50 px-2 py-1 rounded text-sm">{ns}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {data.rawData && (
        <div className="mt-8 pt-6 border-t border-gray-100">
          <details className="group">
            <summary className="flex items-center cursor-pointer text-indigo-600 font-medium">
              <FileText className="h-4 w-4 mr-1" />
              查看原始WHOIS数据
              <svg className="ml-2 h-5 w-5 group-open:rotate-180 transition-transform" 
                   xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </summary>
            <div className="mt-3 overflow-hidden">
              <pre className="bg-gray-50 p-4 rounded-md text-sm overflow-auto max-h-96 text-gray-700 whitespace-pre-wrap">
                {data.rawData}
              </pre>
            </div>
          </details>
        </div>
      )}
      
      <div className="mt-8 pt-4 border-t border-gray-100 text-sm text-gray-500 flex items-center justify-between">
        <div className="flex items-center">
          <Globe className="h-4 w-4 mr-1 text-indigo-400" />
          <span>数据来源: 官方WHOIS服务器</span>
        </div>
        <div className="flex items-center">
          <Clock className="h-4 w-4 mr-1 text-indigo-400" />
          <span>查询时间: {new Date().toLocaleString('zh-CN')}</span>
        </div>
      </div>
    </Card>
  );
};

export default WhoisResults;
