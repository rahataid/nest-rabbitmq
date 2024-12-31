// src/rabbitmq/worker.module.ts

import { Module, DynamicModule, ClassProvider, FactoryProvider } from '@nestjs/common';
import { v4 as uuid } from 'uuid';

import { DataProviderModule } from './dataproviders/dataprovider.module';
import { WorkerDefinition, WorkerClassDefinition, WorkerFactoryDefinition } from './types';

interface GlobalDataProviderConfig {
  apiUrl?: string;
  dataProvider?: any; // e.g., BeneficiaryApiProvider
  prismaService?: any; // e.g., PrismaService
}

@Module({})
export class WorkerModule {
  static register(params: {
    workers: WorkerDefinition[];
    globalDataProvider?: GlobalDataProviderConfig;
  }): DynamicModule {
    const { workers, globalDataProvider } = params;

    // -------------------------------------------------
    // 1) Possibly create a global data provider module
    //    (only if globalDataProvider is fully set)
    // -------------------------------------------------
    let globalDataProviderModule: DynamicModule | null = null;
    // We'll track a global unique token if we have a global provider
    let globalUniqueToken: string | null = null;

    if (globalDataProvider?.dataProvider) {
      globalUniqueToken = `DATA_PROVIDER_${uuid()}`;
      globalDataProviderModule = DataProviderModule.register(
        {
          apiUrl: globalDataProvider.apiUrl,
          dataProvider: globalDataProvider.dataProvider,
          prismaService: globalDataProvider.prismaService,
        },
        globalUniqueToken,
      );
    }

    // -------------------------------------------------
    // 2) For each worker, create a DataProviderModule
    //    if it or the global has a dataProvider
    // -------------------------------------------------
    const perWorkerModules: DynamicModule[] = [];
    const workerToToken: Record<string, string | null> = {};

    workers.forEach(worker => {
      // Merge worker config with global fallback
      const finalDataProvider = worker.workerDataProvider || globalDataProvider?.dataProvider;
      const finalApiUrl = worker.apiUrl || globalDataProvider?.apiUrl;
      const finalPrismaService = worker.prismaService || globalDataProvider?.prismaService;

      if (finalDataProvider) {
        // Generate a unique token for this worker
        const token = `DATA_PROVIDER_${uuid()}`;
        workerToToken[worker.provide] = token;

        // Register a dynamic module for this worker
        const mod = DataProviderModule.register(
          {
            dataProvider: finalDataProvider,
            apiUrl: finalApiUrl,
            prismaService: finalPrismaService,
          },
          token,
        );
        perWorkerModules.push(mod);
      } else {
        // If neither the worker nor global had a dataProvider, set null
        workerToToken[worker.provide] = null;
      }
    });

    // -------------------------------------------------
    // 3) Build Worker Providers
    // -------------------------------------------------
    const workerProviders: Array<ClassProvider | FactoryProvider> = workers.map(worker => {
      const dataToken = workerToToken[worker.provide];

      if ('useFactory' in worker) {
        // Factory-based
        const w = worker as WorkerFactoryDefinition;
        const injects = w.inject || [];
        return {
          provide: w.provide,
          useFactory: w.useFactory,
          inject: dataToken ? [dataToken, ...injects] : injects,
        } as FactoryProvider;
      } else {
        // Class-based
        const w = worker as WorkerClassDefinition;
        return {
          provide: w.provide,
          useClass: w.useClass,
        } as ClassProvider;
      }
    });

    // -------------------------------------------------
    // 4) Return the DynamicModule
    // -------------------------------------------------
    return {
      module: WorkerModule,
      imports: [
        ...(globalDataProviderModule ? [globalDataProviderModule] : []),
        ...perWorkerModules,
      ],
      providers: workerProviders,
      exports: [
        ...workerProviders,
        ...(globalDataProviderModule ? [globalDataProviderModule] : []),
        ...perWorkerModules,
      ],
    };
  }
}
