import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  runTransaction,
  writeBatch,
  getDocs
} from 'firebase/firestore';
import { db } from './firebase';
import { EquipmentItem, EquipmentRequest, RequestStatus } from '../types';

const ITEMS_COLLECTION = 'items';
const REQUESTS_COLLECTION = 'requests';
const ADMINS_COLLECTION = 'admins';

/**
 * Real-time listener for registered admin accounts collection in Firestore.
 */
export const subscribeToAdmins = (
  onData: (admins: (AdminUser & { passwordHash: string })[]) => void,
  onError?: (error: any) => void
) => {
  const adminsRef = collection(db, ADMINS_COLLECTION);
  return onSnapshot(
    adminsRef,
    (snapshot) => {
      const adminsList = snapshot.docs.map(
        (d) => d.data() as AdminUser & { passwordHash: string }
      );
      safeSetLocalStorage('siperlan_registered_admins', JSON.stringify(adminsList));
      onData(adminsList);
    },
    (error) => {
      console.warn('Firestore admins snapshot error:', error);
      if (onError) onError(error);
      const cached = localStorage.getItem('siperlan_registered_admins');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) onData(parsed);
        } catch (e) {
          console.error('Failed to parse cached admins:', e);
        }
      }
    }
  );
};

/**
 * Save newly registered admin account to Firestore cloud database.
 */
export const saveAdminDb = async (admin: AdminUser & { passwordHash: string }) => {
  try {
    const adminDoc = doc(db, ADMINS_COLLECTION, admin.id);
    await setDoc(adminDoc, admin);
  } catch (e) {
    console.error('Failed to save admin to Firestore:', e);
  }
};

export const safeSetLocalStorage = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    // Gracefully handle browser localStorage quota exceeded without touching database data
    console.warn(`localStorage quota exceeded for key "${key}". App continues smoothly using memory state.`, e);
  }
};

/**
 * Real-time listener for items collection.
 * Auto-seeds initial data if the Firestore collection is empty.
 * Caches items locally and falls back gracefully if Firestore quota limit is reached.
 */
export const subscribeToItems = (
  initialItems: EquipmentItem[],
  onData: (items: EquipmentItem[]) => void,
  onError?: (error: any) => void
) => {
  const itemsRef = collection(db, ITEMS_COLLECTION);
  return onSnapshot(
    itemsRef,
    async (snapshot) => {
      if (snapshot.empty) {
        console.log('Items collection is empty. Seeding initial items to Firestore...');
        try {
          const batch = writeBatch(db);
          initialItems.forEach((item) => {
            const itemDoc = doc(db, ITEMS_COLLECTION, item.id);
            batch.set(itemDoc, item);
          });
          await batch.commit();
        } catch (e) {
          console.warn('Could not write seed to Firestore (Quota/Permission):', e);
        }
        safeSetLocalStorage('siperlan_items_seeded', 'true');
        safeSetLocalStorage('siperlan_cached_items', JSON.stringify(initialItems));
        onData(initialItems);
      } else {
        safeSetLocalStorage('siperlan_items_seeded', 'true');
        const itemsList: EquipmentItem[] = snapshot.docs.map((d) => d.data() as EquipmentItem);
        // Sort items predictably by id or code
        itemsList.sort((a, b) => a.id.localeCompare(b.id));
        safeSetLocalStorage('siperlan_cached_items', JSON.stringify(itemsList));
        onData(itemsList);
      }
    },
    (error) => {
      console.warn('Firestore items snapshot error (Quota/Network):', error);
      if (onError) onError(error);

      // Fallback to cached items or initial items
      const cached = localStorage.getItem('siperlan_cached_items');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            onData(parsed);
            return;
          }
        } catch (e) {
          console.error('Failed to parse cached items:', e);
        }
      }
      onData(initialItems);
    }
  );
};

/**
 * Real-time listener for requests collection.
 * Auto-seeds initial requests if the Firestore collection is empty.
 * Caches requests locally and falls back gracefully if Firestore quota limit is reached.
 */
