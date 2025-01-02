import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfirmChannel } from 'amqplib';
import { QueueUtilsService } from './queue-utils.service';
import { RabbitMQModuleOptions } from './types';

export interface BatchItem<T> {
  data: T;
  message: any;
}

@Injectable()
export abstract class BaseWorker<T> implements OnModuleDestroy {
  protected readonly logger = new Logger(this.constructor.name);
  private channel: ConfirmChannel;
  private dlqChannel: ConfirmChannel; // Separate DLQ channel for failed messages
  private static workerCount = 0;
  private readonly workerId: number;
  private readonly queueName: string;

  constructor(
    protected readonly queueUtilsService: QueueUtilsService,
    queueName: string,
    private readonly defaultBatchSize = 10,
    private readonly acknowledgeMode: 'individual' | 'batch' = 'individual',
    private readonly amqpConnection: any,
    private readonly queueArguments: RabbitMQModuleOptions['queues'][0]['options']['arguments'] = {},
  ) {
    this.queueName = queueName;
    BaseWorker.workerCount++;
    this.workerId = BaseWorker.workerCount;
    this.logger.log(
      `${this.queueName} - Worker instance created. Worker ID: ${this.workerId}. Total workers: ${BaseWorker.workerCount}`,
    );
  }

  async initializeWorker(channel: ConfirmChannel): Promise<void> {
    this.channel = channel;

    this.channel.on('close', async () => {
      this.logger.warn(
        `${this.queueName} - Worker ID: ${this.workerId} - Channel closed. Reinitializing...`,
      );
    });

    this.channel.on('error', error => {
      this.logger.error(`${this.queueName} - Worker ID: ${this.workerId} - Channel error:`, error);
    });

    try {
      const prefetchCount = this.calculateOptimalPrefetch();
      this.logger.log(
        `${this.queueName} - Worker ID: ${this.workerId} - Setting prefetch count to ${prefetchCount}`,
      );
      await this.channel.prefetch(prefetchCount);

      const queueArgsMatch = await this.ensureQueueArguments();

      if (!queueArgsMatch) {
        this.logger.error(
          `${this.queueName} - Worker ID: ${this.workerId} - Queue arguments conflict detected.`,
        );
        return;
      }

      this.logger.log(`${this.queueName} - Worker ID: ${this.workerId} - Queue is ready.`);

      // Initialize a separate channel for the DLQ
      this.dlqChannel = await this.amqpConnection.createChannel();
      await this.dlqChannel.assertQueue('dead_letter_queue', { durable: true });

      let batch: BatchItem<T>[] = [];

      await this.channel.consume(this.queueName, async message => {
        if (message) {
          const content = JSON.parse(message.content.toString());
          batch.push({ data: content, message });

          this.logger.log(
            `${this.queueName} - Worker ID: ${this.workerId} - Received message: ${JSON.stringify(
              content,
            ).slice(0, 100)}...`,
          );

          if (batch.length >= this.defaultBatchSize || this.acknowledgeMode === 'individual') {
            const currentBatch = [...batch];
            batch = [];
            this.logger.log(
              `${this.queueName} - Worker ID: ${this.workerId} - Processing batch of size: ${currentBatch.length}.`,
            );
            await this.processBatch(currentBatch);
          }
        }
      });

      this.logger.log(`${this.queueName} - Worker ID: ${this.workerId} - Worker initialized.`);
    } catch (error) {
      this.logger.error(
        `${this.queueName} - Worker ID: ${this.workerId} - Error initializing worker:`,
        error,
      );
    }
  }

  private calculateOptimalPrefetch(): number {
    const prefetch = Math.max(10, Math.floor(Number(process.env.MAX_PREFETCH) || 20));
    this.logger.log(`Optimal prefetch count calculated: ${prefetch}`);
    return prefetch;
  }

