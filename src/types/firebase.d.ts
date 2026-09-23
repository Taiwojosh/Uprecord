// Ambient type definitions for Firebase SDK modules
declare module 'firebase/app' {
  export function initializeApp(config: any): any;
}

declare module 'firebase/auth' {
  export function getAuth(app?: any): any;
  export function signInAnonymously(auth: any): Promise<any>;
}

declare module 'firebase/firestore' {
  export function getFirestore(app?: any, databaseId?: string): any;
  export function doc(firestore: any, collection: string, ...pathSegments: string[]): any;
  export function setDoc(docRef: any, data: any): Promise<void>;
}
