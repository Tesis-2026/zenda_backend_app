import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { AccountsService } from './application/accounts.service';
import { AccountsController } from './interface/accounts.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AccountsController],
  providers: [AccountsService],
  exports: [AccountsService],
})
export class AccountsModule {}
