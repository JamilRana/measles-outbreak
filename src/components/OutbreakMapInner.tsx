"use client";

import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';

interface GeoData {
  district: string;
  division: string;
  confirmed: number;
  deaths: number;
  hospitalized: number;
  lat: number;
  lng: number;
}

interface Props {
  geoData: GeoData[];
  showDeaths: boolean;
  showConfirmed: boolean;
  showHospitalized: boolean;
}

export default function OutbreakMapInner({ geoData, showDeaths, showConfirmed, showHospitalized }: Props) {
  const getRadius = (count: number) => Math.max(6, Math.min(30, Math.sqrt(count) * 4));
  const bangladeshBounds: [[number, number], [number, number]] = [
    [20.3, 88.0], // Southwest
    [26.7, 92.7], // Northeast
  ];

  return (
    <MapContainer
      center={[23.685, 90.3563]}
      zoom={7}
      minZoom={7}
      maxBounds={bangladeshBounds}
      maxBoundsViscosity={1.0}
      style={{ height: '650px', width: '100%', borderRadius: '1rem' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {geoData.map((item) => (
        <React.Fragment key={item.district}>
          {/* Deaths — Red */}
          {showDeaths && item.deaths > 0 && (
            <CircleMarker
              center={[item.lat, item.lng]}
              radius={getRadius(item.deaths)}
              pathOptions={{
                fillColor: '#ef4444',
                color: '#dc2626',
                weight: 2,
                opacity: 0.9,
                fillOpacity: 0.5,
              }}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-bold text-slate-800 text-base">{item.district}</p>
                  <p className="text-slate-500 text-xs mb-2">{item.division}</p>
                  <p className="text-red-600 font-semibold">Deaths: {item.deaths}</p>
                </div>
              </Popup>
            </CircleMarker>
          )}

          {/* Confirmed — Purple */}
          {showConfirmed && item.confirmed > 0 && (
            <CircleMarker
              center={[item.lat + 0.02, item.lng + 0.02]}
              radius={getRadius(item.confirmed)}
              pathOptions={{
                fillColor: '#8b5cf6',
                color: '#7c3aed',
                weight: 2,
                opacity: 0.9,
                fillOpacity: 0.4,
              }}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-bold text-slate-800 text-base">{item.district}</p>
                  <p className="text-slate-500 text-xs mb-2">{item.division}</p>
                  <p className="text-purple-600 font-semibold">Confirmed: {item.confirmed}</p>
                </div>
              </Popup>
            </CircleMarker>
          )}

          {/* Hospitalized — Orange */}
          {showHospitalized && item.hospitalized > 0 && (
            <CircleMarker
              center={[item.lat - 0.02, item.lng - 0.02]}
              radius={getRadius(item.hospitalized)}
              pathOptions={{
                fillColor: '#f97316',
                color: '#ea580c',
                weight: 2,
                opacity: 0.9,
                fillOpacity: 0.4,
              }}
            >
              <Popup>
                <div className="text-sm">
                  <p className="font-bold text-slate-800 text-base">{item.district}</p>
                  <p className="text-slate-500 text-xs mb-2">{item.division}</p>
                  <p className="text-orange-600 font-semibold">Hospitalized: {item.hospitalized}</p>
                </div>
              </Popup>
            </CircleMarker>
          )}
        </React.Fragment>
      ))}
    </MapContainer>
  );
}
