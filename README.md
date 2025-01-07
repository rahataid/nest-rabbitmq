# A Custom NestJS + RabbitMQ Module for Flexible Worker-Based Processing

## 1. Introduction

**RabbitMQ** is a powerful message broker commonly used to decouple and scale microservices. While NestJS has several RabbitMQ libraries, some advanced use-cases (like **partial-batch message consumption**, **dynamic data providers**, or **per-worker injection**) can be tricky to implement with off-the-shelf solutions.

In this post, we’ll explore a **custom NestJS RabbitMQ module** and worker setup that handle advanced needs:

- **Batch-based** or **individual** message processing
- **Dynamic module** registration of workers and their data providers
- Automatic **DLQ (Dead Letter Queue)** handling for failed messages
- Partial-batch **timer-based flush** for leftover items in the queue

We’ll walk through the architecture, installation, usage, and how it compares to existing libraries.

---

## 2. Why We Built a Custom RabbitMQ Solution

Typical RabbitMQ libraries for NestJS (e.g., `@golevelup/nestjs-rabbitmq`) can handle most pub/sub needs, but we had extra requirements:

1. **Worker Scalability**  
   We wanted multiple “workers” with **batch** message processing, partial flush intervals, retries, and automatic DLQ for failed messages.

2. **Per-Worker Injection**  
   Each worker might need different data providers (e.g., a **Prisma**-based provider or an **API**-based provider). We needed **dynamic modules** to handle tokens like `PRISMA_SERVICE` or `API_URL`.

3. **Advanced Queue Configuration**  
   We wanted to keep control over **queue assertions** (max length, TTL, etc.) while still letting each worker do its own advanced logic (like partial-batch flush).

Rather than hack an existing library, we decided to build from scratch using **NestJS dynamic modules** and the **`amqp-connection-manager`** library for stability.

---

## 3. High-Level Architecture

Here’s an overview of how everything fits together:

1. **AppModule**

   - Imports the custom `RabbitMQModule` (which sets up RabbitMQ connections and queues).
   - Optionally passes a “worker module” for advanced worker definitions.

2. **RabbitMQModule**

   - Creates a globally available AMQP connection via `amqp-connection-manager`.
   - Declares queue definitions (e.g., `BENEFICIARY_QUEUE`).

3. **WorkerModule**

   - Dynamically registers **workers** (e.g., `BeneficiaryWorker1`, `BeneficiaryWorker2`) plus any needed data providers (`PRISMA_SERVICE`, `API_URL`).
   - Each worker can have a separate or shared data provider.

4. **BaseWorker**

   - An abstract class each worker extends.
   - Handles batch consumption, requeues, timed partial flush, DLQ publishing, and other advanced logic.

5. **DataProviderModule**

   - A separate dynamic module that can provide tokens like `PRISMA_SERVICE` or `DATA_PROVIDER`.
   - Each worker can inject these tokens.

6. **BeneficiaryWorker** (an example worker)
   - Extends `BaseWorker`.
   - Overwrites `processItem(...)` to handle logic for each message or batch from `BENEFICIARY_QUEUE`.

Below is a simple flow:

```
AppModule
 └─> RabbitMQModule.register(...)  // sets up AMQP_CONNECTION & queues
      └─> WorkerModule.register(...)
           └─> DataProviderModule (per worker or global)
 └─> Workers (BeneficiaryWorker, etc.) each consume messages & process them
```

---

## 4. Key Features

### 4.1 Dynamic Modules for Workers

Using **NestJS dynamic modules**, we can create submodules for each worker. For instance:

```ts
WorkerModule.register({
  globalDataProvider: {
    prismaService: PrismaService, // provide PRISMA_SERVICE globally
  },
  workers: [
    {
      provide: 'BeneficiaryWorker1',
      useClass: BeneficiaryWorker,
      // optionally override dataProvider, apiUrl, etc.
    },
  ],
});
```

### 4.2 Partial-Batch Message Handling

- **`BaseWorker`** collects messages in an array (`batch`) until either:
  1. The **batch** hits a certain size (`defaultBatchSize`), or
  2. We’re in **individual** mode (ack each message immediately), or
  3. A **timer** flushes partial batches every X seconds if `acknowledgeMode === 'batch'`.

### 4.3 Automatic DLQ (Dead Letter Queue)

- After up to 3 retries, if a message fails processing, it’s published to `dead_letter_queue`.

### 4.4 Data Provider Injection

- We can inject `PRISMA_SERVICE` for DB-based logic or `API_URL` for an HTTP-based provider.
- This per-worker approach is especially helpful for multi-tenant or multi-service setups.

### 4.5 Worker Reusability

- We can define multiple workers (e.g., `'BeneficiaryWorker1'`, `'BeneficiaryWorker2'`) each pointing to the same or different queue definitions.
- The logic that is in `BaseWorker` can be extended in each worker class, making code DRY and consistent.

---

## 5. Installation and Setup

Assume we publish this code as an npm package (e.g., `@your-org/nest-rabbitmq`). Then:

