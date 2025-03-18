"use client";

import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  setDoc,
} from "firebase/firestore";
import styles from "../styles/events.module.css";

/**
 * - 마감시간(endDate)으로부터 +2일까지는 화면에 노출
 * - endDate가 지났으면 투표 불가(disabled)
 * - 관리자에서 이미 correctAnswers가 설정되어 있다면, 그 선수들을 초록색 등 별도 색으로 표시
 */
export default function EventsPage() {
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 인증
    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    // 1) events: endDate >= now - 2일 (또는 endDate + 2일 >= now)
    //   - 정확히 "마감 +2일 후까지 표시"하려면, "now <= endDate + 2days" -> endDate >= now-2days
    //   - orderBy endDate
    const now = new Date();
    // 2일 전
    const twoDaysBefore = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    // firestore 쿼리: endDate >= twoDaysBefore
    // => "지금 시점에서 2일 전보다 늦게 끝난 이벤트" = "마감+2일 이내"
    // orderBy endDate asc
    const qEv = query(
      collection(db, "events"),
      where("endDate", ">=", twoDaysBefore),
      orderBy("endDate", "asc")
    );

    getDocs(qEv).then((snap) => {
      const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setEvents(arr);
      setLoading(false);
    });

    // 2) players
    getDocs(collection(db, "players")).then((snap) => {
      const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      arr.sort((a, b) => (a.backNumber || 0) - (b.backNumber || 0));
      setPlayers(arr);
    });

    return () => unsub();
  }, []);

  return (
    <div className={styles.pageContainer}>
      {events.length === 0 ? (
        <div className={styles.noEvents}>현재 표시할 이벤트가 없습니다.</div>
      ) : (
        events.map((ev) => {
          // 1) 마감시간 +2일 구하기
          const endDateTime = ev.endDate?.toDate?.().getTime() || 0;
          const plus2days = endDateTime + 2 * 24 * 60 * 60 * 1000;
          const now = Date.now();

          // 2) 화면에는 표시하지만, 투표 가능 여부는 endDate < now => false
          const isClosed = now > endDateTime; // 마감 지남 => 투표 불가
          const isExpired = now > plus2days; // 마감+2일 지남 => 굳이 표시 안 할 수도. (하지만 이미 쿼리로 최소화)
          // 여기서는 "표시는 하는데(쿼리로 이미 걸러짐), 어차피 expired면 대개 안 뜰 것"
          // 만약 expired 시 아예 숨기고 싶으면 if (isExpired) return null;

          return (
            <EventCard
              key={ev.id}
              event={ev}
              user={user}
              players={players}
              disabled={isClosed} // 투표 불가 여부
            />
          );
        })
      )}
    </div>
  );
}

/** 개별 이벤트 카드 */
function EventCard({ event, user, players, disabled }) {
  const [picks, setPicks] = useState([]);
  const [loadingVote, setLoadingVote] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    const voteDocRef = doc(db, "events", event.id, "votes", user.uid);
    getDoc(voteDocRef).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setPicks(data.picks || []);
      }
    });
  }, [user, event.id]);

  // 선수 선택
  const handlePick = (playerName) => {
    if (!user) {
      alert("로그인이 필요합니다.");
      router.push("/login");
      return;
    }
    if (disabled) {
      alert("이미 투표가 마감되었습니다.");
      return;
    }
    // voteLimit
    const limit = event.voteLimit || 1;
    if (picks.length >= limit) {
      alert(`이 이벤트는 최대 ${limit}명까지 투표 가능`);
      return;
    }
    if (picks.includes(playerName)) {
      alert("이미 선택한 선수입니다.");
      return;
    }
    setPicks((prev) => [...prev, playerName]);
  };

  // 선택 해제
  const handleRemovePick = (playerName) => {
    if (disabled) return;
    setPicks((prev) => prev.filter((p) => p !== playerName));
  };

  // 투표 저장
  const handleSubmit = async () => {
    if (!user) {
      alert("로그인이 필요합니다.");
      router.push("/login");

      return;
    }
    if (disabled) {
      alert("마감되어 투표가 불가합니다.");
      return;
    }
    setLoadingVote(true);
    try {
      await setDoc(doc(db, "events", event.id, "votes", user.uid), { picks });
      alert("투표가 저장되었습니다.");
    } catch (err) {
      console.error(err);
      alert("투표 저장 오류: " + err.message);
    } finally {
      setLoadingVote(false);
    }
  };

  // 날짜 표시
  const startDateStr = event.startDate
    ? new Date(event.startDate.toDate()).toLocaleString("ko-KR")
    : "";
  const endDateStr = event.endDate
    ? new Date(event.endDate.toDate()).toLocaleString("ko-KR")
    : "";

  // correctAnswers가 있다면 표시
  const hasAnswers = event.correctAnswers && event.correctAnswers.length > 0;

  return (
    <div className={styles.eventCard}>
      <div className={styles.eventHeader}>
        <div className={styles.headerLeft}>
          <h3 className={styles.eventTitle}>{event.title}</h3>
          <div className={styles.eventDates}>
            <span>마감: {endDateStr}</span>
          </div>
        </div>
        <div className={styles.headerRight}>
          <button
            onClick={handleSubmit}
            disabled={loadingVote || disabled}
            className={styles.submitBtn}
          >
            {loadingVote ? "저장 중..." : "투표 저장"}
          </button>
        </div>
      </div>

      <div className={styles.voteInfo}>
        <p>
          최대 투표 가능 인원: <strong>{event.voteLimit || 1}</strong>명
        </p>
        {disabled && <p className={styles.disabledMsg}>투표 마감됨</p>}
      </div>

      <div className={styles.picksArea}>
        <strong>내 Picks:</strong>
        <div className={styles.myPicks}>
          {picks.length === 0 && (
            <span className={styles.noPick}>(선택 없음)</span>
          )}
          {picks.map((pick) => {
            // correctAnswers에 들어있으면 별도 표시
            const isCorrect = hasAnswers && event.correctAnswers.includes(pick);
            return (
              <span
                key={pick}
                className={`${styles.pickItem} ${
                  isCorrect ? styles.correctPick : ""
                }`}
              >
                {pick}
                {!disabled && (
                  <button
                    className={styles.removeBtn}
                    onClick={() => handleRemovePick(pick)}
                  >
                    X
                  </button>
                )}
              </span>
            );
          })}
        </div>
      </div>

      {/* 선수 목록 */}
      <div className={styles.playersList}>
        {players.map((pl) => {
          // 정답 선수 표시
          const isCorrectPlayer =
            hasAnswers && event.correctAnswers.includes(pl.name);

          return (
            <button
              key={pl.id}
              className={`${styles.playerBtn} ${
                isCorrectPlayer ? styles.correctPick : ""
              }`}
              onClick={() => handlePick(pl.name)}
              disabled={disabled}
            >
              {pl.backNumber}. {pl.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
