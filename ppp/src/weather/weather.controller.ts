import { Controller, Get, Query, UsePipes, ValidationPipe } from '@nestjs/common';
import { WeatherService } from './weather.service';
import { GetWeatherByCityDto } from './dto/weather.dto';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('weather')
@Controller('weather')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) {}

  @Get()
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Get weather forecast for a city in Tunisia' })
  @ApiQuery({
    name: 'city',
    description: 'The name of the city in Tunisia (e.g., Tunis)',
    type: String,
    example: 'Tunis',
    required: true,
  })
  @ApiQuery({
    name: 'date',
    description: 'The date in YYYY-MM-DD format (e.g., 2025-07-15)',
    type: String,
    example: '2025-07-15',
    required: true,
  })
  @ApiQuery({
    name: 'time',
    description: 'The time in HH:MM format (e.g., 12:00)',
    type: String,
    example: '12:00',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'The weather forecast data',
    schema: {
      example: {
        temperature: 25.5,
        weather: 'Clear sky',
        precipitation: 10,
        wind_speed: 15.2,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid input format or date beyond 7 days',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - City not found or no forecast available',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal Server Error - Failed to fetch weather data',
  })
  async getWeather(@Query() query: GetWeatherByCityDto) {
    return this.weatherService.getWeatherByCity(query.city, query.date, query.time);
  }
}