import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle2, Loader2, XCircle, CreditCard, Receipt } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import Navigation from '../components/Navigation';

export default function PaymentSuccess() {
  const [user, setUser] = useState(null);
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [paymentData, setPaymentData] = useState(null);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session_id');

        if (!sessionId) {
          setError('No session ID found');
          setVerifying(false);
          return;
        }

        const currentUser = await base44.auth.me();
        setUser(currentUser);

        const response = await base44.functions.invoke('verifyPayment', { sessionId });

        if (response.data.success) {
          setSuccess(true);
          setPaymentData(response.data);
        } else {
          setError(response.data.message || 'Payment verification failed');
        }
      } catch (err) {
        console.error('Payment verification error:', err);
        setError(err.message || 'Failed to verify payment');
      } finally {
        setVerifying(false);
      }
    };

    verifyPayment();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <Navigation user={user} />
      
      <div className="py-20 px-4">
        <div className="max-w-2xl mx-auto">
          {verifying ? (
            <Card className="p-12 text-center">
              <Loader2 className="w-16 h-16 animate-spin text-[#1e3a5f] mx-auto mb-6" />
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Verifying Payment...</h2>
              <p className="text-gray-600">Please wait while we confirm your payment</p>
            </Card>
          ) : success ? (
            <Card className="p-12 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Payment Successful!</h2>
              
              {paymentData.paymentType === 'credits' ? (
                <>
                  <p className="text-xl text-gray-600 mb-6">
                    {paymentData.creditsAdded} credit{paymentData.creditsAdded !== 1 ? 's' : ''} added to your account
                  </p>
                  
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-8">
                    <div className="flex items-center justify-center gap-3 mb-3">
                      <CreditCard className="w-6 h-6 text-[#d4af37]" />
                      <span className="text-2xl font-bold text-gray-900">
                        {paymentData.creditsAdded} Credits
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      You can now generate {paymentData.creditsAdded} AI-powered video{paymentData.creditsAdded !== 1 ? 's' : ''}!
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link to={createPageUrl('Insights')}>
                      <Button className="bg-[#1e3a5f] hover:bg-[#2a4a7f]">
                        Go to Insights
                      </Button>
                    </Link>
                    <Link to={createPageUrl('Dashboard')}>
                      <Button variant="outline">
                        View Dashboard
                      </Button>
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xl text-gray-600 mb-6">
                    {paymentData.invoicesPaid} invoice{paymentData.invoicesPaid !== 1 ? 's' : ''} successfully paid
                  </p>
                  
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 mb-8">
                    <div className="flex items-center justify-center gap-3 mb-3">
                      <Receipt className="w-6 h-6 text-green-600" />
                      <span className="text-2xl font-bold text-gray-900">
                        All Set!
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Your lead invoices have been marked as paid. Thank you for your business!
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Link to={createPageUrl('ProviderBilling')}>
                      <Button className="bg-[#1e3a5f] hover:bg-[#2a4a7f]">
                        View Billing
                      </Button>
                    </Link>
                    <Link to={createPageUrl('Dashboard')}>
                      <Button variant="outline">
                        View Dashboard
                      </Button>
                    </Link>
                  </div>
                </>
              )}
            </Card>
          ) : (
            <Card className="p-12 text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <XCircle className="w-12 h-12 text-red-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">Payment Verification Failed</h2>
              <p className="text-gray-600 mb-6">{error || 'Something went wrong'}</p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to={createPageUrl('ProviderBilling')}>
                  <Button className="bg-[#1e3a5f] hover:bg-[#2a4a7f]">
                    Try Again
                  </Button>
                </Link>
                <Link to={createPageUrl('Dashboard')}>
                  <Button variant="outline">
                    Go to Dashboard
                  </Button>
                </Link>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}