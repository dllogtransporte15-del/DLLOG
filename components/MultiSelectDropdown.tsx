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
    <div className={`space-y-1 relative ${className}`} ref={dropdownRef}>
      {label && <label className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-sm focus:ring-2 focus:ring-primary outline-none text-left bg-white dark:bg-gray-800"
      >
        <span className="truncate flex-1 pr-2 text-gray-700 dark:text-gray-300">
          {selectedValues.length === 0 ? placeholder :
           selectedValues.length === 1 ? selectedValues[0] :
           `${selectedValues.length} selecionados`}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg">
          <div className="p-2 border-b border-gray-100 dark:border-gray-700">
            <input
              type="text"
              className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-1 focus:ring-primary text-gray-700 dark:text-gray-200"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {!searchTerm && options.length > 0 && (
                <label className="flex items-center px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    className="mr-2 border-gray-300 rounded text-primary focus:ring-primary h-4 w-4 appearance-none checked:bg-primary checked:border-transparent flex-shrink-0 align-middle"
                    checked={isAllSelected}
                    onChange={toggleAll}
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">Selecionar Todos</span>
                </label>
            )}
            {filteredOptions.length === 0 ? (
              <div className="px-2 py-2 text-sm text-gray-500 text-center">Nenhum resultado</div>
            ) : (
              filteredOptions.map((option) => (
                <label key={option} className="flex items-center px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    className="mr-2 border-gray-300 rounded text-primary focus:ring-primary h-4 w-4 appearance-none checked:bg-primary checked:border-transparent flex-shrink-0 align-middle"
                    checked={selectedValues.includes(option)}
                    onChange={() => toggleOption(option)}
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300 truncate" title={option}>{option}</span>
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
