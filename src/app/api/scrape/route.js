import { NextResponse } from "next/server";
import puppeteer from "puppeteer";
import admin from "firebase-admin";
import path from "path";

// Firebase Admin SDK 초기화
const serviceAccount = require("../../../../firebaseAdmin.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

export async function GET() {
  try {
    console.log("✅ [API 호출됨] /api/scrape 실행 중...");

    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    console.log("🌍 네이버 스포츠 페이지 접속 중...");
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    );
    await page.goto("https://sports.naver.com/kfootball/record/index?category=kleague2", {
      waitUntil: "networkidle2",
    });

    // ✅ 페이지가 완전히 로딩될 때까지 대기
    console.log("⏳ K리그2 순위 데이터 로딩 대기 중...");
    await page.waitForSelector("#regularGroup_table tr", { timeout: 10000 });

    // ✅ K리그2 순위 가져오기
    const teamRanks = await page.evaluate(() => {
      const rows = document.querySelectorAll("#regularGroup_table tr");

      return Array.from(rows)
        .map((row) => {
          const cols = row.querySelectorAll("td, th");
          const teamElement = cols[1]?.querySelector("span");

          // ⚠️ 팀명이 없을 경우 제외
          if (!teamElement) return null;

          const teamName = teamElement.innerText.trim();
          if (!teamName) return null; // 빈 값이면 저장 안 함

          return {
            rank: cols[0]?.innerText.trim() || "N/A",
            team: teamName,
            played: cols[2]?.innerText.trim() || "0",
            points: cols[3]?.innerText.trim() || "0",
            wins: cols[4]?.innerText.trim() || "0",
            draws: cols[5]?.innerText.trim() || "0",
            losses: cols[6]?.innerText.trim() || "0",
            goalsFor: cols[7]?.innerText.trim() || "0",
            goalsAgainst: cols[8]?.innerText.trim() || "0",
            goalDifference: cols[9]?.innerText.trim() || "0",
          };
        })
        .filter((team) => team !== null); // 🔥 `null` 값 제거
    });

    await browser.close();

    console.log("📊 [스크래핑 완료] 가져온 데이터:", teamRanks);

    if (!teamRanks || teamRanks.length === 0) {
      console.error("❌ [오류] K리그2 데이터를 가져오지 못했습니다.");
      return NextResponse.json({ success: false, message: "❌ 데이터를 가져오지 못했습니다." });
    }

    // ✅ Firestore에 데이터 저장
    console.log("🔥 Firestore에 데이터 저장 중...");
    const ref = db.collection("kleague2_ranking");

    await Promise.all(
      teamRanks.map((team) => {
        if (!team.team || team.team === "N/A") {
          console.warn(`⚠️ 저장 건너뜀: 팀명이 올바르지 않음 (${team.rank}위)`);
          return null;
        }
        return ref.doc(team.team).set(team, { merge: true });
      })
    );

    console.log("✅ Firestore 업데이트 완료!");
    return NextResponse.json({ success: true, message: "✅ K리그2 순위 업데이트 완료!", data: teamRanks });
  } catch (error) {
    console.error("❌ [API 오류]", error);
    return NextResponse.json({ success: false, message: "❌ 업데이트 실패", error: error.message });
  }
}
