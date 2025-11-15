import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, Receipt, TrendingUp, AlertCircle, CheckCircle, Loader2, Download, CreditCard, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import Navigation from '../components/Navigation';
import BuyCredits from '../components/BuyCredits';

export default function ProviderBilling() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [payingInvoice, setPayingInvoice] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error('Not authenticated', error);
        base44.auth.redirectToLogin(window.location.origin + createPageUrl('ProviderBilling'));
      }
      setLoadingAuth(false);
    };
    loadUser();
  }, []);

  const { data: providerSettings, isLoading: loadingSettings } = useQuery({
    queryKey: ['providerSettings', user?.email],
    queryFn: async () => {
      if (!user) return null;
      const settings = await base44.entities.ProviderSettings.filter({ provider_email: user.email });
      return settings[0] || null;
    },
    enabled: !!user
  });

  const { data: leadCharges = [], isLoading: loadingCharges } = useQuery({
    queryKey: ['leadCharges', user?.email],
    queryFn: async () => {
      if (!user) return [];
      return await base44.entities.LeadCharge.filter({ provider_email: user.email }, '-created_date');
    },
    enabled: !!user
  });

  const { data: serviceListings = [] } = useQuery({
    queryKey: ['myServices', user?.email],
    queryFn: async () => {
      if (!user) return [];
      return await base44.entities.ServiceListing.filter({ expert_email: user.email });
    },
    enabled: !!user
  });

  const payInvoiceMutation = useMutation({
    mutationFn: async (chargeIds) => {
      const totalAmount = chargeIds.reduce((sum, id) => {
        const charge = leadCharges.find(c => c.id === id);
        return sum + (charge?.lead_amount || 0);
      }, 0);

      const response = await base44.functions.invoke('createCheckoutSession', {
        amount: Math.round(totalAmount * 100), // Convert to cents
        invoiceIds: chargeIds
      });

      if (response.data?.url) {
        window.location.href = response.data.url;
      } else {
        throw new Error('Failed to create checkout session');
      }
    },
    onError: (error) => {
      alert(`Failed to process payment: ${error.message}`);
    }
  });

  const pendingCharges = leadCharges.filter(c => c.status === 'pending');
  const paidCharges = leadCharges.filter(c => c.status === 'paid');
  const disputedCharges = leadCharges.filter(c => c.status === 'disputed');

  const totalPending = pendingCharges.reduce((sum, c) => sum + c.lead_amount, 0);
  const totalPaid = paidCharges.reduce((sum, c) => sum + c.lead_amount, 0);

  const userCredits = user?.credits || 0;

  const handlePayAllPending = () => {
    if (pendingCharges.length === 0) return;
    
    if (confirm(`Pay all pending charges ($${totalPending.toFixed(2)})?`)) {
      payInvoiceMutation.mutate(pendingCharges.map(c => c.id));
    }
  };

  const handlePaySingle = (charge) => {
    if (confirm(`Pay invoice for ${charge.project_title} ($${charge.lead_amount.toFixed(2)})?`)) {
      payInvoiceMutation.mutate([charge.id]);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      paid: 'bg-green-100 text-green-800',
      disputed: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || colors.pending;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <AlertCircle className="w-4 h-4" />;
      case 'disputed':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Receipt className="w-4 h-4" />;
    }
  };

  if (loadingAuth || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#1e3a5f]" />
      </div>
    );
  }

  if (serviceListings.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
        <Navigation user={user} />
        <div className="py-12 px-4">
          <div className="max-w-2xl mx-auto">
            <Card className="p-12 text-center">
              <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Not a Service Provider</h2>
              <p className="text-gray-600 mb-6">
                You need to create a service listing to access provider billing.
              </p>
              <Link to={createPageUrl('Profile')}>
                <Button className="bg-[#1e3a5f] hover:bg-[#2a4a7f]">
                  Create Service Listing
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
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#d4af37] rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-[#1e3a5f]">Provider Billing</h1>
                <p className="text-gray-600">Manage your lead fees and billing</p>
              </div>
            </div>
            <Link to={createPageUrl('Profile')}>
              <Button variant="outline">
                Back to Profile
              </Button>
            </Link>
          </div>

          {/* Summary Cards */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Total Leads</span>
                <TrendingUp className="w-4 h-4 text-blue-500" />
              </div>
              <p className="text-3xl font-bold text-[#1e3a5f]">
                {providerSettings?.total_leads_received || 0}
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Pending</span>
                <AlertCircle className="w-4 h-4 text-yellow-500" />
              </div>
              <p className="text-3xl font-bold text-yellow-600">
                ${totalPending.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">{pendingCharges.length} charges</p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Paid</span>
                <CheckCircle className="w-4 h-4 text-green-500" />
              </div>
              <p className="text-3xl font-bold text-green-600">
                ${totalPaid.toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">{paidCharges.length} charges</p>
            </Card>

            <Card className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Video Credits</span>
                <Sparkles className="w-4 h-4 text-purple-500" />
              </div>
              <p className="text-3xl font-bold text-purple-600">
                {userCredits}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowBuyCredits(true)}
                className="mt-2 w-full border-purple-300 text-purple-600 hover:bg-purple-50"
              >
                <CreditCard className="w-3 h-3 mr-1" />
                Buy More
              </Button>
            </Card>
          </div>

          {/* Billing Info */}
          {providerSettings && (
            <Card className="p-6 mb-8">
              <h2 className="text-xl font-bold text-[#1e3a5f] mb-4">Account Settings</h2>
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Payment Terms</p>
                  <Badge variant="outline" className="capitalize">
                    {providerSettings.payment_terms?.replace('_', ' ') || 'Net 30'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Account Status</p>
                  <Badge className={
                    providerSettings.status === 'active' ? 'bg-green-100 text-green-800' :
                    providerSettings.status === 'suspended' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }>
                    {providerSettings.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Lead Fee</p>
                  <p className="text-lg font-semibold text-[#1e3a5f]">
                    ${providerSettings.lead_fee_per_lead || 10} per lead
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Lead Charges */}
          <Card className="p-6">
            <Tabs defaultValue="pending">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[#1e3a5f]">Lead Charges</h2>
                <TabsList>
                  <TabsTrigger value="pending">
                    Pending ({pendingCharges.length})
                  </TabsTrigger>
                  <TabsTrigger value="paid">
                    Paid ({paidCharges.length})
                  </TabsTrigger>
                  <TabsTrigger value="all">
                    All ({leadCharges.length})
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="pending">
                {pendingCharges.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No pending charges</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 flex justify-between items-center p-4 bg-yellow-50 rounded-lg">
                      <div>
                        <p className="text-sm text-gray-600">Total Pending Balance</p>
                        <p className="text-2xl font-bold text-yellow-600">${totalPending.toFixed(2)}</p>
                      </div>
                      <Button
                        onClick={handlePayAllPending}
                        disabled={payInvoiceMutation.isLoading}
                        className="bg-[#1e3a5f] hover:bg-[#2a4a7f]"
                      >
                        {payInvoiceMutation.isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4 mr-2" />
                            Pay All via Stripe
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {pendingCharges.map((charge) => (
                        <Card key={charge.id} className="p-4 border-2 border-yellow-100">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-gray-900">{charge.project_title}</h3>
                                <Badge className={getStatusColor(charge.status)}>
                                  {getStatusIcon(charge.status)}
                                  <span className="ml-1">{charge.status}</span>
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 mb-1">
                                📍 {charge.property_address}
                              </p>
                              <p className="text-xs text-gray-500">
                                Received: {format(new Date(charge.created_date), 'MMM d, yyyy h:mm a')}
                              </p>
                            </div>
                            <div className="text-right flex flex-col items-end gap-2">
                              <p className="text-2xl font-bold text-[#d4af37]">
                                ${charge.lead_amount.toFixed(2)}
                              </p>
                              <Button
                                size="sm"
                                onClick={() => handlePaySingle(charge)}
                                disabled={payInvoiceMutation.isLoading}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CreditCard className="w-3 h-3 mr-1" />
                                Pay
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
              </TabsContent>

              <TabsContent value="paid">
                {paidCharges.length === 0 ? (
                  <div className="text-center py-12">
                    <Receipt className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No paid charges yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paidCharges.map((charge) => (
                      <Card key={charge.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-gray-900">{charge.project_title}</h3>
                              <Badge className={getStatusColor(charge.status)}>
                                {getStatusIcon(charge.status)}
                                <span className="ml-1">{charge.status}</span>
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-1">
                              📍 {charge.property_address}
                            </p>
                            <p className="text-xs text-gray-500">
                              Paid: {charge.payment_date ? format(new Date(charge.payment_date), 'MMM d, yyyy') : 'N/A'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-green-600">
                              ${charge.lead_amount.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="all">
                {loadingCharges ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-12 h-12 animate-spin text-[#1e3a5f] mx-auto" />
                  </div>
                ) : leadCharges.length === 0 ? (
                  <div className="text-center py-12">
                    <Receipt className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">No lead charges yet</p>
                    <p className="text-sm text-gray-500">
                      When you receive qualified leads, charges will appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {leadCharges.map((charge) => (
                      <Card key={charge.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-gray-900">{charge.project_title}</h3>
                              <Badge className={getStatusColor(charge.status)}>
                                {getStatusIcon(charge.status)}
                                <span className="ml-1">{charge.status}</span>
                              </Badge>
                              {charge.lead_quality && (
                                <Badge variant="outline" className="capitalize">
                                  {charge.lead_quality}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-1">
                              📍 {charge.property_address}
                            </p>
                            <p className="text-xs text-gray-500">
                              {format(new Date(charge.created_date), 'MMM d, yyyy h:mm a')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-[#1e3a5f]">
                              ${charge.lead_amount.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </Card>

          {/* Payment Info */}
          <Card className="p-6 mt-8 bg-blue-50 border-2 border-blue-200">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Receipt className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-900 mb-2">How Lead Billing Works</h3>
                <ul className="text-sm text-blue-800 space-y-2">
                  <li>✓ You only pay for <strong>qualified leads</strong> that match your services</li>
                  <li>✓ Standard rate: <strong>${providerSettings?.lead_fee_per_lead || 10} per lead</strong></li>
                  <li>✓ Payment terms: <strong>{providerSettings?.payment_terms?.replace('_', ' ') || 'Net 30 days'}</strong></li>
                  <li>✓ You'll receive client contact info and project details</li>
                  <li>✓ No charge for duplicate or spam leads</li>
                  <li>✓ Pay anytime via Stripe secure checkout</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Buy Credits Modal */}
      <BuyCredits
        isOpen={showBuyCredits}
        onClose={() => setShowBuyCredits(false)}
      />
    </div>
  );
}