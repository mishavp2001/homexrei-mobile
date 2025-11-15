import React from 'react';

/**
 * VideoPlayer component that handles both direct video files and YouTube URLs
 */
export default function VideoPlayer({ videoUrl, posterUrl, className = '' }) {
  if (!videoUrl) return null;

  // Check if URL is a YouTube video
  const isYouTubeVideo = (url) => {
    return url.includes('youtube.com') || url.includes('youtu.be');
  };

  // Convert YouTube URL to embeddable format
  const getYouTubeEmbedUrl = (url) => {
    let videoId = '';
    
    // Handle youtube.com/shorts/VIDEO_ID
    if (url.includes('/shorts/')) {
      videoId = url.split('/shorts/')[1].split('?')[0];
    }
    // Handle youtube.com/watch?v=VIDEO_ID
    else if (url.includes('watch?v=')) {
      videoId = url.split('watch?v=')[1].split('&')[0];
    }
    // Handle youtu.be/VIDEO_ID
    else if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split('?')[0];
    }
    // Handle youtube.com/embed/VIDEO_ID
    else if (url.includes('/embed/')) {
      return url; // Already in embed format
    }
    
    return `https://www.youtube.com/embed/${videoId}`;
  };

  // If it's a YouTube video, use iframe
  if (isYouTubeVideo(videoUrl)) {
    const embedUrl = getYouTubeEmbedUrl(videoUrl);
    
    return (
      <iframe
        src={embedUrl}
        className={`w-full rounded-lg ${className}`}
        style={{ aspectRatio: '16/9', minHeight: '300px' }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title="Property Video"
      />
    );
  }

  // Otherwise, use video tag for direct video files
  return (
    <video
      controls
      className={`w-full rounded-lg ${className}`}
      src={videoUrl}
      poster={posterUrl}
    >
      Your browser does not support the video tag.
    </video>
  );
}