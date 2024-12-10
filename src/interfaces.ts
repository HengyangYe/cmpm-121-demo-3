// interfaces.ts

export interface Cell {
    i: number; // 网格单元行
    j: number; // 网格单元列
  }
  
  export interface IBoard {
    getCanonicalCell(lat: number, lng: number): Cell;
  }
  
  export interface Coin {
    i: number;
    j: number;
    serial: number;
  }
  
  export interface ICacheManager {
    getCache(lat: number, lng: number): ICache | null;
    restoreCacheState(lat: number, lng: number): void;
    getCachesNear(lat: number, lng: number, radius: number): ICache[];
  }
  
  export interface ICache {
    lat: number;
    lng: number;
    coins: Coin[];
    toMemento(): string;
    fromMemento(memento: string): void;
  }
  