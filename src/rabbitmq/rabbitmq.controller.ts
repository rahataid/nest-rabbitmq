import { Controller, Get } from '@nestjs/common';
import { RabbitMQService } from './rabbitmq.service';
import { BENEFICIARY_QUEUE } from 'src/constants';

@Controller('rabbitmq')
export class RabbitMQController {
  constructor(private readonly rabbitMQService: RabbitMQService) {}

  @Get('emit')
  async emitMessage() {
    const data = {
      name: 'John Doe',
      email: '',
    };
    const dataBatched = Array(10000)
      .fill(data)
      .map((item, index) => ({
        name: item.name + index,
        email: `email@${index + Math.random()}.com`,
      }));
    console.log('dataBatched', dataBatched);
    await this.rabbitMQService.publishBatchToQueue(BENEFICIARY_QUEUE, dataBatched, 100);
    return 'Message emitted!';
  }

  @Get('send')
  async sendMessage() {
    const data = { message: 'Hello RabbitMQ!' };
    const response = await this.rabbitMQService.publishBatchToQueue('example.rpc', [data], 1);
    return { response };
  }
}
