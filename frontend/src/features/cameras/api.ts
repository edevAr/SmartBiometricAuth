import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { httpClient } from '../../api/httpClient';

export interface Camera {
  id: string;
  name: string;
  ipAddress: string;
  port: number;
  username: string;
  rtspPath: string;
  location?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterCameraInput {
  name?: string;
  ipAddress: string;
  port?: string;
  username: string;
  password: string;
  rtspPath?: string;
  location?: string;
}

export type UpdateCameraInput = {
  name?: string;
  ipAddress?: string;
  port?: string;
  username?: string;
  /** Solo si se envía y no está vacía, se actualiza en el servidor. */
  password?: string;
  rtspPath?: string;
  location?: string;
  isActive?: boolean;
};

async function fetchCameras(): Promise<Camera[]> {
  const { data } = await httpClient.get<Camera[]>('/cameras');
  return data;
}

async function registerCamera(input: RegisterCameraInput): Promise<Camera> {
  const body: Record<string, string> = {
    ipAddress: input.ipAddress.trim(),
    username: input.username.trim(),
    password: input.password,
  };
  if (input.name?.trim()) body.name = input.name.trim();
  if (input.port?.trim()) body.port = input.port.trim();
  if (input.rtspPath?.trim()) body.rtspPath = input.rtspPath.trim();
  if (input.location?.trim()) body.location = input.location.trim();
  const { data } = await httpClient.post<Camera>('/cameras', body);
  return data;
}

async function updateCamera(id: string, input: UpdateCameraInput): Promise<Camera> {
  const body: Record<string, string | boolean> = {};
  if (input.name !== undefined) body.name = input.name;
  if (input.ipAddress !== undefined) body.ipAddress = input.ipAddress;
  if (input.port !== undefined) body.port = input.port;
  if (input.username !== undefined) body.username = input.username;
  if (input.password !== undefined && input.password !== '') {
    body.password = input.password;
  }
  if (input.rtspPath !== undefined) body.rtspPath = input.rtspPath;
  if (input.location !== undefined) body.location = input.location;
  if (input.isActive !== undefined) body.isActive = input.isActive;
  const { data } = await httpClient.patch<Camera>(`/cameras/${id}`, body);
  return data;
}

export function useCamerasQuery() {
  return useQuery({
    queryKey: ['cameras'],
    queryFn: fetchCameras,
  });
}

export function useRegisterCameraMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: registerCamera,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cameras'] });
    },
  });
}

export function useUpdateCameraMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...patch }: { id: string } & UpdateCameraInput) =>
      updateCamera(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cameras'] });
    },
  });
}

