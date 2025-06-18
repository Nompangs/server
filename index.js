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
  console.log("Firebase Admin SDK 초기화 성공");
} catch (error) {
    console.error("Firebase 초기화 에러. serviceAccountKey.json 파일이 필요할 수 있습니다.", error);
}

const db = admin.firestore();
const app = express();

// CORS 설정: 모든 출처에서의 요청을 허용합니다. (개발 환경용)
app.use(cors()); 
app.use(express.json({ limit: '10mb' }));

// 파일 상단에 추가
async function verifyIdToken(authorizationHeader) {
  if (!authorizationHeader) throw new Error('No authorization header');
  const idToken = authorizationHeader.replace('Bearer ', '');
  return await admin.auth().verifyIdToken(idToken);
}

// 새로운 '/createQR' 엔드포인트
app.post(
  '/createQR',
  [
    // 새로운 데이터 구조에 대한 유효성 검사
    body('generatedProfile').isObject().withMessage('generatedProfile은 객체여야 합니다.'),
    body('userInput').isObject().withMessage('userInput은 객체여야 합니다.'),
  ],
  async (req, res) => {
    // photoBase64가 있으면 길이만 로그에 남기기
    const logBody = { ...req.body };
    if (logBody.photoBase64) {
      logBody.photoBase64 = `[base64 string, length: ${logBody.photoBase64.length}]`;
    }
    console.log("[POST /createQR] 요청 받음. body:", JSON.stringify(logBody));
    // 인증 토큰 로그
    console.log("[POST /createQR] Authorization 헤더(토큰):", req.headers.authorization);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.warn("[POST /createQR] 입력 데이터 검증 실패", errors.array());
      return res.status(400).json({ 
          success: false, 
          error: "입력 데이터 검증 실패", 
          details: errors.array() 
      });
    }

    try {
      // uid 추출 시도
      let user = null;
      try {
        user = await verifyIdToken(req.headers.authorization);
        console.log("[POST /createQR] 인증된 uid:", user.uid);
      } catch (authError) {
        console.error("[POST /createQR] 인증 토큰 검증 실패:", authError);
        return res.status(401).json({ success: false, error: '인증 실패: 유효하지 않은 토큰' });
      }

      const { generatedProfile, userInput } = req.body;
      const id = uuidv4();
      console.log(`[POST /createQR] 생성된 uuid: ${id}`);

      const fullProfile = {
        uuid: id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        version: '8.0',
        generatedProfile,
        userInput,
        uid: user.uid, // uid 저장
      };
      console.log(`[POST /createQR] Firestore 저장 시도: qr_profiles/${id}, uid: ${user.uid}`);
      await db.collection('qr_profiles').doc(id).set(fullProfile);
      console.log(`[POST /createQR] Firestore 저장 성공: qr_profiles/${id}`);

      const fullWebUrl = `https://invitepage.netlify.app/?roomId=${id}`;
      const qrUrl = await QRCode.toDataURL(fullWebUrl);
      console.log(`[POST /createQR] QR 코드 생성 성공: ${fullWebUrl}`);

      res.json({ qrUrl });
    } catch (error) {
      console.error("[POST /createQR] 에러:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// '/loadQR/:uuid' 엔드포인트
app.get('/loadQR/:uuid', async (req, res) => {
    try {
        const uuid = req.params.uuid;
        console.log(`[GET /loadQR/${uuid}] 요청 받음`);
        const doc = await db.collection('qr_profiles').doc(uuid).get();

        if (!doc.exists) {
            console.warn(`[GET /loadQR/${uuid}] 프로필 없음`);
            return res.status(404).json({ success: false, error: 'Profile not found' });
        }
        console.log(`[GET /loadQR/${uuid}] 프로필 반환`);
        res.json(doc.data());
    } catch (error) {
        console.error(`[GET /loadQR/:uuid] 에러:`, error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/objects/awoken', async (req, res) => {
  try {
    console.log("[GET /objects/awoken] 요청 받음");
    console.log("[GET /objects/awoken] Authorization 헤더:", req.headers.authorization);
    // 인증 토큰 검증
    let user = null;
    try {
      user = await verifyIdToken(req.headers.authorization);
      console.log("[GET /objects/awoken] 인증된 uid:", user.uid);
    } catch (authError) {
      console.error("[GET /objects/awoken] 인증 토큰 검증 실패:", authError);
      return res.status(401).json({ success: false, error: '인증 실패: 유효하지 않은 토큰' });
    }
    const snapshot = await db.collection('qr_profiles').where('uid', '==', user.uid).get();
    const objects = snapshot.docs.map(doc => ({
      uuid: doc.data().uuid,
      name: doc.data().generatedProfile?.aiPersonalityProfile?.name ?? '알 수 없는 사물',
      imageUrl: doc.data().userInput?.photoPath
        ?? doc.data().userInput?.imageUrl
        ?? null,
      lastInteraction: doc.data().lastInteraction ?? doc.data().createdAt?.toDate().toISOString(),
      location: doc.data().userInput?.location
        ?? doc.data().generatedProfile?.location
        ?? '위치 없음',
      greeting: doc.data().userInput?.greeting
        ?? doc.data().generatedProfile?.greeting
        ?? null,
      personalityTags: doc.data().userInput?.personalityTags
        ?? doc.data().generatedProfile?.personalityTags
        ?? null,
    }));
    console.log(`[GET /objects/awoken] ${objects.length}개 객체 반환`);
    res.json(objects);
  } catch (error) {
    console.error("[GET /objects/awoken] 에러:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, "0.0.0.0",() => {
  console.log(`Server listening on port ${port}`);
});