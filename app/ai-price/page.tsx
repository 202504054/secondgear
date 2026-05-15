"use client";

import { FormEvent, useState } from "react";
import { SiteNav } from "../components/SiteNav";

type ValuationResult = {
  suggested_price: string;
  price_range: string;
  confidence: string;
  reasoning: string[];
  selling_tips: string[];
};

type CategoryOption = {
  value: string;
  label: string;
};

const categoryOptions: CategoryOption[] = [
  { value: "gaming", label: "게이밍" },
  { value: "office", label: "사무용" },
  { value: "editing", label: "편집/창작" },
  { value: "streaming", label: "방송 송출" },
];

function isValuationResult(value: unknown): value is ValuationResult {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as ValuationResult;

  return Boolean(
    candidate.suggested_price &&
      candidate.price_range &&
      candidate.confidence &&
      Array.isArray(candidate.reasoning) &&
      Array.isArray(candidate.selling_tips)
  );
}

function parseJsonResult(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return isValuationResult(parsed) ? parsed : value;
  } catch {
    return value;
  }
}

export default function AiPricePage() {
  const [purpose, setPurpose] = useState("gaming");
  const [components, setComponents] = useState("RTX 3060, i5-12400F, RAM 16GB, SSD 1TB");
  const [conditionGrade, setConditionGrade] = useState("중고");
  const [conditionNote, setConditionNote] = useState("생활 기스 소량, 채굴 이력 없음");
  const [usageYears, setUsageYears] = useState(2);
  const [valuation, setValuation] = useState<ValuationResult | string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleValuationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setValuation(null);
    setLoading(true);

    try {
      const response = await fetch("/api/valuation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose,
          components,
          conditionNote: `${conditionGrade}${conditionNote ? ` / ${conditionNote}` : ""}`,
          usageYears,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "시세 분석 실패");
      }

      if (typeof data.result === "string") {
        setValuation(parseJsonResult(data.result));
      } else if (isValuationResult(data.result)) {
        setValuation(data.result);
      } else {
        setValuation(data.result ?? "응답이 비어 있습니다.");
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "알 수 없는 오류");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-dvh bg-neutral-100 text-neutral-900">
      <section className="mx-auto w-full max-w-7xl px-5 py-8 sm:px-8 sm:py-10 lg:max-w-[90rem] lg:px-10 xl:max-w-[100rem] xl:px-12 2xl:py-12">
        <SiteNav />
        <div className="grid gap-6 md:grid-cols-[1.25fr_0.75fr] md:items-start lg:gap-8 xl:gap-10">
            <form onSubmit={handleValuationSubmit} className="flex flex-col gap-4 rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm sm:gap-5 sm:p-10 lg:gap-6 lg:p-12">
              <label className="text-xl font-black sm:text-2xl lg:text-3xl">
                부품명
                <input
                  value={components}
                  onChange={(event) => setComponents(event.target.value)}
                  className="mt-3 w-full rounded-2xl border-2 border-neutral-200 bg-white px-5 py-4 text-lg font-bold outline-none shadow-sm hover:border-neutral-400 sm:py-4 sm:text-xl lg:text-2xl"
                />
              </label>

              <label className="text-xl font-black sm:text-2xl lg:text-3xl">
                카테고리
                <select
                  value={purpose}
                  onChange={(event) => setPurpose(event.target.value)}
                  className="mt-3 w-full rounded-2xl border-2 border-neutral-200 bg-white px-5 py-4 text-lg font-bold outline-none shadow-sm hover:border-neutral-400 sm:py-4 sm:text-xl lg:text-2xl"
                >
                  {categoryOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xl font-black sm:text-2xl lg:text-3xl">
                상태
                <select
                  value={conditionGrade}
                  onChange={(event) => setConditionGrade(event.target.value)}
                  className="mt-3 w-full rounded-2xl border-2 border-neutral-200 bg-white px-5 py-4 text-lg font-bold outline-none shadow-sm hover:border-neutral-400 sm:py-4 sm:text-xl lg:text-2xl"
                >
                  <option value="신품">신품</option>
                  <option value="중고">중고</option>
                </select>
              </label>

              <label className="text-xl font-black sm:text-2xl lg:text-3xl">
                상세 설명
                <textarea
                  rows={6}
                  value={conditionNote}
                  onChange={(event) => setConditionNote(event.target.value)}
                  className="mt-3 w-full rounded-2xl border-2 border-neutral-200 bg-white px-5 py-4 text-lg font-semibold outline-none shadow-sm hover:border-neutral-400 sm:py-4 sm:text-xl lg:text-2xl"
                />
              </label>

              <label className="text-xl font-black sm:text-2xl lg:text-3xl">
                사용 연수
                <input
                  type="number"
                  min={0}
                  max={15}
                  value={usageYears}
                  onChange={(event) => setUsageYears(Number(event.target.value))}
                  className="mt-3 w-full rounded-2xl border-2 border-neutral-200 bg-white px-5 py-4 text-lg font-bold outline-none shadow-sm hover:border-neutral-400 sm:py-4 sm:text-xl lg:text-2xl"
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="mt-4 rounded-2xl bg-neutral-500 px-6 py-5 text-2xl font-black text-white shadow-md transition hover:bg-neutral-400 active:bg-neutral-600 disabled:opacity-60 sm:py-6 sm:text-3xl lg:text-4xl xl:py-7"
              >
                {loading ? "분석 중..." : "AI 가격 제안"}
              </button>

              {error ? (
                <p className="rounded-2xl bg-[#ffe4e1] px-5 py-4 text-base font-bold text-[#b42318] shadow-sm sm:text-lg lg:text-xl">
                  {error}
                </p>
              ) : null}
            </form>

            <aside className="flex flex-col rounded-3xl border border-neutral-200 bg-white p-8 shadow-sm sm:p-10 md:sticky md:top-6 md:max-h-[calc(100dvh-3rem)] md:overflow-y-auto lg:p-12">
              <p className="text-center text-3xl font-black leading-tight text-neutral-800 sm:text-4xl lg:text-5xl">
                AI 가격 제안
              </p>
              <p className="mt-5 text-center text-5xl font-black text-neutral-900 sm:text-6xl lg:text-7xl">
                {valuation && typeof valuation !== "string" ? valuation.suggested_price : "—"}
              </p>
              <p className="mt-4 text-center text-lg font-semibold leading-8 text-neutral-500 sm:text-xl sm:leading-9 lg:text-2xl">
                분석 후 제안가가 표시됩니다. 시장 데이터를 참고합니다.
              </p>

              {valuation && typeof valuation !== "string" ? (
                <p className="mt-4 text-center text-lg font-bold text-neutral-800 sm:text-xl lg:text-2xl">범위: {valuation.price_range}</p>
              ) : null}

              {valuation && typeof valuation !== "string" ? (
                <div className="mt-6 rounded-3xl border border-neutral-200 bg-neutral-50 p-6 shadow-sm sm:p-7 lg:p-8">
                  <p className="text-xl font-black text-neutral-800 sm:text-2xl">추천 이유</p>
                  <ul className="mt-4 list-disc space-y-3 pl-6 text-base font-semibold leading-7 text-neutral-700 sm:text-lg sm:leading-8">
                    {valuation.reasoning.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {valuation && typeof valuation === "string" ? (
                <pre className="mt-4 max-h-40 overflow-auto whitespace-pre-wrap rounded-3xl border border-neutral-200 bg-neutral-50 p-5 text-base font-semibold text-neutral-800 shadow-sm sm:text-lg lg:text-xl">
                  {valuation}
                </pre>
              ) : null}

            </aside>
        </div>
      </section>
    </main>
  );
}
