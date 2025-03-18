// /app/api/rank/route.js (혹은 src/app/api/rank/route.js)
import { NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { db } from "../../firebase";
import { doc, setDoc, collection } from "firebase/firestore";

export async function POST() {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    const targetUrl = "https://www.bluewings.kr/schedule/rank";
    await page.goto(targetUrl, { waitUntil: "networkidle0" });

    const content = await page.content();
    const { load } = await import("cheerio");
    const $ = load(content);

    const rankRows = $("table.ranking-table tbody tr");
    const results = [];

    rankRows.each((i, el) => {
      const $cols = $(el).find("td");

      // [0] rank, [1] team info, [2] empty, [3] games, [4] points ...
      const rankStr = $cols.eq(0).text().trim();

      const $teamTd = $cols.eq(1);
      const teamName = $teamTd.find("span").text().trim();
      // ===> 로고 추가 부분!
      const teamLogo = $teamTd.find("img").attr("src") || "";

      // 나머지 스탯들도 추출
      const played = $cols.eq(3).text().trim();
      const points = $cols.eq(4).text().trim();
      const wins = $cols.eq(5).text().trim();
      const draws = $cols.eq(6).text().trim();
      const losses = $cols.eq(7).text().trim();
      const goalsFor = $cols.eq(8).text().trim();
      const goalsAgainst = $cols.eq(9).text().trim();
      const goalDiff = $cols.eq(10).text().trim();

      // 숫자로 변환 (예: parseInt(rankStr, 10) || 0)
      // ...

      // rowData
      const rowData = {
        rank: parseInt(rankStr, 10) || 0,
        team: teamName,
        teamLogo: teamLogo,   // <-- 로고 URL 저장
        played: parseInt(played, 10) || 0,
        points: parseInt(points, 10) || 0,
        wins: parseInt(wins, 10) || 0,
        draws: parseInt(draws, 10) || 0,
        losses: parseInt(losses, 10) || 0,
        goalsFor: parseInt(goalsFor, 10) || 0,
        goalsAgainst: parseInt(goalsAgainst, 10) || 0,
        goalDiff: parseInt(goalDiff, 10) || 0,
      };
      results.push(rowData);
    });

    // Firestore에 저장
    for (const rowObj of results) {
      // 문서 ID = 팀명
      const docRef = doc(collection(db, "leagueRankings"), rowObj.team);
      await setDoc(docRef, rowObj, { merge: true });
    }

    return NextResponse.json({ success: true, total: results.length });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
