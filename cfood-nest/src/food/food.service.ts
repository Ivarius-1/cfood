import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { FirebirdService } from '../database/firebird/firebird.service.js';
import { userDto } from '../users/dto/tab.dto.js';
import { UsersService } from '../users/users.service.js';

@Injectable()
export class FoodService {
    constructor(
        private readonly firebird: FirebirdService,
        private readonly users: UsersService
    ) {}
    async registerFood(dto: userDto) {
        const user = await this.users.findOne(dto)

        if(!user){
            throw new HttpException('Сотрудник не найден', HttpStatus.NOT_FOUND)
        }

        const registedAt = new Date()

        await this.firebird.exectue(
            `INSERT INTO FB_FOOD (TABNUM, DT) VALUES (?, ?)`,
            [user.tabnum, registedAt]
        )

        return {
            success: true,
            user,
            registedAt
        }
    }
}
