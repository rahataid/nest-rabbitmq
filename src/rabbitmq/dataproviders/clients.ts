import { AxiosHeaderValue, CreateAxiosDefaults } from 'axios';
import { ApiClient } from './client.api';

export { ApiClient };

export const getClient = (config: CreateAxiosDefaults) => {
  const apiClient = new ApiClient(config);
  return {
    apiClient: apiClient,
    setAppId: (appId: string) => (apiClient.appId = appId),
    setAccessToken: (token: string) => (apiClient.accessToken = token),
    setHeaders: (headers: { [key: string]: AxiosHeaderValue }) => (apiClient.headers = headers),
  };
};
