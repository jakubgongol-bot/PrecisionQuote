import React, { useEffect, useState, useRef } from 'react';
import { LucideIcon } from 'lucide-react';

interface InputGroupProps {
  label: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}

export const InputGroup: React.FC<InputGroupProps> = ({ label, icon: Icon, children, className = '' }) => {
  return (
    <div className={`mb-4 ${className}`}>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2">
        {Icon && <Icon size={14} />}
        {label}
      </label>
      <div className="space-y-3">
        {children}
      </div>
    </div>
  );
};

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label: string;
  suffix?: string;
  value: number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const NumberInput: React.FC<NumberInputProps> = ({ label, suffix, value, onChange, ...props }) => {
  // Helper to convert number prop to string for input value
  const valueToString = (v: number) => {
    if (isNaN(v)) return '';
    if (v === 0 && props.placeholder) return '';
    return v.toString();
  };

  const [localValue, setLocalValue] = useState<string>(valueToString(value));
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!isFocused) {
      setLocalValue(valueToString(value));
    } else {
        // When focused, we want to respect the user's typing (localValue).
        // We only force update if the prop value changes to something that doesn't match
        // the current local input (mathematically).
        // This allows typing "1." without it snapping to "1" immediately if parent parses it.
        
        const parsedLocal = parseFloat(localValue);
        
        // If parent value is NaN (e.g. user cleared input), we shouldn't force it to something else
        // unless localValue parses to a valid number (which would mean desync).
        // But usually if parent is NaN, it's because local is empty or invalid.
        if (!isNaN(value)) {
            if (value !== parsedLocal) {
                 setLocalValue(value.toString());
            }
        }
    }
  }, [value, isFocused, props.placeholder]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = e.target.value;
    setLocalValue(newVal);
    onChange(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Prevent invalid numeric characters for this use case
    // We allow Backspace, Tab, Enter, Arrows, Delete, etc. by default as they don't have key values like 'e'
    // We specifically block scientific notation 'e'/'E' and signs '+'/' -' as we generally deal with positive magnitudes or handle negatives via logic if needed (though usually dimensions/prices are positive)
    if (['e', 'E', '+', '-'].includes(e.key)) {
      e.preventDefault();
    }
  };

  return (
    <div className="relative">
      <div className="flex justify-between mb-1">
        <span className="text-sm text-slate-700 font-medium">{label}</span>
      </div>
      <div className="relative rounded-md shadow-sm">
        <input
          type="number"
          className="block w-full rounded-md border-0 py-2 pl-3 pr-10 bg-white text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6"
          value={localValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
              setIsFocused(false);
              // On blur, re-sync with valid numeric representation from parent
              // (This cleans up inputs like "007" to "7" or "3." to "3")
              setLocalValue(valueToString(value));
          }}
          {...props}
        />
        {suffix && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
            <span className="text-slate-500 sm:text-sm">{suffix}</span>
          </div>
        )}
      </div>
    </div>
  );
};