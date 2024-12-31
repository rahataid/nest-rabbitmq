import {
  DynamicModule,
  ForwardReference,
  Global,
  Module,
  OnModuleDestroy,
  OnModuleInit,
  Type,
} from '@nestjs/common';
import * as amqp from 'amqp-connection-manager';
import { QueueUtilsService } from './queue-utils.service';
import { RabbitMQController } from './rabbitmq.controller';
import { RabbitMQService } from './rabbitmq.service';
import { DataProviderConfig } from './types';

@Global()
@Module({
  imports: [],
  providers: [],
  exports: [RabbitMQService, 'QUEUE_NAMES'],
})
export class RabbitMQModule implements OnModuleInit, OnModuleDestroy {
  static register(options: {
    urls: string[];
    queues: { name: string; durable: boolean; options?: amqp.Options.AssertQueue }[];
    connectionOptions?: amqp.AmqpConnectionManagerOptions;
    ampqProviderName?: string;
    workerModuleProvider?:
      | DynamicModule
      | Type<any>
      | Promise<DynamicModule>
      | ForwardReference<any>;
  }): DynamicModule {
    const amqpProvider = {
      provide: options.ampqProviderName,
      useFactory: () => amqp.connect(options.urls, options?.connectionOptions),
    };

    // const dataProviderModule = DataProviderModule.register(options.dataProviderConfig || {});

    return {
      module: RabbitMQModule,
      imports: [options.workerModuleProvider].filter(Boolean),
      controllers: [RabbitMQController],
      providers: [
        amqpProvider,
        QueueUtilsService,
        RabbitMQService,
        {
          provide: 'QUEUE_NAMES',
          useValue: options.queues,
        },
        // ...dataProviderModule.providers,
      ],
      exports: [
        amqpProvider,
        QueueUtilsService,
        RabbitMQService,
        'QUEUE_NAMES',
        // ...dataProviderModule.providers,
      ],
    };
  }

  async onModuleInit() {
    console.log('RabbitMQ Module initialized.');
  }

  async onModuleDestroy() {
    console.log('RabbitMQ Module destroyed.');
  }
}
