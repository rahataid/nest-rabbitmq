// src/rabbitmq/dataproviders/dataprovider.module.ts
import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { v4 as uuid } from 'uuid';

export const API_URL = 'API_URL';
export const PRISMA_SERVICE = 'PRISMA_SERVICE';
export const DATA_PROVIDER = 'DATA_PROVIDER';

@Global()
@Module({})
export class DataProviderModule {
  static register(
    config: {
      apiUrl?: string;
      dataProvider?: any; // e.g., BeneficiaryApiProvider
      prismaService?: any; // e.g., an instance
    },
    forcedToken?: string,
  ): DynamicModule {
    const uniqueToken = forcedToken || `DATA_PROVIDER_${uuid()}`;

    const providers: Provider[] = [];

    if (config.apiUrl) {
      providers.push({
        provide: API_URL,
        useValue: config.apiUrl,
      });
    }

    if (config.prismaService) {
      providers.push({
        provide: PRISMA_SERVICE,
        useValue: config.prismaService,
      });
    }

    if (config.dataProvider) {
      providers.push({
        provide: uniqueToken,
        useClass: config.dataProvider,
      });
      providers.push({
        provide: DATA_PROVIDER,
        useExisting: uniqueToken,
      });
    }

    return {
      module: DataProviderModule,
      providers,
      exports: [
        uniqueToken,
        DATA_PROVIDER,
        config.apiUrl && API_URL,
        config.prismaService && PRISMA_SERVICE,
      ].filter(Boolean),
    };
  }
}
