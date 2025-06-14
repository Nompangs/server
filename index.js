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

// 타임아웃 설정 (2분)
app.use((req, res, next) => {
  req.setTimeout(120000); // 2분
  res.setTimeout(120000); // 2분
  next();
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 더 이상 복잡한 변수 확장이 필요하지 않습니다 - 의미있는 데이터만 저장

// 🔍 서버 연결 테스트 엔드포인트
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: '놈팽쓰 QR 서버가 정상 작동 중입니다',
    version: '7.0',
    timestamp: new Date().toISOString(),
    endpoints: ['/createQR', '/loadQR/:uuid', '/session']
  });
});

// 🚀 초고속 QR 생성 API 엔드포인트 (핵심 데이터만)
app.post(
  '/createQR',
  [
    body('personalityProfile').notEmpty().withMessage('personalityProfile이 필요합니다'),
    body('personalityProfile.aiPersonalityProfile.name').notEmpty().withMessage('캐릭터 이름이 필요합니다'),
  ],
  async (req, res) => {
    const requestStartTime = Date.now();
    console.log('🚀 /createQR 요청 시작 (초고속 모드)');
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ 검증 실패');
      return res.status(400).json({ 
        success: false,
        error: 'VALIDATION_FAILED',
        message: '입력 데이터 검증에 실패했습니다'
      });
    }
    
    try {
      const { personalityProfile } = req.body;
      const id = uuidv4();
      
      // 🎯 핵심 데이터만 추출 (최소화)
      const essentialData = {
        uuid: id,
        name: personalityProfile.aiPersonalityProfile?.name || '',
        objectType: personalityProfile.aiPersonalityProfile?.objectType || '',
        greeting: personalityProfile.greeting || `안녕하세요! 저는 ${personalityProfile.aiPersonalityProfile?.name || '친구'}입니다.`,
        personalityTraits: (personalityProfile.aiPersonalityProfile?.personalityTraits || []).slice(0, 3), // 최대 3개만
        summary: personalityProfile.aiPersonalityProfile?.summary || '',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        version: '7.0', // 초고속 버전
      };
      
      // 🚀 Firestore 저장만 (QR 생성은 클라이언트에서)
      await db.collection('qr_profiles').doc(id).set(essentialData);

      const totalDuration = Date.now() - requestStartTime;
      console.log(`✅ 초고속 생성 완료: ${id} (${totalDuration}ms)`);

      // UUID와 간단한 링크만 반환
      const qrLink = `nompangs://character/${id}`;
      
      res.status(200).json({ 
        success: true,
        uuid: id, 
        qrUrl: qrLink, // 간단한 링크
        message: '초고속 처리 완료',
        version: '7.0',
        performance: { total: totalDuration }
      });
    } catch (err) {
      const totalDuration = Date.now() - requestStartTime;
      console.error('❌ createQR 실패:', err.message);
      
      res.status(500).json({ 
        success: false,
        error: 'SERVER_ERROR',
        message: '서버에서 오류가 발생했습니다'
      });
    }
  }
);

