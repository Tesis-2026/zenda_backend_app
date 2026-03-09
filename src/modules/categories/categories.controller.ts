import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { SuccessResponseDto } from '../../common/dto/success-response.dto';
import { UserId } from '../auth/decorators/user-id.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CategoriesService } from './categories.service';
import { CategoryResponseDto } from './dto/category.response.dto';
import { CreateCategoryDto } from './dto/create-category.dto';

@ApiTags('categories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Create custom category for authenticated user' })
  @ApiBody({ type: CreateCategoryDto })
  @ApiOkResponse({ type: CategoryResponseDto })
  @ApiBadRequestResponse({ description: 'Validation error' })
  create(@UserId() userId: string, @Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List system categories plus custom categories for authenticated user' })
  @ApiOkResponse({ type: CategoryResponseDto, isArray: true })
  findAll(@UserId() userId: string) {
    return this.categoriesService.findAll(userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete custom category for authenticated user' })
  @ApiParam({ name: 'id', example: '8f87bc0f-f046-4e90-bbf9-ed18ed1699a8' })
  @ApiOkResponse({ type: SuccessResponseDto })
  @ApiNotFoundResponse({ description: 'Custom category not found' })
  remove(@UserId() userId: string, @Param('id') id: string) {
    return this.categoriesService.remove(userId, id);
  }
}
