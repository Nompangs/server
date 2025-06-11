const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const { body, param, validationResult } = require('express-validator');

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Firebase Admin 초기화
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const app = express();
// CORS 허용 도메인 목록 설정
const allowedOrigins = [
  'nompangs-96d37.firebaseapp.com', // 운영 환경
  'http://localhost:8080', // 로컬 개발용
];
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// 인증 미들웨어
async function authenticate(req, res, next) {
  const authHeader = req.get('Authorization') || '';
  const match = authHeader.match(/^Bearer (.+)$/);
  if (!match) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const idToken = match[1];
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = decoded; // 인증된 사용자의 UID 저장
    next();
  } catch (err) {
    functions.logger.error('인증 오류', err); // 에러 로깅
    res.status(401).json({ error: 'Unauthorized' });
  }
}

// QR 생성 API 엔드포인트
app.post(
  '/createQR',
  [
    // 입력값 검증
    body('name').isString().notEmpty(),
    body('objectType').isString().optional(),
    body('location').isString().optional(),
    body('duration').isString().optional(),
    body('purpose').isString().optional(),
    body('humorStyle').isString().optional(),
    body('greeting').isString().optional(),
    body('tags').isArray().optional(),
    body('personality').optional().isObject(),
    body('personality.extroversion').optional().isNumeric(),
    body('personality.warmth').optional().isNumeric(),
    body('personality.competence').optional().isNumeric(),
    body('photoUrl').isString().optional(),
    // 🚀 AI 성격 시스템 확장 필드들
    body('aiPersonalityProfile').optional().isObject(),
    body('photoAnalysis').optional().isObject(),
    body('lifeStory').optional().isObject(),
    body('humorMatrix').optional().isObject(),
    body('attractiveFlaws').optional().isArray(),
    body('contradictions').optional().isArray(),
    body('communicationStyle').optional().isObject(),
    body('structuredPrompt').optional().isString(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() }); // 잘못된 요청 시 400 반환
    }
    try {
      const data = req.body;
      const id = uuidv4();
      // 데이터 모델 확장 및 기본값 설정
      const profile = {
        personaId: id,
        name: data.name,
        objectType: data.objectType || '',
        location: data.location || '',
        duration: data.duration || '',
        purpose: data.purpose || '',
        humorStyle: data.humorStyle || '',
        greeting: data.greeting || '',
        tags: Array.isArray(data.tags) ? data.tags : [],
        personality: {
          extroversion: data.personality?.extroversion ?? 0,
          warmth: data.personality?.warmth ?? 0,
          competence: data.personality?.competence ?? 0,
        },
        photoUrl: data.photoUrl || '',

        //여기에 추가

        createdBy: req.user?.uid || null, // 인증되지 않은 경우 null
        totalInteractions: 0,           // 대화 횟수 초기화
        uniqueUsers: 0,                 // 고유 사용자 수 초기화
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      await db.collection('qr_profiles').doc(id).set(profile);

      // QR 코드 데이터 URL 생성 (Storage 미사용)
      const qrUrl = await QRCode.toDataURL(id);

      res.status(200).json({ personaId: id, qrUrl });
    } catch (err) {
      functions.logger.error('createQR 실패', err); // 에러 로깅
      res.status(500).json({ error: 'Failed to create QR profile' });
    }
  }
);

// QR 로드 및 상호작용 기록 API 엔드포인트
app.get(
  '/loadQR/:uuid',
  authenticate,                     // 인증 필수
  [param('uuid').isUUID()],        // UUID 형식 검증
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() }); // 잘못된 UUID 시 400 반환
    }
    const uuid = req.params.uuid;
    try {
      const docRef = db.collection('qr_profiles').doc(uuid);
      const doc = await docRef.get();
      if (!doc.exists) {
        return res.status(404).json({ error: 'Profile not found' });
      }
      const data = doc.data();

      // 트랜잭션으로 상호작용 기록
      const interactionRef = docRef.collection('interactions').doc(req.user.uid);
      await db.runTransaction(async tx => {
        const interactionDoc = await tx.get(interactionRef);
        if (!interactionDoc.exists) {
          // 최초 접근한 사용자 -> uniqueUsers 증가
          tx.set(interactionRef, { firstSeen: admin.firestore.FieldValue.serverTimestamp() });
          tx.update(docRef, { uniqueUsers: admin.firestore.FieldValue.increment(1) });
        }
        // 전체 상호작용 수 증가
        tx.update(docRef, { totalInteractions: admin.firestore.FieldValue.increment(1) });
      });

      res.status(200).json(data);
    } catch (err) {
      functions.logger.error('loadQR 실패', err);  // 에러 로깅
      res.status(500).json({ error: 'Failed to load QR profile' });
    }
  }
);

exports.api = functions.https.onRequest(app);

// 로컬 테스트용 서버 실행
if (require.main === module) {
  const port = process.env.PORT || 8080;
  app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
  });
}
