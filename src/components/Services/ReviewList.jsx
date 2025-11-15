import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, ThumbsUp } from 'lucide-react';
import StarRating from './StarRating';
import { format } from 'date-fns';

export default function ReviewList({ reviews, onHelpful }) {
  if (!reviews || reviews.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-500">No reviews yet. Be the first to review!</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <Card key={review.id} className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-gray-400 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-gray-900">{review.reviewer_name}</p>
                  <StarRating rating={review.rating} size="sm" showNumber={false} />
                </div>
                <span className="text-xs text-gray-500">
                  {format(new Date(review.created_date), 'MMM d, yyyy')}
                </span>
              </div>
              
              {review.review_text && (
                <p className="text-gray-700 mb-3 whitespace-pre-line">
                  {review.review_text}
                </p>
              )}
              
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onHelpful && onHelpful(review.id)}
                  className="text-gray-500 hover:text-[#1e3a5f]"
                >
                  <ThumbsUp className="w-3 h-3 mr-1" />
                  Helpful {review.helpful_count > 0 && `(${review.helpful_count})`}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}