import { Icon } from './Icons';

interface StarRatingProps {
    rating: number;
    onChange: (rating: number) => void;
}

export const StarRating = ({ rating, onChange }: StarRatingProps) => {
    const displayRating = Math.min(5, Math.max(0, rating));
    return (
        <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => onChange(star)} className="focus:outline-none group cursor-pointer">
                    <Icon
                        name="star"
                        className={`text-4xl transition-transform group-active:scale-110 ${displayRating >= star ? 'text-md-primary' : 'text-md-outline/40'}`}
                        style={{ fontVariationSettings: displayRating >= star ? "'FILL' 1" : "'FILL' 0" }}
                    />
                </button>
            ))}
        </div>
    );
};
