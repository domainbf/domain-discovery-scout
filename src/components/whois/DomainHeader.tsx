
import React from 'react';
import { Globe, Camera, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDomainAge } from '@/components/whois/WhoisUtils';

interface DomainHeaderProps {
  domain: string;
  creationDate?: string;
  expiryDate?: string;
}

const DomainHeader: React.FC<DomainHeaderProps> = ({ domain, creationDate, expiryDate }) => {
  // Get formatted domain age
  const domainAgeText = formatDomainAge(creationDate);
  
  // Determine badge color based on domain age
  let badgeColorClass = "bg-white/10 text-white";
  if (domainAgeText.includes("新注册")) {
    badgeColorClass = "bg-pink-500/20 text-pink-200";
  } else if (domainAgeText.includes("1年")) {
    badgeColorClass = "bg-blue-500/20 text-blue-200";
  } else if (domainAgeText.includes("老米")) {
    badgeColorClass = "bg-purple-500/20 text-purple-200";
  } else if (parseInt(domainAgeText) > 5) {
    badgeColorClass = "bg-amber-500/20 text-amber-200";
  }
  
  return (
    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-5 relative overflow-hidden rounded-t-2xl">
      <div className="absolute top-0 left-0 w-full h-full bg-white/10 backdrop-blur-sm"></div>
      <div className="flex flex-col space-y-2 relative z-10">
        <div className="flex items-center justify-between">
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
        
        {/* Domain age tag */}
        <div className="flex items-center mt-2 gap-2">
          <Badge variant="outline" className={`border-white/20 ${badgeColorClass} flex items-center gap-1`}>
            <Clock className="h-3.5 w-3.5" />
            {domainAgeText}
          </Badge>
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
