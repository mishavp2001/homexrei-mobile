
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, Loader2, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import Navigation from '../components/Navigation';

export default function ReportViewer() {
  const urlParams = new URLSearchParams(window.location.search);
  const reportId = urlParams.get('id');
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error('Not authenticated', error); // Added error logging for debugging
      }
      setLoadingUser(false);
    };
    loadUser();
  }, []);

  const { data: report, isLoading } = useQuery({
    queryKey: ['report', reportId],
    queryFn: async () => {
      const reports = await base44.entities.Report.filter({ id: reportId });
      return reports[0];
    },
    enabled: !!reportId
  });

  const { data: property } = useQuery({
    queryKey: ['property', report?.property_id],
    queryFn: async () => {
      const props = await base44.entities.Property.filter({ id: report.property_id });
      return props[0];
    },
    enabled: !!report?.property_id
  });

  // Check if user is authorized
  const isOwner = user && property && user.email === property.user_email;
  const isAdmin = user && user.role === 'admin';
  const canView = isOwner || isAdmin;

  const getConditionBadge = (condition) => {
    const styles = {
      excellent: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
      good: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircle },
      fair: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: AlertTriangle },
      poor: { color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle }
    };
    
    const style = styles[condition?.toLowerCase()] || styles.good;
    const Icon = style.icon;
    
    return (
      <Badge className={`${style.color} border flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {condition}
      </Badge>
    );
  };

  if (loadingUser || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  // Access denied
  if (!canView) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <Navigation user={user} />
        <div className="py-12 px-4">
          <div className="max-w-2xl mx-auto">
            <Card className="p-12 text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-10 h-10 text-red-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Access Denied</h2>
              <p className="text-gray-600 mb-6">
                You don't have permission to view this report.
              </p>
              <Link to={createPageUrl('Dashboard')}>
                <Button className="bg-[#1e3a5f] hover:bg-[#2a4a7f]">
                  Go to Dashboard
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const isInspection = report?.report_type === 'inspection';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <Navigation user={user} />
      
      <div className="py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Link to={createPageUrl('Dashboard')}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-[#1e3a5f]">
                {isInspection ? 'Inspection Report' : 'Appraisal Report'}
              </h1>
              <p className="text-gray-600">{property?.address}</p>
            </div>
            <Button className="bg-[#d4af37] hover:bg-[#c49d2a]">
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
          </div>

          <Card className="p-8 bg-white shadow-xl">
            {isInspection ? (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold text-[#1e3a5f] mb-4">Executive Summary</h2>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {report.report_data?.executive_summary}
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-[#1e3a5f] mb-4">Property Overview</h2>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {report.report_data?.property_overview}
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-[#1e3a5f] mb-6">Component Assessments</h2>
                  <div className="grid gap-4">
                    {report.report_data?.component_assessments?.map((assessment, idx) => (
                      <Card key={idx} className="p-6 border-l-4 border-[#1e3a5f] hover:shadow-lg transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-[#1e3a5f] capitalize mb-2">
                              {assessment.component || assessment.type || `Component ${idx + 1}`}
                            </h3>
                            {assessment.condition && (
                              <div className="mb-3">
                                {getConditionBadge(assessment.condition)}
                              </div>
                            )}
                          </div>
                        </div>

                        {assessment.notes && (
                          <div className="mb-4">
                            <p className="text-sm font-medium text-gray-600 mb-1">Assessment Notes:</p>
                            <p className="text-gray-700 leading-relaxed">{assessment.notes}</p>
                          </div>
                        )}

                        {assessment.description && (
                          <div className="mb-4">
                            <p className="text-sm font-medium text-gray-600 mb-1">Description:</p>
                            <p className="text-gray-700">{assessment.description}</p>
                          </div>
                        )}

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100">
                          {assessment.age && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Age</p>
                              <p className="font-semibold text-gray-900">{assessment.age} years</p>
                            </div>
                          )}
                          {assessment.estimated_lifetime && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Lifetime</p>
                              <p className="font-semibold text-gray-900">{assessment.estimated_lifetime} years</p>
                            </div>
                          )}
                          {assessment.replacement_cost && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Replacement Cost</p>
                              <p className="font-semibold text-gray-900">${assessment.replacement_cost.toLocaleString()}</p>
                            </div>
                          )}
                          {assessment.residual_value && (
                            <div>
                              <p className="text-xs text-gray-500 mb-1">Current Value</p>
                              <p className="font-semibold text-gray-900">${assessment.residual_value.toLocaleString()}</p>
                            </div>
                          )}
                        </div>

                        {assessment.recommendations && (
                          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm font-medium text-blue-900 mb-1">Recommendations:</p>
                            <p className="text-sm text-blue-800">{assessment.recommendations}</p>
                          </div>
                        )}

                        {assessment.issues && assessment.issues.length > 0 && (
                          <div className="mt-4 p-3 bg-amber-50 rounded-lg">
                            <p className="text-sm font-medium text-amber-900 mb-2">Issues Found:</p>
                            <ul className="list-disc list-inside text-sm text-amber-800 space-y-1">
                              {assessment.issues.map((issue, i) => (
                                <li key={i}>{issue}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-[#1e3a5f] mb-4">Maintenance Recommendations</h2>
                  <Card className="p-6 bg-blue-50 border-blue-200">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {report.report_data?.maintenance_recommendations}
                    </p>
                  </Card>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-[#1e3a5f] mb-4">Overall Rating</h2>
                  <Card className="p-6 bg-gradient-to-r from-[#1e3a5f]/5 to-[#d4af37]/5">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {report.report_data?.overall_rating}
                    </p>
                  </Card>
                </div>

                {report.report_data?.inspector_notes && (
                  <div>
                    <h2 className="text-2xl font-bold text-[#1e3a5f] mb-4">Inspector Notes</h2>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {report.report_data?.inspector_notes}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-8">
                <div className="bg-gradient-to-r from-[#d4af37]/10 to-[#d4af37]/5 rounded-xl p-8 text-center">
                  <h2 className="text-lg text-gray-600 mb-2">Appraised Value</h2>
                  <p className="text-5xl font-bold text-[#1e3a5f]">
                    ${report.report_data?.appraised_value?.toLocaleString()}
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  <Card className="p-6 text-center border-2 border-gray-100 hover:border-[#1e3a5f] transition-colors">
                    <p className="text-sm text-gray-600 mb-2">Rebuild Cost</p>
                    <p className="text-2xl font-bold text-[#1e3a5f]">
                      ${report.report_data?.rebuild_cost?.toLocaleString()}
                    </p>
                  </Card>
                  <Card className="p-6 text-center border-2 border-gray-100 hover:border-[#1e3a5f] transition-colors">
                    <p className="text-sm text-gray-600 mb-2">Land Value</p>
                    <p className="text-2xl font-bold text-[#1e3a5f]">
                      ${report.report_data?.land_value?.toLocaleString()}
                    </p>
                  </Card>
                  <Card className="p-6 text-center border-2 border-gray-100 hover:border-[#1e3a5f] transition-colors">
                    <p className="text-sm text-gray-600 mb-2">Asset Value</p>
                    <p className="text-2xl font-bold text-[#1e3a5f]">
                      ${report.report_data?.asset_residual_value?.toLocaleString()}
                    </p>
                  </Card>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-[#1e3a5f] mb-4">Valuation Methodology</h2>
                  <Card className="p-6 bg-gray-50">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {report.report_data?.valuation_methodology}
                    </p>
                  </Card>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-[#1e3a5f] mb-4">Market Analysis</h2>
                  <Card className="p-6 bg-blue-50 border-blue-200">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {report.report_data?.market_analysis}
                    </p>
                  </Card>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-[#1e3a5f] mb-4">Comparable Properties</h2>
                  <Card className="p-6 bg-gray-50">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                      {report.report_data?.comparable_properties}
                    </p>
                  </Card>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
