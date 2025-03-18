"use client";

export default function RankUpdateButton() {
  const handleUpdate = async () => {
    try {
      const res = await fetch("/api/rank", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        alert(
          `순위 크롤링 성공!\n총 ${data.total}개 구단 정보를 Firestore에 저장했습니다.`
        );
      } else {
        alert("에러: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("업데이트 중 오류가 발생했습니다: " + err.message);
    }
  };

  return (
    <button onClick={handleUpdate}>
      리그순위 수동 업데이트
    </button>
  );
}
