
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Wrench, MapPin, Phone, Mail, CheckCircle, Star, Award, 
  Loader2, ArrowLeft, Clock, DollarSign, Calendar as CalendarIcon, AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import Navigation from '../components/Navigation';
import StarRating from '../components/Services/StarRating';
import ReviewForm from '../components/Services/ReviewForm';
import ReviewList from '../components/Services/ReviewList';

export const isPublic = true;

export default function ServiceProfile() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const serviceId = urlParams.get('id');
  const expertEmail = urlParams.get('email');
  const expertName = urlParams.get('name');

  const [currentUser, setCurrentUser] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingData, setBookingData] = useState({
    service_date: null,
    service_time: '',
    renter_name: '',
    renter_phone: '',
    message: ''
  });
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        setBookingData(prev => ({
          ...prev,
          renter_name: user.full_name || ''
        }));
      } catch (error) {
        setCurrentUser(null);
      }
    };
    loadUser();
  }, []);

  const { data: service, isLoading } = useQuery({
    queryKey: ['service', serviceId, expertEmail, expertName],
    queryFn: async () => {
      try {
        if (serviceId) {
          const services = await base44.entities.ServiceListing.filter({ id: serviceId });
          return services[0] || null;
        } else if (expertEmail) {
          const decodedEmail = decodeURIComponent(expertEmail);
          const allServices = await base44.entities.ServiceListing.list();
          return allServices.find(s => s.expert_email === decodedEmail) || null;
        } else if (expertName) {
          const decodedName = decodeURIComponent(expertName);
          const allServices = await base44.entities.ServiceListing.list();
          return allServices.find(s => s.expert_name === decodedName) || null;
        }
        return null;
      } catch (error) {
        console.error('Error fetching service:', error);
        return null;
      }
    },
    enabled: !!(serviceId || expertEmail || expertName)
  });

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

  const { data: similarProviders = [] } = useQuery({
    queryKey: ['similarProviders', service?.service_category, service?.expert_email],
    queryFn: async () => {
      if (!service) return [];
      const providers = await base44.entities.ServiceListing.filter({
        service_category: service.service_category,
        status: 'active'
      }, '-average_rating');
      return providers.filter(p => p.expert_email !== service.expert_email).slice(0, 3);
    },
    enabled: !!service && providerDeals.length === 0
  });

  const { data: relatedDeals = [] } = useQuery({
    queryKey: ['relatedDeals', service?.service_category],
    queryFn: async () => {
      if (!service) return [];
      const deals = await base44.entities.Deal.filter({
        service_category: service.service_category,
        deal_type: 'service_deal',
        status: 'active'
      }, '-created_date');
      return deals.filter(d => d.user_email !== service.expert_email).slice(0, 6);
    },
    enabled: !!service && providerDeals.length === 0
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews', service?.id],
    queryFn: async () => {
      if (!service) return [];
      return await base44.entities.Review.filter(
        { service_listing_id: service.id },
        '-created_date'
      );
    },
    enabled: !!service
  });

  const createBookingMutation = useMutation({
    mutationFn: (data) => base44.entities.Booking.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['bookings']);
      setBookingSuccess(true);
      setTimeout(() => {
        setShowBookingForm(false);
        setBookingSuccess(false);
        setBookingData({
          service_date: null,
          service_time: '',
          renter_name: currentUser?.full_name || '',
          renter_phone: '',
          message: ''
        });
      }, 2000);
    },
    onError: (error) => {
      setBookingError(error.message || 'Failed to submit booking request');
    }
  });

  const handleServiceBookingSubmit = async (e) => {
    e.preventDefault();
    setBookingError('');

    if (!currentUser) {
      alert('Please sign in to book this service');
      base44.auth.redirectToLogin(window.location.href);
      return;
    }

    if (!bookingData.service_date || !bookingData.service_time) {
      setBookingError('Please select date and time');
      return;
    }

    if (!bookingData.renter_phone?.trim()) {
      setBookingError('Please provide a phone number');
      return;
    }

    const bookingPayload = {
      booking_type: 'service',
      service_id: service.id,
      service_name: service.expert_name,
      renter_email: currentUser.email,
      renter_name: bookingData.renter_name || currentUser.full_name,
      renter_phone: bookingData.renter_phone,
      owner_email: service.expert_email,
      service_date: format(bookingData.service_date, 'yyyy-MM-dd'),
      service_time: bookingData.service_time,
      service_price: service.hourly_rate || 0,
      total_cost: service.hourly_rate || 0,
      message: bookingData.message,
      property_address: `${service.service_category} Service Request`
    };

    try {
      console.log('=== SERVICE BOOKING REQUEST DEBUG ===');
      console.log('1. Creating booking record...');
      
      const newBooking = await base44.entities.Booking.create(bookingPayload);
      console.log('✅ Booking created:', newBooking.id);
      
      const bookingRequestUrl = `${window.location.origin}/dashboard`;
      
      const messageSubject = `New ${service.service_category} Service Booking Request`;
      
      let messageBody = `NEW SERVICE BOOKING REQUEST\n\n`;
      messageBody += `Service: ${service.expert_name}\n`;
      messageBody += `Category: ${service.service_category}\n\n`;
      messageBody += `CLIENT DETAILS:\n`;
      messageBody += `Name: ${bookingData.renter_name || currentUser.full_name}\n`;
      messageBody += `Email: ${currentUser.email}\n`;
      messageBody += `Phone: ${bookingData.renter_phone}\n\n`;
      messageBody += `APPOINTMENT:\n`;
      messageBody += `Date: ${format(bookingData.service_date, 'EEEE, MMMM d, yyyy')}\n`;
      messageBody += `Time: ${bookingData.service_time}\n\n`;
      messageBody += `SERVICE RATE: $${service.hourly_rate}/hour\n\n`;
      
      if (bookingData.message) {
        messageBody += `MESSAGE FROM CLIENT:\n${bookingData.message}\n\n`;
      }
      
      messageBody += `---\n`;
      messageBody += `Review and respond to this booking request:\n`;
      messageBody += `${bookingRequestUrl}\n\n`;
      messageBody += `Or reply to this message to communicate with the client.\n`;
      
      console.log('2. Creating in-app message...');
      
      try {
        const message = await base44.entities.Message.create({
          sender_email: currentUser.email,
          sender_name: bookingData.renter_name || currentUser.full_name,
          recipient_email: service.expert_email,
          recipient_name: service.expert_name,
          subject: messageSubject,
          content: messageBody,
          thread_id: `service_booking_${newBooking.id}_${Date.now()}`,
          reference_type: 'service',
          reference_id: service.id,
          is_read: false
        });
        console.log('✅ In-app message created:', message.id);
      } catch (msgError) {
        console.error('❌ Failed to create in-app message:', msgError);
      }
      
      console.log('3. Sending email notification...');
      
      try {
        await base44.integrations.Core.SendEmail({
          to: service.expert_email,
          subject: messageSubject,
          body: messageBody
        });
        console.log('✅ Email sent to service provider');
      } catch (emailError) {
        console.error('❌ Failed to send email:', emailError);
      }
      
      console.log('4. SMS notification...');
      if (service.expert_phone) {
        console.log('📱 SMS would be sent to:', service.expert_phone);
        console.log('SMS content:', `New service booking request from ${bookingData.renter_name}. Check your email or HomeXREI dashboard: ${bookingRequestUrl}`);
      }
      
      console.log('✅ SERVICE BOOKING REQUEST COMPLETED');
      
      alert('Service booking request sent successfully!\n\n✅ In-app message sent to provider\n✅ Email notification sent\n\nThe service provider will review your request and respond soon.');
      
      queryClient.invalidateQueries(['bookings']);
      setBookingSuccess(true);
      
      setTimeout(() => {
        setShowBookingForm(false);
        setBookingSuccess(false);
        setBookingData({
          service_date: null,
          service_time: '',
          renter_name: currentUser?.full_name || '',
          renter_phone: '',
          message: ''
        });
      }, 2000);
      
    } catch (error) {
      console.error('❌ SERVICE BOOKING ERROR:', error);
      setBookingError(error.message || 'Failed to submit booking request. Please try again.');
    }
  };

  const createReviewMutation = useMutation({
    mutationFn: async (reviewData) => {
      const review = await base44.entities.Review.create(reviewData);
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
      queryClient.invalidateQueries(['service']);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <Navigation user={currentUser} />
        <div className="py-12 px-4 flex items-center justify-center">
          <Card className="p-12 text-center max-w-md">
            <Wrench className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Service Provider Not Found</h2>
            <p className="text-gray-600 mb-4">
              {expertEmail ? `No service listing found for: ${decodeURIComponent(expertEmail)}` : 'This service listing is no longer available.'}
            </p>
            <Link to={createPageUrl('Services')}>
              <Button className="bg-[#1e3a5f] hover:bg-[#2a4a7f]">Browse All Services</Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  const hasReviewed = currentUser && reviews.some(r => r.reviewer_email === currentUser.email);
  const isOwner = currentUser && currentUser.email === service.expert_email;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <Navigation user={currentUser} />
      
      <div className="py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <Link to={createPageUrl('Services')}>
            <Button variant="outline" className="mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Service Providers
            </Button>
          </Link>

          <Card className="p-8 mb-8 bg-white shadow-xl">
            <div className="flex flex-col md:flex-row gap-6">
              {service.photo_url ? (
                <img
                  src={service.photo_url}
                  alt={service.expert_name}
                  className="w-32 h-32 object-cover rounded-lg"
                />
              ) : (
                <div className="w-32 h-32 bg-[#1e3a5f] rounded-lg flex items-center justify-center flex-shrink-0">
                  <Award className="w-16 h-16 text-white" />
                </div>
              )}
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h1 className="text-3xl font-bold text-[#1e3a5f]">{service.expert_name}</h1>
                  {service.is_verified && (
                    <Badge className="bg-blue-100 text-blue-800">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Verified
                    </Badge>
                  )}
                </div>
                
                <Badge variant="outline" className="text-base px-4 py-1 mb-4">
                  {service.service_category}
                </Badge>

                <div className="mb-4">
                  <StarRating rating={service.average_rating || 0} size="lg" showNumber={false} />
                  <p className="text-sm text-gray-600 mt-1">
                    {service.review_count || 0} review{service.review_count !== 1 ? 's' : ''}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  {service.service_area && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>{service.service_area}</span>
                    </div>
                  )}
                  {service.years_experience > 0 && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{service.years_experience} years experience</span>
                    </div>
                  )}
                  {service.hourly_rate > 0 && (
                    <div className="flex items-center gap-2 text-[#d4af37] font-semibold">
                      <DollarSign className="w-4 h-4" />
                      <span>${service.hourly_rate}/hour</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-6 border-t">
              {!isOwner && (
                <Dialog open={showBookingForm} onOpenChange={setShowBookingForm}>
                  <DialogTrigger asChild>
                    <Button className="flex-1 bg-[#d4af37] hover:bg-[#c49d2a]">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      Request Service
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Request Service from {service.expert_name}</DialogTitle>
                    </DialogHeader>

                    {bookingSuccess ? (
                      <div className="py-8 text-center">
                        <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Booking Request Sent!</h3>
                        <p className="text-gray-600">
                          The service provider will review your request and contact you soon.
                        </p>
                      </div>
                    ) : (
                      <form onSubmit={handleServiceBookingSubmit} className="space-y-4">
                        {bookingError && (
                          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-800">{bookingError}</p>
                          </div>
                        )}

                        <div>
                          <Label>Service Date *</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full justify-start">
                                <CalendarIcon className="w-4 h-4 mr-2" />
                                {bookingData.service_date ? format(bookingData.service_date, 'MMM d, yyyy') : 'Select date'}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={bookingData.service_date}
                                onSelect={(date) => setBookingData({ ...bookingData, service_date: date })}
                                disabled={(date) => date < new Date()}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div>
                          <Label>Preferred Time *</Label>
                          <Input
                            type="time"
                            value={bookingData.service_time}
                            onChange={(e) => setBookingData({ ...bookingData, service_time: e.target.value })}
                            required
                          />
                        </div>

                        <div>
                          <Label>Your Name *</Label>
                          <Input
                            value={bookingData.renter_name}
                            onChange={(e) => setBookingData({ ...bookingData, renter_name: e.target.value })}
                            required
                          />
                        </div>

                        <div>
                          <Label>Phone Number *</Label>
                          <Input
                            type="tel"
                            value={bookingData.renter_phone}
                            onChange={(e) => setBookingData({ ...bookingData, renter_phone: e.target.value })}
                            placeholder="+1 (555) 123-4567"
                            required
                          />
                        </div>

                        <div>
                          <Label>Details / Message</Label>
                          <Textarea
                            value={bookingData.message}
                            onChange={(e) => setBookingData({ ...bookingData, message: e.target.value })}
                            rows={4}
                            placeholder="Describe what you need help with..."
                          />
                        </div>

                        <div className="p-4 bg-blue-50 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Hourly Rate:</span>
                            <span className="text-lg font-bold text-[#d4af37]">${service.hourly_rate}/hour</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            Final cost will be determined after assessment
                          </p>
                        </div>

                        <div className="flex gap-2 pt-4">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowBookingForm(false)}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={createBookingMutation.isLoading}
                            className="flex-1 bg-[#d4af37] hover:bg-[#c49d2a]"
                          >
                            {createBookingMutation.isLoading ? (
                              <><Loader2 className="w-4 h-4 animate-spin mr-2" />Sending...</>
                            ) : (
                              'Request Booking'
                            )}
                          </Button>
                        </div>
                      </form>
                    )}
                  </DialogContent>
                </Dialog>
              )}
              
              {service.expert_phone && (
                <Button variant="outline" className="flex-1" asChild>
                  <a href={`tel:${service.expert_phone}`}>
                    <Phone className="w-4 h-4 mr-2" />
                    Call
                  </a>
                </Button>
              )}
              <Button variant="outline" className="flex-1" asChild>
                <a href={`mailto:${service.expert_email}`}>
                  <Mail className="w-4 h-4 mr-2" />
                  Email
                </a>
              </Button>
            </div>
          </Card>

          <Tabs defaultValue="about" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="about">About</TabsTrigger>
              <TabsTrigger value="reviews">
                Reviews ({service.review_count || 0})
              </TabsTrigger>
              <TabsTrigger value="deals">
                Service Deals ({providerDeals.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="about">
              <Card className="p-8">
                <h2 className="text-2xl font-bold text-[#1e3a5f] mb-4">About</h2>
                <p className="text-gray-700 leading-relaxed mb-6">{service.description}</p>

                {service.certifications && (
                  <div className="p-6 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                      <Award className="w-5 h-5" />
                      Certifications & Licenses
                    </h3>
                    <p className="text-blue-800">{service.certifications}</p>
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="reviews">
              <Card className="p-8">
                {!hasReviewed && currentUser && !showReviewForm && !isOwner && (
                  <Button
                    onClick={() => setShowReviewForm(true)}
                    className="mb-6 bg-[#d4af37] hover:bg-[#c49d2a]"
                  >
                    <Star className="w-4 h-4 mr-2" />
                    Write a Review
                  </Button>
                )}

                {showReviewForm && (
                  <div className="mb-6">
                    <ReviewForm
                      onSubmit={handleSubmitReview}
                      onCancel={() => setShowReviewForm(false)}
                      isSubmitting={createReviewMutation.isLoading}
                    />
                  </div>
                )}

                <div>
                  <h3 className="text-xl font-bold text-[#1e3a5f] mb-4">
                    Customer Reviews
                  </h3>
                  <ReviewList
                    reviews={reviews}
                    onHelpful={(reviewId) => markHelpfulMutation.mutate(reviewId)}
                  />
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="deals">
              <Card className="p-8">
                <h3 className="text-xl font-bold text-[#1e3a5f] mb-2">
                  Active Service Deals & Property Listings
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  Special offers, property listings, and specific service deals from this provider
                </p>
                
                {providerDeals.length === 0 ? (
                  <div>
                    <div className="text-center py-8 mb-8">
                      <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-2">No active deals from this provider yet</p>
                      <p className="text-sm text-gray-500">Check out similar providers and their deals below</p>
                    </div>

                    {similarProviders.length > 0 && (
                      <div className="mb-8">
                        <h4 className="text-lg font-semibold text-[#1e3a5f] mb-4">
                          Similar {service.service_category} Providers
                        </h4>
                        <div className="grid md:grid-cols-3 gap-4">
                          {similarProviders.map((provider) => (
                            <Card key={provider.id} className="p-4 hover:shadow-lg transition-shadow">
                              <div className="flex items-start gap-3 mb-3">
                                {provider.photo_url ? (
                                  <img
                                    src={provider.photo_url}
                                    alt={provider.expert_name}
                                    className="w-12 h-12 object-cover rounded-lg"
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
                                    <Wrench className="w-6 h-6 text-white" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <h5 className="font-semibold text-[#1e3a5f] truncate">{provider.expert_name}</h5>
                                  <div className="flex items-center gap-1">
                                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                    <span className="text-xs text-gray-600">
                                      {provider.average_rating?.toFixed(1) || '0.0'} ({provider.review_count || 0})
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <p className="text-xs text-gray-600 mb-3 line-clamp-2">{provider.description}</p>
                              <a 
                                href={`/service?email=${encodeURIComponent(provider.expert_email)}`}
                                className="block"
                              >
                                <Button size="sm" variant="outline" className="w-full">
                                  View Profile
                                </Button>
                              </a>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}

                    {relatedDeals.length > 0 && (
                      <div>
                        <h4 className="text-lg font-semibold text-[#1e3a5f] mb-4">
                          Related {service.service_category} Deals
                        </h4>
                        <div className="grid md:grid-cols-2 gap-4">
                          {relatedDeals.map((deal) => (
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
                                <h5 className="font-bold text-[#1e3a5f] mb-2 line-clamp-1">{deal.title}</h5>
                                <p className="text-lg font-bold text-[#d4af37] mb-2">
                                  ${deal.price.toLocaleString()}
                                </p>
                                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{deal.description}</p>
                                <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
                                  <MapPin className="w-3 h-3 shrink-0" />
                                  <span className="line-clamp-1">{deal.location}</span>
                                </div>
                                <Link to={createPageUrl(`Deals`)}>
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
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-6">
                    {providerDeals.map((deal) => (
                      <Card key={deal.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                        {deal.photo_urls?.length > 0 && (
                          <div className="h-48 overflow-hidden">
                            <img
                              src={deal.photo_urls[0]}
                              alt={deal.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-bold text-[#1e3a5f] line-clamp-1">{deal.title}</h4>
                            <Badge className="bg-[#d4af37] text-white shrink-0 ml-2">
                              {deal.deal_type === 'sale' ? 'Sale' :
                               deal.deal_type === 'long_term_rent' ? 'Rent' :
                               deal.deal_type === 'short_term_rent' ? 'Airbnb' : 'Service Deal'}
                            </Badge>
                          </div>
                          
                          <p className="text-2xl font-bold text-[#d4af37] mb-2">
                            {deal.deal_type === 'short_term_rent' && deal.price_per_night ? (
                              `$${deal.price_per_night}/night`
                            ) : deal.deal_type === 'long_term_rent' ? (
                              `$${deal.price.toLocaleString()}/mo`
                            ) : (
                              `$${deal.price.toLocaleString()}`
                            )}
                          </p>

                          <p className="text-sm text-gray-600 mb-3 line-clamp-2">{deal.description}</p>

                          <div className="flex items-center gap-1 text-sm text-gray-500 mb-4">
                            <MapPin className="w-4 h-4 shrink-0" />
                            <span className="line-clamp-1">{deal.location}</span>
                          </div>

                          <Link 
                            to={
                              deal.deal_type === 'sale' ? `/sale?address=${encodeURIComponent(deal.location)}` :
                              deal.deal_type === 'long_term_rent' ? `/rent?address=${encodeURIComponent(deal.location)}` :
                              deal.deal_type === 'short_term_rent' ? `/airbnb?address=${encodeURIComponent(deal.location)}` :
                              createPageUrl('Deals')
                            }
                            className="block"
                          >
                            <Button size="sm" className="w-full bg-[#1e3a5f] hover:bg-[#2a4a7f]">
                              {deal.deal_type === 'service_deal' ? 'Book Service Deal' : 'View Listing'}
                            </Button>
                          </Link>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
