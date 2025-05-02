
import React, { ReactNode, memo } from 'react';

interface InfoPanelProps {
  icon: ReactNode;
  label: string;
  value: string;
  additionalInfo?: ReactNode;
  compact?: boolean;
}

// Use memo to prevent unnecessary re-renders
const InfoPanel: React.FC<InfoPanelProps> = memo(({ icon, label, value, additionalInfo, compact = false }) => {
  return (
    <div className={`bg-white rounded-lg p-4 border border-gray-100 shadow-sm ${compact ? 'p-3' : ''}`}>
      <div className="text-sm text-gray-500 mb-1 flex items-center">
        {icon}
        {label}
      </div>
      <div className="font-medium text-gray-800">
        {value === "未知" ? (
          <span className="text-gray-400">{value}</span>
        ) : (
          value
        )}
      </div>
      {additionalInfo}
    </div>
  );
});

// Display name for React DevTools
InfoPanel.displayName = 'InfoPanel';

export default InfoPanel;
