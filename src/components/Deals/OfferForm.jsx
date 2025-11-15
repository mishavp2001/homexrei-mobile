import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, DollarSign, FileText, AlertCircle, Plus, X } from 'lucide-react';
import { format, addDays } from 'date-fns';

export default function OfferForm({ deal, currentUser, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    buyer_name: currentUser?.full_name || '',
    buyer_email: currentUser?.email || '',
    buyer_phone: '',
    buyer_address: '',
    offer_amount: deal.price || '',
    earnest_money_deposit: Math.round((deal.price || 0) * 0.01), // 1% default
    down_payment_percent: 20,
    financing_type: 'conventional',
    financing_details: '',
    inspection_contingency: true,
    inspection_period_days: 10,
    appraisal_contingency: true,
    financing_contingency: true,
    closing_date: addDays(new Date(), 45), // 45 days from now
    expiration_date: addDays(new Date(), 3), // 3 days to respond
    closing_cost_responsibility: 'negotiable',
    additional_terms: '',
    contingencies: []
  });

  const [newContingency, setNewContingency] = useState('');
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!formData.buyer_name?.trim()) {
      newErrors.buyer_name = 'Name is required';
    }

    if (!formData.buyer_phone?.trim()) {
      newErrors.buyer_phone = 'Phone number is required';
    }

    if (!formData.offer_amount || formData.offer_amount <= 0) {
      newErrors.offer_amount = 'Valid offer amount is required';
    }

    if (formData.earnest_money_deposit < 0) {
      newErrors.earnest_money_deposit = 'Earnest money cannot be negative';
    }

    if (formData.down_payment_percent < 0 || formData.down_payment_percent > 100) {
      newErrors.down_payment_percent = 'Down payment must be between 0 and 100%';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const offerData = {
      ...formData,
      deal_id: deal.id,
      property_address: deal.location,
      seller_email: deal.user_email,
      offer_amount: parseFloat(formData.offer_amount),
      earnest_money_deposit: parseFloat(formData.earnest_money_deposit),
      down_payment_percent: parseFloat(formData.down_payment_percent),
      inspection_period_days: parseInt(formData.inspection_period_days),
      closing_date: formData.closing_date ? format(formData.closing_date, 'yyyy-MM-dd') : null,
      expiration_date: formData.expiration_date ? format(formData.expiration_date, 'yyyy-MM-dd') : null
    };

    onSubmit(offerData);
  };

  const addContingency = () => {
    if (newContingency.trim()) {
      setFormData({
        ...formData,
        contingencies: [...formData.contingencies, newContingency.trim()]
      });
      setNewContingency('');
    }
  };

  const removeContingency = (index) => {
    setFormData({
      ...formData,
      contingencies: formData.contingencies.filter((_, i) => i !== index)
    });
  };

  const calculateDownPayment = () => {
    return (formData.offer_amount * formData.down_payment_percent) / 100;
  };

  const calculateLoanAmount = () => {
    return formData.offer_amount - calculateDownPayment();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Property Summary */}
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-blue-100">
        <h3 className="font-semibold text-[#1e3a5f] mb-2">Property Details</h3>
        <p className="text-sm text-gray-700">{deal.location}</p>
        <p className="text-2xl font-bold text-[#d4af37] mt-2">
          Asking Price: ${deal.price.toLocaleString()}
        </p>
      </Card>

      {/* Buyer Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-[#1e3a5f] flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Buyer Information
        </h3>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Full Name *</Label>
            <Input
              value={formData.buyer_name}
              onChange={(e) => setFormData({ ...formData, buyer_name: e.target.value })}
              className={errors.buyer_name ? 'border-red-500' : ''}
            />
            {errors.buyer_name && (
              <p className="text-xs text-red-600 mt-1">{errors.buyer_name}</p>
            )}
          </div>

          <div>
            <Label>Phone Number *</Label>
            <Input
              type="tel"
              value={formData.buyer_phone}
              onChange={(e) => setFormData({ ...formData, buyer_phone: e.target.value })}
              placeholder="+1 (555) 123-4567"
              className={errors.buyer_phone ? 'border-red-500' : ''}
            />
            {errors.buyer_phone && (
              <p className="text-xs text-red-600 mt-1">{errors.buyer_phone}</p>
            )}
          </div>
        </div>

        <div>
          <Label>Current Address (Optional)</Label>
          <Input
            value={formData.buyer_address}
            onChange={(e) => setFormData({ ...formData, buyer_address: e.target.value })}
            placeholder="123 Main St, City, State ZIP"
          />
        </div>
      </div>

      {/* Offer Amount */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-[#1e3a5f] flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Offer Terms
        </h3>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Offer Amount * ($)</Label>
            <Input
              type="number"
              value={formData.offer_amount}
              onChange={(e) => setFormData({ ...formData, offer_amount: e.target.value })}
              placeholder="450000"
              className={errors.offer_amount ? 'border-red-500' : ''}
            />
            {errors.offer_amount && (
              <p className="text-xs text-red-600 mt-1">{errors.offer_amount}</p>
            )}
          </div>

          <div>
            <Label>Earnest Money Deposit ($)</Label>
            <Input
              type="number"
              value={formData.earnest_money_deposit}
              onChange={(e) => setFormData({ ...formData, earnest_money_deposit: e.target.value })}
              placeholder="4500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Typically 1-2% of offer amount
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Down Payment (%)</Label>
            <Input
              type="number"
              value={formData.down_payment_percent}
              onChange={(e) => setFormData({ ...formData, down_payment_percent: e.target.value })}
              placeholder="20"
              min="0"
              max="100"
            />
            <p className="text-xs text-gray-500 mt-1">
              Amount: ${calculateDownPayment().toLocaleString()}
            </p>
          </div>

          <div>
            <Label>Financing Type *</Label>
            <Select
              value={formData.financing_type}
              onValueChange={(value) => setFormData({ ...formData, financing_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">💵 Cash</SelectItem>
                <SelectItem value="conventional">🏦 Conventional Loan</SelectItem>
                <SelectItem value="fha">🏠 FHA Loan</SelectItem>
                <SelectItem value="va">🎖️ VA Loan</SelectItem>
                <SelectItem value="owner_financing">🤝 Owner Financing</SelectItem>
                <SelectItem value="other">📋 Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {formData.financing_type !== 'cash' && (
          <div>
            <Label>Financing Details</Label>
            <Textarea
              value={formData.financing_details}
              onChange={(e) => setFormData({ ...formData, financing_details: e.target.value })}
              rows={2}
              placeholder="Pre-approval amount, lender name, loan terms, etc."
            />
          </div>
        )}

        {/* Loan Calculation Summary */}
        {formData.offer_amount > 0 && (
          <Card className="p-4 bg-gray-50">
            <h4 className="font-semibold text-sm text-gray-700 mb-2">Financial Summary</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Offer Amount:</span>
                <span className="font-semibold">${parseFloat(formData.offer_amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Down Payment ({formData.down_payment_percent}%):</span>
                <span className="font-semibold">${calculateDownPayment().toLocaleString()}</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-gray-600">Loan Amount:</span>
                <span className="font-bold text-[#1e3a5f]">${calculateLoanAmount().toLocaleString()}</span>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Dates */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-[#1e3a5f] flex items-center gap-2">
          <CalendarIcon className="w-5 h-5" />
          Timeline
        </h3>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Proposed Closing Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {formData.closing_date ? format(formData.closing_date, 'MMM d, yyyy') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.closing_date}
                  onSelect={(date) => setFormData({ ...formData, closing_date: date })}
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>Offer Expiration Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {formData.expiration_date ? format(formData.expiration_date, 'MMM d, yyyy') : 'Select date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={formData.expiration_date}
                  onSelect={(date) => setFormData({ ...formData, expiration_date: date })}
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-gray-500 mt-1">How long seller has to respond</p>
          </div>
        </div>
      </div>

      {/* Contingencies */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-[#1e3a5f] flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Contingencies & Conditions
        </h3>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Checkbox
              checked={formData.inspection_contingency}
              onCheckedChange={(checked) => setFormData({ ...formData, inspection_contingency: checked })}
            />
            <div className="flex-1">
              <Label>Inspection Contingency</Label>
              {formData.inspection_contingency && (
                <div className="mt-2">
                  <Input
                    type="number"
                    value={formData.inspection_period_days}
                    onChange={(e) => setFormData({ ...formData, inspection_period_days: e.target.value })}
                    placeholder="10"
                    className="w-32"
                  />
                  <span className="text-sm text-gray-600 ml-2">days for inspection</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Checkbox
              checked={formData.appraisal_contingency}
              onCheckedChange={(checked) => setFormData({ ...formData, appraisal_contingency: checked })}
            />
            <Label>Appraisal Contingency (property must appraise at or above offer)</Label>
          </div>

          <div className="flex items-center gap-3">
            <Checkbox
              checked={formData.financing_contingency}
              onCheckedChange={(checked) => setFormData({ ...formData, financing_contingency: checked })}
            />
            <Label>Financing Contingency (subject to loan approval)</Label>
          </div>
        </div>

        {/* Additional Contingencies */}
        <div className="mt-4">
          <Label>Additional Contingencies</Label>
          <div className="flex gap-2 mt-2">
            <Input
              value={newContingency}
              onChange={(e) => setNewContingency(e.target.value)}
              placeholder="e.g., Sale of current home, HOA approval..."
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addContingency())}
            />
            <Button type="button" onClick={addContingency} variant="outline">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.contingencies.map((contingency, index) => (
              <Badge key={index} variant="outline" className="flex items-center gap-1">
                {contingency}
                <X
                  className="w-3 h-3 cursor-pointer"
                  onClick={() => removeContingency(index)}
                />
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Closing Costs */}
      <div>
        <Label>Closing Cost Responsibility</Label>
        <Select
          value={formData.closing_cost_responsibility}
          onValueChange={(value) => setFormData({ ...formData, closing_cost_responsibility: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="buyer_pays_all">Buyer Pays All Closing Costs</SelectItem>
            <SelectItem value="seller_pays_all">Seller Pays All Closing Costs</SelectItem>
            <SelectItem value="split_50_50">Split 50/50</SelectItem>
            <SelectItem value="negotiable">Negotiable</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Additional Terms */}
      <div>
        <Label>Additional Terms & Conditions</Label>
        <Textarea
          value={formData.additional_terms}
          onChange={(e) => setFormData({ ...formData, additional_terms: e.target.value })}
          rows={4}
          placeholder="Any additional terms, requests, or conditions..."
        />
      </div>

      {/* Disclaimer */}
      <Card className="p-4 bg-yellow-50 border-yellow-200">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
          <div className="text-sm text-gray-700">
            <p className="font-semibold mb-1">Important Notice</p>
            <p>
              This is a formal purchase offer. Upon submission, a PDF document will be generated and sent to the property owner. 
              Please ensure all information is accurate. Consider consulting with a real estate attorney before submitting.
            </p>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" className="flex-1 bg-[#1e3a5f] hover:bg-[#2a4a7f]">
          Submit Offer
        </Button>
      </div>
    </form>
  );
}