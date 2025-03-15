
import React from 'react';
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { WhoisResult } from '@/api/whoisService';
import { AlertCircle, Globe, Calendar, Shield, Server, User, RefreshCcw } from "lucide-react";

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
      </Card>
    );
  }

  const formatDate = (dateString?: string) => {
    if (!dateString || dateString === "未知") return "未知";
    
    try {
      const date = new Date(dateString);
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
                  {typeof data.status === 'string' && data.status.split(/[,\s]+/).filter(Boolean).map((status, index) => (
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
      
      <div className="mt-6 text-sm text-gray-500 italic">
        注意: 此信息来自公共WHOIS API服务，可能会有延迟或不完整。
      </div>
    </Card>
  );
};

export default WhoisResults;
