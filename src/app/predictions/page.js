"use client";

import Predictions from "../components/Predictions";
import HomeRanking from "../components/HomeRanking";
import styles from "./predictionspage.module.css"; // 홈 페이지용 css (예시)
import Event from "../components/event";

export default function PredictionPage() {
  return (
    <div className={styles.predictionscontainer2}>
      <h1 className={styles.infoTitle}>이벤트</h1>
      <div className={styles.borderline}></div>

      <div className={styles.predictionscontainer}>
        <div className={styles.predictionsleftSection}>
          <Event />

          <Predictions />
        </div>
        <div className={styles.predictionsrightSection}>
          <HomeRanking />
        </div>
      </div>
    </div>
  );
}
