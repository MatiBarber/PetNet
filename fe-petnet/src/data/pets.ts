import pet1 from "@/assets/pet-1.jpg";
import pet2 from "@/assets/pet-2.jpg";
import pet3 from "@/assets/pet-3.jpg";
import pet4 from "@/assets/pet-4.jpg";
import pet5 from "@/assets/pet-5.jpg";
import pet6 from "@/assets/pet-6.jpg";

export interface Pet {
  id: string;
  name: string;
  type: "Perro" | "Gato" | "Ave" | "Conejo" | "Otro";
  age: "Cachorro" | "Joven" | "Adulto" | "Senior";
  location: string;
  description: string;
  images: string[];
  owner: string;
  ownerId: string;
  ownerContact: string;
  adoptionStatus: "Disponible" | "En Proceso" | "Adoptado";
  active: boolean;
  createdAt: Date;
}

// Mock data for development
export const mockPets: Pet[] = [
  {
    id: "1",
    name: "Luna",
    type: "Perro",
    age: "Joven",
    location: "Madrid, España",
    description: "Luna es una perra muy cariñosa y juguetona. Le encanta estar con niños y otros perros. Está completamente vacunada y esterilizada. Busca una familia que le dé todo el amor que merece.",
    images: [pet1, pet1, pet1],
    owner: "Ana García",
    ownerId: "1",
    ownerContact: "ana.garcia@email.com",
    adoptionStatus: "Disponible",
    active: true,
    createdAt: new Date("2024-01-15")
  },
  {
    id: "2", 
    name: "Milo",
    type: "Gato",
    age: "Adulto",
    location: "Barcelona, España",
    description: "Milo es un gato tranquilo y muy independiente. Perfecto para personas que buscan una compañía silenciosa. Es muy limpio y está acostumbrado a la vida en apartamento.",
    images: [pet2, pet2],
    owner: "Carlos López",
    ownerId: "1",
    ownerContact: "carlos.lopez@email.com",
    adoptionStatus: "Disponible",
    active: true,
    createdAt: new Date("2024-01-20")
  },
  {
    id: "3",
    name: "Rocco",
    type: "Perro", 
    age: "Cachorro",
    location: "Valencia, España",
    description: "Rocco es un cachorro lleno de energía que busca una familia activa. Le encanta jugar y aprender nuevos trucos. Necesita espacio para correr y mucho amor.",
    images: [pet3, pet3, pet3, pet3],
    owner: "María Fernández",
    ownerId: "2",
    ownerContact: "maria.fernandez@email.com", 
    adoptionStatus: "En Proceso",
    active: true,
    createdAt: new Date("2024-02-01")
  },
  {
    id: "4",
    name: "Bella",
    type: "Gato",
    age: "Senior", 
    location: "Sevilla, España",
    description: "Bella es una gatita mayor muy dulce que busca un hogar tranquilo donde pasar sus años dorados. Es muy cariñosa y agradece mucho la compañía humana.",
    images: [pet4, pet4],
    owner: "Pedro Martín",
    ownerId: "3",
    ownerContact: "pedro.martin@email.com",
    adoptionStatus: "Disponible",
    active: true,
    createdAt: new Date("2024-02-10")
  },
  {
    id: "5",
    name: "Kiwi",
    type: "Ave",
    age: "Joven",
    location: "Bilbao, España", 
    description: "Kiwi es un loro muy inteligente y parlanchín. Necesita una familia con experiencia en aves que pueda dedicarle tiempo y estimulación mental.",
    images: [pet5],
    owner: "Laura Ruiz",
    ownerId: "4",
    ownerContact: "laura.ruiz@email.com",
    adoptionStatus: "Disponible",
    active: true,
    createdAt: new Date("2024-02-15")
  },
  {
    id: "6", 
    name: "Canela",
    type: "Conejo",
    age: "Adulto",
    location: "Zaragoza, España",
    description: "Canela es una conejita muy sociable que disfruta de la compañía. Está acostumbrada a vivir en casa y es muy limpia. Busca una familia que entienda sus necesidades especiales.",
    images: [pet6, pet6],
    owner: "David González",
    ownerId: "5",
    ownerContact: "david.gonzalez@email.com",
    adoptionStatus: "Disponible",
    active: true,
    createdAt: new Date("2024-02-20")
  }
];

export const petTypes = ["Perro", "Gato", "Ave", "Conejo", "Otro"] as const;
export const ageGroups = ["Cachorro", "Joven", "Adulto", "Senior"] as const;