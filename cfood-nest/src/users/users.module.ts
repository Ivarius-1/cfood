import { Module } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { FirebirdModule } from '../database/firebird/firebird.module.js';

@Module({
  controllers: [UsersController],
  providers: [UsersService],
  imports: [FirebirdModule],
  exports: [UsersService]
})
export class UsersModule {}
