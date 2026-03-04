"use client";
type FilmCardProps = {
  title: string;
  creator: string;
  genre: string;
  likes: string;
  views: string;
  emoji: string;
  gradient: string;
};

export default function FilmCard({
  title,
  creator,
  genre,
  likes,
  views,
  emoji,
  gradient,
}: FilmCardProps) {
  return (
    <div className="bg-[#1A1208] rounded-xl overflow-hidden border border-[#2E2010] hover:scale-105 transition cursor-pointer">
      <div className={`h-40 ${gradient} flex items-center justify-center text-4xl`}>
        {emoji}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-lg">{title}</h3>
        <p className="text-sm text-gray-400">{creator} · {genre}</p>
        <div className="flex gap-4 text-sm text-gray-500 mt-2">
          <span>♥ {likes}</span>
          <span>👁 {views}</span>
        </div>
      </div>
    </div>
  );
}