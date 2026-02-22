import React, { createContext, useState, useContext } from 'react';

const UserContext = createContext({});

export const useUsers = () => useContext(UserContext);

export const UserProvider = ({ children }) => {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const value = {
    users,
    setUsers,
    selectedUser,
    setSelectedUser,
    loading,
    setLoading
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};