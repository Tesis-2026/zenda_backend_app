import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiAuthErrors, ApiCreated, ApiOk, ApiValidationError } from '../../../shared/swagger/api-responses.decorator';
import { JwtAuthGuard } from '../../auth/infrastructure/jwt-auth.guard';
import { UserId } from '../../auth/interface/decorators/user-id.decorator';
import { AccountsService } from '../application/accounts.service';
import { AccountReportResponseDto } from './dto/account-report.response.dto';
import { AccountResponseDto } from './dto/account.response.dto';
import { CreateAccountDto } from './dto/create-account.dto';
import { TransferAccountsDto } from './dto/transfer-accounts.dto';

@ApiTags('Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get()
  @ApiOperation({ summary: 'List user accounts with calculated balances' })
  @ApiOk(AccountResponseDto, 'Accounts with balances')
  @ApiAuthErrors()
  list(@UserId() userId: string): Promise<AccountResponseDto[]> {
    return this.accounts.list(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a financial account' })
  @ApiCreated(AccountResponseDto, 'Account created')
  @ApiValidationError()
  @ApiAuthErrors()
  create(
    @UserId() userId: string,
    @Body() dto: CreateAccountDto,
  ): Promise<AccountResponseDto> {
    return this.accounts.create(userId, dto);
  }

  @Post('transfer')
  @ApiOperation({ summary: 'Transfer money between accounts' })
  @ApiCreated(AccountResponseDto, 'Transfer recorded')
  @ApiValidationError()
  @ApiAuthErrors()
  transfer(@UserId() userId: string, @Body() dto: TransferAccountsDto) {
    return this.accounts.transfer(userId, dto);
  }

  @Get('report')
  @ApiOperation({ summary: 'Account-based report and insights' })
  @ApiOk(AccountReportResponseDto, 'Account report')
  @ApiAuthErrors()
  report(
    @UserId() userId: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ): Promise<AccountReportResponseDto> {
    return this.accounts.report(userId, {
      month: month ? Number(month) : undefined,
      year: year ? Number(year) : undefined,
    });
  }
}
