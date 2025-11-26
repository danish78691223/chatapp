export const getUserState = async () => {
  try {
    const res = await fetch("https://ipapi.co/json/");
    const data = await res.json();
    return data.region || "Unknown";
  } catch (error) {
    console.error("Location error:", error);
    return "Unknown";
  }
};
