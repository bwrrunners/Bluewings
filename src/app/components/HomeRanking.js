"use client";

import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import styles from "../styles/homeranking.module.css";
import LoadingSpinner from "../components/LoadingSpinner"; // 로딩 스피너 추가

function assignRanks(rankData) {
  let count = 0;
  let previousPoints = null;
  let previousRank = 0;

  // rankData는 이미 points desc 정렬
  return rankData.map((user) => {
    count += 1;
    if (user.points === previousPoints) {
      // 동점
      user.rank = previousRank;
    } else {
      // 새로운 점수
      user.rank = count;
      previousRank = count;
      previousPoints = user.points;
    }
    return user;
  });
}

export default function HomeRanking() {
  const [rankData, setRankData] = useState([]);
  const [loading, setLoading] = useState(true); // 로딩 상태 추가
  const [activeTab, setActiveTab] = useState("premier");

  useEffect(() => {
    const qRank = query(collection(db, "users"), orderBy("points", "desc"));
    const unsub = onSnapshot(qRank, (snap) => {
      let arr = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      // 동률 순위 부여
      arr = assignRanks(arr);
      setRankData(arr);
      setLoading(false); // 데이터 로딩 완료 후 false 설정
    });

    return () => unsub();
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  return (
    <div className={styles.leagueRanking}>
      <div className={styles.tabMenu}>
        <span
          onClick={() => handleTabChange("premier")}
          className={`${styles.tab} ${
            activeTab === "premier" ? styles.active : ""
          }`}
        >
          포인트순위
        </span>
        <span
          onClick={() => handleTabChange("league")}
          className={`${styles.tab} ${
            activeTab === "league" ? styles.active : ""
          }`}
        >
          리그순위
        </span>
      </div>

      {/* 로딩 중이면 스피너 표시 */}
      {loading ? (
        <LoadingSpinner />
      ) : (
        <>
          {activeTab === "premier" && (
            <div className={styles.rankTableWrapper}>
              <table className={styles.rankTable}>
                <thead>
                  <tr>
                    <th style={{ width: "80px", textAlign: "center" }}>순위</th>
                    <th style={{ flex: 1, textAlign: "center" }}>닉네임</th>
                    <th style={{ width: "80px", textAlign: "center" }}>포인트</th>
                  </tr>
                </thead>
                <tbody>
                  {rankData.map((user) => (
                    <tr key={user.id}>
                      <td>{user.rank}</td>
                      <td>{user.nickname}</td>
                      <td>{user.points || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "league" && (
            <div className={styles.emptyData}>
              <p>리그순위 데이터는 아직 준비되지 않았습니다.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
