import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Loader2, CreditCard, DollarSign, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function BuyCredits({ isOpen, onClose }) {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedAmount, setSelectedAmount] = useState(1000); // Default $10

  const creditPackages = [
    { amount: 500, credits: 5, label: '$5 - 5 Credits', popular: false },
    { amount: 1000, credits: 10, label: '$10 - 10 Credits', popular: true },
    { amount: 2000, credits: 20, label: '$20 - 20 Credits', popular: false },
    { amount: 5000, credits: 50, label: '$50 - 50 Credits', popular: false },
  ];

  const handlePurchase = async () => {
    setProcessing(true);
    setError(null);
    
    try {
      console.log('Creating checkout session for amount:', selectedAmount);
      
      const response = await base44.functions.invoke('createCheckoutSession', { 
        amount: selectedAmount 
      });

      console.log('Checkout session response:', response);

      if (response.data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = response.data.url;
      } else if (response.data?.error) {
        throw new Error(response.data.error);
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.message || 'Failed to initiate payment. Please try again.');
      setProcessing(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-[#1e3a5f]">Buy Credits</DialogTitle>
          <p className="text-sm text-gray-600">1 Credit = $1 | Video Generation costs 1 Credit</p>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div>
            <Label className="mb-3 block">Select Package</Label>
            <div className="grid grid-cols-2 gap-3">
              {creditPackages.map((pkg) => (
                <button
                  key={pkg.amount}
                  type="button"
                  onClick={() => setSelectedAmount(pkg.amount)}
                  disabled={processing}
                  className={`p-4 border-2 rounded-lg text-left transition-all relative ${
                    selectedAmount === pkg.amount
                      ? 'border-[#1e3a5f] bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  } ${processing ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {pkg.popular && (
                    <span className="absolute -top-2 -right-2 bg-[#d4af37] text-white text-xs px-2 py-1 rounded-full">
                      Popular
                    </span>
                  )}
                  <div className="font-semibold text-gray-900">{pkg.credits} Credits</div>
                  <div className="text-sm text-gray-600">${(pkg.amount / 100).toFixed(0)}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">Selected Package:</span>
              <span className="font-semibold text-gray-900">
                {creditPackages.find(p => p.amount === selectedAmount)?.credits} Credits
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total:</span>
              <span className="text-2xl font-bold text-[#d4af37]">
                ${(selectedAmount / 100).toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={processing}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handlePurchase}
              disabled={processing}
              className="flex-1 bg-[#1e3a5f] hover:bg-[#2a4a7f]"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Proceed to Payment
                </>
              )}
            </Button>
          </div>

          <p className="text-xs text-center text-gray-500">
            You'll be redirected to Stripe's secure checkout page
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}