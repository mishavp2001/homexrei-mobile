
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, X, Loader2, Home, Sparkles } from 'lucide-react';

export default function DealForm({ deal, onSubmit, onCancel, categories, currentUser }) {
  const [uploading, setUploading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [generatingQR, setGeneratingQR] = useState(false);
  const [formData, setFormData] = useState(deal || {
    deal_type: 'sale',
    title: '',
    description: '',
    price: '',
    price_per_night: '',
    minimum_stay: '',
    location: '',
    latitude: null,
    longitude: null,
    property_type: 'single_family',
    service_category: '',
    photo_urls: [],
    contact_phone: '',
    contact_email: '',
    bedrooms: '',
    bathrooms: '',
    sqft: '',
    additional_services: [], // New field added here
    owner_financing_available: false,
    min_down_payment_percent: '',
    min_down_payment_amount: '',
    interest_rate: '',
    term_years: '',
    hoa_monthly: '',
    property_tax_annual: '',
    insurance_annual: '',
    other_monthly_expenses: [],
    qr_code_url: deal?.qr_code_url || null
  });

  const [newExpense, setNewExpense] = useState({ name: '', amount: '' });

  // Quill modules configuration
  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'color': [] }, { 'background': [] }],
      ['link'],
      ['clean']
    ]
  };

  const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'color', 'background',
    'link'
  ];

  // Fetch user's properties if logged in and posting property sale
  const { data: userProperties } = useQuery({
    queryKey: ['userProperties', currentUser?.email],
    queryFn: () => currentUser ? base44.entities.Property.filter({ user_email: currentUser.email }) : [],
    // Enabled only for 'sale' to align with current handlePropertySelect logic which uses appraised_value and "for Sale" title
    enabled: !!currentUser && formData.deal_type === 'sale',
    initialData: []
  });

  // Fetch user's service listings to get available categories and contact info
  const { data: userServices = [] } = useQuery({
    queryKey: ['userServices', currentUser?.email],
    queryFn: () => currentUser ? base44.entities.ServiceListing.filter({ expert_email: currentUser.email }) : [],
    enabled: !!currentUser,
    initialData: []
  });

  // Fetch user's service DEALS (not service listings) for additional services on Airbnb
  const { data: userServiceDeals = [] } = useQuery({
    queryKey: ['userServiceDeals', currentUser?.email],
    queryFn: () => currentUser ? base44.entities.Deal.filter({ 
      user_email: currentUser.email, 
      deal_type: 'service_deal',
      status: 'active'
    }) : [],
    enabled: !!currentUser,
    initialData: []
  });

  // Get unique service categories from user's listings
  const availableServiceCategories = [...new Set(userServices.map(s => s.service_category))];

  const [selectedPropertyId, setSelectedPropertyId] = useState('');

  useEffect(() => {
    // If editing existing deal, don't auto-select
    if (deal) return;

    // Auto-select if user only has one property AND the current deal_type is 'sale'
    if (userProperties && userProperties.length === 1 && !selectedPropertyId && formData.deal_type === 'sale') {
      handlePropertySelect(userProperties[0].id);
    }
  }, [userProperties, deal, formData.deal_type, selectedPropertyId]); // Added selectedPropertyId to dependency array

  // Auto-populate contact info from service listing when deal type is service_deal
  useEffect(() => {
    if (formData.deal_type === 'service_deal' && userServices.length > 0 && !deal) {
      const firstService = userServices[0];
      setFormData(prev => ({
        ...prev,
        contact_phone: firstService.expert_phone || prev.contact_phone,
        contact_email: firstService.expert_email || prev.contact_email,
        service_category: prev.service_category || availableServiceCategories[0] || ''
      }));
    }
  }, [formData.deal_type, userServices, availableServiceCategories, deal]);

  const handlePropertySelect = (propertyId) => {
    if (!propertyId) {
      setSelectedPropertyId('');
      // Optionally clear other fields if "Enter Manually" is selected
      setFormData(prevData => ({
        ...prevData,
        title: '',
        location: '',
        latitude: null,
        longitude: null,
        property_type: 'single_family',
        bedrooms: '',
        bathrooms: '',
        sqft: '',
        description: '',
        price: '',
        price_per_night: '',
        minimum_stay: '',
        // Clear owner financing fields when selecting "Enter Manually"
        owner_financing_available: false,
        min_down_payment_percent: '',
        min_down_payment_amount: '',
        interest_rate: '',
        term_years: '',
        hoa_monthly: '',
        property_tax_annual: '',
        insurance_annual: '',
        other_monthly_expenses: [],
        additional_services: [] // Clear additional services
      }));
      return;
    }

    const property = userProperties.find(p => p.id === propertyId);
    if (!property) return;

    setSelectedPropertyId(propertyId);

    // Auto-populate form with property data
    // Note: This logic is heavily geared towards 'sale' deals (e.g., appraised_value, "for Sale" in title/description)
    // If other property deal types (rent) need property pre-fill, this function would need to be enhanced.
    setFormData(prevData => ({
      ...prevData,
      title: `${property.property_type.replace('_', ' ')} for Sale - ${property.address}`,
      location: property.address,
      latitude: null, // Will be geocoded
      longitude: null,
      property_type: property.property_type,
      bedrooms: property.bedrooms || '',
      bathrooms: property.bathrooms || '',
      sqft: property.sqft || '',
      description: `${property.property_type.replace('_', ' ').toUpperCase()} for sale<br><br>` +
                   `📍 ${property.address}<br>` +
                   `🏠 ${property.bedrooms || 'N/A'} bedrooms, ${property.bathrooms || 'N/A'} bathrooms<br>` +
                   `📏 ${property.sqft ? property.sqft.toLocaleString() : 'N/A'} sqft<br>` +
                   (property.year_built ? `📅 Built in ${property.year_built}<br>` : '') +
                   (property.appraised_value ? `💰 Appraised at $${property.appraised_value.toLocaleString()}<br>` : '') +
                   `<br>Professionally digitized with AI-enhanced property analysis.`,
      price: property.appraised_value || ''
    }));

    // Auto-geocode the address
    if (property.address) {
      geocodeAddress(property.address);
    }
  };

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = files.map(file =>
        base44.integrations.Core.UploadFile({ file })
      );
      const results = await Promise.all(uploadPromises);
      const urls = results.map(r => r.file_url);
      setFormData({ ...formData, photo_urls: [...formData.photo_urls, ...urls] });
    } catch (error) {
      console.error('Upload error:', error);
    }
    setUploading(false);
  };

  const removePhoto = (index) => {
    setFormData({
      ...formData,
      photo_urls: formData.photo_urls.filter((_, i) => i !== index)
    });
  };

  const geocodeAddress = async (address = formData.location) => {
    if (!address?.trim()) return;

    setGeocoding(true);
    try {
      // Helper function to try geocoding with a given address
      const tryGeocode = async (searchAddress) => {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}`
        );
        const data = await response.json();
        return data && data.length > 0 ? data[0] : null;
      };

      // Try full address first
      let result = await tryGeocode(address);
      let geocodeLevel = 'exact';

      // If full address fails, try to extract city and state
      if (!result) {
        // Try to parse address to get city and state
        // Common format: "123 Main St, San Francisco, CA 94102"
        const parts = address.split(',').map(p => p.trim()).filter(Boolean); // Filter Boolean to remove empty strings

        if (parts.length >= 2) {
          // Try city + state (skip street address)
          // Example: "San Francisco, CA" or "CA 94102"
          const cityStateOrZip = parts.slice(-2).join(', '); // Get the last two parts
          result = await tryGeocode(cityStateOrZip);

          if (result) {
            geocodeLevel = 'city'; // This could be city or city+zip
          } else if (parts.length >= 1) {
            // Try just state/last part if previous attempts fail
            const lastPart = parts[parts.length - 1];
            if (lastPart.length === 2 || lastPart.match(/^\d{5}$/)) { // Simple check for state abbreviation or zip code
              result = await tryGeocode(lastPart);
              if (result) {
                geocodeLevel = 'state'; // Could be state or zip
              }
            }
          }
        } else if (parts.length === 1) {
          // If only one part, try it as a state or city
          result = await tryGeocode(parts[0]);
          if (result) {
            // Check if it's likely a state or a broad city
            if (parts[0].length === 2 || result.osm_type === 'state' || result.osm_type === 'administrative') {
               geocodeLevel = 'state';
            } else {
               geocodeLevel = 'city';
            }
          }
        }
      }

      if (result) {
        setFormData({
          ...formData,
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon)
        });

        // Show user what level we geocoded to
        if (geocodeLevel === 'city') {
          alert(`Exact address not found. Using city/region-level location for: ${result.display_name}. Please refine your address if this is not accurate.`);
        } else if (geocodeLevel === 'state') {
          alert(`City/Region not found. Using state/broader area-level location for: ${result.display_name}. Please provide a more specific address.`);
        }
      } else {
        alert('Could not find location coordinates for the provided address. Please check the address or try a nearby city/state.');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      alert('Error geocoding address. Please try again.');
    }
    setGeocoding(false);
  };

  const addOtherExpense = () => {
    if (!newExpense.name || !newExpense.amount) return;
    setFormData({
      ...formData,
      other_monthly_expenses: [
        ...(formData.other_monthly_expenses || []),
        { name: newExpense.name, amount: parseFloat(newExpense.amount) }
      ]
    });
    setNewExpense({ name: '', amount: '' });
  };

  const removeOtherExpense = (index) => {
    setFormData({
      ...formData,
      other_monthly_expenses: formData.other_monthly_expenses.filter((_, i) => i !== index)
    });
  };

  const handleGenerateQRCode = async () => {
    if (!formData.location) {
      alert('Please enter a location first');
      return;
    }

    setGeneratingQR(true);
    try {
      // Create the public URL that the QR code will link to - use production URL
      const encodedAddress = encodeURIComponent(formData.location);
      const publicUrl = `https://homexrei.com/airbnb?address=${encodedAddress}`;
      
      // Use a free QR code API to generate the QR code
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(publicUrl)}&format=png`;
      
      // Fetch and upload the QR code
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const file = new File([blob], 'qr-code.png', { type: 'image/png' });
      
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      setFormData({ ...formData, qr_code_url: file_url });
      alert('QR Code generated successfully!');
    } catch (error) {
      console.error('Error generating QR code:', error);
      alert('Failed to generate QR code. Please try again.');
    }
    setGeneratingQR(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.latitude || !formData.longitude) {
      alert('Please geocode the address first by clicking "Find on Map"');
      return;
    }

    // Validate service category for service deals
    if (formData.deal_type === 'service_deal') {
      if (!formData.service_category) {
        alert('Please select a service category');
        return;
      }
      if (!availableServiceCategories.includes(formData.service_category)) {
        alert('Please select a service category from your existing service listings');
        return;
      }
    }

    // For Airbnb deals without nightly price, validate that user understands
    if (formData.deal_type === 'short_term_rent' && !formData.price_per_night) {
      const confirmed = confirm(
        '⚠️ No nightly price set.\n\n' +
        'Without a nightly price, direct booking won\'t be available on your listing. ' +
        'Visitors will only see your external booking links (Airbnb, etc.).\n\n' +
        'This is to comply with platform policies.\n\n' +
        'Continue without nightly price?'
      );
      if (!confirmed) return;
    }

    const data = {
      ...formData,
      price: formData.price_per_night ? parseFloat(formData.price_per_night) : parseFloat(formData.price || 0),
      price_per_night: formData.price_per_night ? parseFloat(formData.price_per_night) : null,
      bedrooms: formData.bedrooms ? parseFloat(formData.bedrooms) : null,
      bathrooms: formData.bathrooms ? parseFloat(formData.bathrooms) : null,
      sqft: formData.sqft ? parseFloat(formData.sqft) : null,
      minimum_stay: formData.minimum_stay ? parseInt(formData.minimum_stay) : null,
      min_down_payment_percent: formData.min_down_payment_percent ? parseFloat(formData.min_down_payment_percent) : null,
      min_down_payment_amount: formData.min_down_payment_amount ? parseFloat(formData.min_down_payment_amount) : null,
      interest_rate: formData.interest_rate ? parseFloat(formData.interest_rate) : null,
      term_years: formData.term_years ? parseFloat(formData.term_years) : null,
      hoa_monthly: formData.hoa_monthly ? parseFloat(formData.hoa_monthly) : null,
      property_tax_annual: formData.property_tax_annual ? parseFloat(formData.property_tax_annual) : null,
      insurance_annual: formData.insurance_annual ? parseFloat(formData.insurance_annual) : null
      // additional_services is already an array of objects, no special parsing needed
    };

    onSubmit(data);
  };

  // 'isProperty' now refers to any deal type that is not a service deal
  const isProperty = formData.deal_type !== 'service_deal';
  // 'hasProperties' is only true if userProperties are fetched and available AND current deal type is 'sale'
  const hasProperties = userProperties && userProperties.length > 0 && formData.deal_type === 'sale';
  const isServiceDeal = formData.deal_type === 'service_deal';
  const isPropertySale = formData.deal_type === 'sale';
  const isShortTermRent = formData.deal_type === 'short_term_rent'; // New boolean for short-term rent

  return (
    <Card className="p-6 bg-gray-50">
      <h3 className="text-xl font-bold text-[#1e3a5f] mb-4">
        {deal ? 'Edit Deal' : 'Post New Deal'}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label>Deal Type *</Label>
          <Select
            value={formData.deal_type}
            onValueChange={(value) => {
              setFormData({ ...formData, deal_type: value });
              setSelectedPropertyId(''); // Reset property selection when changing deal type
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sale">Property Sale</SelectItem>
              <SelectItem value="long_term_rent">Long-Term Rent</SelectItem>
              <SelectItem value="short_term_rent">Airbnb / Short-Term Rent</SelectItem>
              <SelectItem value="service_deal">Service Deal (Specific Offer)</SelectItem>
            </SelectContent>
          </Select>
          {formData.deal_type === 'service_deal' && (
            <p className="text-xs text-gray-500 mt-1">
              Service deals are specific offers. Your general service profile is listed on the <a href="/services" className="underline">Service Providers page</a>.
            </p>
          )}
        </div>

        {/* Show warning if trying to post service deal without service listing */}
        {isServiceDeal && availableServiceCategories.length === 0 && (
          <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-900">
              ⚠️ <strong>Service Provider Profile Required:</strong> You need to create a service provider profile first before posting service deals. Visit your <a href="/profile" className="underline font-semibold">Profile</a> to add your service.
            </p>
          </div>
        )}

        {/* Property Selector - Only show for 'sale' deals and if user has properties fetched */}
        {isProperty && hasProperties && !deal && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Home className="w-5 h-5 text-[#1e3a5f]" />
              <Label className="font-semibold text-[#1e3a5f] mb-0">
                Select from Your Properties
              </Label>
              {selectedPropertyId && (
                <Badge className="bg-gradient-to-r from-[#d4af37] to-[#c49d2a] text-white">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Auto-filled
                </Badge>
              )}
            </div>
            <Select
              value={selectedPropertyId}
              onValueChange={handlePropertySelect}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a property or enter manually below" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Enter Manually</SelectItem>
                {userProperties.map(property => (
                  <SelectItem key={property.id} value={property.id}>
                    <div className="flex items-center gap-2">
                      <span>{property.address}</span>
                      {property.appraised_value && (
                        <span className="text-xs text-gray-500">
                          (${property.appraised_value.toLocaleString()})
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-600 mt-2">
              Select one of your digitized properties to auto-fill the form
            </p>
          </div>
        )}

        <div>
          <Label>Title *</Label>
          <Input
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder={isProperty ? 'Beautiful 3BR Home in Downtown' : 'Professional Roofing Service - 20% Off'}
            required
          />
        </div>

        <div>
          <Label>Description *</Label>
          <div className="bg-white rounded-lg">
            <ReactQuill
              theme="snow"
              value={formData.description}
              onChange={(value) => setFormData({ ...formData, description: value })}
              modules={quillModules}
              formats={quillFormats}
              placeholder="Describe your property or service in detail..."
              style={{ minHeight: '120px' }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Use formatting to make your description more attractive</p>
        </div>

        {/* Price fields */}
        {isShortTermRent ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Base Price Per Night ($)</Label>
                <Input
                  type="number"
                  value={formData.price_per_night || ''}
                  onChange={(e) => setFormData({ ...formData, price_per_night: e.target.value, price: e.target.value || '0' })}
                  placeholder="150"
                  // price_per_night is optional for short_term_rent if they only want to link externally
                  // required={false} // This can be handled by setting price to '0' if price_per_night is empty, so price is always "set"
                />
                <p className="text-xs text-gray-500 mt-1">Optional - leave empty if booking via Airbnb/external only</p>
              </div>
              <div>
                <Label>Minimum Stay (nights)</Label>
                <Input
                  type="number"
                  value={formData.minimum_stay || ''}
                  onChange={(e) => setFormData({ ...formData, minimum_stay: e.target.value })}
                  placeholder="2"
                />
              </div>
            </div>
            {!formData.price_per_night && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800">
                  ⚠️ <strong>Note:</strong> Without a nightly price, direct booking won't be available. Visitors will only see your external booking links (Airbnb, etc.). This prevents violating Airbnb's policy against circumventing their platform.
                </p>
              </div>
            )}
          </>
        ) : formData.deal_type === 'long_term_rent' ? (
          <div>
            <Label>Monthly Rent ($) *</Label>
            <Input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="2500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Monthly rental price</p>
          </div>
        ) : (
          <div>
            <Label>Price ($) *</Label>
            <Input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder={isProperty ? '450000' : '5000'}
              required
            />
          </div>
        )}

        {/* Additional Services for Short-Term Rentals */}
        {isShortTermRent && userServiceDeals.length > 0 && (
          <div className="border-2 border-purple-200 rounded-lg p-6 bg-purple-50">
            <h4 className="font-semibold text-[#1e3a5f] mb-3">✨ Additional Service Deals (Optional)</h4>
            <p className="text-sm text-gray-600 mb-4">
              Add your service deals as optional add-ons for guests (cleaning, airport shuttle, chef services, etc.)
            </p>

            {formData.additional_services && formData.additional_services.length > 0 && (
              <div className="mb-4 space-y-2">
                {formData.additional_services.map((service, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white p-3 rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{service.service_name}</p>
                      <p className="text-xs text-gray-600">${service.price} - {service.service_category}</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          additional_services: prev.additional_services.filter((_, i) => i !== idx)
                        }));
                      }}
                      className="text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <Select
              onValueChange={(value) => {
                const serviceDeal = userServiceDeals.find(s => s.id === value);
                // Only add if service deal exists and is not already in the list
                if (serviceDeal && !formData.additional_services?.find(s => s.service_deal_id === serviceDeal.id)) {
                  setFormData(prev => ({
                    ...prev,
                    additional_services: [
                      ...(prev.additional_services || []),
                      {
                        service_deal_id: serviceDeal.id,
                        service_name: serviceDeal.title,
                        service_category: serviceDeal.service_category,
                        price: serviceDeal.price,
                        description: serviceDeal.description
                      }
                    ]
                  }));
                }
              }}
              value="" // Reset select value after selection
            >
              <SelectTrigger>
                <SelectValue placeholder="Add a service deal..." />
              </SelectTrigger>
              <SelectContent>
                {userServiceDeals.map(serviceDeal => (
                  <SelectItem key={serviceDeal.id} value={serviceDeal.id}>
                    {serviceDeal.title} - {serviceDeal.service_category} (${serviceDeal.price})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-2">
              Only your active service deals are shown. Create service deals on the <a href="/deals" className="underline font-semibold">Deals page</a>.
            </p>
          </div>
        )}

        {/* Owner Financing Section - Only for Property Sale */}
        {isPropertySale && (
          <div className="border-2 border-[#d4af37] rounded-lg p-6 bg-gradient-to-r from-[#d4af37]/5 to-[#d4af37]/10">
            <div className="flex items-center gap-3 mb-4">
              <input
                type="checkbox"
                id="owner-financing"
                checked={formData.owner_financing_available}
                onChange={(e) => setFormData({ ...formData, owner_financing_available: e.target.checked })}
                className="w-5 h-5 text-[#d4af37] focus:ring-[#d4af37]"
              />
              <Label htmlFor="owner-financing" className="text-lg font-semibold text-[#1e3a5f] cursor-pointer">
                💰 Offer Owner Financing
              </Label>
            </div>

            {formData.owner_financing_available && (
              <div className="space-y-4 mt-4 pl-8">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Min. Down Payment (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={formData.min_down_payment_percent || ''}
                      onChange={(e) => setFormData({ ...formData, min_down_payment_percent: e.target.value })}
                      placeholder="20"
                    />
                  </div>
                  <div>
                    <Label>Or Fixed Amount ($)</Label>
                    <Input
                      type="number"
                      value={formData.min_down_payment_amount || ''}
                      onChange={(e) => setFormData({ ...formData, min_down_payment_amount: e.target.value })}
                      placeholder="90000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Interest Rate (%) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.interest_rate || ''}
                      onChange={(e) => setFormData({ ...formData, interest_rate: e.target.value })}
                      placeholder="6.5"
                      required={formData.owner_financing_available}
                    />
                  </div>
                  <div>
                    <Label>Term (Years) *</Label>
                    <Input
                      type="number"
                      value={formData.term_years || ''}
                      onChange={(e) => setFormData({ ...formData, term_years: e.target.value })}
                      placeholder="30"
                      required={formData.owner_financing_available}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-[#d4af37]/30">
                  <h4 className="font-semibold text-[#1e3a5f] mb-3">Additional Monthly Expenses</h4>
                  <p className="text-xs text-gray-600 mb-3">Help buyers understand the total monthly cost</p>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                      <Label>HOA ($/month)</Label>
                      <Input
                        type="number"
                        value={formData.hoa_monthly || ''}
                        onChange={(e) => setFormData({ ...formData, hoa_monthly: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <Label>Property Tax ($/year)</Label>
                      <Input
                        type="number"
                        value={formData.property_tax_annual || ''}
                        onChange={(e) => setFormData({ ...formData, property_tax_annual: e.target.value })}
                        placeholder="5000"
                      />
                    </div>
                    <div>
                      <Label>Insurance ($/year)</Label>
                      <Input
                        type="number"
                        value={formData.insurance_annual || ''}
                        onChange={(e) => setFormData({ ...formData, insurance_annual: e.target.value })}
                        placeholder="1200"
                      />
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4">
                    <Label className="mb-2 block">Other Monthly Expenses</Label>

                    {formData.other_monthly_expenses?.map((expense, index) => (
                      <div key={index} className="flex items-center gap-2 mb-2">
                        <span className="flex-1 text-sm">{expense.name}: ${expense.amount}/mo</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => removeOtherExpense(index)}
                          className="text-red-600"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}

                    <div className="flex gap-2 mt-3">
                      <Input
                        placeholder="Expense name"
                        value={newExpense.name}
                        onChange={(e) => setNewExpense({ ...newExpense, name: e.target.value })}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        placeholder="Amount"
                        value={newExpense.amount}
                        onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                        className="w-32"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={addOtherExpense}
                        disabled={!newExpense.name || !newExpense.amount}
                      >
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div>
          <Label>Location (Full Address) *</Label>
          <div className="flex gap-2">
            <Input
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="123 Main St, San Francisco, CA 94102"
              required
              className="flex-1"
            />
            <Button
              type="button"
              onClick={() => geocodeAddress()}
              disabled={geocoding || !formData.location.trim()}
            >
              {geocoding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Find on Map'}
            </Button>
          </div>
          {formData.latitude && formData.longitude && (
            <p className="text-xs text-green-600 mt-1">
              ✓ Location verified: {formData.latitude.toFixed(4)}, {formData.longitude.toFixed(4)}
            </p>
          )}
          <p className="text-xs text-gray-500 mt-1">
            We'll try to find an exact match, then broaden to city, then state if needed.
          </p>
        </div>

        {isProperty ? (
          <>
            <div>
              <Label>Property Type *</Label>
              <Select
                value={formData.property_type}
                onValueChange={(value) => setFormData({ ...formData, property_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single_family">Single Family</SelectItem>
                  <SelectItem value="condo">Condo</SelectItem>
                  <SelectItem value="townhouse">Townhouse</SelectItem>
                  <SelectItem value="multi_family">Multi-Family</SelectItem>
                  <SelectItem value="land">Land</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Bedrooms</Label>
                <Input
                  type="number"
                  value={formData.bedrooms}
                  onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                />
              </div>
              <div>
                <Label>Bathrooms</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={formData.bathrooms}
                  onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                />
              </div>
              <div>
                <Label>Sq Ft</Label>
                <Input
                  type="number"
                  value={formData.sqft}
                  onChange={(e) => setFormData({ ...formData, sqft: e.target.value })}
                />
              </div>
            </div>
          </>
        ) : (
          <div>
            <Label>Service Category *</Label>
            {availableServiceCategories.length > 0 ? (
              <Select
                value={formData.service_category}
                onValueChange={(value) => setFormData({ ...formData, service_category: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {availableServiceCategories.map(cat => {
                    // Find the service to get icon if available
                    const categoryFromDb = categories.find(c => c.name === cat);
                    const icon = categoryFromDb?.icon || '🔧'; // Default icon if not found
                    return (
                      <SelectItem key={cat} value={cat}>
                        {icon} {cat}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            ) : (
              <div className="p-3 bg-gray-100 rounded-lg text-sm text-gray-600">
                No service categories available. Please create a service listing first.
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Only categories from your service listings are shown
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Contact Phone {isServiceDeal && <span className="text-xs text-gray-500">(from profile)</span>}</Label>
            <Input
              type="tel"
              value={formData.contact_phone}
              onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              disabled={isServiceDeal}
              className={isServiceDeal ? 'bg-gray-100 cursor-not-allowed' : ''}
            />
          </div>
          <div>
            <Label>Contact Email {isServiceDeal && <span className="text-xs text-gray-500">(from profile)</span>}</Label>
            <Input
              type="email"
              value={formData.contact_email}
              onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
              disabled={isServiceDeal}
              className={isServiceDeal ? 'bg-gray-100 cursor-not-allowed' : ''}
            />
          </div>
        </div>

        {isServiceDeal && (
          <p className="text-xs text-gray-500">
            Contact information is automatically populated from your service listing and cannot be changed here. Update your service profile to change this information.
          </p>
        )}

        <div>
          <Label>Photos</Label>
          <div className="flex flex-wrap gap-2 mb-3">
            {formData.photo_urls.map((url, index) => (
              <div key={index} className="relative w-20 h-20">
                <img src={url} alt="" className="w-full h-full object-cover rounded-lg" />
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          <label className="cursor-pointer">
            <input
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
              disabled={uploading}
            />
            <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg text-sm">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              <span>{uploading ? 'Uploading...' : 'Upload Photos'}</span>
            </div>
          </label>
        </div>

        {/* QR Code Section for Airbnb Deals */}
        {isShortTermRent && (
          <div className="border-2 border-[#d4af37] rounded-lg p-6 bg-gradient-to-r from-[#d4af37]/5 to-[#d4af37]/10">
            <h4 className="font-semibold text-[#1e3a5f] mb-3 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#d4af37]" />
              Marketing QR Code
            </h4>
            <p className="text-sm text-gray-600 mb-4">
              Generate a QR code that links to your public listing. Share it with guests!
            </p>
            
            {formData.qr_code_url ? (
              <div className="text-center">
                <img 
                  src={formData.qr_code_url} 
                  alt="QR Code" 
                  className="w-48 h-48 mx-auto mb-3 border-2 border-gray-300 rounded-lg p-2 bg-white" 
                />
                <p className="text-xs text-gray-600 mb-3">
                  {formData.additional_services?.length > 0 
                    ? 'QR code links to your listing with services' 
                    : 'QR code links to your listing'}
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateQRCode}
                  disabled={generatingQR || !formData.location}
                  className="w-full"
                >
                  {generatingQR ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Regenerate QR Code
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-48 h-48 mx-auto mb-3 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                  <div className="text-center p-4">
                    <Sparkles className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">No QR code yet</p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="w-full bg-[#d4af37] hover:bg-[#c49d2a]"
                  onClick={handleGenerateQRCode}
                  disabled={generatingQR || !formData.location}
                >
                  {generatingQR ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Generate QR Code
                </Button>
                <p className="text-xs text-gray-500 mt-2">
                  {!formData.location ? 'Enter a location first' : 'Click to generate QR code'}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <Button
            type="submit"
            className="bg-[#1e3a5f] hover:bg-[#2a4a7f]"
            disabled={isServiceDeal && availableServiceCategories.length === 0}
          >
            {deal ? 'Update Deal' : 'Post Deal'}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
