import { Global, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { AmqpConnectionManager, ChannelWrapper } from 'amqp-connection-manager';
import { QueueUtilsService } from './rabbitmq/queue-utils.service';
import { BaseWorker } from './rabbitmq/worker.base';
import { PrismaService } from 'src/prisma/prisma.service';
import { AMQP_CONNECTION, BENEFICIARY_QUEUE } from 'src/constants';
import { Beneficiary } from '@prisma/client';
import * as amqp from 'amqplib';
import { RabbitMQModuleOptions } from './rabbitmq/types';
import { getQueueByName } from './rabbitmq/utils';
//  async onModuleInit(): Promise<void> {
//     this.logger.warn(
//       `BaseWorker initialized but the "${this.queueName}" worker has not been initialized. You should not see this message. Please initialize the worker.`,
//     );
//   }

@Global()
@Injectable()
export class BeneficiaryWorker extends BaseWorker<Beneficiary> {
  private channelWrapper: ChannelWrapper;
  constructor(
    @Inject(AMQP_CONNECTION) private readonly connection: AmqpConnectionManager,
    queueUtilsService: QueueUtilsService,
    private readonly prisma: PrismaService,
    @Inject('QUEUE_NAMES') private readonly queuesToSetup: RabbitMQModuleOptions['queues'],
  ) {
    const queue = getQueueByName(queuesToSetup, BENEFICIARY_QUEUE);
    console.log('queue', queue);
    super(queueUtilsService, BENEFICIARY_QUEUE, 10, 'batch', connection, queue.options.arguments);
  }

  async onModuleInit() {
    try {
      this.channelWrapper = this.connection.createChannel({
        json: true,
        setup: async channel => {
          await this.initializeWorker(channel);
        },
      });
    } catch (err) {
      this.logger.error('Error initializing Beneficiary Worker:', err);
    }
  }

  protected async processItem(batch): Promise<void> {
    const beneficiaries = batch.map(({ data: beneficiary }) => ({
      name: beneficiary.name,
      email: beneficiary.email,
    }));
    this.logger.log(`Processing batch: ${batch.batchIndex} }`);

    try {
      // await this.prisma.$transaction(async tx => {
      //   await tx.beneficiary.createMany({ data: beneficiaries });
      // });

      //Pause a worker for 10 seconds
      await new Promise(resolve => setTimeout(resolve, 1000));

      this.logger.log('Batch successfully processed and saved to the database.');
    } catch (error) {
      this.logger.error('Error processing batch:', error);
      throw error; // Requeue if necessary
    }
  }
}
