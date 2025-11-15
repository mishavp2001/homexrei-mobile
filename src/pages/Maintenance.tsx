
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ArrowLeft, Plus, Calendar, DollarSign, CheckCircle, Clock, AlertTriangle, Loader2, Wrench, Send, Camera, X, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import Navigation from '../components/Navigation';

const PROJECT_TYPES = [
  { value: 'fix', label: 'Fix', icon: '🔧' },
  { value: 'repair', label: 'Repair', icon: '🛠️' },
  { value: 'replace', label: 'Replace', icon: '🔄' },
  { value: 'install', label: 'Install', icon: '📦' },
  { value: 'inspect', label: 'Inspect', icon: '🔍' }
];

const COMPONENT_TYPES = [
  { value: 'roof', label: 'Roof', category: 'Roofing' },
  { value: 'hvac', label: 'HVAC System', category: 'HVAC' },
  { value: 'plumbing', label: 'Plumbing', category: 'Plumbing' },
  { value: 'electrical', label: 'Electrical', category: 'Electrical' },
  { value: 'windows', label: 'Windows/Doors', category: 'Windows & Doors' },
  { value: 'flooring', label: 'Flooring', category: 'Flooring' },
  { value: 'painting', label: 'Painting', category: 'Painting' },
  { value: 'appliances', label: 'Appliances', category: 'Appliances' },
  { value: 'foundation', label: 'Foundation', category: 'Structural' },
  { value: 'insulation', label: 'Insulation', category: 'Insulation' },
  { value: 'other', label: 'Other', category: 'General' }
];

const DEFAULT_LEAD_FEE = 10; // $10 per lead

