/**
* File: test/gql-throttler.guard.spec.ts
* Purpose: Unit tests for GqlThrottlerGuard request/response extraction across HTTP and GraphQL contexts.
*/

import { ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { GqlThrottlerGuard } from '../src/modules/common/guards/gql-throttler.guard';

describe('GqlThrottlerGuard', () => {
  it('returns req/res for HTTP context', () => {
    const guard = new GqlThrottlerGuard({} as any);
    const httpReq = { ip: '127.0.0.1' };
    const httpRes = {};
    const ctx: ExecutionContext = {
      getType: () => 'http',
      switchToHttp: () =>
        ({
          getRequest: () => httpReq,
          getResponse: () => httpRes,
        } as any),
    } as ExecutionContext;

    const { req, res } = (guard as any).getRequestResponse(ctx);
    expect(req).toBe(httpReq);
    expect(res).toBe(httpRes);
  });

  it('returns safe req/res for GraphQL context even when ctx.req is missing', () => {
    const guard = new GqlThrottlerGuard({} as any);
    const gqlReq = { ip: '10.0.0.1' };
    const gqlRes = {};
    const gqlContextValue: any = { req: gqlReq, res: gqlRes };

    // Mock GqlExecutionContext.create to control the returned context.
    const originalCreate = (GqlExecutionContext as any).create;
    (GqlExecutionContext as any).create = () =>
      ({
        getContext: () => gqlContextValue,
      } as any);

    const ctx: ExecutionContext = {
      getType: () => 'graphql',
    } as ExecutionContext;

    try {
      const { req, res } = (guard as any).getRequestResponse(ctx);
      expect(req).toBe(gqlReq);
      expect(res).toBe(gqlRes);
    } finally {
      (GqlExecutionContext as any).create = originalCreate;
    }
  });
});



