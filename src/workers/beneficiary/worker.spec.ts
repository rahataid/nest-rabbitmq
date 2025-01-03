// src/workers/beneficiary/worker.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { BeneficiaryWorker } from './beneficiary.rabbitmq.worker';
import { QueueUtilsService } from '../../rabbitmq/queue-utils.service';
import { AmqpConnectionManager } from 'amqp-connection-manager';
import { IDataProvider, RabbitMQModuleOptions } from '../../rabbitmq/types';
import { BENEFICIARY_QUEUE } from 'src/constants';
import { API_URL, DATA_PROVIDER } from 'src/rabbitmq/dataproviders/dataprovider.module';

/**
 * ------------------------------------------------------------------
 * Mocks
 * ------------------------------------------------------------------
 */
const mockLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

const mockConnection = {
  createChannel: jest.fn(),
} as unknown as AmqpConnectionManager;

const mockDataProvider: IDataProvider = {
  saveList: jest.fn(),
  getItem: jest.fn(),
  getList: jest.fn(),
  saveItem: jest.fn(),
  // if you have getItem(), etc., they can be mocked as well
};

const mockQueueUtilsService = {
  // Mock any methods if needed
};

const mockQueuesToSetup: RabbitMQModuleOptions['queues'] = [
  {
    name: BENEFICIARY_QUEUE,
    durable: true,
    options: {
      arguments: {
        'x-dead-letter-exchange': 'some-dlx',
      },
    },
  },
];

/**
 * ------------------------------------------------------------------
 * Test Suite
 * ------------------------------------------------------------------
 */
