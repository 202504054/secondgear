"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Recommendation = {
  cpu?: string;
  gpu?: string;
  ram?: string;
  storage?: string;
  estimated_price?: string;
};

function ResultContent() {
  const params = useSearchParams();
  const budget = params.get("budget");
  const category = params.get("category");

  const [data, setData] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!budget || !category) {
      return;
    }

    fetch("/api/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ budget, category }),
    })
      .then((res) => res.json())
      .then((res) => {
        try {
          const parsed = JSON.parse(res.result) as Recommendation;
          setData(parsed);
        } catch {
          console.log("JSON parse failed:", res.result);
        }
        setLoading(false);
      });
  }, [budget, category]);

  if (!budget || !category) return <p className="p-10">파라미터가 올바르지 않습니다.</p>;
  if (loading) return <p className="p-10">추천 생성 중...</p>;
  if (!data) return <p className="p-10">결과 생성 실패</p>;

  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold">추천 결과</h1>
      <div className="mt-4 rounded-xl border p-4">
        <p>CPU: {data.cpu}</p>
        <p>GPU: {data.gpu}</p>
        <p>RAM: {data.ram}</p>
        <p>Storage: {data.storage}</p>
        <p className="mt-2 font-bold">가격: {data.estimated_price}</p>
      </div>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={<p className="p-10">로딩 중...</p>}>
      <ResultContent />
    </Suspense>
  );
}