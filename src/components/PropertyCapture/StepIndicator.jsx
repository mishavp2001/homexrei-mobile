import React from 'react';
import { Check } from 'lucide-react';

const steps = [
  { number: 1, title: 'Property Info' },
  { number: 2, title: 'Components' },
  { number: 3, title: 'Review & Generate' }
];

export default function StepIndicator({ currentStep }) {
  return (
    <div className="mb-12">
      <div className="flex items-center justify-between max-w-2xl mx-auto">
        {steps.map((step, index) => (
          <React.Fragment key={step.number}>
            <div className="flex flex-col items-center">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
                  currentStep > step.number
                    ? 'bg-[#d4af37] text-white'
                    : currentStep === step.number
                    ? 'bg-[#1e3a5f] text-white scale-110'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {currentStep > step.number ? (
                  <Check className="w-6 h-6" />
                ) : (
                  step.number
                )}
              </div>
              <span
                className={`mt-2 text-sm font-medium ${
                  currentStep >= step.number ? 'text-[#1e3a5f]' : 'text-gray-400'
                }`}
              >
                {step.title}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-1 mx-4 rounded transition-all duration-300 ${
                  currentStep > step.number ? 'bg-[#d4af37]' : 'bg-gray-200'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}