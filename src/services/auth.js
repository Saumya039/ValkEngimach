import { authenticateWorker } from './db';

const SESSION_KEY = 'valk_session';

export const login = async (workerId, pin) => {
  const user = await authenticateWorker(workerId, pin);
  if (user) {
    const { pin, ...safeUser } = user;
    localStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
    return safeUser;
  }
};

export const logout = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      localStorage.removeItem(SESSION_KEY);
      resolve();
    }, 200);
  });
};

export const getCurrentUser = () => {
  const session = localStorage.getItem(SESSION_KEY);
  return session ? JSON.parse(session) : null;
};
