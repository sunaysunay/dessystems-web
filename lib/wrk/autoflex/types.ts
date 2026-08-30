export interface AutoflexConfig {
  endpoint: string;
  apiKey: string;
  dealerId: string;
  timeout?: number;
  enabled: boolean;
}

export interface AutoflexVehicle {
  id: string;
  licensePlate: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  mileage: number;
  customerId: string;
  lastServiceDate: string | null;
}

export interface AutoflexCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
}

export interface AutoflexOrderLine {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  type: 'labour' | 'parts' | 'external' | 'other';
}

export interface AutoflexWorkOrder {
  id: string;
  orderNumber: string;
  vehicleId: string;
  customerId: string;
  status: string;
  type: string;
  description: string;
  lines: AutoflexOrderLine[];
  createdAt: string;
  completedAt: string | null;
}

export interface AutoflexPart {
  id: string;
  partNumber: string;
  description: string;
  price: number;
  stock: number;
  category: string;
}

export interface AutoflexSyncResult {
  success: boolean;
  synced: number;
  failed: number;
  errors: string[];
  timestamp: string;
}

export interface AutoflexTestResult {
  connected: boolean;
  version: string | null;
  dealerName: string | null;
  latencyMs: number;
  error: string | null;
  capabilities: string[];
}
