import { DynamicModule, ForwardReference, Type } from '@nestjs/common';
import * as amqp from 'amqp-connection-manager';

export type RabbitMQModuleOptions = {
  urls: string[];
  queues: { name: string; durable: boolean; options?: amqp.Options.AssertQueue }[];
  connectionOptions?: amqp.AmqpConnectionManagerOptions;
  ampqProviderName?: string;
  workerModuleProvider?: DynamicModule | Type<any> | Promise<DynamicModule> | ForwardReference<any>;
};

export interface IDataProvider {
  // Define the structure for fetching or saving beneficiaries
  getList: () => Promise<any[]>;
  saveList: (list: any[]) => Promise<void> | Promise<any>;
  getItem: (id: string) => Promise<any>;
  saveItem: (item: any) => Promise<void>;
}

export type DataProviderConfig = {
  apiUrl?: string;
  usePrisma?: boolean;
  dataProvider?: Type<any>;
};

/**
 * A worker that uses a class provider.
 *
 * - `provide`: the token (e.g. 'BeneficiaryWorker1')
 * - `useClass`: the actual NestJS class
 */
export interface WorkerClassDefinition {
  provide: any;
  useClass: Type<any>; // The class to instantiate
  // We do *not* allow 'inject' or 'useFactory' here
  useFactory?: never;
  inject?: never;

  // Optionally specify a custom data provider for this worker
  workerDataProvider?: any;
  apiUrl?: string;
  prismaService?: any;
}

/**
 * A worker that uses a factory provider.
 *
 * - `provide`: the token (e.g. 'BeneficiaryWorker2')
 * - `useFactory`: a function returning the worker instance
 * - `inject`: an array of tokens to inject into `useFactory`
 */
export interface WorkerFactoryDefinition {
  provide: any;
  useFactory: (...args: any[]) => any;
  inject?: any[]; // Valid for factory providers
  // We do *not* allow `useClass` in a factory-based worker
  useClass?: never;

  // Optionally specify a custom data provider for this worker
  workerDataProvider?: any;
  apiUrl?: string;
  prismaService?: any;
}

/**
 * Union type: a worker can EITHER be class-based OR factory-based.
 */
export type WorkerDefinition = WorkerClassDefinition | WorkerFactoryDefinition;
