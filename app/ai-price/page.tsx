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

const DEFAULT_CONDITION_NOTE = "생활 기스 소량, 채굴 이력 없음";

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
  const [conditionNote, setConditionNote] = useState(DEFAULT_CONDITION_NOTE);
  const [usageYears, setUsageYears] = useState("2");
  const [valuation, setValuation] = useState<ValuationResult | string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleValuationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setValuation(null);
    setLoading(true);

    const numericUsageYears = Number(usageYears);
    if (Number.isNaN(numericUsageYears)) {
      setError("사용 연수를 올바르게 입력해 주세요.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/valuation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purpose,
          components,
          conditionNote: `${conditionGrade}${conditionNote ? ` / ${conditionNote}` : ""}`,
          usageYears: numericUsageYears,
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
      <section className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6">
        <SiteNav />
        <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr] md:items-start">
            <form onSubmit={handleValuationSubmit} className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
              <label className="text-sm font-semibold text-neutral-800">
                부품명
                <input
                  value={components}
                  onChange={(event) => setComponents(event.target.value)}
                  className="mt-1.5 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm font-medium outline-none hover:border-neutral-400"
                />
              </label>

              <label className="text-sm font-semibold text-neutral-800">
                카테고리
                <select
                  value={purpose}
                  onChange={(event) => setPurpose(event.target.value)}
                  className="mt-1.5 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm font-medium outline-none hover:border-neutral-400"
                >
                  {categoryOptions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-semibold text-neutral-800">
                상태
                <select
                  value={conditionGrade}
                  onChange={(event) => setConditionGrade(event.target.value)}
                  className="mt-1.5 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm font-medium outline-none hover:border-neutral-400"
                >
                  <option value="신품">신품</option>
                  <option value="중고">중고</option>
                </select>
              </label>

              <label className="text-sm font-semibold text-neutral-800">
                상세 설명
                <textarea
                  rows={4}
                  value={conditionNote}
                  onChange={(event) => setConditionNote(event.target.value)}
                  className={`mt-1.5 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none hover:border-neutral-400 ${
                    conditionNote === DEFAULT_CONDITION_NOTE ? "text-neutral-500" : "text-neutral-900"
                  }`}
                />
              </label>

              <label className="text-sm font-semibold text-neutral-800">
                사용 연수
                <input
                  type="number"
                  min={0}
                  max={15}
                  value={usageYears}
                  onChange={(event) => setUsageYears(event.target.value)}
                  className="mt-1.5 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm font-medium outline-none hover:border-neutral-400"
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 rounded-lg bg-neutral-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-400 active:bg-neutral-600 disabled:opacity-60"
              >
                {loading ? "분석 중..." : "AI 가격 제안"}
              </button>

              {error ? (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                  {error}
                </p>
              ) : null}
            </form>

            <aside className="flex flex-col rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5 md:sticky md:top-[4.5rem] md:max-h-[calc(100dvh-5rem)] md:overflow-y-auto">
              <p className="text-center text-base font-semibold text-neutral-800">
                AI 가격 제안
              </p>
              <p className="mt-3 text-center text-2xl font-bold text-neutral-900 sm:text-3xl">
                {valuation && typeof valuation !== "string" ? valuation.suggested_price : "—"}
              </p>
              <p className="mt-2 text-center text-xs text-neutral-500 sm:text-sm">
                분석 후 제안가가 표시됩니다. 시장 데이터를 참고합니다.
              </p>

              {valuation && typeof valuation !== "string" ? (
                <p className="mt-2 text-center text-sm font-medium text-neutral-800">범위: {valuation.price_range}</p>
              ) : null}

              {valuation && typeof valuation !== "string" ? (
                <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                  <p className="text-sm font-semibold text-neutral-800">추천 이유</p>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-5 text-neutral-700 sm:text-sm">
                    {valuation.reasoning.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {valuation && typeof valuation === "string" ? (
                <pre className="mt-3 max-h-32 overflow-auto whitespace-pre-wrap rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-800 sm:text-sm">
                  {valuation}
                </pre>
              ) : null}

            </aside>
        </div>
      </section>
    </main>
  );
}
