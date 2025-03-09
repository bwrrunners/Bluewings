"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { db } from "../../firebase";
import { doc, getDoc } from "firebase/firestore";
import { useParams } from "next/navigation";
import Image from "next/image";
import styles from "../info.module.css";
import LoadingSpinner from "../../components/LoadingSpinner";

export default function AnnouncementDetail() {
  const params = useParams();
  const { id } = params;

  const [announce, setAnnounce] = useState(null);
  const [loading, setLoading] = useState(true); // 스피너

  useEffect(() => {
    const fetchData = async () => {
      try {
        const docRef = doc(db, "announcements", id);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setAnnounce({ id: snap.id, ...snap.data() });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return <LoadingSpinner />;
  }
  if (!announce) {
    return (
      <div className={styles.detailContainer}>
        <p>존재하지 않는 공지입니다.</p>
      </div>
    );
  }

  const timeString = announce.createdAt
    ? new Date(announce.createdAt.toDate()).toLocaleString("ko-KR")
    : "";

  return (
    <div className={styles.detailContainer}>
      <h1 className={styles.infoTitle}>공지사항</h1>
      <div className={styles.borderline}></div>
      <h2 className={styles.detailTitle}>{announce.title}</h2>
      <p className={styles.detailTime}>{timeString}</p>
      {/* 여러 이미지 (imageUrls: string[]) */}
      {announce.imageUrls && Array.isArray(announce.imageUrls) && (
        <div className={styles.imageGallery}>
          {announce.imageUrls.map((url, idx) => (
            <div key={idx} className={styles.imageItem}>
              <Image
                src={url}
                alt={`announcement-image-${idx}`}
                width={600}
                height={600}
                className={styles.announceImage}
              />
            </div>
          ))}
        </div>
      )}
      <div className={styles.detailContent}>{announce.content}</div>{" "}
      <div className={styles.backLinkSection}>
        <Link href={`/info`} className={styles.backLink}>
        &#60;목록&#62;
        </Link>
      </div>
    </div>
  );
}
