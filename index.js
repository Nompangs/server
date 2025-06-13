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
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 더 이상 복잡한 변수 확장이 필요하지 않습니다 - 의미있는 데이터만 저장

// 🚀 간소화된 QR 생성 API 엔드포인트 (의미있는 데이터만 저장)
app.post(
  '/createQR',
  [
    // 필수 입력값만 검증
    body('personalityProfile').isObject().withMessage('personalityProfile은 객체여야 합니다'),
    body('personalityProfile.aiPersonalityProfile').isObject().withMessage('aiPersonalityProfile은 객체여야 합니다'),
  ],
  async (req, res) => {
    // 🔍 요청 데이터 상세 로깅
    console.log('🔍 /createQR 요청 받음:');
    console.log('   - Content-Type:', req.headers['content-type']);
    console.log('   - 요청 바디 존재:', !!req.body);
    console.log('   - 요청 바디 타입:', typeof req.body);
    console.log('   - 요청 바디 키:', Object.keys(req.body || {}));
    
    if (req.body) {
      console.log('   - personalityProfile 존재:', !!req.body.personalityProfile);
      if (req.body.personalityProfile) {
        console.log('   - personalityProfile 타입:', typeof req.body.personalityProfile);
        console.log('   - personalityProfile 키:', Object.keys(req.body.personalityProfile || {}));
        
        if (req.body.personalityProfile.aiPersonalityProfile) {
          console.log('   - aiPersonalityProfile 존재:', !!req.body.personalityProfile.aiPersonalityProfile);
          console.log('   - aiPersonalityProfile 키:', Object.keys(req.body.personalityProfile.aiPersonalityProfile || {}));
        }
      }
    }
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ 검증 실패:', errors.array());
      return res.status(400).json({ 
        success: false,
        error: '입력 데이터 검증 실패',
        details: errors.array(),
        receivedData: {
          hasPersonalityProfile: !!req.body?.personalityProfile,
          hasAiPersonalityProfile: !!req.body?.personalityProfile?.aiPersonalityProfile,
          bodyKeys: Object.keys(req.body || {}),
        }
      });
    }
    try {
      const { personalityProfile } = req.body;
      const id = uuidv4();
      
      // 🎯 사물과 관련된 의미있는 데이터만 저장
      const cleanProfile = {
        // === 기본 정보 ===
        uuid: id,
        name: personalityProfile.aiPersonalityProfile?.name || '',
        objectType: personalityProfile.aiPersonalityProfile?.objectType || '',
        
        // === 성격 특성 (자연어) ===
        personalityTraits: personalityProfile.aiPersonalityProfile?.personalityTraits || [],
        emotionalRange: personalityProfile.aiPersonalityProfile?.emotionalRange || 5,
        coreValues: personalityProfile.aiPersonalityProfile?.coreValues || [],
        relationshipStyle: personalityProfile.aiPersonalityProfile?.relationshipStyle || '친근한',
        summary: personalityProfile.aiPersonalityProfile?.summary || '',
        
        // === 사진 분석 (실용적 정보만) ===
        photoAnalysis: {
          objectType: personalityProfile.photoAnalysis?.objectType || '',
          location: personalityProfile.photoAnalysis?.location || '',
          condition: personalityProfile.photoAnalysis?.condition || '좋음',
          estimatedAge: personalityProfile.photoAnalysis?.estimatedAge || '',
        },
        
        // === 생애 스토리 (자연스러운 이야기) ===
        lifeStory: {
          background: personalityProfile.lifeStory?.background || '',
          secretWishes: personalityProfile.lifeStory?.secretWishes || [],
          innerComplaints: personalityProfile.lifeStory?.innerComplaints || [],
        },
        
        // === 유머 스타일 (실제 유머 방식) ===
        humorMatrix: {
          style: personalityProfile.humorMatrix?.style || '친근한',
          frequency: personalityProfile.humorMatrix?.frequency || '적당히',
          topics: personalityProfile.humorMatrix?.topics || [],
          avoidance: personalityProfile.humorMatrix?.avoidance || [],
        },
        
        // === 매력적인 특성들 ===
        attractiveFlaws: personalityProfile.attractiveFlaws || [],
        contradictions: personalityProfile.contradictions || [],
        
        // === 소통 스타일 (실제 대화 방식) ===
        communicationStyle: {
          tone: personalityProfile.communicationStyle?.tone || '친근한',
          formality: personalityProfile.communicationStyle?.formality || '편안한',
          responseLength: personalityProfile.communicationStyle?.responseLength || '적당한',
          preferredTopics: personalityProfile.communicationStyle?.preferredTopics || [],
          expressionStyle: personalityProfile.communicationStyle?.expressionStyle || '자연스러운',
        },
        
        // === 대화용 프롬프트 ===
        structuredPrompt: personalityProfile.structuredPrompt || '',
        
        // === 메타데이터 (최소한) ===
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        version: '5.0', // 간소화 버전
      };
      
      await db.collection('qr_profiles').doc(id).set(cleanProfile);

      // QR 코드 데이터 URL 생성
      const qrUrl = await QRCode.toDataURL(id);

      console.log(`✅ 간소화된 캐릭터 생성 완료: ${id}`);
      console.log(`📊 저장된 데이터: 의미있는 정보만 포함`);

      res.status(200).json({ 
        uuid: id, 
        qrUrl,
        message: '사물의 성격과 관련된 의미있는 데이터만 저장되었습니다'
      });
    } catch (err) {
      console.error('❌ createQR 실패:', err);
      res.status(500).json({ error: 'Failed to create QR profile' });
    }
  }
);

// 🚀 간소화된 QR 로드 API 엔드포인트
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

      console.log(`✅ 캐릭터 로드 완료: ${uuid}`);
      console.log(`📊 버전: ${data.version || '알 수 없음'}`);

      // 깔끔한 데이터만 반환
      res.status(200).json(data);
    } catch (err) {
      console.error('❌ loadQR 실패:', err);
      res.status(500).json({ error: 'Failed to load QR profile' });
    }
  }
);

// WebRTC (Real-Time Communication)을 위한 임시 키(Ephemeral Key) 발급
app.get('/session', async (req, res) => {
  try {
    // 5분 동안 유효한 임시 키 생성
    const ephemeralKey = await openai.ephemeralKeys.create({
      session: { 'x-openai-as-role': 'user' } 
    }, { expiresIn: 300 });

    res.json({ client_secret: ephemeralKey });
  } catch (error) {
    res.status(500).send('Error creating ephemeral key');
  }
});

exports.api = functions.https.onRequest(app);

// 로컬 테스트용 서버 실행
if (require.main === module) {
  const port = process.env.PORT || 8080;
  app.listen(port, () => {
    console.log(`🚀 간소화된 서버가 http://localhost:${port}에서 실행 중입니다.`);
    console.log(`🎯 의미있는 데이터만 저장하는 깔끔한 구조`);
  });
}
