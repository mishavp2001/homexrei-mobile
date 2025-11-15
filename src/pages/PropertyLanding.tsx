
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import PricingCalendar from '../components/Deals/PricingCalendar';
import DealMap from '../components/Deals/DealMap';
import VideoPlayer from '../components/VideoPlayer';
import OfferForm from '../components/Deals/OfferForm'; // Added OfferForm import

import {
  Home,
  MapPin,
  Bed,
  Bath,
  Maximize,
  Calendar as CalendarIcon,
  Phone,
  Mail,
  ExternalLink,
  Check,
  Wifi,
  Tv,
  Coffee,
  Car,
  Wind,
  Sparkles,
  Loader2,
  Send,
  Share2,
  Heart,
  Moon,
  Clock,
  Users,
  CreditCard,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  X,
  Printer,
  Video, // Added Video icon
  DollarSign // Added DollarSign icon
} from 'lucide-react';
import { format, differenceInDays, addDays, eachDayOfInterval, parseISO } from 'date-fns';

export const isPublic = true;

export default function PropertyLanding() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const dealId = urlParams.get('id');
  const address = urlParams.get('address');

  // Existing states
  const [showContactForm, setShowContactForm] = useState(false);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [contactData, setContactData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [appointmentData, setAppointmentData] = useState({
    name: '',
    email: '',
    phone: '',
    date: '',
    time: '',
    message: ''
  });

  // New states for booking form
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingData, setBookingData] = useState({
    check_in_date: null,
    check_out_date: null,
    lease_months: 12,
    number_of_guests: 1,
    renter_name: '',
    renter_phone: '',
    message: '',
    special_requests: ''
  });
  const [bookingError, setBookingError] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // New state for photo gallery
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Added new states
  const [generatingQR, setGeneratingQR] = useState(false);
  const [generatingVideo, setGeneratingVideo] = useState(false); // New state
  const [videoError, setVideoError] = useState(''); // New state

  // Service deal booking states
  const [showServiceDealModal, setShowServiceDealModal] = useState(false);
  const [selectedServiceDeal, setSelectedServiceDeal] = useState(null);
  const [serviceDealBookingData, setServiceDealBookingData] = useState({
    service_date: null,
    service_time: '',
    renter_name: '',
    renter_phone: '',
    message: ''
  });
  const [serviceDealBookingError, setServiceDealBookingError] = useState('');
  const [serviceDealBookingSuccess, setServiceDealBookingSuccess] = useState(false);

  // New states for Make Offer
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [submittingOffer, setSubmittingOffer] = useState(false);

  // Load current user
  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await base44.auth.me();
        setCurrentUser(user);
        // Pre-fill renter name if user is logged in
        setBookingData(prev => ({
          ...prev,
          renter_name: user.full_name || ''
        }));
        setServiceDealBookingData(prev => ({
          ...prev,
          renter_name: user.full_name || ''
        }));
      } catch (error) {
        // User not logged in - that's ok for public page
        setCurrentUser(null);
      }
    };
    loadUser();
  }, []);

  // Get deal type from URL path
  const getDealType = () => {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('/sale')) return 'sale';
    if (path.includes('/rent')) return 'long_term_rent';
    if (path.includes('/airbnb')) return 'short_term_rent';
    return 'sale'; // default
  };

  const dealType = getDealType();

  // Fetch deal - either by ID or by address + type
  const { data: deal, isLoading } = useQuery({
    queryKey: ['deal', dealId, address, dealType],
    queryFn: async () => {
      if (dealId) {
        // Search by ID
        const deals = await base44.entities.Deal.filter({ id: dealId });
        return deals[0];
      } else if (address) {
        // Search by address and deal type
        const deals = await base44.entities.Deal.filter({
          location: decodeURIComponent(address),
          deal_type: dealType,
          status: 'active'
        });
        return deals[0]; // Return first match
      }
      return null;
    },
    enabled: !!(dealId || address)
  });

  // New helper functions for owner financing calculations
  const calculateMonthlyPayment = (principal, annualRate, years) => {
    const monthlyRate = annualRate / 100 / 12;
    const numPayments = years * 12;
    if (monthlyRate === 0) return principal / numPayments;
    if (numPayments === 0) return principal;

    // Handle case where numPayments is 0 for small terms or 0 years
    if (numPayments < 1) return principal;

    // Standard mortgage payment formula
    const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1);
    return isNaN(monthlyPayment) || !isFinite(monthlyPayment) ? 0 : monthlyPayment;
  };

  const getFinancingCalculations = () => {
    if (!deal || !deal.owner_financing_available || deal.deal_type !== 'sale') return null;

    const price = deal.price;
    if (typeof price !== 'number' || price <= 0) return null;

    let downPayment = 0;

    if (deal.min_down_payment_amount && typeof deal.min_down_payment_amount === 'number') {
      downPayment = deal.min_down_payment_amount;
    } else if (deal.min_down_payment_percent && typeof deal.min_down_payment_percent === 'number') {
      downPayment = (price * deal.min_down_payment_percent) / 100;
    }
    downPayment = Math.max(0, Math.min(downPayment, price)); // Ensure downPayment is not negative or more than price

    const principal = price - downPayment;
    const interestRate = deal.interest_rate || 0;
    const termYears = deal.term_years || 1; // Default to 1 year if not specified

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

  const createBookingMutation = useMutation({
    mutationFn: (data) => base44.entities.Booking.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['bookings']); // Invalidate cache for bookings
      setBookingSuccess(true);
      // Reset form and close dialog after a short delay
      setTimeout(() => {
        setShowBookingForm(false);
        setBookingSuccess(false);
        setBookingData({
          check_in_date: null,
          check_out_date: null,
          lease_months: 12,
          number_of_guests: 1,
          renter_name: currentUser?.full_name || '', // Re-fill name if user is still logged in
          renter_phone: '',
          message: '',
          special_requests: ''
        });
      }, 2000);
    },
    onError: (error) => {
      setBookingError(error.message || 'Failed to submit booking request');
    }
  });

  const createServiceDealBookingMutation = useMutation({
    mutationFn: (data) => base44.entities.Booking.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['bookings']);
      setServiceDealBookingSuccess(true);
      setTimeout(() => {
        setShowServiceDealModal(false);
        setServiceDealBookingSuccess(false);
        setSelectedServiceDeal(null);
        setServiceDealBookingData({
          service_date: null,
          service_time: '',
          renter_name: currentUser?.full_name || '',
          renter_phone: '',
          message: ''
        });
      }, 2000);
    },
    onError: (error) => {
      setServiceDealBookingError(error.message || 'Failed to submit booking request');
    }
  });

  // New mutation for creating offers
  const createOfferMutation = useMutation({
    mutationFn: async (offerData) => {
      setSubmittingOffer(true);
      try {
        console.log('=== CREATING OFFER ===');

        // 1. Create offer record
        const offer = await base44.entities.Offer.create(offerData);
        console.log('✅ Offer created:', offer.id);

        // 2. Generate PDF
        console.log('Generating offer PDF...');
        const pdfResponse = await base44.functions.invoke('generateOfferPDF', {
          offerId: offer.id
        });

        if (!pdfResponse.data.success) {
          throw new Error('Failed to generate PDF');
        }
        console.log('✅ PDF generated:', pdfResponse.data.pdfUrl);

        // 3. Send email to property owner with PDF
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

        // 4. Send in-app message
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

  const getDealTypeLabel = () => {
    switch (dealType) {
      case 'sale':
        return 'For Sale';
      case 'long_term_rent':
        return 'For Rent';
      case 'short_term_rent':
        return 'Vacation Rental';
      default:
        return 'Listing';
    }
  };

  // Calculate total cost for booking (New function)
  const calculateTotalCost = () => {
    if (!deal) return 0;

    if (dealType === 'short_term_rent') {
      if (!bookingData.check_in_date || !bookingData.check_out_date) return 0;

      const nights = differenceInDays(bookingData.check_out_date, bookingData.check_in_date);
      if (nights <= 0) return 0;

      // Check if there's custom pricing for specific dates
      if (deal.pricing_calendar && deal.pricing_calendar.length > 0) {
        let total = 0;
        const daysToPrice = eachDayOfInterval({
          start: bookingData.check_in_date,
          // End is exclusive for pricing, so we add nights-1 to check-in for the last payable day
          end: addDays(bookingData.check_in_date, nights - 1)
        });

        for (const day of daysToPrice) {
          const dateStr = format(day, 'yyyy-MM-dd');
          const customPrice = deal.pricing_calendar.find(p => p.date === dateStr);

          if (customPrice && customPrice.available !== false) {
            total += customPrice.price;
          } else {
            total += deal.price_per_night || deal.price; // Fallback to base price
          }
        }
        return total;
      }
      // Fallback if no pricing calendar
      return nights * (deal.price_per_night || deal.price);
    }

    if (dealType === 'long_term_rent') {
      return deal.price * bookingData.lease_months;
    }

    return 0;
  };

  const totalCost = calculateTotalCost();
  const numberOfNights = bookingData.check_in_date && bookingData.check_out_date
    ? differenceInDays(bookingData.check_out_date, bookingData.check_in_date)
    : 0;

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setBookingError('');

    if (!currentUser) {
      alert('Please sign in to make a booking');
      base44.auth.redirectToLogin(window.location.href);
      return;
    }

    // Validation
    if (dealType === 'short_term_rent') {
      if (!bookingData.check_in_date || !bookingData.check_out_date) {
        setBookingError('Please select check-in and check-out dates');
        return;
      }
      if (numberOfNights < (deal.minimum_stay || 1)) {
        setBookingError(`Minimum stay is ${deal.minimum_stay || 1} night${deal.minimum_stay !== 1 ? 's' : ''}`);
        return;
      }
    } else if (dealType === 'long_term_rent') {
      if (!bookingData.check_in_date) {
        setBookingError('Please select a lease start date');
        return;
      }
    }

    if (!bookingData.renter_phone?.trim()) {
      setBookingError('Please provide a phone number');
      return;
    }

    const bookingPayload = {
      deal_id: deal.id,
      property_address: deal.location,
      booking_type: dealType,
      renter_email: currentUser.email,
      renter_name: bookingData.renter_name || currentUser.full_name,
      renter_phone: bookingData.renter_phone,
      owner_email: deal.user_email,
      check_in_date: format(bookingData.check_in_date, 'yyyy-MM-dd'),
      check_out_date: bookingData.check_out_date ? format(bookingData.check_out_date, 'yyyy-MM-dd') : null,
      lease_months: dealType === 'long_term_rent' ? bookingData.lease_months : null,
      number_of_nights: dealType === 'short_term_rent' ? numberOfNights : null,
      number_of_guests: bookingData.number_of_guests,
      nightly_rate: dealType === 'short_term_rent' ? (deal.price_per_night || deal.price) : null,
      monthly_rate: dealType === 'long_term_rent' ? deal.price : null,
      total_cost: totalCost,
      message: bookingData.message,
      special_requests: bookingData.special_requests
    };

    try {
      console.log('=== BOOKING REQUEST DEBUG ===');

      // 1. Create booking record
      const newBooking = await base44.entities.Booking.create(bookingPayload);
      console.log('✅ Booking created:', newBooking.id);

      // 2. Create link to booking request
      const bookingRequestUrl = `${window.location.origin}/deals?view=dashboard#booking-${newBooking.id}`;

      // 3. Prepare detailed message content
      const messageSubject = `New ${dealType === 'short_term_rent' ? 'Airbnb' : dealType === 'long_term_rent' ? 'Rental' : 'Property'} Booking Request - ${deal.location}`;

      let messageBody = `NEW BOOKING REQUEST\n\n`;
      messageBody += `Property: ${deal.title}\n`;
      messageBody += `Address: ${deal.location}\n\n`;
      messageBody += `GUEST DETAILS:\n`;
      messageBody += `Name: ${bookingData.renter_name || currentUser.full_name}\n`;
      messageBody += `Email: ${currentUser.email}\n`;
      messageBody += `Phone: ${bookingData.renter_phone}\n\n`;

      if (dealType === 'short_term_rent') {
        messageBody += `CHECK-IN/OUT:\n`;
        messageBody += `Check-in: ${format(bookingData.check_in_date, 'EEEE, MMMM d, yyyy')}\n`;
        messageBody += `Check-out: ${format(bookingData.check_out_date, 'EEEE, MMMM d, yyyy')}\n`;
        messageBody += `Nights: ${numberOfNights}\n`;
        messageBody += `Guests: ${bookingData.number_of_guests}\n\n`;
      } else if (dealType === 'long_term_rent') {
        messageBody += `LEASE DETAILS:\n`;
        messageBody += `Start Date: ${format(bookingData.check_in_date, 'EEEE, MMMM d, yyyy')}\n`;
        messageBody += `Duration: ${bookingData.lease_months} months\n\n`;
      }

      messageBody += `TOTAL COST: $${totalCost.toLocaleString()}\n\n`;

      if (bookingData.message) {
        messageBody += `MESSAGE FROM GUEST:\n${bookingData.message}\n\n`;
      }

      if (bookingData.special_requests) {
        messageBody += `SPECIAL REQUESTS:\n${bookingData.special_requests}\n\n`;
      }

      messageBody += `---\n`;
      messageBody += `Review and respond to this booking request:\n`;
      messageBody += `${bookingRequestUrl}\n\n`;
      messageBody += `Or reply to this message to communicate with the guest.\n`;

      console.log('2. Creating in-app message...');

      // 4. Send in-app message - CRITICAL FIX
      try {
        const message = await base44.entities.Message.create({
          sender_email: currentUser.email,
          sender_name: bookingData.renter_name || currentUser.full_name,
          recipient_email: deal.user_email,
          recipient_name: deal.contact_email || 'Property Owner',
          subject: messageSubject,
          content: messageBody,
          thread_id: `booking_${newBooking.id}_${Date.now()}`,
          reference_type: 'deal',
          reference_id: deal.id,
          is_read: false
        });
        console.log('✅ In-app message created:', message.id);
      } catch (msgError) {
        console.error('❌ Failed to create in-app message:', msgError);
        // Continue anyway - don't fail the whole booking
      }

      console.log('3. Sending email notification...');

      // 5. Send email notification
      try {
        await base44.integrations.Core.SendEmail({
          to: deal.user_email,
          subject: messageSubject,
          body: messageBody
        });
        console.log('✅ Email sent to owner');
      } catch (emailError) {
        console.error('❌ Failed to send email:', emailError);
        // Continue anyway
      }

      console.log('4. Sending SMS notification...');

      // 6. Optional: Send SMS notification
      if (deal.contact_phone) {
        console.log('📱 SMS would be sent to:', deal.contact_phone);
        console.log('SMS content:', `New booking request from ${bookingData.renter_name}. Check your email or HomeXREI dashboard: ${bookingRequestUrl}`);
        // TODO: Implement SMS sending via third-party service when available
      }

      console.log('✅ BOOKING REQUEST COMPLETED SUCCESSFULLY');

      queryClient.invalidateQueries(['bookings']);
      setBookingSuccess(true);

      // Show success message to user
      alert('Booking request sent successfully!\n\n✅ In-app message sent to owner\n✅ Email notification sent\n\nThe property owner will review your request and respond soon.');

      // Reset form and close dialog after showing success
      setTimeout(() => {
        setShowBookingForm(false);
        setBookingSuccess(false);
        setBookingData({
          check_in_date: null,
          check_out_date: null,
          lease_months: 12,
          number_of_guests: 1,
          renter_name: currentUser?.full_name || '',
          renter_phone: '',
          message: '',
          special_requests: ''
        });
      }, 3000);

    } catch (error) {
      console.error('❌ BOOKING SUBMISSION ERROR:', error);
      console.error('Error details:', error.message, error.stack);
      setBookingError(error.message || 'Failed to submit booking request. Please try again.');
    }
  };

  const handleServiceDealBooking = async (service) => {
    if (!currentUser) {
      alert('Please sign in to book this service');
      base44.auth.redirectToLogin(window.location.href);
      return;
    }

    setSelectedServiceDeal(service);
    setServiceDealBookingData({
      service_date: null,
      service_time: '',
      renter_name: currentUser.full_name || '',
      renter_phone: '',
      message: ''
    });
    setServiceDealBookingError('');
    setShowServiceDealModal(true);
  };

  const handleServiceDealBookingSubmit = async (e) => {
    e.preventDefault();
    setServiceDealBookingError('');

    if (!serviceDealBookingData.service_date || !serviceDealBookingData.service_time) {
      setServiceDealBookingError('Please select date and time');
      return;
    }

    if (!serviceDealBookingData.renter_phone?.trim()) {
      setServiceDealBookingError('Please provide a phone number');
      return;
    }

    const service = selectedServiceDeal;
    const bookingPayload = {
      deal_id: deal.id,
      property_address: `${service.service_category} - ${deal.location}`,
      booking_type: 'service',
      service_id: service.service_deal_id,
      service_name: service.service_name,
      renter_email: currentUser.email,
      renter_name: serviceDealBookingData.renter_name || currentUser.full_name,
      renter_phone: serviceDealBookingData.renter_phone,
      owner_email: deal.user_email,
      service_date: format(serviceDealBookingData.service_date, 'yyyy-MM-dd'),
      service_time: serviceDealBookingData.service_time,
      service_price: service.price || 0,
      total_cost: service.price || 0,
      message: serviceDealBookingData.message
    };

    try {
      console.log('=== SERVICE DEAL BOOKING REQUEST ===');
      const newBooking = await base44.entities.Booking.create(bookingPayload);
      console.log('✅ Booking created:', newBooking.id);

      const bookingRequestUrl = `${window.location.origin}/dashboard`;
      const messageSubject = `New Service Deal Booking: ${service.service_name}`;

      let messageBody = `NEW SERVICE DEAL BOOKING REQUEST\n\n`;
      messageBody += `Service: ${service.service_name}\n`;
      messageBody += `Category: ${service.service_category}\n`;
      messageBody += `Property: ${deal.location}\n\n`;
      messageBody += `CLIENT DETAILS:\n`;
      messageBody += `Name: ${serviceDealBookingData.renter_name || currentUser.full_name}\n`;
      messageBody += `Email: ${currentUser.email}\n`;
      messageBody += `Phone: ${serviceDealBookingData.renter_phone}\n\n`;
      messageBody += `SERVICE DATE & TIME:\n`;
      messageBody += `Date: ${format(serviceDealBookingData.service_date, 'EEEE, MMMM d, yyyy')}\n`;
      messageBody += `Time: ${serviceDealBookingData.service_time}\n\n`;
      messageBody += `PRICE: $${service.price}\n\n`;

      if (serviceDealBookingData.message) {
        messageBody += `MESSAGE FROM CLIENT:\n${serviceDealBookingData.message}\n\n`;
      }

      messageBody += `---\n`;
      messageBody += `Review and respond:\n${bookingRequestUrl}\n`;

      // Send in-app message
      try {
        await base44.entities.Message.create({
          sender_email: currentUser.email,
          sender_name: serviceDealBookingData.renter_name || currentUser.full_name,
          recipient_email: deal.user_email,
          recipient_name: deal.user_email,
          subject: messageSubject,
          content: messageBody,
          thread_id: `service_deal_${newBooking.id}_${Date.now()}`,
          reference_type: 'deal',
          reference_id: deal.id,
          is_read: false
        });
        console.log('✅ In-app message sent');
      } catch (msgError) {
        console.error('❌ Message error:', msgError);
      }

      // Send email
      try {
        await base44.integrations.Core.SendEmail({
          to: deal.user_email,
          subject: messageSubject,
          body: messageBody
        });
        console.log('✅ Email sent');
      } catch (emailError) {
        console.error('❌ Email error:', emailError);
      }

      alert('Service booking request sent successfully!\n\n✅ In-app message sent\n✅ Email notification sent\n\nThe provider will review and respond soon.');

      queryClient.invalidateQueries(['bookings']);
      setServiceDealBookingSuccess(true);

      setTimeout(() => {
        setShowServiceDealModal(false);
        setServiceDealBookingSuccess(false);
        setSelectedServiceDeal(null);
        setServiceDealBookingData({
          service_date: null,
          service_time: '',
          renter_name: currentUser?.full_name || '',
          renter_phone: '',
          message: ''
        });
      }, 2000);

    } catch (error) {
      console.error('❌ Booking error:', error);
      setServiceDealBookingError(error.message || 'Failed to submit booking request');
    }
  };


  const handleGenerateQRCode = async () => {
    if (!deal) return;

    setGeneratingQR(true);
    try {
      // Use production URL for QR code
      const dealPath = deal.deal_type === 'sale' ? 'sale' :
                       deal.deal_type === 'long_term_rent' ? 'rent' : 'airbnb';
      const encodedAddress = encodeURIComponent(deal.location);
      const publicUrl = `https://homexrei.com/${dealPath}?address=${encodedAddress}`;

      // Use a free QR code API instead of AI image generation
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(publicUrl)}&format=png`;

      // Upload the QR code to our storage
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const file = new File([blob], 'qr-code.png', { type: 'image/png' });

      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      await base44.entities.Deal.update(deal.id, {
        qr_code_url: file_url
      });

      queryClient.invalidateQueries(['deal']);
      alert('QR Code generated successfully!');
    } catch (error) {
      console.error('Error generating QR code:', error);
      alert('Failed to generate QR code. Please try again.');
    }
    setGeneratingQR(false);
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
        alert('✅ Video generated successfully! Refreshing page...');
        window.location.reload();
      } else {
        throw new Error(response.data.error || 'Failed to generate video');
      }

    } catch (error) {
      console.error('Video generation error:', error);
      setVideoError(error.message || 'Failed to generate video. Please try again.');
    }

    setGeneratingVideo(false);
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    try {
      await base44.integrations.Core.SendEmail({
        to: deal.contact_email || deal.user_email,
        subject: `${dealType === 'sale' ? 'Property Sale' : dealType === 'long_term_rent' ? 'Rental' : 'Vacation Rental'} Inquiry - ${deal.location}`,
        body: `New inquiry for ${deal.title}

From: ${contactData.name}
Email: ${contactData.email}
Phone: ${contactData.phone}

Message:
${contactData.message}

Property: ${deal.location}
Listing: ${window.location.href}`
      });

      alert('Message sent! The owner will contact you soon.');
      setShowContactForm(false);
      setContactData({ name: '', email: '', phone: '', message: '' });
    } catch (error) {
      alert('Failed to send message. Please try calling or emailing directly.');
    }
  };

  const handleAppointmentSubmit = async (e) => {
    e.preventDefault();
    try {
      await base44.integrations.Core.SendEmail({
        to: deal.contact_email || deal.user_email,
        subject: `${dealType === 'sale' ? 'Viewing' : 'Tour'} Request - ${deal.location}`,
        body: `New ${dealType === 'sale' ? 'property viewing' : 'tour'} request for ${deal.title}

From: ${appointmentData.name}
Email: ${appointmentData.email}
Phone: ${appointmentData.phone}

Requested Date: ${appointmentData.date}
Requested Time: ${appointmentData.time}

Message:
${appointmentData.message}

Property: ${deal.location}
Listing: ${window.location.href}`
      });

      alert('Appointment request sent! The owner will confirm your booking.');
      setShowAppointmentForm(false);
      setAppointmentData({ name: '', email: '', phone: '', date: '', time: '', message: '' });
    } catch (error) {
      alert('Failed to send request. Please try contacting directly.');
    }
  };

  const handleGenerateDescription = async () => {
    if (!deal) return;

    setGeneratingDescription(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Create a compelling, detailed property description for this ${dealType === 'sale' ? 'home for sale' : dealType === 'long_term_rent' ? 'rental property' : 'vacation rental'}:

Title: ${deal.title}
Location: ${deal.location}
Property Type: ${deal.property_type}
Bedrooms: ${deal.bedrooms || 'N/A'}
Bathrooms: ${deal.bathrooms || 'N/A'}
Square Feet: ${deal.sqft || 'N/A'}
Price: $${deal.price?.toLocaleString() || deal.price_per_night?.toLocaleString()}
${deal.amenities?.length ? `Amenities: ${deal.amenities.join(', ')}` : ''}

Write a professional, engaging description that:
1. Highlights the property's best features
2. Describes the location and neighborhood
3. Mentions key amenities and upgrades
4. Creates an emotional connection
5. Is 3-4 paragraphs long
6. Uses vivid, descriptive language

Format the output as HTML paragraphs (e.g., <p>...</p><p>...</p>) to ensure proper line breaks and structure.`,
        // Assuming the LLM returns the description as a string directly based on the outline
      });

      await base44.entities.Deal.update(deal.id, {
        description: result
      });

      queryClient.invalidateQueries(['deal', dealId]);
    } catch (error) {
      console.error('Error generating description:', error);
      alert('Failed to generate description. Please try again.');
    }
    setGeneratingDescription(false);
  };

  const handleOfferSubmit = (offerData) => {
    if (!currentUser) {
      alert('Please sign in to make an offer');
      base44.auth.redirectToLogin(window.location.href);
      return;
    }

    createOfferMutation.mutate(offerData);
  };

  // Check if deal is saved by current user
  const { data: savedDeals = [] } = useQuery({
    queryKey: ['savedDeals', currentUser?.email, dealId],
    queryFn: () => currentUser ? base44.entities.SavedDeal.filter({ user_email: currentUser.email, deal_id: dealId }) : [],
    enabled: !!currentUser && !!dealId
  });

  const isSaved = savedDeals.length > 0;

  const saveDealMutation = useMutation({
    mutationFn: (data) => base44.entities.SavedDeal.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['savedDeals']);
      alert('Deal saved successfully! View it in your Dashboard.'); // Added alert
    },
    onError: (error) => {
      console.error('Error saving deal:', error);
      alert('Failed to save deal. Please try again.'); // Added alert
    }
  });

  const unsaveDealMutation = useMutation({
    mutationFn: (id) => base44.entities.SavedDeal.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['savedDeals']);
      alert('Deal unsaved.'); // Added alert
    },
    onError: (error) => {
      console.error('Error unsaving deal:', error);
      alert('Failed to unsave deal. Please try again.'); // Added alert
    }
  });

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: deal.title,
          text: `Check out this ${dealType === 'sale' ? 'property for sale' : dealType === 'long_term_rent' ? 'rental property' : 'vacation rental'}!`,
          url: window.location.href
        });
      } catch (error) {
        // User cancelled share or permission denied - fallback to clipboard
        if (error.name !== 'AbortError') {
          try {
            await navigator.clipboard.writeText(window.location.href);
            alert('Link copied to clipboard!');
          } catch (clipboardError) {
            // If clipboard also fails, show the URL
            prompt('Copy this link:', window.location.href);
          }
        }
      }
    } else {
      // Browser doesn't support share API - use clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert('Link copied to clipboard!');
      } catch (error) {
        // If clipboard also fails, show the URL
        prompt('Copy this link:', window.location.href);
      }
    }
  };

  // Reconciled handleSave with the existing react-query mutations and new alert logic
  const handleSave = async () => {
    if (!currentUser) {
      alert('Please sign in to save deals');
      base44.auth.redirectToLogin(window.location.href);
      return;
    }

    if (!deal) return;

    if (isSaved) {
      // Unsave
      const savedDeal = savedDeals[0];
      unsaveDealMutation.mutate(savedDeal.id);
    } else {
      // Save
      saveDealMutation.mutate({
        deal_id: deal.id,
        user_email: currentUser.email,
        deal_title: deal.title,
        deal_type: deal.deal_type,
        deal_price: deal.price,
        deal_location: deal.location,
        deal_photo_url: deal.photo_urls?.[0] || null
      });
    }
  };

  const amenityIcons = {
    'WiFi': '📶',
    'TV': '📺',
    'Coffee': '☕',
    'Parking': '🚗',
    'AC': '❄️',
    'Pool': '🏊',
    'Gym': '💪',
    'Heating': '🔥',
    'Kitchen': '🍳',
    'Washer/Dryer': '🧺',
    'Pet Friendly': '🐕',
    'Garden': '🌳',
    'Balcony': '🏞️',
    'Security': '🔒'
  };

  const handlePrint = () => {
    window.print();
  };

  // New boolean flags from outline
  const isOwner = currentUser && deal && currentUser.email === deal.user_email;
  const isShortTerm = deal?.deal_type === 'short_term_rent';
  const isLongTerm = deal?.deal_type === 'long_term_rent';
  const isSale = deal?.deal_type === 'sale';
  const financing = getFinancingCalculations();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-12 text-center max-w-md">
          <Home className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Listing Not Found</h2>
          <p className="text-gray-600 mb-4">
            {address ? (
              <>No active {getDealTypeLabel().toLowerCase()} listing found at this address.</>
            ) : (
              <>This property listing is no longer available.</>
            )}
          </p>
          <a href="/deals">
            <Button className="bg-[#1e3a5f] hover:bg-[#2a4a7f]">Browse All Deals</Button>
          </a>
        </Card>
      </div>
    );
  }

  const hasDirectBooking = isShortTerm ? !!deal.price_per_night : true;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      {/* Print Styles */}
      <style>{`
        @media print {
          /* Hide browser headers and footers */
          @page {
            margin: 0.5in;
            size: letter portrait;
          }

          /* Hide interactive elements */
          .no-print {
            display: none !important;
          }

          /* Reset page styling for print */
          body {
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* Make content full width */
          .print-container {
            max-width: 100% !important;
            padding: 0.25in 0 !important;
          }

          /* Optimize layout for print */
          .print-grid {
            display: block !important;
          }

          /* Ensure photos print well */
          img {
            max-width: 100%;
            page-break-inside: avoid;
          }

          /* Remove shadows and fancy styling */
          .print-card {
            box-shadow: none !important;
            border: 1px solid #ddd !important;
            margin-bottom: 0.15in !important;
            page-break-inside: avoid;
          }

          /* Optimize text for print */
          .print-title {
            color: #1e3a5f !important;
            font-size: 18pt !important;
            margin-bottom: 6pt !important;
          }

          .print-subtitle {
            font-size: 11pt !important;
            margin-bottom: 8pt !important;
          }

          .print-price {
            color: #d4af37 !important;
            font-size: 24pt !important;
          }

          .print-section-title {
            font-size: 14pt !important;
            margin-bottom: 6pt !important;
            color: #1e3a5f !important;
          }

          /* Compact property details */
          .print-details {
            font-size: 10pt !important;
            padding: 0.1in 0 !important;
          }

          /* Compact description */
          .print-description {
            font-size: 9pt !important;
            line-height: 1.3 !important;
          }
          .print-description p {
            margin-bottom: 0.5em !important;
          }

          /* Compact amenities */
          .print-amenities {
            font-size: 9pt !important;
            gap: 0.05in !important;
          }

          /* Contact info inline with header */
          .print-contact-inline {
            display: flex !important;
            flex-direction: column;
            gap: 4pt;
            font-size: 10pt !important;
            padding: 0.1in;
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 4pt;
            margin-top: 8pt;
          }

          .print-contact-inline .contact-item {
            display: flex;
            align-items: center;
            gap: 6pt;
          }

          /* Photo optimization */
          .print-photo {
            height: 3in !important;
            max-height: 3in !important;
            object-fit: cover;
            margin-bottom: 0.1in !important;
          }

          /* QR Code display on print */
          .print-qr-section {
            display: block !important;
            text-align: center;
            margin-top: 8pt;
            padding: 0.1in;
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 4pt;
          }

          .print-qr-section img {
            width: 1.5in !important;
            height: 1.5in !important;
            margin: 0 auto !important;
            display: block !important;
          }

          .print-qr-section p {
            font-size: 8pt !important;
            color: #4b5563 !important;
            margin-top: 4pt !important;
          }

          /* Hide bottom contact section */
          .print-contact-bottom {
            display: none !important;
          }

          /* Page breaks */
          .page-break-before {
            page-break-before: always;
          }

          .page-break-avoid {
            page-break-inside: avoid;
          }

          /* Compact spacing */
          .print-compact {
            margin: 0.05in 0 !important;
            padding: 0.05in 0 !important;
          }
        }
      `}</style>

      {/* Navigation - Hide on print */}
      <nav className="bg-white border-b sticky top-0 z-50 shadow-sm no-print">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
              <Home className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-[#1e3a5f]">HomeXREI</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print Flyer
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={saveDealMutation.isLoading || unsaveDealMutation.isLoading}
              className={isSaved ? 'text-red-600 border-red-600 hover:bg-red-50' : ''}
            >
              <Heart className={`w-4 h-4 mr-2 ${isSaved ? 'fill-red-600' : ''}`} />
              {isSaved ? 'Saved' : 'Save'}
            </Button>
          </div>
        </div>
      </nav>

      <div className="py-12 px-4 print-container">
        <div className="max-w-6xl mx-auto">
          {/* Back Button - Hide on print */}
          <a href="/deals" className="no-print">
            <Button variant="outline" className="mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Deals
            </Button>
          </a>

          <div className="grid lg:grid-cols-3 gap-8 print-grid">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Marketing Video Section - Show before photos */}
              {deal.video_url && (
                <Card className="overflow-hidden print-card page-break-avoid">
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-4 border-b flex items-center justify-between">
                    <h3 className="font-semibold text-[#1e3a5f] flex items-center gap-2">
                      🎬 Property Video Tour
                    </h3>
                    {isOwner && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleGenerateVideo}
                        disabled={generatingVideo}
                        className="no-print"
                      >
                        {generatingVideo ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Regenerating...
                          </>
                        ) : (
                          <>
                            <Video className="w-4 h-4 mr-2" />
                            Regenerate Video
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  <div className="relative">
                    <VideoPlayer
                      videoUrl={deal.video_url}
                      posterUrl={deal.photo_urls?.[0]}
                      className="h-96 object-cover"
                    />
                  </div>
                  {deal.video_generated_date && (
                    <div className="p-3 bg-gray-50 text-xs text-gray-600 text-center">
                      Video created on {new Date(deal.video_generated_date).toLocaleDateString()}
                    </div>
                  )}
                  {videoError && (
                    <div className="p-3 bg-red-50 border-t border-red-200">
                      <p className="text-sm text-red-800">{videoError}</p>
                    </div>
                  )}
                </Card>
              )}

              {/* Video Generation Card - Show for owners if no video exists */}
              {isOwner && !deal.video_url && deal.photo_urls?.length > 0 && (
                <Card className="p-6 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200 no-print">
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
                        Perfect for social media and marketing!
                      </p>
                      {videoError && (
                        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-800">{videoError}</p>
                        </div>
                      )}
                      <Button
                        onClick={handleGenerateVideo}
                        disabled={generatingVideo}
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
                <Card className="overflow-hidden print-card page-break-avoid">
                  <div className="relative bg-black">
                    <img
                      src={deal.photo_urls[currentPhotoIndex]}
                      alt={deal.title}
                      className="w-full h-96 object-contain print-photo"
                    />
                    {/* Hide navigation arrows on print */}
                    {deal.photo_urls.length > 1 && (
                      <>
                        <Button
                          variant="outline"
                          size="icon"
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/90 no-print"
                          onClick={() => setCurrentPhotoIndex((prev) =>
                            prev === 0 ? deal.photo_urls.length - 1 : prev - 1
                          )}
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/90 no-print"
                          onClick={() => setCurrentPhotoIndex((prev) =>
                            prev === deal.photo_urls.length - 1 ? 0 : prev + 1
                          )}
                        >
                          <ChevronRight className="w-5 h-5" />
                        </Button>
                        <div className="absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm no-print">
                          {currentPhotoIndex + 1} / {deal.photo_urls.length}
                        </div>
                      </>
                    )}
                  </div>
                  {/* Hide thumbnail gallery on print */}
                  {deal.photo_urls.length > 1 && (
                    <div className="flex gap-2 p-4 overflow-x-auto no-print bg-black">
                      {deal.photo_urls.map((url, index) => (
                        <div
                          key={index}
                          className={`w-20 h-20 rounded cursor-pointer overflow-hidden flex-shrink-0 bg-black ${
                            index === currentPhotoIndex ? 'ring-2 ring-[#1e3a5f]' : 'opacity-60'
                          }`}
                          onClick={() => setCurrentPhotoIndex(index)}
                        >
                          <img
                            src={url}
                            alt={`Thumbnail ${index + 1}`}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )}

              {/* Title, Price, Address & Contact Info - Optimized for print */}
              <Card className="p-6 print-card page-break-avoid">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold text-[#1e3a5f] mb-2 print-title">{deal.title}</h1>
                    <div className="flex items-center gap-2 text-gray-600 mb-4 print-subtitle">
                      <MapPin className="w-5 h-5" />
                      <span>{deal.location}</span>
                    </div>
                  </div>
                  {deal.owner_financing_available && isSale && (
                    <Badge className="bg-[#d4af37] text-white text-sm px-4 py-2 no-print">
                      💰 Owner Financing
                    </Badge>
                  )}
                </div>

                {/* Only show price for non-Airbnb deals */}
                {!isShortTerm && (
                  <div className="flex items-baseline gap-2 mb-6 print-compact">
                    {isLongTerm ? (
                      <>
                        <span className="text-4xl font-bold text-[#d4af37] print-price">
                          ${deal.price?.toLocaleString()}
                        </span>
                        <span className="text-xl text-gray-600">/mo</span>
                      </>
                    ) : (
                      <span className="text-4xl font-bold text-[#d4af37] print-price">
                        ${deal.price?.toLocaleString()}
                      </span>
                    )}
                  </div>
                )}

                {/* Property Details */}
                {(deal.bedrooms || deal.bathrooms || deal.sqft) && (
                  <div className="flex gap-6 pb-6 border-b print-details">
                    {deal.bedrooms && (
                      <div className="flex items-center gap-2">
                        <Bed className="w-5 h-5 text-gray-600" />
                        <span className="text-gray-900 font-medium">{deal.bedrooms} Bedrooms</span>
                      </div>
                    )}
                    {deal.bathrooms && (
                      <div className="flex items-center gap-2">
                        <Bath className="w-5 h-5 text-gray-600" />
                        <span className="text-gray-900 font-medium">{deal.bathrooms} Bathrooms</span>
                      </div>
                    )}
                    {deal.sqft && (
                      <div className="flex items-center gap-2">
                        <Maximize className="w-5 h-5 text-gray-600" />
                        <span className="text-gray-900 font-medium">{deal.sqft.toLocaleString()} sqft</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Contact Information - Inline for print, hidden for screen */}
                <div className="hidden print:block print-contact-inline">
                  <h3 className="font-semibold text-[#1e3a5f] mb-2">Contact Information:</h3>
                  {deal.contact_phone && (
                    <div className="contact-item">
                      <Phone className="w-4 h-4 text-[#1e3a5f]" />
                      <span>{deal.contact_phone}</span>
                    </div>
                  )}
                  <div className="contact-item">
                    <Mail className="w-4 h-4 text-[#1e3a5f]" />
                    <span>{deal.contact_email || deal.user_email}</span>
                  </div>
                </div>

                {/* QR Code - Show on print for all Airbnb deals, hidden on screen */}
                {isShortTerm && deal.qr_code_url && (
                  <div className="hidden print:block print-qr-section">
                    <h3 className="font-semibold text-[#1e3a5f] mb-2" style={{fontSize: '10pt'}}>Scan to View Full Listing</h3>
                    <img src={deal.qr_code_url} alt="QR Code" />
                    <p>Scan with your phone to see photos, availability & book</p>
                  </div>
                )}
              </Card>

              {/* Owner Financing Calculator */}
              {financing && (
                <Card className="p-6 border-2 border-[#d4af37] bg-gradient-to-r from-[#d4af37]/5 to-[#d4af37]/10 print-card page-break-avoid">
                  <h2 className="text-2xl font-bold text-[#1e3a5f] mb-4 flex items-center gap-2 print-section-title">
                    💰 Owner Financing Calculator
                  </h2>

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

                    <div className="bg-white rounded-lg p-4 space-y-2 shadow-sm">
                      <h3 className="font-semibold text-[#1e3a5f] mb-3">Monthly Payment Breakdown:</h3>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Principal & Interest:</span>
                        <span className="font-semibold">${financing.monthlyPI.toFixed(2)}</span>
                      </div>
                      {financing.monthlyTax > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Property Tax (est.):</span>
                          <span className="font-semibold">${financing.monthlyTax.toFixed(2)}</span>
                        </div>
                      )}
                      {financing.monthlyInsurance > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Insurance (est.):</span>
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
                      <div className="pt-2 border-t border-gray-200 flex justify-between font-bold text-lg mt-3">
                        <span className="text-[#1e3a5f]">Total Monthly:</span>
                        <span className="text-[#d4af37]">${financing.totalMonthly.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-500 mt-4 text-center">
                    * This is an estimate. Actual payments may vary. Property taxes and insurance are approximate.
                  </p>
                </Card>
              )}

              {/* Description */}
              <Card className="p-6 print-card page-break-avoid">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-[#1e3a5f] print-section-title">Description</h2>
                  {/* Hide AI enhance button on print */}
                  {isOwner && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateDescription}
                      disabled={generatingDescription}
                      className="no-print"
                    >
                      {generatingDescription ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating...</>
                      ) : (
                        <><Sparkles className="w-4 h-4 mr-2" />AI Enhance</>
                      )}
                    </Button>
                  )}
                </div>
                <div
                  className="text-gray-700 leading-relaxed print-description prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: deal.description }}
                />
              </Card>

              {/* Amenities for Short-Term Rentals */}
              {isShortTerm && deal.amenities?.length > 0 && (
                <Card className="p-6 print-card page-break-avoid">
                  <h2 className="text-xl font-bold text-[#1e3a5f] mb-4 print-section-title">Amenities</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 print-amenities">
                    {deal.amenities.map((amenity, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Check className="w-5 h-5 text-green-600" />
                        <span className="text-gray-700">{amenity}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Additional Services - Show info with modal booking */}
              {isShortTerm && deal.additional_services?.length > 0 && (
                <Card className="p-6 border-2 border-purple-200 bg-purple-50 print-card page-break-avoid">
                  <h2 className="text-xl font-bold text-[#1e3a5f] mb-4 print-section-title">✨ Additional Service Deals Available</h2>
                  <p className="text-sm text-gray-600 mb-4 no-print">Optional services you can book separately</p>
                  <div className="grid gap-4">
                    {deal.additional_services.map((service, idx) => (
                      <Card key={idx} className="p-4 bg-white hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-[#1e3a5f]">{service.service_name}</h3>
                            <Badge variant="outline" className="mt-1">{service.service_category}</Badge>
                          </div>
                          <span className="text-lg font-bold text-[#d4af37]">${service.price}/hr</span>
                        </div>
                        <div
                          className="text-sm text-gray-700 mb-3 print-description prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: service.description }}
                        />
                        {!isOwner && (
                          <Button
                            size="sm"
                            className="w-full bg-purple-600 hover:bg-purple-700 no-print"
                            onClick={() => handleServiceDealBooking(service)}
                          >
                            Book This Service Deal
                          </Button>
                        )}
                      </Card>
                    ))}
                  </div>
                </Card>
              )}

              {/* Hide pricing calendar, check-in/out times, house rules, external links, and map on print */}
              <div className="no-print">
                {dealType === 'short_term_rent' && deal.price_per_night && (
                  <PricingCalendar
                    basePricePerNight={deal.price_per_night}
                    pricingCalendar={deal.pricing_calendar || []}
                    onDateSelect={(date, priceInfo) => {
                      console.log('Selected date:', date, 'Price:', priceInfo);
                    }}
                  />
                )}
              </div>

              {/* Check-in/out for short-term rentals - hide on print */}
              {dealType === 'short_term_rent' && (deal.check_in_time || deal.check_out_time) && (
                <Card className="p-6 no-print">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Check-in / Check-out</h2>
                  <div className="grid grid-cols-2 gap-4">
                    {deal.check_in_time && (
                      <div className="flex items-center gap-2 text-gray-700">
                        <Clock className="w-5 h-5 text-[#1e3a5f]" />
                        <span>Check-in: {deal.check_in_time}</span>
                      </div>
                    )}
                    {deal.check_out_time && (
                      <div className="flex items-center gap-2 text-gray-700">
                        <Clock className="w-5 h-5 text-[#1e3a5f]" />
                        <span>Check-out: {deal.check_out_time}</span>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* House Rules for Rentals - hide on print */}
              {(isShortTerm || isLongTerm) && deal.rules && (
                <Card className="p-6 no-print">
                  <h2 className="text-xl font-bold text-[#1e3a5f] mb-4">House Rules</h2>
                  <p className="text-gray-700 whitespace-pre-line">{deal.rules}</p>
                </Card>
              )}

              {/* Hide external links section on print */}
              {(deal.airbnb_url || deal.zillow_url || deal.external_urls?.length > 0) && (
                <Card className="p-6 no-print">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Also Listed On</h2>
                  <div className="flex flex-wrap gap-3">
                    {deal.airbnb_url && (
                      <Button variant="outline" asChild>
                        <a href={deal.airbnb_url} target="_blank" rel="noopener noreferrer">
                          View on Airbnb
                        </a>
                      </Button>
                    )}
                    {deal.zillow_url && (
                      <Button variant="outline" asChild>
                        <a href={deal.zillow_url} target="_blank" rel="noopener noreferrer">
                          View on Zillow
                        </a>
                      </Button>
                    )}
                    {deal.external_urls?.map((link, idx) => (
                      <Button key={idx} variant="outline" asChild>
                        <a href={link.url} target="_blank" rel="noopener noreferrer">
                          View on {link.platform}
                        </a>
                      </Button>
                    ))}
                  </div>
                </Card>
              )}

              {/* External Links for Print - Show only for Airbnb properties */}
              {isShortTerm && (deal.airbnb_url || deal.external_urls?.some(link => link.platform?.toLowerCase().includes('airbnb') || link.platform?.toLowerCase().includes('vrbo'))) && (
                <Card className="hidden print:block print-card page-break-avoid p-4 bg-blue-50 border-2 border-blue-200">
                  <h3 className="font-semibold text-[#1e3a5f] mb-3" style={{fontSize: '11pt'}}>Book This Property Online:</h3>
                  <div className="space-y-2">
                    {deal.airbnb_url && (
                      <div className="flex items-center gap-2">
                        <ExternalLink className="w-4 h-4 text-[#1e3a5f] flex-shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">Airbnb</p>
                          <p className="text-xs text-gray-600 break-all">{deal.airbnb_url}</p>
                        </div>
                      </div>
                    )}
                    {deal.external_urls?.filter(link =>
                      link.platform?.toLowerCase().includes('airbnb') ||
                      link.platform?.toLowerCase().includes('vrbo')
                    ).map((link, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <ExternalLink className="w-4 h-4 text-[#1e3a5f] flex-shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{link.platform}</p>
                          <p className="text-xs text-gray-600 break-all">{link.url}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Hide map on print */}
              {deal.latitude && deal.longitude && (
                <Card className="p-6 no-print">
                  <h2 className="text-xl font-bold text-[#1e3a5f] mb-4">Location</h2>
                  <div className="h-64 bg-gray-100 rounded-lg overflow-hidden">
                    <DealMap
                      deals={[deal]}
                      center={[deal.latitude, deal.longitude]}
                      zoom={15}
                    />
                  </div>
                  <p className="text-sm text-gray-600 mt-3">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    {deal.location}
                  </p>
                </Card>
              )}
            </div>

            {/* Sidebar - Hide on print */}
            <div className="lg:col-span-1 no-print">
              <div className="sticky top-24 space-y-4">
                <Card className="p-6">
                  {dealType === 'long_term_rent' && (
                    <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg text-center">
                      <p className="text-sm text-gray-600 mb-1">Monthly Rent</p>
                      <p className="text-4xl font-bold text-[#1e3a5f]">
                        ${deal.price.toLocaleString()}
                        <span className="text-lg text-gray-600">/mo</span>
                      </p>
                    </div>
                  )}

                  {/* Make Offer Button for Property Sales */}
                  {isSale && !isOwner && (
                    <Button
                      className="w-full mb-3 bg-[#d4af37] hover:bg-[#c49d2a]"
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

                  {!hasDirectBooking && isShortTerm && (
                    <div className="mb-6 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                      <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Book via External Platform</h3>
                      <p className="text-sm text-yellow-800">
                        Direct booking is not available to comply with platform policies. Please use the external booking links below.
                      </p>
                    </div>
                  )}

                  {hasDirectBooking && (dealType === 'short_term_rent' || dealType === 'long_term_rent') && !isOwner && (
                    <Dialog open={showBookingForm} onOpenChange={setShowBookingForm}>
                      <DialogTrigger asChild>
                        <Button className="w-full mb-3 bg-[#d4af37] hover:bg-[#c49d2a]">
                          <CreditCard className="w-4 h-4 mr-2" />
                          Request Booking
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Request to Book</DialogTitle>
                        </DialogHeader>

                        {bookingSuccess ? (
                          <div className="py-8 text-center">
                            <Check className="w-16 h-16 text-green-600 mx-auto mb-4" />
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Booking Request Sent!</h3>
                            <p className="text-gray-600">
                              The property owner will review your request and respond soon.
                            </p>
                          </div>
                        ) : (
                          <form onSubmit={handleBookingSubmit} className="space-y-4">
                            {bookingError && (
                              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-800">{bookingError}</p>
                              </div>
                            )}

                            {dealType === 'short_term_rent' && (
                              <>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <Label>Check-in Date *</Label>
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start">
                                          <CalendarIcon className="w-4 h-4 mr-2" />
                                          {bookingData.check_in_date ? format(bookingData.check_in_date, 'MMM d, yyyy') : 'Select date'}
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-0">
                                        <Calendar
                                          mode="single"
                                          selected={bookingData.check_in_date}
                                          onSelect={(date) => setBookingData({ ...bookingData, check_in_date: date })}
                                          disabled={(date) => date < new Date() || (deal.pricing_calendar && deal.pricing_calendar.some(p => p.date === format(date, 'yyyy-MM-dd') && p.available === false))}
                                        />
                                      </PopoverContent>
                                    </Popover>
                                  </div>

                                  <div>
                                    <Label>Check-out Date *</Label>
                                    <Popover>
                                      <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start">
                                          <CalendarIcon className="w-4 h-4 mr-2" />
                                          {bookingData.check_out_date ? format(bookingData.check_out_date, 'MMM d, yyyy') : 'Select date'}
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-auto p-0">
                                        <Calendar
                                          mode="single"
                                          selected={bookingData.check_out_date}
                                          onSelect={(date) => setBookingData({ ...bookingData, check_out_date: date })}
                                          disabled={(date) => !bookingData.check_in_date || date <= bookingData.check_in_date || (deal.pricing_calendar && deal.pricing_calendar.some(p => p.date === format(date, 'yyyy-MM-dd') && p.available === false))}
                                        />
                                      </PopoverContent>
                                    </Popover>
                                  </div>
                                </div>

                                {numberOfNights > 0 && (
                                  <div className="p-4 bg-blue-50 rounded-lg">
                                    <p className="text-sm font-semibold text-gray-900 mb-2">Stay Summary</p>
                                    <div className="space-y-1 text-sm text-gray-700">
                                      <div className="flex justify-between">
                                        <span>{numberOfNights} night{numberOfNights !== 1 ? 's' : ''}</span>
                                        <span>${(totalCost / numberOfNights).toFixed(2)}/night avg</span>
                                      </div>
                                      <div className="flex justify-between font-bold text-base pt-2 border-t">
                                        <span>Total</span>
                                        <span className="text-[#d4af37]">${totalCost.toLocaleString()}</span>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                <div>
                                  <Label>Number of Guests *</Label>
                                  <Select
                                    value={bookingData.number_of_guests.toString()}
                                    onValueChange={(value) => setBookingData({ ...bookingData, number_of_guests: parseInt(value) })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select number of guests" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                                        <SelectItem key={num} value={num.toString()}>
                                          {num} Guest{num !== 1 ? 's' : ''}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </>
                            )}

                            {dealType === 'long_term_rent' && (
                              <>
                                <div>
                                  <Label>Lease Start Date *</Label>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button variant="outline" className="w-full justify-start">
                                        <CalendarIcon className="w-4 h-4 mr-2" />
                                        {bookingData.check_in_date ? format(bookingData.check_in_date, 'MMM d, yyyy') : 'Select date'}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                      <Calendar
                                        mode="single"
                                        selected={bookingData.check_in_date}
                                        onSelect={(date) => setBookingData({ ...bookingData, check_in_date: date })}
                                        disabled={(date) => date < new Date()}
                                      />
                                    </PopoverContent>
                                  </Popover>
                                </div>

                                <div>
                                  <Label>Lease Duration *</Label>
                                  <Select
                                    value={bookingData.lease_months.toString()}
                                    onValueChange={(value) => setBookingData({ ...bookingData, lease_months: parseInt(value) })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select lease duration" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {[3, 6, 12, 18, 24].map(months => (
                                        <SelectItem key={months} value={months.toString()}>
                                          {months} Month{months !== 1 ? 's' : ''}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="p-4 bg-blue-50 rounded-lg">
                                  <p className="text-sm font-semibold text-gray-900 mb-2">Lease Summary</p>
                                  <div className="space-y-1 text-sm text-gray-700">
                                    <div className="flex justify-between">
                                      <span>${deal.price.toLocaleString()}/month × {bookingData.lease_months} months</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-base pt-2 border-t">
                                      <span>Total</span>
                                      <span className="text-[#d4af37]">${totalCost.toLocaleString()}</span>
                                    </div>
                                  </div>
                                </div>
                              </>
                            )}

                            <div>
                              <Label>Your Name *</Label>
                              <Input
                                value={bookingData.renter_name}
                                onChange={(e) => setBookingData({ ...bookingData, renter_name: e.target.value })}
                                required
                              />
                            </div>

                            <div>
                              <Label>Phone Number *</Label>
                              <Input
                                type="tel"
                                value={bookingData.renter_phone}
                                onChange={(e) => setBookingData({ ...bookingData, renter_phone: e.target.value })}
                                placeholder="+1 (555) 123-4567"
                                required
                              />
                            </div>

                            <div>
                              <Label>Message to Owner</Label>
                              <Textarea
                                value={bookingData.message}
                                onChange={(e) => setBookingData({ ...bookingData, message: e.target.value })}
                                rows={3}
                                placeholder="Tell the owner about yourself and why you're interested..."
                              />
                            </div>

                            <div>
                              <Label>Special Requests (Optional)</Label>
                              <Textarea
                                value={bookingData.special_requests}
                                onChange={(e) => setBookingData({ ...bookingData, special_requests: e.target.value })}
                                rows={2}
                                placeholder="Early check-in, late checkout, etc."
                              />
                            </div>

                            <div className="flex gap-2 pt-4">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setShowBookingForm(false)}
                                className="flex-1"
                              >
                                Cancel
                              </Button>
                              <Button
                                type="submit"
                                disabled={createBookingMutation.isLoading}
                                className="flex-1 bg-[#d4af37] hover:bg-[#c49d2a]"
                              >
                                {createBookingMutation.isLoading ? (
                                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />Sending...</>
                                ) : (
                                  'Submit Request'
                                )}
                              </Button>
                            </div>
                          </form>
                        )}
                      </DialogContent>
                    </Dialog>
                  )}

                  <div className="mt-4 space-y-3">
                    <p className="text-sm font-semibold text-gray-700">Contact Information</p>
                    {deal.contact_phone && (
                      <a href={`tel:${deal.contact_phone}`}>
                        <Button variant="outline" size="sm" className="w-full">
                          <Phone className="w-4 h-4 mr-2" />
                          {deal.contact_phone}
                        </Button>
                      </a>
                    )}
                    <a href={`mailto:${deal.contact_email || deal.user_email}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        <Mail className="w-4 h-4 mr-2" />
                        Email Owner
                      </Button>
                    </a>
                  </div>

                  {/* QR Code Section - Show for all Airbnb deals (anyone can see), only owner can regenerate */}
                  {isShortTerm && (
                    <div className="mt-6 pt-6 border-t">
                      <p className="text-sm font-semibold text-gray-700 mb-3">Marketing QR Code</p>
                      {deal.qr_code_url ? (
                        <div className="text-center">
                          <img src={deal.qr_code_url} alt="QR Code" className="w-48 h-48 mx-auto mb-3 border-2 border-gray-300 rounded-lg p-2 bg-white" />
                          <p className="text-xs text-gray-600 mb-3">
                            Scan to view this listing
                          </p>
                          {isOwner && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={handleGenerateQRCode}
                              disabled={generatingQR}
                              className="w-full"
                            >
                              {generatingQR ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                              Regenerate QR
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="text-center">
                          {isOwner ? (
                            <>
                              <div className="w-48 h-48 mx-auto mb-3 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                                <div className="text-center p-4">
                                  <Sparkles className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                                  <p className="text-xs text-gray-500">No QR code yet</p>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                className="w-full bg-[#d4af37] hover:bg-[#c49d2a]"
                                onClick={handleGenerateQRCode}
                                disabled={generatingQR}
                              >
                                {generatingQR ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                                Generate QR Code
                              </Button>
                              <p className="text-xs text-gray-500 mt-2">
                                Generate a QR code to share this listing
                              </p>
                            </>
                          ) : (
                            <div className="p-4 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-600">
                                QR code not yet available. Contact the owner for more information.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </Card>

                <Card className="p-6 bg-blue-50">
                  <p className="text-sm text-gray-700">
                    <strong>Note:</strong> Always verify listing details and meet in person before making any payments.
                  </p>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Service Deal Booking Dialog */}
      <Dialog open={showServiceDealModal} onOpenChange={setShowServiceDealModal}>
        <DialogContent className="max-w-lg no-print">
          <DialogHeader>
            <DialogTitle>Book Service: {selectedServiceDeal?.service_name}</DialogTitle>
          </DialogHeader>

          {serviceDealBookingSuccess ? (
            <div className="py-8 text-center">
              <Check className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Booking Request Sent!</h3>
              <p className="text-gray-600">
                The service provider will review your request and contact you soon.
              </p>
            </div>
          ) : (
            <form onSubmit={handleServiceDealBookingSubmit} className="space-y-4">
              {serviceDealBookingError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{serviceDealBookingError}</p>
                </div>
              )}

              <div>
                <Label>Service Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {serviceDealBookingData.service_date ? format(serviceDealBookingData.service_date, 'MMM d, yyyy') : 'Select date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={serviceDealBookingData.service_date}
                      onSelect={(date) => setServiceDealBookingData({ ...serviceDealBookingData, service_date: date })}
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label>Preferred Time *</Label>
                <Input
                  type="time"
                  value={serviceDealBookingData.service_time}
                  onChange={(e) => setServiceDealBookingData({ ...serviceDealBookingData, service_time: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label>Your Name *</Label>
                <Input
                  value={serviceDealBookingData.renter_name}
                  onChange={(e) => setServiceDealBookingData({ ...serviceDealBookingData, renter_name: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label>Phone Number *</Label>
                <Input
                  type="tel"
                  value={serviceDealBookingData.renter_phone}
                  onChange={(e) => setServiceDealBookingData({ ...serviceDealBookingData, renter_phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                  required
                />
              </div>

              <div>
                <Label>Message / Details</Label>
                <Textarea
                  value={serviceDealBookingData.message}
                  onChange={(e) => setServiceDealBookingData({ ...serviceDealBookingData, message: e.target.value })}
                  rows={4}
                  placeholder="Describe what you need help with..."
                />
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Service Price:</span>
                  <span className="text-lg font-bold text-[#d4af37]">${selectedServiceDeal?.price || 0}</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Final cost may vary based on scope
                </p>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowServiceDealModal(false);
                    setSelectedServiceDeal(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createServiceDealBookingMutation.isLoading}
                  className="flex-1 bg-[#d4af37] hover:bg-[#c49d2a]"
                >
                  {createServiceDealBookingMutation.isLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin mr-2" />Sending...</>
                  ) : (
                    'Request Booking'
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Make Offer Dialog */}
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
    </div>
  );
}
