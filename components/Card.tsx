
import React from 'react';

interface CardProps {
  title: string;
  value: string;
  icon: React.ReactElement;
  colorClass: string;
}

const Card: React.FC<CardProps> = ({ title, value, icon, colorClass }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 flex items-center">
      <div className={`p-3 rounded-full ${colorClass}`}>
        {icon}
      </div>
      <div className="ml-4">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
};

export default Card;
