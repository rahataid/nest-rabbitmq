import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { MailModule } from './mailer/mailer.module';
import { UsersModule } from './users/users.module';
import { RabbitMQModule } from './rabbitmq/rabbitmq.module';
import { AMQP_CONNECTION, queueOptions } from './constants';
import { WorkerModule } from './rabbitmq/worker.module';
import { BeneficiaryWorker } from './beneficiary.rabbitmq.worker';

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
      workerModuleProvider: WorkerModule.register([
        { provide: 'BeneficiaryWorker1', useClass: BeneficiaryWorker },
        { provide: 'BeneficiaryWorker2', useClass: BeneficiaryWorker },
      ]),
      ampqProviderName: AMQP_CONNECTION,
      urls: ['amqp://guest:guest@localhost'],
      queues: queueOptions,
    }),
  ],
})
export class AppModule {}