export const subscribeToRequests = (
  initialRequests: EquipmentRequest[],
  onData: (requests: EquipmentRequest[]) => void,
  onError?: (error: any) => void
) => {
  const requestsRef = collection(db, REQUESTS_COLLECTION);
  return onSnapshot(
    requestsRef,
    async (snapshot) => {
      const hasBeenSeeded = localStorage.getItem('siperlan_requests_seeded') === 'true';

      if (snapshot.empty && !hasBeenSeeded) {
        console.log('Seeding initial requests to Firestore...');
        const batch = writeBatch(db);
        initialRequests.forEach((req) => {
          const reqDoc = doc(db, REQUESTS_COLLECTION, req.id);
          batch.set(reqDoc, req);
        });
        await batch.commit();
        safeSetLocalStorage('siperlan_requests_seeded', 'true');
        safeSetLocalStorage('siperlan_cached_requests', JSON.stringify(initialRequests));
        onData(initialRequests);
      } else if (snapshot.empty) {
        safeSetLocalStorage('siperlan_cached_requests', JSON.stringify([]));
        onData([]);
      } else {
        safeSetLocalStorage('siperlan_requests_seeded', 'true');
        const requestsList: EquipmentRequest[] = snapshot.docs.map(
          (d) => d.data() as EquipmentRequest
        );
        // Sort newest created first
        requestsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        safeSetLocalStorage('siperlan_cached_requests', JSON.stringify(requestsList));
        onData(requestsList);
      }
    },
    (error) => {
      console.warn('Firestore requests snapshot error (Quota/Network):', error);
      if (onError) onError(error);

      // Fallback to cached requests or initial requests
      const cached = localStorage.getItem('siperlan_cached_requests');
      if (cached) {
        try {
          onData(JSON.parse(cached));
          return;
        } catch (e) {
          console.error('Failed to parse cached requests:', e);
        }
      }
      onData(initialRequests);
    }
  );
};

/**
 * Submit request atomically using Firestore Transaction.
 * Validates real-time stock on the server before committing, preventing race conditions across devices.
 */
export const submitRequestAtomic = async (
  requestData: Omit<EquipmentRequest, 'id' | 'requestNumber' | 'status' | 'createdAt'>,
  allRequests: EquipmentRequest[]
): Promise<EquipmentRequest> => {
  return await runTransaction(db, async (transaction) => {
    // 1. READ: Read all required item docs first (Firestore requires all reads before writes in transactions)
    const itemSnapshots = await Promise.all(
      requestData.items.map((reqItem) => {
        const itemRef = doc(db, ITEMS_COLLECTION, reqItem.itemId);
        return transaction.get(itemRef);
      })
    );

    // 2. VERIFY STOCK & PREPARE UPDATES
    const stockUpdates: { ref: any; newStock: number }[] = [];

    for (let i = 0; i < requestData.items.length; i++) {
      const reqItem = requestData.items[i];
      const itemSnap = itemSnapshots[i];

      if (!itemSnap.exists()) {
        throw new Error(`Barang "${reqItem.itemName}" tidak ditemukan di database.`);
      }

      const currentData = itemSnap.data() as EquipmentItem;
      const currentStock = currentData.stock;

      if (reqItem.quantity > currentStock) {
        throw new Error(
          `STOK_INSUFFICIENT: Stok "${reqItem.itemName}" di server saat ini sisa ${currentStock} ${reqItem.unit}. Anda meminta ${reqItem.quantity}.`
        );
      }

      stockUpdates.push({
        ref: itemSnap.ref,
        newStock: currentStock - reqItem.quantity,
      });
    }

    // 3. COMPUTE REQUEST NUMBER & ID
    const nextSeq = getNextSequenceNumber(allRequests);
    const today = new Date();
    const year = today.getFullYear();
    const romanMonth = getRomanMonth(today.getMonth());
    const requestNumber = `${nextSeq}/TPB/ATK/${romanMonth}/${year}`;
    const newReqId = `req-${Date.now()}`;

    const newRequest: EquipmentRequest = {
      ...requestData,
      id: newReqId,
      requestNumber,
      status: 'Menunggu',
      createdAt: new Date().toISOString(),
    };

    // 4. WRITE: Deduct stock and save request
    stockUpdates.forEach(({ ref, newStock }) => {
      transaction.update(ref, { stock: newStock });
    });

    const newReqRef = doc(db, REQUESTS_COLLECTION, newReqId);
    transaction.set(newReqRef, newRequest);

    return newRequest;
  });
};

