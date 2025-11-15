import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Home, FileText, Wrench, ExternalLink, Sparkles, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function PropertyCard({ property, reports }) {
  const inspectionReport = reports?.find(r => r.report_type === 'inspection');
  const appraisalReport = reports?.find(r => r.report_type === 'appraisal');
  const hasAIInsights = property?.ai_insights && Object.keys(property.ai_insights).length > 0;

  return (
    <Card className="overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300">
      <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2a4a7f] p-6 text-white">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <Home className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold">{property.address}</h2>
                  {hasAIInsights && (
                    <Badge className="bg-[#d4af37] text-white border-none">
                      <Sparkles className="w-3 h-3 mr-1" />
                      AI
                    </Badge>
                  )}
                </div>
                <p className="text-white/80 text-sm">{property.sqft} sqft • {property.bedrooms} bed • {property.bathrooms} bath</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="bg-gradient-to-r from-[#d4af37]/10 to-[#d4af37]/5 rounded-xl p-6 mb-6">
          <p className="text-sm text-gray-600 mb-1">Appraised Value</p>
          <p className="text-4xl font-bold text-[#1e3a5f]">
            ${property.appraised_value?.toLocaleString() || 'Calculating...'}
          </p>
          {property.market_rating && (
            <p className="text-sm text-gray-600 mt-2">
              Market Rating: {property.market_rating}/10
            </p>
          )}
        </div>

        {hasAIInsights && property.ai_insights.roi_projection && (
          <div className="mb-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <h3 className="text-sm font-semibold text-gray-900">AI ROI Projection</h3>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-gray-600">1 Year</p>
                <p className="font-bold text-green-600">+{property.ai_insights.roi_projection.one_year}%</p>
              </div>
              <div>
                <p className="text-gray-600">5 Year</p>
                <p className="font-bold text-green-600">+{property.ai_insights.roi_projection.five_year}%</p>
              </div>
              <div>
                <p className="text-gray-600">10 Year</p>
                <p className="font-bold text-green-600">+{property.ai_insights.roi_projection.ten_year}%</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Rebuild Cost</p>
            <p className="text-lg font-semibold text-[#1e3a5f]">
              ${((property.sqft || 0) * (property.rebuild_cost_per_sqft || 0)).toLocaleString()}
            </p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">Asset Value</p>
            <p className="text-lg font-semibold text-[#1e3a5f]">
              ${property.total_asset_residual_value?.toLocaleString() || '0'}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <Link to={createPageUrl(`PropertyDetails?id=${property.id}`)}>
            <Button className="w-full bg-[#1e3a5f] hover:bg-[#2a4a7f] text-white justify-between">
              <span className="flex items-center gap-2">
                <Home className="w-4 h-4" />
                View Property Details
              </span>
              <ExternalLink className="w-4 h-4" />
            </Button>
          </Link>

          {inspectionReport && (
            <Link to={createPageUrl(`ReportViewer?id=${inspectionReport.id}`)}>
              <Button variant="outline" className="w-full justify-between border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white">
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Inspection Report
                </span>
                <ExternalLink className="w-4 h-4" />
              </Button>
            </Link>
          )}

          {appraisalReport && (
            <Link to={createPageUrl(`ReportViewer?id=${appraisalReport.id}`)}>
              <Button variant="outline" className="w-full justify-between border-[#d4af37] text-[#d4af37] hover:bg-[#d4af37] hover:text-white">
                <span className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Appraisal Report
                </span>
                <ExternalLink className="w-4 h-4" />
              </Button>
            </Link>
          )}

          <Link to={createPageUrl(`Maintenance?propertyId=${property.id}`)}>
            <Button variant="outline" className="w-full justify-between">
              <span className="flex items-center gap-2">
                <Wrench className="w-4 h-4" />
                Maintenance Schedule
              </span>
              <ExternalLink className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}