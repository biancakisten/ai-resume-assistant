function Sidebar() {
  return (
    <aside className="w-64 border-r border-slate-200 bg-white p-6">
      <nav>
        <ul className="space-y-4">
          <li className="font-semibold text-blue-600">Dashboard</li>
          <li>Resume</li>
          <li>Analysis</li>
          <li>Cover Letter</li>
          <li>Interview</li>
          <li>Settings</li>
        </ul>
      </nav>
    </aside>
  );
}

export default Sidebar;