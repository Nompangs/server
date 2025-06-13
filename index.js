require('dotenv').config();

const functions = require('firebase-functions');
const express = require('express');
const OpenAI = require('openai');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const { body, param, validationResult } = require('express-validator');
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const app = express();
const allowedOrigins = [
  'nompangs-96d37.firebaseapp.com',
  'http://localhost:8080',
];
app.use(cors({ origin: allowedOrigins }));
// 요청 본문의 크기 제한을 늘립니다. (기본값 100kb -> 10mb)
app.use(express.json({ limit: '10mb' }));


app.post(
  '/createQR',
  [
    body('personalityProfile').isObject().withMessage('personalityProfile은 객체여야 합니다.'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❗️ 입력값 검증 실패:', errors.array());
      return res.status(400).json({
        success: false,
        error: '입력 데이터 검증 실패',
        details: errors.array(),
      });
    }

    try {
      // 클라이언트가 보낸 personalityProfile을 그대로 사용합니다.
      const { personalityProfile } = req.body;
      const id = uuidv4();

      if (!personalityProfile || Object.keys(personalityProfile).length === 0) {
        throw new Error('클라이언트로부터 받은 프로필 데이터가 비어있습니다.');
      }

      const fullProfile = {
        ...personalityProfile, // 클라이언트가 보낸 데이터를 그대로 저장
        uuid: id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        version: '7.0', // 데이터 정제 로직 제거 버전
      };

      await db.collection('qr_profiles').doc(id).set(fullProfile);

      const qrUrl = await QRCode.toDataURL(id);

      console.log(`✅ 전체 페르소나 프로필 생성 완료: ${id}`);
      console.log('   - 저장된 데이터:', JSON.stringify(fullProfile, null, 2));


      res.status(200).json({
        uuid: id,
        qrUrl,
        message: '전체 페르소나 프로필이 성공적으로 저장되었습니다.'
      });
    } catch (err) {
      console.error('🚨 /createQR 실패:', err);
      // 에러 객체 전체를 로깅하여 더 많은 정보 확인
      console.error(err);
      res.status(500).json({ error: 'Failed to create QR profile', details: err.message });
    }
  }
);

app.get(
  '/loadQR/:uuid',
  [param('uuid').isUUID()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const uuid = req.params.uuid;
    try {
      const docRef = db.collection('qr_profiles').doc(uuid);
      const doc = await docRef.get();
      if (!doc.exists) {
        return res.status(404).json({ error: 'Profile not found' });
      }
      const data = doc.data();

      console.log(`✅ 페르소나 로드 완료: ${uuid}`);
      console.log(`💡 저장된 버전: ${data.version || '버전 정보 없음'}`);

      res.status(200).json(data);
    } catch (err) {
      console.error('🚨 /loadQR 실패:', err);
      res.status(500).json({ error: 'Failed to load QR profile' });
    }
  }
);

// 이하 코드는 동일합니다.
app.get('/session', async (req, res) => {
  try {
    const ephemeralKey = await openai.ephemeralKeys.create({
      session: { 'x-openai-as-role': 'user' }
    }, { expiresIn: 300 });

    res.json({ client_secret: ephemeralKey });
  } catch (error) {
    res.status(500).send('Error creating ephemeral key');
  }
});

exports.api = functions.https.onRequest(app);

if (require.main === module) {
  const port = process.env.PORT || 8080;
  const host = '0.0.0.0';
  app.listen(port, host, () => {
    console.log(`✅ 통합 API 서버가 http://${host}:${port} 에서 실행 중입니다.`);
    console.log(`(에뮬레이터에서는 http://10.0.2.2:${port} 또는 PC의 IP로 접속해야 합니다)`);
  });
}