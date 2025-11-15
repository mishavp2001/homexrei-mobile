import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Map, List, Loader2, DollarSign, CheckCircle2, AlertCircle, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import DealMap from '../components/Deals/DealMap';
import DealCard from '../components/Deals/DealCard';
import DealForm from '../components/Deals/DealForm';
import DealDetailsModal from '../components/Deals/DealDetailsModal';
import OfferForm from '../components/Deals/OfferForm';
import Navigation from '../components/Navigation';

export const isPublic = true;

export default function Deals() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingDeal, setEditingDeal] = useState(null);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [showDealDetails, setShowDealDetails] = useState(false);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [submittingOffer, setSubmittingOffer] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dealTypeFilter, setDealTypeFilter] = useState('sale');
  const [propertyTypeFilter, setPropertyTypeFilter] = useState('all');
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState('all');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [showFilters, setShowFilters] = useState(false);
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
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setBookingData(prev => ({ ...prev, renter_name: currentUser?.full_name || '' }));
      } catch (error) {
        // User not logged in
      }
      setLoadingAuth(false);
    };
    loadUser();
  }, []);

  const { data: deals, isLoading } = useQuery({
    queryKey: ['deals'],
    queryFn: () => base44.entities.Deal.filter({ status: 'active' }, '-created_date'),
    initialData: []
  });

  useEffect(() => {
    if (loadingAuth || !deals || deals.length === 0) return;

    const hash = window.location.hash;
    if (hash.startsWith('#deal-')) {
      const dealId = hash.replace('#deal-', '');
      const deal = deals.find(d => d.id === dealId);
      
      if (deal) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        
        if (user && user.email === deal.user_email) {
          handleEdit(deal);
        } else {
          handleViewDetails(deal);
        }
      }
    }
  }, [deals, user, loadingAuth]);

  const { data: categories } = useQuery({
    queryKey: ['serviceCategories'],
    queryFn: () => base44.entities.Category.filter({ type: 'service_type', is_active: true }),
    initialData: []
  });

  const { data: userProperties } = useQuery({
    queryKey: ['userProperties', user?.email],
    queryFn: () => user ? base44.entities.Property.filter({ user_email: user.email }) : [],
    enabled: !!user,
    initialData: []
  });

  const { data: userServices } = useQuery({
    queryKey: ['userServices', user?.email],
    queryFn: () => user ? base44.entities.ServiceListing.filter({ expert_email: user.email }) : [],
    enabled: !!user,
    initialData: []
  });

  const canPostDeals = user && (userProperties.length > 0 || userServices.length > 0);

  const createDealMutation = useMutation({
    mutationFn: (data) => base44.entities.Deal.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['deals']);
      setShowForm(false);
      setEditingDeal(null);
    }
  });

  const updateDealMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Deal.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['deals']);
      setShowForm(false);
      setEditingDeal(null);
    }
  });

  const createBookingMutation = useMutation({
    mutationFn: (data) => base44.entities.Booking.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['bookings']);
      setBookingSuccess(true);
      setTimeout(() => {
        setShowBookingDialog(false);
        setBookingSuccess(false);
        setBookingData({
          service_date: null,
          service_time: '',
          renter_name: user?.full_name || '',
          renter_phone: '',
          message: ''
        });
      }, 2000);
    },
    onError: (error) => {
      setBookingError(error.message || 'Failed to submit booking request');
    }
  });

  const createOfferMutation = useMutation({
    mutationFn: async (offerData) => {
      setSubmittingOffer(true);
      try {
        const offer = await base44.entities.Offer.create(offerData);
        
        const pdfResponse = await base44.functions.invoke('generateOfferPDF', {
          offerId: offer.id
        });
        
        if (!pdfResponse.data.success) {
          throw new Error('Failed to generate PDF');
        }
        
        const emailSubject = `New Purchase Offer - ${selectedDeal.location}`;
        const emailBody = `You have received a new purchase offer for your property!

PROPERTY: ${selectedDeal.title}
ADDRESS: ${selectedDeal.location}
OFFER AMOUNT: $${offerData.offer_amount.toLocaleString()}
BUYER: ${offerData.buyer_name}

OFFER DETAILS:
- Financing Type: ${offerData.financing_type.replace(/_/g, ' ')}
- Down Payment: ${offerData.down_payment_percent}%
- Earnest Money: $${offerData.earnest_money_deposit.toLocaleString()}
- Proposed Closing: ${format(new Date(offerData.closing_date), 'MMMM d, yyyy')}
- Offer Expires: ${format(new Date(offerData.expiration_date), 'MMMM d, yyyy')}

📄 View formal offer document: ${pdfResponse.data.pdfUrl}

Review and respond to this offer in your dashboard:
${window.location.origin}/dashboard`;

        await base44.integrations.Core.SendEmail({
          to: selectedDeal.user_email,
          subject: emailSubject,
          body: emailBody
        });
        
        await base44.entities.Message.create({
          sender_email: user.email,
          sender_name: offerData.buyer_name,
          recipient_email: selectedDeal.user_email,
          recipient_name: selectedDeal.user_email,
          subject: emailSubject,
          content: emailBody,
          thread_id: `offer_${offer.id}_${Date.now()}`,
          reference_type: 'deal',
          reference_id: selectedDeal.id,
          is_read: false
        });
        
        return offer;
        
      } catch (error) {
        console.error('Offer submission error:', error);
        throw error;
      } finally {
        setSubmittingOffer(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['offers']);
      alert('✅ Offer submitted successfully!\n\nYour formal offer has been sent to the property owner.');
      setShowOfferForm(false);
      setSelectedDeal(null);
    },
    onError: (error) => {
      console.error('Failed to submit offer:', error);
      alert('Failed to submit offer. Please try again.');
    }
  });

  const handleSubmit = (data) => {
    if (!user) {
      alert('Please sign in to post a deal');
      base44.auth.redirectToLogin(window.location.href);
      return;
    }

    if (!canPostDeals) {
      alert('You need to have at least one digitized property or service listing before posting deals.');
      return;
    }

    const dealData = {
      ...data,
      user_email: user.email,
      contact_email: data.contact_email || user.email
    };

    if (editingDeal) {
      updateDealMutation.mutate({ id: editingDeal.id, data: dealData });
    } else {
      createDealMutation.mutate(dealData);
    }
  };

  const handleServiceBookingSubmit = async (e) => {
    e.preventDefault();
    setBookingError('');

    if (!user) {
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

    const deal = selectedDeal;
    const bookingPayload = {
      deal_id: deal.id,
      property_address: `${deal.service_category} - ${deal.location}`,
      booking_type: 'service',
      service_id: deal.id,
      service_name: deal.title,
      renter_email: user.email,
      renter_name: bookingData.renter_name || user.full_name,
      renter_phone: bookingData.renter_phone,
      owner_email: deal.user_email,
      service_date: format(bookingData.service_date, 'yyyy-MM-dd'),
      service_time: bookingData.service_time,
      service_price: deal.price || 0,
      total_cost: deal.price || 0,
      message: bookingData.message
    };

    try {
      const newBooking = await base44.entities.Booking.create(bookingPayload);
      
      const bookingRequestUrl = `${window.location.origin}/messages`;
      const messageSubject = `New Service Deal Booking: ${deal.title}`;
      
      let messageBody = `NEW SERVICE DEAL BOOKING REQUEST\n\n`;
      messageBody += `Service: ${deal.title}\n`;
      messageBody += `Category: ${deal.service_category}\n\n`;
      messageBody += `CLIENT DETAILS:\n`;
      messageBody += `Name: ${bookingData.renter_name || user.full_name}\n`;
      messageBody += `Email: ${user.email}\n`;
      messageBody += `Phone: ${bookingData.renter_phone}\n\n`;
      messageBody += `SERVICE DATE & TIME:\n`;
      messageBody += `Date: ${format(bookingData.service_date, 'EEEE, MMMM d, yyyy')}\n`;
      messageBody += `Time: ${bookingData.service_time}\n\n`;
      messageBody += `PRICE: $${deal.price}\n\n`;
      
      if (bookingData.message) {
        messageBody += `MESSAGE FROM CLIENT:\n${bookingData.message}\n\n`;
      }
      
      messageBody += `---\n`;
      messageBody += `Review and respond:\n${bookingRequestUrl}\n`;
      
      try {
        await base44.entities.Message.create({
          sender_email: user.email,
          sender_name: bookingData.renter_name || user.full_name,
          recipient_email: deal.user_email,
          recipient_name: deal.user_email,
          subject: messageSubject,
          content: messageBody,
          thread_id: `service_deal_${newBooking.id}_${Date.now()}`,
          reference_type: 'deal',
          reference_id: deal.id,
          is_read: false
        });
      } catch (msgError) {
        console.error('Message error:', msgError);
      }
      
      try {
        await base44.integrations.Core.SendEmail({
          to: deal.user_email,
          subject: messageSubject,
          body: messageBody
        });
      } catch (emailError) {
        console.error('Email error:', emailError);
      }
      
      alert('Service booking request sent successfully!');
      
      queryClient.invalidateQueries(['bookings']);
      setBookingSuccess(true);
      
      setTimeout(() => {
        setShowBookingDialog(false);
        setBookingSuccess(false);
        setBookingData({
          service_date: null,
          service_time: '',
          renter_name: user?.full_name || '',
          renter_phone: '',
          message: ''
        });
      }, 2000);
      
    } catch (error) {
      console.error('Booking error:', error);
      setBookingError(error.message || 'Failed to submit booking request');
    }
  };

  const handleViewDetails = (deal) => {
    setSelectedDeal(deal);
    
    if (deal.deal_type === 'service_deal' && user && user.email !== deal.user_email) {
      setBookingData({
        service_date: null,
        service_time: '',
        renter_name: user.full_name || '',
        renter_phone: '',
        message: ''
      });
      setShowBookingDialog(true);
      setShowDealDetails(false);
    } else {
      setShowDealDetails(true);
      setShowBookingDialog(false);
    }
  };

  const handleMakeOffer = (deal) => {
    setSelectedDeal(deal);
    setShowOfferForm(true);
    setShowDealDetails(false);
  };

  const handleOfferSubmit = (offerData) => {
    createOfferMutation.mutate(offerData);
  };

  const handleEdit = (deal) => {
    setEditingDeal(deal);
    setShowForm(true);
    setSelectedDeal(null);
    setShowDealDetails(false);
    setShowBookingDialog(false);
  };

  const handleEditDeal = (deal) => {
    setEditingDeal(deal);
    setShowForm(true);
    setShowDealDetails(false);
    setSelectedDeal(null);
  };

  const filteredDeals = deals.filter(deal => {
    const matchesSearch = !searchTerm ||
      deal.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deal.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deal.location.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDealType = dealTypeFilter === 'all' || deal.deal_type === dealTypeFilter;
    
    const matchesPropertyType = propertyTypeFilter === 'all' ||
      (deal.deal_type === 'sale' && deal.property_type === propertyTypeFilter);

    const matchesServiceCategory = serviceCategoryFilter === 'all' ||
      (deal.deal_type === 'service_deal' && deal.service_category === serviceCategoryFilter);

    const matchesPriceMin = !priceMin || deal.price >= parseFloat(priceMin);
    const matchesPriceMax = !priceMax || deal.price <= parseFloat(priceMax);

    return matchesSearch && matchesDealType && matchesPropertyType && 
           matchesServiceCategory && matchesPriceMin && matchesPriceMax;
  });

  const dealsWithCoordinates = filteredDeals.filter(d => d.latitude && d.longitude);

  const isOwner = (deal) => user && user.email === deal.user_email;

  const postDealButton = (
    <Button
      onClick={() => {
        if (!user) {
          base44.auth.redirectToLogin(window.location.href);
          return;
        }
        if (!canPostDeals) {
          alert('You need to have at least one digitized property or service listing before posting deals. Visit your Dashboard to add them first.');
          return;
        }
        setShowForm(!showForm);
      }}
      disabled={user && !canPostDeals}
      className={user && !canPostDeals ? 'bg-gray-300 text-gray-600 cursor-not-allowed' : 'bg-[#d4af37] hover:bg-[#c49d2a]'}
      size="sm"
    >
      <Plus className="w-4 h-4 mr-2" />
      Post Deal
    </Button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 pb-20">
      <Navigation user={user} actionButton={postDealButton} />
      
      <div className="py-6 px-4">
        <div className="max-w-[1800px] mx-auto">
          {user && !canPostDeals && (
            <Card className="p-6 mb-6 bg-blue-50 border-2 border-blue-200">
              <p className="text-sm text-blue-900">
                💡 <strong>Want to post deals?</strong> You need to either digitize a property or add a service listing first. Visit your <a href="/dashboard" className="underline font-semibold">Dashboard</a> to get started.
              </p>
            </Card>
          )}

          {showForm && (
            <div className="mb-8">
              <DealForm
                deal={editingDeal}
                onSubmit={handleSubmit}
                onCancel={() => {
                  setShowForm(false);
                  setEditingDeal(null);
                }}
                categories={categories}
                currentUser={user}
              />
            </div>
          )}

          {isLoading ? (
            <div className="text-center py-20">
              <Loader2 className="w-12 h-12 animate-spin text-[#1e3a5f] mx-auto" />
            </div>
          ) : filteredDeals.length === 0 ? (
            <Card className="p-12 text-center">
              <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No deals found</h3>
              <p className="text-gray-600 mb-4">Try adjusting your filters or be the first to post!</p>
              {user && (
                <Button onClick={() => setShowForm(true)} className="bg-[#d4af37] hover:bg-[#c49d2a]">
                  Post a Deal
                </Button>
              )}
            </Card>
          ) : (
            <>
              <div className="hidden xl:grid xl:grid-cols-[55%_45%] gap-6">
                <div className="sticky top-24 bg-black rounded-lg overflow-hidden" style={{ height: 'calc(100vh - 8rem)' }}>
                  <DealMap
                    deals={dealsWithCoordinates}
                    onDealClick={handleViewDetails}
                  />
                </div>
                
                <div className="space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 8rem)' }}>
                  {filteredDeals.map((deal) => (
                    <div key={deal.id} id={`deal-${deal.id}`}>
                      <DealCard
                        deal={deal}
                        onViewDetails={handleViewDetails}
                        onMakeOffer={handleMakeOffer}
                        isOwner={isOwner(deal)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="xl:hidden">
                {viewMode === 'map' ? (
                  <div className="space-y-4">
                    <div style={{ height: '600px' }} className="bg-black rounded-lg overflow-hidden">
                      <DealMap
                        deals={dealsWithCoordinates}
                        onDealClick={handleViewDetails}
                      />
                    </div>
                    {dealsWithCoordinates.length === 0 && (
                      <Card className="p-8 text-center bg-yellow-50">
                        <p className="text-gray-700">
                          No deals have location coordinates yet. Switch to list view to see all deals.
                        </p>
                      </Card>
                    )}
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-6">
                    {filteredDeals.map((deal) => (
                      <div key={deal.id} id={`deal-${deal.id}`}>
                        <DealCard
                          deal={deal}
                          onViewDetails={handleViewDetails}
                          onMakeOffer={handleMakeOffer}
                          isOwner={isOwner(deal)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-2xl z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search deals..."
                className="pl-9 h-10"
              />
            </div>

            <Select value={dealTypeFilter} onValueChange={setDealTypeFilter}>
              <SelectTrigger className="w-[180px] h-10">
                <SelectValue placeholder="Deal Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="sale">Property Sale</SelectItem>
                <SelectItem value="long_term_rent">Long-Term Rent</SelectItem>
                <SelectItem value="short_term_rent">Airbnb / Short-Term</SelectItem>
                <SelectItem value="service_deal">Service Deal</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(true)}
              className="flex-shrink-0"
            >
              <Search className="w-4 h-4 mr-2" />
              Filters
            </Button>

            <div className="flex gap-2 xl:hidden">
              <Button
                variant={viewMode === 'map' ? 'default' : 'outline'}
                onClick={() => setViewMode('map')}
                size="sm"
                className={viewMode === 'map' ? 'bg-[#1e3a5f] hover:bg-[#2a4a7f]' : ''}
              >
                <Map className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                onClick={() => setViewMode('list')}
                size="sm"
                className={viewMode === 'list' ? 'bg-[#1e3a5f] hover:bg-[#2a4a7f]' : ''}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>

            <Badge variant="outline" className="hidden sm:flex">
              {filteredDeals.length} found
            </Badge>
          </div>
        </div>
      </div>

      <Dialog open={showFilters} onOpenChange={setShowFilters}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Filter Deals</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {dealTypeFilter === 'sale' && (
              <div>
                <Label>Property Type</Label>
                <Select value={propertyTypeFilter} onValueChange={setPropertyTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Property Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Properties</SelectItem>
                    <SelectItem value="single_family">Single Family</SelectItem>
                    <SelectItem value="condo">Condo</SelectItem>
                    <SelectItem value="townhouse">Townhouse</SelectItem>
                    <SelectItem value="multi_family">Multi-Family</SelectItem>
                    <SelectItem value="land">Land</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {dealTypeFilter === 'service_deal' && (
              <div>
                <Label>Service Category</Label>
                <Select value={serviceCategoryFilter} onValueChange={setServiceCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Service Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Services</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.name}>
                        {cat.icon} {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Price Range</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Min $"
                  value={priceMin}
                  onChange={(e) => setPriceMin(e.target.value)}
                />
                <Input
                  type="number"
                  placeholder="Max $"
                  value={priceMax}
                  onChange={(e) => setPriceMax(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => {
                  setDealTypeFilter('sale');
                  setPropertyTypeFilter('all');
                  setServiceCategoryFilter('all');
                  setPriceMin('');
                  setPriceMax('');
                }}
                variant="outline"
                className="flex-1"
              >
                Clear All
              </Button>
              <Button
                onClick={() => setShowFilters(false)}
                className="flex-1 bg-[#1e3a5f] hover:bg-[#2a4a7f]"
              >
                Apply
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showBookingDialog} onOpenChange={setShowBookingDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Book Service: {selectedDeal?.title}</DialogTitle>
          </DialogHeader>

          {bookingSuccess ? (
            <div className="py-8 text-center">
              <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
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
                <Label>Message / Details</Label>
                <Textarea
                  value={bookingData.message}
                  onChange={(e) => setBookingData({ ...bookingData, message: e.target.value })}
                  rows={4}
                  placeholder="Describe what you need help with..."
                />
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Service Price:</span>
                  <span className="text-lg font-bold text-[#d4af37]">${selectedDeal?.price || 0}</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Final cost may vary based on scope
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowBookingDialog(false)}
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

      <Dialog open={showOfferForm} onOpenChange={setShowOfferForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#1e3a5f]">
              Make an Offer
            </DialogTitle>
            <p className="text-sm text-gray-600 mt-1">
              Submit a formal purchase offer for {selectedDeal?.location}
            </p>
          </DialogHeader>

          {submittingOffer ? (
            <div className="py-12 text-center">
              <Loader2 className="w-12 h-12 animate-spin text-[#1e3a5f] mx-auto mb-4" />
              <p className="text-gray-600">
                Processing your offer and generating documents...
              </p>
            </div>
          ) : (
            <OfferForm
              deal={selectedDeal}
              currentUser={user}
              onSubmit={handleOfferSubmit}
              onCancel={() => setShowOfferForm(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <DealDetailsModal
        deal={selectedDeal}
        isOpen={showDealDetails}
        onClose={() => {
          setShowDealDetails(false);
          setSelectedDeal(null);
        }}
        isOwner={selectedDeal && isOwner(selectedDeal)}
        onEdit={handleEditDeal}
        currentUser={user}
      />
    </div>
  );
}