import L from 'leaflet';
import "./style.css";
import "leaflet/dist/leaflet.css";
import "./leafletWorkaround.ts";

// Player's initial location at Oakes College
const playerInitialLocation = { lat: 36.9895, lng: -122.0628 };  // 36°59'22.2"N 122°03'46.0"W
let currentPlayerLocation = { ...playerInitialLocation }; // Track player's current position

// Create the map
const map = L.map('map').setView([playerInitialLocation.lat, playerInitialLocation.lng], 15);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
}).addTo(map);

// Player marker
const playerMarker = L.marker([playerInitialLocation.lat, playerInitialLocation.lng]).addTo(map)
    .bindPopup('You are here!')
    .openPopup();

// Grid and Flyweight pattern setup
const gridSize = 0.0001;  // Each grid cell's width/height
interface Cell {
    i: number;  // Grid cell row
    j: number;  // Grid cell column
}

// Flyweight Board for Cells
class Board {
    private readonly knownCells: Map<string, Cell> = new Map();

    private latLngToCell(lat: number, lng: number): Cell {
        const i = Math.floor(lat / gridSize);
        const j = Math.floor(lng / gridSize);
        return { i, j };
    }

    public getCanonicalCell(lat: number, lng: number): Cell {
        const cell = this.latLngToCell(lat, lng);
        const key = `${cell.i},${cell.j}`;
        if (!this.knownCells.has(key)) {
            this.knownCells.set(key, cell);
        }
        return this.knownCells.get(key)!;
    }
}

const board = new Board();

// Cache and Memento setup
type Coin = { i: number; j: number; serial: number };
class Cache {
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

class CacheManager {
    private readonly caches: Map<string, Cache> = new Map();
    private readonly mementos: Map<string, string> = new Map();

    public getCache(lat: number, lng: number): Cache | null {
        const cell = board.getCanonicalCell(lat, lng);
        const key = `${cell.i},${cell.j}`;

        // If the cache already exists, return it
        if (this.caches.has(key)) {
            return this.caches.get(key)!;
        }

        if (Math.random() < 0.1) {
            const coins = createCoinsForCache(lat, lng, Math.floor(Math.random() * 5) + 1);
            const cache = new Cache(lat, lng, coins);
            this.caches.set(key, cache);
            return cache;
        }

        return null;
    }

    public restoreCacheState(lat: number, lng: number): void {
        const cell = board.getCanonicalCell(lat, lng);
        const key = `${cell.i},${cell.j}`;
        const memento = this.mementos.get(key);
        if (memento && this.caches.has(key)) {
            this.caches.get(key)!.fromMemento(memento);
        }
    }

    public getCachesNear(lat: number, lng: number, radius: number): Cache[] {
        const result: Cache[] = [];
        for (let i = -radius; i <= radius; i++) {
            for (let j = -radius; j <= radius; j++) {
                const nearbyLat = lat + i * gridSize;
                const nearbyLng = lng + j * gridSize;
                const cache = this.getCache(nearbyLat, nearbyLng);

                // Only add non-null caches to the result
                if (cache !== null) {
                    result.push(cache);
                }
            }
        }
        return result;
    }
}

const cacheManager = new CacheManager();

function createCoinsForCache(lat: number, lng: number, count: number): Coin[] {
    const cell = board.getCanonicalCell(lat, lng);
    const coins: Coin[] = [];
    for (let serial = 0; serial < count; serial++) {
        coins.push({ i: cell.i, j: cell.j, serial });
    }
    return coins;
}

// Player inventory to track collected coins
let playerInventory: Coin[] = [];

// Collect coins from cache
function collectCoins(lat: number, lng: number) {
    const cache = cacheManager.getCache(lat, lng);
    if (cache && cache.coins.length > 0) {
        playerInventory = playerInventory.concat(cache.coins);
        cache.coins = []; // Clear coins from cache
        updateStatusPanel(`Collected coins! Inventory: ${playerInventory.length}`);
        showCacheDetails(cache);
        refreshPopupContent(cache);
    } else {
        updateStatusPanel("No coins to collect here!");
    }
}

// Deposit coins into cache
function depositCoins(lat: number, lng: number) {
    const cache = cacheManager.getCache(lat, lng);
    if (cache && playerInventory.length > 0) {
        cache.coins = cache.coins.concat(playerInventory);
        playerInventory = []; // Clear player's inventory
        updateStatusPanel("Deposited coins!");
        showCacheDetails(cache);
        refreshPopupContent(cache);
    } else {
        updateStatusPanel("No coins to deposit!");
    }
}

// Refresh popup content
function refreshPopupContent(cache: Cache) {
    const marker = L.marker([cache.lat, cache.lng]).addTo(map);
    marker.bindPopup(`
        <div>Coins: ${cache.coins.length}</div>
        <button onclick="collectCoins(${cache.lat}, ${cache.lng})">Collect</button>
        <button onclick="depositCoins(${cache.lat}, ${cache.lng})">Deposit</button>
    `).openPopup();
}

// Update visible caches near the player
function updateVisibleCaches() {
    map.eachLayer((layer: any) => {
        if (layer instanceof L.Marker && layer !== playerMarker) {
            map.removeLayer(layer);
        }
    });

    const nearbyCaches = cacheManager.getCachesNear(currentPlayerLocation.lat, currentPlayerLocation.lng, 8);
    nearbyCaches.forEach(cache => {
        if (cache) { 
            const marker = L.marker([cache.lat, cache.lng]).addTo(map);
            marker.bindPopup(`
                <div>Coins: ${cache.coins.length}</div>
                <button onclick="collectCoins(${cache.lat}, ${cache.lng})">Collect</button>
                <button onclick="depositCoins(${cache.lat}, ${cache.lng})">Deposit</button>
            `);
            marker.on('click', () => showCacheDetails(cache));
        }
    });
}

// Move the player
function movePlayer(direction: 'north' | 'south' | 'east' | 'west') {
    switch (direction) {
        case 'north': currentPlayerLocation.lat += gridSize; break;
        case 'south': currentPlayerLocation.lat -= gridSize; break;
        case 'east': currentPlayerLocation.lng += gridSize; break;
        case 'west': currentPlayerLocation.lng -= gridSize; break;
    }

    playerMarker.setLatLng([currentPlayerLocation.lat, currentPlayerLocation.lng]);
    playerMarker.openPopup();
    updateVisibleCaches();
}

// Event listeners for movement buttons
document.getElementById('north')?.addEventListener('click', () => movePlayer('north'));
document.getElementById('south')?.addEventListener('click', () => movePlayer('south'));
document.getElementById('east')?.addEventListener('click', () => movePlayer('east'));
document.getElementById('west')?.addEventListener('click', () => movePlayer('west'));

// Helper functions
function updateStatusPanel(message: string) {
    const statusPanel = document.getElementById('statusPanel');
    if (statusPanel) {
        statusPanel.innerText = message;
    }
}

let isAutoUpdating = false;
let watchId: number | null = null;

// Enable or disable automatic geolocation 
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
            position => {
                currentPlayerLocation.lat = position.coords.latitude;
                currentPlayerLocation.lng = position.coords.longitude;
                movePlayerToLocation(currentPlayerLocation.lat, currentPlayerLocation.lng);
                updateStatusPanel("Geolocation updates enabled.");
            },
            error => {
                updateStatusPanel(`Geolocation error: ${error.message}`);
            }
        );
        isAutoUpdating = true;
    }
}

