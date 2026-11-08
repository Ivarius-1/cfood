import { Controller, Get } from '@nestjs/common';
import { FirebirdService } from './firebird.service.js';

@Controller('firebird')
export class FirebirdController {
    constructor(private readonly firebird: FirebirdService) {}

    @Get('health')
    async health() {
        await this.firebird.query(`SELECT 1 AS OK FROM RDB$DATABASE`)
        return {status: 'ok'}
    }
}
