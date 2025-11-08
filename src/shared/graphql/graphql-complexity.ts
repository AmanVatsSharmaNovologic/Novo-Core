/**
* File: src/shared/graphql/graphql-complexity.ts
* Module: shared/graphql
* Purpose: GraphQL query complexity rule factory
* Author: Cursor / BharatERP
* Last-updated: 2025-11-08
* Notes:
* - Restricts complex queries to prevent abuse
*/

import { createComplexityRule, fieldExtensionsEstimator, simpleEstimator } from 'graphql-query-complexity';
import { GraphQLError } from 'graphql';

export function createComplexityValidationRule(maxComplexity = 2000) {
  return createComplexityRule({
    maximumComplexity: maxComplexity,
    onComplete: (complexity: number) => {
      // noop
    },
    createError: (max: number, actual: number) =>
      new GraphQLError(`Query is too complex: ${actual}. Maximum allowed complexity: ${max}`),
    estimators: [
      fieldExtensionsEstimator(),
      simpleEstimator({ defaultComplexity: 1 }),
    ],
  });
}


