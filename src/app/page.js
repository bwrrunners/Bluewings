"use client";

import Link from "next/link";
import HomeRanking from "./components/HomeRanking";
import { useEffect, useState } from "react";
import Image from "next/image";
import { auth, db } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import LoadingSpinner from "./components/LoadingSpinner";
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

  // 공지사항 상태 (1주일 이내)
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    // 1) 인증 상태 구독
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

    // 2) matches 컬렉션 구독
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

    // 3) users 컬렉션 -> points 내림차순 구독
    const qUsers = query(collection(db, "users"), orderBy("points", "desc"));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      const rankData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsersRank(rankData);
    });

    // 4) Firestore "announcements" 구독 (1주일 이내 공지사항)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const qAnnouncements = query(
      collection(db, "announcements"),
      where("createdAt", ">=", oneWeekAgo),
      orderBy("createdAt", "desc")
    );
    const unsubAnn = onSnapshot(qAnnouncements, (snap) => {
      const anns = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAnnouncements(anns);
    });

    return () => {
      unsubAuth();
      unsubMatches();
      unsubUsers();
      unsubAnn();
    };
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  // ────────── 2주 이내(14일 이내)인 '선택진행중' 경기만 필터링 ──────────
  const now = new Date();
  const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14일 후

  const inProgressMatches = matches.filter((m) => {
    // 1) 경기 상태가 "선택진행중"인지?
    if (getMatchStatus(m) !== "선택진행중") return false;
    // 2) 경기일이 2주 뒤까지만?
    const matchDate = m.matchDateTime.toDate();
    return matchDate <= twoWeeksLater;
  });

  return (
    <div className={styles.container2}>
      <div className={styles.mainphotosection}>
        <Image
          src={"/mainphoto.png"}
          alt="mainphoto"
          width={1280}
          height={500}
        />
      </div>

      <div className={styles.container}>
        {/* 왼쪽 섹션 */}
        <div className={styles.leftSection}>
          <div className={styles.eventsection}>
            <h2>이벤트</h2>
            <Link href="/predictions">
              <h3>더보기 &rarr;</h3>
            </Link>
          </div>

          <div className={styles.cardsection}>
            {inProgressMatches.length === 0 ? (
              <p>현재 선택진행중인 (2주 이내) 경기가 없습니다.</p>
            ) : (
              inProgressMatches.map((match) => (
                <Link href="/predictions" key={match.id}>
                  <div className={styles.matchCard}>
                    <div className={styles.matchstatus}>
                      <div className={styles.matchTime}>
                        {match.matchDateTime
                          ?.toDate()
                          .toLocaleString("ko-KR", {
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                      </div>
                      <div className={styles.matchStatus}>선택진행중</div>
                    </div>
                    <div className={styles.matchTeams}>
                      {match.homeLogo && (
                        <Image
                          className={styles.logo}
                          src={match.homeLogo}
                          alt="home logo"
                          width={40}
                          height={40}
                          unoptimized
                        />
                      )}
                      {match.homeTeam} vs {match.awayTeam}
                      {match.awayLogo && (
                        <Image
                          className={styles.logo}
                          src={match.awayLogo}
                          alt="away logo"
                          width={40}
                          height={40}
                          unoptimized
                        />
                      )}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>

          <div className={styles.sectionh}></div>
          <div className={styles.eventsection}>
            <h2>공지사항</h2>
            <Link href="/info">
              <h3>더보기 &rarr;</h3>
            </Link>
          </div>
          {/* 공지사항: 1주일 이내 등록된 것만 표시 */}
          <div className={styles.announcementSection}>
            {announcements.length === 0 ? (
              <p>공지사항이 없습니다.</p>
            ) : (
              <div className={styles.announcementCards}>
                {announcements.map((ann) => {
                  const dateStr = ann.createdAt
                    ? new Date(ann.createdAt.toDate()).toLocaleDateString(
                        "ko-KR"
                      )
                    : "";
                  return (
                    <Link href={`/info/${ann.id}`} key={ann.id}>
                      <div className={styles.announcementCard}>
                        <h3>
                          {ann.title.length > 30
                            ? ann.title.substring(0, 30) + "..."
                            : ann.title}
                        </h3>
                        <span className={styles.annDate}>{dateStr}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className={styles.sectionh2}></div>

        {/* 오른쪽 섹션 */}
        <div className={styles.rightSection}>
          <div className={styles.eventsection2}>
            <h2>랭킹</h2>
            <Link href="/point">
              <h3>더보기 &rarr;</h3>
            </Link>
          </div>
          {/* 포인트 랭킹 */}
          <HomeRanking />
        </div>
      </div>
    </div>
  );
}
