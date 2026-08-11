import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  className?: string;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({ label, options, selectedValues, onChange, placeholder = "Selecione...", className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => opt.toLowerCase().includes(searchTerm.toLowerCase()));

  const toggleOption = (option: string) => {
    if (selectedValues.includes(option)) {
      onChange(selectedValues.filter(v => v !== option));
    } else {
      onChange([...selectedValues, option]);
    }
  };

  const isAllSelected = selectedValues.length === options.length && options.length > 0;

  const toggleAll = () => {
    if (isAllSelected) {
      onChange([]);
    } else {
      onChange([...options]);
    }
  };

  return (
    <div className={`space-y-1.5 relative ${className}`} ref={dropdownRef}>
      {label && <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:ring-2 focus:ring-primary outline-none text-left bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-xs transition-colors"
      >
        <span className="truncate flex-1 pr-2 text-gray-800 dark:text-gray-200 font-medium">
          {selectedValues.length === 0 ? placeholder :
           selectedValues.length === 1 ? selectedValues[0] :
           `${selectedValues.length} selecionados`}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400 dark:text-gray-400 flex-shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden animate-fade-in">
          <div className="p-2 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/40">
            <input
              type="text"
              className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="max-h-48 overflow-y-auto p-1.5 space-y-0.5">
            {!searchTerm && options.length > 0 && (
                <label className="flex items-center px-2.5 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700/60 rounded-lg cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    className="mr-2.5 rounded text-primary focus:ring-primary h-4 w-4 accent-primary flex-shrink-0"
                    checked={isAllSelected}
                    onChange={toggleAll}
                  />
                  <span className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">Selecionar Todos</span>
                </label>
            )}
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400 text-center font-medium">Nenhum resultado</div>
            ) : (
              filteredOptions.map((option) => (
                <label key={option} className="flex items-center px-2.5 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700/60 rounded-lg cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    className="mr-2.5 rounded text-primary focus:ring-primary h-4 w-4 accent-primary flex-shrink-0"
                    checked={selectedValues.includes(option)}
                    onChange={() => toggleOption(option)}
                  />
                  <span className="text-sm text-gray-800 dark:text-gray-200 truncate" title={option}>{option}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MultiSelectDropdown;
