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
  * 반환값: `{ personaId, qrUrl }` (여기서 `qrUrl`은 PNG 이미지의 데이터 URL)
* `GET https://<region>-<project>.cloudfunctions.net/api/loadQR/{personaId}`

Firestore 데이터베이스는 반드시 네이티브 모드여야 합니다.

## 프로필 데이터 필드

`createQR`를 통해 생성되는 프로필 문서에는 다음 속성이 포함됩니다:

* `personaId` – Firestore 문서 ID로 저장되는 고유 식별자
* `name` – 객체의 별칭
* `objectType` – 생성된 객체의 종류(예: "이 빠진 머그컵")
* `location` – 객체가 보관된 위치
* `duration` – 사용자가 객체를 소유한 기간
* `purpose` – 객체가 수행하는 역할 설명
* `humorStyle` – 선택된 유머 또는 성격 톤
* `greeting` – 완료 화면에 표시할 인사말
* `tags` – 성격 특성 리스트
* `finalPersonality` – `introversion`, `warmth`, `competence` 값을 포함한 객체
* `photoUrl` – 선택적 이미지 URL
* `createdBy`, `createdAt` – 생성자 정보와 타임스탬프
* `totalInteractions`, `uniqueUsers` – 사용량 분석을 위한 카운터
