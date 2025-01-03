import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaService } from 'nestjs-prisma';
import { AuthModule } from './auth/auth.module';
import { AMQP_CONNECTION, queueOptions } from './constants';
import { MailModule } from './mailer/mailer.module';
import { PrismaModule } from './prisma/prisma.module';
import { RabbitMQModule } from './rabbitmq/rabbitmq.module';
import { WorkerModule } from './rabbitmq/worker.module';
import { UsersModule } from './users/users.module';
import { BeneficiaryWorker } from './workers/beneficiary/beneficiary.rabbitmq.worker';
import { RabbitMQController } from './rabbitmq/rabbitmq.controller';

@Module({
  imports: [
    ConfigModule.forRoot(),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('REDIS_HOST'),
          port: +configService.get<number>('REDIS_PORT'),
        },
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    PrismaModule,
    MailModule,
    UsersModule,
    RabbitMQModule.register({
      controllers: [RabbitMQController],
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
})
export class AppModule {}
