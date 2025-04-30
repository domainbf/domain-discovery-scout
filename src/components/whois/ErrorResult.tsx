
import React from 'react';
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, FileText } from "lucide-react";

interface ErrorResultProps {
  error: string;
  rawData?: string;
}

const ErrorResult: React.FC<ErrorResultProps> = ({ error, rawData }) => {
  return (
    <div className="rounded-2xl bg-red-50/80 backdrop-blur-sm border border-red-100 shadow-lg p-6">
      <div className="flex items-center text-red-600 mb-4">
        <AlertTriangle className="h-6 w-6 mr-3 flex-shrink-0" />
        <h3 className="text-xl font-semibold">查询错误</h3>
      </div>
      <p className="text-red-700">{error}</p>
      
      {rawData && (
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
              {rawData}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};

export default ErrorResult;
