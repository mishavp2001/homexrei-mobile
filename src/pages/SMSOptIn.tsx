import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { MessageCircle, CheckCircle2, AlertCircle, Phone } from 'lucide-react';
import Navigation from '../components/Navigation';

export const isPublic = true;

export default function SMSOptIn() {
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setPhoneNumber(currentUser.phone || currentUser.business_phone || '');
        
        // Check if already opted in
        if (currentUser.sms_opt_in) {
          setSuccess(true);
          setConsent(true);
        }
      } catch (error) {
        // User not logged in
      }
      setLoadingAuth(false);
    };
    loadUser();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!phoneNumber.trim()) {
      setError('Please enter your phone number');
      return;
    }

    if (!consent) {
      setError('Please agree to receive SMS notifications');
      return;
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^[\d\s\-\(\)\+]+$/;
    if (!phoneRegex.test(phoneNumber)) {
      setError('Please enter a valid phone number');
      return;
    }

    setSubmitting(true);

    try {
      if (!user) {
        // If not logged in, redirect to login
        alert('Please sign in to opt-in to SMS notifications');
        base44.auth.redirectToLogin(window.location.href);
        return;
      }

      // Get IP address for consent record
      let ipAddress = 'unknown';
      try {
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        const ipData = await ipResponse.json();
        ipAddress = ipData.ip;
      } catch (ipError) {
        console.log('Could not fetch IP:', ipError);
      }

      // Update user with SMS opt-in
      await base44.auth.updateMe({
        phone: phoneNumber,
        sms_opt_in: true,
        sms_opt_in_date: new Date().toISOString(),
        sms_opt_in_ip: ipAddress
      });

      setSuccess(true);
      setSubmitting(false);
    } catch (error) {
      console.error('Opt-in error:', error);
      setError(error.message || 'Failed to save opt-in preference');
      setSubmitting(false);
    }
  };

  const handleOptOut = async () => {
    if (!confirm('Are you sure you want to opt-out of SMS notifications?')) {
      return;
    }

    setSubmitting(true);
    try {
      await base44.auth.updateMe({
        sms_opt_in: false
      });
      setSuccess(false);
      setConsent(false);
      setSubmitting(false);
      alert('You have been opted out of SMS notifications');
    } catch (error) {
      console.error('Opt-out error:', error);
      setError('Failed to opt-out');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <Navigation user={user} />
      
      <div className="py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-[#1e3a5f] rounded-full flex items-center justify-center mx-auto mb-6">
              <MessageCircle className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-[#1e3a5f] mb-3">SMS Notifications</h1>
            <p className="text-gray-600">Get instant updates about your bookings and services</p>
          </div>

          {success ? (
            <Card className="p-8 text-center">
              <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-gray-900 mb-3">You're All Set!</h2>
              <p className="text-gray-600 mb-6">
                You'll receive SMS notifications for important updates about your HomeXrei bookings and services.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-center gap-2 text-sm text-gray-700">
                  <Phone className="w-4 h-4" />
                  <span className="font-medium">{phoneNumber}</span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mb-6">
                Message and data rates may apply. You can opt-out at any time by replying STOP to any message or by updating your preferences below.
              </p>
              <Button 
                variant="outline" 
                onClick={handleOptOut}
                disabled={submitting}
                className="mx-auto"
              >
                Opt Out of SMS Notifications
              </Button>
            </Card>
          ) : (
            <Card className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    required
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Include country code (e.g., +1 for US)
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-[#1e3a5f] mb-2">What you'll receive:</h3>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>✅ Booking confirmations</li>
                    <li>✅ Service provider updates</li>
                    <li>✅ Appointment reminders</li>
                    <li>✅ Important account notifications</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="consent"
                      checked={consent}
                      onCheckedChange={setConsent}
                      className="mt-1"
                    />
                    <div>
                      <Label htmlFor="consent" className="cursor-pointer font-normal">
                        <span className="font-semibold">I agree to receive SMS notifications</span> from HomeXrei at the phone number provided above. I understand that:
                      </Label>
                      <ul className="text-xs text-gray-600 mt-2 space-y-1 ml-4">
                        <li>• Message and data rates may apply</li>
                        <li>• I can opt-out at any time by replying STOP</li>
                        <li>• Message frequency varies based on activity</li>
                        <li>• My consent is not a condition of purchase</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={submitting || !consent}
                  className="w-full bg-[#1e3a5f] hover:bg-[#2a4a7f]"
                >
                  {submitting ? 'Saving...' : 'Enable SMS Notifications'}
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  By submitting this form, you provide your signature consenting to receive recurring automated marketing text messages from HomeXrei. 
                  View our <a href="#" className="underline">Privacy Policy</a> and <a href="#" className="underline">Terms of Service</a>.
                </p>
              </form>
            </Card>
          )}

          {/* Additional Info */}
          <Card className="p-6 mt-6 bg-gray-50">
            <h3 className="font-semibold text-gray-900 mb-3">Privacy & Security</h3>
            <p className="text-sm text-gray-600 mb-3">
              Your phone number and consent preferences are securely stored and used only for sending you notifications related to your HomeXrei account.
            </p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>✓ We never sell your information</li>
              <li>✓ Opt-out anytime by replying STOP</li>
              <li>✓ Standard message rates apply</li>
              <li>✓ For help, reply HELP to any message</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}