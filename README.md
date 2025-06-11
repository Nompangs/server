# QR 백엔드

이 디렉터리는 QR 프로필 관리를 위한 간단한 Node.js/Firebase Cloud Functions 백엔드를 포함합니다. 프로필은 무작위로 생성된 UUID를 사용해 Firestore에 저장되며, 서버는 해당 UUID를 인코딩한 QR 코드 이미지를 함께 반환합니다.

## 설정

1. Firebase CLI와 Node.js(v18 권장)를 설치하세요.
2. 이 `server/` 디렉터리에서 `npm install`을 실행해 의존성을 설치합니다.
3. Firebase 프로젝트가 설정되어 있고, `firebase login` 명령어로 로그인된 상태인지 확인하세요.

## 로컬 실행

```bash
npm start
```

위 명령으로 `http://localhost:8080`에서 Express 서버가 실행됩니다. Firebase Admin SDK는 애플리케이션 기본 자격증명을 사용하므로, 필요하다면 `GOOGLE_APPLICATION_CREDENTIALS` 환경 변수를 설정하세요.

## Cloud Functions에 배포

```bash
firebase deploy --only functions
```

위 명령으로 Express 앱이 `api`라는 이름의 Cloud Function으로 배포됩니다. 배포 후에는 다음 엔드포인트를 통해 접근할 수 있습니다:

* `POST https://<region>-<project>.cloudfunctions.net/api/createQR`

  * 요청 본문: 프로필 필드 객체
  * 반환값: `{ personaId, qrUrl }` (여기서 `qrUrl`은 서명된 PNG 이미지 URL)
* `GET https://<region>-<project>.cloudfunctions.net/api/loadQR/{personaId}`

Firestore 데이터베이스는 반드시 네이티브 모드여야 합니다.

## 프로필 데이터 필드

`createQR`를 통해 생성되는 프로필 문서에는 다음 속성이 포함됩니다:

### 기본 정보
* `personaId` – Firestore 문서 ID로 저장되는 고유 식별자
* `name` – 객체의 별칭
* `objectType` – 생성된 객체의 종류(예: "이 빠진 머그컵")
* `location` – 객체가 보관된 위치
* `duration` – 사용자가 객체를 소유한 기간
* `purpose` – 객체가 수행하는 역할 설명
* `humorStyle` – 선택된 유머 또는 성격 톤
* `greeting` – 완료 화면에 표시할 인사말
* `tags` – 성격 특성 리스트
* `photoUrl` – 선택적 이미지 URL

### 기존 성격 시스템 (호환성 유지)
* `personality` – `extroversion`, `warmth`, `competence` 값을 포함한 객체 (0-10 범위)

### �� AI 성격 시스템 (156개 변수)
* `aiPersonalityProfile` – AI 기반 성격 프로필
  * `version` – 성격 시스템 버전 (예: "3.0")
  * `variables` – 156개 성격 변수 객체 (PersonalityProfile)
  * `warmthFactors` – W01~W10: 온기 관련 변수들
  * `competenceFactors` – C01~C16: 능력 관련 변수들
  * `extraversionFactors` – E01~E06: 외향성 관련 변수들
  * `humorFactors` – H01~H10: 유머 관련 변수들
  * `flawFactors` – F01~F20: 매력적 결함 변수들
  * `speechPatterns` – S01~S15: 언어 스타일 변수들
  * `relationshipStyles` – R01~R10: 관계 성향 변수들
  * `generatedAt` – 생성 시각
  * `basedOnPhoto` – 사진 기반 생성 여부

### 사진 분석 결과
* `photoAnalysis` – 사진 분석 결과
  * `objectDetection` – 객체 인식 결과
  * `materialAnalysis` – 재질 분석 결과
  * `conditionAssessment` – 상태 평가 결과
  * `personalityHints` – 성격 힌트 추출 결과
  * `confidence` – 분석 신뢰도 (0-1)
  * `analyzedAt` – 분석 시각

### 생애 스토리 (AI 생성)
* `lifeStory` – AI가 생성한 객체의 생애 스토리
  * `background` – 배경 스토리
  * `emotionalJourney` – 감정적 여정
  * `relationships` – 관계 서사
  * `secretWishes` – 비밀스러운 소망들
  * `innerComplaints` – 내면의 불만들
  * `deepSatisfactions` – 깊은 만족감들

### 유머 시스템
* `humorMatrix` – 유머 매트릭스
  * `categories` – 유머 카테고리별 선호도
  * `preferences` – 유머 스타일 선호도
  * `avoidancePatterns` – 회피 패턴
  * `timingFactors` – 타이밍 요소들

### 성격 특성
* `attractiveFlaws` – 매력적 결함 리스트
* `contradictions` – 모순적 특성 리스트

### 소통 방식
* `communicationStyle` – 소통 스타일
  * `speakingTone` – 말투 특성
  * `preferredTopics` – 선호 주제들
  * `avoidedTopics` – 회피 주제들
  * `expressionPatterns` – 표현 패턴
  * `emotionalRange` – 감정 표현 범위

### AI 시스템
* `structuredPrompt` – AI 대화용 구조화된 프롬프트

### 메타데이터
* `createdBy`, `createdAt` – 생성자 정보와 타임스탬프
* `lastUpdated` – 마지막 업데이트 시각
* `totalInteractions`, `uniqueUsers` – 사용량 분석을 위한 카운터
* `schemaVersion` – 데이터 스키마 버전 (예: "2.0")
* `isLegacyProfile` – 기존 프로필 여부 (false = 신규 156변수 시스템)