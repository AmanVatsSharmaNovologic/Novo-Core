/**
* File: test/graphql-error.filter.spec.ts
* Purpose: Unit tests for GraphqlExceptionFilter mapping AppError into HttpException for GraphQL contexts.
*/

import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { GraphqlExceptionFilter } from '../src/modules/common/filters/graphql-exception.filter';
import { AppError } from '../src/common/errors';

describe('GraphqlExceptionFilter', () => {
  it('wraps AppError into HttpException with mapped status and code', () => {
    const filter = new GraphqlExceptionFilter({ error: () => undefined } as any);
    const exception = new AppError('UNAUTHORIZED', 'Not allowed');

    const host: ArgumentsHost = {
      getType: () => 'graphql',
    } as any;

    const result = filter.catch(exception, host) as HttpException;
    expect(result).toBeInstanceOf(HttpException);
    expect(result.getStatus()).toBe(HttpStatus.UNAUTHORIZED);
    expect((result.getResponse() as any).code).toBe('UNAUTHORIZED');
  });

  it('rethrows non-graphql contexts for other filters to handle', () => {
    const filter = new GraphqlExceptionFilter({ error: () => undefined } as any);
    const exception = new AppError('UNAUTHORIZED', 'Not allowed');
    const host: ArgumentsHost = {
      getType: () => 'http',
    } as any;

    expect(() => filter.catch(exception, host)).toThrow(exception);
  });
});



