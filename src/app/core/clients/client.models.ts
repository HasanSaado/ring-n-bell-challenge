export interface Client {
  id: string;
  name: string;
  email?: string;
}

export interface ClientListParams {
  search?: string;
}

export interface ClientListResponse {
  items: Client[];
}

export type RawClientListResponse = Client[] | ClientListResponse | { clients: Client[] };
