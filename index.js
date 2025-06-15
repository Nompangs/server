const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const admin = require('firebase-admin');
const QRCode = require('qrcode');
const cors = require('cors'); // CORS 추가

// Firebase Admin SDK 초기화
// 이 파일(serviceAccountKey.json)은 index.js와 같은 위치에 있어야 합니다.
try {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
} catch (error) {
    console.log("Firebase 초기화 에러. serviceAccountKey.json 파일이 필요할 수 있습니다.", error.message);
}

const db = admin.firestore();
const app = express();

// CORS 설정: 모든 출처에서의 요청을 허용합니다. (개발 환경용)
app.use(cors()); 
app.use(express.json({ limit: '10mb' }));

// 새로운 '/createQR' 엔드포인트
app.post(
  '/createQR',
  [
    // 새로운 데이터 구조에 대한 유효성 검사
    body('generatedProfile').isObject().withMessage('generatedProfile은 객체여야 합니다.'),
    body('userInput').isObject().withMessage('userInput은 객체여야 합니다.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
          success: false, 
          error: "입력 데이터 검증 실패", 
          details: errors.array() 
      });
    }

    try {
      const { generatedProfile, userInput } = req.body;
      const id = uuidv4();

      const fullProfile = {
        uuid: id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        version: '8.0',
        generatedProfile,
        userInput,
      };

      await db.collection('qr_profiles').doc(id).set(fullProfile);

      const qrUrl = await QRCode.toDataURL(id);
      res.json({ qrUrl });
    } catch (error) {
      console.error("Error in /createQR:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// '/loadQR/:uuid' 엔드포인트
app.get('/loadQR/:uuid', async (req, res) => {
    try {
        const uuid = req.params.uuid;
        const doc = await db.collection('qr_profiles').doc(uuid).get();

        if (!doc.exists) {
            return res.status(404).json({ success: false, error: 'Profile not found' });
        }
        res.json(doc.data());
    } catch (error) {
        console.error("Error in /loadQR:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});