```bash
npm install @your-org/nest-rabbitmq
```

In your **`.env`** or environment, set:

```
RABBIT_MQ_URL=amqp://guest:guest@localhost
```

### 5.1 Minimal `AppModule` Example

```ts
// app.module.ts

@Module({
  imports: [
    RabbitMQModule.register({
      urls: [process.env.RABBIT_MQ_URL],
      ampqProviderName: 'AMQP_CONNECTION',
      queues: [{ name: 'BENEFICIARY_QUEUE', durable: true }],
      workerModuleProvider: WorkerModule.register({
        globalDataProvider: {
          prismaService: PrismaService, // share Prisma across workers
        },
        workers: [
          {
            provide: 'BeneficiaryWorker1',
            useClass: BeneficiaryWorker,
          },
        ],
      }),
    }),
  ],
})
export class AppModule {}
```

### 5.2 Example Worker: `BeneficiaryWorker`

```ts
// beneficiary.rabbitmq.worker.ts

@Injectable()
export class BeneficiaryWorker extends BaseWorker<any> {
  constructor(queueUtilsService: QueueUtilsService, @Inject('AMQP_CONNECTION') amqpConnection: any) {
    // passing 'BENEFICIARY_QUEUE', defaultBatchSize = 10, mode='batch'
    super(queueUtilsService, 'BENEFICIARY_QUEUE', 10, 'batch', amqpConnection);
  }

  protected async processItem(items: any[]) {
    // Custom logic per item/batch
    for (const item of items) {
      console.log('Processing beneficiary item:', item);
      // e.g. call Prisma or an API-based data provider
      // ...
    }
  }
}
```

---

## 6. Usage & Examples

### 6.1 Publishing Messages

Use the **`RabbitMQService`** to push messages:

```ts
// in some service or controller
constructor(private readonly rabbitMQService: RabbitMQService) {}

async createBeneficiary(beneficiary: any) {
  await this.rabbitMQService.publishToQueue('BENEFICIARY_QUEUE', beneficiary);
  console.log('Beneficiary data pushed to queue');
}
```

### 6.2 Automatic Setup of Queues

Because you passed the queue definitions to `RabbitMQModule`:

```ts
{
  name: 'BENEFICIARY_QUEUE',
  durable: true,
  options: {
    // optional queue arguments
  },
}
```

The `RabbitMQService` automatically does `channel.assertQueue(...)` for each queue on startup.

### 6.3 Data Providers

If you want an **API**-based provider, e.g.:

```ts
@Global()
@Injectable()
export class BeneficiaryApiProvider implements IDataProvider {
  constructor(@Inject('API_URL') private readonly apiUrl: string) {
    // create axios instance, etc.
  }
  // ...
}
```

Just pass it via `DataProviderModule.register()` or in the `WorkerModule`. Then in your worker, you can `@Inject(DATA_PROVIDER)` to get the instance.

---

## 7. Advanced Topics

1. **Timer-Based Partial Flush**  
   If you’re in `'batch'` mode, `BaseWorker` sets a flush timer. If the queue has < `defaultBatchSize` items for a while, it’ll still process them after the timer triggers.

2. **Retries and DLQ**  
   Each message can retry up to 3 times. On final failure, it’s published to `'dead_letter_queue'` by default. You can override `publishToDLQ(...)` in your worker if you want to route it differently.

3. **Multiple Workers with Different Data Providers**
   - Worker1 might have `BeneficiaryPrismaProvider`, Worker2 might have `BeneficiaryApiProvider`.
   - `WorkerModule.register(...)` can pass a different `workerDataProvider` or `prismaService` for each.

---

## 8. Comparisons with Existing NestJS RabbitMQ Modules

**When This Custom Approach Is Better:**

- **Complex Per-Worker Logic**: If you need partial-batch flush, re-tries, DLQ logic baked into the worker, the built-in `BaseWorker` pattern is flexible.
- **Multiple Data Providers**: You can dynamically inject `API_URL` or `PRISMA_SERVICE` in different combos.
- **Advanced** Multi-Module Setup: The “data provider module” approach ensures each worker can have unique config.

**When Existing Libraries Are Simpler**:

- If you only need a straightforward approach to consumer/producer logic and don’t require partial-batch or advanced injection, existing libraries like `@golevelup/nestjs-rabbitmq` might be faster to set up.
- If you want a decorator-based approach (like `@RabbitSubscribe()`), you might prefer a library that hides more of the details.

---

## 9. Conclusion & Next Steps

In this post, we demonstrated a **custom NestJS + RabbitMQ** architecture that solves advanced worker-related use cases:

## **Advanced Worker-Related To-Do List**

1. **Partial-Batch Logic**

   - [ ] Implement a timer-based flush for leftover messages.
   - [ ] Expose a config option `acknowledgeMode` (`'individual' | 'batch'`) in your worker constructor.
   - [ ] Add logic to track accumulated messages (`batch[]`) until either:
     - the batch is full (`>= defaultBatchSize`), or
     - the timer triggers (for partial flush).
   - [ ] Provide a method (`flushBatch()`) to easily force a batch flush programmatically, if needed.

