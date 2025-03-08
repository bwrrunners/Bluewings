"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { auth } from "../firebase";
import Link from "next/link";
import LoadingSpinner from "../components/LoadingSpinner";
import styles from "./login.module.css";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // "로딩 중" 상태 (유저 로그인 여부 확인용)
  const [loading, setLoading] = useState(true);

  // 페이지 들어올 때, 이미 로그인된 상태인지 체크
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        // 이미 로그인된 상태면 메인 페이지로 이동
        router.push("/");
      } else {
        // 로그인 안되어 있으면 로딩 종료하고 폼 렌더
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  // 실제 로그인 처리
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/");
    } catch (err) {
      setError("이메일 또는 비밀번호를 확인해주세요.");
    }
  };

  // 로딩 중이면 로딩 스피너 표시
  if (loading) {
    return <LoadingSpinner />;
  }

  // 로딩 끝 -> 로그인 폼 렌더
  return (
    <div className={styles.container}>
      <h2>로그인</h2>
      <form onSubmit={handleSubmit} className={styles.form}>
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <p className={styles.error}>{error}</p>}

        <button type="submit">로그인</button>
      </form>

      <div className={styles.registerLink}>
        <p>아직 회원이 아니신가요?</p>
        <Link href="/register">회원가입 하러 가기</Link>
      </div>
      <div className={styles.registerLink}>
        <p>비밀번호 잊어버리셨나요?</p>
        <Link href="/resetpassword">비밀번호 재설정</Link>
      </div>
    </div>
  );
}
