import { Test, TestingModule } from '@nestjs/testing';
import { UtilResolver } from './util.resolver';
import { UtilService } from './util.service';

describe('UtilResolver', () => {
  let resolver: UtilResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UtilResolver, UtilService],
    }).compile();

    resolver = module.get<UtilResolver>(UtilResolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
