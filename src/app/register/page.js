"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, getDocs, collection, query, where } from "firebase/firestore";
import styles from "./register.module.css";

export default function Register() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [nickname, setNickname] = useState("");
  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [department, setDepartment] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false); // 제출 중 여부

  const handleRegister = async (e) => {
    e.preventDefault();
    if (isSubmitting) return; // 이미 제출 중이면 무시
    setIsSubmitting(true);
    setError("");

    // 비밀번호 확인
    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      setIsSubmitting(false);
      return;
    }

    // 비밀번호 최소 8자 예시
    if (password.length < 8) {
      setError("비밀번호는 최소 8자 이상이어야 합니다.");
      setIsSubmitting(false);
      return;
    }

    if (nickname.length < 2) {
      setError("닉네임은 최소 2자 이상이어야 합니다.");
      setIsSubmitting(false);
      return;
    }

    if (nickname.length > 6) {
      setError("닉네임은 6자 이하이어야 합니다.");
      setIsSubmitting(false);
      return;
    }

    try {
      // 이메일 중복 체크
      const emailQuery = query(
        collection(db, "users"),
        where("email", "==", email)
      );
      const emailSnap = await getDocs(emailQuery);
      if (!emailSnap.empty) {
        setError("이미 사용 중인 이메일입니다.");
        setIsSubmitting(false);
        return;
      }

      // 닉네임 중복 체크
      const nicknameQuery = query(
        collection(db, "users"),
        where("nickname", "==", nickname)
      );
      const nicknameSnap = await getDocs(nicknameQuery);
      if (!nicknameSnap.empty) {
        setError("이미 사용 중인 닉네임입니다.");
        setIsSubmitting(false);
        return;
      }

      // Firebase Auth로 계정 생성
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Firestore에 저장 (points: 0)
      await setDoc(doc(db, "users", user.uid), {
        email,
        nickname,
        name,
        studentId,
        department,
        points: 0, // 초기 포인트 0점
      });

      alert("회원가입이 완료되었습니다.");
      router.push("/login");
    } catch (err) {
      console.error(err);
      setError("회원가입에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <h2>회원가입</h2>
      <form onSubmit={handleRegister} className={styles.form}>
        <input
          type="email"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="닉네임 (2자 이상 6자 이하)"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
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
          type="password"
          placeholder="비밀번호 (8자 이상)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="비밀번호 확인"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        {error && <p className={styles.error}>{error}</p>}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "처리 중..." : "회원가입"}
        </button>
      </form>
    </div>
  );
}
