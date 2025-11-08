import { Module } from '@nestjs/common';
import { UtilService } from './util.service';
import { UtilResolver } from './util.resolver';

@Module({
  providers: [UtilResolver, UtilService],
})
export class UtilModule {}
