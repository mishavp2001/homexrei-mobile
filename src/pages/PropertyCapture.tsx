import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import StepIndicator from '../components/PropertyCapture/StepIndicator';
import PropertyInfoForm from '../components/PropertyCapture/PropertyInfoForm';
import ComponentUploader from '../components/PropertyCapture/ComponentUploader';
import ReviewAndGenerate from '../components/PropertyCapture/ReviewAndGenerate';

export const isPublic = true;

export default function PropertyCapture() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [propertyData, setPropertyData] = useState(null);
  const [componentData, setComponentData] = useState({});
  const [checking, setChecking] = useState(false);
  const [existingProperty, setExistingProperty] = useState(null);

  useEffect(() => {
    const checkAddress = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const address = urlParams.get('address');

      if (address) {
        setChecking(true);
        try {
          // Decode and normalize the address
          const decodedAddress = decodeURIComponent(address);

          // Check if property with this address already exists
          const properties = await base44.entities.Property.filter({ address: decodedAddress });

          if (properties && properties.length > 0) {
            // Property exists - show login prompt
            setExistingProperty(properties[0]);
          } else {
            // Property doesn't exist - proceed to form with address
            setPropertyData({ address: decodedAddress });
          }
        } catch (error) {
          console.error('Error checking address:', error);
          // On error, proceed to form with the address
          const decodedAddress = decodeURIComponent(address);
          setPropertyData({ address: decodedAddress });
        }
        setChecking(false);
      }
    };

    checkAddress();
  }, []);

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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#1e3a5f] mx-auto mb-4" />
          <p className="text-gray-600">Checking property...</p>
        </div>
      </div>
    );
  }

  if (existingProperty) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 py-12 px-4 flex items-center justify-center">
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
            onClick={() => navigate(createPageUrl('Landing'))}
            className="w-full mt-3"
          >
            Back to Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 py-12 px-4">
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