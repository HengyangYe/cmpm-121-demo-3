// main.ts
import L from "leaflet";
import "./style.css";
import "leaflet/dist/leaflet.css";
import "./leafletWorkaround.ts";
import { Board } from "./Board";
import { CacheManager, Cache } from "./CacheManager"; // 导入 Cache 类
import { Coin } from "./interfaces";
import { GRID_SIZE } from "./constants";

// Player's initial location at Oakes College
const playerInitialLocation = { lat: 36.9895, lng: -122.0628 }; // 36°59'22.2"N 122°03'46.0"W
let currentPlayerLocation = { ...playerInitialLocation }; // 跟踪玩家当前位置

// 创建地图
const map = L.map("map").setView([playerInitialLocation.lat, playerInitialLocation.lng], 15);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
}).addTo(map);

// 玩家标记
const playerMarker = L.marker([playerInitialLocation.lat, playerInitialLocation.lng]).addTo(map)
  .bindPopup("You are here!")
  .openPopup();

// 初始化 Board 和 CacheManager，使用依赖注入
const board = new Board();
const cacheManager = new CacheManager(board);

// 玩家库存，用于跟踪收集的金币
let playerInventory: Coin[] = [];

// 收集缓存中的金币
function collectCoins(lat: number, lng: number) {
  const cache = cacheManager.getCache(lat, lng);
  if (cache && cache.coins.length > 0) {
    playerInventory = playerInventory.concat(cache.coins);
    cache.coins = []; // 清除缓存中的金币
    updateStatusPanel(`Collected coins! Inventory: ${playerInventory.length}`);
    showCacheDetails(cache);
    refreshPopupContent(cache);
  } else {
    updateStatusPanel("No coins to collect here!");
  }
}

// 存入金币到缓存
function depositCoins(lat: number, lng: number) {
  const cache = cacheManager.getCache(lat, lng);
  if (cache && playerInventory.length > 0) {
    cache.coins = cache.coins.concat(playerInventory);
    playerInventory = []; // 清除玩家的库存
    updateStatusPanel("Deposited coins!");
    showCacheDetails(cache);
    refreshPopupContent(cache);
  } else {
    updateStatusPanel("No coins to deposit!");
  }
}

// 刷新弹出内容
function refreshPopupContent(cache: Cache) {
  const marker = L.marker([cache.lat, cache.lng]).addTo(map);
  marker.bindPopup(`
        <div>Coins: ${cache.coins.length}</div>
        <button onclick="collectCoins(${cache.lat}, ${cache.lng})">Collect</button>
        <button onclick="depositCoins(${cache.lat}, ${cache.lng})">Deposit</button>
    `).openPopup();
}

// 更新玩家附近可见的缓存
function updateVisibleCaches() {
  map.eachLayer((layer: L.Layer) => {
    if (layer instanceof L.Marker && layer !== playerMarker) {
      map.removeLayer(layer);
    }
  });

  const nearbyCaches = cacheManager.getCachesNear(currentPlayerLocation.lat, currentPlayerLocation.lng, 8);
  nearbyCaches.forEach((cache) => {
    if (cache) {
      const marker = L.marker([cache.lat, cache.lng]).addTo(map);
      marker.bindPopup(`
                <div>Coins: ${cache.coins.length}</div>
                <button onclick="collectCoins(${cache.lat}, ${cache.lng})">Collect</button>
                <button onclick="depositCoins(${cache.lat}, ${cache.lng})">Deposit</button>
            `);
      marker.on("click", () => showCacheDetails(cache));
    }
  });
}

// 移动玩家
function movePlayer(direction: "north" | "south" | "east" | "west") {
  switch (direction) {
    case "north":
      currentPlayerLocation.lat += GRID_SIZE;
      break;
    case "south":
      currentPlayerLocation.lat -= GRID_SIZE;
      break;
    case "east":
      currentPlayerLocation.lng += GRID_SIZE;
      break;
    case "west":
      currentPlayerLocation.lng -= GRID_SIZE;
      break;
  }

  playerMarker.setLatLng([currentPlayerLocation.lat, currentPlayerLocation.lng]);
  playerMarker.openPopup();
  updateVisibleCaches();
}

// 运动按钮的事件监听器
document.getElementById("north")?.addEventListener("click", () => movePlayer("north"));
document.getElementById("south")?.addEventListener("click", () => movePlayer("south"));
document.getElementById("east")?.addEventListener("click", () => movePlayer("east"));
document.getElementById("west")?.addEventListener("click", () => movePlayer("west"));