2. **Dynamic Worker Injection**

   - [ ] In your `WorkerModule.register()`, allow each worker to specify a `dataProvider` or tokens like `PRISMA_SERVICE`, `API_URL`.
   - [ ] For each worker:
     - If `workerDataProvider` is given, build a new `DataProviderModule` instance.
     - Otherwise, fallback to a global or default data provider.
   - [ ] Ensure the worker can `@Inject(DATA_PROVIDER)` or `@Inject(PRISMA_SERVICE)` in its constructor if requested.

3. **Multiple Retries & DLQ**

   - [ ] Decide on a max retry count (e.g., 3).
   - [ ] In your `processBatch()`, handle per-message retry logic:
     - [ ] If a message fails, increment `retryCount`.
     - [ ] If `retryCount >= maxRetries`, route the message to `dead_letter_queue`.
   - [ ] Provide a method `publishToDLQ()` that your worker can override for custom DLQ routing.
   - [ ] Log warnings when messages reach final failures.

4. **Concurrency & Prefetch**

   - [ ] In the base worker (`BaseWorker`), expose a config for `prefetchCount`.
   - [ ] In `initializeWorker()`, call `channel.prefetch(prefetchCount)`.
   - [ ] Consider letting each worker set its own concurrency or share a global concurrency policy.

5. **Timed Flush & Exponential Backoff**

   - [ ] For partial-batch flush, define a `batchFlushInterval` in your worker (default 5 seconds).
   - [ ] If an item fails, implement exponential backoff (e.g., wait `2^attempt * 1000` ms) before retrying or acknowledging failure.

6. **Configurable Requeue vs. DLQ**

   - [ ] Let the worker decide whether to immediately requeue or to do a slow requeue (with a delay).
   - [ ] Provide a helper function for scheduling a delayed requeue, if desired.

7. **Per-Worker Logging & Monitoring**

   - [ ] Add logs that include the worker name/ID, batch sizes, flush intervals, etc.
   - [ ] Optionally expose a metrics interface (e.g., to track messages processed, failures, DLQ counts) for each worker.

8. **Graceful Shutdown**

   - [ ] In `onModuleDestroy()`, stop the flush timer (`clearInterval`) if in batch mode.
   - [ ] Wait for in-progress batches to finish before shutting down.
   - [ ] Close channels & the AMQP connection after all items are processed or after a configurable grace period.

9. **Customizable Worker**

   - [ ] Provide an abstract `processItem(items: T | T[])` method that the user **must** override to handle actual domain logic.
   - [ ] Consider hooks like `beforeBatch(items: T[])`, `afterBatch(items: T[])` to allow advanced customization (e.g., stats or logs).

10. **Advanced Data Providers**

- [ ] Support injection tokens for multiple providers (Prisma vs. HTTP API).
- [ ] Provide a fallback or default data provider if none is specified.
- [ ] Document how to create a custom provider class that implements `IDataProvider` or a similar interface.

11. **Documentation & Examples**

- [ ] Document each advanced feature (partial-batch flush, timed flush, dynamic injection, etc.) in the README or docs.
- [ ] Create a small example repo showing:
  - A queue definition
  - A custom worker with partial-batch logic
  - Prisma or API-based data providers.

12. **Testing & CI**

- [ ] Write unit tests for partial-batch logic (simulate fewer items than `defaultBatchSize` & flush on timer).
- [ ] Test DLQ logic by forcing message failures.
- [ ] Ensure concurrency (prefetch) tests handle multiple messages in parallel.
- [ ] Optionally run integration tests with a local RabbitMQ container (e.g., Docker) in CI.

13. **Versioning & Maintenance**

- [ ] Use semantic versioning to manage changes in worker logic or data provider injection.
- [ ] Provide a CHANGELOG with each release if you publish as an open-source library.
- [ ] Keep the code modular so advanced worker logic is separated from the basic core module.

---

## **Conclusion**

Completing the tasks in this **to-do list** will enable **advanced worker-related use cases** such as:

- **Partial-batch** or **individual** acknowledgment
- **Retry** attempts with **exponential backoff** and **DLQ** fallback
- **Concurrency** control with **prefetch** settings
- **Dynamic injection** of multiple data providers
- **Timed flush** for leftover batch items

### Where to Go from Here

- **Try It**: Check out the [GitHub Repository](https://github.com/argahv/nest-rabbitmq) for the full code, examples, and instructions.
- **Contribute**: If you find an issue or want a feature, open a PR or issue.
- **Customization**: Extend `BaseWorker` to add your own logic (e.g., scheduling, multiple queues in one worker, etc.).

**We hope** this helps devs needing advanced NestJS + RabbitMQ functionality beyond what typical libraries provide. Feel free to drop a comment or open an issue if you have questions or suggestions!

Thanks for reading, and happy queueing!
