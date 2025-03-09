"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { auth, db } from "../firebase";
import Link from "next/link";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import styles from "../styles/predictions.module.css";

/** 간단한 로딩 스피너 컴포넌트 */
function LoadingSpinner() {
  return (
    <div className={styles.loadingSpinnerContainer}>
      <div className={styles.loadingSpinner}></div>
      <p>로딩 중...</p>
    </div>
  );
}

/**
 * 경기 결과가 비어있으면 => (match.result === "")
 *   - now < (matchTime - 30분)  => "선택진행중"
 *   - (matchTime - 30분) <= now => "선택불가"
 * 결과가 있으면 => "경기종료"
 */
function getMatchStatus(match) {
  if (match.result && match.result !== "") {
    // 이미 result가 설정됨 => 경기종료
    return "경기종료";
  }

  const now = new Date();
  const start = match.matchDateTime.toDate();
  const thirtyBefore = new Date(start.getTime() - 30 * 60000);

  if (now < thirtyBefore) {
    return "선택진행중";
  } else {
    // 30분 이내부터 시작 시간 이후까지 => 선택불가
    return "선택불가";
  }
}

export default function Predictions() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true); // 로딩 상태
  const [user, setUser] = useState(null);
  const [nickname, setNickname] = useState("");
  const [admin, setAdmin] = useState(false);

  // 사용자 선택 캐시
  const [userChoices, setUserChoices] = useState({});

  // 펼친 경기의 참여자 목록. 예: { matchId: { HOME: [...], DRAW: [...], AWAY: [...] } }
  const [openedPredictions, setOpenedPredictions] = useState({});
  const [openMatchId, setOpenMatchId] = useState(null);

  // 새 경기 추가 (관리자용)
  const [newMatch, setNewMatch] = useState({
    matchDateTime: "",
    homeTeam: "",
    awayTeam: "",
    homeLogo: "",
    stadium: "",
    awayLogo: "",
  });

  // 결과 설정 (관리자용)
  const [matchResult, setMatchResult] = useState("");
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");

  // ===== 각 목록에서 "처음 표시할 개수" =====
  const [inProgressLimit, setInProgressLimit] = useState(5);
  const [lockedLimit, setLockedLimit] = useState(5);
  const [finishedLimit, setFinishedLimit] = useState(5);

  // =============== 파이어스토어 구독 & 사용자 인증 ===============
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // 닉네임 & 관리자 여부 확인
        const userDocSnap = await getDoc(doc(db, "users", currentUser.uid));
        if (userDocSnap.exists()) {
          setNickname(userDocSnap.data().nickname || "");
        }
        setAdmin(currentUser.email === "jihwan010606@gmail.com");
      } else {
        setNickname("");
        setAdmin(false);
      }
    });

    // 경기 목록 구독
    const q = query(collection(db, "matches"), orderBy("matchDateTime", "asc"));
    const unsubMatches = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setMatches(docs);
      setLoading(false); // 경기 목록 로딩 완료
    });

    return () => {
      unsubAuth();
      unsubMatches();
    };
  }, []);

  // =============== 경기 목록이 바뀔 때, 로그인된 사용자 선택내역 로드 ===============
  useEffect(() => {
    if (!user) return;
    const fetchUserPreds = async () => {
      const newMap = {};
      for (let m of matches) {
        const predRef = doc(db, "matches", m.id, "predictions", user.uid);
        const predSnap = await getDoc(predRef);
        if (predSnap.exists()) {
          newMap[m.id] = predSnap.data().choice; // "HOME"/"DRAW"/"AWAY"
        }
      }
      setUserChoices(newMap);
    };
    fetchUserPreds();
  }, [user, matches]);

  // =============== 상태별 목록 분류 ===============
  let inProgress = matches.filter((m) => getMatchStatus(m) === "선택진행중");
  let locked = matches.filter((m) => getMatchStatus(m) === "선택불가");
  let finished = matches.filter((m) => getMatchStatus(m) === "경기종료");

  // ============ 2) 정렬 로직 ============
  // - 선택진행중 & 선택불가 => 오래된 시간(작은 시간)이 위로 (오름차순)
  // - 경기종료 => 최근이 위로 (내림차순)
  inProgress.sort(
    (a, b) => a.matchDateTime.toDate() - b.matchDateTime.toDate()
  );
  locked.sort((a, b) => a.matchDateTime.toDate() - b.matchDateTime.toDate());
  finished.sort((a, b) => b.matchDateTime.toDate() - a.matchDateTime.toDate());

  // ============ 3) slice로 5개씩 제한 ============
  inProgress = inProgress.slice(0, inProgressLimit);
  locked = locked.slice(0, lockedLimit);
  finished = finished.slice(0, finishedLimit);

  // ============ 4) 더보기 버튼 핸들러 ============
  const handleShowMoreInProgress = () => {
    setInProgressLimit((prev) => prev + 5);
  };
  const handleShowMoreLocked = () => {
    setLockedLimit((prev) => prev + 5);
  };
  const handleShowMoreFinished = () => {
    setFinishedLimit((prev) => prev + 5);
  };

  // =============== 새 경기 추가 (관리자) ===============
  const handleAddMatch = async (e) => {
    e.preventDefault();
    if (!admin) return;

    try {
      await addDoc(collection(db, "matches"), {
        matchDateTime: new Date(newMatch.matchDateTime),
        homeTeam: newMatch.homeTeam,
        awayTeam: newMatch.awayTeam,
        homeLogo: newMatch.homeLogo,
        stadium: newMatch.stadium,
        awayLogo: newMatch.awayLogo,
        result: "", // 경기 결과 (HOME, DRAW, AWAY, "")
        homeScore: "",
        awayScore: "",
      });
      alert("새 경기가 추가되었습니다.");
      setNewMatch({
        matchDateTime: "",
        homeTeam: "",
        awayTeam: "",
        homeLogo: "",
        stadium: "",
        awayLogo: "",
      });
    } catch (err) {
      console.error(err);
      alert("경기 추가 중 오류 발생");
    }
  };

  // =============== 경기 선택하기 ===============
  const handleSelectChoice = async (matchId, choice) => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }
    // 이미 선택했다면 재선택 불가
    if (userChoices[matchId]) {
      alert("이미 선택하셨습니다!");
      return;
    }
    const confirmMsg = `${choice} 승을 선택하시겠습니까?`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await setDoc(doc(db, "matches", matchId, "predictions", user.uid), {
        nickname,
        choice,
      });
      alert("선택완료되었습니다.");
      // 새로고침
      window.location.reload();
    } catch (err) {
      console.error(err);
    }
  };

  // =============== 화살표 클릭 -> 참여자 목록 불러오기 ===============
  const handleTogglePredictions = async (match) => {
    if (openMatchId === match.id) {
      // 닫기
      setOpenMatchId(null);
      return;
    }

    // 열기
    try {
      const predsCol = collection(db, "matches", match.id, "predictions");
      const snap = await getDocs(predsCol);
      // 세 칸 각각 nickname, choice
      const homeArr = [];
      const drawArr = [];
      const awayArr = [];

      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.choice === "HOME") homeArr.push(data);
        else if (data.choice === "DRAW") drawArr.push(data);
        else if (data.choice === "AWAY") awayArr.push(data);
      });

      setOpenedPredictions((prev) => ({
        ...prev,
        [match.id]: { HOME: homeArr, DRAW: drawArr, AWAY: awayArr },
      }));
      setOpenMatchId(match.id);
    } catch (err) {
      console.error(err);
    }
  };

  // =============== 관리자: 결과 확정 -> 포인트 반영 ===============
  const handleSetResult = async (match) => {
    if (!admin) return;
    if (!matchResult) {
      alert("결과를 선택하세요 (HOME/DRAW/AWAY).");
      return;
    }

    try {
      // 1) matches/{id}에 result, homeScore, awayScore 반영
      const matchRef = doc(db, "matches", match.id);
      await updateDoc(matchRef, {
        result: matchResult,
        homeScore,
        awayScore,
      });

      // 2) 맞춘 사람 +3점
      const predsCol = collection(db, "matches", match.id, "predictions");
      const predsSnap = await getDocs(predsCol);

      // ★ 여기만 사용 (for-of 루프) ★
      for (const pDoc of predsSnap.docs) {
        const data = pDoc.data();
        if (data.choice === matchResult) {
          const userRef = doc(db, "users", pDoc.id);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const oldPoints = userSnap.data().points || 0;
            const newPoints = oldPoints + 3;

            // 유저 포인트 업데이트
            await updateDoc(userRef, { points: newPoints });

            // pointLogs 기록 남기기
            const pointLogsRef = collection(db, "pointLogs");
            await addDoc(pointLogsRef, {
              userId: pDoc.id, // uid
              nickname: userSnap.data().nickname,
              oldPoints,
              addedPoints: 3,
              newPoints,
              matchId: match.id,
              matchResult,
              timestamp: serverTimestamp(),
            });
          }
        }
      }

      alert("결과가 설정되었습니다!");
      // 입력값 리셋
      setMatchResult("");
      setHomeScore("");
      setAwayScore("");
    } catch (err) {
      console.error(err);
      alert("결과 설정 중 오류 발생");
    }
  };

  // =============== 로딩 중이면 스피너 표시 ===============
  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className={styles.predictionsContainer}>
      {/* 관리자: 새 경기 추가 폼 */}
      {admin && (
        <div className={styles.adminSection}>
          <h3>관리자: 새 경기 추가</h3>
          <form onSubmit={handleAddMatch} className={styles.adminForm}>
            <input
              type="datetime-local"
              value={newMatch.matchDateTime}
              onChange={(e) =>
                setNewMatch({ ...newMatch, matchDateTime: e.target.value })
              }
              required
            />
            <input
              type="text"
              placeholder="홈팀"
              value={newMatch.homeTeam}
              onChange={(e) =>
                setNewMatch({ ...newMatch, homeTeam: e.target.value })
              }
              required
            />
            <input
              type="text"
              placeholder="어웨이팀"
              value={newMatch.awayTeam}
              onChange={(e) =>
                setNewMatch({ ...newMatch, awayTeam: e.target.value })
              }
              required
            />
            <input
              type="text"
              placeholder="홈팀 로고 URL"
              value={newMatch.homeLogo}
              onChange={(e) =>
                setNewMatch({ ...newMatch, homeLogo: e.target.value })
              }
            />
            <input
              type="text"
              placeholder="경기장"
              value={newMatch.stadium}
              onChange={(e) =>
                setNewMatch({ ...newMatch, stadium: e.target.value })
              }
            />
            <input
              type="text"
              placeholder="어웨이팀 로고 URL"
              value={newMatch.awayLogo}
              onChange={(e) =>
                setNewMatch({ ...newMatch, awayLogo: e.target.value })
              }
            />
            <button type="submit">경기 추가</button>
          </form>
        </div>
      )}
      {/* ================== 선택진행중 ================== */}
      <span className={styles.sectionTitle}>선택진행중</span>
      <span className={styles.sectionTitledetail}>
        (경기시작 30분전까지)
      </span>{" "}
      {inProgress.length === 0 ? (
        <p>선택진행중인 경기가 없습니다.</p>
      ) : (
        inProgress.map((match) => (
          <MatchItem
            key={match.id}
            match={match}
            status="선택진행중"
            userChoice={userChoices[match.id] || ""}
            onSelectChoice={handleSelectChoice}
            admin={admin}
            matchResult={matchResult}
            setMatchResult={setMatchResult}
            homeScore={homeScore}
            setHomeScore={setHomeScore}
            awayScore={awayScore}
            setAwayScore={setAwayScore}
            onSetResult={handleSetResult}
            openMatchId={openMatchId}
            onTogglePredictions={handleTogglePredictions}
            openedPredictions={openedPredictions}
          />
        ))
      )}
      {inProgress.length >= inProgressLimit && (
        <button
          onClick={handleShowMoreInProgress}
          className={styles.moreButton}
        >
          더보기
        </button>
      )}
      <div className={styles.sectionline}></div>
      {/* ================== 선택불가 ================== */}
      <span className={styles.sectionTitle2}>선택불가</span>
      <span className={styles.sectionTitledetail}>(경기시작 30분전부터)</span>
      {locked.length === 0 ? (
        <p>선택불가 경기가 없습니다.</p>
      ) : (
        locked.map((match) => (
          <MatchItem
            key={match.id}
            match={match}
            status="선택불가"
            userChoice={userChoices[match.id] || ""}
            onSelectChoice={handleSelectChoice}
            admin={admin}
            matchResult={matchResult}
            setMatchResult={setMatchResult}
            homeScore={homeScore}
            setHomeScore={setHomeScore}
            awayScore={awayScore}
            setAwayScore={setAwayScore}
            onSetResult={handleSetResult}
            openMatchId={openMatchId}
            onTogglePredictions={handleTogglePredictions}
            openedPredictions={openedPredictions}
          />
        ))
      )}
      {locked.length >= lockedLimit && (
        <button onClick={handleShowMoreLocked} className={styles.moreButton}>
          더보기
        </button>
      )}
      <div className={styles.sectionline}></div>
      {/* ================== 경기종료 ================== */}
      <span className={styles.sectionTitle3}>경기종료</span>
      <span className={styles.sectionTitledetail}>
        (경기종료시 결과&포인트 업데이트)
      </span>{" "}
      <span>
        <Link href="/admin/pointLogs" className={styles.pointLogs}>
        &#60;포인트 업데이트 현황 보러가기&#62;
        </Link>
      </span>
      {finished.length === 0 ? (
        <p>경기종료된 경기가 없습니다.</p>
      ) : (
        finished.map((match) => (
          <MatchItem
            key={match.id}
            match={match}
            status="경기종료"
            userChoice={userChoices[match.id] || ""}
            onSelectChoice={handleSelectChoice}
            admin={admin}
            matchResult={matchResult}
            setMatchResult={setMatchResult}
            homeScore={homeScore}
            setHomeScore={setHomeScore}
            awayScore={awayScore}
            setAwayScore={setAwayScore}
            onSetResult={handleSetResult}
            openMatchId={openMatchId}
            onTogglePredictions={handleTogglePredictions}
            openedPredictions={openedPredictions}
          />
        ))
      )}
      {finished.length >= finishedLimit && (
        <button onClick={handleShowMoreFinished} className={styles.moreButton}>
          더보기
        </button>
      )}
    </div>
  );
}

