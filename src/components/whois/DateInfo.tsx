
import React from 'react';
import { Calendar } from "lucide-react";
import InfoPanel from './InfoPanel';
import { Badge } from "@/components/ui/badge";

interface DateInfoProps {
  label: string;
  date?: string;
  additionalText?: string | null;
  additionalTextClass?: string;
}

const DateInfo: React.FC<DateInfoProps> = ({ 
  label, 
  date = "未知", 
  additionalText,
  additionalTextClass 
}) => {
  const icon = <Calendar className="h-4 w-4 mr-1 text-indigo-500" />;
  
  // Display additionalText in a badge if it exists
  const additionalInfo = additionalText ? (
    <div className="mt-2">
      <Badge variant="outline" className={`${additionalTextClass || ''} border border-gray-200 font-normal`}>
        {additionalText}
      </Badge>
    </div>
  ) : null;

  return (
    <InfoPanel
      icon={icon}
      label={label}
      value={date}
      additionalInfo={additionalInfo}
    />
  );
};

export default DateInfo;
