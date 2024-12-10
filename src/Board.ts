// Board.ts
import { IBoard, Cell } from "./interfaces";
import { GRID_SIZE } from "./constants";

export class Board implements IBoard {
  private readonly knownCells: Map<string, Cell> = new Map();

  private latLngToCell(lat: number, lng: number): Cell {
    const i = Math.floor(lat / GRID_SIZE);
    const j = Math.floor(lng / GRID_SIZE);
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
