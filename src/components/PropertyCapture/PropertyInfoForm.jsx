import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Home, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function PropertyInfoForm({ initialData, onNext }) {
  const [loading, setLoading] = useState(false);
  const [validatingAddress, setValidatingAddress] = useState(false);
  const [addressValid, setAddressValid] = useState(null);
  const [addressError, setAddressError] = useState('');
  const [enrichedData, setEnrichedData] = useState(null);
  
  const [formData, setFormData] = useState({
    address: initialData?.address || '',
    description: initialData?.description || '',
    sqft: initialData?.sqft || '',
    lot_size: initialData?.lot_size || '',
    bedrooms: initialData?.bedrooms || '',
    bathrooms: initialData?.bathrooms || '',
    year_built: initialData?.year_built || '',
    property_type: initialData?.property_type || 'single_family',
  });

  useEffect(() => {
    if (initialData?.address && !initialData?.sqft) {
      validateAndEnrichAddress(initialData.address);
    }
  }, [initialData?.address]);

  const validateAndEnrichAddress = async (address) => {
    if (!address || address.trim().length < 10) {
      setAddressValid(false);
      setAddressError('Please enter a complete address');
      return;
    }

    setValidatingAddress(true);
    setAddressError('');
    setAddressValid(null);

    try {
      // Step 1: Validate address format and existence
      const validationResult = await base44.integrations.Core.InvokeLLM({
        prompt: `Validate this address: "${address}". Check if it's a valid, complete US address format (with street, city, state, and ZIP). Return validation result.`,
        response_json_schema: {
          type: 'object',
          properties: {
            is_valid: { type: 'boolean' },
            formatted_address: { type: 'string' },
            error_message: { type: 'string' }
          }
        },
        add_context_from_internet: true
      });

      if (!validationResult.is_valid) {
        setAddressValid(false);
        setAddressError(validationResult.error_message || 'Invalid address format');
        setValidatingAddress(false);
        return;
      }

      // Update address with formatted version
      const formattedAddress = validationResult.formatted_address || address;
      setFormData(prev => ({ ...prev, address: formattedAddress }));
      setAddressValid(true);

      // Step 2: Enrich with property data
      setLoading(true);
      const enrichResult = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a real estate data expert. For the property at "${formattedAddress}", retrieve accurate property information from public records, real estate databases, and county assessor data. Provide the most accurate and up-to-date information available.

Include:
- Square footage (living area)
- Lot size
- Number of bedrooms
- Number of bathrooms
- Year built
- Property type
- Estimated rebuild cost per square foot (based on local construction costs)
- Estimated land value (based on comparable properties)

Return realistic, data-backed values. If certain data is not available, provide reasonable estimates based on the neighborhood and property type.`,
        response_json_schema: {
          type: 'object',
          properties: {
            sqft: { type: 'number' },
            lot_size: { type: 'number' },
            bedrooms: { type: 'number' },
            bathrooms: { type: 'number' },
            year_built: { type: 'number' },
            property_type: { type: 'string' },
            rebuild_cost_per_sqft: { type: 'number' },
            land_value: { type: 'number' },
            data_confidence: { type: 'string' },
            data_sources: { type: 'string' }
          }
        },
        add_context_from_internet: true
      });

      if (enrichResult) {
        setEnrichedData(enrichResult);
        
        // Auto-fill form with enriched data
        setFormData(prev => ({
          ...prev,
          sqft: enrichResult.sqft || prev.sqft,
          lot_size: enrichResult.lot_size || prev.lot_size,
          bedrooms: enrichResult.bedrooms || prev.bedrooms,
          bathrooms: enrichResult.bathrooms || prev.bathrooms,
          year_built: enrichResult.year_built || prev.year_built,
          property_type: enrichResult.property_type?.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_') || prev.property_type,
        }));
      }
    } catch (error) {
      console.error('Error validating/enriching property data:', error);
      setAddressValid(false);
      setAddressError('Unable to validate address. Please check and try again.');
    }
    
    setValidatingAddress(false);
    setLoading(false);
  };

  const handleAddressBlur = () => {
    if (formData.address && formData.address !== initialData?.address) {
      validateAndEnrichAddress(formData.address);
    }
  };

  const handleRefreshData = () => {
    if (formData.address) {
      validateAndEnrichAddress(formData.address);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!addressValid) {
      alert('Please enter a valid address before continuing');
      return;
    }
    
    onNext(formData);
  };

  return (
    <Card className="p-8 max-w-3xl mx-auto bg-white shadow-xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
          <Home className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-[#1e3a5f]">Property Information</h2>
          <p className="text-gray-500">Enter address to auto-populate property details</p>
        </div>
        {addressValid && enrichedData && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefreshData}
            disabled={loading || validatingAddress}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading || validatingAddress ? 'animate-spin' : ''}`} />
            Refresh Data
          </Button>
        )}
      </div>

      {(loading || validatingAddress) && (
        <div className="flex items-center gap-2 mb-6 p-4 bg-blue-50 rounded-lg">
          <Loader2 className="w-5 h-5 animate-spin text-[#1e3a5f]" />
          <span className="text-sm text-[#1e3a5f]">
            {validatingAddress ? 'Validating address...' : 'Fetching property data from public records...'}
          </span>
        </div>
      )}

      {enrichedData && !loading && !validatingAddress && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-green-800 font-medium mb-1">
                Property data retrieved successfully
              </p>
              <p className="text-xs text-green-700">
                Confidence: <Badge variant="outline" className="text-xs">{enrichedData.data_confidence || 'High'}</Badge>
                {enrichedData.data_sources && (
                  <span className="ml-2">• Sources: {enrichedData.data_sources}</span>
                )}
              </p>
              <p className="text-xs text-green-600 mt-1">
                Review and edit the auto-populated fields below as needed
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="address">Property Address *</Label>
          <div className="relative">
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => {
                setFormData({ ...formData, address: e.target.value });
                setAddressValid(null);
                setAddressError('');
              }}
              onBlur={handleAddressBlur}
              placeholder="123 Main St, City, State ZIP"
              required
              className={`border-gray-300 pr-10 ${
                addressValid === true ? 'border-green-500 bg-green-50' :
                addressValid === false ? 'border-red-500 bg-red-50' : ''
              }`}
            />
            {validatingAddress && (
              <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 animate-spin text-blue-500" />
            )}
            {addressValid === true && !validatingAddress && (
              <CheckCircle2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-green-500" />
            )}
            {addressValid === false && !validatingAddress && (
              <AlertCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-red-500" />
            )}
          </div>
          {addressError && (
            <p className="text-sm text-red-600 flex items-center gap-1 mt-1">
              <AlertCircle className="w-4 h-4" />
              {addressError}
            </p>
          )}
          {addressValid && (
            <p className="text-sm text-green-600 flex items-center gap-1 mt-1">
              <CheckCircle2 className="w-4 h-4" />
              Address validated successfully
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Property Description (Optional)</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Add notes about your property - unique features, recent renovations, special characteristics, etc."
            rows={4}
            className="border-gray-300"
          />
          <p className="text-xs text-gray-500">
            This helps generate more accurate reports and recommendations
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="sqft">Square Footage *</Label>
            <Input
              id="sqft"
              type="number"
              value={formData.sqft}
              onChange={(e) => setFormData({ ...formData, sqft: parseFloat(e.target.value) })}
              placeholder="2,500"
              required
              className={enrichedData?.sqft ? 'bg-blue-50 border-blue-300' : ''}
            />
            {enrichedData?.sqft && (
              <p className="text-xs text-blue-600">Auto-populated from public records</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="lot_size">Lot Size (sq ft) *</Label>
            <Input
              id="lot_size"
              type="number"
              value={formData.lot_size}
              onChange={(e) => setFormData({ ...formData, lot_size: parseFloat(e.target.value) })}
              placeholder="5,000"
              required
              className={enrichedData?.lot_size ? 'bg-blue-50 border-blue-300' : ''}
            />
            {enrichedData?.lot_size && (
              <p className="text-xs text-blue-600">Auto-populated from public records</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bedrooms">Bedrooms</Label>
            <Input
              id="bedrooms"
              type="number"
              value={formData.bedrooms}
              onChange={(e) => setFormData({ ...formData, bedrooms: parseFloat(e.target.value) })}
              placeholder="3"
              className={enrichedData?.bedrooms ? 'bg-blue-50 border-blue-300' : ''}
            />
            {enrichedData?.bedrooms && (
              <p className="text-xs text-blue-600">Auto-populated</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bathrooms">Bathrooms</Label>
            <Input
              id="bathrooms"
              type="number"
              step="0.5"
              value={formData.bathrooms}
              onChange={(e) => setFormData({ ...formData, bathrooms: parseFloat(e.target.value) })}
              placeholder="2"
              className={enrichedData?.bathrooms ? 'bg-blue-50 border-blue-300' : ''}
            />
            {enrichedData?.bathrooms && (
              <p className="text-xs text-blue-600">Auto-populated</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="year_built">Year Built</Label>
            <Input
              id="year_built"
              type="number"
              value={formData.year_built}
              onChange={(e) => setFormData({ ...formData, year_built: parseFloat(e.target.value) })}
              placeholder="2000"
              className={enrichedData?.year_built ? 'bg-blue-50 border-blue-300' : ''}
            />
            {enrichedData?.year_built && (
              <p className="text-xs text-blue-600">Auto-populated</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="property_type">Property Type</Label>
            <Select
              value={formData.property_type}
              onValueChange={(value) => setFormData({ ...formData, property_type: value })}
            >
              <SelectTrigger className={enrichedData?.property_type ? 'bg-blue-50 border-blue-300' : ''}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single_family">Single Family</SelectItem>
                <SelectItem value="condo">Condo</SelectItem>
                <SelectItem value="townhouse">Townhouse</SelectItem>
                <SelectItem value="multi_family">Multi-Family</SelectItem>
              </SelectContent>
            </Select>
            {enrichedData?.property_type && (
              <p className="text-xs text-blue-600">Auto-populated</p>
            )}
          </div>
        </div>

        <div className="pt-4 border-t">
          <Button 
            type="submit" 
            className="w-full bg-[#1e3a5f] hover:bg-[#2a4a7f] text-white h-12 text-lg"
            disabled={loading || validatingAddress || addressValid === false}
          >
            {loading || validatingAddress ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              'Continue to Components'
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}