import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Loader2, TrendingUp, TrendingDown, CheckCircle2, Eye, EyeOff, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function ReviewAndGenerate({ propertyData, componentData, onBack }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [marketRating, setMarketRating] = useState([5]);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState('');
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setEmail(currentUser.email);
        setFullName(currentUser.full_name || '');
      } catch (error) {
        // User not logged in
        setUser(null);
      }
      setLoadingUser(false);
    };
    loadUser();
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();

    // Validation only for non-logged-in users
    if (!user) {
      if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
      }

      if (password.length < 8) {
        alert('Password must be at least 8 characters');
        return;
      }
    }

    setGenerating(true);

    try {
      setProgress('Creating property record...');
      
      let rebuildCostPerSqft = 200;
      let landValue = 100000;
      
      try {
        const propertyEnrichment = await base44.integrations.Core.InvokeLLM({
          prompt: `For a ${propertyData.property_type} property at "${propertyData.address}" with ${propertyData.sqft} sqft built in ${propertyData.year_built || 2000}, provide realistic current rebuild cost per sqft and estimated land value. Return only numbers.`,
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
        console.log('Using default rebuild cost and land value');
      }

      if ((propertyData.property_type === 'condo' || propertyData.property_type === 'townhouse') && landValue === 0) {
        landValue = propertyData.sqft * 50;
      }

      setProgress('Generating AI-powered market insights...');
      
      const aiInsights = await base44.integrations.Core.InvokeLLM({
        prompt: `As an expert real estate analyst, provide comprehensive investment analysis for this property:
        
Property Details:
- Address: ${propertyData.address}
- Type: ${propertyData.property_type}
- Size: ${propertyData.sqft} sqft
- Built: ${propertyData.year_built || 'Unknown'}
- Bedrooms: ${propertyData.bedrooms || 'N/A'}
- Bathrooms: ${propertyData.bathrooms || 'N/A'}
- Market Rating: ${marketRating[0]}/10

Provide detailed analysis including:
1. Current market trends in this area
2. ROI projections (1-year, 5-year, 10-year as percentages)
3. Investment risks with severity levels
4. Investment opportunities
5. Top 3 comparable properties with addresses, prices, and similarity scores (0-100)
6. Key value drivers for this property
7. Top 5 maintenance priorities with estimated costs and urgency

Be realistic, data-driven, and specific to the location and property type.`,
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
                  severity: { type: 'string' },
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
                  urgency: { type: 'string' }
                }
              }
            }
          }
        },
        add_context_from_internet: true
      });

      const property = await base44.entities.Property.create({
        ...propertyData,
        user_email: email,
        user_phone: phone || user?.phone || '',
        market_rating: marketRating[0],
        rebuild_cost_per_sqft: rebuildCostPerSqft,
        land_value: landValue,
        ai_insights: aiInsights,
        status: 'processing'
      });

      setProgress('Analyzing components with AI...');
      
      const componentPromises = Object.entries(componentData).map(async ([type, data]) => {
        if (!data.photo_urls?.length && !data.serial_number) return null;

        try {
          const analysis = await base44.integrations.Core.InvokeLLM({
            prompt: `Analyze this ${type} component for a property built in ${propertyData.year_built || 2000}. 
Serial/Model: ${data.serial_number || 'Not provided'}

Provide realistic estimates for:
1. Installation year (if different from property year built)
2. Current condition (excellent/good/fair/poor)
3. Estimated remaining lifetime in years
4. Current replacement cost in USD
5. Current residual value in USD (based on age and condition)
6. Brief maintenance recommendations

Consider typical lifespans for ${type} components.`,
            response_json_schema: {
              type: 'object',
              properties: {
                installation_year: { type: 'number' },
                current_condition: { type: 'string', enum: ['excellent', 'good', 'fair', 'poor'] },
                estimated_lifetime_years: { type: 'number' },
                replacement_cost: { type: 'number' },
                residual_value: { type: 'number' },
                maintenance_notes: { type: 'string' }
              }
            },
            file_urls: data.photo_urls?.length > 0 ? data.photo_urls : undefined
          });

          return base44.entities.PropertyComponent.create({
            property_id: property.id,
            component_type: type,
            photo_urls: data.photo_urls || [],
            serial_number: data.serial_number || '',
            installation_year: analysis.installation_year || propertyData.year_built || 2000,
            current_condition: analysis.current_condition || 'good',
            estimated_lifetime_years: analysis.estimated_lifetime_years || 15,
            replacement_cost: analysis.replacement_cost || 5000,
            residual_value: analysis.residual_value || 2500,
            maintenance_notes: analysis.maintenance_notes || 'Regular maintenance recommended'
          });
        } catch (error) {
          console.error(`Error analyzing ${type}:`, error);
          return base44.entities.PropertyComponent.create({
            property_id: property.id,
            component_type: type,
            photo_urls: data.photo_urls || [],
            serial_number: data.serial_number || '',
            installation_year: propertyData.year_built || 2000,
            current_condition: 'good',
            estimated_lifetime_years: 15,
            replacement_cost: 5000,
            residual_value: 2500,
            maintenance_notes: 'Regular maintenance recommended'
          });
        }
      });

      const components = (await Promise.all(componentPromises)).filter(Boolean);

      setProgress('Calculating total asset value...');
      
      const totalResidualValue = components.reduce((sum, c) => sum + (c.residual_value || 0), 0);

      setProgress('Generating AI-enhanced inspection report...');
      
      const inspectionReportData = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a comprehensive professional property inspection report for:
