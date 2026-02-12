var express = require('express');
const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Pet:
 *       type: object
 *       required:
 *         - id
 *         - name
 *         - type
 *         - age
 *       properties:
 *         id:
 *           type: integer
 *           description: ID único de la mascota
 *         name:
 *           type: string
 *           description: Nombre de la mascota
 *         type:
 *           type: string
 *           enum: [DOG, CAT, BIRD, RABBIT, OTHER]
 *           description: Tipo de mascota
 *         age:
 *           type: integer
 *           minimum: 0
 *           description: Edad en años
 *         size:
 *           type: string
 *           enum: [SMALL, MEDIUM, LARGE]
 *         description:
 *           type: string
 *           description: Descripción de la mascota
 *         location:
 *           type: string
 *           description: Ubicación de la mascota
 *         isAvailable:
 *           type: boolean
 *           description: Si está disponible para adopción
 *       example:
 *         id: 1
 *         name: Max
 *         type: DOG
 *         age: 3
 *         size: MEDIUM
 *         description: Perro muy amigable y juguetón
 *         location: Buenos Aires
 *         isAvailable: true
 */

/**
 * @swagger
 * tags:
 *   name: Pets
 *   description: Operaciones relacionadas con mascotas
 */

// Servicio de mascotas simulado (puede reemplazarse por una base de datos)
const petService = {
  pets: [
    {
      id: 1,
      name: "Max",
      type: "DOG",
      age: 3,
      size: "MEDIUM",
      description: "Perro muy amigable y juguetón",
      location: "Buenos Aires",
      isAvailable: true
    },
    {
      id: 2,
      name: "Luna",
      type: "CAT",
      age: 2,
      size: "SMALL",
      description: "Gata cariñosa busca hogar",
      location: "Córdoba",
      isAvailable: true
    }
  ],
  getAvailablePets(filters = {}) {
    let filteredPets = this.pets.filter(pet => pet.isAvailable);

    if (filters.type) {
      filteredPets = filteredPets.filter(pet => pet.type === filters.type.toUpperCase());
    }
    if (filters.size) {
      filteredPets = filteredPets.filter(pet => pet.size === filters.size.toUpperCase());
    }
    if (filters.location) {
      filteredPets = filteredPets.filter(pet =>
        pet.location.toLowerCase().includes(filters.location.toLowerCase())
      );
    }
    return filteredPets;
  },
  getPetById(id) {
    return this.pets.find(p => p.id === parseInt(id));
  }
};

/**
 * @swagger
 * /pets:
 *   get:
 *     summary: Obtiene todas las mascotas disponibles
 *     tags: [Pets]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [DOG, CAT, BIRD, RABBIT, OTHER]
 *         description: Filtrar por tipo de mascota
 *       - in: query
 *         name: size
 *         schema:
 *           type: string
 *           enum: [SMALL, MEDIUM, LARGE]
 *         description: Filtrar por tamaño
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filtrar por ubicación
 *     responses:
 *       200:
 *         description: Lista de mascotas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Pet'
 *                 count:
 *                   type: integer
 */
router.get('/', (req, res) => {
  try {
    const { type, size, location } = req.query;
    const filteredPets = petService.getAvailablePets({ type, size, location });

    res.json({
      success: true,
      data: filteredPets,
      count: filteredPets.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error interno del servidor"
    });
  }
});

/**
 * @swagger
 * /pets/{id}:
 *   get:
 *     summary: Obtiene una mascota por ID
 *     tags: [Pets]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la mascota
 *     responses:
 *       200:
 *         description: Mascota encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Pet'
 *       404:
 *         description: Mascota no encontrada
 */
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const pet = petService.getPetById(id);

    if (!pet) {
      return res.status(404).json({
        success: false,
        message: "Mascota no encontrada"
      });
    }

    res.json({
      success: true,
      data: pet
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error interno del servidor"
    });
  }
});

module.exports = router;