"use client";

import Link from "next/link";
import Ranking from "./components/Ranking";
import { useEffect, useState } from "react";
import Image from "next/image";
import { auth, db } from "./firebase"; // firebase 경로 확인
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import LoadingSpinner from "./components/LoadingSpinner";

// 홈 페이지용 CSS 모듈
import styles from "./home.module.css";

/** 경기 상태를 구하는 함수 */
function getMatchStatus(match) {
  if (match.result && match.result !== "") {
    return "경기종료";
  }
  const now = new Date();
  const start = match.matchDateTime.toDate(); // Firestore Timestamp -> JS Date
  const thirtyBefore = new Date(start.getTime() - 30 * 60000);

  if (now < thirtyBefore) {
    return "선택진행중";
  }
  return "선택불가";
}

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [nickname, setNickname] = useState("");

  const [matches, setMatches] = useState([]);
  const [usersRank, setUsersRank] = useState([]); // 포인트 랭킹
  const [loading, setLoading] = useState(true);

  // 1) Firebase Auth, Firestore 구독
  useEffect(() => {
    // 인증 상태 구독
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          setNickname(userDoc.data().nickname || "");
        }
      } else {
        setNickname("");
      }
    });

    // matches 컬렉션 구독
    const qMatches = query(
      collection(db, "matches"),
      orderBy("matchDateTime", "asc")
    );
    const unsubMatches = onSnapshot(qMatches, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMatches(data);
      setLoading(false);
    });

    // users 컬렉션 -> points 내림차순
    const qUsers = query(collection(db, "users"), orderBy("points", "desc"));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      const rankData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsersRank(rankData);
    });

    return () => {
      unsubAuth();
      unsubMatches();
      unsubUsers();
    };
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  // 2) "선택진행중"인 경기만 필터링
  const inProgressMatches = matches.filter(
    (m) => getMatchStatus(m) === "선택진행중"
  );

  return (
    <div className={styles.container2}>
      <div className={styles.mainphotosection}>
      <Image
        src={"/mainphoto.jpg"}
        alt="mainphoto"
        width={1200}
        height={300}
      /></div>
      <div className={styles.container}>
      {/* 왼쪽 섹션 */}
      <div className={styles.leftSection}>
        <div className={styles.cardsection}>
          {inProgressMatches.length === 0 ? (
            <p>현재 선택진행중인 경기가 없습니다.</p>
          ) : (
            inProgressMatches.map((match) => (
              <Link href="/predictions" key={match.id}>
                {/* 카드 전체를 Link로 감싸기 */}
                <div className={styles.matchCard}>
                  <div className={styles.matchstatus}>
                    <div className={styles.matchTime}>
                      {match.matchDateTime?.toDate().toLocaleString("ko-KR", {
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    <div className={styles.matchStatus}>선택진행중</div>
                  </div>
                  <div className={styles.matchTeams}>
                    {match.homeTeam} vs {match.awayTeam}
                  </div>
                </div>
              </Link>
            ))
          )}</div>
        </div>
    

      {/* 오른쪽 섹션: 포인트 랭킹 */}
      <div className={styles.rightSection}>
        <Ranking />
      </div>
    </div>  </div>
  );
}
