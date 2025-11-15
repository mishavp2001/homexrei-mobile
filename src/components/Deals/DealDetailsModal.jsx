
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Home, Wrench, MapPin, Phone, Mail, Bed, Bath, Maximize, MessageSquare, Send, Loader2, Video, Sparkles, Download, Share2, Play, DollarSign } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import VideoPlayer from '../VideoPlayer';
import OfferForm from './OfferForm';

export default function DealDetailsModal({ deal, isOpen, onClose, isOwner, onEdit, currentUser }) {
  const queryClient = useQueryClient();
  const [showContactForm, setShowContactForm] = useState(false);
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [videoError, setVideoError] = useState('');
  const [messageData, setMessageData] = useState({
    subject: '',
    content: ''
  });
  
  // New states for Make Offer
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [submittingOffer, setSubmittingOffer] = useState(false);

  const sendMessageMutation = useMutation({
    mutationFn: (data) => base44.entities.Message.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['messages']);
      setShowContactForm(false);
      setMessageData({ subject: '', content: '' });
      alert('Message sent successfully!');
    }
  });

  const handleSendMessage = () => {
    if (!currentUser) {
      base44.auth.redirectToLogin(window.location.href);
      return;
    }

    if (!messageData.subject.trim() || !messageData.content.trim()) {
      alert('Please fill in both subject and message');
      return;
    }

    const threadId = `deal_${deal.id}_${Date.now()}`;

    sendMessageMutation.mutate({
      sender_email: currentUser.email,
      sender_name: currentUser.full_name || currentUser.email,
      recipient_email: deal.user_email,
      recipient_name: deal.user_email,
      subject: messageData.subject,
      content: messageData.content,
      thread_id: threadId,
      reference_type: 'deal',
      reference_id: deal.id,
      is_read: false
    });
  };

  const handleGenerateVideo = async () => {
    if (!deal || !deal.photo_urls || deal.photo_urls.length === 0) {
      setVideoError('Please add photos to your listing before generating a video');
      return;
    }

    const isRegenerate = !!deal.video_url;
    const confirmMessage = isRegenerate 
      ? 'Regenerate marketing video? This will replace your current video. This may take 1-2 minutes.'
      : 'Generate a marketing video for this property? This may take 1-2 minutes.';

    if (!confirm(confirmMessage)) {
      return;
    }

    setGeneratingVideo(true);
    setVideoError('');

    try {
      console.log('🎬 Starting video generation for deal:', deal.id);
      
      const response = await base44.functions.invoke('generatePropertyVideo', {
        dealId: deal.id
      });

      console.log('Video generation response:', response);

      if (response.data.success) {
        alert('✅ Video generated successfully! It will appear in your listing shortly.');
        queryClient.invalidateQueries(['deal']);
        queryClient.invalidateQueries(['deals']);
      } else {
        throw new Error(response.data.error || 'Failed to generate video');
      }

    } catch (error) {
      console.error('Video generation error:', error);
      setVideoError(error.message || 'Failed to generate video. Please try again.');
    }

    setGeneratingVideo(false);
  };

  const handleDownloadVideo = () => {
    if (deal?.video_url) {
      window.open(deal.video_url, '_blank');
    }
  };

  // New mutation for creating offers
  const createOfferMutation = useMutation({
    mutationFn: async (offerData) => {
      setSubmittingOffer(true);
      try {
        console.log('=== CREATING OFFER ===');
        
        const offer = await base44.entities.Offer.create(offerData);
        console.log('✅ Offer created:', offer.id);
        
        console.log('Generating offer PDF...');
        const pdfResponse = await base44.functions.invoke('generateOfferPDF', {
          offerId: offer.id
        });
        
        if (!pdfResponse.data.success) {
          throw new Error('Failed to generate PDF');
        }
        console.log('✅ PDF generated:', pdfResponse.data.pdfUrl);
        
        const emailSubject = `New Purchase Offer - ${deal.location}`;
        const emailBody = `You have received a new purchase offer for your property!

PROPERTY: ${deal.title}
ADDRESS: ${deal.location}
OFFER AMOUNT: $${offerData.offer_amount.toLocaleString()}
BUYER: ${offerData.buyer_name}

OFFER DETAILS:
- Financing Type: ${offerData.financing_type.replace(/_/g, ' ')}
- Down Payment: ${offerData.down_payment_percent}%
- Earnest Money: $${offerData.earnest_money_deposit.toLocaleString()}
- Proposed Closing: ${format(new Date(offerData.closing_date), 'MMMM d, yyyy')}
- Offer Expires: ${format(new Date(offerData.expiration_date), 'MMMM d, yyyy')}

CONTINGENCIES:
${offerData.inspection_contingency ? `✓ Inspection (${offerData.inspection_period_days} days)` : ''}
${offerData.appraisal_contingency ? '✓ Appraisal' : ''}
${offerData.financing_contingency ? '✓ Financing' : ''}

📄 View formal offer document: ${pdfResponse.data.pdfUrl}

Review and respond to this offer in your dashboard:
${window.location.origin}/dashboard

---
This is an automated message from HomeXREI.
`;

        console.log('Sending email to property owner...');
        await base44.integrations.Core.SendEmail({
          to: deal.user_email,
          subject: emailSubject,
          body: emailBody
        });
        console.log('✅ Email sent to owner');
        
        console.log('Creating in-app message...');
        await base44.entities.Message.create({
          sender_email: currentUser.email,
          sender_name: offerData.buyer_name,
          recipient_email: deal.user_email,
          recipient_name: deal.user_email,
          subject: emailSubject,
          content: emailBody,
          thread_id: `offer_${offer.id}_${Date.now()}`,
          reference_type: 'deal',
          reference_id: deal.id,
          is_read: false
        });
        console.log('✅ In-app message sent');
        
        console.log('✅ OFFER SUBMISSION COMPLETED');
        return offer;
        
      } catch (error) {
        console.error('❌ Offer submission error:', error);
        throw error;
      } finally {
        setSubmittingOffer(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['offers']);
      alert('✅ Offer submitted successfully!\n\nYour formal offer has been sent to the property owner. They will review and respond within the expiration period. You can track the status in your dashboard.');
      setShowOfferForm(false);
    },
    onError: (error) => {
      console.error('Failed to submit offer:', error);
      alert('Failed to submit offer. Please try again.');
    }
  });

  const handleOfferSubmit = (offerData) => {
    if (!currentUser) {
      alert('Please sign in to make an offer');
      base44.auth.redirectToLogin(window.location.href);
      return;
    }
    
    createOfferMutation.mutate(offerData);
  };

  const calculateMonthlyPayment = (principal, annualRate, years) => {
    const monthlyRate = annualRate / 100 / 12;
    const numPayments = years * 12;
    if (monthlyRate === 0) return principal / numPayments;
    if (numPayments === 0) return principal;

    const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
    return isNaN(monthlyPayment) || !isFinite(monthlyPayment) ? 0 : monthlyPayment;
  };

  const getFinancingCalculations = () => {
    if (!deal || !deal.owner_financing_available) return null;

    const price = deal.price;
    if (typeof price !== 'number' || price <= 0) return null;

    let downPayment = 0;

    if (deal.min_down_payment_amount && typeof deal.min_down_payment_amount === 'number') {
      downPayment = deal.min_down_payment_amount;
    } else if (deal.min_down_payment_percent && typeof deal.min_down_payment_percent === 'number') {
      downPayment = (price * deal.min_down_payment_percent) / 100;
    }
    downPayment = Math.max(0, Math.min(downPayment, price));

    const principal = price - downPayment;
    const interestRate = deal.interest_rate || 0;
    const termYears = deal.term_years || 1;

    const monthlyPI = calculateMonthlyPayment(principal, interestRate, termYears);
    
    const monthlyTax = deal.property_tax_annual && typeof deal.property_tax_annual === 'number' ? deal.property_tax_annual / 12 : 0;
    const monthlyInsurance = deal.insurance_annual && typeof deal.insurance_annual === 'number' ? deal.insurance_annual / 12 : 0;
    const monthlyHOA = deal.hoa_monthly && typeof deal.hoa_monthly === 'number' ? deal.hoa_monthly : 0;
    const otherExpenses = deal.other_monthly_expenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0;
    
    const totalMonthly = monthlyPI + monthlyTax + monthlyInsurance + monthlyHOA + otherExpenses;

    return {
      price,
      downPayment,
      principal,
      monthlyPI,
      monthlyTax,
      monthlyInsurance,
      monthlyHOA,
      otherExpenses,
      totalMonthly,
      interestRate,
      termYears
    };
  };

  if (!deal) return null;

  const isProperty = ['sale', 'long_term_rent', 'short_term_rent'].includes(deal.deal_type);
  const financing = getFinancingCalculations();
  const isShortTerm = deal.deal_type === 'short_term_rent';
  const isSale = deal.deal_type === 'sale';

  const getDealTypeLabel = () => {
    switch (deal.deal_type) {
      case 'sale':
        return 'Property Sale';
      case 'long_term_rent':
        return 'Long-Term Rent';
      case 'short_term_rent':
        return 'Airbnb';
      case 'service_deal':
        return 'Service Deal';
      default:
        return deal.deal_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Deal';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#1e3a5f]">{deal.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Video Section */}
          {deal.video_url && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-[#1e3a5f] flex items-center gap-2">
                  🎬 Marketing Video
                </h3>
                <div className="flex gap-2">
                  {isOwner && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleGenerateVideo}
                      disabled={generatingVideo}
                    >
                      {generatingVideo ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Video className="w-4 h-4 mr-2" />
                          Regenerate
                        </>
                      )}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDownloadVideo}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Open
                  </Button>
                </div>
              </div>
              <VideoPlayer 
                videoUrl={deal.video_url} 
                posterUrl={deal.photo_urls?.[0]}
              />
              {deal.video_generated_date && (
                <p className="text-xs text-gray-500 mt-2">
                  Generated on {new Date(deal.video_generated_date).toLocaleDateString()}
                </p>
              )}
              {videoError && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{videoError}</p>
                </div>
              )}
            </div>
          )}

          {/* Video Generation Section */}
          {isOwner && !deal.video_url && (
            <Card className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Video className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-[#1e3a5f] mb-2">
                    Generate AI Marketing Video
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Create a professional property video using your photos and listing details. 
                    Great for social media and marketing!
                  </p>
                  {videoError && (
                    <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800">{videoError}</p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      onClick={handleGenerateVideo}
                      disabled={generatingVideo || !deal.photo_urls?.length}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {generatingVideo ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Generating Video...
                        </>
                      ) : (
                        <>
                          <Video className="w-4 h-4 mr-2" />
                          Generate Video
                        </>
                      )}
                    </Button>
                    {!deal.photo_urls?.length && (
                      <p className="text-xs text-gray-500 self-center">
                        Add photos first to generate a video
                      </p>
                    )}
                  </div>
                  {generatingVideo && (
                    <p className="text-xs text-gray-500 mt-2">
                      ⏱️ This may take 1-2 minutes. Please wait...
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Photo Gallery */}
          {deal.photo_urls?.length > 0 && (
            <div>
              <div className="bg-black rounded-lg overflow-hidden mb-3">
                <img
                  src={deal.photo_urls[0]}
                  alt={deal.title}
                  className="w-full h-64 object-contain"
                />
              </div>
              {deal.photo_urls.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {deal.photo_urls.slice(1, 5).map((url, idx) => (
                    <div key={idx} className="bg-black rounded overflow-hidden">
                      <img
                        src={url}
                        alt={`${deal.title} ${idx + 2}`}
                        className="w-full h-20 object-contain"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Price & Status */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">
                {getDealTypeLabel()}
                {deal.owner_financing_available && (
                  <Badge className="ml-2 bg-[#d4af37] text-white">
                    💰 Owner Financing Available
                  </Badge>
                )}
              </p>
              {isShortTerm && !deal.price_per_night ? (
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-gray-700">Booking via External Platform</p>
                  <p className="text-sm text-gray-600">See booking links below for pricing and availability</p>
                </div>
              ) : (
                <p className="text-4xl font-bold text-[#d4af37]">
                  {deal.deal_type === 'short_term_rent' && deal.price_per_night ? (
                    `$${deal.price_per_night?.toLocaleString()}/night`
                  ) : deal.deal_type === 'long_term_rent' ? (
                    `$${deal.price?.toLocaleString()}/mo`
                  ) : (
                    `$${deal.price?.toLocaleString()}`
                  )}
                </p>
              )}
            </div>
            <Badge className={
              deal.status === 'active' ? 'bg-green-100 text-green-800' :
              deal.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              ['sold', 'rented'].includes(deal.status) ? 'bg-gray-100 text-gray-800' :
              'bg-red-100 text-red-800'
            }>
              {deal.status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Badge>
          </div>

          {/* Make Offer Button */}
          {isSale && !isOwner && (
            <Button
              className="w-full bg-[#d4af37] hover:bg-[#c49d2a]"
              onClick={() => {
                if (!currentUser) {
                  alert('Please sign in to make an offer');
                  base44.auth.redirectToLogin(window.location.href);
                  return;
                }
                setShowOfferForm(true);
              }}
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Make an Offer
            </Button>
          )}

          {/* Owner Financing Calculator */}
          {financing && (
            <div className="border-2 border-[#d4af37] rounded-lg p-6 bg-gradient-to-r from-[#d4af37]/5 to-[#d4af37]/10">
              <h3 className="text-xl font-bold text-[#1e3a5f] mb-4 flex items-center gap-2">
                💰 Owner Financing Calculator
              </h3>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sale Price:</span>
                    <span className="font-semibold">${financing.price.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Down Payment:</span>
                    <span className="font-semibold">${financing.downPayment.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Loan Amount:</span>
                    <span className="font-semibold">${financing.principal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Interest Rate:</span>
                    <span className="font-semibold">{financing.interestRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Term:</span>
                    <span className="font-semibold">{financing.termYears} years</span>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 space-y-2">
                  <h4 className="font-semibold text-[#1e3a5f] mb-3">Monthly Payment Breakdown:</h4>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Principal & Interest:</span>
                    <span className="font-semibold">${financing.monthlyPI.toFixed(2)}</span>
                  </div>
                  {financing.monthlyTax > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Property Tax:</span>
                      <span className="font-semibold">${financing.monthlyTax.toFixed(2)}</span>
                    </div>
                  )}
                  {financing.monthlyInsurance > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Insurance:</span>
                      <span className="font-semibold">${financing.monthlyInsurance.toFixed(2)}</span>
                    </div>
                  )}
                  {financing.monthlyHOA > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">HOA:</span>
                      <span className="font-semibold">${financing.monthlyHOA.toFixed(2)}</span>
                    </div>
                  )}
                  {deal.other_monthly_expenses?.map((expense, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-600">{expense.name}:</span>
                      <span className="font-semibold">${(expense.amount || 0).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-gray-200 flex justify-between font-bold text-lg">
                    <span className="text-[#1e3a5f]">Total Monthly:</span>
                    <span className="text-[#d4af37]">${financing.totalMonthly.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-500 mt-4 text-center">
                * This is an estimate. Actual payments may vary. Property taxes and insurance are approximate.
              </p>
            </div>
          )}

          {/* Property Details */}
          {isProperty && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
              {deal.property_type && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Type</p>
                  <p className="font-semibold capitalize">{deal.property_type.replace(/_/g, ' ')}</p>
                </div>
              )}
              {deal.bedrooms && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Bedrooms</p>
                  <p className="font-semibold flex items-center gap-1">
                    <Bed className="w-4 h-4" />
                    {deal.bedrooms}
                  </p>
                </div>
              )}
              {deal.bathrooms && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Bathrooms</p>
                  <p className="font-semibold flex items-center gap-1">
                    <Bath className="w-4 h-4" />
                    {deal.bathrooms}
                  </p>
                </div>
              )}
              {deal.sqft && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Square Feet</p>
                  <p className="font-semibold flex items-center gap-1">
                    <Maximize className="w-4 h-4" />
                    {deal.sqft.toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Service Category */}
          {!isProperty && deal.service_category && (
            <div>
              <p className="text-sm text-gray-600 mb-2">Service Category</p>
              <Badge variant="outline" className="text-base px-4 py-2">
                {deal.service_category}
              </Badge>
            </div>
          )}

          {/* Description */}
          <div>
            <p className="text-sm text-gray-600 mb-2 font-semibold">Description</p>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
              {deal.description}
            </p>
          </div>

          {/* Location */}
          <div>
            <p className="text-sm text-gray-600 mb-2 font-semibold">Location</p>
            <div className="flex items-start gap-2 text-gray-700">
              <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0 text-[#1e3a5f]" />
              <span>{deal.location}</span>
            </div>
          </div>

          {/* Contact Info */}
          <div className="border-t pt-6">
            <p className="text-sm text-gray-600 mb-4 font-semibold">Contact Seller</p>
            
            {!showContactForm ? (
              <div className="flex flex-wrap gap-3">
                {deal.contact_phone && (
                  <Button variant="outline" asChild>
                    <a href={`tel:${deal.contact_phone}`}>
                      <Phone className="w-4 h-4 mr-2" />
                      {deal.contact_phone}
                    </a>
                  </Button>
                )}
                <Button variant="outline" asChild>
                  <a href={`mailto:${deal.contact_email || deal.user_email}`}>
                    <Mail className="w-4 h-4 mr-2" />
                    {deal.contact_email || deal.user_email}
                  </a>
                </Button>
                {!isOwner && (
                  <Button 
                    className="bg-[#1e3a5f] hover:bg-[#2a4a7f]"
                    onClick={() => setShowContactForm(true)}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Send Message
                  </Button>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div>
                  <Label>Subject</Label>
                  <Input
                    value={messageData.subject}
                    onChange={(e) => setMessageData({ ...messageData, subject: e.target.value })}
                    placeholder={`Inquiry about: ${deal.title}`}
                  />
                </div>
                <div>
                  <Label>Message</Label>
                  <Textarea
                    value={messageData.content}
                    onChange={(e) => setMessageData({ ...messageData, content: e.target.value })}
                    rows={4}
                    placeholder="Write your message here..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleSendMessage}
                    disabled={sendMessageMutation.isLoading}
                    className="bg-[#1e3a5f] hover:bg-[#2a4a7f]"
                  >
                    {sendMessageMutation.isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Send Message
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setShowContactForm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Owner Actions */}
          {isOwner && (
            <div className="border-t pt-6">
              <Button 
                onClick={() => {
                  onClose();
                  onEdit(deal);
                }}
                className="w-full bg-[#1e3a5f] hover:bg-[#2a4a7f]"
              >
                Edit This Deal
              </Button>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Make Offer Dialog - Nested */}
      {showOfferForm && (
        <Dialog open={showOfferForm} onOpenChange={setShowOfferForm}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-[#1e3a5f]">
                Make an Offer
              </DialogTitle>
              <p className="text-sm text-gray-600 mt-1">
                Submit a formal purchase offer for {deal?.location}
              </p>
            </DialogHeader>

            {submittingOffer ? (
              <div className="py-12 text-center">
                <Loader2 className="w-12 h-12 animate-spin text-[#1e3a5f] mx-auto mb-4" />
                <p className="text-gray-600">
                  Processing your offer and generating documents...
                </p>
              </div>
            ) : (
              <OfferForm
                deal={deal}
                currentUser={currentUser}
                onSubmit={handleOfferSubmit}
                onCancel={() => setShowOfferForm(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}