Address: ${propertyData.address}
Built: ${propertyData.year_built || 'Unknown'}
Size: ${propertyData.sqft} sqft
Bedrooms: ${propertyData.bedrooms || 'N/A'}
Bathrooms: ${propertyData.bathrooms || 'N/A'}

Components analyzed: ${components.map(c => `${c.component_type} (${c.current_condition})`).join(', ')}

Create a detailed inspection report including:
- Executive summary
- Property overview
- Component-by-component assessment with specific findings
- Maintenance recommendations prioritized by urgency
- Overall property condition rating
- Inspector notes with actionable insights

Format as a professional, detailed report suitable for real estate transactions.`,
        response_json_schema: {
          type: 'object',
          properties: {
            executive_summary: { type: 'string' },
            property_overview: { type: 'string' },
            component_assessments: { type: 'array', items: { type: 'object' } },
            maintenance_recommendations: { type: 'string' },
            overall_rating: { type: 'string' },
            inspector_notes: { type: 'string' }
          }
        }
      });

      await base44.entities.Report.create({
        property_id: property.id,
        report_type: 'inspection',
        report_data: inspectionReportData,
        summary: inspectionReportData.executive_summary
      });

      setProgress('Generating AI-refined appraisal report...');
      
      const baseRebuildCost = propertyData.sqft * rebuildCostPerSqft;
      const marketAdjustment = ((marketRating[0] - 5) * 5) / 100;
      const appraisedValue = (baseRebuildCost + landValue + totalResidualValue) * (1 + marketAdjustment);

      const appraisalReportData = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a professional property appraisal report for:
Address: ${propertyData.address}

Valuation Components:
- Rebuild Cost: $${baseRebuildCost.toFixed(2)} (${propertyData.sqft} sqft × $${rebuildCostPerSqft}/sqft)
- ${propertyData.property_type === 'condo' || propertyData.property_type === 'townhouse' ? 'Shared Land/Common Area Value' : 'Land Value'}: $${landValue.toFixed(2)}
- Asset Residual Value: $${totalResidualValue.toFixed(2)}
- Market Adjustment: ${(marketAdjustment * 100).toFixed(1)}% (${marketRating[0]}/10 market rating)
- Final Appraised Value: $${appraisedValue.toFixed(2)}

AI Insights Available:
- Market Trends: ${aiInsights.market_trends}
- Comparable Properties: ${aiInsights.comparable_properties?.length || 0} similar properties analyzed

Create a detailed appraisal report explaining:
1. Valuation methodology
2. Market analysis with current trends
3. Comparable properties analysis
4. Investment potential
5. Risk factors

Be thorough and professional.`,
        response_json_schema: {
          type: 'object',
          properties: {
            appraised_value: { type: 'number' },
            rebuild_cost: { type: 'number' },
            land_value: { type: 'number' },
            asset_value: { type: 'number' },
            market_adjustment_percent: { type: 'number' },
            valuation_methodology: { type: 'string' },
            market_analysis: { type: 'string' },
            comparable_properties: { type: 'string' }
          }
        }
      });

      appraisalReportData.appraised_value = appraisedValue;
      appraisalReportData.rebuild_cost = baseRebuildCost;
      appraisalReportData.land_value = landValue;
      appraisalReportData.asset_residual_value = totalResidualValue;

      await base44.entities.Report.create({
        property_id: property.id,
        report_type: 'appraisal',
        report_data: appraisalReportData,
        summary: `Appraised Value: $${appraisedValue.toFixed(2)}`
      });

      await base44.entities.Property.update(property.id, {
        total_asset_residual_value: totalResidualValue,
        appraised_value: appraisedValue,
        status: 'completed'
      });

      setProgress('Success! Property digitized with AI-powered insights.');
      setCompleted(true);
      
      setTimeout(() => {
        if (user) {
          // Already logged in, go straight to dashboard
          navigate(createPageUrl('Dashboard'));
        } else {
          // Not logged in, redirect to login/signup
          const dashboardUrl = window.location.origin + createPageUrl('Dashboard');
          base44.auth.redirectToLogin(dashboardUrl);
        }
      }, 2000);

    } catch (error) {
      console.error('Generation error:', error);
      setProgress(`Error: ${error.message || 'Please try again.'}`);
      setTimeout(() => {
        setGenerating(false);
        setProgress('');
      }, 3000);
    }
  };

  if (loadingUser) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card className="p-12 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#1e3a5f] mx-auto" />
          <p className="text-gray-600 mt-4">Loading...</p>
        </Card>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="max-w-3xl mx-auto">
        <Card className="p-12 bg-white shadow-xl text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-[#1e3a5f] mb-4">Property Successfully Digitized!</h2>
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-[#d4af37]" />
            <span className="text-lg font-semibold text-[#d4af37]">Enhanced with AI Insights</span>
          </div>
          <p className="text-lg text-gray-700 mb-6">
            Your property at <strong>{propertyData.address}</strong> has been analyzed with AI-powered insights.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
            <p className="text-sm text-gray-700 mb-3">
              ✅ Property Analysis Complete<br/>
              ✅ AI Market Insights Generated<br/>
              ✅ ROI Projections Calculated<br/>
              ✅ Comparable Properties Identified
            </p>
            {!user && (
              <>
                <p className="text-sm text-gray-700 mb-2">
                  <strong>Next Step:</strong> Create your account to access your reports
                </p>
                <p className="text-xs text-gray-600">
                  Use the email and password you just entered: <strong>{email}</strong>
                </p>
              </>
            )}
            {user && (
              <p className="text-sm text-gray-700">
                <strong>Redirecting to your dashboard...</strong>
              </p>
            )}
          </div>
          <div className="flex items-center justify-center gap-2 text-[#1e3a5f]">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>{user ? 'Redirecting to dashboard...' : 'Redirecting to sign up...'}</span>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Card className="p-8 bg-white shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-2xl font-bold text-[#1e3a5f]">
            {user ? 'Review & Generate Reports' : 'Review & Create Account'}
          </h2>
          <Badge className="bg-gradient-to-r from-[#d4af37] to-[#c49d2a] text-white flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            AI-Powered
          </Badge>
        </div>
        <p className="text-gray-600 mb-6">
          {user ? 'Review your property details and generate AI-enhanced analysis' : 'Complete your property digitization with AI-enhanced analysis'}
        </p>

        <div className="space-y-6 mb-8">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-[#1e3a5f] mb-2">Property Summary</h3>
            <p className="text-sm text-gray-600">{propertyData.address}</p>
            <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
              <span>Size: {propertyData.sqft} sqft</span>
              <span>Lot: {propertyData.lot_size} sqft</span>
              {propertyData.bedrooms && <span>Beds: {propertyData.bedrooms}</span>}
              {propertyData.bathrooms && <span>Baths: {propertyData.bathrooms}</span>}
            </div>
          </div>

          <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-[#d4af37]" />
              <h3 className="font-semibold text-[#1e3a5f]">AI-Powered Analysis Includes:</h3>
            </div>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Market trends and investment analysis</li>
              <li>• ROI projections (1, 5, and 10 year)</li>
              <li>• Investment risk assessment</li>
              <li>• Comparable properties identification</li>
              <li>• Value drivers analysis</li>
              <li>• Maintenance priority recommendations</li>
            </ul>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-[#1e3a5f] mb-2">Components Uploaded</h3>
            <p className="text-sm text-gray-600">
              {Object.keys(componentData).length} component categories documented
            </p>
          </div>
        </div>

        <form onSubmit={handleGenerate} className="space-y-6">
          {!user && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-[#1e3a5f] mb-3">Create Your Account</h3>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    required
                    disabled={generating}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    disabled={generating}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    disabled={generating}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      required
                      disabled={generating}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      required
                      disabled={generating}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {user && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-green-900 mb-1">Logged in as {user.full_name || user.email}</h3>
                  <p className="text-sm text-green-700">Your property will be added to your dashboard</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Label>Market Condition (0 = Buyer's Market, 10 = Seller's Market)</Label>
            <div className="flex items-center gap-4">
              <TrendingDown className="w-5 h-5 text-blue-500" />
              <Slider
                value={marketRating}
                onValueChange={setMarketRating}
                max={10}
                step={1}
                className="flex-1"
                disabled={generating}
              />
              <TrendingUp className="w-5 h-5 text-green-500" />
              <span className="font-bold text-lg w-8 text-center">{marketRating[0]}</span>
            </div>
            <p className="text-sm text-gray-500">
              Market adjustment: {((marketRating[0] - 5) * 5)}%
            </p>
          </div>

          {generating && (
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <Loader2 className="w-5 h-5 animate-spin text-[#1e3a5f]" />
                <span className="font-medium text-[#1e3a5f]">Processing with AI...</span>
              </div>
              <p className="text-sm text-gray-600">{progress}</p>
            </div>
          )}

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              disabled={generating}
              className="flex-1 h-12 border-2 border-[#1e3a5f] text-[#1e3a5f]"
            >
              Back
            </Button>
            <Button
              type="submit"
              disabled={generating}
              className="flex-1 h-12 bg-gradient-to-r from-[#d4af37] to-[#c49d2a] hover:from-[#c49d2a] hover:to-[#b38c1f] text-white font-semibold"
            >
              {generating ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  Generate AI-Powered Reports
                </span>
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}