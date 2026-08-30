// In-memory replacement for expo-sqlite's OPFS-backed AccessHandlePoolVFS.
//
// expo-sqlite's SQLite Web Worker unconditionally instantiates
// AccessHandlePoolVFS (the persistent VFS) on startup, even for ':memory:'
// databases (see node_modules/expo-sqlite/web/worker.ts maybeInitAsync).
// AccessHandlePoolVFS opens exclusive OPFS "sync access handles" and holds
// them for the lifetime of the worker. Because those handles lock files
// per-origin, a second tab opening the same PWA simultaneously cannot
// acquire them: its worker fails to start and the app shows "Database Error".
//
// This app only ever opens ':memory:' databases on web (see
// dictionaryService.initializeWeb), so the persistent VFS is never used.
// Swapping it for the in-memory VFS — same FacadeVFS base class and the same
// static create(name, module) signature — removes all OPFS access while
// keeping the SQLite engine and worker behaviour identical.
//
// The bare import below is resolved to the physical MemoryVFS file by
// metro.config.js (expo-sqlite's "exports" map does not expose deep paths).
import { MemoryVFS } from 'expo-sqlite/web/wa-sqlite/MemoryVFS';

export class AccessHandlePoolVFS {
  static async create(name, module) {
    return MemoryVFS.create(name, module);
  }
}