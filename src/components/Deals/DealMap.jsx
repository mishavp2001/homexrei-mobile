import React, { useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Home, Wrench, MapPin } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Get color for each deal type
const getDealColor = (dealType) => {
  switch (dealType) {
    case 'sale':
      return '#dc2626'; // Red
    case 'long_term_rent':
      return '#f97316'; // Orange
    case 'short_term_rent':
      return '#3b82f6'; // Blue
    case 'service_deal':
      return '#d4af37'; // Gold
    default:
      return '#6b7280'; // Gray
  }
};

// Get label text for each deal type
const getDealLabel = (deal) => {
  const dealType = deal.deal_type;
  
  if (dealType === 'sale') {
    return `$${(deal.price / 1000).toFixed(0)}k`;
  }
  
  if (dealType === 'long_term_rent') {
    return `$${(deal.price / 1000).toFixed(1)}k/mo`;
  }
  
  if (dealType === 'short_term_rent') {
    if (deal.price_per_night) {
      return `$${deal.price_per_night}/nt`;
    }
    return 'Airbnb';
  }
  
  if (dealType === 'service_deal') {
    return 'Service';
  }
  
  return 'Deal';
};

// Create circle icon (for county/zoomed out view) - 2.5x bigger
const createCircleIcon = (deal, offsetX = 0, offsetY = 0) => {
  const color = getDealColor(deal.deal_type);
  
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="position: relative; transform: translate(${offsetX}px, ${offsetY}px);">
        <div style="
          width: 20px;
          height: 20px;
          background-color: ${color};
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        "></div>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13 - offsetX, 13 - offsetY],
    popupAnchor: [offsetX, -13 + offsetY]
  });
};

