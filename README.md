# 먹자 골목 관리

먹자 골목 관리는 식당의 재료 요청, 부서별 확인, 입고/출고 체크, 요청 내역 조회, 메뉴/레시피 관리, CSV 가져오기/내보내기를 처리하는 모바일 중심 웹앱입니다.

현재 버전은 **V1.0 배포 준비 단계**이며, 요청 화면은 **간편모드 중심**으로 관리합니다.

## 접속 주소

```text
https://mukjamtl.netlify.app
```

페이지가 예전처럼 보이면 캐시 초기화 페이지를 먼저 엽니다.

```text
https://mukjamtl.netlify.app/reset-cache.html
```

## 관련 문서

| 문서 | 목적 |
| --- | --- |
| `Manual.md` | 실제 사용자용 한글 매뉴얼 |
| `Error.md` | 예상 예외, 오류 처리, 테스트/수정 이력 |
| `/Users/itsfree/Downloads/mukja-function-tree-ko.md` | 매뉴얼 작성과 기능 테스트 기준 기능 트리 |

## 입장 비밀번호와 권한

회원가입 없이 입장 비밀번호로 권한을 구분합니다.

| 역할 | 비밀번호 | 주요 권한 |
| --- | --- | --- |
| 카페테리아 | `c1234` | 카페테리아 요청 확인, 메모 작성 |
| 야채 | `v1234` | 야채 요청 확인, 메모 작성 |
| 그로서리 | `g1234` | 그로서리 요청 확인, 메모 작성 |
| 레스토랑 | `m1234` | 전체 요청 작성, 입고 확인, 메뉴/레시피 조회 |
| 관리자 | `madmin` | 전체 기능, 재료/메뉴/레시피/비밀번호/CSV 관리 |

## 기능 요약

### 공통

- 입장 비밀번호 로그인
- 권한별 사이드바 메뉴 제한
- 한글/영어 전환
- 로그아웃
- 서비스워커 캐시 정리
- DB 우선 저장, localStorage 보조 저장

### 홈

- 최신 요청 조회
- 부서별 요청 필터
- 출고/입고 체크 저장
- 요청별 메모 저장
- 브라우저 포커스 복귀 시 DB 최신화

### 요청 내역

- 화요일부터 일요일까지 주 단위 조회
- 주차 페이지 이동
- 요청 상세 조회
- 부서/카테고리별 요청 품목 표시
- 관리자 체크 수정

### 요청하기

- 레스토랑/관리자 주문 모드
- 품목 체크와 메모 저장
- 관리자 수정 모드
- 재료 CRUD
- 부서/카테고리 일괄 변경
- 카테고리 CRUD
- 순서 이동
- 입력 폼이 열린 행의 드래그 비활성화

### 메뉴

- 카테고리 필터
- 검색
- 보기 모드에서 메뉴명 옆 가격 표시
- 판매 중단 취소선
- 계절 메뉴 배지
- 레시피 팝업
- 관리자 메뉴 CRUD
- 메뉴 생성 시 빈 레시피 자동 생성
- 메뉴 순서 이동

### 레시피

- 레시피 목록/검색/섹션 필터
- 상세 조회
- 재료 CRUD
- 조리 순서 CRUD
- 사진 URL/파일 미리보기
- 순서 이동
- 레시피 삭제

### 관리자

- 입장 비밀번호 CRUD
- 권한/부서/표시명 관리
- 마지막 관리자 삭제 방지
- 요청 내역 CSV Export/Import
- 재료 목록 CSV Export/Import
- 메뉴 CSV Export/Import
- 레시피 CSV Export/Import

## 데이터 저장 방식

Netlify DB 환경변수가 연결된 배포 환경에서는 PostgreSQL DB를 우선 사용합니다. DB 연결이 없거나 Netlify Functions가 동작하지 않는 환경에서는 브라우저 `localStorage`를 보조 저장소로 사용합니다.

| 테이블 | 목적 |
| --- | --- |
| `access_identities` | 브라우저별 익명 사용자, 역할, 부서 기록 |
| `access_logs` | API 접속 IP, 기기, 역할 로그 |
| `access_accounts` | 입장 비밀번호, 역할, 부서, 표시 이름 |
| `app_settings` | 부서별 요청 카테고리 등 설정 |
| `orders` | 요청 날짜, 시간, 메모, 요청 메시지 |
| `order_items` | 요청별 품목, 카테고리, 부서, 입고 상태 |
| `order_memos` | 역할/부서별 요청 메모 |
| `receipt_confirmations` | 입고 확인 기록 |
| `department_confirmations` | 출고 확인 기록 |
| `recipes` | 레시피 본문, 재료, 조리 순서, 메모, 이미지 URL |
| `ingredients` | 요청하기 화면의 재료 품목 DB |
| `menus` | 메뉴명, 카테고리, 가격, 상태, 연결 레시피 |

## CSV 컬럼

재료 목록:

```text
id,nameKo,nameEn,target,category,categoryEn,unit,enabled,sortOrder
```

메뉴:

```text
id,recipeId,category,categoryEn,nameKo,nameEn,seasonal,discontinued,price,currency,notes,sortOrder
```

레시피:

```text
id,name,nameEn,section,description,descriptionEn,ingredients,ingredientsEn,seasonings,steps,stepsEn,stepItems,stepItemsEn,notes,notesEn,imageUrl,enabled,updatedAt
```

요청 내역:

```text
날짜,시간,모드,요청자,주문부서,품목,품목영문,수량,단위,입고여부,메모
```

## 테스트 방식

기능 테스트는 방금 작성한 기능 트리(`mukja-function-tree-ko.md`)를 기준으로 진행합니다. 자동 테스트는 실제 배포 API와 DB를 사용하므로 **순차 실행**합니다.

```bash
npm run test:user-flows
npm run test:db-consistency
```

- `test:user-flows`: 권한별 로그인 세션을 만들고 홈, 요청 내역, 요청하기, 메뉴, 레시피, 관리자 화면 렌더링과 접근 제한을 확인합니다. 테스트용 요청을 생성한 뒤 삭제합니다.
- `test:db-consistency`: 실제 DB에 임시 요청을 생성, 조회, 수정, 삭제하고 홈/요청 내역/상세 화면의 데이터 일관성을 확인합니다.

두 테스트를 동시에 실행하면 서로의 임시 요청을 잠깐 볼 수 있으므로 최종 검증은 항상 순서대로 실행합니다.

## 로컬 실행

로컬 서버 확인은 참고용입니다. 운영 확인은 Netlify 배포 주소를 기준으로 합니다.

```bash
cd "/Users/itsfree/Documents/Mukja Order"
python3 -m http.server 4173
```

```text
http://127.0.0.1:4173
```

## 배포

정적 웹앱과 Netlify Functions를 함께 사용합니다.

```toml
[build]
  publish = "."
  command = ""

[functions]
  directory = "netlify/functions"
```

수동 배포:

```bash
npx netlify deploy --prod --dir .
```

GitHub `main` 브랜치에 push하면 Netlify 자동 배포가 실행됩니다.

## DB 상태 확인

```text
https://mukjamtl.netlify.app/api/health
```

정상 응답:

```json
{"ok":true,"db":true}
```

## V1.0 전 점검 기준

- 기능 트리 기준으로 모든 페이지를 테스트한다.
- 테스트 중 오류가 나오면 즉시 수정하고 `Error.md`에 기록한다.
- README와 Manual을 최신 화면 기준으로 맞춘다.
- DB 초기화/CSV Import 전에는 `/Users/itsfree/Downloads/mukja-db-backups`에 백업을 남긴다.
