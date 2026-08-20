import React, { useState, useRef, useEffect } from 'react';
import { Icon } from './Icons';

export interface Option {
    value: string;
    label: string;
    description?: string;
    disabled?: boolean;
}

interface DropdownProps {
    label?: string;
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    buttonClassName?: string;
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
    buttonClassName = '',
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
                <label className="block typescale-label-medium text-md-on-surface-variant mb-1.5 flex items-center gap-2">
                    {icon && <Icon name={icon} className="text-base" />}
                    {label} {required && <span className="text-md-error">*</span>}
                </label>
            )}

            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full text-left px-4 py-3 border border-md-outline bg-md-surface-container-lowest text-md-on-surface typescale-body-large rounded-sm focus:outline-none focus:border-2 focus:border-md-primary transition-all duration-200 flex items-center justify-between ${
                    isOpen ? 'border-2 border-md-primary ring-2 ring-md-primary/15' : 'hover:border-md-outline'
                } ${buttonClassName}`}
            >
                <span className={selectedOption ? 'text-md-on-surface' : 'text-md-outline/60'}>
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <Icon
                    name="arrow_drop_down"
                    className={`text-2xl text-md-on-surface-variant transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1.5 bg-md-surface-container-high rounded-sm shadow-md-2 border border-md-outline-variant/30 max-h-72 overflow-y-auto scrollbar-hide animate-in fade-in duration-150">
                    <div className="p-1 space-y-0.5">
                        {options.map((option) => (
                            <button
                                key={option.value}
                                disabled={option.disabled}
                                onClick={() => !option.disabled && handleSelect(option.value)}
                                className={`w-full text-left px-4 py-3 rounded-xs typescale-body-medium transition-colors flex items-center justify-between gap-2 ${
                                    option.value === value
                                        ? 'bg-md-secondary-container text-md-on-secondary-container font-semibold'
                                        : 'text-md-on-surface hover:bg-md-surface-container-highest'
                                } ${option.disabled ? 'opacity-38 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                                <div className="flex flex-col flex-1 min-w-0 pr-1">
                                    <span className="font-bold leading-snug">{option.label}</span>
                                    {option.description && (
                                        <span className="typescale-body-small text-md-on-surface-variant/80 font-normal mt-0.5 leading-snug">
                                            {option.description}
                                        </span>
                                    )}
                                </div>
                                {option.value === value && (
                                    <Icon name="check" className="text-md-primary text-lg shrink-0" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

