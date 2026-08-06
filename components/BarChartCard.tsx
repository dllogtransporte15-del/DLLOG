
import React from 'react';

interface BarChartData {
  label: string;
  value: number;
  color: string;
}

interface BarChartCardProps {
  title: string;
  data: BarChartData[];
  total: number;
  unit?: string;
}

const BarChartCard: React.FC<BarChartCardProps> = ({ title, data, total, unit = '' }) => {
  const formatNumber = (value: number) => new Intl.NumberFormat('pt-BR').format(value);

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex-1">
      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">{title}</h3>
      <div className="mt-4">
        <div className="relative w-full bg-gray-200 dark:bg-gray-700 rounded-full h-8 overflow-hidden flex">
          {data.map((item, index) => {
            const percentage = total > 0 ? (item.value / total) * 100 : 0;
            return (
              <div
                key={index}
                className={`h-full ${item.color}`}
                style={{ width: `${percentage}%` }}
                title={`${item.label}: ${formatNumber(item.value)} ${unit}`}
              />
            );
          })}
        </div>
        <div className="mt-3 flex justify-between text-sm text-gray-600 dark:text-gray-400">
          {data.map((item, index) => (
            <div key={index} className="flex items-center">
              <span className={`w-3 h-3 rounded-full mr-2 ${item.color}`}></span>
              <span>{item.label}: <strong>{formatNumber(item.value)} {unit}</strong></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BarChartCard;
