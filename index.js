const functions = require('firebase-functions');
const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.post('/createQR', async (req, res) => {
  try {
    const data = req.body || {};
    const id = uuidv4();
    await db.collection('qr_profiles').doc(id).set({
      ...data,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.status(200).json({ uuid: id });
  } catch (err) {
    console.error('createQR failed', err);
    res.status(500).json({ error: 'Failed to create QR profile' });
  }
});

app.get('/loadQR/:uuid', async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const doc = await db.collection('qr_profiles').doc(uuid).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    res.status(200).json(doc.data());
  } catch (err) {
    console.error('loadQR failed', err);
    res.status(500).json({ error: 'Failed to load QR profile' });
  }
});

exports.api = functions.https.onRequest(app);

if (require.main === module) {
  const port = process.env.PORT || 8080;
  app.listen(port, () => {
    console.log(`Server listening on ${port}`);
  });
}
