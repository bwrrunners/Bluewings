"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../firebase";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import LoadingSpinner from "../components/LoadingSpinner";
import styles from "./resetpassword.module.css";

/**
 * 비밀번호 재설정 페이지
 * 1) 사용자가 이메일, 학번, 이름, 학과 입력
 * 2) Firestore에서 일치하는 문서가 있는지 확인
 * 3) 있다면 sendPasswordResetEmail()로 비밀번호 재설정 메일 전송
 */
export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [studentId, setStudentId] = useState("");
  const [department, setDepartment] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // 필수 필드 입력 여부
    if (!email || !studentId || !department || !name) {
      setError("모든 항목을 입력해주세요.");
      return;
    }

    setLoading(true);

    try {
      // 1) Firestore에서 users 컬렉션 검색
      const usersRef = collection(db, "users");
      const q = query(
        usersRef,
        where("email", "==", email),
        where("studentId", "==", studentId),
        where("department", "==", department),
        where("name", "==", name)
      );
      const querySnap = await getDocs(q);

      if (!querySnap.empty) {
        // 2) 정보가 일치하는 사용자 발견 → 비밀번호 재설정 이메일 전송
        await sendPasswordResetEmail(auth, email);
        setSuccess(
          "비밀번호 재설정 메일이 전송되었습니다. 이메일을 확인해주세요."
        );
      } else {
        setError("입력한 정보와 일치하는 계정을 찾을 수 없습니다.");
      }
    } catch (err) {
      console.error(err);
      setError("비밀번호 재설정 메일 전송에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h2>비밀번호 재설정</h2>
      <form onSubmit={handleResetPassword} className={styles.form}>
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="학번"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="학과"
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        {error && <p className={styles.error}>{error}</p>}
        {success && <p className={styles.success}>{success}</p>}

        {loading ? (
          <LoadingSpinner />
        ) : (
          <button type="submit">비밀번호 재설정</button>
        )}
      </form>
    </div>
  );
}
