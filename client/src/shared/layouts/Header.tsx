function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-8">
      <h1 className="text-xl font-bold text-slate-800">
        AI Resume Assistant
      </h1>

      <div className="flex items-center gap-4">
        <button className="rounded-lg bg-slate-100 px-4 py-2 hover:bg-slate-200">
          Search
        </button>

        <div className="h-10 w-10 rounded-full bg-blue-600"></div>
      </div>
    </header>
  );
}

export default Header;