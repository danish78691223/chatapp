export const getUserState = async () => {
  try {
    const res = await fetch("https://ipapi.co/json/");
    const data = await res.json();
    return data.region; // returns state e.g. 'Tamil Nadu'
  } catch (error) {
    console.error("Location error:", error);
    return null;
  }
};
