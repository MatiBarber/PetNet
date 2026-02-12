export interface User {
  id: string;
  nombre: string;
  apellido: string;
  email: string;
  password: string; // hash
  phone: string;
  provincia: string;
  localidad: string;
  createdAt: Date;
  avatar?: string;
}

export const mockUsers: User[] = [
  {
    id: "1",
    nombre: "María",
    apellido: "González",
    email: "maria.gonzalez@email.com",
  password: "42f749ade7f9e195bf475f37a44cafcb", // "Password123" md5
    phone: "1123456789",
    provincia: "Buenos Aires",
    localidad: "La Plata",
    createdAt: new Date("2023-01-15"),
    avatar: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face"
  },
  {
    id: "2",
    nombre: "Carlos",
    apellido: "Rodríguez",
    email: "carlos.rodriguez@email.com",
  password: "42f749ade7f9e195bf475f37a44cafcb", // "Password123" md5
    phone: "1198765432",
    provincia: "Córdoba",
    localidad: "Córdoba Capital",
    createdAt: new Date("2023-02-20"),
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face"
  },
  {
    id: "3",
    nombre: "Ana",
    apellido: "Martínez",
    email: "ana.martinez@email.com",
  password: "42f749ade7f9e195bf475f37a44cafcb", // "Password123" md5
    phone: "1187654321",
    provincia: "Santa Fe",
    localidad: "Rosario",
    createdAt: new Date("2023-03-10"),
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face"
  },
  {
    id: "4", 
    nombre: "Luis",
    apellido: "Fernández",
    email: "luis.fernandez@email.com",
  password: "c7e1249ffc03eb9ded908c236bd1996d", // "Luis2025" md5
    phone: "1156789123",
    provincia: "Mendoza",
    localidad: "Mendoza Capital",
    createdAt: new Date("2023-04-05"),
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face"
  },
  {
    id: "5",
    nombre: "Sofia",
    apellido: "López",
    email: "sofia.lopez@email.com", 
  password: "e1cbb0c3879af8347246f12c559a86b5", // "Sofia2025" md5
    phone: "1145678912",
    provincia: "Tucumán",
    localidad: "San Miguel de Tucumán",
    createdAt: new Date("2023-05-12"),
    avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face"
  }
];

export const getUserById = (id: string): User | undefined => {
  return mockUsers.find(user => user.id === id);
};

export const getUserPosts = (userId: string) => {
  // This will be replaced with actual API call when backend is ready
  // For now, we'll import pets data to show user's posts
  return [];
};