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
const BUDGET_MAX = 10_000_000;
const BUDGET_STEP = 50_000;
const BUDGET_TOO_LOW_MESSAGE = "예산은 30만 원 이상이어야 합니다. 다시 입력해 주세요.";

function formatWon(value: number) {
  return `W${new Intl.NumberFormat("ko-KR").format(value)}`;
}

function parseBudgetInput(text: string) {
  const digits = text.replace(/\D/g, "");
  if (digits === "") {
    return null;
  }

  return Number(digits);
}

function clampBudgetForSlider(value: number) {
  const stepped = Math.round(value / BUDGET_STEP) * BUDGET_STEP;
  return Math.min(BUDGET_MAX, Math.max(BUDGET_MIN, stepped));
}

export default function RecommendPage() {
  const [category, setCategory] = useState("gaming");
  const [budget, setBudget] = useState(1_500_000);
  const [budgetInput, setBudgetInput] = useState("1500000");
  const [budgetWarning, setBudgetWarning] = useState("");
  const [requirements, setRequirements] = useState("게임 위주, 144Hz 모니터 사용, 소음은 낮을수록 좋음");
  const [result, setResult] = useState<RecommendationResult | string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const parsedBudgetInput = parseBudgetInput(budgetInput);
  const isBudgetTooLow = parsedBudgetInput !== null && parsedBudgetInput < BUDGET_MIN;
  const sliderValue =
    parsedBudgetInput === null || parsedBudgetInput < BUDGET_MIN
      ? BUDGET_MIN
      : clampBudgetForSlider(Math.min(parsedBudgetInput, BUDGET_MAX));

  function handleBudgetInputChange(raw: string) {
    const digits = raw.replace(/\D/g, "");
    const trimmed = digits.slice(0, String(BUDGET_MAX).length);
    setBudgetInput(trimmed);

    if (trimmed === "") {
      setBudgetWarning("");
      return;
    }

    const parsed = Number(trimmed);
    if (parsed < BUDGET_MIN) {
      setBudgetWarning(BUDGET_TOO_LOW_MESSAGE);
      return;
    }

    if (parsed > BUDGET_MAX) {
      setBudgetWarning(`예산은 ${formatWon(BUDGET_MAX)} 이하로 입력해 주세요.`);
      return;
    }

    setBudgetWarning("");
    const clamped = clampBudgetForSlider(parsed);
    setBudget(clamped);
  }

  function handleBudgetInputBlur() {
    if (budgetInput === "") {
      setBudgetInput(String(budget));
      setBudgetWarning("");
      return;
    }

    const parsed = parseBudgetInput(budgetInput);
    if (parsed === null) {
      return;
    }

    if (parsed < BUDGET_MIN) {
      setBudgetWarning(BUDGET_TOO_LOW_MESSAGE);
      return;
    }

    const clamped = clampBudgetForSlider(Math.min(parsed, BUDGET_MAX));
    setBudget(clamped);
    setBudgetInput(String(clamped));
    setBudgetWarning("");
  }

  function handleSliderChange(value: number) {
    setBudget(value);
    setBudgetInput(String(value));
    setBudgetWarning("");
  }

  async function requestRecommendation() {
    const parsed = parseBudgetInput(budgetInput);

    if (parsed === null) {
      setBudgetWarning("예산을 입력해 주세요.");
      return;
    }

    if (parsed < BUDGET_MIN) {
      setBudgetWarning(BUDGET_TOO_LOW_MESSAGE);
      return;
    }

    if (parsed > BUDGET_MAX) {
      setBudgetWarning(`예산은 ${formatWon(BUDGET_MAX)} 이하로 입력해 주세요.`);
      return;
    }

    const finalBudget = clampBudgetForSlider(parsed);

    try {
      setLoading(true);
      setError("");
      setBudgetWarning("");
      setResult(null);
      setBudget(finalBudget);
      setBudgetInput(String(finalBudget));

      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budget: finalBudget, category, requirements }),
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
      <section className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 px-4 py-5 sm:px-6 lg:grid-cols-2 lg:items-start">
        <div className="col-span-full">
          <SiteNav />
        </div>
        {/* 왼쪽: 입력 폼 */}
        <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 sm:p-4">
            <p className="text-sm font-semibold text-neutral-700">예산</p>
            <div className="mt-3">
              <input
                type="range"
                min={BUDGET_MIN}
                max={BUDGET_MAX}
                step={BUDGET_STEP}
                value={sliderValue}
                onChange={(event) => handleSliderChange(Number(event.target.value))}
                className="h-2 w-full cursor-pointer accent-neutral-500"
                aria-valuemin={BUDGET_MIN}
                aria-valuemax={BUDGET_MAX}
                aria-valuenow={sliderValue}
                aria-label="예산"
              />
              <div className="mt-2 flex justify-between text-xs font-bold text-neutral-500 sm:text-sm">
                <span>{formatWon(BUDGET_MIN)}</span>
                <span>{formatWon(BUDGET_MAX)}</span>
              </div>
            </div>
            <label className="mt-3 block text-xs font-medium text-neutral-600">
              직접 입력
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  value={budgetInput}
                  onChange={(event) => handleBudgetInputChange(event.target.value)}
                  onBlur={handleBudgetInputBlur}
                  placeholder="0"
                  className={`w-full rounded-md border bg-white px-3 py-2 text-sm font-medium tabular-nums outline-none hover:border-neutral-400 focus:border-neutral-500 ${
                    isBudgetTooLow || budgetWarning
                      ? "border-amber-500 focus:border-amber-500"
                      : "border-neutral-200"
                  }`}
                  aria-label="예산 직접 입력"
                  aria-invalid={isBudgetTooLow || Boolean(budgetWarning)}
                />
                <span className="shrink-0 text-sm text-neutral-500">원</span>
              </div>
              {budgetWarning ? (
                <p className="mt-1.5 text-sm font-medium text-amber-700" role="alert">
                  {budgetWarning}
                </p>
              ) : parsedBudgetInput !== null && parsedBudgetInput >= BUDGET_MIN ? (
                <p className="mt-1.5 text-center text-sm font-semibold text-neutral-800">
                  {formatWon(clampBudgetForSlider(Math.min(parsedBudgetInput, BUDGET_MAX)))} ·{" "}
                  {BUDGET_STEP.toLocaleString("ko-KR")}원 단위
                </p>
              ) : (
                <p className="mt-1.5 text-center text-xs text-neutral-500">
                  {formatWon(BUDGET_MIN)} ~ {formatWon(BUDGET_MAX)}
                </p>
              )}
            </label>
          </div>

          <label className="block text-sm font-semibold text-neutral-800">
            용도
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="mt-1.5 w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm font-medium outline-none hover:border-neutral-400"
            >
              {categoryOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col text-sm font-semibold text-neutral-800">
            추가 요청
            <textarea
              rows={4}
              value={requirements}
              onChange={(event) => setRequirements(event.target.value)}
              className="mt-1.5 min-h-[5.5rem] w-full resize-y rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm outline-none hover:border-neutral-400"
            />
          </label>

          <button
            type="button"
            onClick={requestRecommendation}
            disabled={loading || isBudgetTooLow || budgetInput === ""}
            className="rounded-lg bg-neutral-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-400 active:bg-neutral-600 disabled:opacity-60"
          >
            {loading ? "추천 생성 중…" : "추천 받기"}
          </button>
        </div>

        {/* 오른쪽: 결과 표시 */}
        <div className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-5 lg:sticky lg:top-[4.5rem] lg:max-h-[calc(100dvh-5rem)] lg:overflow-y-auto">
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-center">
            <p className="text-sm font-semibold text-neutral-600">추천 PC 구성 및 요약</p>
            {result && typeof result !== "string" ? (
              <p className="mt-2 text-lg font-bold text-neutral-900">
                최종 예상 가격: {result.expected_price}
              </p>
            ) : (
              <p className="mt-2 text-sm text-neutral-500">
                예산과 용도를 선택한 뒤 「추천 받기」를 누르면 결과가 표시됩니다.
              </p>
            )}
          </div>

          {loading && (
            <div className="mt-4 flex items-center justify-center">
              <p className="text-sm font-medium animate-pulse text-neutral-600">추천 생성 중...</p>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
              <p className="font-medium">{error}</p>
            </div>
          )}

          {result && typeof result === "string" && !loading ? (
            <pre className="mt-3 whitespace-pre-wrap rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs font-medium leading-5 text-neutral-800 sm:text-sm">
              {result}
            </pre>
          ) : null}

          {result && typeof result !== "string" && !loading && (
            <div className="mt-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {itemCards.map((item) => (
                  <div key={item.part} className="rounded-lg border border-neutral-200 bg-neutral-50 p-2.5 text-center">
                    <p className="text-xs font-semibold text-neutral-700">{item.part}</p>
                    <p className="mt-1 truncate text-xs text-neutral-600">{item.name}</p>
                    <p className="mt-1 text-xs font-semibold text-neutral-900">{item.price}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-lg border border-neutral-200 bg-white p-2.5">
                <p className="text-xs font-semibold text-neutral-600">추천 요약</p>
                <p className="mt-1 text-xs leading-5 text-neutral-600">{result.summary}</p>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
