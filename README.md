# SecondGear

SecondGear는 AI 기반 맞춤형 중고 컴퓨터 추천/시세 분석 플랫폼입니다.
구매자는 예산과 목적에 맞는 추천을 받고, 판매자는 구성/상태 기반 적정 판매가를 확인할 수 있습니다.

Live Demo: https://secondgear-gilt.vercel.app/

## Tech Stack

- Next.js (App Router)
- Tailwind CSS
- Groq API (`groq-sdk`)
- Supabase (`@supabase/supabase-js`)
- Vercel 배포

## Local Setup

1. 의존성 설치

```bash
npm install
```

2. 환경변수 파일 생성

`.env.example`을 참고해서 `.env.local`을 만드세요.

필수 항목:

- `GROQ_API_KEY`
- `GROQ_MODEL` (예: `openai/gpt-oss-120b`)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

크롤링 데이터를 추천과 시세에 반영하려면 파일을 나눠서 관리하세요.

- `data/market-listings.json`: 완본체 추천용 데이터
- `data/part-listings.json`: CPU, GPU, RAM, SSD 같은 부품 시세 데이터

크롤러 실행은 `npm run crawl:market`이고, 수집 대상 URL과 선택자는 `scripts/crawl-sources.mjs`에서 설정합니다.
기본 소스는 중고나라, 번개장터, 다나와 중고장터입니다.

3. 개발 서버 실행

```bash
npm run dev
```

## Supabase Table

`supabase/schema.sql`을 Supabase SQL Editor에서 실행하세요.

생성되는 테이블:

- `recommendations`: 구매자 추천 로그
- `valuations`: 판매자 시세 분석 로그

## API

- `POST /api/recommend`
  - body: `{ "budget": number, "category": string }`
  - response: `{ "result": string }`

- `POST /api/valuation`
  - body: `{ "purpose": string, "components": string, "conditionNote": string, "usageYears": number }`
  - response: `{ "result": string }`

`SUPABASE_SERVICE_ROLE_KEY`가 설정되어 있으면 추천/시세 결과를 Supabase에 저장합니다.

추천과 시세 분석은 `data/market-listings.json`의 시장 데이터를 우선 참고합니다.

## Deploy (Vercel)

1. Git 리포지토리를 Vercel에 연결
2. Vercel Project Settings > Environment Variables에 `.env.local`의 값들을 동일하게 등록
3. Deploy 실행

권장: Production/Preview/Development 환경 각각 변수 분리 관리
