import { Module } from '@nestjs/common';
import { FirebirdModule } from './database/firebird/firebird.module.js';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module.js';
import { FoodModule } from './food/food.module.js';

@Module({
  imports: [FirebirdModule, ConfigModule.forRoot({isGlobal:true}), UsersModule, FoodModule],
  providers: [],
})
export class AppModule {}
