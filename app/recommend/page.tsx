"use client";

import { useMemo, useState } from "react";
import { SiteNav } from "../components/SiteNav";

type CategoryOption = {
  value: string;
  label: string;
};

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

const categoryOptions: CategoryOption[] = [
  { value: "gaming", label: "게이밍" },
  { value: "office", label: "사무용" },
  { value: "editing", label: "편집/창작" },
  { value: "streaming", label: "방송 송출" },
];

const BUDGET_MIN = 300_000;
const BUDGET_MAX = 3_000_000;
const BUDGET_STEP = 50_000;

function formatWon(value: number) {
  return `W${new Intl.NumberFormat("ko-KR").format(value)}`;
}

export default function RecommendPage() {
  const [category, setCategory] = useState("gaming");
  const [budget, setBudget] = useState(1_500_000);
  const [requirements, setRequirements] = useState("게임 위주, 144Hz 모니터 사용, 소음은 낮을수록 좋음");
  const [result, setResult] = useState<RecommendationResult | string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function requestRecommendation() {
    try {
      setLoading(true);
      setError("");
      setResult(null);

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
          const parsed = JSON.parse(data.result) as unknown;
          setResult(isRecommendationResult(parsed) ? parsed : data.result);
        } catch {
          setResult(data.result);
        }
      } else if (isRecommendationResult(data.result)) {
        setResult(data.result);
      } else {
        setResult(data.raw ?? "응답이 비어 있습니다.");
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "알 수 없는 오류");
    } finally {
      setLoading(false);
    }
  }

  const itemCards = useMemo(() => {
    if (!result || typeof result === "string") {
      return [];
    }

    return [
      { part: "CPU", name: result.build.cpu, price: result.expected_price },
      { part: "GPU", name: result.build.gpu, price: result.expected_price },
      { part: "RAM", name: result.build.ram, price: result.expected_price },
      { part: "SSD", name: result.build.storage, price: result.expected_price },
    ];
  }, [result]);

  return (
    <main className="min-h-dvh bg-neutral-100 text-neutral-900">
      <section className="mx-auto grid w-full max-w-7xl grid-cols-1 gap-5 px-5 py-8 sm:gap-6 sm:px-8 sm:py-10 lg:max-w-[90rem] lg:grid-cols-2 lg:gap-8 lg:px-10 xl:max-w-[100rem] xl:gap-10 xl:px-12 2xl:py-12 lg:items-start">
        <div className="col-span-full">
          <SiteNav />
        </div>
        {/* 왼쪽: 입력 폼 */}
        <div className="flex flex-col gap-5 rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm sm:gap-6 sm:p-10 lg:p-12">
          <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-5 sm:p-7 lg:p-8">
            <p className="text-lg font-black text-neutral-700 sm:text-xl lg:text-2xl">예산</p>
            <div className="mt-4">
              <input
                type="range"
                min={BUDGET_MIN}
                max={BUDGET_MAX}
                step={BUDGET_STEP}
                value={budget}
                onChange={(event) => setBudget(Number(event.target.value))}
                className="h-2.5 w-full cursor-pointer accent-neutral-500 sm:h-3 lg:h-3.5"
                aria-valuemin={BUDGET_MIN}
                aria-valuemax={BUDGET_MAX}
                aria-valuenow={budget}
                aria-label="예산"
              />
              <div className="mt-3 flex justify-between text-sm font-bold text-neutral-500 sm:text-base lg:text-lg">
                <span>{formatWon(BUDGET_MIN)}</span>
                <span>{formatWon(BUDGET_MAX)}</span>
              </div>
            </div>
            <div className="mt-5 text-center text-3xl font-black text-neutral-900 sm:text-4xl lg:text-5xl">
              {formatWon(budget)}
            </div>
          </div>

          <label className="block text-xl font-black sm:text-2xl lg:text-3xl">
            용도
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="mt-3 w-full rounded-xl border-2 border-neutral-200 bg-white px-4 py-3.5 text-lg font-bold outline-none hover:border-neutral-400 sm:px-5 sm:py-4 sm:text-xl lg:text-2xl"
            >
              {categoryOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col text-xl font-black sm:text-2xl lg:text-3xl">
            추가 요청
            <textarea
              rows={6}
              value={requirements}
              onChange={(event) => setRequirements(event.target.value)}
              className="mt-3 min-h-[10rem] w-full resize-y rounded-xl border-2 border-neutral-200 bg-white px-4 py-3.5 text-lg font-semibold outline-none hover:border-neutral-400 sm:px-5 sm:py-4 sm:text-xl lg:min-h-[12rem]"
            />
          </label>

          <button
            type="button"
            onClick={requestRecommendation}
            disabled={loading}
            className="rounded-2xl bg-neutral-500 px-6 py-5 text-xl font-black text-white shadow-md transition hover:bg-neutral-400 active:bg-neutral-600 disabled:opacity-60 sm:py-6 sm:text-2xl lg:text-3xl xl:py-7"
          >
            {loading ? "추천 생성 중…" : "추천 받기"}
          </button>
        </div>

        {/* 오른쪽: 결과 표시 */}
        <div className="flex flex-col gap-5 rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm sm:gap-6 sm:p-10 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto lg:p-12">
          <div className="rounded-3xl border border-neutral-200 bg-neutral-50 p-5 text-center sm:p-6 lg:p-8">
            <p className="text-lg font-black text-neutral-600 sm:text-xl lg:text-2xl">추천 PC 구성 및 요약</p>
            {result && typeof result !== "string" ? (
              <p className="mt-4 text-2xl font-black text-neutral-900 sm:text-3xl lg:text-4xl">
                최종 예상 가격: {result.expected_price}
              </p>
            ) : (
              <p className="mt-4 text-lg text-neutral-500 sm:text-xl lg:text-2xl">
                예산과 용도를 선택한 뒤 왼쪽에서 「추천 받기」를 누르면 결과가 표시됩니다.
              </p>
            )}
          </div>

          {loading && (
            <div className="mt-6 flex items-center justify-center">
              <p className="text-xl font-black animate-pulse sm:text-2xl lg:text-3xl">추천 생성 중...</p>
            </div>
          )}

          {error && (
            <div className="mt-6 rounded-xl border-2 border-red-400 bg-red-50 p-5 text-lg text-red-700 sm:p-6">
              <p className="font-bold sm:text-xl">{error}</p>
            </div>
          )}

          {result && typeof result === "string" && !loading ? (
            <pre className="mt-4 whitespace-pre-wrap rounded-2xl border border-neutral-200 bg-neutral-50 p-5 text-base font-semibold leading-7 text-neutral-800 sm:p-6 sm:text-lg lg:text-xl">
              {result}
            </pre>
          ) : null}

          {result && typeof result !== "string" && !loading && (
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:gap-5">
                {itemCards.map((item) => (
                  <div key={item.part} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-center sm:p-5">
                    <p className="text-base font-black text-neutral-700 sm:text-lg">{item.part}</p>
                    <p className="mt-2 truncate text-sm font-semibold text-neutral-600 sm:text-base">{item.name}</p>
                    <p className="mt-2 text-sm font-black text-neutral-900 sm:text-base lg:text-lg">{item.price}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5 lg:p-6">
                <p className="text-sm font-black text-neutral-600 sm:text-base">추천 요약</p>
                <p className="mt-3 text-sm font-semibold leading-7 text-neutral-600 sm:text-base sm:leading-8 lg:text-lg">
                  {result.summary}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
