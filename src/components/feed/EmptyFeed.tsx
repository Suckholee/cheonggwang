interface Props {
  hasFilter: boolean;
}

export function EmptyFeed({ hasFilter }: Props) {
  if (hasFilter) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-24 text-center">
        <p className="text-3xl" aria-hidden>
          🔎
        </p>
        <h2 className="text-lg font-semibold">해당 조건의 게시글이 없어요</h2>
        <p className="text-sm text-zinc-500">
          지역·업종·검색 필터를 바꿔 다시 시도해보세요.
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-24 text-center">
      <p className="text-3xl" aria-hidden>
        ☀️
      </p>
      <h2 className="text-lg font-semibold">곧 첫 게시글이 올라갈 거예요</h2>
      <p className="text-sm text-zinc-500">
        지금 청광에서 홍보 페이지를 준비 중입니다.
      </p>
    </div>
  );
}
