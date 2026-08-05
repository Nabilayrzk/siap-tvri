export type RequestType = 'Permintaan' | 'Peminjaman';
export type RequestStatus = 'Menunggu' | 'Disetujui' | 'Ditolak' | 'Dikembalikan';

export interface EquipmentItem {
  id: string;
  code: string;
  name: string;
  category: string;
  stock: number;
  unit: string; // e.g., 'pcs', 'unit', 'box', 'rim', 'set'
  imageUrl: string;
  description: string;
  location?: string;
  minStockAlert?: number;
}

export interface RequestedItemSpec {
  itemId: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  unit: string;
}

export interface EquipmentRequest {
  id: string;
  requestNumber: string; // e.g. SPB/2026/07/001
  requesterName: string;
  department: string;
  position: string;
  nip?: string;
  email: string;
  phone: string;
  requestType: RequestType;
  requestDate: string;
  returnDate?: string;
  purpose: string;
  items: RequestedItemSpec[];
  status: RequestStatus;
  adminNotes?: string;
  createdAt: string;
  approvedAt?: string;
  processedBy?: string;
  requesterSignature?: string;
  adminSignature?: string;
}

export interface CartItem {
  item: EquipmentItem;
  quantity: number;
}

export interface AdminUser {
  id: string;
  name: string;
  nip: string;
  email: string;
  role: string;
  createdAt: string;
}
