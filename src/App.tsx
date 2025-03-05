import React, { useState, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { TruckIcon } from '@heroicons/react/24/solid';
import * as Papa from 'papaparse';

// Replace 'YOUR_MAPBOX_TOKEN' with your actual token from https://www.mapbox.com/
const MAPBOX_TOKEN = 'pk.eyJ1Ijoic2lyamRhIiwiYSI6ImNtN3Y2ZW0waDA4YW8yanB3d2h3ajNiZmQifQ.X3FF0WM-nmIy1DS5-NixLA';
mapboxgl.accessToken = MAPBOX_TOKEN;

// USA bounds
const USA_BOUNDS: [[number, number], [number, number]] = [
  [-125.0, 24.396308], // Southwest coordinates
  [-66.93457, 49.384358]  // Northeast coordinates
];

interface Driver {
  id: string;
  name: string;
  trailerType: string;
}

interface Carrier {
  id: string;
  name: string;
}

interface CSVRow {
  'DRIVER ID': string;
  'DRIVER NAME': string;
  'TRAILER TYPE': string;
  'CARRIER ID': string;
  'CARRIER NAME': string;
}

const App: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [carriers, setCarriers] = useState<Carrier[]>([]);

  const [formData, setFormData] = useState({
    loadId: '',
    carrier: '',
    driverName: '',
    driverRate: '',
    brokerRate: '',
    zipFrom: '',
    stateFrom: '',
    zipTo: '',
    stateTo: '',
    loadedMiles: '',
    totalLoadedMiles: '',
    emptyMiles: '',
    totalMiles: '',
    pricePerMile: '',
    pickDate: '',
    deliveryDate: '',
    notes: ''
  });

  useEffect(() => {
    // Load and parse CSV data
    fetch('/Database-Files.csv')
      .then(response => response.text())
      .then(csvText => {
        Papa.parse<CSVRow>(csvText, {
          header: true,
          skipEmptyLines: true,
          complete: (results: Papa.ParseResult<CSVRow>) => {
            // Process drivers
            const uniqueDrivers = new Map<string, Driver>();
            const uniqueCarriers = new Map<string, Carrier>();

            results.data.forEach((row: CSVRow) => {
              // Add driver if not already added
              if (row['DRIVER ID'] && row['DRIVER NAME']) {
                uniqueDrivers.set(row['DRIVER ID'], {
                  id: row['DRIVER ID'],
                  name: row['DRIVER NAME'],
                  trailerType: row['TRAILER TYPE'] || ''
                });
              }

              // Add carrier if not already added
              if (row['CARRIER ID'] && row['CARRIER NAME']) {
                uniqueCarriers.set(row['CARRIER ID'], {
                  id: row['CARRIER ID'],
                  name: row['CARRIER NAME']
                });
              }
            });

            setDrivers(Array.from(uniqueDrivers.values()));
            setCarriers(Array.from(uniqueCarriers.values()));
          }
        });
      })
      .catch(error => console.error('Error loading CSV:', error));
  }, []);

  useEffect(() => {
    if (map.current) return;
    if (!mapContainer.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-98.5795, 39.8283], // Center of USA
      zoom: 3.5,
      maxBounds: USA_BOUNDS, // Restrict map panning to USA
      minZoom: 2 // Prevent zooming out too far
    });

    // Example route coordinates (you would replace these with actual coordinates)
    const routeCoordinates: [number, number][] = [
      [-74.006, 40.7128], // New York
      [-118.2437, 34.0522]  // Los Angeles
    ];

    map.current.on('load', () => {
      if (!map.current) return;

      // Add state boundaries layer
      map.current.addSource('states', {
        type: 'vector',
        url: 'mapbox://mapbox.boundaries-adm1-v3'
      });

      // Add state fill layer
      map.current.addLayer({
        'id': 'state-fills',
        'type': 'fill',
        'source': 'states',
        'source-layer': 'boundaries_admin_1',
        'filter': ['==', ['get', 'iso_3166_1'], 'US'],
        'paint': {
          'fill-color': '#f0f0f0',
          'fill-opacity': 0.1
        }
      });

      // Add state boundary lines
      map.current.addLayer({
        'id': 'state-borders',
        'type': 'line',
        'source': 'states',
        'source-layer': 'boundaries_admin_1',
        'filter': ['==', ['get', 'iso_3166_1'], 'US'],
        'paint': {
          'line-color': '#a0a0a0',
          'line-width': 1
        }
      });

      // Add the route line
      map.current.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: routeCoordinates
          }
        }
      });

      map.current.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#3B82F6',
          'line-width': 3
        }
      });

      // Add markers
      const originMarker = document.createElement('div');
      originMarker.className = 'text-blue-600';
      originMarker.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" /><path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" /></svg>';
      
      const destMarker = document.createElement('div');
      destMarker.className = 'text-blue-600';
      destMarker.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" /><path d="M6 10.5a.75.75 0 01.75.75v1.5a5.25 5.25 0 1010.5 0v-1.5a.75.75 0 011.5 0v1.5a6.751 6.751 0 01-6 6.709v2.291h3a.75.75 0 010 1.5h-7.5a.75.75 0 010-1.5h3v-2.291a6.751 6.751 0 01-6-6.709v-1.5A.75.75 0 016 10.5z" /></svg>';

      new mapboxgl.Marker(originMarker)
        .setLngLat(routeCoordinates[0])
        .addTo(map.current);

      new mapboxgl.Marker(destMarker)
        .setLngLat(routeCoordinates[1])
        .addTo(map.current);
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(formData);
  };

  // List of US states
  const US_STATES = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ];

  return (
    <div className="flex h-screen">
      {/* Left side - Form (20%) */}
      <div className="w-1/5 h-full overflow-auto bg-white shadow-lg">
        <div className="p-4">
          <h1 className="text-xl font-bold text-gray-900 mb-6">Add new load draft</h1>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="loadId" className="block text-sm font-medium text-gray-700">Load ID</label>
              <input
                type="text"
                id="loadId"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                value={formData.loadId}
                onChange={(e) => setFormData({...formData, loadId: e.target.value})}
              />
            </div>
            
            <div>
              <label htmlFor="carrier" className="block text-sm font-medium text-gray-700">Carrier</label>
              <select
                id="carrier"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                value={formData.carrier}
                onChange={(e) => setFormData({...formData, carrier: e.target.value})}
              >
                <option value="">Select carrier</option>
                {carriers.map(carrier => (
                  <option key={carrier.id} value={carrier.id}>
                    {carrier.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="driverName" className="block text-sm font-medium text-gray-700">Driver name</label>
              <select
                id="driverName"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                value={formData.driverName}
                onChange={(e) => setFormData({...formData, driverName: e.target.value})}
              >
                <option value="">Select driver</option>
                {drivers.map(driver => (
                  <option key={driver.id} value={driver.id}>
                    {driver.name} ({driver.trailerType})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="driverRate" className="block text-sm font-medium text-gray-700">Driver Rate [$]</label>
                <input
                  type="number"
                  id="driverRate"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  value={formData.driverRate}
                  onChange={(e) => setFormData({...formData, driverRate: e.target.value})}
                />
              </div>

              <div>
                <label htmlFor="brokerRate" className="block text-sm font-medium text-gray-700">Broker Rate [$]</label>
                <input
                  type="number"
                  id="brokerRate"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  value={formData.brokerRate}
                  onChange={(e) => setFormData({...formData, brokerRate: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="zipFrom" className="block text-sm font-medium text-gray-700">ZIP from</label>
                <input
                  type="text"
                  id="zipFrom"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  value={formData.zipFrom}
                  onChange={(e) => setFormData({...formData, zipFrom: e.target.value})}
                />
              </div>

              <div>
                <label htmlFor="stateFrom" className="block text-sm font-medium text-gray-700">State from</label>
                <select
                  id="stateFrom"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  value={formData.stateFrom}
                  onChange={(e) => setFormData({...formData, stateFrom: e.target.value})}
                >
                  <option value="">Select state</option>
                  {US_STATES.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="zipTo" className="block text-sm font-medium text-gray-700">ZIP to</label>
                <input
                  type="text"
                  id="zipTo"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  value={formData.zipTo}
                  onChange={(e) => setFormData({...formData, zipTo: e.target.value})}
                />
              </div>

              <div>
                <label htmlFor="stateTo" className="block text-sm font-medium text-gray-700">State to</label>
                <select
                  id="stateTo"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  value={formData.stateTo}
                  onChange={(e) => setFormData({...formData, stateTo: e.target.value})}
                >
                  <option value="">Select state</option>
                  {US_STATES.map(state => (
                    <option key={state} value={state}>{state}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="loadedMiles" className="block text-sm font-medium text-gray-700">Loaded miles</label>
                <input
                  type="number"
                  id="loadedMiles"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  value={formData.loadedMiles}
                  onChange={(e) => setFormData({...formData, loadedMiles: e.target.value})}
                />
              </div>

              <div>
                <label htmlFor="emptyMiles" className="block text-sm font-medium text-gray-700">Empty miles</label>
                <input
                  type="number"
                  id="emptyMiles"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  value={formData.emptyMiles}
                  onChange={(e) => setFormData({...formData, emptyMiles: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="totalMiles" className="block text-sm font-medium text-gray-700">Total miles</label>
                <input
                  type="number"
                  id="totalMiles"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  value={formData.totalMiles}
                  onChange={(e) => setFormData({...formData, totalMiles: e.target.value})}
                />
              </div>

              <div>
                <label htmlFor="pricePerMile" className="block text-sm font-medium text-gray-700">Price per mile [$]</label>
                <input
                  type="number"
                  id="pricePerMile"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  value={formData.pricePerMile}
                  onChange={(e) => setFormData({...formData, pricePerMile: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="pickDate" className="block text-sm font-medium text-gray-700">Pick date</label>
                <input
                  type="date"
                  id="pickDate"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  value={formData.pickDate}
                  onChange={(e) => setFormData({...formData, pickDate: e.target.value})}
                />
              </div>

              <div>
                <label htmlFor="deliveryDate" className="block text-sm font-medium text-gray-700">Delivery date</label>
                <input
                  type="date"
                  id="deliveryDate"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                  value={formData.deliveryDate}
                  onChange={(e) => setFormData({...formData, deliveryDate: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes</label>
              <textarea
                id="notes"
                rows={3}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Save Draft
            </button>
          </form>
        </div>
      </div>

      {/* Right side - Map (80%) */}
      <div ref={mapContainer} className="w-4/5 h-full" />
    </div>
  );
};

export default App; 