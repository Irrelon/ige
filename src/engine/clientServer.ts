/// <reference lib="webworker" />

export const isWorker = typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope
export const isServer = typeof window === 'undefined' && !isWorker;
export const isClient = !isServer;
