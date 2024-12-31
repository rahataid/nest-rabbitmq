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
  saveList(list: any[]) {
    console.log('PrismaProvider saveList', list);
    return this.prisma.beneficiary.createMany({ data: list });
  }
}
