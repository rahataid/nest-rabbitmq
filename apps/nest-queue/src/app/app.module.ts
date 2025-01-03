import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RabbitMQModule, WorkerModule } from '@rumsan/nest-rabbitmq';
import { BeneficiaryWorker } from '../workers/beneficiary/beneficiary.rabbitmq.worker';
import { AMQP_CONNECTION } from '../constants';
import { queueOptions } from '../constants';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [
    RabbitMQModule.register({
      // providers: [
      //   {
      //     provide: ProjectContants.ELClient,
      //     useValue: ClientProxyFactory.create({ transport: Transport.TCP }),
      //   },
      // ],
      workerModuleProvider: WorkerModule.register({
        globalDataProvider: {
          prismaService: PrismaService,
        },
        workers: [
          {
            provide: 'BeneficiaryWorker1',
            useClass: BeneficiaryWorker,
          },
          {
            provide: 'BeneficiaryWorker2',
            useClass: BeneficiaryWorker,
          },
          {
            provide: 'BeneficiaryWorker3',
            useClass: BeneficiaryWorker,
          },
        ],
      }),
      ampqProviderName: AMQP_CONNECTION,
      urls: [process.env.RABBIT_MQ_URL],
      queues: queueOptions,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
