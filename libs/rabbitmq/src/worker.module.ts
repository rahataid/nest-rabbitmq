// src/rabbitmq/worker.module.ts

import { Module, DynamicModule, ClassProvider, FactoryProvider } from '@nestjs/common';
import { v4 as uuid } from 'uuid';
import { DataProviderModule } from './dataproviders/dataprovider.module';
import { WorkerDefinition, WorkerClassDefinition, WorkerFactoryDefinition } from './types';
import { WorkerTokensModule } from './worker-tokens.module';

interface GlobalDataProviderConfig {
  apiUrl?: string;
  dataProvider?: any;
  prismaService?: any;
}

@Module({})
export class WorkerModule {
  static register(params: {
    workers: WorkerDefinition[];
    globalDataProvider?: GlobalDataProviderConfig;
  }): DynamicModule {
    const { workers, globalDataProvider } = params;

    // 1) Possibly create a global data provider/tokens module
    let globalModule: DynamicModule | null = null;
    if (globalDataProvider) {
      // If there's an actual dataProvider class, use DataProviderModule
      if (globalDataProvider.dataProvider) {
        const globalToken = `DATA_PROVIDER_${uuid()}`;
        globalModule = DataProviderModule.register(
          {
            dataProvider: globalDataProvider.dataProvider,
            apiUrl: globalDataProvider.apiUrl,
            prismaService: globalDataProvider.prismaService,
          },
          globalToken,
        );
      } else if (globalDataProvider.apiUrl || globalDataProvider.prismaService) {
        // No dataProvider, but we do have tokens
        globalModule = WorkerTokensModule.register({
          apiUrl: globalDataProvider.apiUrl || 'Invalid API URL',
          prismaService: globalDataProvider.prismaService,
        });
      }
    }

    // 2) For each worker, do the same logic
    const perWorkerModules: DynamicModule[] = [];
    const workerToToken: Record<string, string | null> = {};

    workers.forEach(worker => {
      const finalDataProvider = worker.workerDataProvider || globalDataProvider?.dataProvider;
      const finalApiUrl = worker.apiUrl || globalDataProvider?.apiUrl;
      const finalPrismaService = worker.prismaService || globalDataProvider?.prismaService;

      if (finalDataProvider) {
        const token = `DATA_PROVIDER_${uuid()}`;
        workerToToken[worker.provide] = token;

        const mod = DataProviderModule.register(
          {
            dataProvider: finalDataProvider,
            apiUrl: finalApiUrl,
            prismaService: finalPrismaService,
          },
          token,
        );
        perWorkerModules.push(mod);
      } else if (finalApiUrl || finalPrismaService) {
        // Provide a mini module that only exports API_URL / PRISMA_SERVICE
        workerToToken[worker.provide] = null; // no data provider token
        const mod = WorkerTokensModule.register({
          apiUrl: finalApiUrl,
          prismaService: finalPrismaService,
        });
        perWorkerModules.push(mod);
      } else {
        workerToToken[worker.provide] = null;
      }
    });

    // 3) Build Worker Providers
    const workerProviders: Array<ClassProvider | FactoryProvider> = workers.map(worker => {
      const dataToken = workerToToken[worker.provide];
      if ('useFactory' in worker) {
        const w = worker as WorkerFactoryDefinition;
        return {
          provide: w.provide,
          useFactory: w.useFactory,
          inject: dataToken ? [dataToken, ...(w.inject || [])] : w.inject || [],
        } as FactoryProvider;
      } else {
        const w = worker as WorkerClassDefinition;
        return {
          provide: w.provide,
          useClass: w.useClass,
        } as ClassProvider;
      }
    });

    // 4) Return the DynamicModule
    return {
      module: WorkerModule,
      imports: [...(globalModule ? [globalModule] : []), ...perWorkerModules],
      providers: workerProviders,
      exports: [...workerProviders, ...(globalModule ? [globalModule] : []), ...perWorkerModules],
    };
  }
}