/**
 * Update request status atomically with stock restoration if rejected.
 */
export const updateRequestStatusAtomic = async (
  requestId: string,
  targetRequest: EquipmentRequest,
  newStatus: RequestStatus,
  adminNotes?: string,
  adminSignature?: string
) => {
  await runTransaction(db, async (transaction) => {
    const oldStatus = targetRequest.status;
    if (oldStatus === newStatus && !adminSignature && adminNotes === targetRequest.adminNotes) return;

    // READ required item docs
    const itemSnapshots = await Promise.all(
      targetRequest.items.map((reqItem) => {
        const itemRef = doc(db, ITEMS_COLLECTION, reqItem.itemId);
        return transaction.get(itemRef);
      })
    );

    // RESTORE or DEDUCT stock if status changed to/from 'Ditolak'
    if ((oldStatus === 'Menunggu' || oldStatus === 'Disetujui') && newStatus === 'Ditolak') {
      // Restore stock
      itemSnapshots.forEach((snap, idx) => {
        if (snap.exists()) {
          const reqItem = targetRequest.items[idx];
          const currStock = (snap.data() as EquipmentItem).stock;
          transaction.update(snap.ref, { stock: currStock + reqItem.quantity });
        }
      });
    } else if (oldStatus === 'Ditolak' && (newStatus === 'Menunggu' || newStatus === 'Disetujui')) {
      // Re-deduct stock
      itemSnapshots.forEach((snap, idx) => {
        if (snap.exists()) {
          const reqItem = targetRequest.items[idx];
          const currStock = (snap.data() as EquipmentItem).stock;
          transaction.update(snap.ref, { stock: Math.max(0, currStock - reqItem.quantity) });
        }
      });
    }

    // WRITE: Update request doc
    const reqRef = doc(db, REQUESTS_COLLECTION, requestId);
    const updateData: any = {
      status: newStatus,
      adminNotes: adminNotes || targetRequest.adminNotes || '',
      approvedAt: newStatus === 'Disetujui' ? new Date().toISOString() : targetRequest.approvedAt || '',
      processedBy: 'Novarida Dwi Anggraini',
    };
    if (adminSignature) {
      updateData.adminSignature = adminSignature;
    }
    transaction.update(reqRef, updateData);
  });
};

/**
 * Delete request atomically restoring stock if active.
 */
export const deleteRequestAtomic = async (requestId: string, targetRequest: EquipmentRequest) => {
  try {
    await runTransaction(db, async (transaction) => {
      if (targetRequest.status !== 'Ditolak') {
        // Read item docs
        const itemSnapshots = await Promise.all(
          targetRequest.items.map((reqItem) => {
            const itemRef = doc(db, ITEMS_COLLECTION, reqItem.itemId);
            return transaction.get(itemRef);
          })
        );

        // Restore stock
        itemSnapshots.forEach((snap, idx) => {
          if (snap.exists()) {
            const reqItem = targetRequest.items[idx];
            const currStock = (snap.data() as EquipmentItem).stock || 0;
            transaction.update(snap.ref, { stock: currStock + reqItem.quantity });
          }
        });
      }

      const reqRef = doc(db, REQUESTS_COLLECTION, requestId);
      transaction.delete(reqRef);
    });
  } catch (err) {
    console.warn('Transaction deleteRequest failed, deleting doc directly:', err);
    try {
      const reqRef = doc(db, REQUESTS_COLLECTION, requestId);
      await deleteDoc(reqRef);
    } catch (dErr) {
      console.error('Direct deleteDoc failed:', dErr);
    }
  }
};

/**
 * Update stock manually from Admin Panel.
 */
export const updateItemStockDb = async (itemId: string, newStock: number) => {
  try {
    const itemRef = doc(db, ITEMS_COLLECTION, itemId);
    await setDoc(itemRef, { stock: Math.max(0, newStock) }, { merge: true });
  } catch (e) {
    console.error('Error updating stock in DB:', e);
  }
};

/**
 * Save or edit item from Admin Panel.
 */
export const saveItemDb = async (itemData: EquipmentItem) => {
  try {
    const itemRef = doc(db, ITEMS_COLLECTION, itemData.id);
    await setDoc(itemRef, itemData, { merge: true });
  } catch (e) {
    console.error('Error saving item in DB:', e);
  }
};

