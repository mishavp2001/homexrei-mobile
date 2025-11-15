import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Home, Wrench, Lightbulb, TrendingUp, Users, Shield, ArrowRight, Menu, X, DollarSign, Sparkles, AlertTriangle, Loader2, LogIn } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import StepIndicator from '../components/PropertyCapture/StepIndicator';
import PropertyInfoForm from '../components/PropertyCapture/PropertyInfoForm';
import ComponentUploader from '../components/PropertyCapture/ComponentUploader';
import ReviewAndGenerate from '../components/PropertyCapture/ReviewAndGenerate';

export const isPublic = true;

export default function Landing() {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const [showPropertyCaptureModal, setShowPropertyCaptureModal] = useState(false);
  const [captureAddress, setCaptureAddress] = useState('');

  const handleStartWithAddress = () => {
    if (manualAddress.trim()) {
      setCaptureAddress(manualAddress.trim());
      setShowPropertyCaptureModal(true);
    }
  };

  const handleStartWithoutAddress = () => {
    setCaptureAddress('');
    setShowPropertyCaptureModal(true);
  };

  const handleLogin = () => {
    base44.auth.redirectToLogin(window.location.origin + createPageUrl('Dashboard'));
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation - Centered Layout */}
      <nav className="bg-white/95 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center justify-between h-16">
            {/* Left - Public Links */}
            <div className="flex items-center gap-6">
              <Link to={createPageUrl('Deals')} className="text-gray-700 hover:text-green-700 font-medium transition-colors">
                Deals
              </Link>
              <Link to={createPageUrl('Services')} className="text-gray-700 hover:text-green-700 font-medium transition-colors">
                Services
              </Link>
              <Link to={createPageUrl('Insights')} className="text-gray-700 hover:text-green-700 font-medium transition-colors">
                Insights
              </Link>
            </div>

            {/* Center - Logo & Brand */}
            <div className="flex items-center gap-2 absolute left-1/2 transform -translate-x-1/2">
              <div className="bg-slate-900 rounded-lg w-10 h-10 flex items-center justify-center shadow-md">
                <Home className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-slate-900">HomeXREI</span>
            </div>

            {/* Right - User Actions */}
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                className="border-green-600 text-green-700 hover:bg-green-50"
                onClick={handleLogin}>
                Sign In
              </Button>
              <Button
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg"
                onClick={handleStartWithoutAddress}>
                Get Started
              </Button>
            </div>
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden flex justify-between items-center h-16">
            <button
              className="p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            <div className="flex items-center gap-2">
              <div className="bg-slate-900 rounded-lg w-10 h-10 flex items-center justify-center shadow-md">
                <Home className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-slate-900">HomeXREI</span>
            </div>

            <div className="w-10"></div>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen &&
        <div className="md:hidden border-t border-gray-200 bg-white">
            <div className="px-4 py-4 space-y-3">
              <Link
              to={createPageUrl('Deals')}
              className="block text-gray-700 hover:text-green-700 font-medium py-2">
                Deals
              </Link>
              <Link
              to={createPageUrl('Services')}
              className="block text-gray-700 hover:text-green-700 font-medium py-2">
                Services
              </Link>
              <Link
              to={createPageUrl('Insights')}
              className="block text-gray-700 hover:text-green-700 font-medium py-2">
                Insights
              </Link>
              <Button
              variant="outline"
              className="w-full border-green-600 text-green-700"
              onClick={handleLogin}>
                Sign In
              </Button>
              <Button
              className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
              onClick={handleStartWithoutAddress}>
                Get Started
              </Button>
            </div>
          </div>
        }
      </nav>

      {/* Hero Section with Background - Darker with visible image */}
      <section
        className="relative text-white py-20 px-4 overflow-hidden min-h-[600px] flex items-center"
        style={{
          backgroundImage: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.50) 0%, rgba(0, 0, 0, 0.40) 50%, rgba(0, 0, 0, 0.60) 100%), url(https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center bottom',
          backgroundAttachment: 'fixed'
        }}>

        {/* Subtle green tint overlay */}
        <div className="absolute inset-0 bg-green-900/10 mix-blend-multiply"></div>
        
        <div className="max-w-7xl mx-auto relative z-10 w-full">
          <div className="mb-8 text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 drop-shadow-2xl text-shadow-lg">
              All you need to care for your home investment.
            </h1>
          </div>

          {/* Quick Start with Address */}
          <div className="max-w-2xl mx-auto">
            <Card className="p-6 bg-white/98 backdrop-blur-md shadow-2xl border-2 border-white/50">
              <h3 className="text-slate-50 mb-4 text-xl font-semibold text-center">Get Started by Digitizing Your Property

              </h3>
              <div className="flex gap-3">
                <Input
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  placeholder="123 Main St, City, State ZIP"
                  className="flex-1 bg-slate-50 text-slate-900 border-green-300 focus:border-green-600 focus:ring-green-600"
                  onKeyPress={(e) => e.key === 'Enter' && handleStartWithAddress()} />

                <Button
                  onClick={handleStartWithAddress}
                  disabled={!manualAddress.trim()}
                  className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg">
                  Start
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gradient-to-b px-4 py-4 from-green-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 max-w-6xl mx-auto">
            <Card className="p-8 hover:shadow-xl transition-all hover:-translate-y-1 border-2 border-transparent hover:border-green-200">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl flex items-center justify-center mb-6 shadow-lg mx-auto">
                <Lightbulb className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-green-800 mb-4 text-center">Check Insights</h3>
              <p className="text-gray-600 mb-6 text-center">
                Discover tips, tricks, and best practices from the homeowner community. Learn from real experiences and shared knowledge.
              </p>
              <Button
                variant="outline"
                className="w-full border-green-600 text-green-700 hover:bg-green-50"
                onClick={() => navigate(createPageUrl('Insights'))}>
                Browse Insights
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Card>

            <Card className="p-8 hover:shadow-xl transition-all hover:-translate-y-1 border-2 border-green-300 bg-gradient-to-br from-green-50 to-white">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl flex items-center justify-center mb-6 shadow-lg mx-auto">
                <DollarSign className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-green-800 mb-4 text-center">Simple Accounting</h3>
              <p className="text-gray-600 mb-6 text-center">Track income and expenses for your properties. View profit/loss, generate reports, and categorize transactions - all in one place.

              </p>
              <Button
                className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                onClick={handleStartWithoutAddress}>
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Card>

            <Card className="p-8 hover:shadow-xl transition-all hover:-translate-y-1 border-2 border-transparent hover:border-green-200">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center mb-6 shadow-lg mx-auto">
                <Wrench className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-green-800 mb-4 text-center">AI Maintenance</h3>
              <p className="text-gray-600 mb-6 text-center">
                Get AI-powered maintenance recommendations with cost estimates and urgency levels. One-click to request quotes from verified pros.
              </p>
              <Button
                variant="outline"
                className="w-full border-green-600 text-green-700 hover:bg-green-50"
                onClick={() => navigate(createPageUrl('Services'))}>
                Find Experts
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Card>

            <Card className="p-8 hover:shadow-xl transition-all hover:-translate-y-1 border-2 border-transparent hover:border-green-200">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-xl flex items-center justify-center mb-6 shadow-lg mx-auto">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-green-800 mb-4 text-center">Browse Deals</h3>
              <p className="text-gray-600 mb-6 text-center">
                Find properties for sale and service deals with interactive map search. Connect with sellers and service providers instantly.
              </p>
              <Button
                variant="outline"
                className="w-full border-green-600 text-green-700 hover:bg-green-50"
                onClick={() => navigate(createPageUrl('Deals'))}>
                View Deals
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-green-800 mb-12 text-center">
            Why Choose HomeXREI?
          </h2>
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">AI-Powered Insights</h3>
                  <p className="text-gray-600">Get intelligent property analysis, ROI projections, maintenance priorities, and market trends powered by advanced AI.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Simple Accounting</h3>
                  <p className="text-gray-600">Track rental income and property expenses effortlessly. View profit/loss by month or year with visual breakdowns.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Smart Maintenance</h3>
                  <p className="text-gray-600">AI recommends maintenance priorities with cost estimates and urgency levels. Connect with verified service providers in one click.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Professional Reports</h3>
                  <p className="text-gray-600">Generate inspection and appraisal reports suitable for insurance, real estate transactions, and financial planning.</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-100 to-emerald-50 rounded-2xl p-12 text-center shadow-xl">
              <div className="text-6xl font-bold text-green-700 mb-4">1000+</div>
              <p className="text-xl text-gray-700 mb-8">Properties Digitized</p>
              <div className="text-6xl font-bold text-green-700 mb-4">500+</div>
              <p className="text-xl text-gray-700 mb-8">Verified Experts</p>
              <div className="text-6xl font-bold text-green-700 mb-4">2500+</div>
              <p className="text-xl text-gray-700">Community Insights</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - Darker with visible image */}
      <section
        className="relative py-20 px-4 overflow-hidden min-h-[500px] flex items-center"
        style={{
          backgroundImage: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.55) 0%, rgba(0, 0, 0, 0.45) 50%, rgba(0, 0, 0, 0.65) 100%), url(https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center bottom',
          backgroundAttachment: 'fixed'
        }}>

        {/* Subtle green tint overlay */}
        <div className="absolute inset-0 bg-green-900/15 mix-blend-multiply"></div>
        
        <div className="max-w-4xl mx-auto text-center text-white relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 drop-shadow-2xl">
            Ready to Get Started?
          </h2>
          <p className="text-xl mb-8 text-white/95 drop-shadow-lg">
            Join thousands of homeowners protecting and maximizing their property value
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-white text-green-700 hover:bg-gray-100 text-lg h-14 px-8 shadow-2xl font-semibold"
              onClick={handleStartWithoutAddress}>
              Create Free Account
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="bg-white/20 hover:bg-white/30 text-white border-white/60 text-lg h-14 px-8 backdrop-blur-md shadow-xl"
              onClick={() => navigate(createPageUrl('Services'))}>
              Browse Services
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-12 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-lg flex items-center justify-center shadow-lg">
              <Home className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold">HomeXREI</span>
          </div>
          <p className="text-gray-400 mb-6">Your trusted partner in home management</p>
          <div className="flex justify-center gap-8 mb-6">
            <Link to={createPageUrl('Deals')} className="text-gray-400 hover:text-green-400 transition-colors">
              Deals
            </Link>
            <Link to={createPageUrl('Services')} className="text-gray-400 hover:text-green-400 transition-colors">
              Services
            </Link>
            <Link to={createPageUrl('Insights')} className="text-gray-400 hover:text-green-400 transition-colors">
              Insights
            </Link>
            <button onClick={handleStartWithoutAddress} className="text-gray-400 hover:text-green-400 transition-colors">
              Digitize Home
            </button>
          </div>
          <p className="text-gray-500 text-sm">© 2024 HomeXREI. All rights reserved.</p>
        </div>
      </footer>

      {/* Property Capture Modal */}
      <Dialog open={showPropertyCaptureModal} onOpenChange={setShowPropertyCaptureModal}>
        <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto p-0">
          <PropertyCaptureModalContent 
            initialAddress={captureAddress}
            onClose={() => setShowPropertyCaptureModal(false)}
          />
        </DialogContent>
      </Dialog>
    </div>);

}