// 辅助函数
function updateStatusPanel(message: string) {
  const statusPanel = document.getElementById("statusPanel");
  if (statusPanel) {
    statusPanel.innerText = message;
  }
}

let isAutoUpdating = false;
let watchId: number | null = null;

// 启用或禁用自动地理定位
function toggleGeolocation() {
  if (isAutoUpdating) {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    isAutoUpdating = false;
    updateStatusPanel("Geolocation updates disabled.");
  } else {
    if (!navigator.geolocation) {
      updateStatusPanel("Geolocation is not supported by your browser.");
      return;
    }
    watchId = navigator.geolocation.watchPosition(
      (position) => {
        currentPlayerLocation.lat = position.coords.latitude;
        currentPlayerLocation.lng = position.coords.longitude;
        movePlayerToLocation(currentPlayerLocation.lat, currentPlayerLocation.lng);
        updateStatusPanel("Geolocation updates enabled.");
      },
      (error) => {
        updateStatusPanel(`Geolocation error: ${error.message}`);
      },
    );
    isAutoUpdating = true;
  }
}

document.getElementById("geolocation")?.addEventListener("click", () => {
  console.log("Geolocation button clicked!");
  toggleGeolocation();
});

// 移动玩家到特定位置
function movePlayerToLocation(lat: number, lng: number) {
  currentPlayerLocation.lat = lat;
  currentPlayerLocation.lng = lng;
  playerMarker.setLatLng([lat, lng]);
  updateVisibleCaches();
  renderMovementHistory();
}

// 保存游戏状态到 localStorage
function saveGameState() {
  const state = {
    playerLocation: currentPlayerLocation,
    caches: Array.from(cacheManager["caches"].entries()).map(([key, cache]) => ({
      key,
      lat: cache.lat,
      lng: cache.lng,
      coins: cache.coins,
    })),
  };
  localStorage.setItem("gameState", JSON.stringify(state));
}

interface CacheData {
  key: string;
  lat: number;
  lng: number;
  coins: Coin[];
}

// 从 localStorage 加载游戏状态
function loadGameState() {
  const savedState = localStorage.getItem("gameState");
  if (savedState) {
    const state = JSON.parse(savedState);
    currentPlayerLocation = state.playerLocation;
    state.caches.forEach((cacheData: CacheData) => {
      const cache = new Cache(cacheData.lat, cacheData.lng, cacheData.coins); // 使用 Cache 类
      cacheManager["caches"].set(cacheData.key, cache);
    });
    movePlayerToLocation(currentPlayerLocation.lat, currentPlayerLocation.lng);
  }
}

window.addEventListener("load", loadGameState);
window.addEventListener("beforeunload", saveGameState);

let movementHistory: L.LatLng[] = [];
let movementPolyline: L.Polyline | null = null;

// 将运动历史渲染为折线
function renderMovementHistory() {
  movementHistory.push(L.latLng(currentPlayerLocation.lat, currentPlayerLocation.lng));
  if (movementPolyline) {
    map.removeLayer(movementPolyline);
  }
  movementPolyline = L.polyline(movementHistory, { color: "blue" }).addTo(map);
}

// 重置游戏状态
function resetGameState() {
  const confirmation = prompt(
    "Are you sure you want to reset the game? This will erase all progress and location history. (Yes/No)",
  );
  if (confirmation && confirmation.toLowerCase() === "yes") {
    movementHistory = [];
    if (movementPolyline) map.removeLayer(movementPolyline);
    movementPolyline = null;

    cacheManager["caches"].clear();
    updateVisibleCaches();

    movePlayerToLocation(playerInitialLocation.lat, playerInitialLocation.lng);

    localStorage.removeItem("gameState");

    updateStatusPanel("Game state has been reset.");
  }
}

// 🚮 按钮的事件监听器
document.getElementById("reset")?.addEventListener("click", resetGameState);

// 将地图中心定位到金币的主缓存
function centerMapOnCoin(coin: Coin) {
  const cache = cacheManager.getCache(coin.i * GRID_SIZE, coin.j * GRID_SIZE);
  if (cache) {
    map.setView([cache.lat, cache.lng], 15);
    updateStatusPanel(`Centered on cache: i=${coin.i}, j=${coin.j}`);
  }
}

// 更新缓存详情以包括可点击的金币标识符
function showCacheDetails(cache: Cache) {
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

// 将函数暴露到全局作用域，以便在 HTML 中的 `onclick` 事件中调用
(window as any).centerMapOnCoin = centerMapOnCoin;
(window as any).collectCoins = collectCoins;
(window as any).depositCoins = depositCoins;
