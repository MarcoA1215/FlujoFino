import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FiscalInvoice } from '../entities/fiscal-invoice.entity';
import { Settings } from '../entities/settings.entity';
import { Order } from '../entities/order.entity';
import { FiscalService } from './fiscal.service';
import { FiscalController } from './fiscal.controller';
import { InternalFiscalProvider } from './providers/internal-fiscal.provider';
import { UnidigitalFiscalProvider } from './providers/unidigital-fiscal.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([FiscalInvoice, Settings, Order]),
  ],
  controllers: [FiscalController],
  providers: [
    FiscalService,
    InternalFiscalProvider,
    UnidigitalFiscalProvider,
  ],
  exports: [
    FiscalService,
    InternalFiscalProvider,
    UnidigitalFiscalProvider,
  ],
})
export class FiscalModule {}
