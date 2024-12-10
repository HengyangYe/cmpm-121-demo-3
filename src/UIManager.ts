import { GRID_SIZE } from "./constants";
import L from "leaflet";
import { GameLogic } from "./GameLogic";
import { ICache, Coin } from "./interfaces";

export class UIManager {
  private map: L.Map;
  private gameLogic: GameLogic;
  private playerMarker: L.Marker;
  private movementHistory: L.LatLng[] = [];
  private movementPolyline: L.Polyline | null = null;

  constructor(map: L.Map, gameLogic: GameLogic, initialLocation: { lat: number; lng: number }) {
    this.map = map;
    this.gameLogic = gameLogic;

    // 初始化玩家标记
    this.playerMarker = L.marker([initialLocation.lat, initialLocation.lng]).addTo(this.map)
      .bindPopup("You are here!")
      .openPopup();

    // 初始化事件监听器
    this.initEventListeners();
  }

  private initEventListeners() {
    // 绑定全局函数以便在 HTML 的 onclick 中调用
    (window as any).centerMapOnCoin = this.centerMapOnCoin.bind(this);
    (window as any).collectCoins = this.collectCoins.bind(this);
    (window as any).depositCoins = this.depositCoins.bind(this);
  }

  public updatePlayerPosition(newLocation: { lat: number; lng: number }) {
    this.playerMarker.setLatLng([newLocation.lat, newLocation.lng]);
    this.playerMarker.openPopup();
    this.updateVisibleCaches();
    this.renderMovementHistory();
  }

  private collectCoins(lat: number, lng: number) {
    const result = this.gameLogic.collectCoins(lat, lng);
    this.updateStatusPanel(result.message);
    if (result.success && result.coins) {
      const cache = this.gameLogic.getCache(lat, lng);
      if (cache) {
        this.showCacheDetails(cache);
        this.refreshPopupContent(cache);
      }
    }
  }

  private depositCoins(lat: number, lng: number) {
    const result = this.gameLogic.depositCoins(lat, lng);
    this.updateStatusPanel(result.message);
    if (result.success && result.coins) {
      const cache = this.gameLogic.getCache(lat, lng);
      if (cache) {
        this.showCacheDetails(cache);
        this.refreshPopupContent(cache);
      }
    }
  }

  public refreshPopupContent(cache: ICache) {
    const marker = L.marker([cache.lat, cache.lng]).addTo(this.map);
    marker.bindPopup(`
          <div>Coins: ${cache.coins.length}</div>
          <button onclick="collectCoins(${cache.lat}, ${cache.lng})">Collect</button>
          <button onclick="depositCoins(${cache.lat}, ${cache.lng})">Deposit</button>
      `).openPopup();
  }

  private updateVisibleCaches() {
    this.map.eachLayer((layer: L.Layer) => {
      if (layer instanceof L.Marker && layer !== this.playerMarker) {
        this.map.removeLayer(layer);
      }
    });

    const nearbyCaches = this.gameLogic.getCachesNear(this.gameLogic.getPlayerLocation().lat, this.gameLogic.getPlayerLocation().lng, 8);
    nearbyCaches.forEach((cache) => {
      if (cache) {
        const marker = L.marker([cache.lat, cache.lng]).addTo(this.map);
        marker.bindPopup(`
                  <div>Coins: ${cache.coins.length}</div>
                  <button onclick="collectCoins(${cache.lat}, ${cache.lng})">Collect</button>
                  <button onclick="depositCoins(${cache.lat}, ${cache.lng})">Deposit</button>
              `);
        marker.on("click", () => this.showCacheDetails(cache));
      }
    });
  }

  public updateStatusPanel(message: string) { // 从 private 改为 public
    const statusPanel = document.getElementById("statusPanel");
    if (statusPanel) {
      statusPanel.innerText = message;
    }
  }

  private renderMovementHistory() {
    const currentLocation = this.gameLogic.getPlayerLocation();
    this.movementHistory.push(L.latLng(currentLocation.lat, currentLocation.lng));
    if (this.movementPolyline) {
      this.map.removeLayer(this.movementPolyline);
    }
    this.movementPolyline = L.polyline(this.movementHistory, { color: "blue" }).addTo(this.map);
  }

  public showCacheDetails(cache: ICache) {
    const cacheDetailPanel = document.getElementById("cacheDetailPanel");
    if (cacheDetailPanel) {
      cacheDetailPanel.innerHTML = `
              <h3>Cache Details</h3>
              <p><strong>Coordinates:</strong> i=${cache.coins[0]?.i || "N/A"}, j=${cache.coins[0]?.j || "N/A"}</p>
              <p><strong>Coins:</strong> ${
                cache.coins.length > 0
                  ? cache.coins.map((coin) =>
                      `<span class="coin-link" onclick="centerMapOnCoin(${JSON.stringify(coin)})">${coin.i}:${coin.j}#${coin.serial}</span>`
                    ).join(", ")
                  : "No coins"
              }</p>
          `;
      cacheDetailPanel.style.display = "block";
    }
  }

  private centerMapOnCoin(coin: Coin) {
    const cache = this.gameLogic.getCache(coin.i * GRID_SIZE, coin.j * GRID_SIZE);
    if (cache) {
      this.map.setView([cache.lat, cache.lng], 15);
      this.updateStatusPanel(`Centered on cache: i=${coin.i}, j=${coin.j}`);
    }
  }

  public resetMovementHistory() {
    this.movementHistory = [];
    if (this.movementPolyline) {
      this.map.removeLayer(this.movementPolyline);
      this.movementPolyline = null;
    }
  }
}
