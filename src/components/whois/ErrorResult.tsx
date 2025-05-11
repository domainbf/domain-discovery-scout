
import React from 'react';
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, FileText, Server, Globe, InfoIcon, Clock } from "lucide-react";

interface ErrorResultProps {
  error: string;
  rawData?: string;
}

const ErrorResult: React.FC<ErrorResultProps> = ({ error, rawData }) => {
  // 检测特定类型的错误以提供更好的用户反馈
  const isServerError = error.includes('服务器') || error.includes('连接失败');
  const isHtmlError = error.includes('HTML') || (rawData && rawData.includes('<!DOCTYPE html>'));
  const isFormatError = error.includes('格式') || error.includes('解析');
  const isNotFoundError = error.includes('未注册') || error.includes('not found') || error.includes('No match');
  const isGeTldError = error.includes('ge') || (rawData && rawData.includes('.ge')) || error.toLowerCase().includes('ge.ge');
  const isTimeoutError = error.includes('超时') || error.includes('timeout');
  const isJsonError = error.includes('JSON') || error.includes('解析');
  
  return (
    <div className="rounded-2xl bg-red-50/80 backdrop-blur-sm border border-red-100 shadow-lg p-6">
      <div className="flex items-center text-red-600 mb-4">
        <AlertTriangle className="h-6 w-6 mr-3 flex-shrink-0" />
        <h3 className="text-xl font-semibold">查询错误</h3>
      </div>
      <p className="text-red-700">{error}</p>
      
      {/* 根据错误类型提供更具体的帮助信息 */}
      {isServerError && (
        <div className="mt-3 flex items-start text-sm text-red-600">
          <Server className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
          <p>WHOIS服务器可能暂时不可用或拒绝了连接请求。请稍后再试。</p>
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
      
      {isGeTldError && (
        <div className="mt-3 flex items-start text-sm text-red-600">
          <InfoIcon className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
          <p>.ge (格鲁吉亚)域名需要通过特殊方式查询，已自动处理返回基本信息。如需详细信息，请访问: <a href="https://registration.ge/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://registration.ge/</a></p>
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
