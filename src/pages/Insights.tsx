
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Lightbulb, Plus, Heart, Eye, Upload, X, Video, Download, Loader2, CreditCard, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import Navigation from '../components/Navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import VideoPlayer from '../components/VideoPlayer';
import BuyCredits from '../components/BuyCredits';

export const isPublic = true;

export default function Insights() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [user, setUser] = useState(null);
  const [viewingInsight, setViewingInsight] = useState(null);
  const [editingInsightId, setEditingInsightId] = useState(null);
  const [insightForm, setInsightForm] = useState({
    title: '',
    content: '',
    category: '',
    tags: '',
    photo_urls: [],
    author_name: ''
  });

  // Quill modules configuration
  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'color': [] }, { 'background': [] }],
      ['link', 'image'],
      ['clean']
    ]
  };

  const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'color', 'background',
    'link', 'image'
  ];

  // Handle edit from URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const editInsightId = urlParams.get('edit');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setInsightForm(prev => ({ ...prev, author_name: currentUser.full_name || 'Anonymous' }));
      } catch (error) {
        // User not logged in
      }
    };
    loadUser();
  }, []);

  const { data: insights, isLoading } = useQuery({
    queryKey: ['insights'],
    queryFn: () => base44.entities.Insight.filter({ status: 'published' }, '-created_date'),
    initialData: []
  });

  const { data: insightCategories, isLoading: loadingCategories } = useQuery({
    queryKey: ['insightCategories'],
    queryFn: () => base44.entities.Category.filter({ type: 'insight_type', is_active: true }),
    initialData: []
  });

  // Load insight for editing if edit param is present
  useEffect(() => {
    if (editInsightId && insights.length > 0 && user) {
      const insightToEdit = insights.find(i => i.id === editInsightId);
      if (insightToEdit && insightToEdit.created_by === user.email) {
        setEditingInsightId(editInsightId);
        setInsightForm({
          title: insightToEdit.title,
          content: insightToEdit.content,
          category: insightToEdit.category,
          tags: insightToEdit.tags || '',
          photo_urls: insightToEdit.photo_urls || [],
          author_name: insightToEdit.author_name
        });
        setShowForm(true);
        // Clear URL parameter
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [editInsightId, insights, user]);

  const createInsightMutation = useMutation({
    mutationFn: (data) => {
      if (editingInsightId) {
        return base44.entities.Insight.update(editingInsightId, data);
      }
      return base44.entities.Insight.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['insights']);
      queryClient.invalidateQueries(['myInsights']);
      setShowForm(false);
      setEditingInsightId(null);
      setInsightForm({
        title: '',
        content: '',
        category: '',
        tags: '',
        photo_urls: [],
        author_name: user?.full_name || 'Anonymous'
      });
    }
  });

  const likeInsightMutation = useMutation({
    mutationFn: ({ id, likes }) => base44.entities.Insight.update(id, { likes: likes + 1 }),
    onSuccess: () => {
      queryClient.invalidateQueries(['insights']);
      setViewingInsight(prev => prev ? { ...prev, likes: prev.likes + 1 } : null);
    }
  });

  const viewInsightMutation = useMutation({
    mutationFn: ({ id, views }) => base44.entities.Insight.update(id, { views: views + 1 })
  });

  const generateVideoMutation = useMutation({
    mutationFn: async (insight) => {
      const videoResponse = await base44.functions.invoke('generateInsightVideo', {
        insightId: insight.id
      });

      if (!videoResponse.data?.success) {
        throw new Error(videoResponse.data?.error || 'Failed to generate video');
      }

      return videoResponse.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['insights']);
      // Refresh user data to update credits
      setUser(prev => ({ ...prev, credits: data.creditsRemaining }));
      setViewingInsight(prev => prev ? { 
        ...prev, 
        video_url: data.videoUrl,
        video_generated_date: new Date().toISOString()
      } : null);
    },
    onError: (error) => {
      alert(`Failed to generate video: ${error.message}`);
    }
  });

  const handlePhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    setUploadingPhotos(true);
    try {
      const uploadPromises = files.map(file => 
        base44.integrations.Core.UploadFile({ file })
      );
      const results = await Promise.all(uploadPromises);
      const urls = results.map(r => r.file_url);
      setInsightForm({ ...insightForm, photo_urls: [...insightForm.photo_urls, ...urls] });
    } catch (error) {
      console.error('Upload error:', error);
    }
    setUploadingPhotos(false);
  };

  const removePhoto = (index) => {
    setInsightForm({
      ...insightForm,
      photo_urls: insightForm.photo_urls.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!user) {
      alert('Please sign in to share insights');
      base44.auth.redirectToLogin(window.location.origin + createPageUrl('Insights'));
      return;
    }

    // Strip HTML tags from content
    const stripHtml = (html) => {
      const tmp = document.createElement('div');
      tmp.innerHTML = html;
      return tmp.textContent || tmp.innerText || '';
    };

    const tags = insightForm.tags.split(',').map(t => t.trim()).filter(Boolean);
    const tagsString = tags.join(' ');

    createInsightMutation.mutate({
      ...insightForm,
      content: stripHtml(insightForm.content),
      tags: tagsString
    });
  };

  const handleView = (insight) => {
    setViewingInsight(insight);
    viewInsightMutation.mutate({ id: insight.id, views: insight.views });
  };

  const handleGenerateVideo = async (insight) => {
    // Check if user has enough credits
    if (!user || user.credits < 1) {
      setShowBuyCredits(true);
      return;
    }
    
    generateVideoMutation.mutate(insight);
  };

  const filteredInsights = insights.filter(insight => {
    const tagsText = Array.isArray(insight.tags) ? insight.tags.join(' ') : (insight.tags || '');
    
    const matchesSearch = !searchTerm || 
      insight.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      insight.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tagsText.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || insight.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const categories = insightCategories.map(cat => ({
    value: cat.name,
    label: cat.name,
    icon: cat.icon
  }));

  const shareInsightButton = (
    <Button
      onClick={() => setShowForm(!showForm)}
      className="bg-[#d4af37] hover:bg-[#c49d2a]"
      size="sm"
    >
      <Plus className="w-4 h-4 mr-2" />
      Share Insight
    </Button>
  );

  const userCredits = user?.credits || 0;
  const hasEnoughCredits = userCredits >= 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 pb-20">
      <Navigation user={user} actionButton={shareInsightButton} />
      
      <div className="py-6 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl md:text-5xl font-bold text-[#1e3a5f] mb-4">Community Insights</h1>
            <p className="text-xl text-gray-600">Tips, tricks, and best practices from homeowners</p>
            {user && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <Badge className="bg-[#d4af37] text-white px-4 py-2 text-base">
                  <CreditCard className="w-4 h-4 mr-2" />
                  {userCredits} Credit{userCredits !== 1 ? 's' : ''}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBuyCredits(true)}
                  className="border-[#d4af37] text-[#d4af37] hover:bg-[#d4af37] hover:text-white"
                >
                  <DollarSign className="w-4 h-4 mr-1" />
                  Buy Credits
                </Button>
              </div>
            )}
          </div>

          {/* Add Insight Form */}
          {showForm && (
            <Card className="p-6 mb-8">
              <h2 className="text-xl font-bold text-[#1e3a5f] mb-4">{editingInsightId ? 'Edit Your Insight' : 'Share Your Knowledge'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Title *</Label>
                  <Input
                    value={insightForm.title}
                    onChange={(e) => setInsightForm({ ...insightForm, title: e.target.value })}
                    placeholder="Give your insight a clear title"
                    required
                  />
                </div>
                <div>
                  <Label>Category *</Label>
                  <Select
                    value={insightForm.category}
                    onValueChange={(value) => setInsightForm({ ...insightForm, category: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingCategories ? (
                        <SelectItem value="loading" disabled>Loading categories...</SelectItem>
                      ) : categories.length === 0 ? (
                        <SelectItem value="none" disabled>No categories available</SelectItem>
                      ) : (
                        categories.map(cat => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.icon} {cat.label}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Content *</Label>
                  <div className="bg-white rounded-lg">
                    <ReactQuill
                      theme="snow"
                      value={insightForm.content}
                      onChange={(value) => setInsightForm({ ...insightForm, content: value })}
                      modules={quillModules}
                      formats={quillFormats}
                      placeholder="Share your tip, trick, or experience in detail..."
                      style={{ minHeight: '120px' }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Use formatting to make your insight easier to read</p>
                </div>
                <div>
                  <Label>Tags (comma separated)</Label>
                  <Input
                    value={insightForm.tags}
                    onChange={(e) => setInsightForm({ ...insightForm, tags: e.target.value })}
                    placeholder="plumbing, diy, budget-friendly"
                  />
                </div>
                <div>
                  <Label>Photos (optional)</Label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {insightForm.photo_urls.map((url, index) => (
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
                      disabled={uploadingPhotos}
                    />
                    <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm">
                      <Upload className="w-4 h-4" />
                      <span>{uploadingPhotos ? 'Uploading...' : 'Upload Photos'}</span>
                    </div>
                  </label>
                </div>
                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    className="bg-[#1e3a5f] hover:bg-[#2a4a7f]"
                    disabled={createInsightMutation.isLoading}
                  >
                    {createInsightMutation.isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        {editingInsightId ? 'Updating...' : 'Publishing...'}
                      </>
                    ) : (
                      editingInsightId ? 'Update Insight' : 'Publish Insight'
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setShowForm(false);
                      setEditingInsightId(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* Results */}
          {isLoading ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1e3a5f] mx-auto"></div>
            </div>
          ) : filteredInsights.length === 0 ? (
            <Card className="p-12 text-center">
              <Lightbulb className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No insights found</h3>
              <p className="text-gray-600 mb-4">Be the first to share!</p>
              <Button onClick={() => setShowForm(true)} className="bg-[#d4af37] hover:bg-[#c49d2a]">
                Share Your Insight
              </Button>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredInsights.map((insight) => (
                <Card 
                  key={insight.id} 
                  className="p-6 hover:shadow-xl transition-shadow cursor-pointer"
                  onClick={() => handleView(insight)}
                >
                  {insight.photo_urls?.length > 0 && (
                    <div className="mb-4 -mx-6 -mt-6">
                      <img 
                        src={insight.photo_urls[0]} 
                        alt={insight.title}
                        className="w-full h-48 object-cover rounded-t-lg"
                      />
                    </div>
                  )}
                  
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="capitalize">
                      {categories.find(c => c.value === insight.category)?.icon} {insight.category.replace('_', ' ')}
                    </Badge>
                    {insight.is_featured && (
                      <Badge className="bg-yellow-100 text-yellow-800">⭐ Featured</Badge>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-[#1e3a5f] mb-3">{insight.title}</h3>
                  <div 
                    className="text-gray-700 mb-4 line-clamp-3 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: insight.content }}
                  />

                  {insight.tags && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {(Array.isArray(insight.tags) ? insight.tags : insight.tags.split(' ').filter(Boolean)).slice(0, 3).map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">#{tag}</Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm text-gray-500 pt-4 border-t">
                    <span>By {insight.author_name || 'Anonymous'}</span>
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        {insight.views}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          likeInsightMutation.mutate({ id: insight.id, likes: insight.likes });
                        }}
                        className="flex items-center gap-1 hover:text-red-500 transition-colors"
                      >
                        <Heart className="w-4 h-4" />
                        {insight.likes}
                      </button>
                    </div>
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
                placeholder="Search insights..."
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
              {filteredInsights.length} found
            </Badge>
          </div>
        </div>
      </div>

      {/* Filter Drawer */}
      <Dialog open={showFilters} onOpenChange={setShowFilters}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Filter Insights</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => setSelectedCategory('all')}
                variant="outline"
                className="flex-1"
              >
                Clear
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

      {/* Insight Details Modal */}
      <Dialog open={!!viewingInsight} onOpenChange={() => setViewingInsight(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {viewingInsight && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{viewingInsight.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 mt-4">
                {viewingInsight.video_url ? (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Video className="w-5 h-5 text-purple-600" />
                        <span className="text-sm font-semibold text-gray-700">AI-Generated Video</span>
                      </div>
                      <a 
                        href={viewingInsight.video_url} 
                        download 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </a>
                    </div>
                    <VideoPlayer videoUrl={viewingInsight.video_url} />
                  </div>
                ) : viewingInsight.photo_urls?.length > 0 && user && user.email === viewingInsight.created_by && (
                  <div className="mb-6">
                    <Card className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                            <Video className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-gray-900">Generate Marketing Video</h4>
                            <p className="text-xs text-gray-600">
                              {hasEnoughCredits ? 
                                'Create an AI-powered video (1 credit)' : 
                                'Insufficient credits - buy more to generate video'}
                            </p>
                          </div>
                        </div>
                        {hasEnoughCredits ? (
                          <Button
                            onClick={() => handleGenerateVideo(viewingInsight)}
                            disabled={generateVideoMutation.isLoading}
                            className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                          >
                            {generateVideoMutation.isLoading ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Video className="w-4 h-4 mr-2" />
                                Generate Video
                              </>
                            )}
                          </Button>
                        ) : (
                          <Button
                            onClick={() => setShowBuyCredits(true)}
                            className="bg-[#d4af37] hover:bg-[#c49d2a] whitespace-nowrap"
                          >
                            <DollarSign className="w-4 h-4 mr-2" />
                            Buy Credits
                          </Button>
                        )}
                      </div>
                      {user && (
                        <div className="mt-3 pt-3 border-t border-purple-200 text-sm text-gray-600 flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-[#d4af37]" />
                          Your balance: <strong>{userCredits} credit{userCredits !== 1 ? 's' : ''}</strong>
                        </div>
                      )}
                    </Card>
                  </div>
                )}

                {viewingInsight.photo_urls?.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {viewingInsight.photo_urls.map((url, index) => (
                      <img
                        key={index}
                        src={url}
                        alt={`${viewingInsight.title} ${index + 1}`}
                        className="w-full h-64 object-cover rounded-lg"
                      />
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {categories.find(c => c.value === viewingInsight.category)?.icon} {viewingInsight.category.replace('_', ' ')}
                  </Badge>
                  {viewingInsight.is_featured && (
                    <Badge className="bg-yellow-100 text-yellow-800">⭐ Featured</Badge>
                  )}
                </div>

                <div 
                  className="prose prose-lg max-w-none"
                  dangerouslySetInnerHTML={{ __html: viewingInsight.content }}
                />

                {viewingInsight.tags && (
                  <div className="flex flex-wrap gap-2">
                    {(Array.isArray(viewingInsight.tags) ? viewingInsight.tags : viewingInsight.tags.split(' ').filter(Boolean)).map((tag, idx) => (
                      <Badge key={idx} variant="outline">#{tag}</Badge>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-6 border-t">
                  <span className="text-sm text-gray-600">
                    By {viewingInsight.author_name || 'Anonymous'}
                  </span>
                  <div className="flex items-center gap-6">
                    <span className="flex items-center gap-2 text-gray-600">
                      <Eye className="w-5 h-5" />
                      {viewingInsight.views} views
                    </span>
                    <button
                      onClick={() => {
                        likeInsightMutation.mutate({ id: viewingInsight.id, likes: viewingInsight.likes });
                      }}
                      className="flex items-center gap-2 text-gray-600 hover:text-red-500 transition-colors"
                    >
                      <Heart className="w-5 h-5" />
                      {viewingInsight.likes} likes
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Buy Credits Modal */}
      <BuyCredits
        isOpen={showBuyCredits}
        onClose={() => setShowBuyCredits(false)}
      />
    </div>
  );
}
