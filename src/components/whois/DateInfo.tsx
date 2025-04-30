
import React from 'react';
import { Calendar } from "lucide-react";
import InfoPanel from './InfoPanel';

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
  const additionalInfo = additionalText ? (
    <div className={`text-xs mt-1 font-medium ${additionalTextClass || ''}`}>
      {additionalText}
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
