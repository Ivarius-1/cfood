import { Body, Controller, Post } from '@nestjs/common';
import { FoodService } from './food.service.js';
import { userDto } from '../users/dto/tab.dto.js';

@Controller('food')
export class FoodController {
  constructor(private readonly foodService: FoodService) {}
  @Post('register')
  async register(@Body() dto: userDto) {
    const result = await this.foodService.registerFood(dto)

    return { ...result }
  }
}
