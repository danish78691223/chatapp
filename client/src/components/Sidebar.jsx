import { useNavigate } from "react-router-dom";
import { useContext, useMemo, useState } from "react";
import { ThemeContext } from "../context/ThemeContext";
import "../assets/Sidebar.css";

const Sidebar = ({ groups = [], selectedGroup, setSelectedGroup, onLogout, onShowModal, currentUserId }) => {
  const navigate = useNavigate();
  const { dark, setDark } = useContext(ThemeContext);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const visibleGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = groups.filter((g) => !query || g.name?.toLowerCase().includes(query));
    if (filter === "active" && selectedGroup) {
      return filtered.filter((g) => g._id === selectedGroup._id);
    }
    return filtered;
  }, [groups, search, filter, selectedGroup]);

  const handleSelectGroup = (g) => {
    setSelectedGroup(g);
    navigate(`/chat/${g._id}`);
    setIsOpen(false);
  };

  return (
    <>
      <button className="mobile-menu-btn" onClick={() => setIsOpen(true)} aria-label="Open conversations">☰</button>

      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <button className="sidebar-close-btn" onClick={() => setIsOpen(false)} aria-label="Close conversations">×</button>

        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">W</div>
          <div className="sidebar-brand-copy">
            <strong>WEBCHAT</strong>
            <span>Private • Real-time</span>
          </div>
          <span className="brand-status" title="Secure connection" />
        </div>

        <div className="sidebar-header">
          <div>
            <h2>Conversations</h2>
            <span className="sidebar-count">{groups.length} conversation{groups.length === 1 ? "" : "s"}</span>
          </div>
          <div className="sidebar-actions">
            <button onClick={() => setDark(!dark)} className="icon-btn" title={dark ? "Light mode" : "Dark mode"}>{dark ? "☼" : "◐"}</button>
            <button onClick={() => navigate("/profile")} className="icon-btn" title="Profile">◎</button>
          </div>
        </div>

        <div className="sidebar-search">
          <span>⌕</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search conversations" aria-label="Search conversations" />
          {search && <button onClick={() => setSearch("")} aria-label="Clear search">×</button>}
        </div>

        <div className="sidebar-filters">
          <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All</button>
          <button className={filter === "active" ? "active" : ""} onClick={() => setFilter("active")}>Active</button>
        </div>

        <div className="sidebar-list">
          {visibleGroups.length === 0 ? (
            <div className="sidebar-empty">
              <span>◌</span>
              <strong>No conversations</strong>
              <small>Create a group to start chatting.</small>
            </div>
          ) : (
            visibleGroups.map((g) => {
              const unread = Number(g.unreadCounts?.[String(currentUserId)] || 0);
              return (
                <button
                  key={g._id}
                  onClick={() => handleSelectGroup(g)}
                  className={`sidebar-group-item ${selectedGroup?._id === g._id ? "active-group" : ""}`}
                >
                  <div className="avatar">{g.name?.[0]?.toUpperCase() || "W"}</div>
                  <div className="sidebar-group-copy">
                    <div className="sidebar-group-title">
                      <span className="sidebar-group-name">{g.name}</span>
                      {unread > 0 && <span className="unread-badge">{unread}</span>}
                    </div>
                    <small>{g.lastMessage || "Encrypted conversation"}</small>
                  </div>
                  <span className="sidebar-chevron">›</span>
                </button>
              );
            })
          )}
        </div>

        <div className="sidebar-footer">
          <button className="sidebar-create-btn" onClick={onShowModal}>
            <span>＋</span> New conversation
          </button>
          <button className="sidebar-logout" onClick={onLogout}>
            ↪ <span>Log out</span>
          </button>
          <div className="sidebar-security"><span>●</span> End-to-end encrypted</div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
