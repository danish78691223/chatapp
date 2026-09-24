import API from "../api/axios";

export const registerE2EEPublicKey = async (publicKey, e2eeVersion = 1) => {
  const { data } = await API.put("/auth/e2ee/public-key", {
    publicKey,
    e2eeVersion,
  });
  return data;
};

export const getE2EEPublicKey = async (userId) => {
  const { data } = await API.get(`/auth/e2ee/public-key/${userId}`);
  return data;
};
