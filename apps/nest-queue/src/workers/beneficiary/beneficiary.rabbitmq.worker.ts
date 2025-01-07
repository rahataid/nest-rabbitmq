import { Global, Inject, Injectable } from '@nestjs/common';
import { Beneficiary } from '@prisma/client';
import {
  API_URL,
  BaseWorker,
  getQueueByName,
  PRISMA_SERVICE,
  QueueUtilsService,
  RabbitMQModuleOptions,
} from '@rumsan/nest-rabbitmq';
import { AmqpConnectionManager, ChannelWrapper } from 'amqp-connection-manager';
import { AMQP_CONNECTION, BENEFICIARY_QUEUE } from '../../constants';
import { PrismaService } from '../../prisma/prisma.service';
@Global()
@Injectable()
export class BeneficiaryWorker extends BaseWorker<Beneficiary> {
  private channelWrapper: ChannelWrapper;
  constructor(
    @Inject(AMQP_CONNECTION) private readonly connection: AmqpConnectionManager,
    queueUtilsService: QueueUtilsService,
    // private readonly prisma:PrismaService,
    // @Inject(DATA_PROVIDER) private readonly dataProvider: IDataProvider,
    @Inject(PRISMA_SERVICE) private readonly prisma: PrismaService,
    @Inject('QUEUE_NAMES')
    private readonly queuesToSetup: RabbitMQModuleOptions['queues'],
    @Inject(API_URL) private readonly apiUrl: string
  ) {
    const queue = getQueueByName(queuesToSetup, BENEFICIARY_QUEUE);
    super(
      queueUtilsService,
      BENEFICIARY_QUEUE,
      10,
      'batch',
      connection,
      queue.options.arguments
    );
  }

  async onModuleInit() {
    try {
      this.channelWrapper = this.connection.createChannel({
        json: true,
        setup: async (channel) => {
          await this.initializeWorker(channel);
          // console.log('this.data', this.dataProvider);
          console.log('this.apiUrl', this.apiUrl);
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
    this.logger.log(`Processing batch: ${batch} }`);

    try {
      // await this.prisma.$transaction(async tx => {
      //   await tx.beneficiary.createMany({ data: beneficiaries });
      // });

      //Pause a worker for 10 seconds
      // await new Promise((resolve) => setTimeout(resolve, 1000));
      await this.prisma.beneficiary.createMany({ data: beneficiaries });

      // console.log('this.dataProvider', this.dataProvider);
      // await this.dataProvider.saveList(beneficiaries);

      this.logger.log(
        'Batch successfully processed and saved to the database.'
      );
    } catch (error) {
      this.logger.error('Error processing batch:', error);
      throw error; // Requeue if necessary
    }
  }
}
