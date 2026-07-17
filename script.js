require('dotenv').config({ path: '.env.local' });
const admin = require('firebase-admin');
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
async function main() {
  await db.collection('settings').doc('system').set({
    minWithdrawal: {
      "Alpha": 85000,
      "Alpha Plan": 85000,
      "Sigma": 150000,
      "Sigma Plan": 150000,
      "Omega": 300000,
      "Omega Plan": 300000
    }
  }, { merge: true });
  console.log("Firebase updated!");
}
main();