import { Product, ProductType, LeaderboardEntry } from './types';

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Топорище Колун',
    type: ProductType.AXE_HANDLE,
    dimensions: { length: 800, width: 60, thickness: 40 },
    image: 'https://picsum.photos/id/119/200/200',
    price: 150
  },
  {
    id: 'p2',
    name: 'Топорище Таежное',
    type: ProductType.AXE_HANDLE,
    dimensions: { length: 600, width: 50, thickness: 35 },
    image: 'https://picsum.photos/id/128/200/200',
    price: 120
  },
  {
    id: 'p3',
    name: 'Ручка молотка 300г',
    type: ProductType.HAMMER_HANDLE,
    dimensions: { length: 300, width: 25, thickness: 15 },
    image: 'https://picsum.photos/id/137/200/200',
    price: 45
  },
  {
    id: 'p4',
    name: 'Ручка молотка 500г',
    type: ProductType.HAMMER_HANDLE,
    dimensions: { length: 350, width: 30, thickness: 20 },
    image: 'https://picsum.photos/id/145/200/200',
    price: 60
  },
  {
    id: 'p5',
    name: 'Черенок Малый',
    type: ProductType.SHOVEL_HANDLE,
    dimensions: { length: 1200, width: 40, thickness: 40 },
    image: 'https://picsum.photos/id/152/200/200',
    price: 180
  },
  {
    id: 'p6',
    name: 'Ручка Стамески',
    type: ProductType.CHISEL_HANDLE,
    dimensions: { length: 120, width: 30, thickness: 30 },
    image: 'https://picsum.photos/id/160/200/200',
    price: 35
  }
];

// In a real app, this would come from the backend/Google Sheets
export const INITIAL_LEADERBOARD: LeaderboardEntry[] = [
  { id: 'u2', name: 'Иван Петров', earnings: 4200, isCurrentUser: false, avatar: 'IP' },
  { id: 'u3', name: 'Сергей К.', earnings: 3800, isCurrentUser: false, avatar: 'SK' },
  { id: 'u4', name: 'Дмитрий В.', earnings: 2100, isCurrentUser: false, avatar: 'DV' },
];