/** 개별 경기를 표시하는 컴포넌트 */
function MatchItem({
  match,
  status,
  userChoice,
  onSelectChoice,
  admin,
  matchResult,
  setMatchResult,
  homeScore,
  setHomeScore,
  awayScore,
  setAwayScore,
  onSetResult,
  openMatchId,
  onTogglePredictions,
  openedPredictions,
}) {
  const isFinished = match.result && match.result !== "";
  const isOpen = openMatchId === match.id;

  const correctChoice = match.result; // "HOME"/"DRAW"/"AWAY"

  // 상태 뱃지 색상
  let badgeClass = styles.badgeProgress;
  if (status === "선택불가") badgeClass = styles.badgeLocked;
  if (status === "경기종료") badgeClass = styles.badgeFinished;

  // 참여자 목록
  const predictions = openedPredictions[match.id] || {
    HOME: [],
    DRAW: [],
    AWAY: [],
  };

  return (
    <div className={styles.matchItem}>
      {/* 상단: 시간 + 상태 뱃지 */}
      <div className={styles.matchHeader}>
        <div className={styles.matchTime}>
          {match.matchDateTime?.toDate().toLocaleString("ko-KR", {
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
        <span className={styles.stadium}>{match.stadium}</span>
        <div className={`${styles.statusBadge} ${badgeClass}`}>{status}</div>
      </div>

      {/* 팀/로고/스코어 */}
      <div className={styles.matchTeams}>
        <div className={styles.teamBox}>
          {match.homeLogo && (
            <Image
              className={styles.logo}
              src={match.homeLogo}
              alt="home logo"
              width={60}
              height={70}
              unoptimized
            />
          )}
          <span className={styles.teamName}>{match.homeTeam}</span>
        </div>
        <div className={styles.scoreBoard}>
          {isFinished ? (
            <>
              {match.homeScore || 0} : {match.awayScore || 0}
            </>
          ) : (
            "vs"
          )}
        </div>
        <div className={styles.teamBox}>
          <span className={styles.teamName}>{match.awayTeam}</span>
          {match.awayLogo && (
            <Image
              className={styles.logo}
              src={match.awayLogo}
              alt="away logo"
              width={60}
              height={70}
              unoptimized
            />
          )}
        </div>
      </div>

      {/* 선택 구역 */}
      <div className={styles.choiceRow}>
        {/* HOME */}
        <div
          className={`
            ${styles.choiceBox}
            ${userChoice === "HOME" ? styles.selected : ""}
            ${isFinished && correctChoice === "HOME" ? styles.correct : ""}
          `}
          onClick={() => {
            if (status === "선택진행중") {
              onSelectChoice(match.id, "HOME");
            }
          }}
        >
          홈 승{/* 경기종료 & 내가 HOME 골랐다면 => 성공 or 실패 */}
          {isFinished && userChoice === "HOME" && (
            <> {correctChoice === "HOME" ? "(성공)" : "(실패)"}</>
          )}
        </div>

        {/* DRAW */}
        <div
          className={`
            ${styles.choiceBox}
            ${userChoice === "DRAW" ? styles.selected : ""}
            ${isFinished && correctChoice === "DRAW" ? styles.correct : ""}
          `}
          onClick={() => {
            if (status === "선택진행중") {
              onSelectChoice(match.id, "DRAW");
            }
          }}
        >
          무승부
          {isFinished && userChoice === "DRAW" && (
            <> {correctChoice === "DRAW" ? "(성공)" : "(실패)"}</>
          )}
        </div>

        {/* AWAY */}
        <div
          className={`
            ${styles.choiceBox}
            ${userChoice === "AWAY" ? styles.selected : ""}
            ${isFinished && correctChoice === "AWAY" ? styles.correct : ""}
          `}
          onClick={() => {
            if (status === "선택진행중") {
              onSelectChoice(match.id, "AWAY");
            }
          }}
        >
          원정 승
          {isFinished && userChoice === "AWAY" && (
            <> {correctChoice === "AWAY" ? "(성공)" : "(실패)"}</>
          )}
        </div>
      </div>

      {/* 관리자 결과 설정 (경기종료 전이라면) */}
      {admin && !isFinished && (
        <div className={styles.adminResult}>
          <label>HOME 점수</label>
          <input
            type="number"
            value={homeScore}
            onChange={(e) => setHomeScore(e.target.value)}
            style={{ width: "60px" }}
          />
          <label>AWAY 점수</label>
          <input
            type="number"
            value={awayScore}
            onChange={(e) => setAwayScore(e.target.value)}
            style={{ width: "60px" }}
          />

          <select
            value={matchResult}
            onChange={(e) => setMatchResult(e.target.value)}
          >
            <option value="">결과</option>
            <option value="HOME">HOME</option>
            <option value="DRAW">DRAW</option>
            <option value="AWAY">AWAY</option>
          </select>
          <button onClick={() => onSetResult(match)}>결과 확정</button>
        </div>
      )}

      {/* 화살표 버튼 */}
      <div className={styles.arrowTitle}>참여자목록</div>

      <div
        className={styles.arrowBox}
        onClick={() => onTogglePredictions(match)}
      >
        {isOpen ? " ▲" : "▼"}
      </div>

      {/* 참여자 목록: 열려있으면 3컬럼 배치 */}
      {isOpen && (
        <div className={styles.predictionList}>
          <div className={styles.predColumns}>
            {/* HOME 컬럼 */}
            <div className={styles.predCol}>
              <div
                className={`
                ${styles.predNicknamesWrapper}
                ${
                  isFinished && correctChoice === "HOME"
                    ? styles.correctCol
                    : ""
                }
              `}
              >
                {predictions.HOME.map((p, idx) => {
                  const hit = isFinished && p.choice === correctChoice;
                  return (
                    <div key={idx} className={styles.predNickname}>
                      {p.nickname}
                    </div>
                  );
                })}
              </div>
            </div>
            {/* DRAW 컬럼 */}{" "}
            <div className={styles.predCol}>
              <div
                className={`
                ${styles.predNicknamesWrapper}
                ${
                  isFinished && correctChoice === "DRAW"
                    ? styles.correctCol
                    : ""
                }
              `}
              >
                {predictions.DRAW.map((p, idx) => {
                  const hit = isFinished && p.choice === correctChoice;
                  return (
                    <div key={idx} className={styles.predNickname}>
                      {p.nickname}
                    </div>
                  );
                })}
              </div>{" "}
            </div>
            {/* AWAY 컬럼 */}{" "}
            <div className={styles.predCol}>
              {" "}
              <div
                className={`
                ${styles.predNicknamesWrapper}
                ${
                  isFinished && correctChoice === "AWAY"
                    ? styles.correctCol
                    : ""
                }
              `}
              >
                {predictions.AWAY.map((p, idx) => {
                  const hit = isFinished && p.choice === correctChoice;
                  return (
                    <div key={idx} className={styles.predNickname}>
                      {p.nickname}
                    </div>
                  );
                })}{" "}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
