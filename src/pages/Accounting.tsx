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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Plus, TrendingUp, TrendingDown, DollarSign, Calendar, Receipt, Loader2, AlertTriangle, Download, Camera, X, PieChart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import Navigation from '../components/Navigation';

const INCOME_CATEGORIES = [
  'Rent Income',
  'Security Deposit',
  'Late Fees',
  'Pet Fees',
  'Parking Income',
  'Other Income'
];

const EXPENSE_CATEGORIES = [
  'Mortgage Payment',
  'Property Tax',
  'Insurance',
  'HOA Fees',
  'Utilities - Water',
  'Utilities - Electric',
  'Utilities - Gas',
  'Utilities - Internet',
  'Repairs',
  'Maintenance',
  'Landscaping',
  'Snow Removal',
  'Pest Control',
  'Cleaning',
  'Property Management',
  'Legal Fees',
  'Advertising',
  'Supplies',
  'Other Expense'
];

export default function Accounting() {
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const propertyId = urlParams.get('propertyId') || urlParams.get('propertyid');

  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [formData, setFormData] = useState({
    transaction_type: 'expense',
    category: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    receipt_url: '',
    payment_method: 'bank_transfer',
    payee: '',
    payer: '',
    is_recurring: false,
    recurring_frequency: 'monthly'
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

  const { data: property, isLoading: loadingProperty } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: async () => {
      const props = await base44.entities.Property.filter({ id: propertyId });
      return props[0];
    },
    enabled: !!propertyId
  });

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions', propertyId],
    queryFn: () => base44.entities.Transaction.filter({ property_id: propertyId }, '-date'),
    enabled: !!propertyId,
    initialData: []
  });

  const isOwner = user && property && user.email === property.user_email;
  const isAdmin = user && user.role === 'admin';
  const canAccess = isOwner || isAdmin;

  const handleReceiptUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingReceipt(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, receipt_url: result.file_url });
    } catch (error) {
      console.error('Upload error:', error);
    }
    setUploadingReceipt(false);
  };

  const createTransactionMutation = useMutation({
    mutationFn: (transactionData) => base44.entities.Transaction.create({
      ...transactionData,
      property_id: propertyId
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['transactions']);
      setShowForm(false);
      setFormData({
        transaction_type: 'expense',
        category: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        receipt_url: '',
        payment_method: 'bank_transfer',
        payee: '',
        payer: '',
        is_recurring: false,
        recurring_frequency: 'monthly'
      });
    }
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: (id) => base44.entities.Transaction.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['transactions']);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createTransactionMutation.mutate({
      ...formData,
      amount: parseFloat(formData.amount)
    });
  };

  // Filter transactions by year and month
  const filteredTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.date);
    const yearMatch = transactionDate.getFullYear() === selectedYear;
    const monthMatch = selectedMonth === 'all' || transactionDate.getMonth() === parseInt(selectedMonth);
    return yearMatch && monthMatch;
  });

  // Calculate totals
  const totalIncome = filteredTransactions
    .filter(t => t.transaction_type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = filteredTransactions
    .filter(t => t.transaction_type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const netProfit = totalIncome - totalExpenses;

  // Group by category for breakdown
  const incomeByCategory = {};
  const expensesByCategory = {};

  filteredTransactions.forEach(t => {
    if (t.transaction_type === 'income') {
      incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + t.amount;
    } else {
      expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
    }
  });

  // Available years
  const years = [...new Set(transactions.map(t => new Date(t.date).getFullYear()))].sort((a, b) => b - a);
  if (years.length === 0) years.push(new Date().getFullYear());

  const months = [
    { value: 'all', label: 'All Months' },
    { value: '0', label: 'January' },
    { value: '1', label: 'February' },
    { value: '2', label: 'March' },
    { value: '3', label: 'April' },
    { value: '4', label: 'May' },
    { value: '5', label: 'June' },
    { value: '6', label: 'July' },
    { value: '7', label: 'August' },
    { value: '8', label: 'September' },
    { value: '9', label: 'October' },
    { value: '10', label: 'November' },
    { value: '11', label: 'December' }
  ];

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
                You don't have permission to view this property's accounting.
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
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Link to={createPageUrl(`PropertyDetails?id=${propertyId}`)}>
              <Button variant="outline" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold text-[#1e3a5f]">Property Accounting</h1>
                {property?.property_classification && (
                  <Badge variant="outline" className="capitalize">
                    {property.property_classification}
                  </Badge>
                )}
              </div>
              <p className="text-gray-600">{property?.address}</p>
            </div>
            <Button onClick={() => setShowForm(true)} className="bg-[#d4af37] hover:bg-[#c49d2a]">
              <Plus className="w-4 h-4 mr-2" />
              Add Transaction
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-600">Total Income</span>
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-600">
                ${totalIncome.toLocaleString()}
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-600">Total Expenses</span>
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-3xl font-bold text-red-600">
                ${totalExpenses.toLocaleString()}
              </p>
            </Card>

            <Card className={`p-6 ${netProfit >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-700">Net Profit/Loss</span>
                <DollarSign className={`w-5 h-5 ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </div>
              <p className={`text-3xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ${Math.abs(netProfit).toLocaleString()}
              </p>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-600">Transactions</span>
                <Receipt className="w-5 h-5 text-[#1e3a5f]" />
              </div>
              <p className="text-3xl font-bold text-[#1e3a5f]">
                {filteredTransactions.length}
              </p>
            </Card>
          </div>

          {/* Filters */}
          <Card className="p-6 mb-8">
            <div className="flex gap-4 items-end flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <Label>Year</Label>
                <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[200px]">
                <Label>Month</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map(month => (
                      <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button variant="outline" className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export Report
              </Button>
            </div>
          </Card>

          <Tabs defaultValue="transactions" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="transactions">Transactions</TabsTrigger>
              <TabsTrigger value="income-breakdown">Income Breakdown</TabsTrigger>
              <TabsTrigger value="expense-breakdown">Expense Breakdown</TabsTrigger>
            </TabsList>

            <TabsContent value="transactions">
              <div className="space-y-3">
                {filteredTransactions.length === 0 ? (
                  <Card className="p-12 text-center">
                    <Receipt className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">No transactions yet</h3>
                    <p className="text-gray-500 mb-4">Start tracking your property income and expenses</p>
                    <Button onClick={() => setShowForm(true)} className="bg-[#1e3a5f] hover:bg-[#2a4a7f]">
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Transaction
                    </Button>
                  </Card>
                ) : (
                  filteredTransactions.map((transaction) => (
                    <Card key={transaction.id} className="p-6 hover:shadow-lg transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h3 className="text-lg font-semibold text-gray-900">{transaction.category}</h3>
                            <Badge className={transaction.transaction_type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                              {transaction.transaction_type === 'income' ? 'Income' : 'Expense'}
                            </Badge>
                            {transaction.is_recurring && (
                              <Badge variant="outline">Recurring ({transaction.recurring_frequency})</Badge>
                            )}
                          </div>

                          {transaction.description && (
                            <p className="text-gray-600 mb-3">{transaction.description}</p>
                          )}

                          <div className="flex items-center gap-6 text-sm text-gray-500 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {format(new Date(transaction.date), 'MMM d, yyyy')}
                            </span>
                            {transaction.payment_method && (
                              <span className="capitalize">{transaction.payment_method.replace('_', ' ')}</span>
                            )}
                            {transaction.payee && (
                              <span>Payee: {transaction.payee}</span>
                            )}
                            {transaction.payer && (
                              <span>Payer: {transaction.payer}</span>
                            )}
                          </div>

                          {transaction.receipt_url && (
                            <div className="mt-3">
                              <a href={transaction.receipt_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-[#1e3a5f] hover:underline">
                                <Receipt className="w-4 h-4" />
                                View Receipt
                              </a>
                            </div>
                          )}
                        </div>

                        <div className="text-right">
                          <p className={`text-2xl font-bold ${transaction.transaction_type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                            {transaction.transaction_type === 'income' ? '+' : '-'}${transaction.amount.toLocaleString()}
                          </p>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-800 mt-2"
                            onClick={() => {
                              if (confirm('Delete this transaction?')) {
                                deleteTransactionMutation.mutate(transaction.id);
                              }
                            }}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="income-breakdown">
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <PieChart className="w-6 h-6 text-green-600" />
                  <h2 className="text-xl font-bold text-gray-900">Income by Category</h2>
                </div>
                
                {Object.keys(incomeByCategory).length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No income recorded for this period</p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(incomeByCategory)
                      .sort(([, a], [, b]) => b - a)
                      .map(([category, amount]) => {
                        const percentage = ((amount / totalIncome) * 100).toFixed(1);
                        return (
                          <div key={category}>
                            <div className="flex justify-between mb-2">
                              <span className="font-medium text-gray-700">{category}</span>
                              <span className="font-bold text-green-600">${amount.toLocaleString()}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div
                                className="bg-green-600 h-3 rounded-full"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <p className="text-sm text-gray-500 mt-1">{percentage}% of total income</p>
                          </div>
                        );
                      })}
                  </div>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="expense-breakdown">
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <PieChart className="w-6 h-6 text-red-600" />
                  <h2 className="text-xl font-bold text-gray-900">Expenses by Category</h2>
                </div>
                
                {Object.keys(expensesByCategory).length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No expenses recorded for this period</p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(expensesByCategory)
                      .sort(([, a], [, b]) => b - a)
                      .map(([category, amount]) => {
                        const percentage = ((amount / totalExpenses) * 100).toFixed(1);
                        return (
                          <div key={category}>
                            <div className="flex justify-between mb-2">
                              <span className="font-medium text-gray-700">{category}</span>
                              <span className="font-bold text-red-600">${amount.toLocaleString()}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div
                                className="bg-red-600 h-3 rounded-full"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <p className="text-sm text-gray-500 mt-1">{percentage}% of total expenses</p>
                          </div>
                        );
                      })}
                  </div>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Add Transaction Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="transaction_type">Transaction Type *</Label>
                <Select
                  value={formData.transaction_type}
                  onValueChange={(value) => setFormData({ ...formData, transaction_type: value, category: '' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {(formData.transaction_type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Amount ($) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                placeholder="Additional notes about this transaction..."
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="payment_method">Payment Method</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.transaction_type === 'expense' && (
                <div>
                  <Label htmlFor="payee">Payee (Who received payment)</Label>
                  <Input
                    id="payee"
                    value={formData.payee}
                    onChange={(e) => setFormData({ ...formData, payee: e.target.value })}
                    placeholder="e.g., ABC Plumbing"
                  />
                </div>
              )}

              {formData.transaction_type === 'income' && (
                <div>
                  <Label htmlFor="payer">Payer (Who made payment)</Label>
                  <Input
                    id="payer"
                    value={formData.payer}
                    onChange={(e) => setFormData({ ...formData, payer: e.target.value })}
                    placeholder="e.g., Tenant Name"
                  />
                </div>
              )}
            </div>

            <div>
              <Label>Receipt/Invoice</Label>
              {formData.receipt_url ? (
                <div className="flex items-center gap-3">
                  <a href={formData.receipt_url} target="_blank" rel="noopener noreferrer" className="text-sm text-[#1e3a5f] hover:underline flex items-center gap-1">
                    <Receipt className="w-4 h-4" />
                    View Receipt
                  </a>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setFormData({ ...formData, receipt_url: '' })}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={handleReceiptUpload}
                    disabled={uploadingReceipt}
                  />
                  <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg text-sm w-fit">
                    {uploadingReceipt ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                    <span>{uploadingReceipt ? 'Uploading...' : 'Upload Receipt'}</span>
                  </div>
                </label>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_recurring"
                checked={formData.is_recurring}
                onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="is_recurring" className="cursor-pointer">This is a recurring transaction</Label>
            </div>

            {formData.is_recurring && (
              <div>
                <Label htmlFor="recurring_frequency">Frequency</Label>
                <Select
                  value={formData.recurring_frequency}
                  onValueChange={(value) => setFormData({ ...formData, recurring_frequency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-[#1e3a5f] hover:bg-[#2a4a7f]"
                disabled={createTransactionMutation.isLoading}
              >
                {createTransactionMutation.isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Adding...
                  </>
                ) : (
                  'Add Transaction'
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}