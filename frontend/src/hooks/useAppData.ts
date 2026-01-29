import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getApiService } from '../services/apiService';
import { 
  BuildingObject, 
  ObjectGroup, 
  FormTemplate, 
  AppUser, 
  BatteryStatus,
  Technology,
  ObjectTask,
  FileAttachment,
  Contact,
  RegularEvent,
  PendingIssue,
  LogEntry,
  BatteryType
} from '../types';
import { authService } from '../services/authService';
const api = getApiService();

// --- 1. DEFINICE KLÍČŮ PRO CACHE ---
// Tyto klíče používá React Query k identifikaci dat.
export const QUERY_KEYS = {
  objects: ['objects'],
  object: (id: string) => ['objects', id],
  groups: ['groups'],
  templates: ['templates'],
  users: ['users'],
  batteryTypes: ['batteryTypes'],
};

// =========================================================================
// SEKCE A: QUERIES (Načítání dat - GET)
// =========================================================================

export const useObjects = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: QUERY_KEYS.objects,
    queryFn: () => api.getObjects(),
    ...options, // Rozbalíme možnosti (hlavně enabled)
  });
};

export const useObject = (id: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.object(id),
    queryFn: () => api.getObject(id),
    enabled: !!id, // Zde necháme logiku ID, ale můžeme přidat && options?.enabled, pokud by to bylo třeba
  });
};

export const useGroups = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: QUERY_KEYS.groups,
    queryFn: () => api.getGroups(),
    ...options,
  });
};

export const useCreateGroup = () => {
  const queryClient = useQueryClient();
  const api = getApiService();
  return useMutation({
    mutationFn: (group: Partial<ObjectGroup>) => api.createGroup(group),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
  });
};

export const useUpdateGroup = () => {
  const queryClient = useQueryClient();
  const api = getApiService();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<ObjectGroup> }) => 
      api.updateGroup(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
  });
};

export const useDeleteGroup = () => {
  const queryClient = useQueryClient();
  const api = getApiService();
  return useMutation({
    mutationFn: (id: string) => api.deleteGroup(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
  });
};

export const useTemplates = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: QUERY_KEYS.templates,
    queryFn: () => api.getTemplates(),
    ...options,
  });
};

export const useUsers = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: QUERY_KEYS.users,
    queryFn: () => authService.getUsers(),
    ...options,
  });
};

export const useBatteryTypes = () => {
  return useQuery({
    queryKey: QUERY_KEYS.batteryTypes,
    queryFn: () => api.getBatteryTypes(),
  });
};
// =========================================================================
// SEKCE B: MUTATIONS (Změny dat - POST, PUT, DELETE, PATCH)
// =========================================================================

// --- 1. Operace s celým objektem ---

export const useCreateObject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newObj: Partial<BuildingObject>) => api.createObject(newObj),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.objects });
    },
  });
};

export const useUpdateObjectRoot = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<BuildingObject> }) => 
      api.updateObjectRoot(id, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.object(variables.id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.objects });
    },
  });
};

export const useDeleteObject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteObject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.objects });
    },
  });
};

// --- 2. Technologie ---

export const useAddTechnology = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ objId, tech }: { objId: string; tech: any }) => 
      api.addTechnology(objId, tech),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.object(variables.objId) });
    },
  });
};

export const useUpdateTechnology = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ objId, techId, updates }: { objId: string; techId: string; updates: any }) => 
      api.updateTechnology(objId, techId, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.object(variables.objId) });
    },
  });
};

export const useRemoveTechnology = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ objId, techId }: { objId: string; techId: string }) => 
      api.removeTechnology(objId, techId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.object(variables.objId) });
    },
  });
};

// --- 3. Baterie ---

export const useAddBattery = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ objId, techId, battery }: { objId: string; techId: string; battery: any }) => 
      api.addBattery(objId, techId, battery),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.object(variables.objId) });
      // Invalidujeme i seznam objektů, protože dashboard zobrazuje statistiky baterií
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.objects }); 
    },
  });
};

export const useUpdateBatteryStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ objId, techId, batId, status, extraData }: { objId: string; techId: string; batId: string; status: BatteryStatus; extraData?: any }) => 
      api.updateBatteryStatus(objId, techId, batId, status, extraData),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.object(variables.objId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.objects });
    },
  });
};

export const useRemoveBattery = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ objId, techId, batId }: { objId: string; techId: string; batId: string }) => 
      api.removeBattery(objId, techId, batId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.object(variables.objId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.objects });
    },
  });
};


export const useCreateBatteryType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bt: Partial<BatteryType>) => api.createBatteryType(bt),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.batteryTypes });
    },
  });
};

export const useDeleteBatteryType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteBatteryType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.batteryTypes });
    },
  });
};


// --- 4. Úkoly (Tasks) ---

export const useAddTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ objId, task }: { objId: string; task: any }) => 
      api.addTask(objId, task),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.object(variables.objId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.objects }); // Dashboard zobrazuje úkoly
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ objId, taskId, updates }: { objId: string; taskId: string; updates: any }) => 
      api.updateTask(objId, taskId, updates),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.object(variables.objId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.objects });
    },
  });
};

