import { Dropdown } from './Dropdown';
import { TASTE_OPTIONS } from '../features/pantry/domain/beanOptions';

interface TasteProfileFieldsProps {
    value: { sweet: string, acid: string, body: string, bitter: string };
    onChange: (field: 'sweet' | 'acid' | 'body' | 'bitter', value: string) => void;
}

export function TasteProfileFields({ value, onChange }: TasteProfileFieldsProps) {
    return (
        <div className="grid grid-cols-2 gap-3">
            <Dropdown label="Sweet" value={value.sweet} options={TASTE_OPTIONS} onChange={(val) => onChange('sweet', val)} placeholder="Select" />
            <Dropdown label="Acid" value={value.acid} options={TASTE_OPTIONS} onChange={(val) => onChange('acid', val)} placeholder="Select" />
            <Dropdown label="Body" value={value.body} options={TASTE_OPTIONS} onChange={(val) => onChange('body', val)} placeholder="Select" />
            <Dropdown label="Bitter" value={value.bitter} options={TASTE_OPTIONS} onChange={(val) => onChange('bitter', val)} placeholder="Select" />
        </div>
    );
}
