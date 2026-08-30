import type {
  AutoflexVehicle,
  AutoflexCustomer,
  AutoflexWorkOrder,
  AutoflexPart,
} from './types';

/** Maps an Autoflex vehicle to an ast_assets-compatible insert shape. */
export function mapAutoflexVehicleToAsset(v: AutoflexVehicle): {
  external_id: string;
  source: string;
  license_plate: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  mileage: number;
  external_customer_id: string;
  last_service_date: string | null;
} {
  return {
    external_id: v.id,
    source: 'autoflex',
    license_plate: v.licensePlate,
    vin: v.vin,
    make: v.make,
    model: v.model,
    year: v.year,
    mileage: v.mileage,
    external_customer_id: v.customerId,
    last_service_date: v.lastServiceDate,
  };
}

/** Maps an Autoflex customer to a crm_leads-compatible insert shape. */
export function mapAutoflexCustomerToCRM(c: AutoflexCustomer): {
  external_id: string;
  source: string;
  name: string;
  email: string | null;
  phone: string | null;
  address_line1: string | null;
  city: string | null;
  postal_code: string | null;
} {
  return {
    external_id: c.id,
    source: 'autoflex',
    name: c.name,
    email: c.email,
    phone: c.phone,
    address_line1: c.address,
    city: c.city,
    postal_code: c.postalCode,
  };
}

/** Maps a WRK work order + lines to an AutoflexWorkOrder shape for the API. */
export function mapWrkOrderToAutoflex(
  order: {
    id?: string;
    order_number?: string;
    vehicle_id?: string;
    customer_id?: string;
    status?: string;
    type?: string;
    description?: string;
    created_at?: string;
    completed_at?: string | null;
  },
  lines: {
    id?: string;
    description?: string;
    quantity?: number;
    unit_price?: number;
    total?: number;
    line_type?: string;
  }[],
): Partial<AutoflexWorkOrder> {
  return {
    id: order.id,
    orderNumber: order.order_number,
    vehicleId: order.vehicle_id,
    customerId: order.customer_id,
    status: order.status,
    type: order.type,
    description: order.description ?? '',
    lines: lines.map((l) => ({
      id: l.id ?? '',
      description: l.description ?? '',
      quantity: l.quantity ?? 0,
      unitPrice: l.unit_price ?? 0,
      total: l.total ?? 0,
      type: (l.line_type as 'labour' | 'parts' | 'external' | 'other') ?? 'other',
    })),
    createdAt: order.created_at,
    completedAt: order.completed_at ?? null,
  };
}

/** Maps an Autoflex work order to a wrk_orders insert shape. */
export function mapAutoflexOrderToWrk(order: AutoflexWorkOrder): {
  external_id: string;
  source: string;
  order_number: string;
  external_vehicle_id: string;
  external_customer_id: string;
  status: string;
  type: string;
  description: string;
  created_at: string;
  completed_at: string | null;
  lines: {
    external_id: string;
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
    line_type: string;
  }[];
} {
  return {
    external_id: order.id,
    source: 'autoflex',
    order_number: order.orderNumber,
    external_vehicle_id: order.vehicleId,
    external_customer_id: order.customerId,
    status: order.status,
    type: order.type,
    description: order.description,
    created_at: order.createdAt,
    completed_at: order.completedAt,
    lines: order.lines.map((l) => ({
      external_id: l.id,
      description: l.description,
      quantity: l.quantity,
      unit_price: l.unitPrice,
      total: l.total,
      line_type: l.type,
    })),
  };
}

/** Maps an Autoflex part to a shp_products-compatible insert shape. */
export function mapAutoflexPartToSHP(part: AutoflexPart): {
  external_id: string;
  source: string;
  sku: string;
  name: string;
  price: number;
  stock_quantity: number;
  category: string;
} {
  return {
    external_id: part.id,
    source: 'autoflex',
    sku: part.partNumber,
    name: part.description,
    price: part.price,
    stock_quantity: part.stock,
    category: part.category,
  };
}
