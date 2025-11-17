import React, { useState, useEffect } from 'react';
import { ClockIcon, CurrencyDollarIcon, CurrencyEuroIcon, SunIcon, CloudIcon } from './icons';

// Tipos para os dados das APIs
type CurrencyData = {
  usd: number | null;
  eur: number | null;
  lastUpdated: string | null;
};

type WeatherData = {
  temperature: number;
  weatherCode: number;
  city: string; // Adicionaremos a cidade se a API de geocodificação reversa for usada
};

// Mapeamento de códigos de tempo do Open-Meteo para ícones
const getWeatherIcon = (code: number) => {
    switch (code) {
        case 0: return <SunIcon className="w-8 h-8 text-yellow-500" />; // Clear sky
        case 1:
        case 2:
        case 3: return <CloudIcon className="w-8 h-8 text-slate-400" />; // Mainly clear, partly cloudy, and overcast
        // Adicionar mais casos para chuva, neve, etc., se necessário
        default: return <CloudIcon className="w-8 h-8 text-slate-400" />;
    }
};

const InfoBar: React.FC = () => {
    const [time, setTime] = useState(new Date());
    const [currencies, setCurrencies] = useState<CurrencyData>({ usd: null, eur: null, lastUpdated: null });
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Efeito para o relógio
    useEffect(() => {
        const timerId = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);

    // Efeito para buscar dados das APIs
    useEffect(() => {
        // --- Buscar Cotações ---
        const fetchCurrencies = async () => {
            try {
                const response = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL');
                if (!response.ok) throw new Error('Falha ao buscar cotações');
                const data = await response.json();
                const usdRate = data.USDBRL?.bid;
                const eurRate = data.EURBRL?.bid;
                setCurrencies({
                    usd: usdRate ? parseFloat(usdRate) : null,
                    eur: eurRate ? parseFloat(eurRate) : null,
                    lastUpdated: new Date().toLocaleTimeString('pt-BR'),
                });
            } catch (e) {
                console.error('Currency fetch error:', e);
                setError('Cotações indisponíveis');
            }
        };

        // --- Buscar Clima ---
        const fetchWeather = () => {
            if (!navigator.geolocation) {
                setError('Geolocalização não é suportada pelo seu navegador.');
                return;
            }

            navigator.geolocation.getCurrentPosition(async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
                    if (!weatherResponse.ok) throw new Error('Falha ao buscar previsão do tempo');
                    const weatherData = await weatherResponse.json();
                    
                    // Tenta obter o nome da cidade (opcional)
                    let cityName = 'Sua Localização';
                    try {
                        const geoResponse = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                        if (geoResponse.ok) {
                            const geoData = await geoResponse.json();
                            cityName = geoData.address.city || geoData.address.town || 'Sua Localização';
                        }
                    } catch (geoError) {
                        console.error('Reverse geocoding failed, using default name.', geoError);
                    }
                    
                    setWeather({
                        temperature: Math.round(weatherData.current_weather.temperature),
                        weatherCode: weatherData.current_weather.weathercode,
                        city: cityName,
                    });
                } catch (e) {
                    console.error('Weather fetch error:', e);
                    setError('Clima indisponível');
                }
            }, () => {
                setError('Permissão de localização negada.');
            });
        };
        
        fetchCurrencies();
        fetchWeather();
    }, []);

    return (
        <div className="bg-[var(--background-secondary)] p-3 rounded-xl border border-[var(--border-primary)] shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4 text-sm mb-6 animated-item">
            {/* Relógio */}
            <div className="flex items-center gap-3 text-[var(--text-primary)]">
                <ClockIcon className="w-6 h-6 text-[var(--text-accent)]"/>
                <div>
                    <p className="font-bold text-lg leading-tight">{time.toLocaleTimeString('pt-BR')}</p>
                    <p className="text-xs text-[var(--text-secondary)] capitalize">{time.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' })}</p>
                </div>
            </div>

            {/* Divisor */}
            <div className="hidden sm:block w-px h-10 bg-[var(--border-primary)]"></div>

            {/* Cotações */}
            <div className="flex items-center gap-4 text-[var(--text-primary)]">
                <div className="flex items-center gap-2">
                    <CurrencyDollarIcon className="w-6 h-6 text-green-500"/>
                    <div>
                        <span className="font-semibold">USD: </span>
                        {currencies.usd ? `R$ ${currencies.usd.toFixed(2)}` : '...'}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <CurrencyEuroIcon className="w-6 h-6 text-blue-500"/>
                    <div>
                        <span className="font-semibold">EUR: </span>
                        {currencies.eur ? `R$ ${currencies.eur.toFixed(2)}` : '...'}
                    </div>
                </div>
            </div>
            
            {/* Divisor */}
            <div className="hidden sm:block w-px h-10 bg-[var(--border-primary)]"></div>

            {/* Clima */}
            <div className="flex items-center gap-3 text-[var(--text-primary)]">
                {weather ? (
                    <>
                        {getWeatherIcon(weather.weatherCode)}
                        <div>
                            <p className="font-bold text-lg leading-tight">{weather.temperature}°C</p>
                            <p className="text-xs text-[var(--text-secondary)]">{weather.city}</p>
                        </div>
                    </>
                ) : (
                    <div className="text-xs text-[var(--text-secondary)]">{error || 'Carregando clima...'}</div>
                )}
            </div>
        </div>
    );
};

export default InfoBar;
