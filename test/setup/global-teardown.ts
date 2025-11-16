/**
 * @file global-teardown.ts
 * @module tests/setup
 * @description Jest global teardown: stop Postgres Testcontainer
 * @author BharatERP
 * @created 2025-11-16
 */

module.exports = async () => {
  const container = (global as any).__TESTCONTAINER__;
  if (container) {
    await container.stop();
  }
};


