
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Loader2, AlertTriangle, Sparkles, TrendingUp, TrendingDown, Shield, Home as HomeIcon, Target, AlertCircle, CheckCircle2, RefreshCw, DollarSign, Send } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import Navigation from '../components/Navigation';

export const isPublic = true;

export default function PropertyDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get('id');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({});
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  
  // AI Revaluation state
  const [showRevaluationDialog, setShowRevaluationDialog] = useState(false);
  const [revaluating, setRevaluating] = useState(false);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [newMarketRating, setNewMarketRating] = useState([5]);
  const [revaluationProgress, setRevaluationProgress] = useState('');

  // Request quote state
  const [requestingQuote, setRequestingQuote] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        // User not logged in - can still view
      }
      setLoadingUser(false);
    };
    loadUser();
  }, []);

  const { data: property, isLoading, refetch } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: async () => {
      const props = await base44.entities.Property.filter({ id: propertyId });
      return props[0];
    },
    enabled: !!propertyId
  });

  const { data: components } = useQuery({
    queryKey: ['components', propertyId],
    queryFn: () => base44.entities.PropertyComponent.filter({ property_id: propertyId }),
    enabled: !!propertyId,
    initialData: []
  });

  useEffect(() => {
    if (property) {
      setFormData(property);
      setNewMarketRating([property.market_rating || 5]);
    }
  }, [property]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.Property.update(propertyId, formData);
      await refetch();
      setEditing(false);
    } catch (error) {
      console.error('Error saving:', error);
    }
    setSaving(false);
  };

  // This mutation is no longer used in handleRequestQuote, but kept as per original code.
  const createMaintenanceTaskMutation = useMutation({
    mutationFn: (taskData) => base44.entities.MaintenanceTask.create(taskData),
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
      navigate(createPageUrl(`Maintenance?propertyId=${propertyId}`));
    }
  });

  const handleRequestQuote = async (maintenanceItem) => {
    if (!user) {
      alert('Please log in to request a service quote.');
      const propertyDetailsUrl = window.location.origin + window.location.pathname + window.location.search;
      base44.auth.redirectToLogin(propertyDetailsUrl);
      return;
    }

    setRequestingQuote(maintenanceItem.item);

    try {
      // Map maintenance priority to component type and project type
      const itemLower = maintenanceItem.item.toLowerCase();
      let componentType = 'other';
      let projectType = 'repair';

      // Determine component type from the maintenance item description
      if (itemLower.includes('roof')) componentType = 'roof';
      else if (itemLower.includes('hvac') || itemLower.includes('heating') || itemLower.includes('cooling') || itemLower.includes('air condition')) componentType = 'hvac';
      else if (itemLower.includes('plumb') || itemLower.includes('pipe') || itemLower.includes('water')) componentType = 'plumbing';
      else if (itemLower.includes('electric') || itemLower.includes('wiring')) componentType = 'electrical';
      else if (itemLower.includes('window') || itemLower.includes('door')) componentType = 'windows';
      else if (itemLower.includes('floor')) componentType = 'flooring';
      else if (itemLower.includes('paint')) componentType = 'painting';
      else if (itemLower.includes('appliance')) componentType = 'appliances';
      else if (itemLower.includes('foundation') || itemLower.includes('structural')) componentType = 'foundation';
      else if (itemLower.includes('insulation')) componentType = 'insulation';

      // Determine project type
      if (itemLower.includes('replace') || itemLower.includes('replacement')) projectType = 'replace';
      else if (itemLower.includes('install')) projectType = 'install';
      else if (itemLower.includes('inspect')) projectType = 'inspect';
      else if (itemLower.includes('fix') || itemLower.includes('repair')) projectType = 'repair';

      // Map urgency to maintenance task urgency
      const urgencyMap = {
        'high': 'urgent',
        'medium': 'medium',
        'low': 'low'
      };

      const budgetRange = maintenanceItem.estimated_cost 
        ? `${Math.floor(maintenanceItem.estimated_cost * 0.8)}-${Math.ceil(maintenanceItem.estimated_cost * 1.2)}` 
        : '';

      // Build pre-filled data as URL parameters
      const taskData = {
        project_title: maintenanceItem.item,
        project_description: `AI-Recommended Priority: ${maintenanceItem.priority}\n\nThis maintenance task was automatically created based on AI analysis of your property. Please review and add any additional details before requesting quotes from service providers.`,
        project_type: projectType,
        component_type: componentType,
        urgency: urgencyMap[maintenanceItem.urgency] || 'medium',
        budget_range: budgetRange,
        estimated_cost: maintenanceItem.estimated_cost || 0,
        ai_generated: 'true' // Flag to indicate this is AI-generated
      };

      // Navigate to Maintenance page with pre-filled data
      const params = new URLSearchParams({
        propertyId: propertyId,
        prefill: JSON.stringify(taskData)
      });
      
      navigate(createPageUrl(`Maintenance?${params.toString()}`));

    } catch (error) {
      console.error('Error preparing maintenance task:', error);
      alert('Failed to prepare maintenance request. Please try again.');
    } finally {
      setRequestingQuote(null);
    }
  };

  const handleRevaluation = async () => {
    setRevaluating(true);
    
    try {
      setRevaluationProgress('Analyzing property with new information...');
      
      // Get rebuild cost and land value
      let rebuildCostPerSqft = property.rebuild_cost_per_sqft || 200;
      let landValue = property.land_value || 100000;
      
      try {
        const propertyEnrichment = await base44.integrations.Core.InvokeLLM({
          prompt: `For a ${property.property_type} property at "${property.address}" with ${property.sqft} sqft built in ${property.year_built || 2000}, provide updated realistic current rebuild cost per sqft and estimated land value considering current market conditions.
          
Additional Context: ${additionalInfo}

Return only numbers.`,
          response_json_schema: {
            type: 'object',
            properties: {
              rebuild_cost_per_sqft: { type: 'number' },
              land_value: { type: 'number' }
            }
          },
          add_context_from_internet: true
        });

        if (propertyEnrichment?.rebuild_cost_per_sqft) {
          rebuildCostPerSqft = propertyEnrichment.rebuild_cost_per_sqft;
        }
        if (propertyEnrichment?.land_value) {
          landValue = propertyEnrichment.land_value;
        }
      } catch (error) {
        console.log('Using existing rebuild cost and land value', error);
      }

      setRevaluationProgress('Generating updated AI insights...');
      
      // Generate new AI insights with additional context
      const aiInsights = await base44.integrations.Core.InvokeLLM({
        prompt: `As an expert real estate analyst, provide updated comprehensive investment analysis for this property with new information:
        
Property Details:
- Address: ${property.address}
- Type: ${property.property_type}
- Size: ${property.sqft} sqft
- Built: ${property.year_built || 'Unknown'}
- Bedrooms: ${property.bedrooms || 'N/A'}
- Bathrooms: ${property.bathrooms || 'N/A'}
- Market Rating: ${newMarketRating[0]}/10

Additional Information Provided by Owner:
${additionalInfo}

Previous Analysis Available for Reference:
${property.ai_insights ? JSON.stringify(property.ai_insights, null, 2) : 'None'}

Provide UPDATED detailed analysis including:
1. Current market trends in this area (consider the additional information)
2. Updated ROI projections (1-year, 5-year, 10-year as percentages)
3. Updated investment risks with severity levels (low, medium, high)
4. New investment opportunities based on the additional information
5. Updated top 3 comparable properties with addresses, prices, and similarity scores (0-100)
6. Key value drivers for this property (including new information)
7. Updated top 5 maintenance priorities with estimated costs and urgency (low, medium, high)

Be realistic, data-driven, and incorporate the additional information provided.`,
        response_json_schema: {
          type: 'object',
          properties: {
            market_trends: { type: 'string' },
            roi_projection: {
              type: 'object',
              properties: {
                one_year: { type: 'number' },
                five_year: { type: 'number' },
                ten_year: { type: 'number' }
              }
            },
            investment_risks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  risk_type: { type: 'string' },
                  severity: { type: 'string', enum: ['low', 'medium', 'high'] },
                  description: { type: 'string' }
                }
              }
            },
            investment_opportunities: {
              type: 'array',
              items: { type: 'string' }
            },
            comparable_properties: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  address: { type: 'string' },
                  price: { type: 'number' },
                  sqft: { type: 'number' },
                  similarity_score: { type: 'number' }
                }
              }
            },
            value_drivers: {
              type: 'array',
              items: { type: 'string' }
            },
            maintenance_priorities: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  priority: { type: 'string' },
                  item: { type: 'string' },
                  estimated_cost: { type: 'number' },
                  urgency: { type: 'string', enum: ['low', 'medium', 'high'] }
                }
              }
            }
          },
          required: ['market_trends', 'roi_projection', 'investment_risks', 'investment_opportunities', 'comparable_properties', 'value_drivers', 'maintenance_priorities']
        },
        add_context_from_internet: true
      });

      setRevaluationProgress('Calculating updated property valuation...');
      
      // Calculate new appraised value
      const totalResidualValue = components.reduce((sum, c) => sum + (c.residual_value || 0), 0);
      const baseRebuildCost = property.sqft * rebuildCostPerSqft;
      const marketAdjustment = ((newMarketRating[0] - 5) * 0.05); // Adjust by 5% per point difference from 5
      const newAppraisedValue = (baseRebuildCost + landValue + totalResidualValue) * (1 + marketAdjustment);

      setRevaluationProgress('Generating updated appraisal report...');
      
      // Generate new appraisal report
      const appraisalReportData = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate an UPDATED professional property appraisal report for:
