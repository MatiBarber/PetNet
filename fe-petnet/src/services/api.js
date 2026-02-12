// fe-petnet/src/services/api.js
const API_BASE_URL = 'http://localhost:3000';

// Función base para requests HTTP
async function fetchAPI(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem('petnet_token');

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Backend error response:', errorData);
      
      if (errorData.errores && Array.isArray(errorData.errores)) {
        const errorMessages = errorData.errores.map(err => `${err.path}: ${err.msg}`).join(', ');
        console.error('📋 Validation errors:', errorMessages);
        throw new Error(errorMessages);
      }
      
      throw new Error(errorData.mensaje || errorData.message || `Error ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// ========================================
// SERVICIOS DE AUTENTICACIÓN
// ========================================
export const authAPI = {
  login: (credentials) => 
    fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
};

// ========================================
// SERVICIOS DE USUARIOS
// ========================================
export const usersAPI = {
  register: (userData) =>
    fetchAPI('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  getProfile: () => {
    const user = JSON.parse(localStorage.getItem('petnet_user') || '{}');
    if (user && user.id) {
      return fetchAPI(`/users/${user.id}`);
    } else {
      throw new Error('No user ID found');
    }
  },

  updateProfile: (userData) =>
    fetchAPI('/users', {
      method: 'PUT',
      body: JSON.stringify(userData),
    }),

  getById: (id) => fetchAPI(`/users/${id}`),
  
  getAll: () => fetchAPI('/users'),
};

// ========================================
// SERVICIOS DE PUBLICACIONES
// ========================================
export const publicationsAPI = {
  getAll: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetchAPI(`/publications${qs ? `?${qs}` : ''}`);
  },

  // NUEVO: publicaciones por usuario (opcionalmente por estado)
  getByUser: (userId, params = {}) => {
    const qs = new URLSearchParams({ ...params, usuarioId: userId }).toString();
    return fetchAPI(`/publications?${qs}`);
  },
  /**
   * Obtener todas las publicaciones disponibles
   * @param {Object} filters - Filtros opcionales { tipo: 'Perro' }
   */
  getAvailable: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.tipo) params.append('tipo', filters.tipo);
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchAPI(`/publications/available${query}`);
  },

  /**
   * Obtener publicaciones del usuario autenticado
   */
  getMyPublications: () => fetchAPI('/publications/me'),

  /**
   * Obtener detalle completo de una publicación
   * @param {number|string} id - ID de la publicación
   */
  getById: (id) => fetchAPI(`/publications/${id}`),

  /**
   * Crear nueva publicación
   * @param {Object} publicationData - Datos de la publicación
   * {
   *   nombre: string,
   *   tamaño: 'Chico' | 'Mediano' | 'Grande',
   *   sexo: 'Macho' | 'Hembra',
   *   tipo: 'Perro' | 'Gato' | 'Pájaro' | 'Conejo',
   *   descripcion: string,
   *   foto: string (base64)
   * }
   */
  create: (publicationData) =>
    fetchAPI('/publications', {
      method: 'POST',
      body: JSON.stringify(publicationData),
    }),

  /**
   * Editar publicación existente
   * @param {number|string} id - ID de la publicación
   * @param {Object} publicationData - Datos a actualizar
   */
  update: (id, publicationData) =>
    fetchAPI(`/publications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(publicationData),
    }),

  /**
   * Eliminar publicación
   * @param {number|string} id - ID de la publicación
   */
  delete: (id) =>
    fetchAPI(`/publications/${id}`, {
      method: 'DELETE',
    }),
};

// ========================================
// SERVICIOS DE SOLICITUDES DE ADOPCIÓN
// ========================================
export const requestsAPI = {
  /**
   * Enviar solicitud de adopción
   * @param {Object} requestData - Datos de la solicitud
   * {
   *   publicacionId: number,
   *   mensaje: string
   * }
   */
  create: (requestData) =>
    fetchAPI('/requests', {
      method: 'POST',
      body: JSON.stringify(requestData),
    }),

  /**
   * Cancelar solicitud de adopción (solo si está pendiente)
   * @param {number|string} id - ID de la solicitud
   */
  cancel: (id) =>
    fetchAPI(`/requests/${id}`, {
      method: 'DELETE',
    }),

  /**
   * Obtener solicitudes recibidas (para mis publicaciones)
   */
  getReceived: () => fetchAPI('/requests/recibidas'),

  /**
   * Obtener solicitudes enviadas (mis solicitudes de adopción)
   */
  getSent: () => fetchAPI('/requests/enviadas'),

  /**
   * Actualizar estado de una solicitud (aprobar/rechazar)
   * @param {number|string} id - ID de la solicitud
   * @param {string} nuevoEstado - 'Aprobada' | 'Rechazada' | 'Pendiente'
   */
  updateStatus: (id, nuevoEstado) =>
    fetchAPI(`/requests/${id}/estado`, {
      method: 'PATCH',
      body: JSON.stringify({ nuevoEstado }),
    }),
};

// ========================================
// UTILIDADES
// ========================================

/**
 * Convierte una imagen File a base64 string
 * @param {File} file - Archivo de imagen
 * @returns {Promise<string>} String base64
 */
export const convertToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
};

/**
 * Valida el tamaño de la imagen (máximo 5MB)
 * @param {File} file - Archivo de imagen
 * @returns {boolean}
 */
export const validateImageSize = (file) => {
  const maxSize = 5 * 1024 * 1024; // 5MB
  return file.size <= maxSize;
};

/**
 * Valida el tipo de archivo de imagen
 * @param {File} file - Archivo de imagen
 * @returns {boolean}
 */
export const validateImageType = (file) => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  return validTypes.includes(file.type);
};

export default fetchAPI;