import { httpClient } from './httpClient';
import { setAuthToken } from './authToken';

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  isActive: boolean;
};

export type LoginResponse = {
  access_token: string;
  user: AuthUser;
};

export async function loginRequest(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const { data } = await httpClient.post<LoginResponse>('/auth/login', {
    email,
    password,
  });
  setAuthToken(data.access_token);
  return data;
}

export async function registerRequest(payload: {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
}): Promise<LoginResponse> {
  const { data } = await httpClient.post<LoginResponse>('/auth/register', payload);
  setAuthToken(data.access_token);
  return data;
}
