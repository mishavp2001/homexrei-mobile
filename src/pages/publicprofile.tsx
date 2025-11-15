import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  User, Briefcase, MapPin, Phone, Mail, Globe, Award, CheckCircle,
  Facebook, Instagram, Linkedin, Twitter, DollarSign, Image as ImageIcon, Loader2
} from 'lucide-react';
import Navigation from '../components/Navigation';

export const isPublic = true;

export default function PublicProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const userEmail = urlParams.get('user') ? decodeURIComponent(urlParams.get('user')) : null;
  
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
      } catch (error) {
        setCurrentUser(null);
      }
    };
    loadUser();
  }, []);

  // Fetch services by email (publicly accessible)
  const { data: userServices = [], isLoading: loadingServices } = useQuery({
    queryKey: ['userServices', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      return await base44.entities.ServiceListing.filter({ 
        expert_email: userEmail, 
        status: 'active' 
      });
    },
    enabled: !!userEmail,
    initialData: []
  });

  // Try to get user data if viewing own profile
  const { data: profileUser, isLoading: loadingUser } = useQuery({
    queryKey: ['profileUser', userEmail, currentUser?.email],
    queryFn: async () => {
      if (!userEmail) return null;
      
      // Only get user data if viewing own profile
      if (currentUser?.email === userEmail) {
        return currentUser;
      }
      
      return null;
    },
    enabled: !!userEmail && !!currentUser
  });

  const { data: userDeals = [] } = useQuery({
    queryKey: ['userDeals', userEmail],
    queryFn: async () => {
      if (!userEmail) return [];
      return await base44.entities.Deal.filter({ 
        user_email: userEmail, 
        status: 'active' 
      });
    },
    enabled: !!userEmail,
    initialData: []
  });

  const { data: allReviews = [] } = useQuery({
    queryKey: ['userReviews', userServices],
    queryFn: async () => {
      if (!userServices || userServices.length === 0) return [];
      const serviceIds = userServices.map(s => s.id);
      const reviews = await base44.entities.Review.list();
      return reviews.filter(r => serviceIds.includes(r.service_listing_id));
    },
    enabled: userServices.length > 0,
    initialData: []
  });

  const isLoading = loadingServices || loadingUser;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  // If no services found, profile doesn't exist publicly
  if (!userServices || userServices.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <Navigation user={currentUser} />
        <div className="py-12 px-4 flex items-center justify-center">
          <Card className="p-12 text-center max-w-md">
            <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile Not Found</h2>
            <p className="text-gray-600 mb-4">This user doesn't have any active service listings yet.</p>
            {userEmail && <p className="text-sm text-gray-500">Email: {userEmail}</p>}
          </Card>
        </div>
      </div>
    );
  }

  // Use service data as fallback for profile info
  const firstService = userServices[0];
  const userName = profileUser?.full_name || firstService.expert_name;
  
  // Use full user data if available, otherwise use service data
  const isBusinessProfile = profileUser?.profile_type === 'business';
  const displayName = profileUser?.business_name || profileUser?.full_name || userName;
  const displayPhoto = profileUser?.business_photo_url || profileUser?.profile_photo_url || firstService.photo_url;
  const displayBio = profileUser?.bio || '';
  const displayPhone = profileUser?.business_phone || firstService.expert_phone;

  const getReviewsForService = (serviceId) => {
    return allReviews.filter(r => r.service_listing_id === serviceId);
  };

  const getAverageRating = (serviceId) => {
    const reviews = getReviewsForService(serviceId);
    if (reviews.length === 0) return 0;
    return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <Navigation user={currentUser} />
      
      <div className="py-12 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Profile Header */}
          <Card className="p-8 mb-8 bg-white shadow-xl">
            <div className="flex flex-col md:flex-row gap-6">
              {displayPhoto ? (
                <img
                  src={displayPhoto}
                  alt={displayName}
                  className={`${isBusinessProfile ? 'w-32 h-32 rounded-lg' : 'w-32 h-32 rounded-full'} object-cover`}
                />
              ) : (
                <div className={`w-32 h-32 bg-[#1e3a5f] ${isBusinessProfile ? 'rounded-lg' : 'rounded-full'} flex items-center justify-center flex-shrink-0`}>
                  {isBusinessProfile ? <Briefcase className="w-16 h-16 text-white" /> : <User className="w-16 h-16 text-white" />}
                </div>
              )}
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <h1 className="text-3xl font-bold text-[#1e3a5f]">{displayName}</h1>
                  {profileUser && (
                    <Badge variant="outline" className="capitalize">
                      {isBusinessProfile ? <Briefcase className="w-3 h-3 mr-1" /> : <User className="w-3 h-3 mr-1" />}
                      {profileUser.profile_type}
                    </Badge>
                  )}
                </div>
                
                {displayBio && (
                  <div 
                    className="text-gray-700 mb-4 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: displayBio }}
                  />
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {profileUser?.business_address && isBusinessProfile && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>{profileUser.business_address}</span>
                    </div>
                  )}
                  {displayPhone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="w-4 h-4" />
                      <a href={`tel:${displayPhone}`} className="hover:text-[#1e3a5f]">
                        {displayPhone}
                      </a>
                    </div>
                  )}
                  {userEmail && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="w-4 h-4" />
                      <a href={`mailto:${userEmail}`} className="hover:text-[#1e3a5f]">
                        {userEmail}
                      </a>
                    </div>
                  )}
                  {profileUser?.website_url && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Globe className="w-4 h-4" />
                      <a href={profileUser.website_url} target="_blank" rel="noopener noreferrer" className="hover:text-[#1e3a5f]">
                        Website
                      </a>
                    </div>
                  )}
                  {profileUser?.years_in_business > 0 && isBusinessProfile && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Award className="w-4 h-4" />
                      <span>{profileUser.years_in_business} years in business</span>
                    </div>
                  )}
                </div>

                {/* Social Links */}
                {profileUser?.social_links && Object.values(profileUser.social_links).some(v => v) && (
                  <div className="flex gap-3 mt-4">
                    {profileUser.social_links.facebook && (
                      <a href={profileUser.social_links.facebook} target="_blank" rel="noopener noreferrer">
                        <Button size="icon" variant="outline">
                          <Facebook className="w-4 h-4" />
                        </Button>
                      </a>
                    )}
                    {profileUser.social_links.instagram && (
                      <a href={profileUser.social_links.instagram} target="_blank" rel="noopener noreferrer">
                        <Button size="icon" variant="outline">
                          <Instagram className="w-4 h-4" />
                        </Button>
                      </a>
                    )}
                    {profileUser.social_links.linkedin && (
                      <a href={profileUser.social_links.linkedin} target="_blank" rel="noopener noreferrer">
                        <Button size="icon" variant="outline">
                          <Linkedin className="w-4 h-4" />
                        </Button>
                      </a>
                    )}
                    {profileUser.social_links.twitter && (
                      <a href={profileUser.social_links.twitter} target="_blank" rel="noopener noreferrer">
                        <Button size="icon" variant="outline">
                          <Twitter className="w-4 h-4" />
                        </Button>
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Service Areas */}
          {profileUser?.service_areas?.length > 0 && isBusinessProfile && (
            <Card className="p-6 mb-8">
              <h2 className="text-xl font-bold text-[#1e3a5f] mb-4">Service Areas</h2>
              <div className="flex flex-wrap gap-2">
                {profileUser.service_areas.map((area, index) => (
                  <Badge key={index} variant="outline" className="text-base px-4 py-2">
                    <MapPin className="w-4 h-4 mr-2" />
                    {area}
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          {/* Certifications */}
          {profileUser?.certifications?.length > 0 && isBusinessProfile && (
            <Card className="p-6 mb-8">
              <h2 className="text-xl font-bold text-[#1e3a5f] mb-4">
                <Award className="w-5 h-5 inline mr-2" />
                Certifications & Licenses
              </h2>
              <ul className="space-y-2">
                {profileUser.certifications.map((cert, index) => (
                  <li key={index} className="flex items-center gap-2 text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    {cert}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Price List */}
          {profileUser?.price_list?.length > 0 && isBusinessProfile && (
            <Card className="p-6 mb-8">
              <h2 className="text-xl font-bold text-[#1e3a5f] mb-4">
                <DollarSign className="w-5 h-5 inline mr-2" />
                Price List
              </h2>
              <div className="space-y-3">
                {profileUser.price_list.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <span className="font-medium text-gray-900">{item.description}</span>
                    <span className="text-xl font-bold text-[#d4af37]">${item.price}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Portfolio / Work Photos */}
          {profileUser?.work_photos?.length > 0 && isBusinessProfile && (
            <Card className="p-6 mb-8">
              <h2 className="text-xl font-bold text-[#1e3a5f] mb-4">
                <ImageIcon className="w-5 h-5 inline mr-2" />
                Portfolio
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {profileUser.work_photos.map((url, index) => (
                  <img 
                    key={index} 
                    src={url} 
                    alt={`Work ${index + 1}`} 
                    className="w-full h-48 object-cover rounded-lg hover:scale-105 transition-transform cursor-pointer"
                    onClick={() => window.open(url, '_blank')}
                  />
                ))}
              </div>
            </Card>
          )}

          {/* Service Listings with Details */}
          {userServices.length > 0 && (
            <Card className="p-6 mb-8">
              <h2 className="text-xl font-bold text-[#1e3a5f] mb-6">Services Offered</h2>
              <div className="space-y-8">
                {userServices.map((service) => {
                  const serviceReviews = getReviewsForService(service.id);
                  const avgRating = getAverageRating(service.id);
                  
                  return (
                    <div key={service.id} className="border-b pb-8 last:border-b-0 last:pb-0">
                      <div className="flex items-start gap-6 mb-6">
                        {service.photo_url && (
                          <img 
                            src={service.photo_url} 
                            alt={service.expert_name}
                            className="w-32 h-32 object-cover rounded-lg"
                          />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-sm">{service.service_category}</Badge>
                            {service.is_verified && (
                              <Badge className="bg-blue-100 text-blue-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Verified
                              </Badge>
                            )}
                          </div>
                          <h3 className="text-2xl font-bold text-[#1e3a5f] mb-3">{service.expert_name}</h3>
                          
                          {/* Rating */}
                          <div className="flex items-center gap-4 mb-4">
                            <div className="flex items-center gap-2">
                              {[...Array(5)].map((_, i) => (
                                <Award key={i} className={`w-5 h-5 ${i < Math.round(avgRating) ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-300'}`} />
                              ))}
                            </div>
                            <span className="text-lg font-semibold text-gray-700">
                              {avgRating > 0 ? avgRating.toFixed(1) : 'No reviews'}
                            </span>
                            <span className="text-sm text-gray-500">
                              ({serviceReviews.length} review{serviceReviews.length !== 1 ? 's' : ''})
                            </span>
                          </div>

                          <div 
                            className="text-gray-700 mb-4 leading-relaxed prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{ __html: service.description }}
                          />
                          
                          <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4">
                            {service.service_area && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {service.service_area}
                              </span>
                            )}
                            {service.years_experience > 0 && (
                              <span className="flex items-center gap-1">
                                <Award className="w-4 h-4" />
                                {service.years_experience} years experience
                              </span>
                            )}
                            {service.hourly_rate > 0 && (
                              <span className="flex items-center gap-1">
                                <DollarSign className="w-4 h-4" />
                                ${service.hourly_rate}/hour
                              </span>
                            )}
                          </div>

                          {service.certifications && (
                            <div className="p-4 bg-gray-50 rounded-lg">
                              <p className="text-sm font-semibold text-gray-700 mb-2">Certifications & Licenses:</p>
                              <p className="text-sm text-gray-600">{service.certifications}</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Reviews Section */}
                      {serviceReviews.length > 0 && (
                        <div className="mt-6 pt-6 border-t">
                          <h4 className="text-lg font-semibold text-[#1e3a5f] mb-4">
                            Customer Reviews ({serviceReviews.length})
                          </h4>
                          <div className="space-y-4">
                            {serviceReviews.slice(0, 5).map((review) => (
                              <Card key={review.id} className="p-4 bg-gray-50">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <p className="font-semibold text-gray-900">{review.reviewer_name}</p>
                                    <div className="flex items-center gap-1 mt-1">
                                      {[...Array(5)].map((_, i) => (
                                        <Award key={i} className={`w-4 h-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-300'}`} />
                                      ))}
                                    </div>
                                  </div>
                                  <span className="text-xs text-gray-500">
                                    {new Date(review.created_date).toLocaleDateString()}
                                  </span>
                                </div>
                                {review.review_text && (
                                  <p className="text-gray-700 text-sm mt-3">{review.review_text}</p>
                                )}
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Contact Buttons */}
                      <div className="flex gap-3 mt-6">
                        {displayPhone && (
                          <Button asChild className="bg-[#1e3a5f] hover:bg-[#2a4a7f]">
                            <a href={`tel:${displayPhone}`}>
                              <Phone className="w-4 h-4 mr-2" />
                              Call Now
                            </a>
                          </Button>
                        )}
                        <Button asChild variant="outline">
                          <a href={`mailto:${service.expert_email}`}>
                            <Mail className="w-4 h-4 mr-2" />
                            Send Email
                          </a>
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Active Deals */}
          {userDeals.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-bold text-[#1e3a5f] mb-4">Active Listings</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {userDeals.map((deal) => (
                  <Card key={deal.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    {deal.photo_urls?.length > 0 && (
                      <img src={deal.photo_urls[0]} alt={deal.title} className="w-full h-32 object-cover" />
                    )}
                    <div className="p-4">
                      <h3 className="font-bold text-[#1e3a5f] mb-2 line-clamp-1">{deal.title}</h3>
                      <p className="text-lg font-bold text-[#d4af37] mb-2">${deal.price.toLocaleString()}</p>
                      <p className="text-sm text-gray-600 line-clamp-1">{deal.location}</p>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}