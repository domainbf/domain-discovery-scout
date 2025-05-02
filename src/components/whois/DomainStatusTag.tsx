
import React from 'react';
import { Badge } from "@/components/ui/badge";
import { translateStatusCode, getDomainStatusHealth } from '@/utils/domainStatusUtils';

interface DomainStatusTagProps {
  status: string;
  variant?: "default" | "destructive" | "outline" | "secondary";
}

const DomainStatusTag: React.FC<DomainStatusTagProps> = ({ status, variant }) => {
  const translatedStatus = translateStatusCode(status);
  
  // Determine badge variant based on status content if not provided
  if (!variant) {
    if (status.toLowerCase().includes('hold') || status.toLowerCase().includes('delete')) {
      variant = "destructive";
    } else if (status.toLowerCase().includes('ok') || status.toLowerCase().includes('active')) {
      variant = "default";
    } else if (status.toLowerCase().includes('prohibited')) {
      variant = "secondary";
    } else {
      variant = "outline";
    }
  }
  
  return (
    <Badge variant={variant} className="font-normal">
      {translatedStatus}
    </Badge>
  );
};

export default DomainStatusTag;
