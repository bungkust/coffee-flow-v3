import React, { useState, useRef, useEffect } from 'react';
import { Icon } from './Icons';

interface Option {
    value: string;
    label: string;
    disabled?: boolean;
}

interface DropdownProps {
    label?: string;
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    icon?: string;
    required?: boolean;
}

export const Dropdown: React.FC<DropdownProps> = ({
    label,
    options,
    value,
    onChange,
    placeholder = 'Select an option',
    className = '',
    icon,
    required = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedOption = options.find((opt) => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleSelect = (optionValue: string) => {
        onChange(optionValue);
        setIsOpen(false);
    };

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {label && (
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-2">
                    {icon && <Icon name={icon} className="text-[16px]" />}
                    {label} {required && <span className="text-red-400">*</span>}
                </label>
            )}

            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full text-left rounded-xl py-3 px-4 border focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm font-medium transition-all flex items-center justify-between ${isOpen
                    ? 'border-primary ring-2 ring-primary/20 bg-white dark:bg-[#2C241B]'
                    : 'bg-white dark:bg-[#2C241B] border-gray-200 dark:border-gray-700 hover:border-primary/30'
                    }`}
            >
                <span className={selectedOption ? 'text-neutral-text dark:text-white' : 'text-gray-400'}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <Icon
                    name="arrow_drop_down"
                    className={`text-xl text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-white dark:bg-[#2C241B] rounded-xl shadow-xl border border-gray-100 dark:border-white/5 max-h-60 overflow-y-auto scrollbar-hide animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-1">
                        {options.map((option) => (
                            <button
                                key={option.value}
                                disabled={option.disabled}
                                onClick={() => !option.disabled && handleSelect(option.value)}
                                className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-between ${option.value === value
                                    ? 'bg-primary/5 text-primary'
                                    : 'text-neutral-text dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5'
                                    } ${option.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {option.label}
                                {option.value === value && (
                                    <Icon name="check" className="text-primary text-[18px]" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
