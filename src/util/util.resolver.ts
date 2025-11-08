import { Resolver } from '@nestjs/graphql';
import { UtilService } from './util.service';

@Resolver()
export class UtilResolver {
  constructor(private readonly utilService: UtilService) {}
}
