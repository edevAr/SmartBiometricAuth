import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { httpClient } from '../../api/httpClient';

/** Modelo de UI (compatible con tarjetas y lista). */
export interface Contact {
  id: string;
  name: string;
  relationship: string;
  email?: string | null;
  phone?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  role?: string;
  /** true si hay plantilla/rostro registrado en backend (opcional hasta integrar GET biométrico). */
  faceEnrolled?: boolean;
  /** true si hay plantilla de voz en backend. */
  voiceEnrolled?: boolean;
}

export interface CreateContactInput {
  name: string;
  relationship: string;
  email?: string;
  phone?: string;
}

export type UpdateAuthorizedUserInput = {
  fullName?: string;
  email?: string;
  phone?: string;
  relationship?: string;
  isActive?: boolean;
};

type UserApi = {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  relationship: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type BiometricProfileApi = {
  id: string;
  userId: string;
  faceTemplateRef: string | null;
  voiceTemplateRef: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
} | null;

async function fetchBiometricProfile(userId: string): Promise<BiometricProfileApi> {
  try {
    const { data } = await httpClient.get<BiometricProfileApi>(
      `/users/${userId}/biometric-profile`,
    );
    return data ?? null;
  } catch {
    return null;
  }
}

function userToContact(u: UserApi): Contact {
  return {
    id: u.id,
    name: u.fullName,
    relationship: u.relationship ?? 'OTHER',
    email: u.email,
    phone: u.phone,
    isActive: u.isActive,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
    role: u.role,
  };
}

async function fetchAuthorizedUsers(): Promise<Contact[]> {
  const { data } = await httpClient.get<UserApi[]>('/users');
  const list = await Promise.all(
    data.map(async (u) => {
      const bio = await fetchBiometricProfile(u.id);
      const base = userToContact(u);
      return {
        ...base,
        faceEnrolled: Boolean(bio?.faceTemplateRef),
        voiceEnrolled: Boolean(bio?.voiceTemplateRef),
      };
    }),
  );
  return list;
}

async function createAuthorizedUser(input: CreateContactInput): Promise<Contact> {
  const email = input.email?.trim();
  if (!email) {
    throw new Error('El email es obligatorio para usuarios autorizados.');
  }
  const { data } = await httpClient.post<UserApi>('/users', {
    email,
    fullName: input.name.trim(),
    relationship: input.relationship,
    phone: input.phone?.trim() || undefined,
  });
  return userToContact(data);
}

async function deactivateUser(id: string): Promise<Contact> {
  const { data } = await httpClient.post<UserApi>(`/users/${id}/deactivate`, {});
  return userToContact(data);
}

async function updateAuthorizedUser(
  id: string,
  patch: UpdateAuthorizedUserInput,
): Promise<Contact> {
  const { data } = await httpClient.patch<UserApi>(`/users/${id}`, patch);
  return userToContact(data);
}

export function useContactsQuery() {
  return useQuery({
    queryKey: ['users', 'authorized'],
    queryFn: fetchAuthorizedUsers,
  });
}

export function useCreateContactMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAuthorizedUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'authorized'] });
    },
  });
}

export function useDeactivateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deactivateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'authorized'] });
    },
  });
}

export function useUpdateUserMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      ...patch
    }: { id: string } & UpdateAuthorizedUserInput) => updateAuthorizedUser(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'authorized'] });
    },
  });
}
