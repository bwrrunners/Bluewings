"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import LoadingSpinner from "../components/LoadingSpinner";

import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  onSnapshot,
  addDoc,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

import styles from "./profile.module.css";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({
    email: "",
    nickname: "",
    name: "",
    studentId: "",
    department: "",
    points: 0,
    favoritePlayer: "", // 등번호
  });
  const [loading, setLoading] = useState(true);

  // 왼쪽 사이드바 프로필이미지
  const [profileImage, setProfileImage] = useState("/players/default.png");

  // 탭: "profile" | "player"
  const [activeTab, setActiveTab] = useState("profile");

  // 선수 목록
  const [players, setPlayers] = useState([]);
  // 새 선수 추가 폼
  const [newPlayer, setNewPlayer] = useState({
    backNumber: "",
    name: "",
    position: "",
  });

  // 1) 로그인 상태 + 내 프로필 로드
  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userDocRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setProfile({
            email: data.email || currentUser.email,
            nickname: data.nickname || "",
            name: data.name || "",
            studentId: data.studentId || "",
            department: data.department || "",
            points: data.points || 0,
            favoritePlayer: data.favoritePlayer || "",
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubAuth();
  }, []);

  // 2) 선수 목록 구독 (Firestore: players)
  useEffect(() => {
    const qPlayers = query(
      collection(db, "players"),
      // 백넘버를 number 타입으로 저장했다면 asc 가능
      orderBy("backNumber", "asc")
    );
    const unsub = onSnapshot(qPlayers, (snap) => {
      let arr = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPlayers(arr);
    });
    return () => unsub();
  }, []);

  // 3) 사이드바 프로필이미지 결정
  useEffect(() => {
    if (!profile.favoritePlayer) {
      setProfileImage("/players/default.jpeg");
      return;
    }
    // 프로필 사진은 /players/{등번호}.png
    setProfileImage(`/players/${profile.favoritePlayer}.png`);
  }, [profile.favoritePlayer]);

  // 내 프로필 입력 핸들러
  const handleChangeProfile = (e) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value,
    });
  };

  // 내 프로필 저장
  const handleSaveProfile = async () => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }
    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        name: profile.name,
        studentId: profile.studentId,
        department: profile.department,
        // email, nickname, points, favoritePlayer는 미수정
      });
      alert("프로필이 업데이트되었습니다.");
    } catch (err) {
      console.error(err);
      alert("프로필 업데이트 중 오류 발생");
    }
  };

  // 선수 카드 클릭 -> 응원선수 설정
  const handleSelectPlayer = async (player) => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }
    if (!window.confirm(`${player.name} 선수를 응원하시겠습니까?`)) return;
    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        favoritePlayer: player.backNumber,
      });
      alert(`${player.name} 선수로 설정되었습니다.`);
      setProfile((prev) => ({
        ...prev,
        favoritePlayer: player.backNumber,
      }));
    } catch (err) {
      console.error(err);
      alert("응원선수 설정 중 오류 발생");
    }
  };

  // 새 선수 입력 핸들러
  const handleNewPlayerChange = (e) => {
    setNewPlayer({
      ...newPlayer,
      [e.target.name]: e.target.value,
    });
  };

  // 새 선수 추가
  const handleAddPlayer = async () => {
    try {
      await addDoc(collection(db, "players"), {
        backNumber: newPlayer.backNumber,
        name: newPlayer.name,
        position: newPlayer.position,
        createdAt: serverTimestamp(),
      });
      alert("새 선수가 추가되었습니다.");
      setNewPlayer({
        backNumber: "",
        name: "",
        position: "",
      });
    } catch (err) {
      console.error(err);
      alert("새 선수 추가 중 오류 발생");
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return (
      <div className={styles.profileContainer}>
        <p>로그인이 필요합니다.</p>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      {/* 왼쪽 사이드바 */}
      <div className={styles.sidebar}>
        <div className={styles.profileTop}>
          <Image
            src={profileImage}
            alt="Profile"
            width={100}
            height={150}
            className={styles.profileImage}
          />
          <h3>{profile.nickname}</h3>
          <p>{profile.email}</p>
        </div>

        <nav className={styles.navMenu}>
          <ul>
            <li
              className={activeTab === "profile" ? styles.activeTab : ""}
              onClick={() => setActiveTab("profile")}
            >
              내 프로필
            </li>
            <li
              className={activeTab === "player" ? styles.activeTab : ""}
              onClick={() => setActiveTab("player")}
            >
              응원선수 설정
            </li>
          </ul>
        </nav>
      </div>

      {/* 오른쪽 메인 콘텐츠 */}
      <div className={styles.mainContent}>
        {activeTab === "profile" && (
          <div className={styles.profileBox}>
            <div className={styles.titlesection}>
              <h2>내 프로필</h2>{" "}
              <button className={styles.saveButton} onClick={handleSaveProfile}>
                수정
              </button>
            </div>
            <div className={styles.fieldRow}>
              <label>이메일</label>
              <span>{profile.email}</span>
            </div>
            <div className={styles.fieldRow}>
              <label>닉네임</label>
              <span>{profile.nickname}</span>
            </div>
            <div className={styles.fieldRow}>
              <label>포인트</label>
              <span>{profile.points}</span>
            </div>{" "}
            <hr className={styles.divider} />
            <div className={styles.fieldRow}>
              <label>이름</label>
              <input
                name="name"
                value={profile.name}
                onChange={handleChangeProfile}
                className={styles.inputField}
              />
            </div>
            <div className={styles.fieldRow}>
              <label>학번</label>
              <input
                name="studentId"
                value={profile.studentId}
                onChange={handleChangeProfile}
                className={styles.inputField}
              />
            </div>
            <div className={styles.fieldRow}>
              <label>학과</label>
              <input
                name="department"
                value={profile.department}
                onChange={handleChangeProfile}
                className={styles.inputField}
              />
            </div>
          </div>
        )}

        {activeTab === "player" && (
          <div className={styles.playersSection}>
            <h2>응원선수 설정</h2>
            <div className={styles.playersGrid}>
              {players.map((p) => {
                const imageUrl = `/players/${p.backNumber}.png`;
                return (
                  <div
                    key={p.id}
                    className={styles.playerCard}
                    onClick={() => handleSelectPlayer(p)}
                  >
                    <Image
                      src={imageUrl}
                      alt={p.name}
                      width={150}
                      height={200}
                      className={styles.playerImage}
                    />
                    <div className={styles.playersection}>
                      <div className={styles.playernumber}>{p.backNumber}</div>
                      <div className={styles.playername}>{p.name} </div>
                      <div className={styles.playerdivider}>|</div>

                      <div className={styles.playerposition}>{p.position}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* <hr className={styles.divider} />
            <h3>새 선수 추가</h3>
            <div className={styles.addPlayerForm}>
              <input
                type="text"
                placeholder="등번호"
                name="backNumber"
                value={newPlayer.backNumber}
                onChange={handleNewPlayerChange}
              />
              <input
                type="text"
                placeholder="이름"
                name="name"
                value={newPlayer.name}
                onChange={handleNewPlayerChange}
              />
              <input
                type="text"
                placeholder="포지션"
                name="position"
                value={newPlayer.position}
                onChange={handleNewPlayerChange}
              />
              <button onClick={handleAddPlayer} className={styles.addButton}>
                추가
              </button>
            </div> */}
          </div>
        )}
      </div>
    </div>
  );
}
