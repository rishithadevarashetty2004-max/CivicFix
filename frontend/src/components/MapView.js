import React, { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { MARKER_COLORS, STATUS_LABELS, CATEGORIES } from "../lib/utils";

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Custom marker icon based on status
const createCustomIcon = (status) => {
  const color = MARKER_COLORS[status] || MARKER_COLORS.open;
  return L.divIcon({
    className: "custom-marker-container",
    html: `
      <div style="
        width: 24px;
        height: 24px;
        background-color: ${color};
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      "></div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
};

// Component to handle map center updates
function MapCenterHandler({ center }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  
  return null;
}

// Mini map for case detail
export const MiniMapView = ({ lat, lng, className = "" }) => {
  return (
    <div className={`h-48 rounded-lg overflow-hidden border border-slate-200 ${className}`}>
      <MapContainer
        center={[lat, lng]}
        zoom={15}
        scrollWheelZoom={false}
        dragging={false}
        zoomControl={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <Marker position={[lat, lng]} icon={createCustomIcon("open")} />
      </MapContainer>
    </div>
  );
};

// Main map component
export const MapView = ({ cases = [], center = [28.6139, 77.2090], zoom = 12, onCaseSelect, selectedCaseId }) => {
  const mapRef = useRef(null);

  return (
    <div className="h-full w-full rounded-lg overflow-hidden" data-testid="map-container">
      <MapContainer
        ref={mapRef}
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <MapCenterHandler center={center} />
        
        {cases.map((caseData) => (
          <Marker
            key={caseData.id}
            position={[caseData.lat, caseData.lng]}
            icon={createCustomIcon(caseData.status)}
            eventHandlers={{
              click: () => onCaseSelect?.(caseData),
            }}
          >
            <Popup className="map-popup">
              <div className="p-3 min-w-[200px]">
                <h4 className="font-semibold text-slate-900 mb-1 line-clamp-1">
                  {caseData.title}
                </h4>
                <p className="text-xs text-slate-500 mb-2">
                  {CATEGORIES[caseData.category]?.label || caseData.category}
                </p>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-slate-500">
                    {STATUS_LABELS[caseData.status]}
                  </span>
                  <span className="text-lg font-black text-red-600">
                    {caseData.daysIgnored} days
                  </span>
                </div>
                <Link to={`/cases/${caseData.id}`}>
                  <Button size="sm" className="w-full">
                    View Case
                  </Button>
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

// Location picker for report form
export const LocationPicker = ({ position, onPositionChange, className = "" }) => {
  const MapClickHandler = () => {
    const map = useMap();
    
    useEffect(() => {
      const handleClick = (e) => {
        onPositionChange?.([e.latlng.lat, e.latlng.lng]);
      };
      
      map.on("click", handleClick);
      
      return () => {
        map.off("click", handleClick);
      };
    }, [map]);
    
    return null;
  };

  return (
    <div className={`h-64 rounded-lg overflow-hidden border border-slate-200 ${className}`}>
      <MapContainer
        center={position || [28.6139, 77.2090]}
        zoom={13}
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <MapClickHandler />
        {position && (
          <Marker position={position} icon={createCustomIcon("open")} />
        )}
      </MapContainer>
    </div>
  );
};