// 🚀 간소화된 QR 로드 API 엔드포인트
app.get(
  '/loadQR/:uuid',
  [param('uuid').isUUID().withMessage('유효하지 않은 UUID 형식입니다')],
  async (req, res) => {
    const requestStartTime = Date.now();
    const uuid = req.params.uuid;
    console.log(`🔍 QR 로드 요청 시작: ${uuid} (${new Date().toISOString()})`);
    
    const validationStartTime = Date.now();
    const errors = validationResult(req);
    const validationDuration = Date.now() - validationStartTime;
    console.log(`⚡ UUID 검증 완료 (${validationDuration}ms)`);
    
    if (!errors.isEmpty()) {
      console.log('❌ UUID 검증 실패:', errors.array());
      return res.status(400).json({ 
        success: false,
        error: 'INVALID_UUID',
        message: '유효하지 않은 QR 코드 형식입니다',
        details: errors.array() 
      });
    }
    
    try {
      const firestoreStartTime = Date.now();
      const docRef = db.collection('qr_profiles').doc(uuid);
      const doc = await docRef.get();
      const firestoreDuration = Date.now() - firestoreStartTime;
      console.log(`🔥 Firestore 조회 완료 (${firestoreDuration}ms)`);
      
      if (!doc.exists) {
        const totalDuration = Date.now() - requestStartTime;
        console.log(`❌ 프로필 없음: ${uuid} (${totalDuration}ms)`);
        return res.status(404).json({ 
          success: false,
          error: 'PROFILE_NOT_FOUND',
          message: 'QR 코드에 해당하는 캐릭터를 찾을 수 없습니다',
          uuid: uuid
        });
      }
      
      const dataProcessingStartTime = Date.now();
      const data = doc.data();
      
      console.log(`📊 로드된 프로필 분석:`);
      console.log(`   - 이름: ${data.name || '없음'}`);
      console.log(`   - 버전: ${data.version || '알 수 없음'}`);
      console.log(`   - 성격 변수: ${Object.keys(data.personalityVariables || {}).length}개`);
      console.log(`   - 매력적 결함: ${(data.attractiveFlaws || []).length}개`);
      console.log(`   - 모순적 특성: ${(data.contradictions || []).length}개`);

      // 🎯 Flutter PersonalityProfile과 완전히 일치하는 구조로 응답
      const responseData = {
        success: true,
        personalityProfile: {
          aiPersonalityProfile: {
            name: data.name || '',
            objectType: data.objectType || '',
            personalityTraits: data.personalityTraits || [],
            emotionalRange: data.emotionalRange || 5,
            coreValues: data.coreValues || [],
            relationshipStyle: data.relationshipStyle || '친근한',
            summary: data.summary || '',
            npsScores: {} // Flutter 모델에 맞춰 추가
          },
          photoAnalysis: {
            objectType: data.photoAnalysis?.objectType || '',
            visualDescription: data.photoAnalysis?.visualDescription || '',
            location: data.photoAnalysis?.location || '',
            condition: data.photoAnalysis?.condition || '좋음',
            estimatedAge: data.photoAnalysis?.estimatedAge || '',
            historicalSignificance: data.photoAnalysis?.historicalSignificance || [],
            culturalContext: data.photoAnalysis?.culturalContext || []
          },
          lifeStory: {
            background: data.lifeStory?.background || '',
            keyEvents: data.lifeStory?.keyEvents || [],
            secretWishes: data.lifeStory?.secretWishes || [],
            innerComplaints: data.lifeStory?.innerComplaints || []
          },
          humorMatrix: {
            style: data.humorMatrix?.style || '친근한',
            frequency: data.humorMatrix?.frequency || '적당히',
            topics: data.humorMatrix?.topics || [],
            avoidance: data.humorMatrix?.avoidance || []
          },
          attractiveFlaws: data.attractiveFlaws || [],
          contradictions: data.contradictions || [],
          communicationStyle: {
            tone: data.communicationStyle?.tone || '친근한',
            formality: data.communicationStyle?.formality || '편안한',
            responseLength: data.communicationStyle?.responseLength || '적당한',
            preferredTopics: data.communicationStyle?.preferredTopics || [],
            expressionStyle: data.communicationStyle?.expressionStyle || '자연스러운'
          },
          structuredPrompt: data.structuredPrompt || '',
          uuid: data.uuid || uuid,
          greeting: data.greeting || `안녕하세요! 저는 ${data.name || '이름 없는 사물'}입니다.`,
          initialUserMessage: data.initialUserMessage || null,
          personalityVariables: data.personalityVariables || {} // 127개 성격 변수 추가
        },
        // 메타데이터
        name: data.name || '',
        version: data.version || '5.0',
        createdAt: data.createdAt,
        loadedAt: admin.firestore.FieldValue.serverTimestamp()
      };
      
      const dataProcessingDuration = Date.now() - dataProcessingStartTime;
      const totalDuration = Date.now() - requestStartTime;
      
      console.log(`✅ 캐릭터 로드 완료: ${uuid}`);
      console.log(`⚡ 로드 성능 요약:`);
      console.log(`   - 검증: ${validationDuration}ms`);
      console.log(`   - Firestore 조회: ${firestoreDuration}ms`);
      console.log(`   - 데이터 처리: ${dataProcessingDuration}ms`);
      console.log(`   - 전체 시간: ${totalDuration}ms`);

      res.status(200).json({
        ...responseData,
        performance: {
          validation: validationDuration,
          firestore: firestoreDuration,
          dataProcessing: dataProcessingDuration,
          total: totalDuration
        }
      });
    } catch (err) {
      const totalDuration = Date.now() - requestStartTime;
      console.error('❌ loadQR 예외 발생:', err);
      console.error(`⏱️ 실패까지 소요 시간: ${totalDuration}ms`);
      
      // 상세한 에러 분류
      let errorCode = 'UNKNOWN_ERROR';
      let userMessage = '알 수 없는 오류가 발생했습니다';
      
      if (err.code === 'permission-denied') {
        errorCode = 'PERMISSION_DENIED';
        userMessage = '데이터베이스 접근 권한이 없습니다';
      } else if (err.code === 'unavailable') {
        errorCode = 'SERVICE_UNAVAILABLE';
        userMessage = '서비스가 일시적으로 이용할 수 없습니다';
      } else if (err.message?.includes('timeout')) {
        errorCode = 'TIMEOUT';
        userMessage = '요청 시간이 초과되었습니다';
      }
      
      res.status(500).json({ 
        success: false,
        error: errorCode,
        message: userMessage,
        uuid: uuid,
        timestamp: new Date().toISOString(),
        performance: {
          failureTime: totalDuration
        }
      });
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