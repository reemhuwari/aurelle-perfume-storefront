export interface CartLine { perfumeId: number; ml: number; qty: number }
export interface OrderItem { perfumeId: number; name: string; ml: number; qty: number; price: number }
export interface Order { id: number; userId: number; createdAt: string; status: string; items: OrderItem[]; total: number; address: string }
