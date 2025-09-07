import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';

@Injectable()
export class WeatherService {
  private readonly baseUrl = 'https://api.open-meteo.com/v1/forecast';
  private readonly geoUrl = 'https://geocoding-api.open-meteo.com/v1/search';

  constructor(
    private readonly httpService: HttpService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getWeatherByCity(city: string, date: string, time: string) {
    // Validate date is within 7 days (Open-Meteo hourly forecast limit)
    const inputDate = new Date(`${date}T${time}`);
    const today = new Date();
    const maxDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    if (inputDate > maxDate) {
      throw new HttpException('Date must be within 7 days from today', HttpStatus.BAD_REQUEST);
    }

    // Check cache
    const cacheKey = `weather_city_${city}_${date}_${time}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    // Geocode city (restrict to Tunisia)
    const url = `${this.geoUrl}?name=${encodeURIComponent(city)}&count=1&country=TN`;
    try {
      const geoResponse = await firstValueFrom(this.httpService.get(url));
      const location = geoResponse.data.results?.[0];
      if (!location) {
        throw new HttpException(`City ${city} not found in Tunisia`, HttpStatus.NOT_FOUND);
      }

      const { latitude, longitude } = location;
      const hour = time.split(':')[0];
      const weatherUrl = `${this.baseUrl}?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,precipitation_probability,windspeed_10m,weathercode&forecast_days=7`;

      const weatherResponse = await firstValueFrom(this.httpService.get(weatherUrl));
      const hourly = weatherResponse.data.hourly;
      const index = hourly.time.findIndex((t: string) => t.startsWith(`${date}T${hour}`));

      if (index === -1) {
        throw new HttpException('No forecast available for the specified time', HttpStatus.NOT_FOUND);
      }

      const weatherData = {
        temperature: hourly.temperature_2m[index], // °C
        weather: this.mapWeatherCode(hourly.weathercode[index]),
        precipitation: hourly.precipitation_probability[index], // % chance of rain
        wind_speed: hourly.windspeed_10m[index], // km/h
      };

      // Cache for 1 hour
      await this.cacheManager.set(cacheKey, weatherData, 3600 * 1000);
      return weatherData;
    } catch (error) {
      throw new HttpException(
        `Failed to fetch weather data: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private mapWeatherCode(code: number): string {
    const weatherCodes: { [key: number]: string } = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      61: 'Light rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      95: 'Thunderstorm',
      80: 'Rain showers',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Heavy drizzle',
      71: 'Light snow',
      73: 'Moderate snow',
      75: 'Heavy snow',
    };
    return weatherCodes[code] || 'Unknown';
  }
}