import { useState, useRef, useEffect } from 'react';
import { Icon } from './Icons';

export interface Option {
    value: string;
    label: string;
    icon?: string;
    disabled?: boolean;
}

interface DropdownProps {
    label?: string;
    labelClassName?: string;
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    buttonClassName?: string;
    icon?: string;
}

export const Dropdown = ({
    label,
    labelClassName = '',
    options,
    value,
    onChange,
    placeholder = 'Select an option',
    className = '',
    buttonClassName = '',
    icon,
}: DropdownProps) => {
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
                <label className={`block typescale-label-medium text-md-on-surface-variant mb-1.5 flex items-center gap-2 ${labelClassName}`}>
                    {icon && <Icon name={icon} className="text-base" />}
                    {label}
                </label>
            )}

            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full text-left px-4 py-3 border border-md-outline-variant/30 bg-md-surface-container-lowest text-md-on-surface typescale-body-large rounded-2xl focus:outline-none focus:border-md-primary focus:ring-2 focus:ring-md-primary/15 transition-all duration-200 flex items-center justify-between shadow-xs ${
                    isOpen ? 'border-md-primary ring-2 ring-md-primary/15' : 'hover:border-md-outline-variant/60'
                } ${buttonClassName}`}
            >
                <span className={`truncate mr-2 flex items-center gap-2 ${selectedOption ? 'text-md-on-surface font-medium' : 'text-md-outline/60'}`}>
                    {selectedOption?.icon && (
                        <Icon name={selectedOption.icon} className="text-base shrink-0 text-md-primary" />
                    )}
                    <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
                </span>
                <Icon
                    name="arrow_drop_down"
                    className={`text-2xl text-md-on-surface-variant transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-2 bg-md-surface-container-high rounded-2xl shadow-md-3 border border-md-outline-variant/30 max-h-72 overflow-y-auto scrollbar-hide animate-in fade-in duration-150">
                    <div className="p-1.5 space-y-1">
                        {options.map((option, idx) => (
                            <button
                                key={`${option.value}-${idx}`}
                                disabled={option.disabled}
                                onClick={() => !option.disabled && handleSelect(option.value)}
                                className={`w-full text-left px-4 py-3 rounded-xl typescale-body-medium transition-colors flex items-center justify-between gap-2 active:scale-[0.99] ${
                                    option.value === value
                                        ? 'bg-md-secondary-container text-md-on-secondary-container font-semibold'
                                        : 'text-md-on-surface hover:bg-md-surface-container-highest'
                                } ${option.disabled ? 'opacity-38 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                                <div className="flex items-center gap-2 min-w-0 pr-1 flex-1">
                                    {option.icon && (
                                        <Icon
                                            name={option.icon}
                                            className={`text-base shrink-0 ${
                                                option.value === value ? 'text-md-on-secondary-container' : 'text-md-primary'
                                            }`}
                                        />
                                    )}
                                    <span className="truncate font-bold leading-snug">{option.label}</span>
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
