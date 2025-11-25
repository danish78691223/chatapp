import { io } from "socket.io-client";

// Connect to backend Render URL
const socket = io(process.env.REACT_APP_API_URL, {
  transports: ["websocket"],
  reconnection: true,
  reconnectionAttempts: 10,
});

export default socket;
