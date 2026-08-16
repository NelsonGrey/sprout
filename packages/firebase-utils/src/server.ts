// Firebase Server-Side Utilities (Admin SDK)
import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue, DocumentReference, Query, WhereFilterOp } from 'firebase-admin/firestore';

/**
 * Firestore CRUD helpers for Firebase Functions (Server-side)
 */
export class FirestoreCrudHelpers {
  private static getDb() {
    // Initialize admin if not already done
    if (!getApps().length) {
      initializeApp();
    }
    return getFirestore();
  }

  /**
   * Create a document with standard metadata
   */
  static async createDocument(
    collection: string,
    data: any,
    userId: string,
    options?: { id?: string; merge?: boolean }
  ): Promise<{ id: string; data: any }> {
    const db = this.getDb();
    const documentData = {
      ...data,
      createdBy: userId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    let docRef: DocumentReference;
    if (options?.id) {
      docRef = db.collection(collection).doc(options.id);
      if (options?.merge) {
        await docRef.set(documentData, { merge: true });
      } else {
        await docRef.set(documentData);
      }
    } else {
      docRef = await db.collection(collection).add(documentData);
    }

    return {
      id: docRef.id,
      data: { ...documentData, id: docRef.id }
    };
  }

  /**
   * Get a document by ID
   */
  static async getDocument(collection: string, documentId: string): Promise<any | null> {
    const db = this.getDb();
    const doc = await db.collection(collection).doc(documentId).get();
    if (!doc.exists) {
      return null;
    }
    return { id: doc.id, ...doc.data() };
  }

  /**
   * Update a document
   */
  static async updateDocument(
    collection: string,
    documentId: string,
    data: any,
    options?: { merge?: boolean }
  ): Promise<void> {
    const db = this.getDb();
    const updateData = {
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (options?.merge) {
      await db.collection(collection).doc(documentId).set(updateData, { merge: true });
    } else {
      await db.collection(collection).doc(documentId).update(updateData);
    }
  }

  /**
   * Delete a document
   */
  static async deleteDocument(collection: string, documentId: string): Promise<void> {
    const db = this.getDb();
    await db.collection(collection).doc(documentId).delete();
  }

  /**
   * Query documents with filters
   */
  static async queryDocuments(
    collection: string,
    options?: {
      filters?: Array<{ field: string; operator: WhereFilterOp; value: any }>;
      orderBy?: { field: string; direction: 'asc' | 'desc' };
      limit?: number;
      offset?: number;
    }
  ): Promise<any[]> {
    const db = this.getDb();
    let query: Query = db.collection(collection);

    // Apply filters
    if (options?.filters) {
      options.filters.forEach(filter => {
        query = query.where(filter.field, filter.operator, filter.value);
      });
    }

    // Apply ordering
    if (options?.orderBy) {
      query = query.orderBy(options.orderBy.field, options.orderBy.direction);
    }

    // Apply limit
    if (options?.limit) {
      query = query.limit(options.limit);
    }

    // Apply offset (startAfter)
    if (options?.offset) {
      // This is a simplified version - in practice you'd need a document reference
      // query = query.startAfter(options.offset);
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  /**
   * Batch operations
   */
  static async batchCreate(
    collection: string,
    documents: Array<{ data: any; id?: string }>,
    userId: string
  ): Promise<Array<{ id: string; data: any }>> {
    const db = this.getDb();
    const batch = db.batch();
    const results = [];

    for (const doc of documents) {
      const documentData = {
        ...doc.data,
        createdBy: userId,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      let docRef: DocumentReference;
      if (doc.id) {
        docRef = db.collection(collection).doc(doc.id);
        batch.set(docRef, documentData);
      } else {
        docRef = db.collection(collection).doc();
        batch.set(docRef, documentData);
      }

      results.push({ id: docRef.id, data: { ...documentData, id: docRef.id } });
    }

    await batch.commit();
    return results;
  }

  static async batchUpdate(
    collection: string,
    updates: Array<{ id: string; data: any }>
  ): Promise<void> {
    const db = this.getDb();
    const batch = db.batch();

    for (const update of updates) {
      const updateData = {
        ...update.data,
        updatedAt: FieldValue.serverTimestamp(),
      };

      const docRef = db.collection(collection).doc(update.id);
      batch.update(docRef, updateData);
    }

    await batch.commit();
  }

  static async batchDelete(collection: string, documentIds: string[]): Promise<void> {
    const db = this.getDb();
    const batch = db.batch();

    for (const id of documentIds) {
      const docRef = db.collection(collection).doc(id);
      batch.delete(docRef);
    }

    await batch.commit();
  }
}

/**
 * Authentication helpers for Firebase Functions (Server-side)
 */
export class FunctionsAuthHelpers {
  /**
   * Verify user is authenticated and return user info
   * Throws HttpsError if not authenticated
   */
  static verifyAuthenticated(context: any): { uid: string; email?: string; token: any } {
    if (!context.auth) {
      const { HttpsError } = require('firebase-functions/v2/https');
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    return {
      uid: context.auth.uid,
      email: context.auth.token.email,
      token: context.auth.token
    };
  }

  /**
   * Check if user is authenticated without throwing
   */
  static isAuthenticated(context: any): boolean {
    return !!context.auth;
  }

  /**
   * Get user ID if authenticated, null otherwise
   */
  static getUserId(context: any): string | null {
    return context.auth?.uid || null;
  }

  /**
   * Get user email if authenticated, null otherwise
   */
  static getUserEmail(context: any): string | null {
    return context.auth?.token?.email || null;
  }

  /**
   * Verify user has specific custom claims
   */
  static verifyCustomClaims(context: any, requiredClaims: Record<string, any>): void {
    const user = this.verifyAuthenticated(context);

    for (const [key, value] of Object.entries(requiredClaims)) {
      if (user.token[key] !== value) {
        const { HttpsError } = require('firebase-functions/v2/https');
        throw new HttpsError('permission-denied', `Missing required claim: ${key}=${value}`);
      }
    }
  }
}
