/**
* File: src/app.module.ts
* Module: app
* Purpose: Root module bootstrapping core modules and global providers
* Author: Aman Sharma / Novologic
* Last-updated: 2025-11-15
* Notes:
* - Applies RequestContextMiddleware globally for requestId propagation
* - Imports global AppConfig and Logger modules
*/
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
// import { AuthModule } from './auth/auth.module';
import { CommonModule } from './modules/common/common.module';
import { UtilModule } from './modules/util/util.module';
import { UserModule } from './modules/user/user.module';
import { AppConfigModule } from './shared/config/config.module';
import { LoggerModule } from './shared/logger.module';
import { RequestContextMiddleware } from './modules/common/middleware/request-context.middleware';
import { HttpErrorFilter } from './modules/common/filters/http-exception.filter';
import { GraphqlExceptionFilter } from './modules/common/filters/graphql-exception.filter';
import { DatabaseModule } from './shared/database/database.module';
import { TenancyModule } from './shared/tenancy/tenancy.module';
import { CryptoModule } from './shared/crypto/crypto.module';
import { AuthModule } from './modules/auth/auth.module';
import { GraphQLModule } from '@nestjs/graphql';
import { YogaDriver, YogaDriverConfig } from '@graphql-yoga/nestjs';
import { useCSRFPrevention } from '@graphql-yoga/plugin-csrf-prevention';
import { ManagementModule } from './modules/auth/management/management.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { ObservabilityModule } from './modules/observability/observability.module';
import { createComplexityPlugin } from './shared/graphql/graphql-complexity';
import { GlobalAuthGuard } from './modules/auth/rbac/global-auth.guard';
import { MailModule } from './modules/mail/mail.module';
import { GqlThrottlerGuard } from './modules/common/guards/gql-throttler.guard';

@Module({
  imports: [
    AppConfigModule,
    LoggerModule,
    DatabaseModule,
    TenancyModule,
    CryptoModule,
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    GraphQLModule.forRoot<YogaDriverConfig>({
      driver: YogaDriver,
      autoSchemaFile: true,
      sortSchema: true,
      // CSRF protection plugin plus query complexity guard to prevent abusive queries.
      // Complexity limit can be tuned via config by changing the value below.
      plugins: [useCSRFPrevention(), createComplexityPlugin(1500)],
      graphiql: process.env.NODE_ENV !== 'production',
      // Expose the underlying HTTP request/response so GraphqlAuthGuard and
      // GraphQL-aware infrastructure (e.g., GqlThrottlerGuard) can operate
      // correctly, while still surfacing requestId for resolvers.
      // Yoga/Nest will pass the Express req/res objects here.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      context: ({ req, res }: { req: any; res: any }) => ({
        req,
        res,
        requestId: (req as any).requestId,
      }),
    }),
    AuthModule,
    MailModule, // Global mail module for email sending
    // OidcModule, // now aggregated
    // ManagementModule, // now aggregated
    UserModule,
    CommonModule,
    UtilModule,
    ObservabilityModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: HttpErrorFilter,
    },
    {
      provide: APP_FILTER,
      useClass: GraphqlExceptionFilter,
    },
    {
      provide: 'APP_GUARD',
      useClass: GqlThrottlerGuard,
    },
    {
      provide: 'APP_GUARD',
      useClass: GlobalAuthGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
