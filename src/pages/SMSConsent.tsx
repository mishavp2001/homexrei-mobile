import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Phone, CheckCircle2, AlertCircle, Loader2, MessageSquare } from 'lucide-react';
import Navigation from '../components/Navigation';

export const isPublic = true;

export default function SMSConsent() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [currentConsent, setCurrentConsent] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Pre-fill phone if available
        if (currentUser.sms_phone_number) {
          setPhoneNumber(currentUser.sms_phone_number);
        } else if (currentUser.business_phone) {
          setPhoneNumber(currentUser.business_phone);
        } else if (currentUser.phone) {
          setPhoneNumber(currentUser.phone);
        }

        // Check current consent status
        if (currentUser.sms_consent) {
          setCurrentConsent({
            granted: true,
            date: currentUser.sms_consent_date,
            phone: currentUser.sms_phone_number
          });
        }
      } catch (error) {
        console.error('Not authenticated');
        setUser(null);
      }
      setLoadingAuth(false);
    };
    loadUser();
  }, []);

  const handleOptIn = async (e) => {
    e.preventDefault();
    setError('');

    if (!user) {
      setError('Please sign in to manage SMS notifications');
      base44.auth.redirectToLogin(window.location.href);
      return;
    }

    if (!phoneNumber.trim()) {
      setError('Please enter a valid phone number');
      return;
    }

    if (!agreedToTerms) {
      setError('Please agree to the terms and conditions');
      return;
    }

    // Validate phone number format (basic check)
    const phoneRegex = /^[\d\s\+\-\(\)]+$/;
    if (!phoneRegex.test(phoneNumber)) {
      setError('Please enter a valid phone number');
      return;
    }

    setSubmitting(true);

    try {
      // Get user's IP address (optional - for audit trail)
      let userIP = '';
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        userIP = ipData.ip;
      } catch (ipError) {
        console.log('Could not fetch IP:', ipError);
      }

      // Update user consent
      await base44.auth.updateMe({
        sms_consent: true,
        sms_consent_date: new Date().toISOString(),
        sms_consent_ip: userIP || 'unknown',
        sms_phone_number: phoneNumber.trim()
      });

      setSuccess(true);
      setCurrentConsent({
        granted: true,
        date: new Date().toISOString(),
        phone: phoneNumber.trim()
      });

      setTimeout(() => {
        window.location.reload();
      }, 3000);

    } catch (error) {
      console.error('Error saving consent:', error);
      setError('Failed to save consent. Please try again.');
    }

    setSubmitting(false);
  };

  const handleOptOut = async () => {
    if (!user) return;

    if (!confirm('Are you sure you want to unsubscribe from SMS notifications?')) {
      return;
    }

    setSubmitting(true);

    try {
      await base44.auth.updateMe({
        sms_consent: false,
        sms_consent_date: null,
        sms_consent_ip: null
      });

      setCurrentConsent(null);
      setSuccess(false);
      alert('You have been unsubscribed from SMS notifications.');
      window.location.reload();

    } catch (error) {
      console.error('Error removing consent:', error);
      setError('Failed to unsubscribe. Please try again.');
    }

    setSubmitting(false);
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
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#1e3a5f] rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-[#1e3a5f] mb-2">SMS Notifications</h1>
            <p className="text-gray-600">Manage your text message notification preferences</p>
          </div>

          {success && (
            <Card className="p-6 mb-6 bg-green-50 border-2 border-green-200">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
                <div>
                  <h3 className="font-semibold text-green-900">Successfully Opted In!</h3>
                  <p className="text-sm text-green-700">You will now receive SMS notifications for service bookings.</p>
                </div>
              </div>
            </Card>
          )}

          {currentConsent?.granted ? (
            <Card className="p-8">
              <div className="text-center mb-6">
                <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">SMS Notifications Enabled</h2>
                <p className="text-gray-600">You are currently subscribed to SMS notifications</p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Current Settings</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Phone Number:</span>
                    <span className="font-medium text-gray-900">{currentConsent.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Consent Date:</span>
                    <span className="font-medium text-gray-900">
                      {new Date(currentConsent.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className="font-medium text-green-600">Active</span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-blue-900 mb-2">What you'll receive:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Service booking requests</li>
                  <li>• Client appointment confirmations</li>
                  <li>• Important notifications about your listings</li>
                </ul>
              </div>

              <Button
                onClick={handleOptOut}
                disabled={submitting}
                variant="outline"
                className="w-full border-red-300 text-red-700 hover:bg-red-50"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" />Processing...</>
                ) : (
                  'Unsubscribe from SMS Notifications'
                )}
              </Button>
            </Card>
          ) : (
            <Card className="p-8">
              <div className="text-center mb-6">
                <Phone className="w-16 h-16 text-[#1e3a5f] mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Enable SMS Notifications</h2>
                <p className="text-gray-600">Stay informed about service bookings and client requests via text message</p>
              </div>

              {!user ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">Please sign in to manage SMS notifications</p>
                  <Button
                    onClick={() => base44.auth.redirectToLogin(window.location.href)}
                    className="bg-[#1e3a5f] hover:bg-[#2a4a7f]"
                  >
                    Sign In
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleOptIn} className="space-y-6">
                  {error && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-800">{error}</p>
                    </div>
                  )}

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">What you'll receive:</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• New service booking requests</li>
                      <li>• Client appointment details</li>
                      <li>• Important notifications about your service listings</li>
                    </ul>
                    <p className="text-xs text-blue-700 mt-3">
                      Standard message and data rates may apply. You can unsubscribe at any time.
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="phone">Mobile Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+1 (555) 123-4567"
                      required
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Include country code (e.g., +1 for US)
                    </p>
                  </div>

                  <div className="border rounded-lg p-4 bg-gray-50">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="terms"
                        checked={agreedToTerms}
                        onCheckedChange={setAgreedToTerms}
                        className="mt-1"
                      />
                      <label htmlFor="terms" className="text-sm text-gray-700 cursor-pointer">
                        I consent to receive SMS notifications from HomeXrei regarding service bookings and related updates. I understand that:
                        <ul className="list-disc ml-5 mt-2 space-y-1">
                          <li>Message frequency varies based on activity</li>
                          <li>Message and data rates may apply</li>
                          <li>I can opt-out at any time by replying STOP or updating my preferences</li>
                          <li>This consent is optional and not required to use HomeXrei services</li>
                        </ul>
                      </label>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={submitting || !agreedToTerms}
                    className="w-full bg-[#1e3a5f] hover:bg-[#2a4a7f] h-12"
                  >
                    {submitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2" />Processing...</>
                    ) : (
                      <>
                        <Phone className="w-4 h-4 mr-2" />
                        Enable SMS Notifications
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-gray-500 text-center">
                    By opting in, you agree to receive automated SMS messages from HomeXrei. 
                    For help, reply HELP. To stop, reply STOP.
                  </p>
                </form>
              )}
            </Card>
          )}

          <Card className="p-6 mt-6 bg-gray-50">
            <h3 className="font-semibold text-gray-900 mb-3">Privacy & Terms</h3>
            <div className="text-sm text-gray-600 space-y-2">
              <p>
                <strong>Consent:</strong> By providing your phone number and opting in, you expressly consent to receive automated SMS notifications from HomeXrei.
              </p>
              <p>
                <strong>Frequency:</strong> Message frequency varies depending on your service activity and booking requests.
              </p>
              <p>
                <strong>Charges:</strong> Message and data rates may apply as determined by your mobile carrier.
              </p>
              <p>
                <strong>Opt-Out:</strong> You can opt-out at any time by replying STOP to any message, or by updating your preferences on this page.
              </p>
              <p>
                <strong>Help:</strong> For assistance, reply HELP to any message or contact support@homexrei.com
              </p>
              <p>
                <strong>Privacy:</strong> Your phone number will only be used for service-related notifications and will not be shared with third parties.
              </p>
              <p className="pt-2">
                Questions? Contact us at support@homexrei.com
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}