import { createContext, useEffect, useState } from "react";
import { getUserState } from "../utils/getLocation";

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [dark, setDark] = useState(true); // default dark

  useEffect(() => {
    (async () => {
      const state = await getUserState();
      const currentHour = new Date().getHours();

      const southStates = ["Tamil Nadu", "Kerala", "Karnataka", "Andhra Pradesh", "Telangana"];

      // ✅ WHITE THEME for South states + time 10 AM to 12 PM
      if (southStates.includes(state) && currentHour >= 10 && currentHour <= 12) {
        setDark(false);
      } else {
        setDark(true);
      }
    })();
  }, []);

  return (
    <ThemeContext.Provider value={{ dark, setDark }}>
      {children}
    </ThemeContext.Provider>
  );
};
