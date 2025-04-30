
import React from 'react';
import { FileText } from "lucide-react";

interface RawDataDetailsProps {
  rawData: string;
}

const RawDataDetails: React.FC<RawDataDetailsProps> = ({ rawData }) => {
  if (!rawData) return null;
  
  return (
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
            {rawData}
          </pre>
        </div>
      </details>
    </div>
  );
};

export default RawDataDetails;
