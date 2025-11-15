import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Home, Wrench, MapPin, Phone, Mail, Bed, Bath, Maximize, Calendar, Moon, ExternalLink, Heart, MessageSquare, DollarSign, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function DealCard({ deal, onViewDetails, onMakeOffer, isOwner }) {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);

  // Load current user
  React.useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        // User not logged in
      }
    };
    loadUser();
  }, []);

  // Check if deal is saved by current user
  const { data: savedDeals = [] } = useQuery({
    queryKey: ['savedDeals', currentUser?.email, deal.id],
    queryFn: () => currentUser ? base44.entities.SavedDeal.filter({ user_email: currentUser.email, deal_id: deal.id }) : [],
    enabled: !!currentUser
  });

  const isSaved = savedDeals.length > 0;

  const saveDealMutation = useMutation({
    mutationFn: (data) => base44.entities.SavedDeal.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['savedDeals']);
    }
  });

  const unsaveDealMutation = useMutation({
    mutationFn: (id) => base44.entities.SavedDeal.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['savedDeals']);
    }
  });

  const handleSave = async (e) => {
    e.stopPropagation();
    
    if (!currentUser) {
      alert('Please sign in to save deals');
      base44.auth.redirectToLogin(window.location.href);
      return;
    }

    if (isSaved) {
      const savedDeal = savedDeals[0];
      unsaveDealMutation.mutate(savedDeal.id);
    } else {
      saveDealMutation.mutate({
        deal_id: deal.id,
        user_email: currentUser.email,
        deal_title: deal.title,
        deal_type: deal.deal_type,
        deal_price: deal.price,
        deal_location: deal.location,
        deal_photo_url: deal.photo_urls?.[0] || null
      });
    }
  };

  const handleContact = (e, type) => {
    e.stopPropagation();
    
    if (!currentUser) {
      alert('Please sign in to contact seller');
      base44.auth.redirectToLogin(window.location.href);
      return;
    }

    if (type === 'message') {
      // Navigate to messages with pre-filled recipient
      window.location.href = createPageUrl(`Messages?to=${deal.user_email}&subject=Inquiry about ${deal.title}`);
    }
  };

  const handleMakeOfferClick = (e) => {
    e.stopPropagation();
    
    if (!currentUser) {
      alert('Please sign in to make an offer');
      base44.auth.redirectToLogin(window.location.href);
      return;
    }
    
    if (onMakeOffer) {
      onMakeOffer(deal);
    }
  };

  const isProperty = ['sale', 'long_term_rent', 'short_term_rent'].includes(deal.deal_type);
  const isSale = deal.deal_type === 'sale';

  // Create public URL for the deal - use address-based lookup
  const getPublicDealUrl = () => {
    const encodedAddress = encodeURIComponent(deal.location);
    
    if (deal.deal_type === 'sale') {
      return `/sale?address=${encodedAddress}`;
    } else if (deal.deal_type === 'long_term_rent') {
      return `/rent?address=${encodedAddress}`;
    } else if (deal.deal_type === 'short_term_rent') {
      return `/airbnb?address=${encodedAddress}`;
    }
    return null;
  };

  const publicUrl = getPublicDealUrl();

  const getDealTypeLabel = () => {
    switch (deal.deal_type) {
      case 'sale':
        return 'Property Sale';
      case 'long_term_rent':
        return 'Long-Term Rent';
      case 'short_term_rent':
        return 'Airbnb';
      case 'service_deal':
        return 'Service Deal';
      default:
        return deal.deal_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Deal';
    }
  };

  const getDealTypeColor = () => {
    switch (deal.deal_type) {
      case 'sale':
        return 'bg-[#1e3a5f] text-white';
      case 'long_term_rent':
        return 'bg-blue-600 text-white';
      case 'short_term_rent':
        return 'bg-purple-600 text-white';
      default:
        return 'bg-[#d4af37] text-white';
    }
  };

  return (
    <Card className="overflow-hidden hover:shadow-xl transition-shadow">
      {deal.photo_urls?.length > 0 && (
        <div 
          onClick={() => onViewDetails(deal)}
          className="h-48 overflow-hidden relative cursor-pointer group bg-black"
        >
          <img
            src={deal.photo_urls[0]}
            alt={deal.title}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
          />
          {deal.deal_type === 'long_term_rent' && (
            <div className="absolute top-3 right-3 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-semibold">
              ${deal.price.toLocaleString()}/mo
            </div>
          )}
          {deal.owner_financing_available && (
            <div className="absolute top-3 left-3 bg-[#d4af37] text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
              💰 Owner Financing
            </div>
          )}
          
          {/* Favorite button overlay */}
          {!isOwner && (
            <button
              onClick={handleSave}
              className="absolute top-3 right-3 w-10 h-10 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110"
            >
              <Heart className={`w-5 h-5 ${isSaved ? 'fill-red-500 text-red-500' : 'text-gray-700'}`} />
            </button>
          )}
        </div>
      )}
      
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {isProperty ? (
              <Home className="w-5 h-5 text-[#1e3a5f]" />
            ) : (
              <Wrench className="w-5 h-5 text-[#d4af37]" />
            )}
            <Badge className={getDealTypeColor()}>
              {getDealTypeLabel()}
            </Badge>
            {deal.owner_financing_available && (
              <Badge className="bg-[#d4af37] text-white">
                💰 Financing
              </Badge>
            )}
          </div>
          <Badge className={
            deal.status === 'active' ? 'bg-green-100 text-green-800' :
            deal.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
            ['sold', 'rented'].includes(deal.status) ? 'bg-gray-100 text-gray-800' :
            'bg-red-100 text-red-800'
          }>
            {deal.status}
          </Badge>
        </div>

        <h3 className="text-xl font-bold text-[#1e3a5f] mb-2 cursor-pointer hover:text-[#2a4a7f]" onClick={() => onViewDetails(deal)}>
          {deal.title}
        </h3>
        
        <p className="text-3xl font-bold text-[#d4af37] mb-3">
          {deal.deal_type === 'short_term_rent' && !deal.price_per_night ? (
            <span className="text-xl">Contact for Price</span>
          ) : deal.deal_type === 'short_term_rent' && deal.price_per_night ? (
            <>
              <span className="text-xl text-gray-600">From </span>
              ${deal.price_per_night}/night
            </>
          ) : deal.deal_type === 'long_term_rent' ? (
            <>
              <span className="text-xl text-gray-600">From </span>
              ${deal.price.toLocaleString()}<span className="text-xl text-gray-600">/mo</span>
            </>
          ) : (
            <span>${deal.price.toLocaleString()}</span>
          )}
        </p>

        {isProperty && (deal.bedrooms || deal.bathrooms || deal.sqft) && (
          <div className="flex gap-4 mb-3 text-sm text-gray-600">
            {deal.bedrooms && (
              <span className="flex items-center gap-1">
                <Bed className="w-4 h-4" />
                {deal.bedrooms} bed
              </span>
            )}
            {deal.bathrooms && (
              <span className="flex items-center gap-1">
                <Bath className="w-4 h-4" />
                {deal.bathrooms} bath
              </span>
            )}
            {deal.sqft && (
              <span className="flex items-center gap-1">
                <Maximize className="w-4 h-4" />
                {deal.sqft} sqft
              </span>
            )}
          </div>
        )}

        {deal.deal_type === 'short_term_rent' && deal.minimum_stay && (
          <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
            <Moon className="w-4 h-4" />
            <span>{deal.minimum_stay} night minimum</span>
          </div>
        )}

        {!isProperty && deal.service_category && (
          <Badge variant="outline" className="mb-3">
            {deal.service_category}
          </Badge>
        )}

        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {deal.description}
        </p>

        <div className="flex items-start gap-1 text-sm text-gray-500 mb-4">
          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{deal.location}</span>
        </div>

        {/* Action Buttons */}
        {!isOwner && isProperty && (
          <div className="grid grid-cols-5 gap-1 mb-3">
            {isSale && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleMakeOfferClick}
                className="p-2"
                title="Make Offer"
              >
                <DollarSign className="w-4 h-4" />
              </Button>
            )}
            
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => handleContact(e, 'message')}
              className="p-2"
              title="Message"
            >
              <MessageSquare className="w-4 h-4" />
            </Button>
            
            {deal.contact_email && (
              <Button
                size="sm"
                variant="outline"
                asChild
                className="p-2"
                title="Email"
                onClick={(e) => e.stopPropagation()}
              >
                <a href={`mailto:${deal.contact_email}`}>
                  <Mail className="w-4 h-4" />
                </a>
              </Button>
            )}
            
            {deal.contact_phone && (
              <Button
                size="sm"
                variant="outline"
                asChild
                className="p-2"
                title="Call"
                onClick={(e) => e.stopPropagation()}
              >
                <a href={`tel:${deal.contact_phone}`}>
                  <Phone className="w-4 h-4" />
                </a>
              </Button>
            )}
            
            {publicUrl && (
              <Button
                size="sm"
                variant="outline"
                asChild
                className="p-2"
                title="See Disclosures"
                onClick={(e) => e.stopPropagation()}
              >
                <Link to={publicUrl}>
                  <FileText className="w-4 h-4" />
                </Link>
              </Button>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button 
            size="sm" 
            className="flex-1 bg-[#1e3a5f] hover:bg-[#2a4a7f]"
            onClick={() => onViewDetails(deal)}
          >
            {isOwner ? 'Edit' : deal.deal_type === 'service_deal' ? 'Book Service Deal' : 'View Details'}
          </Button>
          {publicUrl && !isOwner && (
            <Link to={publicUrl} onClick={(e) => e.stopPropagation()}>
              <Button size="sm" variant="outline" title="View full public listing">
                <ExternalLink className="w-4 h-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}