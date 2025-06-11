const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const { body, param, validationResult } = require('express-validator');

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Firebase Admin 초기화 (Storage 미사용)
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
      // 🌟 확장된 데이터 목록 구성
      const profile = {
        // === 기본 정보 ===
        personaId: id,
        name: data.name,
        objectType: data.objectType || '',
        location: data.location || '',
        duration: data.duration || '',
        purpose: data.purpose || '',
        humorStyle: data.humorStyle || '',
        greeting: data.greeting || '',
        tags: Array.isArray(data.tags) ? data.tags : [],
        photoUrl: data.photoUrl || '',

        // === 기존 성격 시스템 ===
        personality: {
          extroversion: data.personality?.extroversion ?? 0,
          warmth: data.personality?.warmth ?? 0,
          competence: data.personality?.competence ?? 0,
        },

        // === 🚀 AI 성격 시스템 ===
        aiPersonalityProfile: {
          version: '3.0',
          variables: data.aiPersonalityProfile?.variables || {},
          warmthFactors: data.aiPersonalityProfile?.warmthFactors || {},
          competenceFactors: data.aiPersonalityProfile?.competenceFactors || {},
          extraversionFactors: data.aiPersonalityProfile?.extraversionFactors || {},
          humorFactors: data.aiPersonalityProfile?.humorFactors || {},
          flawFactors: data.aiPersonalityProfile?.flawFactors || {},
          speechPatterns: data.aiPersonalityProfile?.speechPatterns || {},
          relationshipStyles: data.aiPersonalityProfile?.relationshipStyles || {},
          generatedAt: admin.firestore.FieldValue.serverTimestamp(),
          basedOnPhoto: !!data.photoUrl,
        },

        // === 사진 분석 결과 ===
        photoAnalysis: {
          objectDetection: data.photoAnalysis?.objectDetection || {},
          materialAnalysis: data.photoAnalysis?.materialAnalysis || {},
          conditionAssessment: data.photoAnalysis?.conditionAssessment || {},
          personalityHints: data.photoAnalysis?.personalityHints || {},
          confidence: data.photoAnalysis?.confidence || 0,
          analyzedAt: admin.firestore.FieldValue.serverTimestamp(),
        },

        // === 생애 스토리 (ai 생성) ===
        lifeStory: {
          background: data.lifeStory?.background || '',
          emotionalJourney: data.lifeStory?.emotionalJourney || {},
          relationships: data.lifeStory?.relationships || [],
          secretWishes: data.lifeStory?.secretWishes || [],
          innerComplaints: data.lifeStory?.innerComplaints || [],
          deepSatisfactions: data.lifeStory?.deepSatisfactions || [],
        },

        // === 유머 시스템 ===
        humorMatrix: {
          categories: data.humorMatrix?.categories || {},
          preferences: data.humorMatrix?.preferences || {},
          avoidancePatterns: data.humorMatrix?.avoidancePatterns || {},
          timingFactors: data.humorMatrix?.timingFactors || {},
        },

        // === 매력적 결함 및 모순 ===
        attractiveFlaws: Array.isArray(data.attractiveFlaws) ? data.attractiveFlaws : [],
        contradictions: Array.isArray(data.contradictions) ? data.contradictions : [],

        // === 소통 방식 ===
        communicationStyle: {
          speakingTone: data.communicationStyle?.speakingTone || '',
          preferredTopics: data.communicationStyle?.preferredTopics || [],
          avoidedTopics: data.communicationStyle?.avoidedTopics || [],
          expressionPatterns: data.communicationStyle?.expressionPatterns || {},
          emotionalRange: data.communicationStyle?.emotionalRange || {},
        },

        // === AI 시스템 프롬프트 ===
        structuredPrompt: data.structuredPrompt || '',

        // === 메타데이터 ===
        createdBy: null,
        totalInteractions: 0,
        uniqueUsers: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),

        // === 버전 관리 ===
        schemaVersion: '2.0',
        isLegacyProfile: false,
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

      // 상호작용 카운트만 증가
      await docRef.update({
        totalInteractions: admin.firestore.FieldValue.increment(1),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
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
