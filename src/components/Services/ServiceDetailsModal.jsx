
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { MapPin, Phone, Mail, CheckCircle, Star, Award, ExternalLink, DollarSign, Bed, Bath, Maximize } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import StarRating from './StarRating';
import ReviewForm from './ReviewForm';
import ReviewList from './ReviewList';

export default function ServiceDetailsModal({ service, isOpen, onClose, currentUser }) {
  const queryClient = useQueryClient();
  const [showReviewForm, setShowReviewForm] = useState(false);

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews', service?.id],
    queryFn: async () => {
      if (!service) return [];
      const allReviews = await base44.entities.Review.filter(
        { service_listing_id: service.id },
        '-created_date'
      );
      return allReviews;
    },
    enabled: !!service
  });

  // Fetch deals posted by this service provider
  const { data: providerDeals = [] } = useQuery({
    queryKey: ['providerDeals', service?.expert_email],
    queryFn: async () => {
      if (!service) return [];
      return await base44.entities.Deal.filter({ 
        user_email: service.expert_email,
        status: 'active'
      }, '-created_date');
    },
    enabled: !!service
  });

  const createReviewMutation = useMutation({
    mutationFn: async (reviewData) => {
      const review = await base44.entities.Review.create(reviewData);
      
      // Update service listing with new average
      const newReviewCount = (service.review_count || 0) + 1;
      const currentTotal = (service.average_rating || 0) * (service.review_count || 0);
      const newAverage = (currentTotal + reviewData.rating) / newReviewCount;
      
      await base44.entities.ServiceListing.update(service.id, {
        average_rating: parseFloat(newAverage.toFixed(2)),
        review_count: newReviewCount
      });
      
      return review;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['reviews', service?.id]);
      queryClient.invalidateQueries(['services']);
      setShowReviewForm(false);
      alert('Review submitted successfully!');
    }
  });

  const markHelpfulMutation = useMutation({
    mutationFn: (reviewId) => {
      const review = reviews.find(r => r.id === reviewId);
      return base44.entities.Review.update(reviewId, {
        helpful_count: (review.helpful_count || 0) + 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['reviews', service?.id]);
    }
  });

  const handleSubmitReview = (reviewData) => {
    if (!currentUser) {
      alert('Please sign in to leave a review');
      base44.auth.redirectToLogin(window.location.href);
      return;
    }

    // Check if user already reviewed this service
    const hasReviewed = reviews.some(r => r.reviewer_email === currentUser.email);
    if (hasReviewed) {
      alert('You have already reviewed this service');
      return;
    }

    createReviewMutation.mutate({
      service_listing_id: service.id,
      reviewer_email: currentUser.email,
      reviewer_name: currentUser.full_name || currentUser.email,
      rating: reviewData.rating,
      review_text: reviewData.review_text
    });
  };

  const getServiceProfileUrl = () => {
    if (!service) return null;
    const encodedEmail = encodeURIComponent(service.expert_email);
    return `/service?email=${encodedEmail}`;
  };

  const getDealUrl = (deal) => {
    const encodedAddress = encodeURIComponent(deal.location);
    
    if (deal.deal_type === 'sale') {
      return `/sale?address=${encodedAddress}`;
    } else if (deal.deal_type === 'long_term_rent') {
      return `/rent?address=${encodedAddress}`;
    } else if (deal.deal_type === 'short_term_rent') {
      return `/airbnb?address=${encodedAddress}`;
    }
    return createPageUrl(`Deals#deal-${deal.id}`);
  };

  const getDealTypeLabel = (dealType) => {
    switch (dealType) {
      case 'sale': return 'For Sale';
      case 'long_term_rent': return 'Long-Term Rent';
      case 'short_term_rent': return 'Airbnb';
      case 'service_deal': return 'Service Deal';
      default: return dealType?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Deal';
    }
  };

  if (!service) return null;

  const hasReviewed = currentUser && reviews.some(r => r.reviewer_email === currentUser.email);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl">{service.expert_name}</DialogTitle>
            <a 
              href={getServiceProfileUrl()} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline flex items-center gap-1"
            >
              View Full Profile
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header with photo and basic info */}
          <div className="flex items-start gap-6">
            {service.photo_url ? (
              <img
                src={service.photo_url}
                alt={service.expert_name}
                className="w-32 h-32 object-cover rounded-lg"
              />
            ) : (
              <div className="w-32 h-32 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
                <Award className="w-16 h-16 text-white" />
              </div>
            )}
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline" className="text-base px-4 py-1">
                  {service.service_category}
                </Badge>
                {service.is_verified && (
                  <Badge className="bg-blue-100 text-blue-800">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>
              
              <div className="mb-3">
                <StarRating
                  rating={service.average_rating || 0}
                  size="lg"
                  showNumber={false}
                />
                <p className="text-sm text-gray-600 mt-1">
                  {service.review_count || 0} review{service.review_count !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="space-y-2 text-sm">
                {service.service_area && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-4 h-4" />
                    <span>{service.service_area}</span>
                  </div>
                )}
                {service.years_experience > 0 && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Star className="w-4 h-4" />
                    <span>{service.years_experience} years experience</span>
                  </div>
                )}
                {service.hourly_rate > 0 && (
                  <div className="text-lg font-semibold text-[#d4af37]">
                    ${service.hourly_rate}/hour
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="about" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="about">
                About
                {providerDeals.length > 0 && (
                  <Badge variant="outline" className="ml-2">
                    {providerDeals.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="reviews">
                Reviews ({service.review_count || 0})
              </TabsTrigger>
              <TabsTrigger value="contact">Contact</TabsTrigger>
            </TabsList>

            <TabsContent value="about" className="space-y-6 mt-6">
              <div>
                <h3 className="font-semibold text-[#1e3a5f] mb-2">Description</h3>
                <p className="text-gray-700 leading-relaxed">{service.description}</p>
              </div>

              {service.certifications && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">Certifications & Licenses</h3>
                  <p className="text-blue-800 text-sm">{service.certifications}</p>
                </div>
              )}

              {/* Active Deals Section */}
              {providerDeals.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <DollarSign className="w-5 h-5 text-[#d4af37]" />
                    <h3 className="font-semibold text-[#1e3a5f] text-lg">Active Deals & Listings</h3>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {providerDeals.map((deal) => (
                      <Card key={deal.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                        {deal.photo_urls?.length > 0 && (
                          <div className="h-32 overflow-hidden">
                            <img
                              src={deal.photo_urls[0]}
                              alt={deal.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-bold text-[#1e3a5f] line-clamp-1 text-sm">{deal.title}</h4>
                            <Badge variant="outline" className="text-xs shrink-0 ml-2">
                              {getDealTypeLabel(deal.deal_type)}
                            </Badge>
                          </div>
                          
                          <p className="text-lg font-bold text-[#d4af37] mb-2">
                            {deal.deal_type === 'short_term_rent' && deal.price_per_night ? (
                              `$${deal.price_per_night}/night`
                            ) : deal.deal_type === 'long_term_rent' ? (
                              `$${deal.price.toLocaleString()}/mo`
                            ) : (
                              `$${deal.price.toLocaleString()}`
                            )}
                          </p>

                          {deal.bedrooms || deal.bathrooms || deal.sqft ? (
                            <div className="flex gap-3 mb-3 text-xs text-gray-600">
                              {deal.bedrooms && (
                                <span className="flex items-center gap-1">
                                  <Bed className="w-3 h-3" />
                                  {deal.bedrooms}
                                </span>
                              )}
                              {deal.bathrooms && (
                                <span className="flex items-center gap-1">
                                  <Bath className="w-3 h-3" />
                                  {deal.bathrooms}
                                </span>
                              )}
                              {deal.sqft && (
                                <span className="flex items-center gap-1">
                                  <Maximize className="w-3 h-3" />
                                  {deal.sqft}
                                </span>
                              )}
                            </div>
                          ) : null}

                          <div className="flex items-start gap-1 text-xs text-gray-500 mb-3">
                            <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                            <span className="line-clamp-1">{deal.location}</span>
                          </div>

                          <Link to={getDealUrl(deal)}>
                            <Button size="sm" className="w-full bg-[#1e3a5f] hover:bg-[#2a4a7f]">
                              View Deal
                            </Button>
                          </Link>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="reviews" className="space-y-6 mt-6">
              {!hasReviewed && currentUser && !showReviewForm && (
                <Button
                  onClick={() => setShowReviewForm(true)}
                  className="bg-[#d4af37] hover:bg-[#c49d2a]"
                >
                  <Star className="w-4 h-4 mr-2" />
                  Write a Review
                </Button>
              )}

              {showReviewForm && (
                <ReviewForm
                  onSubmit={handleSubmitReview}
                  onCancel={() => setShowReviewForm(false)}
                  isSubmitting={createReviewMutation.isLoading}
                />
              )}

              <div>
                <h3 className="font-semibold text-[#1e3a5f] mb-4">
                  Customer Reviews
                </h3>
                <ReviewList
                  reviews={reviews}
                  onHelpful={(reviewId) => markHelpfulMutation.mutate(reviewId)}
                />
              </div>
            </TabsContent>

            <TabsContent value="contact" className="space-y-4 mt-6">
              <div>
                <h3 className="font-semibold text-[#1e3a5f] mb-4">Get in Touch</h3>
                <div className="space-y-3">
                  {service.expert_phone && (
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <a href={`tel:${service.expert_phone}`}>
                        <Phone className="w-4 h-4 mr-2" />
                        {service.expert_phone}
                      </a>
                    </Button>
                  )}
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <a href={`mailto:${service.expert_email}`}>
                      <Mail className="w-4 h-4 mr-2" />
                      {service.expert_email}
                    </a>
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
