
export enum ProductType {
  AXE_HANDLE = 'AXE_HANDLE',
  HAMMER_HANDLE = 'HAMMER_HANDLE',
  CHISEL_HANDLE = 'CHISEL_HANDLE',
  SHOVEL_HANDLE = 'SHOVEL_HANDLE'
}

export interface ProductTypeDefinition {
  id: string;
  ru: string;
  ua: string;
  [key: string]: string; // Для расширяемости (другие языки)
}

export interface KPIConfig {
  emoji: string;
  threshold: number;
  send: boolean;
  condition: '>=' | '<' | '>' | '<=';
}

export interface KPISettings {
  good: KPIConfig;
  ok: KPIConfig;
  bad: KPIConfig;
  'very bad': KPIConfig;
}

export interface Partition {
  id: string; // The batch number
  date: string;
  V: number; // Volume
  length: number;
  width: number;
  thickness: number;
  startBoardId: string;
  endBoardId: string;
  close: boolean | string; // Might come as string "TRUE" from sheet
  unit_cost?: number; // Cost per cubic meter of unprocessed wood
  bad_good_kpi?: string; // JSON string with KPI settings for this partition
}

export interface BoardDimensions {
  id: string; // Unique ID (timestamp)
  length: number; // mm
  width: number;  // mm
  thickness: number; // mm
  batchNumber: string; // Batch identifier
}

export interface Product {
  id: string;
  name: string;
  type: ProductType | string; // Allow dynamic types strings
  dimensions: {
    length: number;
    width: number; // approximated for irregular shapes
    thickness: number;
  };
  image: string;
  price: number; // Price in currency (e.g., RUB)
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface AnalysisResult {
  earnings: number;
  yieldPercentage: number;
  boardVolumeM3: number;
  productsVolumeM3: number;
  message: string;
  motivationalQuote: string;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  earnings: number;
  isCurrentUser: boolean;
  avatar: string;
}

export interface TimeStats {
  durationFetch: number; // Seconds to fetch board
  durationMeasure: number; // Seconds to measure board
  durationSawing: number; // Seconds to process/saw board
}

export interface HistoryEntry {
  id: string; // Internal ID (usually timestamp)
  boardId: string; // ID sent to sheet
  timestamp: string;
  batchNumber: string;
  earnings: number;
  yieldPercentage: number;
  itemCount: number;
  boardDims: string; // e.g., "2000x150x50"
  boardVolume: number; // m3
  cart: CartItem[]; // Saved items for editing
  timeStats?: TimeStats; // Optional for backward compatibility
}

export interface User {
  id: string;
  login: string;
  password?: string; // Optional because we might handle it securely or not store it in state
  name: string;
  role: string;
}