export const useRemoveTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ objId, taskId }: { objId: string; taskId: string }) => 
      api.removeTask(objId, taskId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.object(variables.objId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.objects });
    },
  });
};

// --- 5. Deník (Logs) ---

export const useAddLogEntry = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ objId, log }: { objId: string; log: LogEntry }) => 
      api.addLogEntry(objId, log),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.object(variables.objId) });
    },
  });
};

// --- 6. Kolekce (Kontakty, Soubory, Události, Závady) ---
// Používáme generickou metodu addToCollection/removeFromCollection, ale uděláme pro ně typované hooky pro lepší DX.

// A) FILES
export const useAddFile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ objId, file }: { objId: string; file: FileAttachment }) => 
      api.addToCollection(objId, 'files', file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.object(variables.objId) });
    },
  });
};

export const useRemoveFile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ objId, fileId }: { objId: string; fileId: string }) => 
      api.removeFromCollection(objId, 'files', fileId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.object(variables.objId) });
    },
  });
};

// B) CONTACTS
export const useAddContact = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ objId, contact }: { objId: string; contact: Contact }) => 
      api.addToCollection(objId, 'contacts', contact),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.object(variables.objId) });
    },
  });
};

export const useRemoveContact = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ objId, contactId }: { objId: string; contactId: string }) => 
      api.removeFromCollection(objId, 'contacts', contactId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.object(variables.objId) });
    },
  });
};

// C) SCHEDULED EVENTS
export const useAddEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ objId, event }: { objId: string; event: RegularEvent }) => 
      api.addToCollection(objId, 'scheduledEvents', event),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.object(variables.objId) });
    },
  });
};

export const useRemoveEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ objId, eventId }: { objId: string; eventId: string }) => 
      api.removeFromCollection(objId, 'scheduledEvents', eventId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.object(variables.objId) });
    },
  });
};

// D) PENDING ISSUES (Odložené závady)
export const useAddIssue = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ objId, issue }: { objId: string; issue: PendingIssue }) => 
      api.addToCollection(objId, 'pendingIssues', issue),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.object(variables.objId) });
    },
  });
};

export const useUpdateIssueStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ objId, issueId, status }: { objId: string; issueId: string; status: string }) => 
      api.updateIssueStatus(objId, issueId, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.object(variables.objId) });
    },
  });
};

export const useRemoveIssue = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ objId, issueId }: { objId: string; issueId: string }) => 
      api.removeFromCollection(objId, 'pendingIssues', issueId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.object(variables.objId) });
    },
  });
};

// --- 7. Globální nastavení (Skupiny, Šablony, Soubory) ---

export const useSaveGroups = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (groups: ObjectGroup[]) => api.saveGroups(groups),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.groups });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.objects }); // Objekty mají reference na skupiny
    },
  });
};

export const useSaveTemplates = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (templates: FormTemplate[]) => api.saveTemplates(templates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.templates });
    },
  });
};

export const useUploadFile = () => {
  // Upload souboru nemění přímo stav aplikace (vrací URL), 
  // takže nepotřebuje invalidaci, ale Mutation hook se hodí pro isLoading state.
  return useMutation({
    mutationFn: (file: File) => api.uploadFile(file),
  });
};

// --- 8. Admin / Backup ---

export const useAuthorizeUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    // Zde musíme volat authService metodu, ne apiService, pokud tam je
    mutationFn: ({ userId, role, authorized }: { userId: string, role: string, authorized: boolean }) => 
       // Zde předpokládáme import authService, nebo že je logika dostupná.
       // V apiService.ts nebyla metoda authorizeUser, byla v authService.ts.
       // Pro jednoduchost voláme fetch přímo nebo si naimportujte authService.
       fetch(`/api/users/${userId}`, {
          method: 'PUT',
          headers: { 
             'Content-Type': 'application/json',
             'Authorization': `Bearer ${localStorage.getItem('bg_auth_token')}` 
          },
          body: JSON.stringify({ role, isAuthorized: authorized })
       }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users });
    },
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (user: { name: string, email: string, password?: string, role: 'ADMIN' | 'TECHNICIAN' }) =>
      api.createUser(user),
    onSuccess: () => {
      // Po vytvoření uživatele invalidujeme cache uživatelů
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users });
    },
  });
};

export const useUpdateUserPassword = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, newPassword }: { userId: string, newPassword: string }) =>
      api.updateUserPassword(userId, newPassword),
    onSuccess: () => {
      // Invalidace uživatelů po změně hesla
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.users });
    },
  });
};

export const useUpdateSelfPassword = () => {
  // Tato mutace neinvaliduje QUERY_KEYS.users, protože se týká jen hesla.
  // Zde nepotřebujeme queryClient.invalidateQueries.
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string, newPassword: string }) =>
      api.updateSelfPassword(currentPassword, newPassword),
  });
};
