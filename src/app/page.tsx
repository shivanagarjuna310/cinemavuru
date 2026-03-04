import FilmCard from "../components/FilmCard";

export default function Home() {
  const films = [
  {
    title: "Kallu Meeda Vennela",
    creator: "Ravi Kumar",
    genre: "Drama",
    likes: "187",
    views: "2.3K",
    emoji: "🌾",
    gradient: "bg-gradient-to-br from-[#FF6B1A] to-[#F5A623]",
  },
  {
    title: "Pedda Ooru Chinnakatha",
    creator: "Swapna Reddy",
    genre: "Comedy",
    likes: "143",
    views: "1.8K",
    emoji: "🌅",
    gradient: "bg-gradient-to-br from-[#8B1A1A] to-[#FF6B1A]",
  },
  {
    title: "Amma Cheppindi",
    creator: "Kavitha Sharma",
    genre: "Family",
    likes: "389",
    views: "4.2K",
    emoji: "🎭",
    gradient: "bg-gradient-to-br from-[#1A1A4E] to-[#FF6B1A]",
  },
];
  return (
    <main className="min-h-screen bg-[#0D0A06] text-[#FDF6E3] flex flex-col items-center px-6 text-center py-16">

      {/* Hero Section */}
      <div className="mb-6 text-sm uppercase tracking-widest text-[#F5A623]">
        Now Live: Warangal District
      </div>

      <h1 className="text-5xl font-bold mb-4">
        Your District's <span className="text-[#FF6B1A]">Cinema Stage</span>
      </h1>

      <p className="text-gray-400 max-w-xl mb-8">
        The first hyperlocal short film platform for Telangana.
        Discover films made by filmmakers from your own district.
      </p>

      <div className="flex gap-4">
        <button className="bg-[#FF6B1A] text-black px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition">
          ▶ Watch Warangal Films
        </button>

        <button className="border border-[#F5A623] text-[#F5A623] px-6 py-3 rounded-lg font-semibold hover:bg-[#F5A623]/10 transition">
          🎬 Upload Your Film
        </button>
      </div>

      {/* Stats Section */}
      <div className="mt-16 flex gap-12 text-center flex-wrap justify-center">
        <div>
          <div className="text-3xl font-bold text-[#F5A623]">47</div>
          <div className="text-sm text-gray-500 uppercase tracking-wider">
            Short Films
          </div>
        </div>

        <div>
          <div className="text-3xl font-bold text-[#F5A623]">23</div>
          <div className="text-sm text-gray-500 uppercase tracking-wider">
            Creators
          </div>
        </div>

        <div>
          <div className="text-3xl font-bold text-[#F5A623]">1</div>
          <div className="text-sm text-gray-500 uppercase tracking-wider">
            District Live
          </div>
        </div>

        <div>
          <div className="text-3xl font-bold text-[#F5A623]">33</div>
          <div className="text-sm text-gray-500 uppercase tracking-wider">
            More Coming
          </div>
        </div>
      </div>

      {/* Film Section */}
      <div className="mt-24 w-full max-w-6xl">
        <h2 className="text-3xl font-bold text-[#F5A623] mb-8 text-left">
          🎬 Warangal Films
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {films.map((film, index) => (
            <FilmCard
              key={index}
              title={film.title}
              creator={film.creator}
              genre={film.genre}
              likes={film.likes}
              views={film.views}
              emoji={film.emoji}
              gradient={film.gradient}
            />
          ))}
        </div>
      </div>

    </main>
  );
}