import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import StarRating from './StarRating';
import { Send, X } from 'lucide-react';

export default function ReviewForm({ onSubmit, onCancel, isSubmitting }) {
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (rating === 0) {
      alert('Please select a rating');
      return;
    }
    onSubmit({ rating, review_text: reviewText });
  };

  return (
    <Card className="p-6 bg-gray-50">
      <h3 className="text-lg font-semibold text-[#1e3a5f] mb-4">Write a Review</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label className="mb-2 block">Your Rating *</Label>
          <StarRating
            rating={rating}
            interactive={true}
            onRatingChange={setRating}
            size="xl"
            showNumber={false}
          />
          {rating > 0 && (
            <p className="text-sm text-gray-600 mt-2">
              {rating === 1 && '⭐ Poor'}
              {rating === 2 && '⭐⭐ Fair'}
              {rating === 3 && '⭐⭐⭐ Good'}
              {rating === 4 && '⭐⭐⭐⭐ Very Good'}
              {rating === 5 && '⭐⭐⭐⭐⭐ Excellent'}
            </p>
          )}
        </div>
        
        <div>
          <Label htmlFor="review">Your Review</Label>
          <Textarea
            id="review"
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Share your experience with this service provider..."
            rows={4}
            className="mt-2"
          />
        </div>

        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={isSubmitting || rating === 0}
            className="bg-[#1e3a5f] hover:bg-[#2a4a7f]"
          >
            <Send className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Submitting...' : 'Submit Review'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}