// rabbitmq.module.ts
import { DynamicModule, Global, Module, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqp-connection-manager';
import { QueueUtilsService } from './queue-utils.service';
import { RabbitMQService } from './rabbitmq.service';
import { RabbitMQRegisterOptions } from './types';

@Global()
@Module({})
export class RabbitMQModule implements OnModuleInit, OnModuleDestroy {
  static register(options: RabbitMQRegisterOptions): DynamicModule {
    // 1) Create the AMQP provider
    const amqpProvider = {
      provide: options.ampqProviderName || 'AMQP_CONNECTION',
      useFactory: () => amqp.connect(options.urls, options.connectionOptions),
    };

    // 2) Merge user-defined "imports" with the workerModuleProvider (if any)
    //    This ensures we import the worker module plus anything else the user wants
    const mergedImports = [
      options.workerModuleProvider, // e.g. WorkerModule
      ...(options.imports || []),
    ].filter(Boolean);

    // 3) Merge user-defined controllers with our built-in controller
    const mergedControllers = [...(options.controllers || [])];

    // 4) Build the default providers
    const defaultProviders = [
      amqpProvider,
      QueueUtilsService,
      RabbitMQService,
      {
        provide: 'QUEUE_NAMES',
        useValue: options.queues,
      },
    ];

    // 5) Merge any user-supplied providers
    const mergedProviders = [...defaultProviders, ...(options.providers || [])];

    // 6) Merge our default exports with user-supplied exports
    const defaultExports = [amqpProvider, QueueUtilsService, RabbitMQService, 'QUEUE_NAMES'];
    const mergedExports = [...defaultExports, ...(options.exports || [])];

    return {
      module: RabbitMQModule,
      imports: mergedImports,
      controllers: mergedControllers,
      providers: mergedProviders,
      exports: mergedExports,
    };
  }

  async onModuleInit() {
    console.log('RabbitMQ Module initialized.');
  }

  async onModuleDestroy() {
    console.log('RabbitMQ Module destroyed.');
  }
}
