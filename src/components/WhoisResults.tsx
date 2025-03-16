
import React from 'react';
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { WhoisResult } from '@/api/whoisService';
import { AlertCircle, Globe, Calendar, Shield, Server, User, RefreshCcw, FileText, Mail, Phone } from "lucide-react";

interface WhoisResultsProps {
  data: WhoisResult | null;
  domain: string;
}

const WhoisResults: React.FC<WhoisResultsProps> = ({ data, domain }) => {
  if (!data) return null;

  if (data.error) {
    return (
      <Card className="p-6 mt-6 w-full max-w-3xl mx-auto bg-red-50 border border-red-200">
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
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return dateString; // Return original if invalid date
      }
      return new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (e) {
      return dateString; // Return original if parsing fails
    }
  };

  return (
    <Card className="p-6 mt-6 w-full max-w-3xl mx-auto border-t-4 border-t-blue-500 shadow-lg bg-white">
      <div className="flex items-center mb-4">
        <Globe className="h-6 w-6 text-blue-600 mr-2" />
        <h3 className="text-xl font-bold text-gray-800">WHOIS 查询结果: <span className="text-blue-600">{domain}</span></h3>
      </div>
      
      <Separator className="my-4" />
      
      <div className="grid grid-cols-1 gap-6">
        <div className="space-y-4">
          <div className="flex items-start">
            <div className="w-1/3 text-gray-500 font-medium">注册商:</div>
            <div className="w-2/3 font-semibold">{data.registrar || "未知"}</div>
          </div>
          
          <div className="flex items-start">
            <div className="w-1/3 text-gray-500 font-medium">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                创建日期:
              </div>
            </div>
            <div className="w-2/3">{formatDate(data.creationDate)}</div>
          </div>
          
          <div className="flex items-start">
            <div className="w-1/3 text-gray-500 font-medium">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                过期日期:
              </div>
            </div>
            <div className="w-2/3">{formatDate(data.expiryDate)}</div>
          </div>
          
          <div className="flex items-start">
            <div className="w-1/3 text-gray-500 font-medium">
              <div className="flex items-center">
                <RefreshCcw className="h-4 w-4 mr-1" />
                最后更新:
              </div>
            </div>
            <div className="w-2/3">{formatDate(data.lastUpdated)}</div>
          </div>
          
          {data.registrant && (
            <div className="flex items-start">
              <div className="w-1/3 text-gray-500 font-medium">
                <div className="flex items-center">
                  <User className="h-4 w-4 mr-1" />
                  注册人:
                </div>
              </div>
              <div className="w-2/3">{data.registrant}</div>
            </div>
          )}
          
          {data.registrantEmail && (
            <div className="flex items-start">
              <div className="w-1/3 text-gray-500 font-medium">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-1" />
                  联系邮箱:
                </div>
              </div>
              <div className="w-2/3">{data.registrantEmail}</div>
            </div>
          )}
          
          {data.registrantPhone && (
            <div className="flex items-start">
              <div className="w-1/3 text-gray-500 font-medium">
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-1" />
                  联系电话:
                </div>
              </div>
              <div className="w-2/3">{data.registrantPhone}</div>
            </div>
          )}
          
          {data.nameServers && data.nameServers.length > 0 && (
            <div className="flex items-start">
              <div className="w-1/3 text-gray-500 font-medium">
                <div className="flex items-center">
                  <Server className="h-4 w-4 mr-1" />
                  域名服务器:
                </div>
              </div>
              <div className="w-2/3">
                <ul className="list-disc list-inside space-y-1">
                  {data.nameServers.map((ns, index) => (
                    <li key={index} className="text-gray-700">{ns}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          
          <div className="flex items-start">
            <div className="w-1/3 text-gray-500 font-medium">状态:</div>
            <div className="w-2/3">
              {data.status ? (
                <div className="flex flex-wrap gap-1">
                  {typeof data.status === 'string' && data.status.split(/[,\s;]+/).filter(Boolean).map((status, index) => (
                    <span key={index} className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      <Shield className="h-3 w-3 mr-1" />
                      {status}
                    </span>
                  ))}
                </div>
              ) : "未知"}
            </div>
          </div>
        </div>
      </div>
      
      {data.rawData && (
        <div className="mt-6">
          <Separator className="my-4" />
          
          <details className="group">
            <summary className="flex items-center cursor-pointer text-blue-600 font-medium">
              <FileText className="h-4 w-4 mr-1" />
              查看原始WHOIS数据
              <svg className="ml-2 h-5 w-5 group-open:rotate-180 transition-transform" 
                   xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </summary>
            <div className="mt-3 overflow-hidden">
              <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-auto max-h-96 text-gray-700 whitespace-pre-wrap">
                {data.rawData}
              </pre>
            </div>
          </details>
        </div>
      )}
      
      <div className="mt-6 pt-4 border-t border-gray-100 text-sm text-gray-500">
        <p className="flex items-center">
          <Globe className="h-4 w-4 mr-1 text-blue-500" />
          <span>通过直接Socket连接到官方WHOIS服务器获取实时数据</span>
        </p>
      </div>
    </Card>
  );
};

export default WhoisResults;
