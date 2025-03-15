
import React from 'react';
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { WhoisResult } from '@/api/whoisService';
import { AlertCircle, Globe, Calendar, Shield } from "lucide-react";

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
    if (!dateString) return "未知";
    
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <div className="flex items-start">
            <div className="w-1/3 text-gray-500 font-medium">注册商:</div>
            <div className="w-2/3 font-semibold">{data.registrar || "未知"}</div>
          </div>
          
          <div className="flex items-start">
            <div className="w-1/3 text-gray-500 font-medium">状态:</div>
            <div className="w-2/3">
              {data.status ? (
                <div className="flex flex-wrap gap-1">
                  {data.status.split(' ').map((status, index) => (
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
        
        <div className="space-y-2">
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
        </div>
      </div>
      
      <div className="mt-6 text-sm text-gray-500 italic">
        注意: 此信息仅供参考，可能不完整或不准确。请联系域名注册商获取完整信息。
      </div>
    </Card>
  );
};

export default WhoisResults;
