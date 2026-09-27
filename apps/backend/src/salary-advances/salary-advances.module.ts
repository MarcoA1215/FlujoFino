import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SalaryAdvance } from '../entities/salary-advance.entity';
import { OperatingExpense } from '../entities/operating-expense.entity';
import { User } from '../entities/user.entity';
import { Settings } from '../entities/settings.entity';
import { SalaryAdvancesService } from './salary-advances.service';
import { SalaryAdvancesController } from './salary-advances.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([SalaryAdvance, OperatingExpense, User, Settings]),
  ],
  controllers: [SalaryAdvancesController],
  providers: [SalaryAdvancesService],
  exports: [SalaryAdvancesService],
})
export class SalaryAdvancesModule {}
