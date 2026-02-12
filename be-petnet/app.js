var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
var cors = require("cors");

var indexRouter = require("./routes/index");
var usersRouter = require("./routes/users");
var publicacionRouter = require("./routes/publication");
var solicitudRouter = require("./routes/request");
var petsRouter = require("./routes/pets");
var authRouter = require("./routes/auth");
var requestRouter = require("./routes/request");

var swaggerJsdoc = require("swagger-jsdoc");
var swaggerUi = require("swagger-ui-express");

var app = express();

// ✅ CONFIGURACIÓN CORS
app.use(cors({
  origin: [
    'http://localhost:8080',
    'http://localhost:5173',
    'http://127.0.0.1:8080',
    'http://127.0.0.1:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Función para obtener la URL del servidor
const getServerUrl = () => {
  if (process.env.RAILWAY_STATIC_URL) {
    return `https://${process.env.RAILWAY_STATIC_URL}`;
  }
  if (process.env.SERVER_URL) {
    return process.env.SERVER_URL;
  }
  if (process.env.NODE_ENV === 'production') {
    return 'https://be-petnet-develop.up.railway.app';
  }
  return `http://localhost:${process.env.PORT || 3000}`;
};

// Configuración de Swagger
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "PetNet API",
      version: "1.0.0",
      description: "API for Pet Adoption Network",
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    servers: [
      {
        url: getServerUrl(),
        description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server',
      },
    ],
  },
  apis: ["./routes/*.js"],
};

const specs = swaggerJsdoc(swaggerOptions);

app.use(logger("dev"));

// 🔥 AUMENTAR EL LÍMITE DE TAMAÑO DEL BODY PARA IMÁGENES BASE64
// Esto permite subir imágenes de hasta 10MB (ajusta según necesites)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/pets", petsRouter);
app.use("/auth", authRouter);
app.use("/publications", publicacionRouter);
app.use("/requests", requestRouter);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

module.exports = app;