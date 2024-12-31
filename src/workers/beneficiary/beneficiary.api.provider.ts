import { Injectable, Inject } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { IDataProvider } from '../../rabbitmq/types'; // Adjust path accordingly
import { Beneficiary } from '@prisma/client';

@Injectable()
export class BeneficiaryApiProvider implements IDataProvider {
  private readonly axiosInstance: AxiosInstance;

  constructor(@Inject('API_URL') private readonly apiUrl: string) {
    this.axiosInstance = axios.create({
      baseURL: this.apiUrl, // Dynamically using the provided API URL
    });
    console.log('BeneficiaryApiProvider initialized with URL:', this.apiUrl);
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
