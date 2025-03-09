const puppeteer = require("puppeteer");
const admin = require("firebase-admin");
require("dotenv").config(); // 환경 변수 로드

// Firebase 관리자 초기화
const serviceAccount = require("../firebaseAdmin.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function scrapeKLeague2() {
  const browser = await puppeteer.launch({ headless: "new" }); // GUI 없이 실행
  const page = await browser.newPage();

  // 네이버 K리그2 순위 페이지 이동
  await page.goto("https://sports.naver.com/kfootball/record/index?category=kleague2");

  // 팀 순위 가져오기
  const teamRanks = await page.evaluate(() => {
    const rows = document.querySelectorAll(".tbl_list tbody tr");
    return Array.from(rows).map((row) => {
      const cols = row.querySelectorAll("td");
      return {
        rank: cols[0].innerText.trim(),
        team: cols[1].innerText.trim(),
        played: cols[2].innerText.trim(),
        points: cols[3].innerText.trim(),
      };
    });
  });

  await browser.close();

  // Firestore에 저장
  const ref = db.collection("kleague2_ranking");
  await Promise.all(
    teamRanks.map((team) =>
      ref.doc(team.team).set(team, { merge: true })
    )
  );
  console.log("✅ K리그2 순위 업데이트 완료!");
}

// 스크립트 실행
scrapeKLeague2();
