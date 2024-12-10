// CacheManager.ts
import { ICacheManager, IBoard, ICache, Coin } from "./interfaces";
import { GRID_SIZE } from "./constants";

export class Cache implements ICache {
  lat: number;
  lng: number;
  coins: Coin[];

  constructor(lat: number, lng: number, coins: Coin[]) {
    this.lat = lat;
    this.lng = lng;
    this.coins = coins;
  }

  toMemento(): string {
    return JSON.stringify({ coins: this.coins });
  }

  fromMemento(memento: string): void {
    const state = JSON.parse(memento);
    this.coins = state.coins;
  }
}

export class CacheManager implements ICacheManager {
  public caches: Map<string, ICache> = new Map(); // 保持为 public
  private mementos: Map<string, string> = new Map();
  private board: IBoard;

  constructor(board: IBoard) {
    this.board = board;
  }

  public getCache(lat: number, lng: number): ICache | null {
    const cell = this.board.getCanonicalCell(lat, lng);
    const key = `${cell.i},${cell.j}`;

    // 如果缓存已存在，返回它
    if (this.caches.has(key)) {
      return this.caches.get(key)!;
    }

    // 以 10% 的概率创建新的缓存
    if (Math.random() < 0.1) {
      const coins = this.createCoinsForCache(lat, lng, Math.floor(Math.random() * 5) + 1);
      const cache = new Cache(lat, lng, coins);
      this.caches.set(key, cache);
      return cache;
    }

    return null;
  }

  public restoreCacheState(lat: number, lng: number): void {
    const cell = this.board.getCanonicalCell(lat, lng);
    const key = `${cell.i},${cell.j}`;
    const memento = this.mementos.get(key);
    if (memento && this.caches.has(key)) {
      this.caches.get(key)!.fromMemento(memento);
    }
  }

  public getCachesNear(lat: number, lng: number, radius: number): ICache[] {
    const result: ICache[] = [];
    for (let i = -radius; i <= radius; i++) {
      for (let j = -radius; j <= radius; j++) {
        const nearbyLat = lat + i * GRID_SIZE;
        const nearbyLng = lng + j * GRID_SIZE;
        const cache = this.getCache(nearbyLat, nearbyLng);

        // 只将非空缓存添加到结果中
        if (cache !== null) {
          result.push(cache);
        }
      }
    }
    return result;
  }

  private createCoinsForCache(lat: number, lng: number, count: number): Coin[] {
    const cell = this.board.getCanonicalCell(lat, lng);
    const coins: Coin[] = [];
    for (let serial = 0; serial < count; serial++) {
      coins.push({ i: cell.i, j: cell.j, serial });
    }
    return coins;
  }
}
