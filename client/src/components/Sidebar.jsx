import { useNavigate } from "react-router-dom";
import { useContext, useMemo, useState } from "react";
import { ThemeContext } from "../context/ThemeContext";
import "../assets/Sidebar.css";

const Sidebar = ({ groups = [], selectedGroup, setSelectedGroup, onLogout, onShowModal }) => {
  const navigate = useNavigate();
  const { dark, setDark } = useContext(ThemeContext);

  // ⭐ Hamburger state
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const visibleGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = groups.filter((g) => !query || g.name?.toLowerCase().includes(query));
    if (filter === "active" && selectedGroup) return filtered.filter((g) => g._id === selectedGroup._id);
    return filtered;
  }, [groups, search, filter, selectedGroup]);

  const openSidebar = () => setIsOpen(true);
  const closeSidebar = () => setIsOpen(false);

  const handleSelectGroup = (g) => {
    setSelectedGroup(g);
    navigate(`/chat/${g._id}`);
    closeSidebar(); // ⭐ Auto close on mobile
  };

  return (
    <>
      {/* ⭐ Hamburger Icon */}
      <button className="mobile-menu-btn" onClick={openSidebar}>
        ☰
      </button>

      {/* ⭐ Sidebar */}
      <div className={`sidebar ${isOpen ? "open" : ""}`}>
        {/* ⭐ Close Button (X) */}
        <button className="sidebar-close-btn" onClick={closeSidebar}>
          ✖
        </button>

        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">W</div>
          <div><strong>WEBXWHALE</strong><span>Private Chat</span></div>
        </div>

        <div className="sidebar-header">
          <div><h2>Messages</h2><span className="sidebar-count">{groups.length} conversation{groups.length === 1 ? "" : "s"}</span></div>

          <button onClick={() => setDark(!dark)} className="theme-btn">
            {dark ? "☀️" : "🌙"}
          </button>

          <button
            onClick={() => navigate("/profile")}
            className="profile-btn"
          >
            👤
          </button>

          <button onClick={onLogout} className="sidebar-logout">
            Logout
          </button>
        </div>

        <div className="sidebar-search">
          <span>⌕</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search conversations..." aria-label="Search conversations" />
          {search && <button onClick={() => setSearch("")} aria-label="Clear search">×</button>}
        </div>

        <div className="sidebar-filters">
          <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All</button>
          <button className={filter === "active" ? "active" : ""} onClick={() => setFilter("active")}>Active</button>
        </div>

        <div className="sidebar-list">
          {visibleGroups.length === 0 ? (
            <p style={{ color: "#888", textAlign: "center" }}>No groups</p>
          ) : (
            visibleGroups.map((g) => (
              <div
                key={g._id}
                onClick={() => handleSelectGroup(g)}
                className={`sidebar-group-item ${
                  selectedGroup?._id === g._id ? "active-group" : ""
                }`}
              >
                <div className="avatar">{g.name?.[0]?.toUpperCase() || "W"}</div>
                <div className="sidebar-group-copy"><span className="sidebar-group-name">{g.name}</span><small>🔐 Encrypted conversation</small></div>
                <span className="sidebar-chevron">›</span>
              </div>
            ))
          )}
        </div>

        <div className="upgrade-plan-container">
          <button
            className="upgrade-btn"
            onClick={() => navigate("/subscription")}
          >
            ✨ Upgrade Plan
          </button>
        </div>

        <button className="sidebar-create-btn" onClick={onShowModal}>
          + Create Group
        </button>
      </div>
    </>
  );
};

export default Sidebar;
