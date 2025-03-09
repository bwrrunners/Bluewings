"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  onSnapshot,
  orderBy,
  serverTimestamp,
  addDoc,
} from "firebase/firestore";
import styles from "./info.module.css";

// 로딩 스피너 임포트
import LoadingSpinner from "../components/LoadingSpinner";

export default function InfoPage() {
  const [user, setUser] = useState(null);
  const [admin, setAdmin] = useState(false);
  const [loading, setLoading] = useState(true); // ← 로딩 여부

  // 작성 폼
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("알림");

  // 여러 이미지 URL 배열
  const [imageUrls, setImageUrls] = useState([]);

  // 탭
  const [activeTab, setActiveTab] = useState("전체");
  // 공지 리스트
  const [announcements, setAnnouncements] = useState([]);

  // 1) 로그인 상태
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setAdmin(currentUser.email === "jihwan010606@gmail.com");
      } else {
        setUser(null);
        setAdmin(false);
      }
    });
    return () => unsubAuth();
  }, []);

  // 2) Firestore 공지 목록 가져오기
  useEffect(() => {
    setLoading(true);
    const qAnn = query(
      collection(db, "announcements"),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(qAnn, (snap) => {
      const arr = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAnnouncements(arr);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // 3) 여러 이미지 URL 입력 처리
  const [tempImageUrl, setTempImageUrl] = useState("");
  const handleAddImageUrl = () => {
    if (!tempImageUrl.trim()) return;
    setImageUrls((prev) => [...prev, tempImageUrl.trim()]);
    setTempImageUrl("");
  };
  const handleRemoveImageUrl = (idx) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== idx));
  };

  // 4) 공지 작성
  const handleCreate = async () => {
    if (!admin) {
      alert("관리자만 작성 가능");
      return;
    }
    if (!title.trim() || !content.trim()) {
      alert("제목과 내용을 입력하세요.");
      return;
    }

    try {
      await addDoc(collection(db, "announcements"), {
        title,
        content,
        category,
        imageUrls, // 여러 장 이미지
        createdAt: serverTimestamp(),
      });
      alert("공지 등록 완료");
      setTitle("");
      setContent("");
      setCategory("알림");
      setImageUrls([]);
    } catch (err) {
      console.error(err);
      alert("공지 등록 중 오류");
    }
  };

  // 탭별 필터
  const filteredList = announcements.filter((ann) => {
    if (activeTab === "전체") return true;
    return ann.category === activeTab;
  });

  // 로딩 중이면 스피너
  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className={styles.infoContainer}>
      <h1 className={styles.infoTitle}>공지사항</h1>

      <div className={styles.borderline}></div>
      {/* 탭 메뉴 */}
      <div className={styles.tabMenu}>
        {["전체", "알림", "공지"].map((tab) => (
          <span
            key={tab}
            className={`${styles.tabItem} ${
              activeTab === tab ? styles.activeTab : ""
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </span>
        ))}
      </div>

      {/* 관리자 작성 폼 */}
      {admin && (
        <div className={styles.writeBox}>
          <h2>공지 작성</h2>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={styles.selectBox}
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

          {/* 여러 이미지 URL 입력 */}
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

          <button onClick={handleCreate} className={styles.createButton}>
            등록
          </button>
        </div>
      )}

      {/* 공지 리스트 */}
      <div className={styles.tableWrapper}>
        <table className={styles.noticeTable}>
          <thead>
            <tr>
            <th style={{ width: "30px" }}>번호</th>
              <th style={{ width: "40px" }}>구분</th>
              <th style={{ width: "300px"}}>제목</th>
              <th style={{ width: "20px" }}>작성자</th>
              <th style={{ width: "50px" }}>작성일</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.map((ann, idx) => {
              const dateStr = ann.createdAt
                ? new Date(ann.createdAt.toDate()).toLocaleDateString("ko-KR")
                : "";
              return (
                <tr key={ann.id} className={styles.noticeRow}>
                  <td>{filteredList.length - idx}</td>
                  <td>{ann.category || "알림"}</td>
                  <td style={{ textAlign: "start" }}>
                    <Link
                      href={`/info/${ann.id}`}
                      className={styles.noticeLink}
                    >
                      {ann.title}
                    </Link>
                  </td>
                  <td>관리자</td>
                  <td>{dateStr}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
