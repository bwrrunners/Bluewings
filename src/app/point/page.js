"use client";

import Ranking from "../components/Ranking";
import styles from "./point.module.css"; // 홈 페이지용 css (예시)

export default function PointPage() {
  return (
    <div className={styles.predictionscontainer2}>
      <h1 className={styles.infoTitle}>랭킹</h1>
      <div className={styles.borderline}></div>

      <div className={styles.predictionscontainer}>
        <div className={styles.predictionsrightSection}>
          <Ranking />
        </div>
      </div>
    </div>
  );
}
