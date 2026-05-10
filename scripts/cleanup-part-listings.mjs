import { readFile, writeFile } from "fs/promises";
import path from "path";

const INPUT_PATH = path.join(process.cwd(), "data", "part-listings.json");

const BLOCKED_PATTERNS = [
  /파워레인저/i,
  /체인소맨/i,
  /키라키라/i,
  /메탈\s*엽서/i,
  /엽서/i,
  /굿즈/i,
  /피규어/i,
  /넨도로이드/i,
  /아크릴/i,
  /포스터/i,
  /포토카드/i,
  /갤럭시/i,
  /아이폰/i,
  /아이패드/i,
  /휴대폰/i,
  /스마트폰/i,
  /태블릿/i,
  /보조배터리/i,
  /파워뱅크/i,
  /월광보합/i,
  /게임기/i,
  /닌텐도/i,
  /플스/i,
  /ps5/i,
  /xbox/i,
  /서브폰/i,
  /무선랜카드/i,
  /수리기기/i,
  /리딤코드/i,
  /게임코드/i,
  /쿠폰/i,
];
const COMPUTER_CONTEXT_PATTERNS = [
  /컴퓨터/i,
  /pc/i,
  /데스크탑/i,
  /본체/i,
  /cpu/i,
  /gpu/i,
  /그래픽카드/i,
  /그래픽 카드/i,
  /메인보드/i,
  /마더보드/i,
  /ram/i,
  /메모리/i,
  /ssd/i,
  /nvme/i,
  /m\.2/i,
  /ddr4/i,
  /ddr5/i,
  /파워서플라이/i,
  /power supply/i,
  /psu/i,
  /쿨러/i,
  /수랭/i,
  /공랭/i,
  /시스템쿨러/i,
  /노트북/i,
  /게이밍/i,
  /서버/i,
  /워크스테이션/i,
  /atx/i,
  /sfx/i,
];

async function main() {
  const raw = await readFile(INPUT_PATH, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("part-listings.json must contain an array");
  }

  const filtered = parsed.filter((item) => {
    const title = String(item?.title ?? "");
    const haystack = title.toLowerCase();

    return COMPUTER_CONTEXT_PATTERNS.some((pattern) => pattern.test(haystack)) && !BLOCKED_PATTERNS.some((pattern) => pattern.test(haystack));
  });

  await writeFile(INPUT_PATH, `${JSON.stringify(filtered, null, 2)}\n`, "utf8");
  console.log(`removed ${parsed.length - filtered.length} unrelated listings`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});