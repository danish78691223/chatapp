import { useNavigate } from "react-router-dom";
import { useContext, useMemo, useState } from "react";
import { ThemeContext } from "../context/ThemeContext";
import "../assets/Sidebar.css";

const Sidebar = ({ groups = [], selectedGroup, setSelectedGroup, onLogout, onShowModal, currentUserId, user }) => {
  const navigate = useNavigate();
  const { dark, setDark } = useContext(ThemeContext);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const name = user?.user?.name || user?.name || "Account";
  const email = user?.user?.email || user?.email || "";

  const visibleGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = groups.filter((g) => !query || g.name?.toLowerCase().includes(query));
    return filter === "active" && selectedGroup ? filtered.filter((g) => g._id === selectedGroup._id) : filtered;
  }, [groups, search, filter, selectedGroup]);

  return (
    <>
      <button className="mobile-menu-btn" onClick={() => setIsOpen(true)}>☰</button>
      <aside className={"sidebar " + (isOpen ? "open" : "")}>
        <button className="sidebar-close-btn" onClick={() => setIsOpen(false)}>×</button>
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark"><img src="/webchat-logo.svg" alt="WEBCHAT" /></div>
          <div className="sidebar-brand-copy"><strong>WEBCHAT</strong><span>by WebXWhale</span></div>
          <span className="brand-status" />
        </div>

        <div className="sidebar-user" onClick={() => navigate("/profile")}>
          <div className="user-avatar">{name.charAt(0).toUpperCase()}</div>
          <div><strong>{name}</strong><small>{email || "Your account"}</small></div>
          <span>›</span>
        </div>

        <div className="sidebar-header">
          <div><h2>Messages</h2><span>{groups.length} conversation{groups.length === 1 ? "" : "s"}</span></div>
          <div className="sidebar-actions">
            <button className="icon-btn" onClick={() => setDark(!dark)} title="Toggle theme">{dark ? "☀" : "◐"}</button>
            <button className="icon-btn" onClick={() => navigate("/profile")} title="Profile">◎</button>
          </div>
        </div>

        <div className="sidebar-search"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search messages" />{search && <button onClick={() => setSearch("")}>×</button>}</div>
        <div className="sidebar-filters"><button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>All</button><button className={filter === "active" ? "active" : ""} onClick={() => setFilter("active")}>Active</button></div>

        <div className="sidebar-list">
          {visibleGroups.length === 0 ? <div className="sidebar-empty"><span>○</span><strong>No conversations</strong><small>Start a new private space.</small></div> :
            visibleGroups.map((g) => {
              const unread = Number(g.unreadCounts?.[String(currentUserId)] || 0);
              return <button key={g._id} onClick={() => { setSelectedGroup(g); setIsOpen(false); }} className={"sidebar-group-item " + (selectedGroup?._id === g._id ? "active-group" : "")}>
                <div className="avatar">{g.name?.[0]?.toUpperCase() || "W"}</div>
                <div className="sidebar-group-copy"><div className="sidebar-group-title"><span className="sidebar-group-name">{g.name}</span>{unread > 0 && <span className="unread-badge">{unread}</span>}</div><small>{g.lastMessage || "Encrypted conversation"}</small></div>
                <span className="sidebar-chevron">›</span>
              </button>;
            })}
        </div>

        <div className="sidebar-footer">
          <button className="sidebar-create-btn" onClick={onShowModal}>＋ New conversation</button>
          <button className="sidebar-plan-btn" onClick={() => navigate("/subscription")}><span>✦</span> Upgrade plan</button>
          <button className="sidebar-logout" onClick={onLogout}>↪ Log out</button>
          <div className="sidebar-security">● End-to-end encrypted</div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;