Address: ${property.address}

Updated Valuation Components:
- Rebuild Cost: $${baseRebuildCost.toFixed(2)} (${property.sqft} sqft × $${rebuildCostPerSqft}/sqft)
- ${property.property_type === 'condo' || property.property_type === 'townhouse' ? 'Shared Land/Common Area Value' : 'Land Value'}: $${landValue.toFixed(2)}
- Asset Residual Value: $${totalResidualValue.toFixed(2)}
- Market Adjustment: ${(marketAdjustment * 100).toFixed(1)}% (${newMarketRating[0]}/10 market rating)
- Final Appraised Value: $${newAppraisedValue.toFixed(2)}

Previous Appraised Value: $${property.appraised_value?.toFixed(2) || 'N/A'}
Change: ${property.appraised_value ? (((newAppraisedValue - property.appraised_value) / property.appraised_value * 100)).toFixed(2) : 'N/A'}%

Additional Context Considered:
${additionalInfo}

Updated AI Insights:
- Market Trends: ${aiInsights.market_trends}
- Comparable Properties: ${aiInsights.comparable_properties?.length || 0} similar properties analyzed

Create a detailed UPDATED appraisal report explaining:
1. Valuation methodology
2. Market analysis with current trends
3. Comparable properties analysis
4. Investment potential
5. Risk factors
6. Impact of the additional information on valuation

