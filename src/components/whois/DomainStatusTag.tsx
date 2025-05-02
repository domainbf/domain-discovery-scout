
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { translateStatusCode, getDomainStatusHealth } from '@/utils/domainStatusUtils';

interface DomainStatusTagProps {
  status: string;
}

const DomainStatusTag: React.FC<DomainStatusTagProps> = ({ status }) => {
  const translatedStatus = translateStatusCode(status);
  
  // Determine badge variant based on status content
  let variant: "default" | "destructive" | "outline" | "secondary" = "outline";
  
  if (status.toLowerCase().includes('hold') || status.toLowerCase().includes('delete')) {
    variant = "destructive";
  } else if (status.toLowerCase().includes('ok') || status.toLowerCase().includes('active')) {
    variant = "default";
  } else if (status.toLowerCase().includes('prohibited')) {
    variant = "secondary";
  }
  
  return (
    <Badge variant={variant} className="font-normal">
      {translatedStatus}
    </Badge>
  );
};

export default DomainStatusTag;
