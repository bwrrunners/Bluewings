"use client";

import { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import styles from "../styles/header.module.css";

export default function Header() {
  const [user, setUser] = useState(null);
  const [nickname, setNickname] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  // Firebase Auth 상태 관찰
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // Firestore에서 추가 정보(닉네임 등) 가져오기
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setNickname(data.nickname || "");

          // 관리자 판별 (이메일 기준)
          if (currentUser.email === "jihwan010606@gmail.com") {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        }
      } else {
        setNickname("");
        setIsAdmin(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // 로그아웃
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("로그아웃 실패:", error);
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.headersection}>
        <div className={styles.logoArea}>
          <Link href="/" className={styles.title}>
            Bluewing
          </Link>
          <Link href="/" className={styles.subtitle}>
            :AJOU UNIVERSITY
          </Link>
          <div className={styles.bannersection}>
            <Link href="/predictions" className={styles.banner}>
              이벤트
            </Link>
            <Link href="/info" className={styles.banner}>
              공지사항
            </Link>
            <Link href="/point" className={styles.banner}>
              포인트순위
            </Link>
            <Link href="/suwonsamsung" className={styles.banner}>
              팀 소개
            </Link>
            {isAdmin && (
              <Link href="/admin" className={styles.banner}>
                관리자페이지
              </Link>
            )}
          </div>
        </div>

        <nav className={styles.nav}>
          {user ? (
            <>
              <span className={styles.nickname}>{nickname} 님</span>
              {/* 관리자이면 Admin 링크 표시 */}

              <Link href="/profile">
                <button>내정보</button>
              </Link>
              <button onClick={handleLogout}>로그아웃</button>
            </>
          ) : (
            <Link href="/login">
              <button>로그인</button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
