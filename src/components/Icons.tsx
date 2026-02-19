import { twMerge } from 'tailwind-merge';

interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
    name: string;
    className?: string;
}

export const Icon = ({ name, className, ...props }: IconProps) => {
    return (
        <span
            className={twMerge(
                'material-symbols-outlined select-none',
                className
            )}
            {...props}
        >
            {name}
        </span>
    );
};
