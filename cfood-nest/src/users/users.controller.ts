import { Controller, Post, Body, HttpException, HttpStatus} from '@nestjs/common';
import { UsersService } from './users.service.js';
import { userDto } from './dto/tab.dto.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('get-usr')
  async getUser(@Body() dto: userDto) {
    const user = await this.usersService.findOne(dto)

    if(!user) {
      throw new HttpException('Сотрудник не найден', HttpStatus.NOT_FOUND)
    }

    return {
      success: true,
      user
    }
  }  
}