document.getElementById('geolocation')?.addEventListener('click', () => {
    console.log("Geolocation button clicked!");
    toggleGeolocation();
});

// Move the player to a specific location
function movePlayerToLocation(lat: number, lng: number) {
    currentPlayerLocation.lat = lat;
    currentPlayerLocation.lng = lng;
    playerMarker.setLatLng([lat, lng]);
    updateVisibleCaches();
    renderMovementHistory();
}

// Add event listener for 🌐 button
document.getElementById('geolocation')?.addEventListener('click', toggleGeolocation);

// Save game state to localStorage
function saveGameState() {
    const state = {
        playerLocation: currentPlayerLocation,
        caches: Array.from(cacheManager['caches'].entries()).map(([key, cache]) => ({
            key,
            lat: cache.lat,
            lng: cache.lng,
            coins: cache.coins,
        })),
    };
    localStorage.setItem('gameState', JSON.stringify(state));
}

// Load game state from localStorage
function loadGameState() {
    const savedState = localStorage.getItem('gameState');
    if (savedState) {
        const state = JSON.parse(savedState);
        currentPlayerLocation = state.playerLocation;
        state.caches.forEach((cacheData: any) => {
            const cache = new Cache(cacheData.lat, cacheData.lng, cacheData.coins);
            cacheManager['caches'].set(cacheData.key, cache);
        });
        movePlayerToLocation(currentPlayerLocation.lat, currentPlayerLocation.lng);
    }
}

window.addEventListener('load', loadGameState);
window.addEventListener('beforeunload', saveGameState);

let movementHistory: L.LatLng[] = [];
let movementPolyline: L.Polyline | null = null;

// Render movement history as a polyline
function renderMovementHistory() {
    movementHistory.push(L.latLng(currentPlayerLocation.lat, currentPlayerLocation.lng));
    if (movementPolyline) {
        map.removeLayer(movementPolyline);
    }
    movementPolyline = L.polyline(movementHistory, { color: 'blue' }).addTo(map);
}

// Reset game state
function resetGameState() {
    const confirmation = prompt("Are you sure you want to reset the game? This will erase all progress and location history. (Yes/No)");
    if (confirmation && confirmation.toLowerCase() === 'yes') {
        movementHistory = [];
        if (movementPolyline) map.removeLayer(movementPolyline);
        movementPolyline = null;

        cacheManager['caches'].clear();
        updateVisibleCaches();

        movePlayerToLocation(playerInitialLocation.lat, playerInitialLocation.lng);

        localStorage.removeItem('gameState');

        updateStatusPanel("Game state has been reset.");
    }
}

// Add event listener for 🚮 button
document.getElementById('reset')?.addEventListener('click', resetGameState);

// Center the map on a coin's home cache
function centerMapOnCoin(coin: Coin) {
    const cache = cacheManager.getCache(coin.i * gridSize, coin.j * gridSize);
    if (cache) {
        map.setView([cache.lat, cache.lng], 15);
        updateStatusPanel(`Centered on cache: i=${coin.i}, j=${coin.j}`);
    }
}

// Update cache details to include clickable coin identifiers
function showCacheDetails(cache: Cache) {
    const cacheDetailPanel = document.getElementById('cacheDetailPanel');
    if (cacheDetailPanel) {
        cacheDetailPanel.innerHTML = `
            <h3>Cache Details</h3>
            <p><strong>Coordinates:</strong> i=${cache.coins[0]?.i || 'N/A'}, j=${cache.coins[0]?.j || 'N/A'}</p>
            <p><strong>Coins:</strong> ${
                cache.coins.length > 0 
                    ? cache.coins.map(coin => `<span class="coin-link" onclick="centerMapOnCoin(${JSON.stringify(coin)})">${coin.i}:${coin.j}#${coin.serial}</span>`).join(', ')
                    : 'No coins'
            }</p>
        `;
        cacheDetailPanel.style.display = 'block';
    }
}

(window as any).centerMapOnCoin = centerMapOnCoin;
(window as any).collectCoins = collectCoins;
(window as any).depositCoins = depositCoins;
