export interface Document {
  id: string;
  name: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface StorageState {
  documents: Document[];
  activeDocumentId: string | null;
}

let storageState: StorageState = getDefaultState();

const STORAGE_KEY = 'mermaid-sequence-diagrams';

export function loadStorageState(): StorageState {
  if (typeof window === 'undefined' || !window.localStorage) {
    return storageState;
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    const state: StorageState = JSON.parse(stored);
    // Validate the state structure
    if (state.documents && Array.isArray(state.documents)) {
      storageState = state;
    }
  }

  return storageState;
}

function saveStorageState(state: StorageState): void {
  storageState = state;

  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function buildDocument(name: string, content?: string): Document {
  const now = Date.now();
  const newDoc: Document = {
    id: generateId(),
    name,
    content:
      content ||
      `sequenceDiagram\n    participant Alice\n    participant Bob\n    Alice->>Bob: Hello Bob, how are you?\n    Bob-->>Alice: I am good thanks!`,
    createdAt: now,
    updatedAt: now,
  };
  return newDoc;
}

export function createDocument(name: string, content?: string): void {
  const newDoc = buildDocument(name, content);
  const newState = { ...storageState };
  newState.activeDocumentId = newDoc.id;
  newState.documents = [...newState.documents, newDoc];
  saveStorageState(newState);
}

export function updateDocument(updatedDocument: Document): void {
  const newState = { ...storageState };
  newState.documents = newState.documents.map((document) => {
    if (document.id == updatedDocument.id) {
      return {
        ...document,
        ...updatedDocument,
        updatedAt: Date.now(),
      };
    }
    return document;
  });
  saveStorageState(newState);
}

export function updateActiveDocument(documentId: string): void {
  if (!storageState.documents.some((document) => document.id === documentId)) {
    throw new Error(`No document with id ${documentId}`);
  }

  const newState = { ...storageState };
  newState.activeDocumentId = documentId;
  saveStorageState(newState);
}

export function deleteDocument(documentId: string): void {
  if (!storageState.documents.some((document) => document.id === documentId)) {
    throw new Error(`No document with id ${documentId}`);
  }
  if (storageState.documents.length === 1) {
    throw new Error('cannot remove the last document');
  }

  const newState = { ...storageState };
  newState.documents = newState.documents.filter((document) => document.id !== documentId);
  if (newState.activeDocumentId === documentId) {
    newState.activeDocumentId = newState.documents[0].id;
  }
  saveStorageState(newState);
}

function generateId(): string {
  return `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getDefaultState(): StorageState {
  const defaultDoc = buildDocument('Untitled Diagram');
  return {
    documents: [defaultDoc],
    activeDocumentId: defaultDoc.id,
  };
}