export default function Maintenance() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  
  // Support both 'propertyId' and 'propertyid' (case-insensitive)
  const propertyId = urlParams.get('propertyId') || urlParams.get('propertyid');
  
  // Check for pre-filled data from AI recommendations
  const prefillData = urlParams.get('prefill');

  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [sendingToProviders, setSendingToProviders] = useState(false);
  const [showNotifyDialog, setShowNotifyDialog] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [formData, setFormData] = useState({
    project_title: '',
    project_description: '',
    project_type: 'repair',
    component_id: '',
    component_type: '',
    urgency: 'medium',
    preferred_timeline: '',
    budget_range: '',
    photo_urls: []
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error('Not authenticated', error);
        setUser(null);
      }
      setLoadingUser(false);
    };
    loadUser();
  }, []);

  // Load pre-filled data if available
  useEffect(() => {
    if (prefillData) {
      try {
        const parsedData = JSON.parse(decodeURIComponent(prefillData));
        setFormData({
          project_title: parsedData.project_title || '',
          project_description: parsedData.project_description || '',
          project_type: parsedData.project_type || 'repair',
          component_id: '', // Component ID cannot be pre-filled as it depends on existing property components.
          component_type: parsedData.component_type || '',
          urgency: parsedData.urgency || 'medium',
          preferred_timeline: '', // Timeline is often dynamic
          budget_range: parsedData.budget_range || '',
          photo_urls: [] // Photos cannot be pre-filled via URL param
        });
        setShowForm(true);
        
        // Remove the prefill parameter from URL to avoid re-filling on refresh
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('prefill');
        window.history.replaceState({}, '', newUrl.toString());
      } catch (error) {
        console.error('Error parsing prefill data:', error);
      }
    }
  }, [prefillData]);

  const { data: property, isLoading: loadingProperty } = useQuery({
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

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects', propertyId],
    queryFn: () => base44.entities.MaintenanceTask.filter({ property_id: propertyId }, '-created_date'),
    enabled: !!propertyId,
    initialData: []
  });

  const { data: serviceProviders } = useQuery({
    queryKey: ['serviceProviders'],
    queryFn: () => base44.entities.ServiceListing.filter({ status: 'active' }),
    initialData: []
  });

  const isOwner = user && property && user.email === property.user_email;
  const isAdmin = user && user.role === 'admin';
  const canAccess = isOwner || isAdmin;

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
      setFormData({ ...formData, photo_urls: [...formData.photo_urls, ...urls] });
    } catch (error) {
      console.error('Upload error:', error);
    }
    setUploadingPhotos(false);
  };

  const removePhoto = (index) => {
    setFormData({
      ...formData,
      photo_urls: formData.photo_urls.filter((_, i) => i !== index)
    });
  };

  const createProjectMutation = useMutation({
    mutationFn: (projectData) => {
      if (!propertyId) {
        throw new Error('Property ID is required');
      }
      return base44.entities.MaintenanceTask.create({
        ...projectData,
        property_id: propertyId
      });
    },
    onSuccess: (newProject) => {
      queryClient.invalidateQueries(['projects']);
      setShowForm(false);
      setFormData({
        project_title: '',
        project_description: '',
        project_type: 'repair',
        component_id: '',
        component_type: '',
        urgency: 'medium',
        preferred_timeline: '',
        budget_range: '',
        photo_urls: []
      });
      
      setSelectedProject(newProject);
      setShowNotifyDialog(true);
    }
  });

  const updateProjectMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MaintenanceTask.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['projects']);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.component_type) {
      alert('Please select a component type');
      return;
    }
    
    const projectData = {
      project_title: formData.project_title,
      project_description: formData.project_description,
      project_type: formData.project_type,
      component_type: formData.component_type,
      component_id: formData.component_id || undefined,
      urgency: formData.urgency,
      preferred_timeline: formData.preferred_timeline,
      budget_range: formData.budget_range,
      photo_urls: formData.photo_urls,
      estimated_cost: formData.budget_range ? parseFloat(formData.budget_range.split('-')[0]) : 0
    };

    createProjectMutation.mutate(projectData);
  };

  const handleNotifyProviders = async () => {
    if (!selectedProject) return;

    setSendingToProviders(true);

    try {
      const componentType = selectedProject.component_type;
      const componentInfo = COMPONENT_TYPES.find(c => c.value === componentType);
      
      console.log('=== EMAIL NOTIFICATION DEBUG VIA RESEND ===');
      console.log('Component Type:', componentType);
      console.log('Component Info:', componentInfo);
      console.log('Looking for category:', componentInfo?.category);
      console.log('All Service Providers:', serviceProviders.length);
      
      // IMPROVED MATCHING - match category OR "General"/"Handyman" providers can handle anything
      const relevantProviders = serviceProviders.filter(provider => {
        if (!provider.service_category || typeof provider.service_category !== 'string') {
          console.log(`❌ Provider ${provider.expert_name} has invalid service_category:`, provider.service_category);
          return false;
        }
        
        if (!componentInfo) {
          console.log('❌ Component info not found for:', componentType);
          return false;
        }
        
        // Match exact category or general/handyman providers
        const categoryLower = provider.service_category.toLowerCase();
        const targetCategoryLower = componentInfo.category.toLowerCase();
        
        const isGeneralProvider = categoryLower.includes('general') || 
                                 categoryLower.includes('handyman') ||
                                 categoryLower.includes('maintenance');
        
        const matchesCategory = categoryLower.includes(targetCategoryLower) ||
                               targetCategoryLower.includes(categoryLower);
        
        const matches = matchesCategory || isGeneralProvider;
        
        console.log(`Provider: ${provider.expert_name} (${provider.service_category}) - Matches: ${matches}`);
        
        return matches;
      });

      console.log(`\n=== Found ${relevantProviders.length} matching providers ===`);

      if (relevantProviders.length === 0) {
        alert(`No service providers found for ${componentInfo?.category || componentType}.\n\nAvailable providers:\n${serviceProviders.map(p => `• ${p.expert_name} - ${p.service_category}`).join('\n')}`);
        setShowNotifyDialog(false);
        setSendingToProviders(false);
        return;
      }

      console.log(`\n=== SENDING ${relevantProviders.length} EMAIL NOTIFICATIONS VIA RESEND ===\n`);

      // Send notifications to each provider AND CREATE LEAD CHARGES
      const results = [];
      const leadCharges = [];
      
      for (const provider of relevantProviders) {
        console.log(`\n--- Notifying: ${provider.expert_name} (${provider.expert_email}) ---`);
        
        // Validate email format
        if (!provider.expert_email || !provider.expert_email.includes('@')) {
          console.error(`❌ Invalid email: ${provider.expert_email}`);
          results.push({ 
            provider: provider.expert_name, 
            email: provider.expert_email,
            success: false, 
            error: 'Invalid email format' 
          });
          continue;
        }

        try {
          // Professional HTML email template
          const htmlEmail = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #1e3a5f; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .section { margin-bottom: 20px; }
    .section-title { font-weight: bold; color: #1e3a5f; margin-bottom: 10px; }
    .detail-box { background-color: white; padding: 15px; border-left: 4px solid #d4af37; margin-bottom: 10px; }
    .button { display: inline-block; padding: 12px 24px; background-color: #d4af37; color: white; text-decoration: none; border-radius: 4px; margin-top: 10px; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔧 New Project Request</h1>
    </div>
    <div class="content">
      <p>Hello <strong>${provider.expert_name}</strong>,</p>
      <p>You have a new maintenance project request through HomeXrei.</p>
      
      <div class="section">
        <div class="section-title">Project Details</div>
        <div class="detail-box">
          <strong>Project:</strong> ${selectedProject.project_title}<br>
          <strong>Type:</strong> ${selectedProject.project_type}<br>
          <strong>Component:</strong> ${selectedProject.component_type}<br>
          <strong>Urgency:</strong> ${selectedProject.urgency}<br>
          <strong>Timeline:</strong> ${selectedProject.preferred_timeline || 'Flexible'}<br>
          <strong>Budget:</strong> ${selectedProject.budget_range ? '$' + selectedProject.budget_range : 'Open to quotes'}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Description</div>
        <div class="detail-box">
          ${selectedProject.project_description.replace(/\n/g, '<br>')}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Property Location</div>
        <div class="detail-box">
          📍 ${property.address}
        </div>
      </div>

      <div class="section">
        <div class="section-title">Client Contact</div>
        <div class="detail-box">
          <strong>Name:</strong> ${user.full_name || user.email}<br>
          <strong>Email:</strong> ${user.email}<br>
          <strong>Phone:</strong> ${user.phone || property.user_phone || 'Not provided'}
        </div>
      </div>

      <div class="section">
        <div class="section-title">💰 Lead Fee Notice</div>
        <div class="detail-box" style="background-color: #fff3cd; border-left-color: #ffc107;">
          This is a qualified lead. A lead fee of <strong>$${DEFAULT_LEAD_FEE}</strong> will be charged to your account.<br>
          You can view your billing details in your Provider Dashboard.
        </div>
      </div>

      <p style="text-align: center;">
        <a href="mailto:${user.email}" class="button">Contact Client</a>
      </p>
    </div>
    <div class="footer">
      <p>This is an automated notification from HomeXrei</p>
      <p>© ${new Date().getFullYear()} HomeXrei. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
          `;

          // Plain text fallback
          const plainTextEmail = `Hello ${provider.expert_name},

You have a new maintenance project request through HomeXrei.

PROJECT: ${selectedProject.project_title}
TYPE: ${selectedProject.project_type}
COMPONENT: ${selectedProject.component_type}
URGENCY: ${selectedProject.urgency}
TIMELINE: ${selectedProject.preferred_timeline || 'Flexible'}
BUDGET: ${selectedProject.budget_range ? '$' + selectedProject.budget_range : 'Open to quotes'}

DESCRIPTION:
${selectedProject.project_description}

PROPERTY LOCATION:
${property.address}

CLIENT CONTACT:
Name: ${user.full_name || user.email}
Email: ${user.email}
Phone: ${user.phone || property.user_phone || 'Not provided'}

TO RESPOND:
Reply to this email or contact the client directly at ${user.email}

LEAD FEE NOTICE:
This is a qualified lead. A lead fee of $${DEFAULT_LEAD_FEE} will be charged to your account.
You can view your billing details in your Provider Dashboard.

Thank you,
HomeXrei Team

---
This is an automated notification from HomeXrei.`;

          // Create message in database
          console.log(`Creating internal message...`);
          await base44.entities.Message.create({
            sender_email: user.email,
            sender_name: user.full_name || user.email,
            recipient_email: provider.expert_email,
            recipient_name: provider.expert_name,
            subject: `New Project Request: ${selectedProject.project_title}`,
            content: plainTextEmail,
            thread_id: `project_${selectedProject.id}_${Date.now()}`,
            reference_type: 'property',
            reference_id: propertyId,
            is_read: false
          });
          console.log(`✅ Internal message created`);

          // Send email via Resend
          console.log(`\n📧 SENDING EMAIL VIA RESEND API:`);
          console.log(`   To: ${provider.expert_email}`);
          console.log(`   Subject: New Project Request - ${selectedProject.project_title}`);
          
          const emailPayload = {
            to: provider.expert_email,
            subject: `New Project Request - ${selectedProject.project_title}`,
            html: htmlEmail,
            text: plainTextEmail,
            from: 'HomeXrei <notifications@homexrei.com>'
          };
          
          console.log(`   Payload:`, emailPayload);
          
          // Call Resend SendEmail
          const emailResult = await base44.integrations.Resend.SendEmail(emailPayload);
          
          console.log(`   Response:`, emailResult);
          console.log(`✅ RESEND EMAIL API CALL COMPLETED\n`);

          // CREATE LEAD CHARGE for this provider
          console.log(`💰 Creating lead charge for ${provider.expert_name}...`);
          const leadCharge = await base44.entities.LeadCharge.create({
            provider_email: provider.expert_email,
            provider_name: provider.expert_name,
            maintenance_task_id: selectedProject.id,
            property_address: property.address,
            project_title: selectedProject.project_title,
            lead_amount: DEFAULT_LEAD_FEE,
            status: 'pending',
            lead_quality: 'qualified'
          });
          leadCharges.push(leadCharge);
          console.log(`✅ Lead charge created: $${DEFAULT_LEAD_FEE}`);

          // Update provider settings (total leads and billing)
          const providerSettings = await base44.entities.ProviderSettings.filter({ 
            provider_email: provider.expert_email 
          });
          
          if (providerSettings.length > 0) {
            const settings = providerSettings[0];
            await base44.entities.ProviderSettings.update(settings.id, {
              total_leads_received: (settings.total_leads_received || 0) + 1,
              total_amount_billed: (settings.total_amount_billed || 0) + DEFAULT_LEAD_FEE
            });
          } else {
            // Create new provider settings
            await base44.entities.ProviderSettings.create({
              provider_email: provider.expert_email,
              total_leads_received: 1,
              total_amount_billed: DEFAULT_LEAD_FEE,
              status: 'active'
            });
          }
          
          // Wait 1 second between emails to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          results.push({ provider: provider.expert_name, email: provider.expert_email, success: true });

        } catch (error) {
          console.error(`❌ ERROR for ${provider.expert_name}:`);
          console.error(`   Message:`, error.message);
          console.error(`   Full error:`, error);
          results.push({ 
            provider: provider.expert_name, 
            email: provider.expert_email,
            success: false, 
            error: error.message || 'Unknown error' 
          });
        }
      }

      console.log(`\n=== NOTIFICATION RESULTS ===`);
      console.log(`✅ Successful: ${results.filter(r => r.success).length}`);
      console.log(`❌ Failed: ${results.filter(r => !r.success).length}`);
      console.log(`💰 Lead charges created: ${leadCharges.length} x $${DEFAULT_LEAD_FEE} = $${leadCharges.length * DEFAULT_LEAD_FEE}`);

      // Send confirmation email to property owner via Resend
      try {
        console.log(`\n📧 Sending confirmation to owner (${user.email}) via Resend...`);
        const totalLeadFees = leadCharges.length * DEFAULT_LEAD_FEE;
        
        const ownerHtmlEmail = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #1e3a5f; color: white; padding: 20px; text-align: center; }
    .content { padding: 20px; background-color: #f9f9f9; }
    .success-box { background-color: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin-bottom: 20px; }
    .provider-list { background-color: white; padding: 15px; margin-bottom: 15px; }
    .provider-item { padding: 10px; border-bottom: 1px solid #eee; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Project Notifications Sent</h1>
    </div>
    <div class="content">
      <div class="success-box">
        <strong>Success!</strong> Your maintenance project has been sent to ${relevantProviders.length} service provider(s).
      </div>

      <h3>Project: ${selectedProject.project_title}</h3>

      <h4>Notified Providers:</h4>
      <div class="provider-list">
        ${relevantProviders.map(p => `
          <div class="provider-item">
            <strong>${p.expert_name}</strong><br>
            📧 ${p.expert_email}<br>
            ${p.expert_phone ? `📞 ${p.expert_phone}` : 'No phone provided'}
          </div>
        `).join('')}
      </div>

      <h4>Next Steps:</h4>
      <ul>
        <li>Service providers will contact you directly at <strong>${user.email}</strong></li>
        <li>Check your email (and spam folder) for responses</li>
        <li>Providers typically respond within 24-48 hours</li>
      </ul>

      <p style="font-size: 12px; color: #666;">
        <strong>Note:</strong> Lead fees (${leadCharges.length} x $${DEFAULT_LEAD_FEE} = $${totalLeadFees}) are charged to service providers, not you.
      </p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} HomeXrei. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
        `;

        await base44.integrations.Resend.SendEmail({
          to: user.email,
          subject: `Confirmation - Project Notifications Sent`,
          html: ownerHtmlEmail,
          text: `Hi ${user.full_name || user.email},

Your maintenance project "${selectedProject.project_title}" has been sent to ${relevantProviders.length} service provider(s).

NOTIFIED PROVIDERS:
${relevantProviders.map(p => `• ${p.expert_name} - ${p.expert_email} - ${p.expert_phone || 'No phone'}`).join('\n')}

LEAD FEES CHARGED:
${leadCharges.length} leads x $${DEFAULT_LEAD_FEE} = $${totalLeadFees}
(These fees are charged to service providers, not you)

NEXT STEPS:
- Service providers will contact you directly at ${user.email}
- Check your email (and spam folder) for responses
- Providers typically respond within 24-48 hours

If you don't hear back, you can contact providers directly using the information above.

Best regards,
HomeXrei Team`,
          from: 'HomeXrei <notifications@homexrei.com>'
        });
        console.log('✅ Confirmation email sent to owner via Resend');
      } catch (error) {
        console.error('❌ Failed to send confirmation email:', error);
      }

      // Update project
      await base44.entities.MaintenanceTask.update(selectedProject.id, {
        sent_to_providers: relevantProviders.map(p => p.expert_email)
      });

      await queryClient.invalidateQueries(['projects']);

      // Show results
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      const totalLeadRevenue = leadCharges.length * DEFAULT_LEAD_FEE;

      let resultMessage = `EMAIL NOTIFICATIONS SENT VIA RESEND!\n\n`;
      resultMessage += `Successfully sent: ${successCount} email(s)\n`;
      resultMessage += `Lead fees charged: $${totalLeadRevenue} (${leadCharges.length} x $${DEFAULT_LEAD_FEE})\n\n`;
      
      if (successCount > 0) {
        resultMessage += `Sent to:\n${results.filter(r => r.success).map(r => `✓ ${r.provider} (${r.email})`).join('\n')}\n\n`;
      }
      
      if (failCount > 0) {
        resultMessage += `Failed: ${failCount}\n`;
        results.filter(r => !r.success).forEach(r => {
          resultMessage += `✗ ${r.provider}: ${r.error}\n`;
        });
        resultMessage += `\n`;
      }

      resultMessage += `IMPORTANT:\n`;
      resultMessage += `1. Check SPAM/JUNK folder\n`;
      resultMessage += `2. Professional emails sent via Resend\n`;
      resultMessage += `3. You'll receive a confirmation email\n`;
      resultMessage += `4. Providers will contact you directly\n\n`;
      resultMessage += `If providers don't receive emails, they can check their HomeXrei Messages inbox.`;

      alert(resultMessage);
      setShowNotifyDialog(false);
      setSelectedProject(null);

    } catch (error) {
      console.error('❌ FATAL ERROR:', error);
      alert(`Error: ${error.message}\n\nCheck browser console (F12) for details.`);
    }

    setSendingToProviders(false);
  };

  const getUrgencyColor = (urgency) => {
    const colors = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800'
    };
    return colors[urgency] || colors.medium;
  };

  const getStatusColor = (status) => {
    const colors = {
      open: 'bg-purple-100 text-purple-800',
      quoted: 'bg-blue-100 text-blue-800',
      scheduled: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-orange-100 text-orange-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || colors.open;
  };

  if (loadingUser || loadingProperty) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  if (!canAccess) {
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
                You don't have permission to view this property's maintenance projects.
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <Navigation user={user} />
      
      <div className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Link to={createPageUrl('Dashboard')}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-[#1e3a5f]">Maintenance Projects</h1>
              <p className="text-gray-600">{property?.address}</p>
            </div>
            <Button onClick={() => setShowForm(!showForm)} className="bg-[#d4af37] hover:bg-[#c49d2a]">
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          </div>

          {showForm && (
            <Card className="p-6 mb-8 shadow-xl">
              <h2 className="text-xl font-bold text-[#1e3a5f] mb-4">Create Maintenance Project</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="project_type">Project Type *</Label>
                    <Select
                      value={formData.project_type}
                      onValueChange={(value) => setFormData({ ...formData, project_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROJECT_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.icon} {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="component_type">Component Type *</Label>
                    <Select
                      value={formData.component_type}
                      onValueChange={(value) => setFormData({ ...formData, component_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select component" />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPONENT_TYPES.map(comp => (
                          <SelectItem key={comp.value} value={comp.value}>
                            {comp.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {components.length > 0 && (
                  <div>
                    <Label htmlFor="component_id">Existing Component (Optional)</Label>
                    <Select
                      value={formData.component_id}
                      onValueChange={(value) => setFormData({ ...formData, component_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select if applicable" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>None - New component</SelectItem>
                        {components.map(comp => (
                          <SelectItem key={comp.id} value={comp.id}>
                            {comp.component_type} - {comp.current_condition}
                            {comp.serial_number && ` (${comp.serial_number})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label htmlFor="project_title">Project Title *</Label>
                  <Input
                    id="project_title"
                    value={formData.project_title}
                    onChange={(e) => setFormData({ ...formData, project_title: e.target.value })}
                    placeholder="e.g., Fix leaking kitchen faucet"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="project_description">Description *</Label>
                  <Textarea
                    id="project_description"
                    value={formData.project_description}
                    onChange={(e) => setFormData({ ...formData, project_description: e.target.value })}
                    rows={4}
                    placeholder="Describe what needs to be done, any issues you've noticed, and any specific requirements..."
                    required
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="urgency">Urgency *</Label>
                    <Select
                      value={formData.urgency}
                      onValueChange={(value) => setFormData({ ...formData, urgency: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="preferred_timeline">Preferred Timeline</Label>
                    <Input
                      id="preferred_timeline"
                      value={formData.preferred_timeline}
                      onChange={(e) => setFormData({ ...formData, preferred_timeline: e.target.value })}
                      placeholder="e.g., Within 1 week"
                    />
                  </div>

                  <div>
                    <Label htmlFor="budget_range">Budget Range ($)</Label>
                    <Input
                      id="budget_range"
                      value={formData.budget_range}
                      onChange={(e) => setFormData({ ...formData, budget_range: e.target.value })}
                      placeholder="e.g., 500-1000"
                    />
                  </div>
                </div>

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
                      disabled={uploadingPhotos}
                    />
                    <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg text-sm w-fit">
                      {uploadingPhotos ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                      <span>{uploadingPhotos ? 'Uploading...' : 'Add Photos'}</span>
                    </div>
                  </label>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-[#1e3a5f] hover:bg-[#2a4a7f]"
                    disabled={createProjectMutation.isLoading}
                  >
                    {createProjectMutation.isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Creating...
                      </>
                    ) : (
                      'Create Project'
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          <div className="space-y-4">
            {projects.length === 0 ? (
              <Card className="p-12 text-center">
                <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No maintenance projects yet</h3>
                <p className="text-gray-500">Create your first project to get started</p>
              </Card>
            ) : (
              projects.map((project) => (
                <Card key={project.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-[#1e3a5f]">{project.project_title}</h3>
                        <Badge variant="outline" className="capitalize">
                          {PROJECT_TYPES.find(t => t.value === project.project_type)?.icon} {project.project_type}
                        </Badge>
                        <Badge className={getUrgencyColor(project.urgency)}>
                          {project.urgency}
                        </Badge>
                        <Badge className={getStatusColor(project.status)}>
                          {project.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-3 text-sm text-gray-600">
                        <Wrench className="w-4 h-4" />
                        <span className="capitalize">{project.component_type}</span>
                      </div>

                      {project.project_description && (
                        <p className="text-gray-700 mb-3 whitespace-pre-line">{project.project_description}</p>
                      )}

                      {project.photo_urls?.length > 0 && (
                        <div className="flex gap-2 mb-3 overflow-x-auto">
                          {project.photo_urls.map((url, idx) => (
                            <img
                              key={idx}
                              src={url}
                              alt=""
                              className="w-20 h-20 object-cover rounded"
                            />
                          ))}
                        </div>
                      )}

                      <div className="flex items-center gap-6 text-sm text-gray-500 flex-wrap">
                        {project.preferred_timeline && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Timeline: {project.preferred_timeline}
                          </span>
                        )}
                        {project.budget_range && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            Budget: ${project.budget_range}
                          </span>
                        )}
                        {project.sent_to_providers?.length > 0 && (
                          <span className="flex items-center gap-1 text-green-600">
                            <Send className="w-4 h-4" />
                            Sent to {project.sent_to_providers.length} provider{project.sent_to_providers.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {project.status === 'open' && !project.sent_to_providers?.length && (
                        <Button
                          size="sm"
                          className="bg-[#d4af37] hover:bg-[#c49d2a]"
                          onClick={() => {
                            setSelectedProject(project);
                            setShowNotifyDialog(true);
                          }}
                        >
                          <Send className="w-4 h-4 mr-1" />
                          Notify Providers
                        </Button>
                      )}
                      
                      {project.status !== 'completed' && project.status !== 'cancelled' && (
                        <Select
                          value={project.status}
                          onValueChange={(value) => updateProjectMutation.mutate({ 
                            id: project.id, 
                            data: { 
                              status: value,
                              completed_date: value === 'completed' ? new Date().toISOString().split('T')[0] : null
                            }
                          })}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="quoted">Quoted</SelectItem>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Notify Service Providers Dialog */}
      <Dialog open={showNotifyDialog} onOpenChange={setShowNotifyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-[#d4af37]" />
              Notify Service Providers
            </DialogTitle>
            <DialogDescription>
              Send emails and messages to all relevant service providers in your area
            </DialogDescription>
          </DialogHeader>

          {selectedProject && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-[#1e3a5f] mb-2">{selectedProject.project_title}</h3>
                <p className="text-sm text-gray-600 mb-2">{selectedProject.project_description}</p>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline">{selectedProject.component_type}</Badge>
                  <Badge className={getUrgencyColor(selectedProject.urgency)}>{selectedProject.urgency}</Badge>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  <strong>What happens next:</strong>
                </p>
                <ul className="text-sm text-gray-700 mt-2 space-y-1">
                  <li>✉️ We'll send <strong>actual emails</strong> to all matching service providers</li>
                  <li>💬 Messages will also be saved in their HomeXrei inbox</li>
                  <li>📧 You'll receive a confirmation email with the list of notified providers</li>
                  <li>🔔 Interested providers will contact you directly via email</li>
                  <li>📥 All communications will be tracked in your Messages inbox</li>
                </ul>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowNotifyDialog(false)}
                  disabled={sendingToProviders}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleNotifyProviders}
                  disabled={sendingToProviders}
                  className="bg-[#d4af37] hover:bg-[#c49d2a]"
                >
                  {sendingToProviders ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Sending Emails...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Email Notifications
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
