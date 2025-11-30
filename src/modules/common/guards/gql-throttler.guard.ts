/**
* File: src/modules/common/guards/gql-throttler.guard.ts
* Module: modules/common/guards
* Purpose: GraphQL-aware ThrottlerGuard that safely extracts { req, res } for HTTP and GraphQL contexts.
* Author: Aman Sharma / Novologic
* Last-updated: 2025-11-30
* Notes:
* - Prevents `Cannot read properties of undefined (reading 'ip')` when ThrottlerGuard runs on GraphQL requests.
* - Uses GqlExecutionContext to pull the underlying HTTP request injected via GraphQL Yoga context.
*/

import { ExecutionContext, Injectable } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class GqlThrottlerGuard extends ThrottlerGuard {
  /**
   * Resolve the underlying HTTP request/response pair for both HTTP and
   * GraphQL execution contexts. This ensures that the base ThrottlerGuard
   * always receives a defined `req` object and does not attempt to read
   * `ip` from `undefined` when handling GraphQL operations.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected getRequestResponse(context: ExecutionContext): { req: any; res: any } {
    const contextType = context.getType() as string;

    // Fast-path: regular HTTP requests behave as the default ThrottlerGuard
    // expects, so we simply adapt the switchToHttp wrapper into { req, res }.
    if (contextType === 'http') {
      const httpCtx = context.switchToHttp();
      return {
        req: httpCtx.getRequest(), 
        res: httpCtx.getResponse(),
      };
    }

    // For GraphQL contexts, we rely on Nest's GqlExecutionContext and the Yoga
    // context factory (configured in AppModule) to expose the underlying HTTP
    // request/response as `ctx.req` and `ctx.res`.
    if (contextType === 'graphql') {
      const gqlCtx = GqlExecutionContext.create(context);
      // The context shape is defined in GraphQLModule.forRoot context: ({ req, res }) => ({ req, res, ... }).
      const ctx = (gqlCtx.getContext() as { req?: any; res?: any }) || {};
      // Ensure `req` is always an object so that downstream calls like `req.ip`
      // from ThrottlerGuard will not throw even if the real request is missing.
      const req = ctx.req ?? {};
      const res = ctx.res;
      return { req, res };
    }

    // For any other transport (e.g., WebSocket/RPC), fall back to the base
    // implementation which may choose an appropriate default behavior.
    // Casting is required because ThrottlerGuard's signature is protected.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (super.getRequestResponse as any)(context);
  }
}



