
import React, { useEffect, useState } from 'react';
import { Badge } from "@/components/ui/badge";
import { CircleDollarSign, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface DomainPricingProps {
  domain: string;
}

interface DomainPricingInfo {
  available: boolean;
  premium: boolean;
  registerPrice?: number;
  renewPrice?: number;
  currency?: string;
  error?: string;
}

const DomainPricing: React.FC<DomainPricingProps> = ({ domain }) => {
  const [loading, setLoading] = useState(false);
  const [pricingInfo, setPricingInfo] = useState<DomainPricingInfo | null>(null);
  
  useEffect(() => {
    if (!domain) return;
    
    const fetchDomainPricing = async () => {
      try {
        setLoading(true);
        
        // Extract the domain name without protocol and www
        let cleanDomain = domain.trim().toLowerCase();
        cleanDomain = cleanDomain.replace(/^https?:\/\//, '');
        cleanDomain = cleanDomain.replace(/^www\./, '');
        
        // Make the API request to Nazhumi
        const response = await fetch(`https://www.nazhumi.com/api/v1/domain/check?domain=${cleanDomain}`);
        
        if (!response.ok) {
          throw new Error(`API 请求失败: ${response.status}`);
        }
        
        const data = await response.json();
        
        setPricingInfo({
          available: data.available,
          premium: data.premium,
          registerPrice: data.registerPrice,
          renewPrice: data.renewPrice,
          currency: data.currency || 'CNY'
        });
        
      } catch (error) {
        console.error('获取域名价格信息失败:', error);
        toast({
          title: "价格查询失败",
          description: error instanceof Error ? error.message : "无法获取域名价格信息",
          variant: "destructive",
        });
        setPricingInfo({
          available: false,
          premium: false,
          error: error instanceof Error ? error.message : "查询失败"
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchDomainPricing();
  }, [domain]);
  
  if (loading) {
    return (
      <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm my-4">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
          <span className="ml-2 text-gray-600">正在获取价格信息...</span>
        </div>
      </div>
    );
  }
  
  if (!pricingInfo) return null;
  
  if (pricingInfo.error) {
    return (
      <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm my-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />
          <div className="text-gray-600">价格查询失败: {pricingInfo.error}</div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm my-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="col-span-2 md:col-span-1 flex items-center">
          <div className="flex items-center">
            {pricingInfo.available ? (
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500 mr-2" />
            )}
            <span className="font-medium">
              {pricingInfo.available ? "可注册" : "已注册"}
            </span>
          </div>
        </div>
        
        <div className="col-span-2 md:col-span-1 flex items-center">
          <div className="flex items-center">
            {pricingInfo.premium ? (
              <Badge variant="secondary" className="bg-amber-100 text-amber-800">溢价域名</Badge>
            ) : (
              <Badge variant="outline" className="bg-green-100 text-green-800">普通域名</Badge>
            )}
          </div>
        </div>
        
        {pricingInfo.available && (
          <>
            <div className="flex items-center">
              <CircleDollarSign className="h-5 w-5 text-indigo-600 mr-2" />
              <div>
                <div className="text-sm text-gray-500">注册价格</div>
                <div className="font-medium">
                  {pricingInfo.registerPrice ? `${pricingInfo.registerPrice} ${pricingInfo.currency}` : "未知"}
                </div>
              </div>
            </div>
            
            <div className="flex items-center">
              <CircleDollarSign className="h-5 w-5 text-purple-600 mr-2" />
              <div>
                <div className="text-sm text-gray-500">续费价格</div>
                <div className="font-medium">
                  {pricingInfo.renewPrice ? `${pricingInfo.renewPrice} ${pricingInfo.currency}` : "未知"}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default DomainPricing;
