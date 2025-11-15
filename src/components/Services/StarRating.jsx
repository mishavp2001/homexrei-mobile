import React from 'react';
import { Star } from 'lucide-react';

export default function StarRating({ rating, maxStars = 5, size = 'md', showNumber = true, interactive = false, onRatingChange }) {
  const sizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6'
  };

  const handleClick = (value) => {
    if (interactive && onRatingChange) {
      onRatingChange(value);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {[...Array(maxStars)].map((_, index) => {
        const starValue = index + 1;
        const isFilled = starValue <= Math.round(rating);
        const isPartial = starValue > rating && starValue - 1 < rating;
        
        return (
          <button
            key={index}
            onClick={() => handleClick(starValue)}
            disabled={!interactive}
            className={`${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}`}
            type="button"
          >
            <Star
              className={`${sizes[size]} ${
                isFilled 
                  ? 'fill-yellow-400 text-yellow-400' 
                  : isPartial
                  ? 'fill-yellow-200 text-yellow-400'
                  : 'fill-gray-200 text-gray-300'
              }`}
            />
          </button>
        );
      })}
      {showNumber && (
        <span className="text-sm text-gray-600 ml-1">
          {rating > 0 ? rating.toFixed(1) : 'No reviews'}
        </span>
      )}
    </div>
  );
}