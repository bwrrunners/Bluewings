"use client";

import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import styles from "../styles/homeranking.module.css";
import LoadingSpinner from "../components/LoadingSpinner";
import Image from "next/image";

function assignRanks(rankData) {
  let count = 0;
  let previousPoints = null;
  let previousRank = 0;

  // rankData는 이미 points desc 정렬
  return rankData.map((user) => {
    count += 1;
    if (user.points === previousPoints) {
      user.rank = previousRank; // 동점자 처리
    } else {
      user.rank = count;
      previousRank = count;
      previousPoints = user.points;
    }
    return user;
  });
}

export default function Ranking() {
  const [rankData, setRankData] = useState([]); // 기존 (users 컬렉션)
  const [leagueData, setLeagueData] = useState([]); // 새로 추가 (leagueRankings)
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("premier");

  // (1) 'users' 컬렉션 → 포인트 랭킹
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
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // (2) 'leagueRankings' 컬렉션 → K리그 순위
  // 순위 기준(rank asc) 정렬
  useEffect(() => {
    const qLeague = query(
      collection(db, "leagueRankings"),
      orderBy("rank", "asc")
    );
    const unsubLeague = onSnapshot(qLeague, (snap) => {
      const arr = snap.docs.map((doc) => ({
        id: doc.id, // 문서ID(팀명)
        ...doc.data(), // { rank, team, played, points, etc. }
      }));
      setLeagueData(arr);
    });

    return () => unsubLeague();
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

      {/* 로딩 중이면 스피너 */}
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
                    <th style={{ width: "80px", textAlign: "center" }}>
                      포인트
                    </th>
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
            <div className={styles.rankTableWrapper}>
              {/* 리그순위 업데이트 버튼 */}

              {/* K리그 순위 테이블 */}
              <table className={styles.rankTable2}>
                <thead>
                  <tr>
                    <th>순위</th>
                    <th>팀명</th>
                    <th>경기수</th>
                    <th>승점</th>
                    <th>승</th>
                    <th>무</th>
                    <th>패</th>
                    <th>득점</th>
                    <th>실점</th>
                    <th>득실차</th>
                  </tr>
                </thead>
                <tbody>
                  {leagueData.map((team) => {
                    // "수원"인 경우 (team.team === "수원" or includes("수원")) 체크
                    const isSuwon = team.team.includes("수원");
                    // (정확히 "수원"만이면 === "수원" 쓰면 됨)

                    // 행에 적용할 클래스
                    // 만약 isSuwon이면 highlightSuwon, 아니면 아무것도 없음
                    const rowClass = isSuwon ? styles.highlightSuwon : "";

                    return (
                      <tr key={team.id} className={rowClass}>
                        <td>{team.rank}</td>
                        <td className={styles.teamCell}>
                          {/* 팀 로고 */}
                          {team.teamLogo && (
                            <Image
                              src={team.teamLogo}
                              alt={`${team.team} 로고`}
                              width={20}
                              height={20}
                              unoptimized
                              className={styles.teamLogo}
                            />
                          )}
                          <span style={{ marginLeft: "8px" }}>{team.team}</span>
                        </td>{" "}
                        <td>{team.played}</td>
                        <td>{team.points}</td>
                        <td>{team.wins}</td>
                        <td>{team.draws}</td>
                        <td>{team.losses}</td>
                        <td>{team.goalsFor}</td>
                        <td>{team.goalsAgainst}</td>
                        <td>{team.goalDiff}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}{" "}
        </>
      )}
    </div>
  );
}
