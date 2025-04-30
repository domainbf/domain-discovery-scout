
import React from 'react';
import { Globe, Camera } from "lucide-react";

interface DomainHeaderProps {
  domain: string;
}

const DomainHeader: React.FC<DomainHeaderProps> = ({ domain }) => {
  return (
    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-5 relative overflow-hidden rounded-t-2xl">
      <div className="absolute top-0 left-0 w-full h-full bg-white/10 backdrop-blur-sm"></div>
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center">
          <Globe className="h-6 w-6 text-white mr-3" strokeWidth={1.5} />
          <h3 className="text-xl font-bold text-white">{domain}</h3>
        </div>
        <div className="flex items-center">
          <div className="text-xs text-white/80 bg-black/20 py-1 px-3 rounded-full">
            {domain.includes('.') ? domain.split('.').pop()?.toUpperCase() : 'IP'}
          </div>
        </div>
      </div>
      
      {/* 截图按钮 */}
      <div className="absolute top-5 right-5 z-10">
        <button className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors">
          <Camera className="h-4 w-4 text-white" />
        </button>
      </div>
    </div>
  );
};

export default DomainHeader;
