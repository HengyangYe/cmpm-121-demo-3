// main.ts
import L from "leaflet";
import "./style.css";
import "leaflet/dist/leaflet.css";
import "./leafletWorkaround.ts";
import { Board } from "./Board";
import { CacheManager, Cache } from "./CacheManager"; 
import { Coin } from "./interfaces";
import { GRID_SIZE } from "./constants";
import { GameLogic } from "./GameLogic";
import { UIManager } from "./UIManager";

// Player's initial location at Oakes College
const playerInitialLocation = { lat: 36.9895, lng: -122.0628 }; // 36°59'22.2"N 122°03'46.0"W

const map = L.map("map").setView([playerInitialLocation.lat, playerInitialLocation.lng], 15);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
}).addTo(map);

// Initialize the Board and CacheManager, using dependency injection.
const board = new Board();
const cacheManager = new CacheManager(board);

// Initialize GameLogic
const gameLogic = new GameLogic(cacheManager, playerInitialLocation);

// Initialize the UIManager
const uiManager = new UIManager(map, gameLogic, playerInitialLocation);

// Event listener for motion buttons
document.getElementById("north")?.addEventListener("click", () => {
  gameLogic.movePlayer("north");
  const newLocation = gameLogic.getPlayerLocation();
  uiManager.updatePlayerPosition(newLocation);
});

document.getElementById("south")?.addEventListener("click", () => {
  gameLogic.movePlayer("south");
  const newLocation = gameLogic.getPlayerLocation();
  uiManager.updatePlayerPosition(newLocation);
});

document.getElementById("east")?.addEventListener("click", () => {
  gameLogic.movePlayer("east");
  const newLocation = gameLogic.getPlayerLocation();
  uiManager.updatePlayerPosition(newLocation);
});

document.getElementById("west")?.addEventListener("click", () => {
  gameLogic.movePlayer("west");
  const newLocation = gameLogic.getPlayerLocation();
  uiManager.updatePlayerPosition(newLocation);
});

// Enable or disable automatic geolocation
let isAutoUpdating = false;
let watchId: number | null = null;

function toggleGeolocation() {
  if (isAutoUpdating) {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    isAutoUpdating = false;
    uiManager.updateStatusPanel("Geolocation updates disabled.");
  } else {
    if (!navigator.geolocation) {
      uiManager.updateStatusPanel("Geolocation is not supported by your browser.");
      return;
    }
    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
        gameLogic.movePlayerToLocation(newLocation.lat, newLocation.lng);
        uiManager.updatePlayerPosition(newLocation);
        uiManager.updateStatusPanel("Geolocation updates enabled.");
      },
      (error) => {
        uiManager.updateStatusPanel(`Geolocation error: ${error.message}`);
      },
    );
    isAutoUpdating = true;
  }
}

document.getElementById("geolocation")?.addEventListener("click", () => {
  console.log("Geolocation button clicked!");
  toggleGeolocation();
});

// Save game state to localStorage
function saveGameState() {
  const state = {
    playerLocation: gameLogic.getPlayerLocation(),
    caches: Array.from(cacheManager.caches.entries()).map(([key, cache]: [string, Cache]) => ({
      key,
      lat: cache.lat,
      lng: cache.lng,
      coins: cache.coins,
    })),
  };
  localStorage.setItem("gameState", JSON.stringify(state));
}

// Load game state from localStorage
function loadGameState() {
  const savedState = localStorage.getItem("gameState");
  if (savedState) {
    const state = JSON.parse(savedState);
    gameLogic.movePlayerToLocation(state.playerLocation.lat, state.playerLocation.lng);
    state.caches.forEach((cacheData: { key: string; lat: number; lng: number; coins: Coin[] }) => {
      const cache = new Cache(cacheData.lat, cacheData.lng, cacheData.coins);
      cacheManager.caches.set(cacheData.key, cache);
    });
    const newLocation = gameLogic.getPlayerLocation();
    uiManager.updatePlayerPosition(newLocation);
  }
}

window.addEventListener("load", loadGameState);
window.addEventListener("beforeunload", saveGameState);

function resetGameState() {
  const confirmation = prompt(
    "Are you sure you want to reset the game? This will erase all progress and location history. (Yes/No)",
  );
  if (confirmation && confirmation.toLowerCase() === "yes") {
    if (uiManager) {
      uiManager.resetMovementHistory();
    }

    cacheManager.caches.clear();

    // Move the player to the initial position
    gameLogic.movePlayerToLocation(playerInitialLocation.lat, playerInitialLocation.lng);
    uiManager.updatePlayerPosition(playerInitialLocation);

    // clear localStorage
    localStorage.removeItem("gameState");

    // Update Status Panel
    uiManager.updateStatusPanel("Game state has been reset.");
  }
}

document.getElementById("reset")?.addEventListener("click", resetGameState);
