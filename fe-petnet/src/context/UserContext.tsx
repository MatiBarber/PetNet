import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "@/data/users";
import { authAPI, usersAPI } from "@/services/api";

interface UserContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
  updateUser: (data: Partial<User>) => Promise<void>; // ← Cambiar a async
  loading: boolean;
  refreshUser: () => Promise<void>; // ← Nuevo método
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  // CARGAR DATOS REALES DEL BACKEND
const refreshUser = async () => {
  const token = localStorage.getItem('petnet_token');
  const storedUser = localStorage.getItem('petnet_user');
  
  console.log('🔄 Refreshing user, token exists:', !!token);
  if (!token || !storedUser) {
    console.log('❌ No token or user data found');
    return;
  }

  try {
    const basicUser = JSON.parse(storedUser);
    console.log('📡 Fetching complete user profile for ID:', basicUser.id);
    
    const response = await usersAPI.getProfile(); // Esto ahora llamará a /users/{id}
    console.log('✅ Complete user profile received:', response);
    
    if (response) {
      // Mapear los campos del backend al formato del frontend
      const completeUserData = {
        id: basicUser.id,
        nombre: response.nombre || '',
        apellido: response.apellido || '',
        email: response.email || basicUser.email,
        phone: response.telefono || '',
        provincia: response.provincia || '',
        localidad: response.localidad || '',
        // Agregar otros campos que necesites
      };
      
      setUser(completeUserData);
      localStorage.setItem("petnet_user", JSON.stringify(completeUserData));
      console.log('💾 Complete user data saved:', completeUserData);
    }
  } catch (error) {
    console.error('Error loading user profile:', error);
    // Si hay error al cargar el perfil, limpiar todo
    localStorage.removeItem('petnet_token');
    localStorage.removeItem('petnet_user');
    setUser(null);
  }
};

  useEffect(() => {
    const token = localStorage.getItem('petnet_token');
    if (token) {
      refreshUser();
    }
  }, []);

// En UserContext.tsx - modificar login y register
const login = async (email: string, password: string) => {
  setLoading(true);
  try {
    console.log('🔐 Attempting login with:', email);
    const response = await authAPI.login({ email, password });
    console.log('✅ Login response:', response);
    
    if (response.success) {
      // Guardar token
      localStorage.setItem('petnet_token', response.token);
      console.log('💾 Token saved:', response.token);
      
      // Guardar datos básicos del usuario incluyendo ID
      const basicUserData = {
        id: response.user.id, // ← Esto es crucial
        email: response.user.email,
        nombre: response.user.name || '', // nombre temporal
      };
      localStorage.setItem("petnet_user", JSON.stringify(basicUserData));
      setUser(basicUserData);
      
      // Ahora cargar datos completos
      await refreshUser();
    }
  } catch (error) {
    console.error('❌ Login error:', error);
    throw error;
  } finally {
    setLoading(false);
  }
};

const register = async (userData: any) => {
  setLoading(true);
  try {
    const response = await usersAPI.register(userData);
    console.log('✅ Registration response:', response);
    
    if (response.success || response.token) {
      // GUARDAR EL TOKEN
      localStorage.setItem('petnet_token', response.token);
      
      // Guardar datos básicos incluyendo ID
      const basicUserData = {
        id: response.usuario.id, // ← Esto es crucial
        email: response.usuario.email,
        nombre: response.usuario.nombre || '',
      };
      localStorage.setItem("petnet_user", JSON.stringify(basicUserData));
      setUser(basicUserData);
      
      console.log('💾 Token and basic user data saved');
      
      // Cargar datos completos
      await refreshUser();
    }
  } catch (error) {
    console.error('❌ Registration error:', error);
    throw error;
  } finally {
    setLoading(false);
  }
};

  // ACTUALIZAR con datos reales en el backend
const updateUser = async (data: Partial<User>) => {
  setLoading(true);
  try {
    const response = await usersAPI.updateProfile(data);
    if (response) {
      // Actualizar con los datos que devuelve el backend
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      localStorage.setItem("petnet_user", JSON.stringify(updatedUser));
      
      console.log('✅ User updated successfully:', updatedUser);
    }
  } catch (error) {
    console.error('❌ Error updating user:', error);
    throw error;
  } finally {
    setLoading(false);
  }
};

  const logout = () => {
    setUser(null);
    localStorage.removeItem("petnet_user");
    localStorage.removeItem("petnet_token");
  };

  return (
    <UserContext.Provider value={{ 
      user, 
      login, 
      register, 
      logout, 
      updateUser, 
      loading,
      refreshUser // ← Exportar el nuevo método
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
};