// Create drop icon with price bubble + pin (for city/street level)
const createDropIcon = (deal, offsetX = 0, offsetY = 0) => {
  const color = getDealColor(deal.deal_type);
  const labelText = getDealLabel(deal);
  
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; transform: translate(${offsetX}px, ${offsetY}px);">
        <!-- Price/Label bubble (rectangle) - heavily overlaps with circle -->
        <div style="
          background-color: ${color};
          color: white;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: bold;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          position: relative;
          z-index: 2;
          margin-bottom: -17px;
        ">
          ${labelText}
        </div>
        <!-- Circle base that overlaps with rectangle (only 30% visible) -->
        <div style="
          width: 24px;
          height: 24px;
          background-color: ${color};
          border-radius: 50% 50% 50% 0;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          transform: rotate(-45deg);
          position: relative;
          z-index: 1;
        "></div>
      </div>
    `,
    iconSize: [80, 80],
    iconAnchor: [40 - offsetX, 65 - offsetY],
    popupAnchor: [offsetX, -65 + offsetY]
  });
};

// Helper function to get color and label for deal type
const getDealTypeStyle = (dealType) => {
  switch (dealType) {
    case 'sale':
      return { color: '#dc2626', label: 'For Sale' };
    case 'long_term_rent':
      return { color: '#f97316', label: 'For Rent' };
    case 'short_term_rent':
      return { color: '#3b82f6', label: 'Airbnb' };
    case 'service_deal':
      return { color: '#d4af37', label: 'Service' };
    default:
      return { color: '#6b7280', label: 'Deal' };
  }
};

// Component to track zoom level
function ZoomTracker({ onZoomChange }) {
  const map = useMapEvents({
    zoomend: () => {
      onZoomChange(map.getZoom());
    },
    load: () => {
      onZoomChange(map.getZoom());
    }
  });
  return null;
}

// Markers component that uses zoom level
function DealMarkers({ deals, onDealClick, zoomLevel }) {
  // Threshold: zoom < 12 = county level (circles), zoom >= 12 = city/street level (drops)
  const isStreetLevel = zoomLevel >= 12;
  
  // Process deals to handle overlapping coordinates
  const processedDeals = useMemo(() => {
    const coordMap = new Map();
    
    // Group deals by coordinates
    deals.forEach(deal => {
      if (!deal.latitude || !deal.longitude) return;
      
      const key = `${deal.latitude.toFixed(5)},${deal.longitude.toFixed(5)}`;
      if (!coordMap.has(key)) {
        coordMap.set(key, []);
      }
      coordMap.get(key).push(deal);
    });
    
    // Add offsets to overlapping deals
    const processed = [];
    coordMap.forEach(dealsAtLocation => {
      if (dealsAtLocation.length === 1) {
        processed.push({ ...dealsAtLocation[0], offsetX: 0, offsetY: 0 });
      } else {
        // Multiple deals at same location - spread them in a circle
        dealsAtLocation.forEach((deal, index) => {
          const angle = (index / dealsAtLocation.length) * 2 * Math.PI;
          const radius = isStreetLevel ? 30 : 18; // Larger radius for bigger circles
          const offsetX = Math.cos(angle) * radius;
          const offsetY = Math.sin(angle) * radius;
          processed.push({ ...deal, offsetX, offsetY });
        });
      }
    });
    
    return processed;
  }, [deals, isStreetLevel]);

  return (
    <>
      {processedDeals.map((deal) => {
        if (!deal.latitude || !deal.longitude) return null;
        
        const typeStyle = getDealTypeStyle(deal.deal_type);
        const isProperty = ['sale', 'long_term_rent', 'short_term_rent'].includes(deal.deal_type);
        
        // Choose icon based on zoom level
        const icon = isStreetLevel 
          ? createDropIcon(deal, deal.offsetX || 0, deal.offsetY || 0)
          : createCircleIcon(deal, deal.offsetX || 0, deal.offsetY || 0);
        
        return (
          <Marker
            key={deal.id}
            position={[deal.latitude, deal.longitude]}
            icon={icon}
          >
            <Popup 
              className="custom-popup"
              minWidth={320}
              maxWidth={350}
              closeButton={true}
            >
              <div className="min-w-[320px]">
                {/* Photo */}
                {deal.photo_urls?.length > 0 && (
                  <div className="w-full h-40 overflow-hidden">
                    <img
                      src={deal.photo_urls[0]}
                      alt={deal.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    {isProperty ? (
                      <Home className="w-4 h-4" style={{ color: typeStyle.color }} />
                    ) : (
                      <Wrench className="w-4 h-4" style={{ color: typeStyle.color }} />
                    )}
                    <Badge 
                      variant="outline" 
                      style={{ 
                        borderColor: typeStyle.color, 
                        color: typeStyle.color 
                      }}
                      className="text-xs"
                    >
                      {typeStyle.label}
                    </Badge>
                  </div>
                  
                  <h3 className="font-semibold text-base mb-2 line-clamp-2">{deal.title}</h3>
                  
                  <p 
                    className="text-lg font-bold mb-2"
                    style={{ color: typeStyle.color }}
                  >
                    {deal.deal_type === 'short_term_rent' && !deal.price_per_night ? (
                      'Contact for Price'
                    ) : (
                      <>
                        ${deal.price.toLocaleString()}
                        {deal.deal_type === 'long_term_rent' && '/mo'}
                        {deal.deal_type === 'short_term_rent' && deal.price_per_night && '/night'}
                      </>
                    )}
                  </p>
                  
                  {/* Description with ellipsis */}
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {deal.description}
                  </p>
                  
                  <div className="flex items-start gap-1 text-xs text-gray-600 mb-3">
                    <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-1">{deal.location}</span>
                  </div>
                  
                  <Button
                    size="sm"
                    className="w-full"
                    style={{ 
                      backgroundColor: typeStyle.color,
                      color: 'white'
                    }}
                    onClick={() => onDealClick(deal)}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}

export default function DealMap({ deals, onDealClick }) {
  const [zoomLevel, setZoomLevel] = useState(12);
  const defaultCenter = [37.7749, -122.4194]; // San Francisco

  // Calculate center from deals if available
  const center = deals.length > 0 && deals[0].latitude && deals[0].longitude
    ? [deals[0].latitude, deals[0].longitude]
    : defaultCenter;

  return (
    <div className="h-full rounded-lg overflow-hidden border-2 border-gray-200 relative">
      <style>{`
        .leaflet-popup {
          z-index: 1000 !important;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
          z-index: 1001 !important;
          padding: 0;
          min-width: 320px;
        }
        .leaflet-popup-content {
          margin: 0;
          width: 100% !important;
          min-width: 320px;
        }
        .leaflet-popup-tip-container {
          z-index: 1001 !important;
        }
        .leaflet-container {
          z-index: 1;
        }
        .custom-marker {
          background: transparent !important;
          border: none !important;
        }
      `}</style>
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: '100%', width: '100%', zIndex: 1 }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomTracker onZoomChange={setZoomLevel} />
        <DealMarkers deals={deals} onDealClick={onDealClick} zoomLevel={zoomLevel} />
      </MapContainer>
    </div>
  );
}