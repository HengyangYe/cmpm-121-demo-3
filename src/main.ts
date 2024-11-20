import L from 'leaflet';
import "./style.css";
import "leaflet/dist/leaflet.css";
import "./leafletWorkaround.ts";

// Player's initial location at Oakes College
const playerInitialLocation = { lat: 36.9895, lng: -122.0628 };  // 36°59'22.2"N 122°03'46.0"W

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

class Board {
    private readonly knownCells: Map<string, Cell> = new Map();

    // Convert latitude/longitude to grid cell
    private latLngToCell(lat: number, lng: number): Cell {
        const i = Math.floor(lat / gridSize);
        const j = Math.floor(lng / gridSize);
        return { i, j };
    }

    // Get canonical grid cell (ensures Flyweight pattern)
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

// Generate cache locations
type Cache = { lat: number; lng: number; coins: Coin[] };  // Cache contains coins
interface Coin {
    i: number; j: number; serial: number;
}

function createCoinsForCache(lat: number, lng: number, count: number): Coin[] {
    const cell = board.getCanonicalCell(lat, lng);
    const coins: Coin[] = [];
    for (let serial = 0; serial < count; serial++) {
        coins.push({ i: cell.i, j: cell.j, serial });
    }
    return coins;
}

function generateCaches(playerLocation: { lat: number; lng: number }, steps: number, density: number): Cache[] {
    const caches: Cache[] = [];
    for (let i = -steps; i <= steps; i++) {
        for (let j = -steps; j <= steps; j++) {
            if (Math.random() < density) {
                const lat = playerLocation.lat + i * gridSize;
                const lng = playerLocation.lng + j * gridSize;
                const coins = createCoinsForCache(lat, lng, Math.floor(Math.random() * 5) + 1); // 1-5 coins
                caches.push({ lat, lng, coins });
            }
        }
    }
    return caches;
}

// Player inventory to track collected coins
let playerInventory: Coin[] = [];

// Function to collect coins from a cache
function collectCoins(lat: number, lng: number) {
    const cache = cacheLocations.find(c => c.lat === lat && c.lng === lng);
    if (cache && cache.coins.length > 0) {
        playerInventory = playerInventory.concat(cache.coins);
        cache.coins = [];  // All coins collected
        updateStatusPanel(`Collected coins! Inventory: ${playerInventory.length}`);
        showCacheDetails(cache); // Refresh cacheDetailPanel
        refreshPopupContent(cache);
    } else {
        updateStatusPanel("No coins to collect here!");
    }
}

// Function to deposit coins into a cache
function depositCoins(lat: number, lng: number) {
    const cache = cacheLocations.find(c => c.lat === lat && c.lng === lng);
    if (cache && playerInventory.length > 0) {
        cache.coins = cache.coins.concat(playerInventory);
        playerInventory = [];  // All coins deposited 
        updateStatusPanel("Deposited coins!");
        showCacheDetails(cache); // Refresh cacheDetailPanel
        refreshPopupContent(cache);
    } else {
        updateStatusPanel("No coins to deposit!");
    }
}

// Refresh map popup window contents
function refreshPopupContent(cache: Cache) {
    const marker = L.marker([cache.lat, cache.lng]).addTo(map); // Update the corresponding markers
    marker.bindPopup(`
        <div>Coins: ${cache.coins.length}</div>
        <button onclick="collectCoins(${cache.lat}, ${cache.lng})">Collect</button>
        <button onclick="depositCoins(${cache.lat}, ${cache.lng})">Deposit</button>
    `).openPopup(); // Refresh and open a new popup window
}

// Add cache markers to the map
const cacheLocations: Cache[] = generateCaches(playerInitialLocation, 8, 0.1);

cacheLocations.forEach(cache => {
    const marker = L.marker([cache.lat, cache.lng]).addTo(map);
    marker.bindPopup(`
        <div>Coins: ${cache.coins.length}</div>
        <button onclick="collectCoins(${cache.lat}, ${cache.lng})">Collect</button>
        <button onclick="depositCoins(${cache.lat}, ${cache.lng})">Deposit</button>
    `);

    // Show cache details in panel when marker is clicked
    marker.on('click', () => showCacheDetails(cache));
});

// Update cacheDetailPanel
function showCacheDetails(cache: Cache) {
    if (cacheDetailPanel) {
        // Shows cache coordinates and coin details
        cacheDetailPanel.innerHTML = `
            <h3>Cache Details</h3>
            <p><strong>Coordinates:</strong> i=${cache.coins.length > 0 ? cache.coins[0].i : 'N/A'}, j=${cache.coins.length > 0 ? cache.coins[0].j : 'N/A'}</p>
            <p><strong>Coins:</strong> ${cache.coins.length > 0 
                ? cache.coins.map(coin => `${coin.i}:${coin.j}#${coin.serial}`).join(', ') 
                : 'No coins'}</p>
            <button onclick="collectCoins(${cache.lat}, ${cache.lng})">Collect</button>
            <button onclick="depositCoins(${cache.lat}, ${cache.lng})">Deposit</button>
        `;
        cacheDetailPanel.style.display = 'block'; // Popup Panel
    }
}


// Helper function to update status panel messages
function updateStatusPanel(message: string) {
    const statusPanel = document.getElementById('statusPanel');
    if (statusPanel) {
        statusPanel.innerText = message;
    }
}

// Ensure collectCoins and depositCoins are globally accessible
(window as any).collectCoins = collectCoins;
(window as any).depositCoins = depositCoins;

// Cache detail panel element
const cacheDetailPanel = document.getElementById('cacheDetailPanel');

// Hide cacheDetailPanel when clicking outside
map.on('click', () => {
    if (cacheDetailPanel) {
        cacheDetailPanel.style.display = 'none';
    }
});
