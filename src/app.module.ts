import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { AMQP_CONNECTION, queueOptions } from './constants';
import { MailModule } from './mailer/mailer.module';
import { PrismaModule } from './prisma/prisma.module';
import { RabbitMQModule } from './rabbitmq/rabbitmq.module';
import { WorkerModule } from './rabbitmq/worker.module';
import { UsersModule } from './users/users.module';
import { BeneficiaryWorker } from './workers/beneficiary/beneficiary.rabbitmq.worker';
import { BeneficiaryApiProvider } from './workers/beneficiary/beneficiary.api.provider';
import { PrismaService } from 'nestjs-prisma';
import { BeneficiaryPrismaProvider } from './workers/beneficiary/beneficiary.prisma.provider';

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
      workerModuleProvider: WorkerModule.register({
        globalDataProvider: {
          apiUrl: 'http://localhost:3333',
          prismaService: PrismaService,
          dataProvider: BeneficiaryPrismaProvider, // Global data provider
        },
        workers: [
          {
            provide: 'BeneficiaryWorker1',
            // apiUrl: 'http://localhost:3333',

            useClass: BeneficiaryWorker,
            // workerDataProvider: BeneficiaryApiProvider, // Passing
            // ApiProvider to the worker
          },
          {
            provide: 'BeneficiaryWorker2',
            useClass: BeneficiaryWorker,
            // workerDataProvider: BeneficiaryPrismaProvider, // Passing PrismaProvider to the worker
            // prismaService: PrismaService,
          },
        ],
      }),
      ampqProviderName: AMQP_CONNECTION,
      urls: ['amqp://guest:guest@localhost'],
      queues: queueOptions,
    }),
  ],
})
export class AppModule {}