function PropertyCaptureModalContent({ initialAddress, onClose }) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [propertyData, setPropertyData] = useState(initialAddress ? { address: initialAddress } : null);
  const [componentData, setComponentData] = useState({});
  const [checking, setChecking] = useState(false);
  const [existingProperty, setExistingProperty] = useState(null);

  React.useEffect(() => {
    const checkAddress = async () => {
      if (initialAddress) {
        setChecking(true);
        try {
          const properties = await base44.entities.Property.filter({ address: initialAddress });

          if (properties && properties.length > 0) {
            setExistingProperty(properties[0]);
          } else {
            setPropertyData({ address: initialAddress });
          }
        } catch (error) {
          console.error('Error checking address:', error);
          setPropertyData({ address: initialAddress });
        }
        setChecking(false);
      }
    };

    checkAddress();
  }, [initialAddress]);

  const handlePropertyNext = (data) => {
    setPropertyData(data);
    setCurrentStep(2);
  };

  const handleComponentNext = (data) => {
    setComponentData(data);
    setCurrentStep(3);
  };

  const handleLogin = () => {
    const dashboardUrl = window.location.origin + createPageUrl('Dashboard');
    base44.auth.redirectToLogin(dashboardUrl);
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#1e3a5f] mx-auto mb-4" />
          <p className="text-gray-600">Checking property...</p>
        </div>
      </div>
    );
  }

  if (existingProperty) {
    return (
      <div className="py-12 px-4 flex items-center justify-center">
        <Card className="p-8 max-w-md text-center shadow-xl">
          <div className="w-16 h-16 bg-[#1e3a5f] rounded-full flex items-center justify-center mx-auto mb-6">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-[#1e3a5f] mb-3">Property Already Digitized</h2>
          <p className="text-gray-600 mb-6">
            This property at <strong>{existingProperty.address}</strong> has already been digitized.
          </p>
          <p className="text-gray-600 mb-6">
            Please log in to access your property dashboard and reports.
          </p>
          <Button
            onClick={handleLogin}
            className="w-full bg-[#1e3a5f] hover:bg-[#2a4a7f] h-12"
          >
            <LogIn className="w-5 h-5 mr-2" />
            Log In to Access Property
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full mt-3"
          >
            Back to Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-[#1e3a5f] mb-3">
            Digitize Your Home
          </h1>
          <p className="text-xl text-gray-600">Professional property analysis in minutes</p>
        </div>

        <StepIndicator currentStep={currentStep} />

        {currentStep === 1 && (
          <PropertyInfoForm
            initialData={propertyData}
            onNext={handlePropertyNext}
          />
        )}

        {currentStep === 2 && (
          <ComponentUploader
            onNext={handleComponentNext}
            onBack={() => setCurrentStep(1)}
          />
        )}

        {currentStep === 3 && (
          <ReviewAndGenerate
            propertyData={propertyData}
            componentData={componentData}
            onBack={() => setCurrentStep(2)}
          />
        )}
      </div>
    </div>
  );
}