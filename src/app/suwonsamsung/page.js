"use client";

import { useState } from "react";
import Image from "next/image";
import LoadingSpinner from "../components/LoadingSpinner";
import styles from "./suwonsamsung.module.css"; // 홈 페이지용 CSS

export default function PredictionPage() {
  const [loading, setLoading] = useState(true);

  return (
    <div className={styles.suwoncontainer}>
      {/* {loading && <LoadingSpinner />} 이미지 로드 중일 때 스피너 표시 */}
      {/* <Image
        src={"/suwonsamsung.png"}
        alt="SuwonSamsung"
        width={500}
        height={500}
        className={styles.profileImage}
        onLoadingComplete={() => setLoading(false)} // 이미지 로드 완료 후 스피너 숨김
      /> */}
      <h2>준비중입니다</h2>
    </div>
  );
}
