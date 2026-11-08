import { Injectable } from '@nestjs/common';
import { FirebirdService } from '../database/firebird/firebird.service.js';
import { userDto } from './dto/tab.dto.js';
import { UserResponse } from './interface/response.interface.js';

@Injectable()
export class UsersService {
    constructor(private readonly firebird: FirebirdService) {}

    async findOne(dto: userDto): Promise<UserResponse | null>{
        const users = await this.firebird.query<UserResponse>(
            'SELECT FIRST 1 FIO, TABNUM FROM FB_USR WHERE TABNUM = ?',
            [dto.tabnum]
        )
        return users[0] ?? null
    }
}