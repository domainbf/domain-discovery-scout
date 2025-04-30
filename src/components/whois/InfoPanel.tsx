
import React, { ReactNode } from 'react';

interface InfoPanelProps {
  icon: ReactNode;
  label: string;
  value: string;
  additionalInfo?: ReactNode;
}

const InfoPanel: React.FC<InfoPanelProps> = ({ icon, label, value, additionalInfo }) => {
  return (
    <div className="bg-gray-50/80 rounded-lg p-4">
      <div className="text-sm text-gray-500 mb-1 flex items-center">
        {icon}
        {label}
      </div>
      <div className="font-medium text-gray-800">{value}</div>
      {additionalInfo}
    </div>
  );
};

export default InfoPanel;
