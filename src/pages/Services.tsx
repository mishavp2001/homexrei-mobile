
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Search, MapPin, Phone, Wrench, Plus, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import Navigation from '../components/Navigation';
import StarRating from '../components/Services/StarRating';

export const isPublic = true;

export default function Services() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedArea, setSelectedArea] = useState('all');
  const [showFilters, setShowFilters] = useState(false); // New state for filter drawer
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        // User not logged in, or error fetching user.
        // If the component can function without a logged-in user,
        // this catch block might not need to do anything specific,
        // or could log the error for debugging.
      }
    };
    loadUser();
  }, []);

  const { data: services, isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: () => base44.entities.ServiceListing.filter({ status: 'active' }, '-average_rating'),
    initialData: []
  });

  const { data: categories } = useQuery({
    queryKey: ['serviceCategories'],
    queryFn: () => base44.entities.Category.filter({ type: 'service_type', is_active: true }),
    initialData: []
  });

  const filteredServices = services.filter(service => {
    const matchesSearch = !searchTerm ||
      service.expert_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (service.service_category && service.service_category.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = selectedCategory === 'all' || service.service_category === selectedCategory;
    const matchesArea = selectedArea === 'all' || (service.service_area && service.service_area.toLowerCase().includes(selectedArea.toLowerCase()));

    return matchesSearch && matchesCategory && matchesArea;
  });

  const uniqueAreas = [...new Set(services.map((s) => s.service_area).filter(Boolean))];
  const serviceAreas = uniqueAreas; // Renamed for clarity in the filter dialog

  // New Provider action button for navigation
  const newProviderButton = (
    <Button
      onClick={() => {
        if (!user) {
          base44.auth.redirectToLogin(window.location.href);
          return;
        }
        window.location.href = createPageUrl('Profile');
      }}
      className="bg-[#d4af37] hover:bg-[#c49d2a]"
      size="sm"
    >
      <Plus className="w-4 h-4 mr-2" />
      List Service
    </Button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 pb-20">
      <Navigation user={user} actionButton={newProviderButton} />

      <div className="py-6 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-[#1e3a5f] mb-4">Service Providers</h1>
            <p className="text-xl text-gray-600">Find trusted experts for your home projects</p>
          </div>

          {/* Results */}
          {isLoading ? (
            <div className="text-center py-20">
              <Loader2 className="w-12 h-12 animate-spin text-[#1e3a5f] mx-auto" />
            </div>
          ) : filteredServices.length === 0 ? (
            <Card className="p-12 text-center">
              <Wrench className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No service providers found</h3>
              <p className="text-gray-600 mb-4">Try adjusting your filters</p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredServices.map((service) => (
                <Card key={service.id} className="p-6 hover:shadow-xl transition-shadow">
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
                      <h3 className="text-lg font-bold text-[#1e3a5f] mb-1">{service.expert_name}</h3>
                      {service.service_category && <Badge variant="outline">{service.service_category}</Badge>}
                      <div className="flex items-center gap-1 mt-2">
                        <StarRating rating={service.average_rating || 0} size="small" showCount={false} />
                        <span className="text-xs text-gray-500 ml-1">
                          ({service.review_count || 0})
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="text-gray-700 text-sm mb-4 line-clamp-3">{service.description}</p>

                  {service.service_area && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                      <MapPin className="w-4 h-4" />
                      <span>{service.service_area}</span>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 bg-[#1e3a5f] hover:bg-[#2a4a7f]" asChild>
                      <Link to={createPageUrl(`ServiceProfile?id=${service.id}`)}>
                        View Profile
                      </Link>
                    </Button>
                    {service.expert_phone && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={`tel:${service.expert_phone}`} onClick={(e) => e.stopPropagation()}>
                          <Phone className="w-4 h-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Fixed Bottom Search Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-gray-200 shadow-2xl z-40">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search services..."
                className="pl-9 h-10"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(true)}
              className="flex-shrink-0"
            >
              <Search className="w-4 h-4 mr-2" />
              Filters
            </Button>

            <Badge variant="outline" className="hidden sm:flex">
              {filteredServices.length} found
            </Badge>
          </div>
        </div>
      </div>

      {/* Filter Drawer */}
      <Dialog open={showFilters} onOpenChange={setShowFilters}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Filter Services</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="category-select">Service Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger id="category-select">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.icon} {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="area-select">Service Area</Label>
              <Select value={selectedArea} onValueChange={setSelectedArea}>
                <SelectTrigger id="area-select">
                  <SelectValue placeholder="All Areas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Areas</SelectItem>
                  {serviceAreas.map(area => (
                    <SelectItem key={area} value={area}>{area}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedArea('all');
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
    </div>
  );
}
