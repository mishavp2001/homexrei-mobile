import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit2, Trash2, Shield, Loader2, AlertTriangle, CheckCircle, XCircle, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Admin() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    type: 'service_type',
    description: '',
    icon: '',
    is_active: true
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error('Not authenticated');
      }
      setLoadingAuth(false);
    };
    loadUser();
  }, []);

  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list('-created_date'),
    initialData: []
  });

  const { data: services } = useQuery({
    queryKey: ['services'],
    queryFn: () => base44.entities.ServiceListing.list('-created_date'),
    initialData: []
  });

  const { data: insights } = useQuery({
    queryKey: ['insights'],
    queryFn: () => base44.entities.Insight.list('-created_date'),
    initialData: []
  });

  const createCategoryMutation = useMutation({
    mutationFn: (data) => base44.entities.Category.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['categories']);
      setShowCategoryForm(false);
      setCategoryForm({ name: '', type: 'service_type', description: '', icon: '', is_active: true });
    }
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Category.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['categories']);
      setEditingCategory(null);
      setCategoryForm({ name: '', type: 'service_type', description: '', icon: '', is_active: true });
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: (id) => base44.entities.Category.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['categories']);
    }
  });

  const updateServiceMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ServiceListing.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['services']);
    }
  });

  const updateInsightMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Insight.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['insights']);
    }
  });

  const handleCategorySubmit = (e) => {
    e.preventDefault();
    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data: categoryForm });
    } else {
      createCategoryMutation.mutate(categoryForm);
    }
  };

  const handleEditCategory = (category) => {
    setEditingCategory(category);
    setCategoryForm(category);
    setShowCategoryForm(true);
  };

  const isAdmin = user && user.role === 'admin';

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="p-12 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Admin Access Required</h2>
            <p className="text-gray-600 mb-6">
              You don't have permission to access this page.
            </p>
            <Link to={createPageUrl('Dashboard')}>
              <Button className="bg-[#1e3a5f] hover:bg-[#2a4a7f]">
                Go to Dashboard
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#1e3a5f]">Admin Dashboard</h1>
              <p className="text-gray-600">Manage categories, services, and content</p>
            </div>
          </div>
          <Link to={createPageUrl('Dashboard')}>
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Link to={createPageUrl('AdminVideoGeneration')}>
            <Card className="p-6 bg-gradient-to-r from-purple-50 to-indigo-50 hover:shadow-lg transition-all cursor-pointer border-2 border-purple-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                  <Video className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#1e3a5f] mb-1">Video Generation</h3>
                  <p className="text-sm text-gray-600">Batch generate videos for deals & insights</p>
                </div>
              </div>
            </Card>
          </Link>
        </div>

        <Tabs defaultValue="categories" className="space-y-6">
          <TabsList>
            <TabsTrigger value="categories">Categories</TabsTrigger>
            <TabsTrigger value="services">Services ({services.length})</TabsTrigger>
            <TabsTrigger value="insights">Insights ({insights.length})</TabsTrigger>
          </TabsList>

          {/* Categories Tab */}
          <TabsContent value="categories">
            <Card className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-[#1e3a5f]">Categories Management</h2>
                <Button onClick={() => setShowCategoryForm(!showCategoryForm)} className="bg-[#d4af37] hover:bg-[#c49d2a]">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Category
                </Button>
              </div>

              {showCategoryForm && (
                <Card className="p-6 mb-6 bg-gray-50">
                  <h3 className="font-semibold text-[#1e3a5f] mb-4">
                    {editingCategory ? 'Edit Category' : 'New Category'}
                  </h3>
                  <form onSubmit={handleCategorySubmit} className="space-y-4">
                    <div>
                      <Label>Name *</Label>
                      <Input
                        value={categoryForm.name}
                        onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Type *</Label>
                      <Select
                        value={categoryForm.type}
                        onValueChange={(value) => setCategoryForm({ ...categoryForm, type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="property_type">Property Type</SelectItem>
                          <SelectItem value="service_type">Service Type</SelectItem>
                          <SelectItem value="insight_type">Insight Type</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Icon (emoji)</Label>
                      <Input
                        value={categoryForm.icon}
                        onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })}
                        placeholder="🏠"
                      />
                    </div>
                    <div>
                      <Label>Description</Label>
                      <Textarea
                        value={categoryForm.description}
                        onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={categoryForm.is_active}
                        onChange={(e) => setCategoryForm({ ...categoryForm, is_active: e.target.checked })}
                        id="is_active"
                      />
                      <Label htmlFor="is_active">Active</Label>
                    </div>
                    <div className="flex gap-2">
                      <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#2a4a7f]">
                        {editingCategory ? 'Update' : 'Create'}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => {
                          setShowCategoryForm(false);
                          setEditingCategory(null);
                          setCategoryForm({ name: '', type: 'service_type', description: '', icon: '', is_active: true });
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Card>
              )}

              <div className="space-y-3">
                {loadingCategories ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-[#1e3a5f] mx-auto" />
                  </div>
                ) : categories.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No categories yet</p>
                ) : (
                  categories.map((category) => (
                    <Card key={category.id} className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {category.icon && <span className="text-2xl">{category.icon}</span>}
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-[#1e3a5f]">{category.name}</h3>
                              <Badge variant="outline">{category.type.replace('_', ' ')}</Badge>
                              {category.is_active ? (
                                <Badge className="bg-green-100 text-green-800">Active</Badge>
                              ) : (
                                <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>
                              )}
                            </div>
                            {category.description && (
                              <p className="text-sm text-gray-600">{category.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditCategory(category)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => {
                              if (confirm('Delete this category?')) {
                                deleteCategoryMutation.mutate(category.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </Card>
          </TabsContent>

          {/* Services Tab */}
          <TabsContent value="services">
            <Card className="p-6">
              <h2 className="text-xl font-bold text-[#1e3a5f] mb-6">Service Listings</h2>
              <div className="space-y-3">
                {services.map((service) => (
                  <Card key={service.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-[#1e3a5f]">{service.expert_name}</h3>
                          <Badge variant="outline">{service.service_category}</Badge>
                          {service.is_verified && (
                            <Badge className="bg-blue-100 text-blue-800">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                          <Badge className={
                            service.status === 'active' ? 'bg-green-100 text-green-800' :
                            service.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {service.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{service.description}</p>
                        <div className="flex gap-4 text-xs text-gray-500">
                          <span>{service.expert_email}</span>
                          {service.service_area && <span>📍 {service.service_area}</span>}
                          {service.hourly_rate && <span>💰 ${service.hourly_rate}/hr</span>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateServiceMutation.mutate({ 
                            id: service.id, 
                            data: { is_verified: !service.is_verified } 
                          })}
                        >
                          {service.is_verified ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </Button>
                        <Select
                          value={service.status}
                          onValueChange={(value) => updateServiceMutation.mutate({
                            id: service.id,
                            data: { status: value }
                          })}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights">
            <Card className="p-6">
              <h2 className="text-xl font-bold text-[#1e3a5f] mb-6">Community Insights</h2>
              <div className="space-y-3">
                {insights.map((insight) => (
                  <Card key={insight.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-[#1e3a5f]">{insight.title}</h3>
                          <Badge variant="outline">{insight.category}</Badge>
                          {insight.is_featured && (
                            <Badge className="bg-yellow-100 text-yellow-800">Featured</Badge>
                          )}
                          <Badge className={
                            insight.status === 'published' ? 'bg-green-100 text-green-800' :
                            insight.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {insight.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{insight.content.substring(0, 150)}...</p>
                        <div className="flex gap-4 text-xs text-gray-500">
                          <span>👁️ {insight.views} views</span>
                          <span>❤️ {insight.likes} likes</span>
                          <span>By {insight.author_name || 'Anonymous'}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateInsightMutation.mutate({ 
                            id: insight.id, 
                            data: { is_featured: !insight.is_featured } 
                          })}
                        >
                          {insight.is_featured ? '⭐' : '☆'}
                        </Button>
                        <Select
                          value={insight.status}
                          onValueChange={(value) => updateInsightMutation.mutate({
                            id: insight.id,
                            data: { status: value }
                          })}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="published">Published</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}