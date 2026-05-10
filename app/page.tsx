"use client";

import { FormEvent, useState } from "react";

type RecommendationResult = {
  summary: string;
  build: {
    cpu: string;
    gpu: string;
    ram: string;
    storage: string;
  };
  expected_price: string;
  why: string[];
  checklist: string[];
};

function isRecommendationResult(value: unknown): value is RecommendationResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as RecommendationResult;

  return Boolean(
    candidate.summary &&
      candidate.build &&
      candidate.expected_price &&
      Array.isArray(candidate.why) &&
      Array.isArray(candidate.checklist)
  );
}

export default function Home() {
  const [mode, setMode] = useState<"buyer" | "seller">("buyer");

  const [budget, setBudget] = useState(1500000);
  const [category, setCategory] = useState("gaming");
  const [requirements, setRequirements] = useState(
    "게임 위주, 144Hz 모니터 사용, 소음은 낮을수록 좋음"
  );
  const [recommendation, setRecommendation] = useState<RecommendationResult | string | null>(null);

  const [purpose, setPurpose] = useState("gaming");
  const [components, setComponents] = useState("RTX 3060, i5-12400F, RAM 16GB, SSD 1TB");
  const [conditionNote, setConditionNote] = useState("생활 기스 소량, 채굴 이력 없음");
  const [usageYears, setUsageYears] = useState(2);
  const [valuation, setValuation] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRecommendationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setRecommendation("");
    setLoading(true);

    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budget, category, requirements }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "추천 생성 실패");
      }

      if (typeof data.result === "string") {
        try {
          setRecommendation(JSON.parse(data.result) as RecommendationResult);
        } catch {
          setRecommendation(data.result ?? "응답이 비어 있습니다.");
        }
      } else if (isRecommendationResult(data.result)) {
        setRecommendation(data.result);
      } else {
        setRecommendation(data.raw ?? "응답이 비어 있습니다.");
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "알 수 없는 오류");
    } finally {
      setLoading(false);
    }
  }

  async function handleValuationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setValuation("");
    setLoading(true);

    try {
      const response = await fetch("/api/valuation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose, components, conditionNote, usageYears }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "시세 분석 실패");
      }

      setValuation(data.result ?? "응답이 비어 있습니다.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "알 수 없는 오류");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="accent-gradient min-h-screen">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-5 py-12 md:px-8 md:py-16">
        <section className="paper rounded-[28px] p-8 md:p-10">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-[#6e4f2d]">SecondGear</p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight text-[#2d241b] md:text-5xl">
            AI로 맞추는 중고 PC 추천과 시세 분석
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[#554638] md:text-base">
            구매자는 목적과 예산만 입력하면 추천 견적을 받고, 판매자는 현재 구성과 상태를 입력해 적정 판매가를 확인할 수 있습니다.
          </p>

          <div className="mt-8 inline-flex rounded-full border border-black/10 bg-white p-1">
            <button
              type="button"
              onClick={() => setMode("buyer")}
              className={`rounded-full px-4 py-2 text-sm font-medium ${mode === "buyer" ? "bg-[#2d241b] text-white" : "text-[#5d4f41]"}`}
            >
              구매자 추천
            </button>
            <button
              type="button"
              onClick={() => setMode("seller")}
              className={`rounded-full px-4 py-2 text-sm font-medium ${mode === "seller" ? "bg-[#2d241b] text-white" : "text-[#5d4f41]"}`}
            >
              판매자 시세
            </button>
          </div>
        </section>

        {mode === "buyer" ? (
          <section className="paper rounded-[24px] p-6 md:p-8">
            <h2 className="text-xl font-semibold text-[#2d241b]">구매자 맞춤 추천</h2>
            <p className="mt-2 text-sm text-[#655646]">게임, 사무, 편집 등 사용 목적과 예산 기준으로 중고 구성안을 제시합니다.</p>

            <form onSubmit={handleRecommendationSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="grid gap-1 text-sm md:col-span-1">
                <span className="text-[#5d4f41]">예산 (원)</span>
                <input
                  type="number"
                  min={100000}
                  step={10000}
                  value={budget}
                  onChange={(event) => setBudget(Number(event.target.value))}
                  className="rounded-xl border border-black/10 bg-white px-3 py-2 outline-none focus:border-[#2d241b]"
                />
              </label>

              <label className="grid gap-1 text-sm md:col-span-1">
                <span className="text-[#5d4f41]">용도</span>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="rounded-xl border border-black/10 bg-white px-3 py-2 outline-none focus:border-[#2d241b]"
                >
                  <option value="gaming">게이밍</option>
                  <option value="office">사무용</option>
                  <option value="editing">영상 편집</option>
                  <option value="streaming">방송 송출</option>
                </select>
              </label>

              <label className="grid gap-1 text-sm md:col-span-2">
                <span className="text-[#5d4f41]">요구사항</span>
                <textarea
                  rows={3}
                  value={requirements}
                  onChange={(event) => setRequirements(event.target.value)}
                  placeholder="원하는 게임, 작업, 화면 해상도, 소음, 업그레이드 여부 등을 적어주세요."
                  className="rounded-xl border border-black/10 bg-white px-3 py-2 outline-none focus:border-[#2d241b]"
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-[#b8471f] px-4 py-2 text-sm font-medium text-white disabled:opacity-60 md:col-span-2"
              >
                {loading ? "추천 생성 중..." : "추천 견적 받기"}
              </button>
            </form>
          </section>
        ) : (
          <section className="paper rounded-[24px] p-6 md:p-8">
            <h2 className="text-xl font-semibold text-[#2d241b]">판매자 시세 분석</h2>
            <p className="mt-2 text-sm text-[#655646]">보유 PC 구성과 상태를 입력하면 AI가 적정 판매가 범위를 제안합니다.</p>

            <form onSubmit={handleValuationSubmit} className="mt-6 grid gap-4">
              <label className="grid gap-1 text-sm">
                <span className="text-[#5d4f41]">주요 용도</span>
                <select
                  value={purpose}
                  onChange={(event) => setPurpose(event.target.value)}
                  className="rounded-xl border border-black/10 bg-white px-3 py-2 outline-none focus:border-[#2d241b]"
                >
                  <option value="gaming">게이밍</option>
                  <option value="office">사무용</option>
                  <option value="editing">영상 편집</option>
                  <option value="streaming">방송 송출</option>
                </select>
              </label>

              <label className="grid gap-1 text-sm">
                <span className="text-[#5d4f41]">구성 정보</span>
                <textarea
                  rows={3}
                  value={components}
                  onChange={(event) => setComponents(event.target.value)}
                  className="rounded-xl border border-black/10 bg-white px-3 py-2 outline-none focus:border-[#2d241b]"
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="text-[#5d4f41]">상태 메모</span>
                <textarea
                  rows={2}
                  value={conditionNote}
                  onChange={(event) => setConditionNote(event.target.value)}
                  className="rounded-xl border border-black/10 bg-white px-3 py-2 outline-none focus:border-[#2d241b]"
                />
              </label>

              <label className="grid gap-1 text-sm">
                <span className="text-[#5d4f41]">사용 연수 (년)</span>
                <input
                  type="number"
                  min={0}
                  max={15}
                  value={usageYears}
                  onChange={(event) => setUsageYears(Number(event.target.value))}
                  className="rounded-xl border border-black/10 bg-white px-3 py-2 outline-none focus:border-[#2d241b]"
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-[#b8471f] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {loading ? "시세 분석 중..." : "적정가 분석 받기"}
              </button>
            </form>
          </section>
        )}

        <section className="paper rounded-[24px] p-6 md:p-8">
          <h3 className="text-lg font-semibold text-[#2d241b]">AI 결과</h3>
          <p className="mt-1 text-sm text-[#655646]">JSON 응답 그대로 표시되며, 다음 단계에서 카드형 결과로 고도화 가능합니다.</p>

          {error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
          {mode === "buyer" && recommendation ? (
            typeof recommendation === "string" ? (
              <pre className="mt-4 overflow-x-auto rounded-xl bg-[#f8f5ee] p-4 text-sm leading-6 text-[#2d241b]">{recommendation}</pre>
            ) : (
              <div className="mt-4 grid gap-4 rounded-xl bg-[#f8f5ee] p-4 text-sm text-[#2d241b]">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#756655]">요약</p>
                  <p className="mt-2 leading-6">{recommendation.summary}</p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#756655]">추천 사양</p>
                  <div className="mt-2 grid gap-1">
                    <p>CPU: {recommendation.build.cpu}</p>
                    <p>GPU: {recommendation.build.gpu}</p>
                    <p>RAM: {recommendation.build.ram}</p>
                    <p>Storage: {recommendation.build.storage}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#756655]">예상 가격</p>
                  <p className="mt-2 font-medium">{recommendation.expected_price}</p>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#756655]">추천 이유</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 leading-6">
                    {recommendation.why.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#756655]">구매 체크리스트</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 leading-6">
                    {recommendation.checklist.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )
          ) : null}
          {mode === "seller" && valuation ? (
            <pre className="mt-4 overflow-x-auto rounded-xl bg-[#f8f5ee] p-4 text-sm leading-6 text-[#2d241b]">{valuation}</pre>
          ) : null}
          {!error && !recommendation && !valuation ? (
            <p className="mt-4 text-sm text-[#756655]">입력 후 분석을 실행하면 결과가 여기에 표시됩니다.</p>
          ) : null}
        </section>
      </div>
    </main>
  );
}