
import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Home, Loader2, Wrench, DollarSign, Edit2, MapPin, Calendar, User, Mail, Phone, CalendarIcon, Users, CheckCircle2, Heart, ExternalLink, FileText, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import PropertyCard from '../components/Dashboard/PropertyCard';
import Navigation from '../components/Navigation';
import { format } from 'date-fns';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error('Not authenticated', error);
        const dashboardUrl = window.location.origin + createPageUrl('Dashboard');
        base44.auth.redirectToLogin(dashboardUrl);
      }
      setLoadingAuth(false);
    };
    loadUser();
  }, []);

  const { data: properties, isLoading: loadingProperties } = useQuery({
    queryKey: ['properties', user?.email],
    queryFn: () => user ? base44.entities.Property.filter({ user_email: user.email }, '-created_date') : [],
    enabled: !!user,
    initialData: []
  });

  const { data: allReports } = useQuery({
    queryKey: ['reports', properties],
    queryFn: async () => {
      if (!properties || properties.length === 0) return [];
      const reports = await base44.entities.Report.list();
      return reports;
    },
    enabled: !!properties && properties.length > 0,
    initialData: []
  });

  const { data: myServices, isLoading: loadingServices } = useQuery({
    queryKey: ['myServices', user?.email],
    queryFn: () => user ? base44.entities.ServiceListing.filter({ expert_email: user.email }, '-created_date') : [],
    enabled: !!user,
    initialData: []
  });

  const { data: myDeals, isLoading: loadingDeals } = useQuery({
    queryKey: ['myDeals', user?.email],
    queryFn: () => user ? base44.entities.Deal.filter({ user_email: user.email }, '-created_date') : [],
    enabled: !!user,
    initialData: []
  });

  const { data: receivedBookings, isLoading: loadingReceivedBookings } = useQuery({
    queryKey: ['receivedBookings', user?.email],
    queryFn: () => user ? base44.entities.Booking.filter({ owner_email: user.email }, '-created_date') : [],
    enabled: !!user,
    initialData: []
  });

  const { data: sentBookings, isLoading: loadingSentBookings } = useQuery({
    queryKey: ['sentBookings', user?.email],
    queryFn: () => user ? base44.entities.Booking.filter({ renter_email: user.email }, '-created_date') : [],
    enabled: !!user,
    initialData: []
  });

  const { data: savedDeals, isLoading: loadingSavedDeals } = useQuery({
    queryKey: ['savedDeals', user?.email],
    queryFn: () => user ? base44.entities.SavedDeal.filter({ user_email: user.email }, '-created_date') : [],
    enabled: !!user,
    initialData: []
  });

  const { data: myInsights, isLoading: loadingInsights } = useQuery({
    queryKey: ['myInsights', user?.email],
    queryFn: () => user ? base44.entities.Insight.filter({ created_by: user.email }, '-created_date') : [],
    enabled: !!user,
    initialData: []
  });

  // New: Fetch offers sent by user
  const { data: sentOffers, isLoading: loadingSentOffers } = useQuery({
    queryKey: ['sentOffers', user?.email],
    queryFn: () => user ? base44.entities.Offer.filter({ buyer_email: user.email }, '-created_date') : [],
    enabled: !!user,
    initialData: []
  });

  // New: Fetch offers received (for properties owned by user)
  const { data: receivedOffers, isLoading: loadingReceivedOffers } = useQuery({
    queryKey: ['receivedOffers', user?.email],
    queryFn: () => user ? base44.entities.Offer.filter({ seller_email: user.email }, '-created_date') : [],
    enabled: !!user,
    initialData: []
  });

  const queryClient = useQueryClient();

  const updateBookingMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Booking.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['receivedBookings']);
      queryClient.invalidateQueries(['sentBookings']);
    }
  });

  const deleteSavedDealMutation = useMutation({
    mutationFn: (id) => base44.entities.SavedDeal.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['savedDeals']);
    }
  });

  // New: Update offer mutation
  const updateOfferMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Offer.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['receivedOffers']);
      queryClient.invalidateQueries(['sentOffers']);
    }
  });

  const handleBookingAction = (booking, status, response = '') => {
    updateBookingMutation.mutate({
      id: booking.id,
      data: {
        status,
        owner_response: response,
        confirmed_date: status === 'confirmed' ? new Date().toISOString() : null
      }
    });
  };

  // New: Handle offer actions
  const handleOfferAction = async (offer, status) => {
    let response = '';

    if (status === 'rejected') {
      response = prompt('Reason for rejection (optional):');
      if (response === null) return; // User cancelled
    } else if (status === 'countered') {
      const counterAmountStr = prompt(`Current offer: $${offer.offer_amount.toLocaleString()}\n\nEnter your counter offer amount:`);
      if (!counterAmountStr) return; // User cancelled or entered empty
      const counterAmount = parseFloat(counterAmountStr);
      if (isNaN(counterAmount) || counterAmount <= 0) {
        alert('Please enter a valid positive number for the counter offer.');
        return;
      }

      const counterTerms = prompt('Any additional counter terms? (optional)');

      updateOfferMutation.mutate({
        id: offer.id,
        data: {
          status: 'countered',
          counter_offer_amount: counterAmount,
          counter_offer_terms: counterTerms || '',
          seller_response: `Counter offer: $${counterAmount.toLocaleString()}`
        }
      });
      return;
    }

    updateOfferMutation.mutate({
      id: offer.id,
      data: {
        status,
        seller_response: response || (status === 'accepted' ? 'Offer accepted!' : ''),
        accepted_date: status === 'accepted' ? new Date().toISOString() : null
      }
    });

    // Send notification message
    if (status === 'accepted' || status === 'rejected') {
      try {
        await base44.entities.Message.create({
          sender_email: user.email,
          sender_name: user.full_name || user.email,
          recipient_email: offer.buyer_email,
          recipient_name: offer.buyer_name,
          subject: `Offer ${status === 'accepted' ? 'Accepted' : 'Rejected'} - ${offer.property_address}`,
          content: `Your offer of $${offer.offer_amount.toLocaleString()} for ${offer.property_address} has been ${status}.\n\n${response || ''}`,
          thread_id: `offer_${offer.id}_${Date.now()}`,
          reference_type: 'deal',
          reference_id: offer.deal_id,
          is_read: false
        });
      } catch (error) {
        console.error('Failed to send notification:', error);
      }
    }
  };

  const handleUnsave = (savedDealId) => {
    if (confirm('Remove this deal from your saved list?')) {
      deleteSavedDealMutation.mutate(savedDealId);
    }
  };

  const getPublicDealUrl = (deal) => {
    const encodedAddress = encodeURIComponent(deal.deal_location);

    if (deal.deal_type === 'sale') {
      return `/sale?address=${encodedAddress}`;
    } else if (deal.deal_type === 'long_term_rent') {
      return `/rent?address=${encodedAddress}`;
    } else if (deal.deal_type === 'short_term_rent') {
      return `/airbnb?address=${encodedAddress}`;
    }
    return createPageUrl(`Deals#deal-${deal.deal_id}`);
  };

  const getPropertyReports = (propertyId) => {
    if (!allReports) return [];
    return allReports.filter((r) => r.property_id === propertyId);
  };

  const getDealTypeLabel = (dealType) => {
    switch (dealType) {
      case 'sale': return 'Property Sale';
      case 'long_term_rent': return 'Long-Term Rent';
      case 'short_term_rent': return 'Airbnb';
      case 'service_deal': return 'Service Deal';
      default: return dealType?.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) || 'Deal';
    }
  };

  const getDealTypeColor = (dealType) => {
    switch (dealType) {
      case 'sale': return 'bg-[#1e3a5f] text-white';
      case 'long_term_rent': return 'bg-blue-600 text-white';
      case 'short_term_rent': return 'bg-purple-600 text-white';
      default: return 'bg-[#d4af37] text-white';
    }
  };

  const canPostDeals = properties.length > 0 || myServices.length > 0;

  if (loadingAuth || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#1e3a5f] mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <Navigation user={user} />
      
      <div className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
            <div>
              <h1 className="text-4xl font-bold text-[#1e3a5f] mb-2">My Dashboard</h1>
              <p className="text-gray-600">Properties, services, deals and insights</p>
            </div>
          </div>

          {/* My Properties Section */}
          <div className="mb-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-[#1e3a5f]">My Properties</h2>
              <Link to={createPageUrl('PropertyCapture')}>
                <Button className="bg-[#d4af37] hover:bg-[#c49d2a] text-white">
                  <Plus className="w-5 h-5 mr-2" />
                  Digitize New Property
                </Button>
              </Link>
            </div>

            {loadingProperties ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-12 h-12 animate-spin text-[#1e3a5f]" />
              </div>
            ) : properties.length === 0 ? (
              <Card className="p-12 text-center bg-white">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Home className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Properties Yet</h3>
                <p className="text-gray-600 mb-6">Start by digitizing your first property</p>
                <Link to={createPageUrl('PropertyCapture')}>
                  <Button className="bg-[#1e3a5f] hover:bg-[#2a4a7f] text-white">
                    <Plus className="w-5 h-5 mr-2" />
                    Digitize Property
                  </Button>
                </Link>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {properties.map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    reports={getPropertyReports(property.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* My Services Section */}
          <div className="mb-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-[#1e3a5f]">My Services</h2>
              <Link to={createPageUrl('Profile')}>
                <Button className="bg-[#d4af37] hover:bg-[#c49d2a] text-white">
                  <Plus className="w-5 h-5 mr-2" />
                  Add Service
                </Button>
              </Link>
            </div>

            {loadingServices ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#1e3a5f]" />
              </div>
            ) : myServices.length === 0 ? (
              <Card className="p-12 text-center bg-white">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Wrench className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Services Listed</h3>
                <p className="text-gray-600 mb-6">Add your services to start advertising your expertise</p>
                <Link to={createPageUrl('Profile')}>
                  <Button className="bg-[#1e3a5f] hover:bg-[#2a4a7f] text-white">
                    <Plus className="w-5 h-5 mr-2" />
                    Add Service
                  </Button>
                </Link>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myServices.map((service) => (
                  <Card key={service.id} className="p-6 bg-white hover:shadow-lg transition-shadow">
                    <div className="flex items-start gap-4 mb-4">
                      {service.photo_url ? (
                        <img
                          src={service.photo_url}
                          alt={service.expert_name}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-[#d4af37] rounded-lg flex items-center justify-center">
                          <Wrench className="w-8 h-8 text-white" />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-[#1e3a5f] mb-1">{service.expert_name}</h3>
                        <Badge variant="outline" className="text-xs">{service.service_category}</Badge>
                      </div>
                    </div>
                    <p className="text-gray-700 text-sm mb-4 line-clamp-2">{service.description}</p>
                    <div className="flex items-center justify-between">
                      <Badge className={
                        service.status === 'active' ? 'bg-green-100 text-green-800' :
                        service.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }>
                        {service.status}
                      </Badge>
                      <Link to={createPageUrl('Profile')}>
                        <Button size="sm" variant="outline">
                          <Edit2 className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* My Deals Section */}
          <div className="mb-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-[#1e3a5f]">My Deals</h2>
              {canPostDeals ? (
                <Link to={createPageUrl('Deals')}>
                  <Button className="bg-[#1e3a5f] hover:bg-[#2a4a7f] text-white">
                    <Plus className="w-5 h-5 mr-2" />
                    Post Deal
                  </Button>
                </Link>
              ) : (
                <Button
                  disabled
                  className="bg-gray-300 cursor-not-allowed"
                  title="You need at least one property or service to post deals"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Post Deal
                </Button>
              )}
            </div>

            {!canPostDeals && (
              <Card className="p-6 mb-6 bg-blue-50 border-2 border-blue-200">
                <p className="text-sm text-blue-900">
                  💡 <strong>Get Started:</strong> To post deals, you need to either digitize a property or add a service listing first.
                </p>
              </Card>
            )}

            {loadingDeals ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#1e3a5f]" />
              </div>
            ) : myDeals.length === 0 ? (
              <Card className="p-12 text-center bg-white">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <DollarSign className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Deals Posted</h3>
                <p className="text-gray-600 mb-6">
                  {canPostDeals ?
                    'Start advertising your properties or services by posting a deal' :
                    'Add a property or service first to start posting deals'}
                </p>
                {canPostDeals && (
                  <Link to={createPageUrl('Deals')}>
                    <Button className="bg-[#1e3a5f] hover:bg-[#2a4a7f] text-white">
                      <Plus className="w-5 h-5 mr-2" />
                      Post Deal
                    </Button>
                  </Link>
                )}
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myDeals.map((deal) => (
                  <Card key={deal.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    {deal.photo_urls?.length > 0 && (
                      <div className="h-40 overflow-hidden relative">
                        <img
                          src={deal.photo_urls[0]}
                          alt={deal.title}
                          className="w-full h-full object-cover"
                        />
                        <Badge className={`absolute top-3 right-3 ${getDealTypeColor(deal.deal_type)}`}>
                          {getDealTypeLabel(deal.deal_type)}
                        </Badge>
                      </div>
                    )}
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-bold text-[#1e3a5f] line-clamp-1">{deal.title}</h3>
                        <Badge className={
                          deal.status === 'active' ? 'bg-green-100 text-green-800' :
                          deal.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          ['sold', 'rented'].includes(deal.status) ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }>
                          {deal.status}
                        </Badge>
                      </div>
                      <p className="text-2xl font-bold text-[#d4af37] mb-3">
                        {deal.deal_type === 'short_term_rent' && deal.price_per_night ?
                          `$${deal.price_per_night}/night` :
                          deal.deal_type === 'long_term_rent' ?
                          `$${deal.price.toLocaleString()}/mo` :
                          `$${deal.price.toLocaleString()}`
                        }
                      </p>
                      <div className="flex items-start gap-1 text-sm text-gray-500 mb-4">
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-1">{deal.location}</span>
                      </div>
                      <Link to={createPageUrl(`Deals#deal-${deal.id}`)}>
                        <Button size="sm" className="w-full bg-[#1e3a5f] hover:bg-[#2a4a7f]">
                          <Edit2 className="w-4 h-4 mr-2" />
                          Edit Deal
                        </Button>
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Saved Deals Section */}
          <div className="mb-12">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-[#1e3a5f]">Saved Deals</h2>
                <p className="text-sm text-gray-600 mt-1">Deals you've saved for later</p>
              </div>
              <Link to={createPageUrl('Deals')}>
                <Button variant="outline">
                  Browse More Deals
                </Button>
              </Link>
            </div>

            {loadingSavedDeals ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#1e3a5f]" />
              </div>
            ) : savedDeals.length === 0 ? (
              <Card className="p-12 text-center bg-white">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Heart className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Saved Deals</h3>
                <p className="text-gray-600 mb-6">Start browsing and save deals you're interested in</p>
                <Link to={createPageUrl('Deals')}>
                  <Button className="bg-[#1e3a5f] hover:bg-[#2a4a7f] text-white">
                    Browse Deals
                  </Button>
                </Link>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedDeals.map((saved) => (
                  <Card key={saved.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    {saved.deal_photo_url && (
                      <div className="h-40 overflow-hidden relative">
                        <img
                          src={saved.deal_photo_url}
                          alt={saved.deal_title}
                          className="w-full h-full object-cover"
                        />
                        <Badge className={`absolute top-3 right-3 ${getDealTypeColor(saved.deal_type)}`}>
                          {getDealTypeLabel(saved.deal_type)}
                        </Badge>
                      </div>
                    )}
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-bold text-[#1e3a5f] line-clamp-1">{saved.deal_title}</h3>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleUnsave(saved.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 -mt-1 -mr-2"
                        >
                          <Heart className="w-5 h-5 fill-red-600" />
                        </Button>
                      </div>
                      <p className="text-2xl font-bold text-[#d4af37] mb-3">
                        ${saved.deal_price?.toLocaleString() || 'N/A'}
                      </p>
                      <div className="flex items-start gap-1 text-sm text-gray-500 mb-4">
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-1">{saved.deal_location}</span>
                      </div>
                      
                      {saved.notes && (
                        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-500 mb-1">Notes:</p>
                          <p className="text-sm text-gray-700">{saved.notes}</p>
                        </div>
                      )}

                      <div className="text-xs text-gray-500 mb-3">
                        Saved {format(new Date(saved.created_date), 'MMM d, yyyy')}
                      </div>

                      <Link to={getPublicDealUrl(saved)}>
                        <Button size="sm" className="w-full bg-[#1e3a5f] hover:bg-[#2a4a7f]">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          View Deal
                        </Button>
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* My Insights Section */}
          <div className="mb-12">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-[#1e3a5f]">My Insights</h2>
                <p className="text-sm text-gray-600 mt-1">Tips and knowledge you've shared</p>
              </div>
              <Link to={createPageUrl('Insights')}>
                <Button className="bg-[#d4af37] hover:bg-[#c49d2a] text-white">
                  <Plus className="w-5 h-5 mr-2" />
                  Share New Insight
                </Button>
              </Link>
            </div>

            {loadingInsights ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#1e3a5f]" />
              </div>
            ) : myInsights.length === 0 ? (
              <Card className="p-12 text-center bg-white">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Heart className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No Insights Shared</h3>
                <p className="text-gray-600 mb-6">Share your home maintenance tips and experiences with the community</p>
                <Link to={createPageUrl('Insights')}>
                  <Button className="bg-[#d4af37] hover:bg-[#c49d2a] text-white">
                    Share Your First Insight
                  </Button>
                </Link>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myInsights.map((insight) => (
                  <Card key={insight.id} className="p-6 hover:shadow-lg transition-shadow">
                    {insight.photo_urls?.length > 0 && (
                      <div className="mb-4 -mx-6 -mt-6">
                        <img
                          src={insight.photo_urls[0]}
                          alt={insight.title}
                          className="w-full h-40 object-cover rounded-t-lg"
                        />
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline" className="capitalize text-xs">
                        {insight.category.replace('_', ' ')}
                      </Badge>
                      <Badge className={
                        insight.status === 'published' ? 'bg-green-100 text-green-800' :
                        insight.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }>
                        {insight.status}
                      </Badge>
                      {insight.is_featured && (
                        <Badge className="bg-yellow-100 text-yellow-800">⭐ Featured</Badge>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-[#1e3a5f] mb-3 line-clamp-2">{insight.title}</h3>
                    <p className="text-gray-700 mb-4 line-clamp-3 text-sm">{insight.content}</p>

                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4 pt-4 border-t">
                      <span className="flex items-center gap-3">
                        <span>👁️ {insight.views}</span>
                        <span>❤️ {insight.likes}</span>
                      </span>
                      <span className="text-xs">
                        {format(new Date(insight.created_date), 'MMM d, yyyy')}
                      </span>
                    </div>

                    <Link to={createPageUrl(`Insights?edit=${insight.id}`)}>
                      <Button size="sm" variant="outline" className="w-full">
                        <Edit2 className="w-4 h-4 mr-2" />
                        Edit Insight
                      </Button>
                    </Link>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* New: Purchase Offers Section */}
          <div className="mb-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-[#1e3a5f]">Purchase Offers</h2>
            </div>

            <Tabs defaultValue="received" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="received">
                  Offers Received
                  {receivedOffers.filter(o => o.status === 'pending').length > 0 && (
                    <Badge className="ml-2 bg-red-500 text-white">
                      {receivedOffers.filter(o => o.status === 'pending').length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="sent">My Offers</TabsTrigger>
              </TabsList>

              <TabsContent value="received">
                {loadingReceivedOffers ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-[#1e3a5f]" />
                  </div>
                ) : receivedOffers.length === 0 ? (
                  <Card className="p-12 text-center bg-white">
                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Offers Received</h3>
                    <p className="text-gray-600">When someone makes an offer on your property, it will appear here</p>
                  </Card>
                ) : (
                  <div className="grid md:grid-cols-2 gap-6">
                    {receivedOffers.map((offer) => (
                      <Card key={offer.id} className="p-6 hover:shadow-lg transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-bold text-[#1e3a5f] mb-1">{offer.property_address}</h3>
                            <Badge className={
                              offer.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              offer.status === 'accepted' ? 'bg-green-100 text-green-800' :
                              offer.status === 'countered' ? 'bg-blue-100 text-blue-800' :
                              offer.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }>
                              {offer.status}
                            </Badge>
                          </div>
                          {offer.offer_pdf_url && (
                            <a href={offer.offer_pdf_url} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" variant="outline">
                                <FileText className="w-4 h-4 mr-1" />
                                PDF
                              </Button>
                            </a>
                          )}
                        </div>

                        <div className="space-y-3 mb-4 text-sm">
                          <div>
                            <p className="text-gray-600 text-xs mb-1">Buyer</p>
                            <div className="flex items-center gap-2 text-gray-700">
                              <User className="w-4 h-4" />
                              <span>{offer.buyer_name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-gray-700 mt-1">
                              <Mail className="w-4 h-4" />
                              <span className="text-xs">{offer.buyer_email}</span>
                            </div>
                            {offer.buyer_phone && (
                              <div className="flex items-center gap-2 text-gray-700 mt-1">
                                <Phone className="w-4 h-4" />
                                <span className="text-xs">{offer.buyer_phone}</span>
                              </div>
                            )}
                          </div>

                          <div className="pt-3 border-t">
                            <p className="text-3xl font-bold text-[#d4af37] mb-2">
                              ${offer.offer_amount.toLocaleString()}
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                              <div>Down Payment: {offer.down_payment_percent}%</div>
                              <div>Earnest: ${offer.earnest_money_deposit.toLocaleString()}</div>
                              <div>Financing: {offer.financing_type.replace(/_/g, ' ')}</div>
                              <div>Closing: {format(new Date(offer.closing_date), 'MMM d')}</div>
                            </div>
                          </div>

                          {offer.counter_offer_amount && (
                            <div className="p-3 bg-blue-50 rounded-lg">
                              <p className="text-xs text-gray-600 mb-1">Your Counter Offer:</p>
                              <p className="text-xl font-bold text-blue-600">
                                ${offer.counter_offer_amount.toLocaleString()}
                              </p>
                              {offer.counter_offer_terms && (
                                <p className="text-xs text-gray-600 mt-1">{offer.counter_offer_terms}</p>
                              )}
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2 text-xs">
                            {offer.inspection_contingency && (
                              <Badge variant="outline" className="text-xs">✓ Inspection</Badge>
                            )}
                            {offer.appraisal_contingency && (
                              <Badge variant="outline" className="text-xs">✓ Appraisal</Badge>
                            )}
                            {offer.financing_contingency && (
                              <Badge variant="outline" className="text-xs">✓ Financing</Badge>
                            )}
                          </div>

                          {offer.additional_terms && (
                            <div className="p-3 bg-gray-50 rounded-lg">
                              <p className="text-xs text-gray-500 mb-1">Additional Terms:</p>
                              <p className="text-xs text-gray-700">{offer.additional_terms}</p>
                            </div>
                          )}
                        </div>

                        <div className="pt-4 border-t">
                          {offer.status === 'pending' && (
                            <div className="flex flex-col gap-2">
                              <Button
                                size="sm"
                                className="w-full bg-green-600 hover:bg-green-700"
                                onClick={() => handleOfferAction(offer, 'accepted')}
                                disabled={updateOfferMutation.isLoading}
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Accept Offer
                              </Button>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 text-blue-600 hover:bg-blue-50"
                                  onClick={() => handleOfferAction(offer, 'countered')}
                                  disabled={updateOfferMutation.isLoading}
                                >
                                  Counter
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="flex-1 text-red-600 hover:bg-red-50"
                                  onClick={() => handleOfferAction(offer, 'rejected')}
                                  disabled={updateOfferMutation.isLoading}
                                >
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Decline
                                </Button>
                              </div>
                              <p className="text-xs text-gray-500 text-center mt-1">
                                Expires: {format(new Date(offer.expiration_date), 'MMM d, yyyy')}
                              </p>
                            </div>
                          )}

                          {offer.status === 'accepted' && (
                            <div className="text-center p-3 bg-green-50 rounded-lg">
                              <p className="text-sm font-semibold text-green-800">✓ Offer Accepted!</p>
                              <p className="text-xs text-green-700 mt-1">
                                {format(new Date(offer.accepted_date), 'MMM d, yyyy')}
                              </p>
                            </div>
                          )}

                          {offer.status === 'rejected' && offer.seller_response && (
                            <div className="p-3 bg-red-50 rounded-lg">
                              <p className="text-xs text-gray-500 mb-1">Rejection Reason:</p>
                              <p className="text-sm text-red-800">{offer.seller_response}</p>
                            </div>
                          )}

                          {offer.status === 'countered' && (
                            <div className="text-center p-3 bg-blue-50 rounded-lg">
                              <p className="text-sm text-blue-800">⏳ Waiting for buyer response</p>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="sent">
                {loadingSentOffers ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-[#1e3a5f]" />
                  </div>
                ) : sentOffers.length === 0 ? (
                  <Card className="p-12 text-center bg-white">
                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Offers Sent</h3>
                    <p className="text-gray-600">Your purchase offers will appear here</p>
                  </Card>
                ) : (
                  <div className="grid md:grid-cols-2 gap-6">
                    {sentOffers.map((offer) => (
                      <Card key={offer.id} className="p-6 hover:shadow-lg transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-bold text-[#1e3a5f] mb-1">{offer.property_address}</h3>
                            <Badge className={
                              offer.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              offer.status === 'accepted' ? 'bg-green-100 text-green-800' :
                              offer.status === 'countered' ? 'bg-blue-100 text-blue-800' :
                              offer.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }>
                              {offer.status}
                            </Badge>
                          </div>
                          {offer.offer_pdf_url && (
                            <a href={offer.offer_pdf_url} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" variant="outline">
                                <FileText className="w-4 h-4 mr-1" />
                                PDF
                              </Button>
                            </a>
                          )}
                        </div>

                        <div className="space-y-3 mb-4">
                          <div className="pt-2">
                            <p className="text-3xl font-bold text-[#d4af37] mb-2">
                              ${offer.offer_amount.toLocaleString()}
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                              <div>Down Payment: {offer.down_payment_percent}%</div>
                              <div>Earnest: ${offer.earnest_money_deposit.toLocaleString()}</div>
                              <div>Financing: {offer.financing_type.replace(/_/g, ' ')}</div>
                              <div>Closing: {format(new Date(offer.closing_date), 'MMM d')}</div>
                            </div>
                          </div>

                          {offer.counter_offer_amount && (
                            <div className="p-3 bg-blue-50 rounded-lg">
                              <p className="text-xs text-gray-600 mb-1">Seller's Counter Offer:</p>
                              <p className="text-xl font-bold text-blue-600">
                                ${offer.counter_offer_amount.toLocaleString()}
                              </p>
                              {offer.counter_offer_terms && (
                                <p className="text-xs text-gray-600 mt-1">{offer.counter_offer_terms}</p>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="pt-4 border-t">
                          {offer.status === 'pending' && (
                            <div className="text-center p-3 bg-yellow-50 rounded-lg">
                              <p className="text-sm text-yellow-800">⏳ Waiting for seller response</p>
                              <p className="text-xs text-gray-600 mt-1">
                                Expires: {format(new Date(offer.expiration_date), 'MMM d, yyyy')}
                              </p>
                            </div>
                          )}

                          {offer.status === 'accepted' && (
                            <div className="text-center p-3 bg-green-50 rounded-lg">
                              <p className="text-sm font-semibold text-green-800">🎉 Offer Accepted!</p>
                              <p className="text-xs text-green-700 mt-1">
                                Accepted on {format(new Date(offer.accepted_date), 'MMM d, yyyy')}
                              </p>
                              {offer.seller_response && (
                                <p className="text-xs text-green-700 mt-2">{offer.seller_response}</p>
                              )}
                            </div>
                          )}

                          {offer.status === 'rejected' && (
                            <div className="p-3 bg-red-50 rounded-lg">
                              <p className="text-sm font-semibold text-red-800 mb-1">Offer Declined</p>
                              {offer.seller_response && (
                                <p className="text-xs text-red-700">{offer.seller_response}</p>
                              )}
                            </div>
                          )}

                          {offer.status === 'countered' && (
                            <div className="p-3 bg-blue-50 rounded-lg">
                              <p className="text-sm font-semibold text-blue-800 mb-2">Seller Sent Counter Offer</p>
                              <p className="text-xs text-blue-700">Review the counter offer above and contact the seller to discuss next steps.</p>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* My Bookings Section */}
          <div className="mb-12">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-[#1e3a5f]">Bookings</h2>
            </div>

            <Tabs defaultValue="received" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="received">
                  Received Requests
                  {receivedBookings.filter((b) => b.status === 'pending').length > 0 && (
                  <Badge className="ml-2 bg-red-500 text-white">
                      {receivedBookings.filter((b) => b.status === 'pending').length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="sent">My Requests</TabsTrigger>
              </TabsList>

              <TabsContent value="received">
                {loadingReceivedBookings ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-[#1e3a5f]" />
                  </div>
                ) : receivedBookings.length === 0 ? (
                  <Card className="p-12 text-center bg-white">
                    <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Booking Requests</h3>
                    <p className="text-gray-600">When someone requests to book your property, it will appear here</p>
                  </Card>
                ) : (
                  <div className="grid md:grid-cols-2 gap-6">
                    {receivedBookings.map((booking) => (
                      <Card key={booking.id} className="p-6 hover:shadow-lg transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-bold text-[#1e3a5f] mb-1">{booking.property_address}</h3>
                            <Badge className={
                              booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                              booking.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }>
                              {booking.status}
                            </Badge>
                          </div>
                          <Badge variant="outline" className="capitalize">
                            {booking.booking_type === 'short_term_rent' ? 'Short-term' : 'Long-term'}
                          </Badge>
                        </div>

                        <div className="space-y-2 mb-4 text-sm">
                          <div className="flex items-center gap-2 text-gray-700">
                            <User className="w-4 h-4" />
                            <span>{booking.renter_name}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-700">
                            <Mail className="w-4 h-4" />
                            <span>{booking.renter_email}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-700">
                            <Phone className="w-4 h-4" />
                            <span>{booking.renter_phone}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-700">
                            <CalendarIcon className="w-4 h-4" />
                            <span>
                              {format(new Date(booking.check_in_date), 'MMM d, yyyy')}
                              {booking.check_out_date && ` - ${format(new Date(booking.check_out_date), 'MMM d, yyyy')}`}
                            </span>
                          </div>
                          {booking.booking_type === 'short_term_rent' && (
                            <>
                              <div className="flex items-center gap-2 text-gray-700">
                                <Users className="w-4 h-4" />
                                <span>{booking.number_of_guests} guest{booking.number_of_guests !== 1 ? 's' : ''}</span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-700">
                                <span>{booking.number_of_nights} night{booking.number_of_nights !== 1 ? 's' : ''}</span>
                              </div>
                            </>
                          )}
                          {booking.booking_type === 'long_term_rent' && (
                            <div className="flex items-center gap-2 text-gray-700">
                              <span>{booking.lease_months} month lease</span>
                            </div>
                          )}
                        </div>

                        {booking.message && (
                          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                            <p className="text-xs text-gray-500 mb-1">Message:</p>
                            <p className="text-sm text-gray-700">{booking.message}</p>
                          </div>
                        )}

                        {booking.special_requests && (
                          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                            <p className="text-xs text-gray-500 mb-1">Special Requests:</p>
                            <p className="text-sm text-gray-700">{booking.special_requests}</p>
                          </div>
                        )}

                        <div className="pt-4 border-t">
                          <p className="text-2xl font-bold text-[#d4af37] mb-3">
                            ${booking.total_cost.toLocaleString()}
                          </p>
                          
                          {booking.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="flex-1 bg-green-600 hover:bg-green-700"
                                onClick={() => handleBookingAction(booking, 'confirmed', 'Booking confirmed!')}
                                disabled={updateBookingMutation.isLoading}
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 text-red-600 hover:bg-red-50"
                                onClick={() => {
                                  const reason = prompt('Reason for rejection (optional):');
                                  handleBookingAction(booking, 'rejected', reason || 'Booking not available');
                                }}
                                disabled={updateBookingMutation.isLoading}
                              >
                                Decline
                              </Button>
                            </div>
                          )}

                          {booking.status === 'confirmed' && (
                            <div className="text-center p-3 bg-green-50 rounded-lg">
                              <p className="text-sm text-green-800">✓ Confirmed on {format(new Date(booking.confirmed_date), 'MMM d, yyyy')}</p>
                            </div>
                          )}

                          {booking.status === 'rejected' && booking.owner_response && (
                            <div className="p-3 bg-red-50 rounded-lg">
                              <p className="text-xs text-gray-500 mb-1">Reason:</p>
                              <p className="text-sm text-red-800">{booking.owner_response}</p>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="sent">
                {loadingSentBookings ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-[#1e3a5f]" />
                  </div>
                ) : sentBookings.length === 0 ? (
                  <Card className="p-12 text-center bg-white">
                    <CalendarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Booking Requests</h3>
                    <p className="text-gray-600">Your booking requests will appear here</p>
                  </Card>
                ) : (
                  <div className="grid md:grid-cols-2 gap-6">
                    {sentBookings.map((booking) => (
                      <Card key={booking.id} className="p-6 hover:shadow-lg transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-bold text-[#1e3a5f] mb-1">{booking.property_address}</h3>
                            <Badge className={
                              booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                              booking.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }>
                              {booking.status}
                            </Badge>
                          </div>
                          <Badge variant="outline" className="capitalize">
                            {booking.booking_type === 'short_term_rent' ? 'Short-term' : 'Long-term'}
                          </Badge>
                        </div>

                        <div className="space-y-2 mb-4 text-sm text-gray-700">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4" />
                            <span>
                              {format(new Date(booking.check_in_date), 'MMM d, yyyy')}
                              {booking.check_out_date && ` - ${format(new Date(booking.check_out_date), 'MMM d, yyyy')}`}
                            </span>
                          </div>
                          {booking.booking_type === 'short_term_rent' && (
                            <>
                              <p>{booking.number_of_nights} night{booking.number_of_nights !== 1 ? 's' : ''}</p>
                              <p>{booking.number_of_guests} guest{booking.number_of_guests !== 1 ? 's' : ''}</p>
                            </>
                          )}
                          {booking.booking_type === 'long_term_rent' && (
                            <p>{booking.lease_months} month lease</p>
                          )}
                        </div>

                        <div className="pt-4 border-t">
                          <p className="text-2xl font-bold text-[#d4af37] mb-3">
                            ${booking.total_cost.toLocaleString()}
                          </p>

                          {booking.status === 'pending' && (
                            <div className="text-center p-3 bg-yellow-50 rounded-lg">
                              <p className="text-sm text-yellow-800">⏳ Waiting for owner response</p>
                            </div>
                          )}

                          {booking.status === 'confirmed' && (
                            <div className="text-center p-3 bg-green-50 rounded-lg">
                              <p className="text-sm font-semibold text-green-800 mb-2">✓ Booking Confirmed!</p>
                              {booking.owner_response && (
                                <p className="text-xs text-green-700">{booking.owner_response}</p>
                              )}
                            </div>
                          )}

                          {booking.status === 'rejected' && (
                            <div className="p-3 bg-red-50 rounded-lg">
                              <p className="text-sm font-semibold text-red-800 mb-1">Booking Declined</p>
                              {booking.owner_response && (
                                <p className="text-xs text-red-700">{booking.owner_response}</p>
                              )}
                            </div>
                          )}

                          {booking.status === 'pending' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full mt-3"
                              onClick={() => handleBookingAction(booking, 'cancelled')}
                              disabled={updateBookingMutation.isLoading}
                            >
                              Cancel Request
                            </Button>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}
