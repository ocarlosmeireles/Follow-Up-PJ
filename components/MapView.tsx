import React from 'react';
import type { Client } from '../types';
import { MapPinIcon } from './icons';

interface MapViewProps {
  clients: Client[];
}

const MapView: React.FC<MapViewProps> = ({ clients }) => {
  const clientsWithAddress = clients.filter(client => client.address);

  const handleOpenMap = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">Mapa de Clientes</h2>
        <p className="text-gray-500 dark:text-gray-400">
          Clientes com endereço cadastrado. Clique para ver no mapa.
        </p>
      </div>

      {clientsWithAddress.length === 0 ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-800/50 rounded-lg">
          <MapPinIcon className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-500" />
          <h3 className="text-xl font-semibold text-gray-700 dark:text-slate-200">Nenhum cliente com endereço</h3>
          <p>Cadastre o endereço de um cliente ao criar um novo orçamento.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clientsWithAddress.map(client => (
            <div key={client.id} className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700 shadow-sm">
              <h3 className="font-bold text-gray-800 dark:text-slate-100 text-lg">{client.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1">
                <MapPinIcon className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                <span>{client.address}</span>
              </p>
              <button
                onClick={() => handleOpenMap(client.address!)}
                className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors"
              >
                Ver no Mapa
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MapView;