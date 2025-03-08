"use client";

import Image from "next/image";
import LoadingSpinner from "../components/LoadingSpinner";
import styles from "./suwonsamsung.module.css"; // 홈 페이지용 css (예시)


export default function PredictionPage() {
  return (
    <div className={styles.suwoncontainer}>
      <Image
        src={"/suwonsamsung.png"}
        alt="SuwonSamsung"
        width={750}
        height={750}
        className={styles.profileImage}
      />
    </div>
  );
}
