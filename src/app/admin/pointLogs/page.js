"use client";

import { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import styles from "./pointlog.module.css";

export default function PointLogsPage() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    // pointLogs 컬렉션, timestamp 내림차순
    const qLogs = query(
      collection(db, "pointLogs"),
      orderBy("timestamp", "desc")
    );
    const unsub = onSnapshot(qLogs, (snapshot) => {
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7일 전

      const arr = snapshot.docs
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
        .filter((log) => {
          // timestamp가 7일 전 이후인지 확인
          if (!log.timestamp) return false; // timestamp 없는 로그 제외
          const logDate = log.timestamp.toDate();
          return logDate >= oneWeekAgo;
        });

      setLogs(arr);
    });

    return () => unsub();
  }, []);

  return (
    <div className={styles.container}>
      <table className={styles.logTable}>
        <thead>
          <tr>
            <th>시간</th>
            <th>닉네임</th>
            <th>기존포인트</th>
            <th>추가포인트</th>
            <th>새 포인트</th>
            <th>Match ID</th>
            <th>결과</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => {
            const timeString = log.timestamp
              ? new Date(log.timestamp.toDate()).toLocaleString("ko-KR")
              : "";
            return (
              <tr key={log.id}>
                <td>{timeString}</td>
                <td>{log.nickname}</td>
                <td>{log.oldPoints}</td>
                <td>{log.addedPoints}</td>
                <td>{log.newPoints}</td>
                <td>
                  {
                    log.matchId
                      ? log.matchId // matchId가 존재하면 이것을
                      : log.eventId || "" // 없으면 eventId, 그것마저 없다면 빈 문자열
                  }
                </td>{" "}
                <td>{log.matchResult}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
