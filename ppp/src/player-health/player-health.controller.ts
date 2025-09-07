import { Controller, Post, Body, Param, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { PlayerHealthService } from './player-health.service';
import { CreatePlayerHealthDto, InjuryDataDto } from './dto/player-health.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiProperty } from '@nestjs/swagger';
import { ParseUUIDPipe } from '@nestjs/common';

// Define response DTOs for Swagger
class PredictionResponseDto {
  @ApiProperty({ description: 'Injury risk probability (0 to 1)', example: 0.1 })
  risk: number;

  @ApiProperty({ description: 'Recommendations based on injury risk', example: 'Maintain current activity level.' })
  recommendations: string;
}

@ApiTags('player-health')
@Controller('player-health')
@ApiBearerAuth()
export class PlayerHealthController {
  constructor(
    private readonly playerHealthService: PlayerHealthService,
    private readonly httpService: HttpService,
  ) {}

  @ApiOperation({ summary: 'Submit player health data' })
  @ApiResponse({ status: 201, description: 'Health data created successfully', type: CreatePlayerHealthDto })
  @ApiResponse({ status: 400, description: 'Invalid input or user not authenticated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiBody({ type: CreatePlayerHealthDto })
  @UseGuards(JwtAuthGuard)
  @Post()
  async submitHealthData(@Req() req: Request, @Body() dto: CreatePlayerHealthDto) {
    if (!req.user) {
      throw new BadRequestException('User not authenticated');
    }
    return this.playerHealthService.createHealthData(req.user, dto);
  }

  @ApiOperation({ summary: 'Submit injury data for a player' })
  @ApiResponse({ status: 200, description: 'Injury data updated successfully', type: InjuryDataDto })
  @ApiResponse({ status: 400, description: 'Invalid user ID or no health data found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiParam({ name: 'userId', description: 'ID of the user (UUID)', type: String })
  @ApiBody({ type: InjuryDataDto })
  @UseGuards(JwtAuthGuard)
  @Post(':userId/injury')
  async submitInjuryData(@Param('userId', ParseUUIDPipe) userId: string, @Body() injuryData: InjuryDataDto) {
    return this.playerHealthService.updateInjuryData(userId, injuryData);
  }

  @ApiOperation({ summary: 'Predict injury risk for a player' })
  @ApiResponse({ status: 200, description: 'Injury prediction successful', type: PredictionResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid user ID, no health data, or prediction service unavailable' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiParam({ name: 'userId', description: 'ID of the user (UUID)', type: String })
  @UseGuards(JwtAuthGuard)
  @Post(':userId/predict-injury')
  async predictInjury(@Param('userId', ParseUUIDPipe) userId: string) {
    const healthData = await this.playerHealthService.getPlayerHealthData(userId);
    const matchData = await this.playerHealthService.getPlayerMatchStats(userId);

    if (!healthData) {
      throw new BadRequestException('No health data available for this user');
    }

    const input = {
      matchesPlayedWeek: matchData.matchesPlayedWeek,
      matchFrequency: matchData.matchFrequency,
      matchIntensity: matchData.matchIntensity,
      age: healthData.age,
      bmi: healthData.weight / ((healthData.height / 100) ** 2),
      recentInjuries: healthData.recentInjuries,
      fitnessLevel: healthData.fitnessLevel,
      trainingHours: healthData.trainingHours,
      sleepHours: healthData.sleepHours,
      stressLevel: healthData.stressLevel,
    };

    console.log('Input sent to Flask:', JSON.stringify(input, null, 2)); // Log input for debugging
    const flaskApiUrl = process.env.FLASK_API_URL || 'http://flask-api-service:5000/predict';


    try {
      const response = await firstValueFrom(
        this.httpService.post(flaskApiUrl, input, {
          headers: { 'Cache-Control': 'no-cache' },
        }),
      );
      console.log('Flask response:', response.data); // Log Flask response
      return response.data;
    } catch (error) {
      console.error('Error calling Flask API:', error); // Log errors
      throw new BadRequestException('Prediction service unavailable');
    }
  }
}