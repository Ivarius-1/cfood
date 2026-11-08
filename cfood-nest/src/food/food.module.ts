import { Module } from '@nestjs/common';
import { FoodService } from './food.service.js';
import { FoodController } from './food.controller.js';
import { UsersModule } from '../users/users.module.js';
import { FirebirdModule } from '../database/firebird/firebird.module.js';

@Module({
  controllers: [FoodController],
  providers: [FoodService],
  imports: [FirebirdModule, UsersModule]
})
export class FoodModule {}
