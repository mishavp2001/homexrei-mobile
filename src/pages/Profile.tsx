
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { User, Wrench, Plus, Edit2, Loader2, CheckCircle, Briefcase, X, Camera, ExternalLink, DollarSign, Image } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import Navigation from '../components/Navigation';

export default function Profile() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingProfilePhoto, setUploadingProfilePhoto] = useState(false);
  const [uploadingBusinessPhoto, setUploadingBusinessPhoto] = useState(false);
  const [uploadingWorkPhoto, setUploadingWorkPhoto] = useState(false);
  
  const [profileForm, setProfileForm] = useState({
    profile_type: 'personal',
    bio: '',
    profile_photo_url: '',
    business_name: '',
    business_photo_url: '',
    business_address: '',
    business_phone: '',
    service_areas: [],
    website_url: '',
    social_links: {},
    price_list: [],
    work_photos: [],
    certifications: [],
    years_in_business: 0,
    public_profile_url: '' // This will now be an internal field, not user-editable for the public URL display
  });

  const [newServiceArea, setNewServiceArea] = useState('');
  const [newCertification, setNewCertification] = useState('');
  const [newPriceItem, setNewPriceItem] = useState({ description: '', price: '' });

  const [serviceForm, setServiceForm] = useState({
    expert_name: '',
    expert_email: '',
    expert_phone: '',
    service_category: '',
    description: '',
    service_area: '',
    years_experience: '',
    hourly_rate: '',
    photo_url: '',
    certifications: ''
  });

  // Quill modules configuration
  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'color': [] }],
      ['link'],
      ['clean']
    ]
  };

  const quillFormats = [
    'header',
    'bold', 'italic', 'underline',
    'list', 'bullet',
    'color',
    'link'
  ];

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setServiceForm(prev => ({
          ...prev,
          expert_email: currentUser.email,
          expert_name: currentUser.full_name || ''
        }));
        setProfileForm({
          profile_type: currentUser.profile_type || 'personal',
          bio: currentUser.bio || '',
          profile_photo_url: currentUser.profile_photo_url || '',
          business_name: currentUser.business_name || '',
          business_photo_url: currentUser.business_photo_url || '',
          business_address: currentUser.business_address || '',
          business_phone: currentUser.business_phone || '',
          service_areas: currentUser.service_areas || [],
          website_url: currentUser.website_url || '',
          social_links: currentUser.social_links || {},
          price_list: currentUser.price_list || [],
          work_photos: currentUser.work_photos || [],
          certifications: currentUser.certifications || [],
          years_in_business: currentUser.years_in_business || 0,
          public_profile_url: currentUser.public_profile_url || currentUser.full_name?.toLowerCase().replace(/\s+/g, '-') || ''
        });
      } catch (error) {
        console.error('Not authenticated');
        const profileUrl = window.location.origin + createPageUrl('Profile');
        base44.auth.redirectToLogin(profileUrl);
      }
      setLoadingAuth(false);
    };
    loadUser();
  }, []);

  const { data: myServices, isLoading } = useQuery({
    queryKey: ['myServices', user?.email],
    queryFn: () => user ? base44.entities.ServiceListing.filter({ expert_email: user.email }, '-created_date') : [],
    enabled: !!user,
    initialData: []
  });

  const { data: categories } = useQuery({
    queryKey: ['serviceCategories'],
    queryFn: () => base44.entities.Category.filter({ type: 'service_type', is_active: true }),
    initialData: []
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['user']);
      alert('Profile updated successfully!');
    },
    onError: (error) => {
      console.error('Failed to update profile:', error);
      alert('Failed to update profile.');
    }
  });

  const createServiceMutation = useMutation({
    mutationFn: (data) => base44.entities.ServiceListing.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['myServices']);
      setShowServiceForm(false);
      setServiceForm({
        expert_name: user?.full_name || '',
        expert_email: user?.email || '',
        expert_phone: '',
        service_category: '',
        description: '',
        service_area: '',
        years_experience: '',
        hourly_rate: '',
        photo_url: '',
        certifications: ''
      });
    },
    onError: (error) => {
      console.error('Failed to create service:', error);
      alert('Failed to create service listing.');
    }
  });

  const updateServiceMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ServiceListing.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['myServices']);
      setEditingService(null);
      setShowServiceForm(false);
    },
    onError: (error) => {
      console.error('Failed to update service:', error);
      alert('Failed to update service listing.');
    }
  });

  const handleProfilePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadingProfilePhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setProfileForm({ ...profileForm, profile_photo_url: file_url });
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload profile photo.');
    }
    setUploadingProfilePhoto(false);
  };

  const handleBusinessPhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadingBusinessPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setProfileForm({ ...profileForm, business_photo_url: file_url });
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload business photo.');
    }
    setUploadingBusinessPhoto(false);
  };

  const handleWorkPhotoUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    
    setUploadingWorkPhoto(true);
    try {
      const uploadPromises = files.map(file => base44.integrations.Core.UploadFile({ file }));
      const results = await Promise.all(uploadPromises);
      const newUrls = results.map(r => r.file_url);
      setProfileForm({ ...profileForm, work_photos: [...profileForm.work_photos, ...newUrls] });
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload work photos.');
    }
    setUploadingWorkPhoto(false);
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setServiceForm({ ...serviceForm, photo_url: file_url });
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload service photo.');
    }
    setUploadingPhoto(false);
  };

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileForm);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...serviceForm,
      years_experience: parseFloat(serviceForm.years_experience) || 0,
      hourly_rate: parseFloat(serviceForm.hourly_rate) || 0
    };

    if (editingService) {
      updateServiceMutation.mutate({ id: editingService.id, data });
    } else {
      createServiceMutation.mutate(data);
    }
  };

  const handleEdit = (service) => {
    setEditingService(service);
    setServiceForm(service);
    setShowServiceForm(true);
  };

  const addServiceArea = () => {
    if (newServiceArea.trim() && !profileForm.service_areas.includes(newServiceArea.trim())) {
      setProfileForm({
        ...profileForm,
        service_areas: [...profileForm.service_areas, newServiceArea.trim()]
      });
      setNewServiceArea('');
    }
  };

  const removeServiceArea = (index) => {
    setProfileForm({
      ...profileForm,
      service_areas: profileForm.service_areas.filter((_, i) => i !== index)
    });
  };

  const addCertification = () => {
    if (newCertification.trim() && !profileForm.certifications.includes(newCertification.trim())) {
      setProfileForm({
        ...profileForm,
        certifications: [...profileForm.certifications, newCertification.trim()]
      });
      setNewCertification('');
    }
  };

  const removeCertification = (index) => {
    setProfileForm({
      ...profileForm,
      certifications: profileForm.certifications.filter((_, i) => i !== index)
    });
  };

  const addPriceItem = () => {
    if (newPriceItem.description.trim() && newPriceItem.price && parseFloat(newPriceItem.price) > 0) {
      setProfileForm({
        ...profileForm,
        price_list: [...profileForm.price_list, { 
          description: newPriceItem.description.trim(), 
          price: parseFloat(newPriceItem.price) 
        }]
      });
      setNewPriceItem({ description: '', price: '' });
    }
  };

  const removePriceItem = (index) => {
    setProfileForm({
      ...profileForm,
      price_list: profileForm.price_list.filter((_, i) => i !== index)
    });
  };

  const removeWorkPhoto = (index) => {
    setProfileForm({
      ...profileForm,
      work_photos: profileForm.work_photos.filter((_, i) => i !== index)
    });
  };

  if (loadingAuth || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  const publicProfileUrl = `${window.location.origin}/publicprofile?user=${encodeURIComponent(user.email)}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <Navigation user={user} />
      
      <div className="py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Link to={createPageUrl('Dashboard')}>
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-[#1e3a5f]">My Profile</h1>
              <p className="text-gray-600">Manage your profile and services</p>
            </div>
            <a href={publicProfileUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline">
                <ExternalLink className="w-4 h-4 mr-2" />
                View Public Profile
              </Button>
            </a>
          </div>

          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="profile">
                <User className="w-4 h-4 mr-2" />
                Profile Settings
              </TabsTrigger>
              <TabsTrigger value="services">
                <Wrench className="w-4 h-4 mr-2" />
                Service Listings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <Card className="p-6 mb-8">
                <h2 className="text-xl font-bold text-[#1e3a5f] mb-6">Profile Information</h2>
                
                <form onSubmit={handleProfileSubmit} className="space-y-6">
                  {/* Profile Type */}
                  <div>
                    <Label>Profile Type</Label>
                    <Select
                      value={profileForm.profile_type}
                      onValueChange={(value) => setProfileForm({ ...profileForm, profile_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="personal">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Personal Profile
                          </div>
                        </SelectItem>
                        <SelectItem value="business">
                          <div className="flex items-center gap-2">
                            <Briefcase className="w-4 h-4" />
                            Business Profile
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Basic Info */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>Full Name</Label>
                      <Input value={user.full_name} disabled className="bg-gray-100" />
                      <p className="text-xs text-gray-500 mt-1">Contact support to change your name</p>
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input value={user.email} disabled className="bg-gray-100" />
                    </div>
                  </div>

                  {/* Profile Photo */}
                  <div>
                    <Label>Profile Photo</Label>
                    <div className="flex items-center gap-4 mt-2">
                      {profileForm.profile_photo_url && (
                        <img src={profileForm.profile_photo_url} alt="Profile" className="w-20 h-20 object-cover rounded-full" />
                      )}
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleProfilePhotoUpload}
                          disabled={uploadingProfilePhoto}
                        />
                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg">
                          {uploadingProfilePhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                          <span className="text-sm">{uploadingProfilePhoto ? 'Uploading...' : 'Upload Photo'}</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Bio */}
                  <div>
                    <Label>Bio</Label>
                    <div className="bg-white rounded-lg">
                      <ReactQuill
                        theme="snow"
                        value={profileForm.bio}
                        onChange={(value) => setProfileForm({ ...profileForm, bio: value })}
                        modules={quillModules}
                        formats={quillFormats}
                        placeholder="Tell us about yourself..."
                        style={{ minHeight: '120px' }}
                      />
                    </div>
                  </div>

                  {/* Public Profile URL - Display Only */}
                  <div>
                    <Label>Public Profile URL</Label>
                    <div className="flex gap-2 items-center">
                      <Input
                        value={publicProfileUrl}
                        readOnly
                        className="bg-gray-100 flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(publicProfileUrl);
                          alert('Profile URL copied to clipboard!');
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Share this URL to let others view your public profile
                    </p>
                  </div>

                  {/* Business Fields */}
                  {profileForm.profile_type === 'business' && (
                    <>
                      <div className="pt-6 border-t">
                        <h3 className="text-lg font-semibold text-[#1e3a5f] mb-4">Business Information</h3>
                        
                        <div className="space-y-4">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <Label>Business Name *</Label>
                              <Input
                                value={profileForm.business_name}
                                onChange={(e) => setProfileForm({ ...profileForm, business_name: e.target.value })}
                                required={profileForm.profile_type === 'business'}
                              />
                            </div>
                            <div>
                              <Label>Business Phone</Label>
                              <Input
                                type="tel"
                                value={profileForm.business_phone}
                                onChange={(e) => setProfileForm({ ...profileForm, business_phone: e.target.value })}
                              />
                            </div>
                          </div>

                          <div>
                            <Label>Business Address</Label>
                            <Input
                              value={profileForm.business_address}
                              onChange={(e) => setProfileForm({ ...profileForm, business_address: e.target.value })}
                              placeholder="123 Main St, City, State ZIP"
                            />
                          </div>

                          <div>
                            <Label>Business Logo/Photo</Label>
                            <div className="flex items-center gap-4 mt-2">
                              {profileForm.business_photo_url && (
                                <img src={profileForm.business_photo_url} alt="Business" className="w-20 h-20 object-cover rounded-lg" />
                              )}
                              <label className="cursor-pointer">
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={handleBusinessPhotoUpload}
                                  disabled={uploadingBusinessPhoto}
                                />
                                <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg">
                                  {uploadingBusinessPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                                  <span className="text-sm">{uploadingBusinessPhoto ? 'Uploading...' : 'Upload Logo'}</span>
                                </div>
                              </label>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <Label>Website</Label>
                              <Input
                                type="url"
                                value={profileForm.website_url}
                                onChange={(e) => setProfileForm({ ...profileForm, website_url: e.target.value })}
                                placeholder="https://yourwebsite.com"
                              />
                            </div>
                            <div>
                              <Label>Years in Business</Label>
                              <Input
                                type="number"
                                value={profileForm.years_in_business}
                                onChange={(e) => setProfileForm({ ...profileForm, years_in_business: parseFloat(e.target.value) || 0 })}
                              />
                            </div>
                          </div>

                          {/* Service Areas */}
                          <div>
                            <Label>Service Areas</Label>
                            <div className="flex gap-2 mb-2">
                              <Input
                                value={newServiceArea}
                                onChange={(e) => setNewServiceArea(e.target.value)}
                                placeholder="Add city or region..."
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addServiceArea())}
                              />
                              <Button type="button" onClick={addServiceArea}>
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {profileForm.service_areas.map((area, index) => (
                                <Badge key={index} variant="outline" className="flex items-center gap-1">
                                  {area}
                                  <X className="w-3 h-3 cursor-pointer" onClick={() => removeServiceArea(index)} />
                                &nbsp;</Badge>
                              ))}
                            </div>
                          </div>

                          {/* Certifications */}
                          <div>
                            <Label>Certifications & Licenses</Label>
                            <div className="flex gap-2 mb-2">
                              <Input
                                value={newCertification}
                                onChange={(e) => setNewCertification(e.target.value)}
                                placeholder="Add certification..."
                                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCertification())}
                              />
                              <Button type="button" onClick={addCertification}>
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="space-y-1">
                              {profileForm.certifications.map((cert, index) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                  <span className="text-sm">{cert}</span>
                                  <X className="w-4 h-4 cursor-pointer text-gray-400 hover:text-red-600" onClick={() => removeCertification(index)} />
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Price List */}
                          <div>
                            <Label>
                              <DollarSign className="w-4 h-4 inline mr-1" />
                              Price List
                            </Label>
                            <div className="flex gap-2 mb-2">
                              <Input
                                value={newPriceItem.description}
                                onChange={(e) => setNewPriceItem({ ...newPriceItem, description: e.target.value })}
                                placeholder="Service description..."
                                className="flex-1"
                              />
                              <Input
                                type="number"
                                value={newPriceItem.price}
                                onChange={(e) => setNewPriceItem({ ...newPriceItem, price: e.target.value })}
                                placeholder="Price"
                                className="w-32"
                              />
                              <Button type="button" onClick={addPriceItem}>
                                <Plus className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="space-y-2">
                              {profileForm.price_list.map((item, index) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">{item.description}</p>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="font-bold text-[#d4af37]">${item.price}</span>
                                    <X className="w-4 h-4 cursor-pointer text-gray-400 hover:text-red-600" onClick={() => removePriceItem(index)} />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Work Photos */}
                          <div>
                            <Label>
                              <Image className="w-4 h-4 inline mr-1" />
                              Portfolio / Work Photos
                            </Label>
                            <div className="mb-3">
                              <label className="cursor-pointer">
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  className="hidden"
                                  onChange={handleWorkPhotoUpload}
                                  disabled={uploadingWorkPhoto}
                                />
                                <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg inline-flex">
                                  {uploadingWorkPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                  <span className="text-sm">{uploadingWorkPhoto ? 'Uploading...' : 'Add Photos'}</span>
                                </div>
                              </label>
                            </div>
                            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
                              {profileForm.work_photos.map((url, index) => (
                                <div key={index} className="relative group">
                                  <img src={url} alt={`Work ${index + 1}`} className="w-full h-24 object-cover rounded-lg" />
                                  <button
                                    type="button"
                                    onClick={() => removeWorkPhoto(index)}
                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Social Links */}
                          <div>
                            <Label>Social Media Links</Label>
                            <div className="grid md:grid-cols-2 gap-4">
                              <Input
                                value={profileForm.social_links?.facebook || ''}
                                onChange={(e) => setProfileForm({ 
                                  ...profileForm, 
                                  social_links: { ...profileForm.social_links, facebook: e.target.value }
                                })}
                                placeholder="Facebook URL"
                              />
                              <Input
                                value={profileForm.social_links?.instagram || ''}
                                onChange={(e) => setProfileForm({ 
                                  ...profileForm, 
                                  social_links: { ...profileForm.social_links, instagram: e.target.value }
                                })}
                                placeholder="Instagram URL"
                              />
                              <Input
                                value={profileForm.social_links?.linkedin || ''}
                                onChange={(e) => setProfileForm({ 
                                  ...profileForm, 
                                  social_links: { ...profileForm.social_links, linkedin: e.target.value }
                                })}
                                placeholder="LinkedIn URL"
                              />
                              <Input
                                value={profileForm.social_links?.twitter || ''}
                                onChange={(e) => setProfileForm({ 
                                  ...profileForm, 
                                  social_links: { ...profileForm.social_links, twitter: e.target.value }
                                })}
                                placeholder="Twitter URL"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full bg-[#1e3a5f] hover:bg-[#2a4a7f]"
                    disabled={updateProfileMutation.isLoading}
                  >
                    {updateProfileMutation.isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Save Profile
                  </Button>
                </form>
              </Card>
            </TabsContent>

            <TabsContent value="services">
              <Card className="p-6 mb-8">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3">
                    <Wrench className="w-6 h-6 text-[#d4af37]" />
                    <h2 className="text-xl font-bold text-[#1e3a5f]">My Service Listings</h2>
                  </div>
                  <Button onClick={() => setShowServiceForm(!showServiceForm)} className="bg-[#d4af37] hover:bg-[#c49d2a]">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Service
                  </Button>
                </div>

                {showServiceForm && (
                  <Card className="p-6 mb-6 bg-gray-50">
                    <h3 className="font-semibold text-[#1e3a5f] mb-4">
                      {editingService ? 'Edit Service' : 'New Service Listing'}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label>Your Name *</Label>
                          <Input
                            value={serviceForm.expert_name}
                            onChange={(e) => setServiceForm({ ...serviceForm, expert_name: e.target.value })}
                            required
                          />
                        </div>
                        <div>
                          <Label>Email *</Label>
                          <Input
                            value={serviceForm.expert_email}
                            onChange={(e) => setServiceForm({ ...serviceForm, expert_email: e.target.value })}
                            type="email"
                            required
                          />
                        </div>
                        <div>
                          <Label>Phone</Label>
                          <Input
                            value={serviceForm.expert_phone}
                            onChange={(e) => setServiceForm({ ...serviceForm, expert_phone: e.target.value })}
                            type="tel"
                          />
                        </div>
                        <div>
                          <Label>Service Category *</Label>
                          <Select
                            value={serviceForm.service_category}
                            onValueChange={(value) => setServiceForm({ ...serviceForm, service_category: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                            <SelectContent>
                              {categories.map(cat => (
                                <SelectItem key={cat.id} value={cat.name}>{cat.icon} {cat.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Service Area</Label>
                          <Input
                            value={serviceForm.service_area}
                            onChange={(e) => setServiceForm({ ...serviceForm, service_area: e.target.value })}
                            placeholder="City, State"
                          />
                        </div>
                        <div>
                          <Label>Years of Experience</Label>
                          <Input
                            value={serviceForm.years_experience}
                            onChange={(e) => setServiceForm({ ...serviceForm, years_experience: e.target.value })}
                            type="number"
                          />
                        </div>
                        <div>
                          <Label>Hourly Rate ($)</Label>
                          <Input
                            value={serviceForm.hourly_rate}
                            onChange={(e) => setServiceForm({ ...serviceForm, hourly_rate: e.target.value })}
                            type="number"
                          />
                        </div>
                        <div>
                          <Label>Profile Photo</Label>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            disabled={uploadingPhoto}
                          />
                          {uploadingPhoto && <p className="text-sm text-gray-500 mt-1">Uploading...</p>}
                          {serviceForm.photo_url && (
                            <img src={serviceForm.photo_url} alt="Preview" className="w-20 h-20 object-cover rounded mt-2" />
                          )}
                        </div>
                      </div>
                      <div>
                        <Label>Description *</Label>
                        <div className="bg-white rounded-lg">
                          <ReactQuill
                            theme="snow"
                            value={serviceForm.description}
                            onChange={(value) => setServiceForm({ ...serviceForm, description: value })}
                            modules={quillModules}
                            formats={quillFormats}
                            placeholder="Describe your services, expertise, and what makes you unique..."
                            style={{ minHeight: '120px' }}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Certifications & Licenses</Label>
                        <Textarea
                          value={serviceForm.certifications}
                          onChange={(e) => setServiceForm({ ...serviceForm, certifications: e.target.value })}
                          rows={3}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" className="bg-[#1e3a5f] hover:bg-[#2a4a7f]">
                          {editingService ? 'Update' : 'Submit for Review'}
                        </Button>
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={() => {
                            setShowServiceForm(false);
                            setEditingService(null);
                            setServiceForm({
                              expert_name: user?.full_name || '',
                              expert_email: user?.email || '',
                              expert_phone: '',
                              service_category: '',
                              description: '',
                              service_area: '',
                              years_experience: '',
                              hourly_rate: '',
                              photo_url: '',
                              certifications: ''
                            });
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </Card>
                )}

                <div className="space-y-4">
                  {isLoading ? (
                    <div className="text-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin text-[#1e3a5f] mx-auto" />
                    </div>
                  ) : myServices.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-lg">
                      <Wrench className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 mb-4">No service listings yet</p>
                      <p className="text-sm text-gray-500">Add your first service to start advertising your expertise</p>
                    </div>
                  ) : (
                    myServices.map((service) => (
                      <Card key={service.id} className="p-6">
                        <div className="flex items-start gap-4">
                          {service.photo_url && (
                            <img 
                              src={service.photo_url} 
                              alt={service.expert_name}
                              className="w-20 h-20 object-cover rounded-lg"
                            />
                          )}
                          <div className="flex-1">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="text-lg font-semibold text-[#1e3a5f]">{service.expert_name}</h3>
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
                                <Badge variant="outline" className="mb-2">{service.service_category}</Badge>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(service)}
                              >
                                <Edit2 className="w-4 h-4 mr-1" />
                                Edit
                              </Button>
                            </div>
                            <p className="text-gray-700 mb-3">{service.description}</p>
                            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                              {service.service_area && <span>📍 {service.service_area}</span>}
                              {service.years_experience > 0 && <span>⭐ {service.years_experience} years exp</span>}
                              {service.hourly_rate > 0 && <span>💰 ${service.hourly_rate}/hr</span>}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