Be thorough and professional, highlighting what changed and why.`,
        response_json_schema: {
          type: 'object',
          properties: {
            appraised_value: { type: 'number' },
            rebuild_cost: { type: 'number' },
            land_value: { type: 'number' },
            asset_residual_value: { type: 'number' },
            market_adjustment_percent: { type: 'number' },
            valuation_methodology: { type: 'string' },
            market_analysis: { type: 'string' },
            comparable_properties_summary: { type: 'string' },
            investment_potential: { type: 'string' },
            risk_factors: { type: 'string' },
            changes_summary: { type: 'string' }
          },
          required: ['valuation_methodology', 'market_analysis', 'comparable_properties_summary', 'investment_potential', 'risk_factors', 'changes_summary']
        }
      });

      appraisalReportData.appraised_value = newAppraisedValue;
      appraisalReportData.rebuild_cost = baseRebuildCost;
      appraisalReportData.land_value = landValue;
      appraisalReportData.asset_residual_value = totalResidualValue;

      // Get existing reports
      const reports = await base44.entities.Report.filter({ property_id: propertyId });
      const existingAppraisalReport = reports.find(r => r.report_type === 'appraisal');

      if (existingAppraisalReport) {
        // Update existing appraisal report
        await base44.entities.Report.update(existingAppraisalReport.id, {
          report_data: appraisalReportData,
          summary: `Updated Appraised Value: $${newAppraisedValue.toFixed(2)}`
        });
      } else {
        // Create new appraisal report
        await base44.entities.Report.create({
          property_id: propertyId,
          report_type: 'appraisal',
          report_data: appraisalReportData,
          summary: `Appraised Value: $${newAppraisedValue.toFixed(2)}`
        });
      }

      setRevaluationProgress('Updating property records...');
      
      // Update property with new values
      await base44.entities.Property.update(propertyId, {
        rebuild_cost_per_sqft: rebuildCostPerSqft,
        land_value: landValue,
        market_rating: newMarketRating[0],
        appraised_value: newAppraisedValue,
        ai_insights: aiInsights
      });

      setRevaluationProgress('Success! Property revalued with AI insights.');
      
      // Refresh data
      await refetch();
      
      setTimeout(() => {
        setRevaluating(false);
        setShowRevaluationDialog(false);
        setAdditionalInfo('');
        setRevaluationProgress('');
      }, 2000);

    } catch (error) {
      console.error('Revaluation error:', error);
      setRevaluationProgress(`Error: ${error.message || 'An unexpected error occurred. Please try again.'}`);
      setTimeout(() => {
        setRevaluating(false);
        setRevaluationProgress('');
      }, 3000);
    }
  };

  const isOwner = user && property && user.email === property.user_email;
  const isAdmin = user && user.role === 'admin';
  const canEdit = isOwner || isAdmin;
  const hasAIInsights = property?.ai_insights && Object.keys(property.ai_insights).length > 0;

  const getRiskColor = (severity) => {
    const colors = {
      low: 'bg-green-100 text-green-800 border-green-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      high: 'bg-red-100 text-red-800 border-red-200'
    };
    return colors[severity] || colors.medium;
  };

  if (loadingUser || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <Navigation user={user} />
        <div className="py-12 px-4">
          <div className="max-w-2xl mx-auto">
            <Card className="p-12 text-center">
              <AlertTriangle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Property Not Found</h2>
              <Link to={createPageUrl('Landing')}>
                <Button className="bg-[#1e3a5f] hover:bg-[#2a4a7f]">
                  Go to Home
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <Navigation user={user} />
      
      <div className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Link to={createPageUrl(user ? 'Dashboard' : 'Landing')}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-[#1e3a5f]">Property Details</h1>
                {hasAIInsights && (
                  <Badge className="bg-gradient-to-r from-[#d4af37] to-[#c49d2a] text-white">
                    <Sparkles className="w-3 h-3 mr-1" />
                    AI Enhanced
                  </Badge>
                )}
                {property?.property_classification && (
                  <Badge variant="outline" className="capitalize">
                    {property.property_classification}
                  </Badge>
                )}
              </div>
              <p className="text-gray-600">{property?.address}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {canEdit && (
                <Link to={createPageUrl(`Accounting?propertyId=${propertyId}`)}>
                  <Button variant="outline" className="bg-white">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Accounting
                  </Button>
                </Link>
              )}
              
              {canEdit && hasAIInsights && (
                <Dialog open={showRevaluationDialog} onOpenChange={setShowRevaluationDialog}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-[#d4af37] to-[#c49d2a] hover:from-[#c49d2a] hover:to-[#b38c1f]">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      AI Revaluation
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-[#d4af37]" />
                        AI-Powered Property Revaluation
                      </DialogTitle>
                      <DialogDescription>
                        Provide additional information to get an updated AI analysis and property valuation
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="additionalInfo">Additional Information</Label>
                        <Textarea
                          id="additionalInfo"
                          value={additionalInfo}
                          onChange={(e) => setAdditionalInfo(e.target.value)}
                          placeholder="E.g., Recent renovations (new kitchen $50k), neighborhood improvements, market changes, property upgrades, nearby developments, etc."
                          rows={6}
                          disabled={revaluating}
                        />
                        <p className="text-sm text-gray-500">
                          Share any updates like renovations, market changes, or property improvements
                        </p>
                      </div>

                      <div className="space-y-3">
                        <Label>Updated Market Condition (0 = Buyer's Market, 10 = Seller's Market)</Label>
                        <div className="flex items-center gap-4">
                          <TrendingDown className="w-5 h-5 text-blue-500" />
                          <Slider
                            value={newMarketRating}
                            onValueChange={setNewMarketRating}
                            max={10}
                            step={1}
                            className="flex-1"
                            disabled={revaluating}
                          />
                          <TrendingUp className="w-5 h-5 text-green-500" />
                          <span className="font-bold text-lg w-8 text-center">{newMarketRating[0]}</span>
                        </div>
                        <p className="text-sm text-gray-500">
                          Current: {property.market_rating}/10 → New: {newMarketRating[0]}/10
                        </p>
                      </div>

                      {revaluating && (
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <div className="flex items-center gap-3 mb-2">
                            <Loader2 className="w-5 h-5 animate-spin text-[#1e3a5f]" />
                            <span className="font-medium text-[#1e3a5f]">Processing with AI...</span>
                          </div>
                          <p className="text-sm text-gray-600">{revaluationProgress}</p>
                        </div>
                      )}

                      <div className="flex gap-3 justify-end">
                        <Button
                          variant="outline"
                          onClick={() => setShowRevaluationDialog(false)}
                          disabled={revaluating}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleRevaluation}
                          disabled={revaluating || !additionalInfo.trim()}
                          className="bg-gradient-to-r from-[#d4af37] to-[#c49d2a] hover:from-[#c49d2a] hover:to-[#b38c1f]"
                        >
                          {revaluating ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 mr-2" />
                              Generate New Valuation
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              
              {canEdit && (
                !editing ? (
                  <Button onClick={() => setEditing(true)} className="bg-[#1e3a5f] hover:bg-[#2a4a7f]">
                    Edit Property
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={saving} className="bg-[#d4af37] hover:bg-[#c49d2a]">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                      Save Changes
                    </Button>
                  </>
                )
              )}
            </div>
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="components">Components</TabsTrigger>
              {hasAIInsights && (
                <TabsTrigger value="ai-insights" className="relative">
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI Insights
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="overview">
              <div className="grid lg:grid-cols-2 gap-6">
                <Card className="p-6">
                  <h2 className="text-xl font-bold text-[#1e3a5f] mb-4">Property Information</h2>
                  <div className="space-y-4">
                    <div>
                      <Label>Address</Label>
                      {editing ? (
                        <Input
                          value={formData.address || ''}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        />
                      ) : (
                        <p className="text-gray-900 font-medium">{property?.address}</p>
                      )}
                    </div>

                    {editing && (
                      <div>
                        <Label>Property Classification</Label>
                        <Select
                          value={formData.property_classification || 'primary'}
                          onValueChange={(value) => setFormData({ ...formData, property_classification: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select classification" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="primary">Primary Residence</SelectItem>
                            <SelectItem value="rental">Rental Property</SelectItem>
                            <SelectItem value="secondary">Secondary Home</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Square Footage</Label>
                        {editing ? (
                          <Input
                            type="number"
                            value={formData.sqft || ''}
                            onChange={(e) => setFormData({ ...formData, sqft: parseFloat(e.target.value) })}
                          />
                        ) : (
                          <p className="text-gray-900 font-medium">{property?.sqft}</p>
                        )}
                      </div>
                      <div>
                        <Label>Lot Size</Label>
                        {editing ? (
                          <Input
                            type="number"
                            value={formData.lot_size || ''}
                            onChange={(e) => setFormData({ ...formData, lot_size: parseFloat(e.target.value) })}
                          />
                        ) : (
                          <p className="text-gray-900 font-medium">{property?.lot_size}</p>
                        )}
                      </div>
                      <div>
                        <Label>Bedrooms</Label>
                        {editing ? (
                          <Input
                            type="number"
                            value={formData.bedrooms || ''}
                            onChange={(e) => setFormData({ ...formData, bedrooms: parseFloat(e.target.value) })}
                          />
                        ) : (
                          <p className="text-gray-900 font-medium">{property?.bedrooms}</p>
                        )}
                      </div>
                      <div>
                        <Label>Bathrooms</Label>
                        {editing ? (
                          <Input
                            type="number"
                            value={formData.bathrooms || ''}
                            onChange={(e) => setFormData({ ...formData, bathrooms: parseFloat(e.target.value) })}
                          />
                        ) : (
                          <p className="text-gray-900 font-medium">{property?.bathrooms}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>

                <Card className="p-6">
                  <h2 className="text-xl font-bold text-[#1e3a5f] mb-4">Valuation</h2>
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-[#d4af37]/10 to-[#d4af37]/5 rounded-lg p-4">
                      <Label className="text-sm">Appraised Value</Label>
                      <p className="text-3xl font-bold text-[#1e3a5f]">
                        ${property?.appraised_value?.toLocaleString()}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <Label className="text-xs">Rebuild Cost/sqft</Label>
                        <p className="text-lg font-semibold text-[#1e3a5f]">
                          ${property?.rebuild_cost_per_sqft}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <Label className="text-xs">Land Value</Label>
                        <p className="text-lg font-semibold text-[#1e3a5f]">
                          ${property?.land_value?.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <Label className="text-xs">Asset Value</Label>
                        <p className="text-lg font-semibold text-[#1e3a5f]">
                          ${property?.total_asset_residual_value?.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <Label className="text-xs">Market Rating</Label>
                        <p className="text-lg font-semibold text-[#1e3a5f]">
                          {property?.market_rating}/10
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="components">
              <Card className="p-6">
                <h2 className="text-xl font-bold text-[#1e3a5f] mb-4">Property Components</h2>
                {components.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No components documented yet</p>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {components.map((component) => (
                      <Card key={component.id} className="p-4 border-2 border-gray-100">
                        <h3 className="font-semibold text-[#1e3a5f] mb-2 capitalize">
                          {component.component_type.replace('_', ' ')}
                        </h3>
                        {component.photo_urls?.length > 0 && (
                          <div className="flex gap-2 mb-3 overflow-x-auto">
                            {component.photo_urls.map((url, idx) => (
                              <img
                                key={idx}
                                src={url}
                                alt=""
                                className="w-20 h-20 object-cover rounded"
                              />
                            ))}
                          </div>
                        )}
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Condition:</span>
                            <span className="font-medium capitalize">{component.current_condition}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Lifetime:</span>
                            <span className="font-medium">{component.estimated_lifetime_years} years</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Value:</span>
                            <span className="font-medium">${component.residual_value?.toLocaleString()}</span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            {hasAIInsights && (
              <TabsContent value="ai-insights" className="space-y-6">
                {/* ROI Projections */}
                {property.ai_insights.roi_projection && (
                  <Card className="p-6 bg-gradient-to-r from-green-50 to-blue-50">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-[#1e3a5f]">ROI Projections</h2>
                        <p className="text-sm text-gray-600">AI-powered investment return estimates</p>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="bg-white rounded-lg p-4 text-center">
                        <p className="text-sm text-gray-600 mb-1">1 Year Projection</p>
                        <p className="text-3xl font-bold text-green-600">
                          +{property.ai_insights.roi_projection.one_year}%
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-4 text-center">
                        <p className="text-sm text-gray-600 mb-1">5 Year Projection</p>
                        <p className="text-3xl font-bold text-green-600">
                          +{property.ai_insights.roi_projection.five_year}%
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-4 text-center">
                        <p className="text-sm text-gray-600 mb-1">10 Year Projection</p>
                        <p className="text-3xl font-bold text-green-600">
                          +{property.ai_insights.roi_projection.ten_year}%
                        </p>
                      </div>
                    </div>
                  </Card>
                )}

                {/* Market Trends */}
                {property.ai_insights.market_trends && (
                  <Card className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                        <Target className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-[#1e3a5f]">Market Trends</h2>
                        <p className="text-sm text-gray-600">Current market analysis for your area</p>
                      </div>
                    </div>
                    <p className="text-gray-700 leading-relaxed">{property.ai_insights.market_trends}</p>
                  </Card>
                )}

                {/* Investment Risks */}
                {property.ai_insights.investment_risks?.length > 0 && (
                  <Card className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center">
                        <Shield className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-[#1e3a5f]">Investment Risks</h2>
                        <p className="text-sm text-gray-600">Potential risks to consider</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {property.ai_insights.investment_risks.map((risk, idx) => (
                        <div key={idx} className={`p-4 rounded-lg border-2 ${getRiskColor(risk.severity)}`}>
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold">{risk.risk_type}</h3>
                            <Badge className={getRiskColor(risk.severity)}>
                              {risk.severity}
                            </Badge>
                          </div>
                          <p className="text-sm">{risk.description}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Investment Opportunities */}
                {property.ai_insights.investment_opportunities?.length > 0 && (
                  <Card className="p-6 bg-gradient-to-r from-purple-50 to-pink-50">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-[#1e3a5f]">Investment Opportunities</h2>
                        <p className="text-sm text-gray-600">Ways to increase property value</p>
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {property.ai_insights.investment_opportunities.map((opp, idx) => (
                        <li key={idx} className="flex items-start gap-2 bg-white rounded-lg p-3">
                          <CheckCircle2 className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">{opp}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}

                {/* Comparable Properties */}
                {property.ai_insights.comparable_properties?.length > 0 && (
                  <Card className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-[#d4af37] rounded-lg flex items-center justify-center">
                        <HomeIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-[#1e3a5f]">Comparable Properties</h2>
                        <p className="text-sm text-gray-600">Similar properties in your area</p>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      {property.ai_insights.comparable_properties.map((comp, idx) => (
                        <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                          <h3 className="font-semibold text-[#1e3a5f] mb-2">{comp.address}</h3>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Price:</span>
                              <span className="font-semibold">${comp.price?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Size:</span>
                              <span className="font-semibold">{comp.sqft} sqft</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Similarity:</span>
                              <span className="font-semibold">{comp.similarity_score}%</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Value Drivers */}
                {property.ai_insights.value_drivers?.length > 0 && (
                  <Card className="p-6 bg-gradient-to-r from-amber-50 to-yellow-50">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-amber-600 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-[#1e3a5f]">Key Value Drivers</h2>
                        <p className="text-sm text-gray-600">Factors that boost your property value</p>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-2">
                      {property.ai_insights.value_drivers.map((driver, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-white rounded-lg p-3">
                          <CheckCircle2 className="w-4 h-4 text-amber-600" />
                          <span className="text-sm text-gray-700">{driver}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Maintenance Priorities */}
                {property.ai_insights.maintenance_priorities?.length > 0 && (
                  <Card className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center">
                          <AlertCircle className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-[#1e3a5f]">Maintenance Priorities</h2>
                          <p className="text-sm text-gray-600">AI-recommended maintenance tasks</p>
                        </div>
                      </div>
                      {canEdit && (
                        <Link to={createPageUrl(`Maintenance?propertyId=${propertyId}`)}>
                          <Button variant="outline" size="sm">
                            View All Projects
                          </Button>
                        </Link>
                      )}
                    </div>
                    <div className="space-y-3">
                      {property.ai_insights.maintenance_priorities.map((item, idx) => (
                        <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <h3 className="font-semibold text-gray-900">{item.item}</h3>
                                <Badge variant="outline">{item.priority}</Badge>
                                <Badge className={
                                  item.urgency === 'high' ? 'bg-red-100 text-red-800' :
                                  item.urgency === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-green-100 text-green-800'
                                }>
                                  {item.urgency}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600">
                                Estimated Cost: <span className="font-semibold">${item.estimated_cost?.toLocaleString()}</span>
                              </p>
                            </div>
                            {canEdit && (
                              <Button
                                size="sm"
                                onClick={() => handleRequestQuote(item)}
                                disabled={requestingQuote === item.item}
                                className="bg-[#d4af37] hover:bg-[#c49d2a] flex-shrink-0"
                              >
                                {requestingQuote === item.item ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                    Preparing...
                                  </>
                                ) : (
                                  <>
                                    <Send className="w-4 h-4 mr-1" />
                                    Request Quote
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {canEdit && (
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-gray-700">
                          💡 <strong>Quick Action:</strong> Click "Request Quote" to automatically create a maintenance project with pre-filled details that you can review and edit before notifying service providers.
                        </p>
                      </div>
                    )}
                  </Card>
                )}
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
}
