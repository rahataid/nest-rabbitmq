import { Inject, Injectable } from '@nestjs/common';
import { Beneficiary } from '@prisma/client';
import { IDataProvider } from '@rumsan/nest-rabbitmq';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class BeneficiaryApiProvider implements IDataProvider {
  private readonly axiosInstance: AxiosInstance;

  constructor(@Inject('API_URL') private readonly apiUrl: string) {
    this.axiosInstance = axios.create({
      baseURL: this.apiUrl, // Dynamically using the provided API URL
    });
  }

  getItem: (id: string) => Promise<any>;

  async getList(): Promise<any[]> {
    const { data } = await this.axiosInstance.get('/beneficiaries');
    return data; // Assuming the data is an array of Beneficiary objects
  }

  async saveList(beneficiaries: Beneficiary[]): Promise<void> {
    return await this.axiosInstance.post('/beneficiaries', beneficiaries);
  }

  async saveItem(beneficiary: Beneficiary): Promise<void> {
    return await this.axiosInstance.post('/beneficiaries', beneficiary);
  }
}
