"use client";

import Predictions from "../components/Predictions";
import Ranking from "../components/Ranking";
import styles from "./predictionspage.module.css"; // 홈 페이지용 css (예시)

export default function PredictionPage() {
  return (
    <div className={styles.predictionscontainer2}>

      <h1 className={styles.infoTitle}>이벤트</h1>
      <div className={styles.borderline}></div>
      
    <div className={styles.predictionscontainer}>

      <div className={styles.predictionsleftSection}>
        <Predictions />
      </div>
      <div className={styles.predictionsrightSection}>
        <Ranking />
      </div>
    </div>
    </div>
  );
}
