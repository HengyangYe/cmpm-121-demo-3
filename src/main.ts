import L from 'leaflet';
import "./style.css";
import "leaflet/dist/leaflet.css";
import "./leafletWorkaround.ts";
//
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

// Generate cache locations
const gridSize = 0.0001;

function generateCaches(playerLocation: { lat: number; lng: number }, steps: number, density: number): Cache[] {
    const caches: Cache[] = [];  // Explicitly type the caches array
    for (let i = -steps; i <= steps; i++) {
        for (let j = -steps; j <= steps; j++) {
            if (Math.random() < density) {
                const lat = playerLocation.lat + i * gridSize;
                const lng = playerLocation.lng + j * gridSize;
                caches.push({
                    lat,
                    lng,
                    coins: Math.floor(Math.random() * 10) + 1  // Random number of coins
                });
            }
        }
    }
    return caches;
}


// Player inventory to track collected coins
let playerInventory = 0;

// Function to generate caches with random coin counts
type Cache = { lat: number; lng: number; coins: number };
const cacheLocations: Cache[] = generateCaches(playerInitialLocation, 8, 0.1);

// Function to collect coins from a cache
function collectCoins(lat: number, lng: number) {
    const cache = cacheLocations.find(c => c.lat === lat && c.lng === lng);
    if (cache && cache.coins > 0) {
        playerInventory += cache.coins;
        cache.coins = 0;  // All coins collected
        updateStatusPanel(`Collected coins! Inventory: ${playerInventory}`);
        showCacheDetails(cache); // Refresh cacheDetailPanel
        refreshPopupContent(cache);
    } else {
        updateStatusPanel("No coins to collect here!");
    }
}

function depositCoins(lat: number, lng: number) {
    const cache = cacheLocations.find(c => c.lat === lat && c.lng === lng);
    if (cache && playerInventory > 0) {
        cache.coins += playerInventory;
        playerInventory = 0;  // All coins deposited 
        updateStatusPanel("Deposited coins!");
        showCacheDetails(cache); // Refresh cacheDetailPanel
        refreshPopupContent(cache);
    } else {
        updateStatusPanel("No coins to deposit!");
    }
}

// Function to update the popup content after collecting or depositing
function refreshPopupContent(cache: Cache) {
    // Find the corresponding marker for the cache
    const marker = L.marker([cache.lat, cache.lng]).addTo(map);
    
    // Update the popup with new coin count
    marker.bindPopup(`
        <div>Coins: ${cache.coins}</div>
        <button onclick="collectCoins(${cache.lat}, ${cache.lng})">Collect</button>
        <button onclick="depositCoins(${cache.lat}, ${cache.lng})">Deposit</button>
    `).openPopup();  // Opens the updated popup immediately
}

// Add cache markers to the map
cacheLocations.forEach(cache => {
    const marker = L.marker([cache.lat, cache.lng]).addTo(map);
    marker.bindPopup(`
        <div>Coins: ${cache.coins}</div>
        <button onclick="collectCoins(${cache.lat}, ${cache.lng})">Collect</button>
        <button onclick="depositCoins(${cache.lat}, ${cache.lng})">Deposit</button>
    `);
});

// Helper function to update status panel messages
function updateStatusPanel(message: string) {
    const statusPanel = document.getElementById('statusPanel');
    if (statusPanel) {
        statusPanel.innerText = message;
    }
}

// Ensure that collectCoins and depositCoins functions are globally accessible
(window as any).collectCoins = collectCoins;
(window as any).depositCoins = depositCoins;

// Assume cacheDetailPanel is defined in your HTML
const cacheDetailPanel = document.getElementById('cacheDetailPanel');

// Function to show cache details in cacheDetailPanel
function showCacheDetails(cache: Cache) {
    if (cacheDetailPanel) {
        cacheDetailPanel.innerHTML = `
            <h3>Cache Details</h3>
            <p>Coins: ${cache.coins}</p>
            <button onclick="collectCoins(${cache.lat}, ${cache.lng})">Collect</button>
            <button onclick="depositCoins(${cache.lat}, ${cache.lng})">Deposit</button>
        `;
        cacheDetailPanel.style.display = 'block';
    }
}

// Add cache markers to the map with a click event to show details
cacheLocations.forEach(cache => {
    const marker = L.marker([cache.lat, cache.lng]).addTo(map);
    marker.bindPopup(`
        <div>Coins: ${cache.coins}</div>
        <button onclick="collectCoins(${cache.lat}, ${cache.lng})">Collect</button>
        <button onclick="depositCoins(${cache.lat}, ${cache.lng})">Deposit</button>
    `);
    
    // Show cache details in panel when marker is clicked
    marker.on('click', () => showCacheDetails(cache));
});

// Close the cacheDetailPanel when clicking outside of a cache marker
map.on('click', () => {
    if (cacheDetailPanel) {
        cacheDetailPanel.style.display = 'none';
    }
});
