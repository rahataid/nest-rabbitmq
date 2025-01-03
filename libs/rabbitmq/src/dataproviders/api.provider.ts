import { Injectable } from '@nestjs/common';
import { getClient } from './clients';

@Injectable()
export class ApiProvider {
  private _client;
  constructor(params: { url?: string }) {
    if (!params.url) {
      throw new Error('Api url is required for DataProvider');
    }
    this._client = getClient({
      baseURL: params.url,
    });
  }

  async getSession(sessionCuid: string): Promise<any> {
    const { data } = await this._client.session.get(sessionCuid);
    return data;
  }
}
