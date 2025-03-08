"use client";

import styles from "../styles/loadingSpinner.module.css";

export default function LoadingSpinner() {
  return (
    <div className={styles.spinnerContainer}>
      <div className={styles.spinner}></div>
      <p className={styles.loadingText}>로딩 중...</p>
    </div>
  );
}
