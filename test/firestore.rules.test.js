import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';

let testEnv;
const firestoreEmulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
const describeWithFirestoreEmulator = firestoreEmulatorHost ? describe : describe.skip;

describeWithFirestoreEmulator('Firestore Security Rules', () => {
  beforeAll(async () => {
    const [host, port] = firestoreEmulatorHost.split(':');
    testEnv = await initializeTestEnvironment({
      projectId: 'home-care-agent-os',
      firestore: {
        host,
        port: Number(port),
        rules: readFileSync(resolve(__dirname, '../firestore.rules'), 'utf8'),
      },
    });
  });

  afterAll(async () => {
    await testEnv?.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  it('allows users to read/write their own document', async () => {
    const context = testEnv.authenticatedContext('user123', { email: 'user@test.com' });
    const db = context.firestore();
    
    await assertSucceeds(db.collection('users').doc('user123').set({ homeId: 'homeA' }));
    await assertFails(db.collection('users').doc('user456').set({ homeId: 'homeB' }));
  });

  it('allows Super Admin to read/write all users', async () => {
    const adminContext = testEnv.authenticatedContext('admin1', { email: 'admin@agentic.com' });
    const adminDb = adminContext.firestore();
    
    await assertSucceeds(adminDb.collection('users').doc('user123').set({ homeId: 'homeA' }));
    await assertSucceeds(adminDb.collection('users').doc('user456').set({ homeId: 'homeB' }));
  });

  it('isolates residents collection by homeId', async () => {
    // Setup users with specific homeIds via unauthenticated admin context
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await db.collection('users').doc('staffA').set({ homeId: 'homeA', role: 'Caregiver' });
      await db.collection('users').doc('staffB').set({ homeId: 'homeB', role: 'Caregiver' });
      await db.collection('residents').doc('residentA').set({ homeId: 'homeA', name: 'John A' });
      await db.collection('residents').doc('residentB').set({ homeId: 'homeB', name: 'Jane B' });
    });

    const staffAContext = testEnv.authenticatedContext('staffA', { email: 'staffA@test.com' });
    const dbA = staffAContext.firestore();

    const staffBContext = testEnv.authenticatedContext('staffB', { email: 'staffB@test.com' });
    const dbB = staffBContext.firestore();

    // Staff A can read/update Resident A
    await assertSucceeds(dbA.collection('residents').doc('residentA').get());
    await assertSucceeds(dbA.collection('residents').doc('residentA').update({ status: 'Updated' }));

    // Staff A CANNOT read/update Resident B
    await assertFails(dbA.collection('residents').doc('residentB').get());
    await assertFails(dbA.collection('residents').doc('residentB').update({ status: 'Updated' }));

    // Staff B can read/update Resident B
    await assertSucceeds(dbB.collection('residents').doc('residentB').get());
    
    // Super Admin can read all
    const adminContext = testEnv.authenticatedContext('admin1', { email: 'admin@agentic.com' });
    const adminDb = adminContext.firestore();
    await assertSucceeds(adminDb.collection('residents').doc('residentA').get());
    await assertSucceeds(adminDb.collection('residents').doc('residentB').get());
  });
});
