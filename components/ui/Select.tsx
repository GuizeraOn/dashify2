import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
  label: string;
  value: string;
}

interface SelectProps {
  value: string;
  onChange?: (val: string) => void;
  options: Option[];
  disabled?: boolean;
}

export function Select({ value, onChange, options, disabled }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value) || options[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full bg-[#1E1E1E] border text-left flex items-center justify-between px-3 py-2.5 text-sm transition-colors rounded-md",
          isOpen ? "border-[#0f62fe] text-gray-200" : "border-gray-600 hover:border-gray-500 text-gray-200",
          disabled && "cursor-not-allowed opacity-70 hover:border-gray-600"
        )}
      >
        <span className="truncate">{selectedOption?.label}</span>
        <ChevronDown size={16} className={cn("text-gray-400 transition-transform duration-200 flex-shrink-0 ml-2", isOpen && "rotate-180")} />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-[#242424] border border-[#333] rounded-md shadow-xl overflow-y-auto max-h-60 py-1 origin-top animate-in fade-in slide-in-from-top-2 duration-100">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                onClick={() => {
                  onChange?.(opt.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full text-left px-3 py-2.5 text-sm transition-colors flex items-center justify-between",
                  isSelected 
                    ? "text-[#38bdf8] bg-[#38bdf8]/10" 
                    : "text-gray-300 hover:bg-[#333] hover:text-white"
                )}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && <Check size={14} className="flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
