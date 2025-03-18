import { NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { db } from "../../firebase"; // 본인의 firebase 설정 경로
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

//
// 1) 경기 문서 ID 생성 함수
//
function makeDocId(matchDateTime, homeTeam, awayTeam) {
  // 예: "2025-02-22_수원_vs_인천"
  const dateStr = matchDateTime.toISOString().split("T")[0]; // YYYY-MM-DD
  const home = homeTeam.replace(/\s+/g, "");
  const away = awayTeam.replace(/\s+/g, "");
  return `${dateStr}_${home}_vs_${away}`;
}

export async function POST() {
  let browser;
  try {
    // 1) Puppeteer 실행
    browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();

    // 2) 페이지 이동
    const targetUrl = "https://www.bluewings.kr/schedule/match";
    await page.goto(targetUrl, { waitUntil: "networkidle0" });

    // 3) 최종 렌더링된 HTML
    const content = await page.content();
    const { load } = await import("cheerio");
    const $ = load(content);

    // 4) <tr class="match-row"> 마다 파싱
    const matchRows = $(".match-list-box table tr.match-row");
    const results = [];

    matchRows.each((i, el) => {
      const $row = $(el);

      // (A) 날짜/시간
      const $left = $row.find("td.left");
      const dateTimeText = $left.find(".title-sub-bold").text().trim();

      // (B) 경기장
      const stadiumLine = $left.find(".title-body-regular").text().trim();
      const stadiumText = stadiumLine.replace(/^@/, "").trim();

      // (C) 왼쪽 팀
      const $leftTeamBox = $row.find("td.team-logo-left");
      const leftTeamName = $leftTeamBox.find(".title-sub-bold").text().trim();
      const leftTeamLogo = $leftTeamBox.find("img").attr("src") || "";

      // (D) 점수 (예: "2 : 1" 또는 "VS")
      const scoreText = $row.find("td.number .eng-title-main-bold").text().trim();
      let homeScore = "";
      let awayScore = "";
      let result = ""; // "HOME"/"AWAY"/"DRAW" or ""

      if (scoreText.includes(":")) {
        const [ls, rs] = scoreText.split(":").map((s) => s.trim());
        homeScore = ls;
        awayScore = rs;

        const h = parseInt(homeScore, 10);
        const a = parseInt(awayScore, 10);
        if (!isNaN(h) && !isNaN(a)) {
          if (h > a) result = "HOME";
          else if (h < a) result = "AWAY";
          else result = "DRAW";
        }
      }

      // (E) 오른쪽 팀
      const $rightTeamBox = $row.find("td.team-logo-right");
      const rightTeamName = $rightTeamBox.find(".title-sub-bold").text().trim();
      const rightTeamLogo = $rightTeamBox.find("img").attr("src") || "";

      // (F) 수원 홈/원정 배정
      const stadiumNoSpace = stadiumText.replace(/\s+/g, "");
      let homeTeam, awayTeam, homeLogo, awayLogo;
      if (stadiumNoSpace.includes("수원월드컵경기장")) {
        // 수원 홈
        if (leftTeamName.includes("수원")) {
          homeTeam = leftTeamName;
          homeLogo = leftTeamLogo;
          awayTeam = rightTeamName;
          awayLogo = rightTeamLogo;
        } else {
          homeTeam = rightTeamName;
          homeLogo = rightTeamLogo;
          awayTeam = leftTeamName;
          awayLogo = leftTeamLogo;
        }
      } else {
        // 수원 원정
        if (leftTeamName.includes("수원")) {
          awayTeam = leftTeamName;
          awayLogo = leftTeamLogo;
          homeTeam = rightTeamName;
          homeLogo = rightTeamLogo;
        } else {
          awayTeam = rightTeamName;
          awayLogo = rightTeamLogo;
          homeTeam = leftTeamName;
          homeLogo = leftTeamLogo;
        }
      }

      // (G) 날짜 파싱 => Date 객체
      const thisYear = new Date().getFullYear();
      let matchDateTime = new Date();
      const mmdd = dateTimeText.match(/(\d{2})\.(\d{2}).*\s+(\d{1,2}):(\d{2})/);
      if (mmdd) {
        const [_, mm, dd, hh, min] = mmdd;
        const dateStr = `${thisYear}-${mm}-${dd} ${hh}:${min}:00`;
        matchDateTime = new Date(dateStr);
      }

      // (H) 결과 객체
      const matchData = {
        matchDateTime,
        stadium: stadiumText,
        homeTeam,
        homeLogo,
        awayTeam,
        awayLogo,
        homeScore,
        awayScore,
        result,         // "HOME"/"AWAY"/"DRAW" or ""
        pointsAwarded: false, // 포인트 지급 여부 (기본 false)
      };
      results.push(matchData);
    });

    // 5) Firestore 저장 + 포인트 로직
    for (const matchObj of results) {
      // 문서 ID
      const docId = makeDocId(
        matchObj.matchDateTime,
        matchObj.homeTeam,
        matchObj.awayTeam
      );
      const matchRef = doc(db, "matches", docId);

      // (A) setDoc -> 덮어쓰기/병합
      await setDoc(matchRef, matchObj, { merge: true });

      // (B) 다시 getDoc해서 현재 상태 확인
      const snap = await getDoc(matchRef);
      if (!snap.exists()) continue;
      const current = snap.data(); // { result, pointsAwarded, ... }

      // (C) 만약 already pointsAwarded==true 이면 스킵 (중복 지급 방지)
      if (current.pointsAwarded) {
        continue;
      }

      // (D) result가 확정인지 확인
      if (current.result && current.result !== "") {
        // === 포인트 지급 로직 ===
        // 1) 해당 경기의 predictions 컬렉션
        const predsCol = collection(db, "matches", docId, "predictions");
        const predsSnap = await getDocs(predsCol);

        for (const pDoc of predsSnap.docs) {
          const data = pDoc.data(); // { nickname, choice }
          // 맞췄는지?
          if (data.choice === current.result) {
            // +3점
            const userRef = doc(db, "users", pDoc.id); // pDoc.id == user uid
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const userData = userSnap.data();
              const oldPoints = userData.points || 0;
              const newPoints = oldPoints + 3;

              // users/{uid} 업데이트
              await updateDoc(userRef, { points: newPoints });

              // pointLogs 기록
              await addDoc(collection(db, "pointLogs"), {
                userId: pDoc.id,
                nickname: userData.nickname || "",
                oldPoints,
                addedPoints: 3,
                newPoints,
                matchId: docId,
                matchResult: current.result,
                timestamp: serverTimestamp(),
              });
            }
          }
        }

        // 2) 경기 문서에 pointsAwarded = true 업데이트
        await updateDoc(matchRef, { pointsAwarded: true });
      }
    }

    // 6) 최종 응답
    return NextResponse.json({
      success: true,
      total: results.length,
    });
  } catch (err) {
    console.error("ERROR /api/bluewings =>", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