  private async ensureQueueArguments(): Promise<boolean> {
    try {
      const existingArgs = this.queueArguments;

      if (JSON.stringify(existingArgs) !== JSON.stringify(this.queueArguments)) {
        this.logger.error(
          `${this.queueName} - Worker ID: ${
            this.workerId
          } - Queue arguments conflict: Existing=${JSON.stringify(
            existingArgs,
          )}, Provided=${JSON.stringify(this.queueArguments)}`,
        );

        if (process.env.FORCE_QUEUE_RESET === 'true') {
          this.logger.warn(
            `${this.queueName} - Worker ID: ${this.workerId} - Force resetting queue.`,
          );
          await this.channel.deleteQueue(this.queueName);
          await this.channel.assertQueue(this.queueName, {
            durable: true,
            arguments: this.queueArguments,
          });
          return true;
        }

        return false;
      }

      this.logger.log(
        `${this.queueName} - Worker ID: ${this.workerId} - Queue exists with matching arguments.`,
      );
      return true;
    } catch (error) {
      if (error.message.includes('NOT_FOUND')) {
        await this.channel.assertQueue(this.queueName, {
          durable: true,
          arguments: this.queueArguments,
        });
        return true;
      }
      throw error;
    }
  }

  private async processBatch(batch: BatchItem<T>[]): Promise<void> {
    for (const item of batch) {
      let retryCount = 0;
      const maxRetries = 3;
      let success = false;

      while (retryCount < maxRetries) {
        try {
          await this.processItem([item.data]);
          this.channel.ack(item.message); // Acknowledge successful processing
          this.logger.log(
            `${this.queueName} - Worker ID: ${this.workerId} - Message processed and acknowledged.`,
          );
          success = true;
          break; // Exit the retry loop on success
        } catch (error) {
          retryCount++;
          this.logger.error(
            `${this.queueName} - Worker ID: ${this.workerId} - Error processing message. Retrying... (Attempt ${retryCount}/${maxRetries})`,
            error,
          );

          if (retryCount >= maxRetries) {
            this.logger.error(
              `${this.queueName} - Worker ID: ${this.workerId} - Max retries reached. Moving message to DLQ.`,
            );
            try {
              await this.publishToDLQ(item); // Attempt to publish to DLQ
              this.channel.ack(item.message); // Acknowledge to avoid re-processing
            } catch (dlqError) {
              this.logger.error(
                `${this.queueName} - Worker ID: ${this.workerId} - Failed to publish to DLQ. Message will remain unacknowledged.`,
                dlqError,
              );
            }
          } else {
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
          }
        }
      }

      if (!success && retryCount >= maxRetries) {
        this.logger.warn(
          `${this.queueName} - Worker ID: ${this.workerId} - Message failed after retries and DLQ attempt.`,
        );
      }
    }
  }

  private async publishToDLQ(item: BatchItem<T>) {
    try {
      await this.dlqChannel.sendToQueue(
        'dead_letter_queue',
        Buffer.from(JSON.stringify(item.data)),
      );
      this.logger.log(
        `${this.queueName} - Worker ID: ${this.workerId} - Message published to DLQ.`,
      );
    } catch (error) {
      this.logger.error(
        `${this.queueName} - Worker ID: ${this.workerId} - Failed to publish to DLQ:`,
        error,
      );
      throw error;
    }
  }

  protected abstract processItem(items: T | T[]): Promise<void>;

  onModuleDestroy() {
    BaseWorker.workerCount--;
    this.logger.warn(
      `${this.queueName} - Worker ID: ${this.workerId} shutting down. Remaining workers: ${BaseWorker.workerCount}`,
    );

    if (this.channel) {
      this.channel.close();
      this.logger.log(`Channel for worker ${this.workerId} closed.`);
    }

    if (this.dlqChannel) {
      this.dlqChannel.close();
      this.logger.log(`DLQ channel for worker ${this.workerId} closed.`);
    }

    if (this.amqpConnection) {
      this.amqpConnection.close();
      this.logger.log(`Connection for worker ${this.workerId} closed.`);
    }
  }
}
