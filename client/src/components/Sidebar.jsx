import { useNavigate } from "react-router-dom";
import { useContext, useState } from "react";
import { ThemeContext } from "../context/ThemeContext";
import "../assets/Sidebar.css";

const Sidebar = ({ groups = [], selectedGroup, setSelectedGroup, onLogout, onShowModal }) => {
  const navigate = useNavigate();
  const { dark, setDark } = useContext(ThemeContext);

  // ⭐ Hamburger state
  const [isOpen, setIsOpen] = useState(false);

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

        <div className="sidebar-header">
          <h2>Groups</h2>

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

        <div className="sidebar-list">
          {groups.length === 0 ? (
            <p style={{ color: "#888", textAlign: "center" }}>No groups</p>
          ) : (
            groups.map((g) => (
              <div
                key={g._id}
                onClick={() => handleSelectGroup(g)}
                className={`sidebar-group-item ${
                  selectedGroup?._id === g._id ? "active-group" : ""
                }`}
              >
                <div className="avatar">{g.name[0].toUpperCase()}</div>
                <span className="sidebar-group-name">{g.name}</span>
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
