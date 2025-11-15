import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Video, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import Navigation from '../components/Navigation';

export default function AdminVideoGeneration() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [selectedDeals, setSelectedDeals] = useState([]);
  const [selectedInsights, setSelectedInsights] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (currentUser.role !== 'admin') {
          alert('Admin access required');
          window.location.href = '/';
          return;
        }
        setUser(currentUser);
      } catch (error) {
        alert('Please sign in as admin');
        base44.auth.redirectToLogin(window.location.href);
      }
      setLoadingAuth(false);
    };
    loadUser();
  }, []);

  const { data: deals, isLoading: loadingDeals } = useQuery({
    queryKey: ['allDeals'],
    queryFn: () => base44.entities.Deal.list('-created_date'),
    enabled: !!user,
    initialData: []
  });

  const { data: insights, isLoading: loadingInsights } = useQuery({
    queryKey: ['allInsights'],
    queryFn: () => base44.entities.Insight.list('-created_date'),
    enabled: !!user,
    initialData: []
  });

  const dealsWithPhotos = deals.filter(d => d.photo_urls && d.photo_urls.length > 0);
  const insightsWithPhotos = insights.filter(i => i.photo_urls && i.photo_urls.length > 0);

  const handleSelectAllDeals = (checked) => {
    if (checked) {
      setSelectedDeals(dealsWithPhotos.map(d => d.id));
    } else {
      setSelectedDeals([]);
    }
  };

  const handleSelectAllInsights = (checked) => {
    if (checked) {
      setSelectedInsights(insightsWithPhotos.map(i => i.id));
    } else {
      setSelectedInsights([]);
    }
  };

  const handleToggleDeal = (dealId) => {
    setSelectedDeals(prev => 
      prev.includes(dealId) 
        ? prev.filter(id => id !== dealId)
        : [...prev, dealId]
    );
  };

  const handleToggleInsight = (insightId) => {
    setSelectedInsights(prev => 
      prev.includes(insightId) 
        ? prev.filter(id => id !== insightId)
        : [...prev, insightId]
    );
  };

  const generateVideos = async () => {
    const totalItems = selectedDeals.length + selectedInsights.length;
    
    if (totalItems === 0) {
      alert('Please select at least one deal or insight');
      return;
    }

    const confirmed = confirm(`Generate videos for ${selectedDeals.length} deal(s) and ${selectedInsights.length} insight(s)?\n\nThis may take several minutes.`);
    if (!confirmed) return;

    setGenerating(true);
    setResults([]);
    setProgress({ current: 0, total: totalItems });

    const allResults = [];

    // Generate videos for deals
    for (const dealId of selectedDeals) {
      const deal = deals.find(d => d.id === dealId);
      try {
        const response = await base44.functions.invoke('generatePropertyVideo', { dealId });
        
        if (response.data?.success) {
          allResults.push({
            type: 'deal',
            id: dealId,
            title: deal.title,
            status: 'success',
            videoUrl: response.data.videoUrl
          });
        } else {
          allResults.push({
            type: 'deal',
            id: dealId,
            title: deal.title,
            status: 'error',
            error: response.data?.error || 'Failed to generate video'
          });
        }
      } catch (error) {
        allResults.push({
          type: 'deal',
          id: dealId,
          title: deal.title,
          status: 'error',
          error: error.message || 'Unknown error'
        });
      }
      
      setProgress(prev => ({ ...prev, current: prev.current + 1 }));
      setResults([...allResults]);
    }

    // Generate videos for insights
    for (const insightId of selectedInsights) {
      const insight = insights.find(i => i.id === insightId);
      try {
        const response = await base44.functions.invoke('generateInsightVideo', { insightId });
        
        if (response.data?.success) {
          allResults.push({
            type: 'insight',
            id: insightId,
            title: insight.title,
            status: 'success',
            videoUrl: response.data.videoUrl
          });
        } else {
          allResults.push({
            type: 'insight',
            id: insightId,
            title: insight.title,
            status: 'error',
            error: response.data?.error || 'Failed to generate video'
          });
        }
      } catch (error) {
        allResults.push({
          type: 'insight',
          id: insightId,
          title: insight.title,
          status: 'error',
          error: error.message || 'Unknown error'
        });
      }
      
      setProgress(prev => ({ ...prev, current: prev.current + 1 }));
      setResults([...allResults]);
    }

    setGenerating(false);
    alert(`Video generation complete!\n✅ Success: ${allResults.filter(r => r.status === 'success').length}\n❌ Failed: ${allResults.filter(r => r.status === 'error').length}`);
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <Navigation user={user} />
      
      <div className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-[#1e3a5f] mb-2">Video Generation Admin</h1>
              <p className="text-gray-600">Batch generate marketing videos for deals and insights</p>
            </div>
            <Badge className="bg-purple-600 text-white text-lg px-4 py-2">
              Admin Panel
            </Badge>
          </div>

          {/* Generation Controls */}
          <Card className="p-6 mb-8 bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Batch Video Generation</h3>
                <p className="text-sm text-gray-600">
                  Selected: {selectedDeals.length} deal(s) + {selectedInsights.length} insight(s) = <strong>{selectedDeals.length + selectedInsights.length} total</strong>
                </p>
                {generating && (
                  <p className="text-sm text-purple-600 mt-2">
                    Progress: {progress.current} / {progress.total}
                  </p>
                )}
              </div>
              <Button
                onClick={generateVideos}
                disabled={generating || (selectedDeals.length === 0 && selectedInsights.length === 0)}
                className="bg-purple-600 hover:bg-purple-700 text-lg px-8 py-6"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Generating Videos...
                  </>
                ) : (
                  <>
                    <Video className="w-5 h-5 mr-2" />
                    Generate {selectedDeals.length + selectedInsights.length} Videos
                  </>
                )}
              </Button>
            </div>
          </Card>

          {/* Results Display */}
          {results.length > 0 && (
            <Card className="p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Generation Results</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {results.map((result, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {result.status === 'success' ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">
                          {result.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {result.type === 'deal' ? 'Deal' : 'Insight'}
                        </p>
                        {result.error && (
                          <p className="text-xs text-red-600 mt-1">{result.error}</p>
                        )}
                      </div>
                    </div>
                    {result.videoUrl && (
                      <a 
                        href={result.videoUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        View Video
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Tabs for Deals and Insights */}
          <Tabs defaultValue="deals" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="deals">
                Deals ({dealsWithPhotos.length})
              </TabsTrigger>
              <TabsTrigger value="insights">
                Insights ({insightsWithPhotos.length})
              </TabsTrigger>
            </TabsList>

            {/* Deals Tab */}
            <TabsContent value="deals">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Deals with Photos</h3>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={selectedDeals.length === dealsWithPhotos.length && dealsWithPhotos.length > 0}
                        onCheckedChange={handleSelectAllDeals}
                      />
                      <span className="text-sm font-medium">Select All</span>
                    </label>
                    <Badge variant="outline">
                      {selectedDeals.length} selected
                    </Badge>
                  </div>
                </div>

                {loadingDeals ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-[#1e3a5f]" />
                  </div>
                ) : dealsWithPhotos.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No deals with photos found</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {dealsWithPhotos.map((deal) => (
                      <div
                        key={deal.id}
                        className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all ${
                          selectedDeals.includes(deal.id)
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleToggleDeal(deal.id)}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedDeals.includes(deal.id)}
                            onCheckedChange={() => handleToggleDeal(deal.id)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            {deal.photo_urls?.[0] && (
                              <img
                                src={deal.photo_urls[0]}
                                alt={deal.title}
                                className="w-full h-32 object-cover rounded-lg mb-3"
                              />
                            )}
                            <h4 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                              {deal.title}
                            </h4>
                            <p className="text-sm text-gray-600 mb-2">{deal.location}</p>
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="text-xs">
                                {deal.photo_urls?.length || 0} photos
                              </Badge>
                              {deal.video_url ? (
                                <Badge className="bg-green-100 text-green-800 text-xs">
                                  ✓ Has Video
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  No Video
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>

            {/* Insights Tab */}
            <TabsContent value="insights">
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Insights with Photos</h3>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={selectedInsights.length === insightsWithPhotos.length && insightsWithPhotos.length > 0}
                        onCheckedChange={handleSelectAllInsights}
                      />
                      <span className="text-sm font-medium">Select All</span>
                    </label>
                    <Badge variant="outline">
                      {selectedInsights.length} selected
                    </Badge>
                  </div>
                </div>

                {loadingInsights ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-[#1e3a5f]" />
                  </div>
                ) : insightsWithPhotos.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No insights with photos found</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {insightsWithPhotos.map((insight) => (
                      <div
                        key={insight.id}
                        className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all ${
                          selectedInsights.includes(insight.id)
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleToggleInsight(insight.id)}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedInsights.includes(insight.id)}
                            onCheckedChange={() => handleToggleInsight(insight.id)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            {insight.photo_urls?.[0] && (
                              <img
                                src={insight.photo_urls[0]}
                                alt={insight.title}
                                className="w-full h-32 object-cover rounded-lg mb-3"
                              />
                            )}
                            <h4 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                              {insight.title}
                            </h4>
                            <p className="text-sm text-gray-600 mb-2">{insight.category}</p>
                            <div className="flex items-center justify-between">
                              <Badge variant="outline" className="text-xs">
                                {insight.photo_urls?.length || 0} photos
                              </Badge>
                              {insight.video_url ? (
                                <Badge className="bg-green-100 text-green-800 text-xs">
                                  ✓ Has Video
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">
                                  No Video
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}