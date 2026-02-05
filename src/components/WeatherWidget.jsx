import { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, CloudLightning, Wind, Thermometer, Droplets } from 'lucide-react';

export default function WeatherWidget() {
    const [weather, setWeather] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchWeather = async (lat, lon) => {
            try {
                const response = await fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m&timezone=auto`
                );
                const data = await response.json();
                setWeather(data.current);
                setLoading(false);
            } catch (err) {
                setError("Nie udało się pobrać pogody");
                setLoading(false);
            }
        };

        // Default to a location (e.g., Warsaw) if geolocation fails
        const defaultLat = 52.2297;
        const defaultLon = 21.0122;

        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    fetchWeather(position.coords.latitude, position.coords.longitude);
                },
                () => {
                    fetchWeather(defaultLat, defaultLon);
                }
            );
        } else {
            fetchWeather(defaultLat, defaultLon);
        }
    }, []);

    const getWeatherIcon = (code) => {
        if (code === 0) return <Sun className="weather-icon-main sun" size={48} />;
        if (code >= 1 && code <= 3) return <Cloud className="weather-icon-main cloud" size={48} />;
        if (code >= 45 && code <= 48) return <Wind className="weather-icon-main fog" size={48} />;
        if (code >= 51 && code <= 67) return <CloudRain className="weather-icon-main rain" size={48} />;
        if (code >= 71 && code <= 77) return <CloudRain className="weather-icon-main snow" size={48} />;
        if (code >= 80 && code <= 82) return <CloudRain className="weather-icon-main rain" size={48} />;
        if (code >= 95) return <CloudLightning className="weather-icon-main storm" size={48} />;
        return <Cloud size={48} />;
    };

    const getWeatherDesc = (code) => {
        const codes = {
            0: "Czyste niebo",
            1: "Głównie czysto", 2: "Częściowe zachmurzenie", 3: "Pochmurno",
            45: "Mgła", 48: "Szron",
            51: "Lekka mżawka", 53: "Mżawka", 55: "Gęsta mżawka",
            61: "Lekki deszcz", 63: "Umiarkowany deszcz", 65: "Silny deszcz",
            71: "Lekki śnieg", 73: "Śnieg", 75: "Silny śnieg",
            95: "Burza"
        };
        return codes[code] || "Pogoda";
    };

    if (loading) return <div className="weather-loading">Pobieranie aury... ☁️</div>;
    if (error) return <div className="weather-error">{error}</div>;

    return (
        <div className="weather-widget animate-fadeIn">
            <div className="weather-main">
                <div className="weather-temp">
                    {Math.round(weather.temperature_2m)}°C
                </div>
                <div className="weather-info-box">
                    <span className="weather-desc">{getWeatherDesc(weather.weather_code)}</span>
                    <span className="weather-feels">Odczuwalna: {Math.round(weather.apparent_temperature)}°C</span>
                </div>
                <div className="weather-icon-container">
                    {getWeatherIcon(weather.weather_code)}
                </div>
            </div>

            <div className="weather-details">
                <div className="weather-detail-item">
                    <Droplets size={16} />
                    <span>{weather.relative_humidity_2m}%</span>
                </div>
                <div className="weather-detail-item">
                    <Wind size={16} />
                    <span>{Math.round(weather.wind_speed_10m)} km/h</span>
                </div>
            </div>
        </div>
    );
}