/**
 * Delete item from Admin Panel.
 */
export const deleteItemDb = async (itemId: string) => {
  try {
    const itemRef = doc(db, ITEMS_COLLECTION, itemId);
    await deleteDoc(itemRef);
  } catch (e) {
    console.error('Error deleting item from DB:', e);
  }
};

/**
 * Clear all items from database (for entering real items).
 */
export const clearAllItemsDb = async () => {
  try {
    const itemsSnap = await getDocs(collection(db, ITEMS_COLLECTION));
    const batch = writeBatch(db);
    itemsSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  } catch (e) {
    console.error('Error clearing all items from DB:', e);
  } finally {
    safeSetLocalStorage('siperlan_items_seeded', 'true');
    safeSetLocalStorage('siperlan_cached_items', JSON.stringify([]));
  }
};

/**
 * Clear all requests and restore stock for active requests.
 */
export const clearAllRequestsAtomic = async (requests: EquipmentRequest[]) => {
  if (requests.length === 0) return;

  try {
    await runTransaction(db, async (transaction) => {
      // 1. Calculate quantities to restore per item for active requests (not rejected)
      const restoreQuantities: { [itemId: string]: number } = {};

      requests.forEach((r) => {
        if (r.status !== 'Ditolak') {
          r.items.forEach((item) => {
            restoreQuantities[item.itemId] = (restoreQuantities[item.itemId] || 0) + item.quantity;
          });
        }
      });

      const itemIds = Object.keys(restoreQuantities);

      // 2. Read item documents in transaction
      const itemSnapshots = await Promise.all(
        itemIds.map((itemId) => {
          const itemRef = doc(db, ITEMS_COLLECTION, itemId);
          return transaction.get(itemRef);
        })
      );

      // 3. Update stock for each item
      itemSnapshots.forEach((snap, idx) => {
        if (snap.exists()) {
          const itemId = itemIds[idx];
          const qtyToRestore = restoreQuantities[itemId];
          const currentStock = (snap.data() as EquipmentItem).stock || 0;
          transaction.update(snap.ref, { stock: currentStock + qtyToRestore });
        }
      });

      // 4. Delete all request documents
      requests.forEach((r) => {
        const reqRef = doc(db, REQUESTS_COLLECTION, r.id);
        transaction.delete(reqRef);
      });
    });
  } catch (err) {
    console.warn('Transaction clearAllRequests failed, falling back to batch delete:', err);
    try {
      const batch = writeBatch(db);
      requests.forEach((r) => {
        const reqRef = doc(db, REQUESTS_COLLECTION, r.id);
        batch.delete(reqRef);
      });
      await batch.commit();
    } catch (batchErr) {
      console.error('Batch delete failed:', batchErr);
    }
  } finally {
    safeSetLocalStorage('siperlan_cached_requests', JSON.stringify([]));
  }
};

/**
 * Reset database to initial sample data.
 */
export const resetDatabaseDb = async (
  initialItems: EquipmentItem[],
  initialRequests: EquipmentRequest[]
) => {
  // Clear existing items and requests
  const itemsSnap = await getDocs(collection(db, ITEMS_COLLECTION));
  const requestsSnap = await getDocs(collection(db, REQUESTS_COLLECTION));

  const batch = writeBatch(db);
  itemsSnap.docs.forEach((d) => batch.delete(d.ref));
  requestsSnap.docs.forEach((d) => batch.delete(d.ref));

  initialItems.forEach((item) => {
    batch.set(doc(db, ITEMS_COLLECTION, item.id), item);
  });

  initialRequests.forEach((req) => {
    batch.set(doc(db, REQUESTS_COLLECTION, req.id), req);
  });

  await batch.commit();
};

// Helper sequence numbers
function getNextSequenceNumber(existingRequests: EquipmentRequest[]): number {
  if (existingRequests.length === 0) return 1;
  let maxSeq = 0;
  for (const req of existingRequests) {
    const match = req.requestNumber.match(/^(\d+)/);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  }
  return maxSeq > 0 ? maxSeq + 1 : existingRequests.length + 1;
}

function getRomanMonth(monthIndex: number): string {
  const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  return romanMonths[monthIndex] || 'I';
}
