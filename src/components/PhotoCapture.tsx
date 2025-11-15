import { useState } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { X, Camera as CameraIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const MAX_PHOTOS = 5;

export const PhotoCapture = () => {
  const [photos, setPhotos] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const takePhoto = async () => {
    if (photos.length >= MAX_PHOTOS) {
      toast({
        title: "Maximum photos reached",
        description: `You can only capture ${MAX_PHOTOS} photos`,
        variant: "destructive",
      });
      return;
    }

    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });

      if (image.dataUrl) {
        setPhotos([...photos, image.dataUrl]);
        toast({
          title: "Photo captured",
          description: `${photos.length + 1} of ${MAX_PHOTOS} photos`,
        });
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      toast({
        title: "Camera error",
        description: "Failed to capture photo",
        variant: "destructive",
      });
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (photos.length === 0) {
      toast({
        title: "No photos",
        description: "Please capture at least one photo",
        variant: "destructive",
      });
      return;
    }

    if (!description.trim()) {
      toast({
        title: "No description",
        description: "Please add a description",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    // TODO: Implement video generation API call
    // For now, just simulate submission
    setTimeout(() => {
      toast({
        title: "Submitted!",
        description: "Your video is being generated",
      });
      setPhotos([]);
      setDescription('');
      setIsSubmitting(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-2xl mx-auto">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Create Video</h1>
        <p className="text-muted-foreground">
          Capture {MAX_PHOTOS} photos and add a description
        </p>
      </div>

      <Card className="p-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          {photos.map((photo, index) => (
            <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
              <img src={photo} alt={`Photo ${index + 1}`} className="w-full h-full object-cover" />
              <button
                onClick={() => removePhoto(index)}
                className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <button
              onClick={takePhoto}
              className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary hover:bg-accent flex flex-col items-center justify-center gap-2 transition-colors"
            >
              <CameraIcon className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {photos.length === 0 ? 'Take Photo' : `${photos.length}/${MAX_PHOTOS}`}
              </span>
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Description</label>
            <Textarea
              placeholder="Describe what you want in your video..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || photos.length === 0}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? 'Generating...' : 'Generate Video'}
          </Button>
        </div>
      </Card>
    </div>
  );
};
