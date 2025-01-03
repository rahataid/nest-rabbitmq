// src/rabbitmq/worker-tokens.module.ts
import { DynamicModule } from '@nestjs/common';
import { API_URL, PRISMA_SERVICE } from './dataproviders/dataprovider.module';

export class WorkerTokensModule {
  static register(opts: { apiUrl?: string; prismaService?: any }): DynamicModule {
    const providers = [];
    const exportsTokens = [];

    if (opts.apiUrl) {
      providers.push({
        provide: API_URL,
        useValue: opts.apiUrl,
      });
      exportsTokens.push(API_URL);
    }

    if (opts.prismaService) {
      // If it's an *instance*, do `useValue`.
      // If it's a *class*, do `useClass`.
      // Usually, an instance is safer:
      providers.push({
        provide: PRISMA_SERVICE,
        useClass: opts.prismaService,
      });
      exportsTokens.push(PRISMA_SERVICE);
    }

    return {
      module: WorkerTokensModule,
      providers,
      exports: exportsTokens,
    };
  }
}
