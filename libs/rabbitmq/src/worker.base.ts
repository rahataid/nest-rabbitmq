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

  // Channels
  private channel: ConfirmChannel;
  private dlqChannel: ConfirmChannel | undefined;

  // Worker ID Tracking
  private static workerCount = 0;
  private readonly workerId: number;
  private readonly queueName: string;

  // Batching logic
  private batchFlushTimer: NodeJS.Timeout | null = null;
  private readonly FLUSH_INTERVAL_MS = 5000; // 5 seconds
  private readonly defaultBatchSize: number; // e.g., 10
  private readonly acknowledgeMode: 'individual' | 'batch';

  // AMQP and Queue arguments
  /**
   * IMPORTANT: We are no longer automatically closing `amqpConnection` unless we truly
   * want to shut down the entire application. That way, the worker can stay alive.
   */
  private readonly amqpConnection: any;
  private readonly queueArguments: RabbitMQModuleOptions['queues'][0]['options']['arguments'];

  constructor(
    protected readonly queueUtilsService: QueueUtilsService,
    queueName: string,
    defaultBatchSize = 10,
    acknowledgeMode: 'individual' | 'batch' = 'individual',
    amqpConnection?: any,
    queueArguments: RabbitMQModuleOptions['queues'][0]['options']['arguments'] = {}
  ) {
    this.queueName = queueName;
    this.defaultBatchSize = defaultBatchSize;
    this.acknowledgeMode = acknowledgeMode;
    this.amqpConnection = amqpConnection;
    this.queueArguments = queueArguments;

    BaseWorker.workerCount++;
    this.workerId = BaseWorker.workerCount;

    this.logger.log(
      `${this.queueName} - Worker instance created. Worker ID: ${this.workerId}. Total workers: ${BaseWorker.workerCount}`
    );
  }

  /**
   * Call this method once you have a ConfirmChannel ready (e.g., after connection).
   */
  async initializeWorker(channel: ConfirmChannel): Promise<void> {
    this.channel = channel;

    // Setup event listeners on the channel
    this.channel.on('close', async () => {
      this.logger.warn(
        `${this.queueName} - Worker ID: ${this.workerId} - Channel closed. Consider reinitializing if needed.`
      );
      // Optional: you could reinitialize here if you want the worker to reconnect automatically.
    });

    this.channel.on('error', (error) => {
      this.logger.error(
        `${this.queueName} - Worker ID: ${this.workerId} - Channel error:`,
        error
      );
    });

    try {
      // Set an optimal prefetch count
      const prefetchCount = this.calculateOptimalPrefetch();
      this.logger.log(
        `${this.queueName} - Worker ID: ${this.workerId} - Setting prefetch count to ${prefetchCount}`
      );
      await this.channel.prefetch(prefetchCount);

      // Ensure queue arguments match or assert a new queue if needed
      const queueArgsMatch = await this.ensureQueueArguments();
      if (!queueArgsMatch) {
        this.logger.error(
          `${this.queueName} - Worker ID: ${this.workerId} - Queue arguments conflict detected. Worker not consuming.`
        );
        return;
      }
      this.logger.log(
        `${this.queueName} - Worker ID: ${this.workerId} - Queue is ready.`
      );

      // Initialize a separate channel for the DLQ (if needed)
      this.dlqChannel = await this.amqpConnection.createChannel();
      await this.dlqChannel.assertQueue('dead_letter_queue', { durable: true });

      // Shared in-memory batch array
      let batch: BatchItem<T>[] = [];

      // Start consuming messages
      await this.channel.consume(this.queueName, async (message) => {
        if (!message) {
          return;
        }

        const content: T = JSON.parse(message.content.toString());
        batch.push({ data: content, message });

        this.logger.log(
          `${this.queueName} - Worker ID: ${
            this.workerId
          } - Received message: ${JSON.stringify(content).slice(0, 100)}...`
        );

        // If we're in 'individual' mode, process each message immediately,
        // OR if we've reached the batch size, process now.
        if (
          this.acknowledgeMode === 'individual' ||
          batch.length >= this.defaultBatchSize
        ) {
          const currentBatch = [...batch];
          batch = []; // Clear the batch array
          this.logger.log(
            `${this.queueName} - Worker ID: ${this.workerId} - Processing batch of size: ${currentBatch.length}.`
          );
          await this.processBatch(currentBatch);
        }
      });

      // If in 'batch' mode, we rely on a flush timer to handle partial batches
      if (this.acknowledgeMode === 'batch') {
        this.batchFlushTimer = setInterval(async () => {
          if (batch.length > 0) {
            const currentBatch = [...batch];
            batch = []; // Clear the batch
            this.logger.log(
              `${this.queueName} - Worker ID: ${this.workerId} - Timer flush: processing partial batch of size ${currentBatch.length}.`
            );
            await this.processBatch(currentBatch);
          }
        }, this.FLUSH_INTERVAL_MS);
      }

      this.logger.log(
        `${this.queueName} - Worker ID: ${this.workerId} - Worker initialized.`
      );
    } catch (error) {
      this.logger.error(
        `${this.queueName} - Worker ID: ${this.workerId} - Error initializing worker:`,
        error
      );
    }
  }

  /**
   * Calculates an optimal prefetch. Customize as you see fit.
   */
  private calculateOptimalPrefetch(): number {
    const fallback = 20;
    const prefetch = Math.max(
      10,
      Math.floor(Number(process.env['MAX_PREFETCH']) || fallback)
    );
    this.logger.log(`Optimal prefetch count calculated: ${prefetch}`);
    return prefetch;
  }

  /**
   * Ensures the queue arguments match what's provided, or asserts a new queue if missing.
   */
  private async ensureQueueArguments(): Promise<boolean> {
    try {
      const existingArgs = this.queueArguments;

      if (
        JSON.stringify(existingArgs) !== JSON.stringify(this.queueArguments)
      ) {
        this.logger.error(
          `${this.queueName} - Worker ID: ${
            this.workerId
          } - Queue arguments conflict: Existing=${JSON.stringify(
            existingArgs
          )}, Provided=${JSON.stringify(this.queueArguments)}`
        );
        if (process.env['FORCE_QUEUE_RESET'] === 'true') {
          this.logger.warn(
            `${this.queueName} - Worker ID: ${this.workerId} - Force resetting queue due to argument mismatch.`
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
        `${this.queueName} - Worker ID: ${this.workerId} - Queue exists with matching arguments.`
      );
      return true;
    } catch (error: any) {
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

  /**
   * Processes the entire batch. Each message item gets its own retry logic.
   */
  private async processBatch(batch: BatchItem<T>[]): Promise<void> {
    for (const item of batch) {
      let retryCount = 0;
      const maxRetries = 3;
      let success = false;

      while (retryCount < maxRetries) {
        try {
          // Concrete class implements the actual data logic
          await this.processItem([item.data]);

          this.channel.ack(item.message);
          this.logger.log(
            `${this.queueName} - Worker ID: ${this.workerId} - Message processed and acknowledged.`
          );
          success = true;
          break;
        } catch (error) {
          retryCount++;
          this.logger.error(
            `${this.queueName} - Worker ID: ${this.workerId} - Error processing message. Retrying... (Attempt ${retryCount}/${maxRetries})`,
            error
          );

          if (retryCount >= maxRetries) {
            this.logger.error(
              `${this.queueName} - Worker ID: ${this.workerId} - Max retries reached. Moving message to DLQ.`
            );
            try {
              await this.publishToDLQ(item);
              this.channel.ack(item.message); // Avoid reprocessing
            } catch (dlqError) {
              this.logger.error(
                `${this.queueName} - Worker ID: ${this.workerId} - Failed to publish to DLQ. Message remains unacknowledged.`,
                dlqError
              );
            }
          } else {
            // Exponential backoff
            const backoffMs = Math.pow(2, retryCount) * 1000;
            this.logger.warn(
              `${this.queueName} - Worker ID: ${this.workerId} - Waiting ${backoffMs} ms before retry.`
            );
            await new Promise((resolve) => setTimeout(resolve, backoffMs));
          }
        }
      }

      if (!success && retryCount >= maxRetries) {
        this.logger.warn(
          `${this.queueName} - Worker ID: ${this.workerId} - Message permanently failed after retries.`
        );
      }
    }
  }

  /**
   * Publishes a failed item to a DLQ (dead_letter_queue).
   */
  private async publishToDLQ(item: BatchItem<T>) {
    if (!this.dlqChannel) {
      this.logger.error(
        `${this.queueName} - Worker ID: ${this.workerId} - DLQ channel is not set. Cannot publish to DLQ.`
      );
      throw new Error('DLQ channel is not available.');
    }
    try {
      this.dlqChannel.sendToQueue(
        'dead_letter_queue',
        Buffer.from(JSON.stringify(item.data))
      );
      this.logger.log(
        `${this.queueName} - Worker ID: ${this.workerId} - Message published to DLQ.`
      );
    } catch (error) {
      this.logger.error(
        `${this.queueName} - Worker ID: ${this.workerId} - Failed to publish to DLQ:`,
        error
      );
      throw error;
    }
  }

  /**
   * Concrete classes must implement this to perform actual business logic.
   */
  protected abstract processItem(items: T[]): Promise<void>;

  /**
   * Lifecycle hook to clean up. Called when the NestJS module is destroyed.
   * We ONLY close channels here, not the entire connection, to keep the app alive.
   */
  onModuleDestroy() {
    BaseWorker.workerCount--;
    this.logger.warn(
      `${this.queueName} - Worker ID: ${this.workerId} shutting down. Remaining workers: ${BaseWorker.workerCount}`
    );

    // Clear flush timer if we have one
    if (this.batchFlushTimer) {
      clearInterval(this.batchFlushTimer);
      this.batchFlushTimer = null;
      this.logger.log(`Batch flush timer for worker ${this.workerId} cleared.`);
    }

    // Close the channels if the app truly shuts down
    if (this.channel) {
      this.channel.close();
      this.logger.log(`Channel for worker ${this.workerId} closed.`);
    }

    if (this.dlqChannel) {
      this.dlqChannel.close();
      this.logger.log(`DLQ channel for worker ${this.workerId} closed.`);
    }

    /**
     * COMMENTED OUT or REMOVED:
     * We do NOT close the amqpConnection here,
     * because that would kill the connection for all workers or re-publishers.
     */
    // if (this.amqpConnection) {
    //   this.amqpConnection.close();
    //   this.logger.log(`Connection for worker ${this.workerId} closed.`);
    // }
  }
}
