/**
* File: src/shared/graphql/graphql-complexity.ts
* Module: shared/graphql
* Purpose: GraphQL query complexity rule factory
* Author: Aman Sharma / Novologic
* Last-updated: 2025-11-08
* Notes:
* - Restricts complex queries to prevent abuse
*/

import { createComplexityRule, fieldExtensionsEstimator, simpleEstimator } from 'graphql-query-complexity';
import { GraphQLError } from 'graphql';
import { RequestContext } from '../request-context';
import { LoggerFactory } from '../logger';
import { buildAppConfig } from '../config/config.factory';

export function createComplexityValidationRule(maxComplexity = 2000) {
  const config = buildAppConfig();
  const logger = LoggerFactory.create(config);
  return createComplexityRule({
    maximumComplexity: maxComplexity,
    onComplete: (complexity: number) => {
      const ctx = RequestContext.get();
      const requestId = ctx?.requestId;
      logger.debug(
        {
          requestId,
          complexity,
          maxComplexity,
        },
        'GraphQL query complexity evaluated',
      );
    },
    createError: (max: number, actual: number) =>
      new GraphQLError(`Query is too complex: ${actual}. Maximum allowed complexity: ${max}`),
    estimators: [
      fieldExtensionsEstimator(),
      simpleEstimator({ defaultComplexity: 1 }),
    ],
  });
}

/**
 * Lightweight GraphQL Yoga plugin that attaches the complexity validation rule
 * to the validation phase. This keeps our Nest Yoga configuration clean while
 * still enforcing maximum query complexity.
 */
export function createComplexityPlugin(maxComplexity = 2000) {
  return {
    // The Yoga plugin system will call this hook before executing a request.
    // We use it to register the complexity validation rule for the operation.
    onValidate({
      addValidationRule,
    }: {
      // Narrow inline type to avoid importing Yoga types while keeping TS happy.
      addValidationRule: (rule: unknown) => void;
    }) {
      addValidationRule(createComplexityValidationRule(maxComplexity));
    },
  };
}



