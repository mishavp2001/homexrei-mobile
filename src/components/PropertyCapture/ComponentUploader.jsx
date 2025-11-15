import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';
import { Upload, X, Camera, Loader2 } from 'lucide-react';

const componentTypes = [
  { id: 'front', label: 'Front Exterior', icon: '🏠' },
  { id: 'roof', label: 'Roof', icon: '🏚️' },
  { id: 'windows', label: 'Windows', icon: '🪟' },
  { id: 'porch', label: 'Porch/Deck', icon: '🛋️' },
  { id: 'heater', label: 'Heater', icon: '🔥' },
  { id: 'ac', label: 'Air Conditioning', icon: '❄️' },
  { id: 'pool', label: 'Pool', icon: '🏊' },
  { id: 'other', label: 'Other Equipment', icon: '🔧' }
];

export default function ComponentUploader({ onNext, onBack }) {
  const [components, setComponents] = useState({});
  const [uploading, setUploading] = useState(null);

  const handleFileUpload = async (componentType, files) => {
    setUploading(componentType);
    const uploadedUrls = [];

    try {
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(file_url);
      }

      setComponents(prev => ({
        ...prev,
        [componentType]: {
          ...prev[componentType],
          photo_urls: [...(prev[componentType]?.photo_urls || []), ...uploadedUrls]
        }
      }));
    } catch (error) {
      console.error('Upload error:', error);
    }
    setUploading(null);
  };

  const removePhoto = (componentType, index) => {
    setComponents(prev => ({
      ...prev,
      [componentType]: {
        ...prev[componentType],
        photo_urls: prev[componentType].photo_urls.filter((_, i) => i !== index)
      }
    }));
  };

  const updateSerialNumber = (componentType, value) => {
    setComponents(prev => ({
      ...prev,
      [componentType]: {
        ...prev[componentType],
        serial_number: value
      }
    }));
  };

  const handleSubmit = () => {
    onNext(components);
  };

  return (
    <div className="max-w-5xl mx-auto">
      <Card className="p-8 bg-white shadow-xl">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#1e3a5f] mb-2">Property Components</h2>
          <p className="text-gray-500">Upload photos and equipment details (optional - you can skip any)</p>
        </div>

        <div className="space-y-6">
          {componentTypes.map((type) => (
            <Card key={type.id} className="p-6 border-2 border-gray-100 hover:border-[#d4af37] transition-colors">
              <div className="flex items-start gap-4">
                <div className="text-4xl">{type.icon}</div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-[#1e3a5f] mb-3">{type.label}</h3>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-gray-600 mb-2 block">Photos</Label>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {components[type.id]?.photo_urls?.map((url, index) => (
                          <div key={index} className="relative w-20 h-20">
                            <img src={url} alt="" className="w-full h-full object-cover rounded-lg" />
                            <button
                              onClick={() => removePhoto(type.id, index)}
                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleFileUpload(type.id, Array.from(e.target.files))}
                          disabled={uploading === type.id}
                        />
                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition-colors">
                          {uploading === type.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Camera className="w-4 h-4" />
                          )}
                          <span>{uploading === type.id ? 'Uploading...' : 'Add Photos'}</span>
                        </div>
                      </label>
                    </div>

                    <div>
                      <Label htmlFor={`serial-${type.id}`} className="text-sm text-gray-600 mb-2 block">
                        Serial Number / Model
                      </Label>
                      <Input
                        id={`serial-${type.id}`}
                        value={components[type.id]?.serial_number || ''}
                        onChange={(e) => updateSerialNumber(type.id, e.target.value)}
                        placeholder="Optional"
                        className="border-gray-300"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="flex gap-4 mt-8">
          <Button
            variant="outline"
            onClick={onBack}
            className="flex-1 h-12 border-2 border-[#1e3a5f] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white"
          >
            Back
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1 h-12 bg-[#1e3a5f] hover:bg-[#2a4a7f] text-white"
          >
            Continue to Review
          </Button>
        </div>
      </Card>
    </div>
  );
}