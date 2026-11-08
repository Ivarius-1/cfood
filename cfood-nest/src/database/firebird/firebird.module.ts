import { Module } from '@nestjs/common';
import { FirebirdService } from './firebird.service.js';
import { FirebirdController } from './firebird.controller.js';

@Module({
  providers: [FirebirdService],
  exports: [FirebirdService],
  controllers: [FirebirdController]
})
export class FirebirdModule {}
