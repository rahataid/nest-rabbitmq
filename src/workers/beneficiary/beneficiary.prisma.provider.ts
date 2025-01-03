import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from 'nestjs-prisma';
import { PRISMA_SERVICE } from 'src/rabbitmq/dataproviders/dataprovider.module';
import { IDataProvider } from 'src/rabbitmq/types';

@Injectable()
export class BeneficiaryPrismaProvider implements IDataProvider {
  constructor(@Inject(PRISMA_SERVICE) private readonly prisma: PrismaService) {
    console.log('PrismaProvider created', prisma);
  }
  getItem: (id: string) => Promise<any>;
  getList: () => Promise<any[]>;
  saveItem: (item: any) => Promise<void>;
  async saveList(list: any[]) {
    console.log('PrismaProvider saveList', JSON.stringify(this.prisma, null, 2));
    const saved = await this.prisma.beneficiary.createMany({ data: list });
    console.log('first', saved);
    return saved;
  }
}
