"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  serverTimestamp,
  addDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { useRouter } from "next/navigation";
import styles from "./admin.module.css";

export default function AdminPage() {
  // ──────────────────────────────────
  // [1] 관리자 인증 체크 (기존 로직)
  // ──────────────────────────────────
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        if (currentUser.email === "jihwan010606@gmail.com") {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    });
    return () => unsubAuth();
  }, []);

  // ──────────────────────────────────
  // [2] 공지사항 로직 (기존)
  // ──────────────────────────────────
  const [announcements, setAnnouncements] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("알림");
  const [imageUrls, setImageUrls] = useState([]);
  const [tempImageUrl, setTempImageUrl] = useState("");
  const [loadingAnn, setLoadingAnn] = useState(true);

  useEffect(() => {
    setLoadingAnn(true);
    const qAnn = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(qAnn, (snap) => {
      const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAnnouncements(arr);
      setLoadingAnn(false);
    });
    return () => unsub();
  }, []);

  const handleAddImageUrl = () => {
    if (!tempImageUrl.trim()) return;
    setImageUrls((prev) => [...prev, tempImageUrl.trim()]);
    setTempImageUrl("");
  };
  const handleRemoveImageUrl = (idx) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleCreateAnnouncement = async () => {
    if (!isAdmin) {
      alert("관리자만 작성 가능합니다.");
      return;
    }
    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 입력하세요!");
      return;
    }
    try {
      await addDoc(collection(db, "announcements"), {
        title,
        content,
        category,
        imageUrls,
        createdAt: serverTimestamp(),
      });
      alert("공지 등록 완료");
      setTitle("");
      setContent("");
      setCategory("알림");
      setImageUrls([]);
    } catch (err) {
      console.error(err);
      alert("공지 등록 중 오류 발생");
    }
  };

  // ──────────────────────────────────
  // [3] 전체 업데이트 버튼 (기존)
  // ──────────────────────────────────
  const [updateLoading, setUpdateLoading] = useState(false);
  const handleUpdateAll = async () => {
    if (!isAdmin) {
      alert("관리자 권한이 없습니다.");
      return;
    }
    setUpdateLoading(true);
    try {
      // /api/bluewings
      let res = await fetch("/api/bluewings", { method: "POST" });
      let data = await res.json();
      if (!data.success) {
        alert("경기일정 업데이트 실패: " + data.error);
        return;
      }
      const matchesCount = data.total;

      // /api/rank
      res = await fetch("/api/rank", { method: "POST" });
      data = await res.json();
      if (!data.success) {
        alert("리그순위 업데이트 실패: " + data.error);
        return;
      }
      const rankCount = data.total;

      alert(`업데이트 완료!\n경기일정: ${matchesCount}개 / 리그순위: ${rankCount}개`);
    } catch (err) {
      console.error(err);
      alert("업데이트 중 오류가 발생했습니다: " + err.message);
    } finally {
      setUpdateLoading(false);
    }
  };

  // 포인트 로그 이동
  const router = useRouter();
  const handleGoPointLogs = () => {
    router.push("/admin/pointLogs");
  };

  // ──────────────────────────────────
  // [권한체크]
  // ──────────────────────────────────
  if (!user) {
    return <div className={styles.adminContainer}>로그인이 필요합니다.</div>;
  }
  if (!isAdmin) {
    return <div className={styles.adminContainer}>접근 권한이 없습니다. (관리자 전용)</div>;
  }

  // ──────────────────────────────────
  // 렌더링
  // ──────────────────────────────────
  return (
    <div className={styles.adminContainer}>
      <h1 className={styles.adminTitle}>관리자 페이지</h1>

      {/* (A) 전체 업데이트 섹션 */}
      <section className={styles.sectionBox}>
        <h2>전체 업데이트</h2>
        <p>경기 일정/결과와 리그순위를 동시에 크롤링하여 Firestore에 반영합니다.</p>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={handleUpdateAll} disabled={updateLoading} className={styles.updateButton}>
            경기 & 리그순위 업데이트
          </button>
          {updateLoading && <span>업데이트 중...</span>}
        </div>

        <div style={{ marginTop: "16px" }}>
          <button onClick={handleGoPointLogs} className={styles.updateButton}>
            포인트 로그 보러가기
          </button>
        </div>
      </section>

      {/* (B) 공지사항 작성 섹션 */}
      <section className={styles.sectionBox}>
        <h2>공지사항 작성</h2>
        <div className={styles.writeBox}>
          <select
            className={styles.selectBox}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="알림">알림</option>
            <option value="공지">공지</option>
          </select>

          <input
            type="text"
            placeholder="제목"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={styles.inputField}
          />

          {/* 여러 이미지 URL */}
          <div className={styles.multiImageBox}>
            <label>이미지 주소들:</label>
            <div className={styles.imageUrlList}>
              {imageUrls.map((url, idx) => (
                <div key={idx} className={styles.imageUrlItem}>
                  <span>{url}</span>
                  <button onClick={() => handleRemoveImageUrl(idx)}>X</button>
                </div>
              ))}
            </div>
            <input
              type="text"
              placeholder="이미지 주소 입력"
              value={tempImageUrl}
              onChange={(e) => setTempImageUrl(e.target.value)}
              className={styles.inputField}
            />
            <button onClick={handleAddImageUrl} className={styles.addImageBtn}>
              추가
            </button>
          </div>

          <textarea
            placeholder="내용"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className={styles.textArea}
          />
          <button onClick={handleCreateAnnouncement} className={styles.createButton}>
            등록
          </button>
        </div>
      </section>

      {/* (C) 공지사항 목록 섹션 */}
      <section className={styles.sectionBox}>
        <h2>공지사항 목록</h2>
        {loadingAnn ? (
          <div>공지사항 로딩 중...</div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.noticeTable}>
              <thead>
                <tr>
                  <th style={{ width: "40px" }}>번호</th>
                  <th style={{ width: "60px" }}>구분</th>
                  <th style={{ width: "300px" }}>제목</th>
                  <th style={{ width: "60px" }}>작성자</th>
                  <th style={{ width: "100px" }}>작성일</th>
                </tr>
              </thead>
              <tbody>
                {announcements.map((ann, idx) => {
                  const dateStr = ann.createdAt
                    ? new Date(ann.createdAt.toDate()).toLocaleDateString("ko-KR")
                    : "";
                  return (
                    <tr key={ann.id} className={styles.noticeRow}>
                      <td>{announcements.length - idx}</td>
                      <td>{ann.category || "알림"}</td>
                      <td style={{ textAlign: "left" }}>{ann.title}</td>
                      <td>관리자</td>
                      <td>{dateStr}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* (D) 이벤트 관리 섹션 (새로 추가) */}
      <ManageEventsSection />
    </div>
  );
}

/** (D) 이벤트 관리 섹션 컴포넌트 */
function ManageEventsSection() {
  // 새 이벤트 등록용 state
  const [evTitle, setEvTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [voteLimit, setVoteLimit] = useState(1); // 중복 투표 수
  const [pointsForCorrect, setPointsForCorrect] = useState(3);

  // 이벤트 목록
  const [events, setEvents] = useState([]);
  const [loadingEv, setLoadingEv] = useState(true);

  // 정답 입력
  const [correctAnswersInput, setCorrectAnswersInput] = useState("");

  useEffect(() => {
    setLoadingEv(true);
    const q = query(collection(db, "events"), orderBy("endDate", "desc"));
    getDocs(q).then((snap) => {
      const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setEvents(arr);
      setLoadingEv(false);
    });
  }, []);

  // 이벤트 생성
  const handleCreateEvent = async () => {
    if (!evTitle.trim()) {
      alert("이벤트 제목 입력");
      return;
    }
    if (!startDate || !endDate) {
      alert("시작일 / 종료일 지정");
      return;
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start >= end) {
      alert("시작일이 종료일보다 늦습니다.");
      return;
    }
    try {
      await addDoc(collection(db, "events"), {
        title: evTitle,
        startDate: start,
        endDate: end,
        voteLimit: parseInt(voteLimit, 10) || 1,
        pointsForCorrect: parseInt(pointsForCorrect, 10) || 3,
        correctAnswers: [],
        pointsAwarded: false,
        createdAt: serverTimestamp(),
      });
      alert("이벤트 등록 완료");
      setEvTitle("");
      setStartDate("");
      setEndDate("");
      setVoteLimit(1);
      setPointsForCorrect(3);
    } catch (err) {
      console.error(err);
      alert("이벤트 등록 실패");
    }
  };

  // 정답 설정 + 포인트 지급
  const handleSetAnswer = async (ev) => {
    if (ev.pointsAwarded) {
      alert("이미 포인트가 지급된 이벤트입니다.");
      return;
    }
    const answersArr = correctAnswersInput
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s);

    if (answersArr.length === 0) {
      alert("정답(들)을 쉼표로 구분해서 입력하세요");
      return;
    }

    try {
      // 1) 이벤트 문서에 correctAnswers 설정
      const evRef = doc(db, "events", ev.id);
      await updateDoc(evRef, { correctAnswers: answersArr });

      // 2) 투표 결과 불러오기
      const votesSnap = await getDocs(collection(db, "events", ev.id, "votes"));
      // 각 userId 문서: { picks: [...], etc. }
      for (const vDoc of votesSnap.docs) {
        const vData = vDoc.data(); // { picks: [...], ... }
        // 만약 정답배열과 교집합이 있으면 => 적중
        const picks = vData.picks || [];
        // 교집합 찾기
        const correctPick = picks.some((p) => answersArr.includes(p));
        if (correctPick) {
          // +points
          const userId = vDoc.id;
          const userRef = doc(db, "users", userId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            const oldPoints = userData.points || 0;
            const newPoints = oldPoints + (ev.pointsForCorrect || 3);

            // 업데이트
            await updateDoc(userRef, { points: newPoints });
            // 로그
            await addDoc(collection(db, "pointLogs"), {
              userId,
              nickname: userData.nickname || "",
              oldPoints,
              addedPoints: ev.pointsForCorrect || 3,
              newPoints,
              eventId: ev.id,
              eventTitle: ev.title,
              timestamp: serverTimestamp(),
            });
          }
        }
      }

      // 3) 이벤트 문서에 pointsAwarded = true
      await updateDoc(evRef, { pointsAwarded: true });

      alert("정답 설정 및 포인트 지급 완료");
      setCorrectAnswersInput("");
    } catch (err) {
      console.error(err);
      alert("정답 처리 중 오류 발생");
    }
  };

  return (
    <section className={styles.sectionBox}>
      <h2>이벤트 관리</h2>
      {/* 새 이벤트 등록 폼 */}
      <div style={{ border: "1px solid #ccc", padding: 12, marginBottom: 16 }}>
        <div>
          <label>이벤트 제목: </label>
          <input
            type="text"
            value={evTitle}
            onChange={(e) => setEvTitle(e.target.value)}
            style={{ width: 250 }}
          />
        </div>
        <div>
          <label>시작일시: </label>
          <input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label>종료일시: </label>
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div>
          <label>중복투표 개수(voteLimit): </label>
          <input
            type="number"
            value={voteLimit}
            onChange={(e) => setVoteLimit(e.target.value)}
            style={{ width: 50 }}
          />
        </div>
        <div>
          <label>정답 포인트: </label>
          <input
            type="number"
            value={pointsForCorrect}
            onChange={(e) => setPointsForCorrect(e.target.value)}
            style={{ width: 50 }}
          />
        </div>
        <button onClick={handleCreateEvent} style={{ marginTop: 8 }}>
          이벤트 생성
        </button>
      </div>

      {/* 이벤트 목록 */}
      {loadingEv ? (
        <div>이벤트 로딩중...</div>
      ) : (
        <table className={styles.noticeTable}>
          <thead>
            <tr>
              <th>제목</th>
              <th>투표마감</th>
              <th>voteLimit</th>
              <th>포인트</th>
              <th>pointsAwarded</th>
              <th>정답등록</th>
            </tr>
          </thead>
          <tbody>
            {events.map((ev) => {
              const endD = ev.endDate ? new Date(ev.endDate).toLocaleString("ko-KR") : "";
              return (
                <tr key={ev.id}>
                  <td>{ev.title}</td>
                  <td>{endD}</td>
                  <td>{ev.voteLimit}</td>
                  <td>{ev.pointsForCorrect}</td>
                  <td>{ev.pointsAwarded ? "완료" : "미지급"}</td>
                  <td>
                    <input
                      type="text"
                      placeholder="정답1, 정답2"
                      value={correctAnswersInput}
                      onChange={(e) => setCorrectAnswersInput(e.target.value)}
                      style={{ width: 120 }}
                    />
                    <button onClick={() => handleSetAnswer(ev)}>OK</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