describe('BeneficiaryWorker', () => {
  let worker: BeneficiaryWorker;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock createChannel so it calls our setup callback
    (mockConnection.createChannel as jest.Mock).mockReturnValue({
      json: true,
      setup: async (fn: (channel: unknown) => Promise<void>) => {
        // We simulate a successful channel creation
        await fn({});
      },
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BeneficiaryWorker,
        { provide: Logger, useValue: mockLogger },
        { provide: 'QUEUE_NAMES', useValue: mockQueuesToSetup },
        { provide: 'AMQP_CONNECTION', useValue: mockConnection },
        { provide: QueueUtilsService, useValue: mockQueueUtilsService },
        { provide: DATA_PROVIDER, useValue: mockDataProvider },
        { provide: API_URL, useValue: 'http://localhost:3000' },
      ],
    }).compile();

    worker = module.get<BeneficiaryWorker>(BeneficiaryWorker);

    // Force the worker's logger to the mockLogger for logging checks
    (worker as any).logger = mockLogger;
  });

  /**
   * ------------------------------------------------------------------
   * onModuleInit
   * ------------------------------------------------------------------
   */
  describe('onModuleInit', () => {
    it('should create a channel and call initializeWorker with the channel', async () => {
      const initializeWorkerSpy = jest.spyOn(
        BeneficiaryWorker.prototype as any,
        'initializeWorker',
      );

      await worker.onModuleInit(); // calls createChannel -> calls setup -> calls initializeWorker

      expect(mockConnection.createChannel).toHaveBeenCalledTimes(1);
      expect(initializeWorkerSpy).toHaveBeenCalledTimes(1);

      expect(mockLogger.log).toHaveBeenCalledWith('this.dataProvider', mockDataProvider);
      expect(mockLogger.log).toHaveBeenCalledWith('this.apiUrl', 'http://localhost:3000');
    });

    it('should log an error if initialization fails', async () => {
      (mockConnection.createChannel as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Channel creation failed');
      });

      await worker.onModuleInit();

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error initializing Beneficiary Worker:',
        expect.any(Error),
      );
    });
  });

  /**
   * ------------------------------------------------------------------
   * processItem
   * ------------------------------------------------------------------
   */
  describe('processItem', () => {
    let realSetTimeout: (handler: TimerHandler, timeout?: number) => number;

    beforeEach(() => {
      // Replace real setTimeout with a mock that calls immediately
      realSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn((cb: () => void) => {
        cb();
        // return 0 to satisfy the signature
        return 0 as any;
      });
    });

    afterEach(() => {
      // Restore the real setTimeout
      global.setTimeout = realSetTimeout;
    });

    it('should log and save data via dataProvider on success', async () => {
      (mockDataProvider.saveList as jest.Mock).mockResolvedValueOnce(undefined);

      const sampleBatch = [
        { batchIndex: 0, data: { name: 'John Doe', email: 'john@example.com' } },
        { batchIndex: 0, data: { name: 'Jane Doe', email: 'jane@example.com' } },
      ];

      await worker['processItem'](sampleBatch.map(item => item.data));

      expect(mockLogger.log).toHaveBeenCalledWith('Processing batch: 0 }');
      // Because we mocked setTimeout, we didn't wait a real 10 seconds

      expect(mockDataProvider.saveList).toHaveBeenCalledWith([
        { name: 'John Doe', email: 'john@example.com' },
        { name: 'Jane Doe', email: 'jane@example.com' },
      ]);
      expect(mockLogger.log).toHaveBeenCalledWith(
        'Batch successfully processed and saved to the database.',
      );
    });

    it('should throw an error and log it if something fails', async () => {
      const fakeError = new Error('Database error');
      (mockDataProvider.saveList as jest.Mock).mockRejectedValueOnce(fakeError);

      await expect(
        worker['processItem']([{ name: 'Foo', email: 'foo@example.com' }]),
      ).rejects.toThrow(fakeError);

      expect(mockLogger.error).toHaveBeenCalledWith('Error processing batch:', fakeError);
    });
  });

  /**
   * ------------------------------------------------------------------
   * Edge Cases & Additional Scenarios
   * ------------------------------------------------------------------
   */
  describe('Edge cases & Additional Scenarios', () => {
    it('should handle an empty batch gracefully', async () => {
      await worker['processItem']([]);
      expect(mockDataProvider.saveList).not.toHaveBeenCalled();
    });

    it('should reflect the correct batchSize in the worker (10)', () => {
      // Because we made batchSize public, we can check it
      expect(worker.batchSize).toBe(10);
    });
  });

  /**
   * ------------------------------------------------------------------
   * Performance & Stress Tests
   * ------------------------------------------------------------------
   * Since we've mocked setTimeout, the "10s" delay is instant. If you
   * want real timing, remove that mock or raise test timeouts.
   */
  describe('Performance Tests', () => {
    it('should process a large batch within an acceptable time limit', async () => {
      const largeBatch = Array.from({ length: 1000 }, (_, i) => ({
        name: `User${i}`,
        email: `user${i}@example.com`,
      }));

      (mockDataProvider.saveList as jest.Mock).mockResolvedValueOnce(undefined);

      const startTime = performance.now();
      await worker['processItem'](largeBatch);
      const endTime = performance.now();

      const duration = endTime - startTime;
      console.log(`Large batch processed in ${duration} ms`);

      // If the setTimeout is mocked, this should be very fast
      expect(duration).toBeLessThan(2000);
      expect(mockDataProvider.saveList).toHaveBeenCalled();
    }, 20000); // Increase individual test timeout if you disable the setTimeout mock
  });

  describe('Stress Tests', () => {
    it('should handle multiple large batches concurrently without crashing', async () => {
      const createLargeBatch = (prefix: string) =>
        Array.from({ length: 1000 }, (_, i) => ({
          name: `${prefix}-User${i}`,
          email: `${prefix.toLowerCase()}user${i}@example.com`,
        }));

      const batch1 = createLargeBatch('Batch1');
      const batch2 = createLargeBatch('Batch2');
      const batch3 = createLargeBatch('Batch3');

      (mockDataProvider.saveList as jest.Mock).mockResolvedValue(undefined);

      const startTime = performance.now();
      await Promise.all([
        worker['processItem'](batch1),
        worker['processItem'](batch2),
        worker['processItem'](batch3),
      ]);
      const endTime = performance.now();

      const duration = endTime - startTime;
      console.log(`Concurrent large batches processed in ${duration} ms`);

      expect(duration).toBeLessThan(5000);
      // 3 calls in parallel
      expect(mockDataProvider.saveList).toHaveBeenCalledTimes(3);
    }, 30000); // Increase if you remove the setTimeout mock or need more time
  });
});
