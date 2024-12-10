// GameLogic.ts
import { ICacheManager, ICache, Coin } from "./interfaces";
import { GRID_SIZE } from "./constants";

export class GameLogic {
  private cacheManager: ICacheManager;
  private playerInventory: Coin[] = [];
  private currentPlayerLocation: { lat: number; lng: number };

  constructor(cacheManager: ICacheManager, initialLocation: { lat: number; lng: number }) {
    this.cacheManager = cacheManager;
    this.currentPlayerLocation = { ...initialLocation };
  }

  public getPlayerLocation() {
    return this.currentPlayerLocation;
  }

  public movePlayer(direction: "north" | "south" | "east" | "west") {
    switch (direction) {
      case "north":
        this.currentPlayerLocation.lat += GRID_SIZE;
        break;
      case "south":
        this.currentPlayerLocation.lat -= GRID_SIZE;
        break;
      case "east":
        this.currentPlayerLocation.lng += GRID_SIZE;
        break;
      case "west":
        this.currentPlayerLocation.lng -= GRID_SIZE;
        break;
    }
  }

  public movePlayerToLocation(lat: number, lng: number) {
    this.currentPlayerLocation = { lat, lng };
  }

  public collectCoins(lat: number, lng: number): { success: boolean; message: string; coins?: Coin[] } {
    const cache = this.cacheManager.getCache(lat, lng);
    if (cache && cache.coins.length > 0) {
      this.playerInventory = this.playerInventory.concat(cache.coins);
      cache.coins = []; 
      return { success: true, message: `Collected coins! Inventory: ${this.playerInventory.length}`, coins: this.playerInventory };
    } else {
      return { success: false, message: "No coins to collect here!" };
    }
  }

  public depositCoins(lat: number, lng: number): { success: boolean; message: string; coins?: Coin[] } {
    const cache = this.cacheManager.getCache(lat, lng);
    if (cache && this.playerInventory.length > 0) {
      cache.coins = cache.coins.concat(this.playerInventory);
      this.playerInventory = []; 
      return { success: true, message: "Deposited coins!", coins: cache.coins };
    } else {
      return { success: false, message: "No coins to deposit!" };
    }
  }

  public getInventory(): Coin[] {
    return this.playerInventory;
  }

  public getCachesNear(lat: number, lng: number, radius: number): ICache[] {
    return this.cacheManager.getCachesNear(lat, lng, radius);
  }

  public getCache(lat: number, lng: number): ICache | null {
    return this.cacheManager.getCache(lat, lng);
  }
}
